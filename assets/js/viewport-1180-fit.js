/**
 * 手机（≤767 触控）：1180px 画布 + scale（§16a），逻辑不变。
 * 键鼠桌面：固定参考视口 1854×1047 排版；窗口更小 → #site-scale-outer 裁切；更大 → 画布水平居中。
 */
(function () {
  var CANVAS_W = 1180;
  var DESKTOP_REF_W = 1854;
  var DESKTOP_REF_H = 1047;
  var CLS_DESKTOP_SCROLL = 'site-desktop-scroll-1180';
  var ATTR_FROZEN = 'data-desktop-layout-frozen';

  var LAYOUT_CHAIN = [
    { key: 'inner', find: function (root) { return root; } },
    {
      key: 'container',
      find: function (root) {
        return root.querySelector(':scope > .container.mt-5');
      },
    },
    {
      key: 'post',
      find: function (root) {
        return root.querySelector('.container.mt-5 > .post');
      },
    },
    {
      key: 'row',
      find: function (root) {
        return root.querySelector('.about-side-by-side');
      },
    },
    {
      key: 'leftCol',
      find: function (root) {
        return root.querySelector('.about-left-col');
      },
    },
    {
      key: 'rightCol',
      find: function (root) {
        return root.querySelector('.about-right-col');
      },
    },
    {
      key: 'intro',
      find: function (root) {
        return root.querySelector('.about-section.about-intro');
      },
    },
    {
      key: 'pubs',
      find: function (root) {
        return root.querySelector('.about-section.about-pubs');
      },
    },
  ];

  var frozenLayout = null;
  var layoutLocked = false;
  var desktopCaptureScheduled = false;
  var desktopCaptureAttempts = 0;
  var DESKTOP_CAPTURE_MAX = 16;

  function isPhoneLayout() {
    try {
      return window.matchMedia('(max-width: 767px)').matches;
    } catch (e) {
      return (window.innerWidth || 0) < 768;
    }
  }

  function hasFinePointer() {
    try {
      return window.matchMedia('(pointer: fine)').matches;
    } catch (e) {
      return true;
    }
  }

  function maxTouchPoints() {
    if (typeof navigator.maxTouchPoints === 'number') {
      return navigator.maxTouchPoints;
    }
    if (typeof navigator.msMaxTouchPoints === 'number') {
      return navigator.msMaxTouchPoints;
    }
    return 'ontouchstart' in window ? 1 : 0;
  }

  function useScrollLayoutInsteadOfCanvas() {
    try {
      if (maxTouchPoints() > 0) {
        if (
          window.matchMedia(
            '(max-width: 767px) and (hover: none) and (pointer: coarse)'
          ).matches
        ) {
          return false;
        }
      }
    } catch (e0) {}
    try {
      if (window.matchMedia('(any-pointer: fine)').matches) return true;
    } catch (e) {}
    try {
      if (window.matchMedia('(pointer: fine)').matches) return true;
    } catch (e2) {}
    return maxTouchPoints() === 0;
  }

  function isDesktopClipBrowser() {
    return useScrollLayoutInsteadOfCanvas();
  }

  function syncDesktopScrollClass(on) {
    if (typeof on !== 'boolean') {
      on = isDesktopClipBrowser();
    }
    document.documentElement.classList.toggle(CLS_DESKTOP_SCROLL, on);
    if (on) {
      document.documentElement.style.setProperty(
        '--desktop-ref-w',
        DESKTOP_REF_W + 'px'
      );
      document.documentElement.style.setProperty(
        '--desktop-ref-h',
        DESKTOP_REF_H + 'px'
      );
    } else {
      document.documentElement.style.removeProperty('--desktop-ref-w');
      document.documentElement.style.removeProperty('--desktop-ref-h');
    }
  }

  function layoutWidthForScale() {
    return (
      window.innerWidth ||
      document.documentElement.clientWidth ||
      CANVAS_W
    );
  }

  function layoutViewportWidth() {
    if (isPhoneLayout()) {
      return layoutWidthForScale();
    }
    if (useScrollLayoutInsteadOfCanvas()) {
      return layoutWidthForScale();
    }
    if (hasFinePointer()) {
      return layoutWidthForScale();
    }
    if (window.visualViewport && window.visualViewport.width > 0) {
      return window.visualViewport.width;
    }
    return layoutWidthForScale();
  }

  function needsCanvas() {
    if (useScrollLayoutInsteadOfCanvas()) {
      return false;
    }
    return layoutViewportWidth() < CANVAS_W;
  }

  function measureW(el) {
    if (!el) return 0;
    return Math.round(el.getBoundingClientRect().width) || 0;
  }

  function readLayoutSnap(inner) {
    var snap = { _refW: DESKTOP_REF_W, _refH: DESKTOP_REF_H };
    var i;
    for (i = 0; i < LAYOUT_CHAIN.length; i++) {
      var item = LAYOUT_CHAIN[i];
      var el = item.find(inner);
      if (!el) continue;
      var w = measureW(el);
      if (w > 0) snap[item.key] = w;
    }
    if (!snap.inner || snap.inner < 400) {
      snap.inner = DESKTOP_REF_W;
    }
    return snap;
  }

  function hasAboutSnap(snap) {
    return !!(snap && snap.intro && snap.pubs);
  }

  function scheduleDesktopCapture(inner) {
    if (desktopCaptureScheduled || !inner) return;
    desktopCaptureScheduled = true;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        desktopCaptureScheduled = false;
        if (!isDesktopClipBrowser()) return;
        var outer = inner.parentElement;
        var snap = readLayoutSnap(inner);
        var needsAbout = !!inner.querySelector('.about-side-by-side');
        if (needsAbout && !hasAboutSnap(snap)) {
          desktopCaptureAttempts += 1;
          if (desktopCaptureAttempts < DESKTOP_CAPTURE_MAX) {
            scheduleDesktopCapture(inner);
          }
          return;
        }
        desktopCaptureAttempts = 0;
        snap._captured = true;
        frozenLayout = snap;
        if (hasAboutSnap(frozenLayout)) {
          layoutLocked = false;
          applyLayoutChainLocks(inner);
        }
        applyDesktopOuter(outer, inner, layoutViewportWidth());
      });
    });
  }

  function setFrozenBox(el, w, opts) {
    if (!el || !w) return;
    el.setAttribute(ATTR_FROZEN, '1');
    el.style.setProperty('box-sizing', 'border-box', 'important');
    el.style.setProperty('width', w + 'px', 'important');
    el.style.setProperty('min-width', w + 'px', 'important');
    el.style.setProperty('max-width', w + 'px', 'important');
    el.style.setProperty('flex-shrink', '0', 'important');
    if (opts && opts.flexBasis) {
      el.style.setProperty('flex', '0 0 ' + w + 'px', 'important');
    }
    if (opts && opts.row) {
      el.style.setProperty('display', 'flex', 'important');
      el.style.setProperty('flex-direction', 'row', 'important');
      el.style.setProperty('flex-wrap', 'nowrap', 'important');
    }
  }

  function clearFrozenBox(el) {
    if (!el) return;
    el.removeAttribute(ATTR_FROZEN);
    el.style.removeProperty('box-sizing');
    el.style.removeProperty('width');
    el.style.removeProperty('min-width');
    el.style.removeProperty('max-width');
    el.style.removeProperty('flex-shrink');
    el.style.removeProperty('flex');
    el.style.removeProperty('display');
    el.style.removeProperty('flex-direction');
    el.style.removeProperty('flex-wrap');
  }

  function clearLayoutChainLocks(inner) {
    if (!inner) return;
    var i;
    for (i = 0; i < LAYOUT_CHAIN.length; i++) {
      clearFrozenBox(LAYOUT_CHAIN[i].find(inner));
    }
    layoutLocked = false;
  }

  function applyLayoutChainLocks(inner) {
    if (!inner || !frozenLayout) return;
    var snap = frozenLayout;

    setFrozenBox(inner, snap.inner || DESKTOP_REF_W);
    if (snap.container) {
      setFrozenBox(LAYOUT_CHAIN[1].find(inner), snap.container);
    }
    if (snap.post) {
      setFrozenBox(LAYOUT_CHAIN[2].find(inner), snap.post);
    }
    if (snap.row) {
      setFrozenBox(LAYOUT_CHAIN[3].find(inner), snap.row, { row: true });
    }
    if (snap.leftCol) {
      setFrozenBox(LAYOUT_CHAIN[4].find(inner), snap.leftCol, { flexBasis: true });
    }
    if (snap.rightCol) {
      setFrozenBox(LAYOUT_CHAIN[5].find(inner), snap.rightCol, { flexBasis: true });
    }
    if (snap.intro) {
      setFrozenBox(LAYOUT_CHAIN[6].find(inner), snap.intro);
    }
    if (snap.pubs) {
      setFrozenBox(LAYOUT_CHAIN[7].find(inner), snap.pubs);
    }

    inner.style.setProperty('position', 'relative', 'important');
    inner.style.setProperty('top', '0', 'important');
    inner.style.setProperty('transform', 'none', 'important');
    inner.style.setProperty('-webkit-transform', 'none', 'important');
    inner.style.setProperty('transform-origin', 'top left', 'important');
    inner.style.setProperty('box-sizing', 'border-box', 'important');

    layoutLocked = true;
  }

  function applyDesktopOuter(outer, inner, vw) {
    if (!outer || !inner) return;
    var center = vw > DESKTOP_REF_W;
    outer.style.position = 'relative';
    outer.style.width = '100%';
    outer.style.maxWidth = '100vw';
    outer.style.overflowX = 'hidden';
    outer.style.overflowY = 'visible';
    outer.style.boxSizing = 'border-box';
    outer.style.height = '';

    inner.style.setProperty('width', DESKTOP_REF_W + 'px', 'important');
    inner.style.setProperty('min-width', DESKTOP_REF_W + 'px', 'important');
    inner.style.setProperty('max-width', DESKTOP_REF_W + 'px', 'important');
    if (center) {
      inner.style.setProperty('margin-left', 'auto', 'important');
      inner.style.setProperty('margin-right', 'auto', 'important');
      inner.style.setProperty('left', 'auto', 'important');
    } else {
      inner.style.setProperty('margin-left', '0', 'important');
      inner.style.setProperty('margin-right', '0', 'important');
      inner.style.setProperty('left', '0', 'important');
    }
  }

  function clearCanvasStyles(outer, inner) {
    if (!outer || !inner) return;
    outer.style.height = '';
    outer.style.width = '';
    outer.style.maxWidth = '';
    outer.style.overflowX = '';
    outer.style.overflowY = '';
    outer.style.position = '';
    outer.style.boxSizing = '';
    if (!layoutLocked) {
      inner.style.position = '';
      inner.style.top = '';
      inner.style.left = '';
      inner.style.width = '';
      inner.style.minWidth = '';
      inner.style.maxWidth = '';
      inner.style.marginLeft = '';
      inner.style.marginRight = '';
      inner.style.boxSizing = '';
      inner.style.transformOrigin = '';
      inner.style.webkitTransform = '';
      inner.style.transform = '';
    }
  }

  function applyCanvasStyles(outer, inner, vw) {
    var scale = vw / CANVAS_W;
    outer.style.position = 'relative';
    outer.style.width = '100%';
    outer.style.maxWidth = '100vw';
    outer.style.overflowX = 'hidden';
    outer.style.overflowY = 'hidden';
    outer.style.boxSizing = 'border-box';
    var rawH = Math.max(1, Math.ceil(inner.scrollHeight * scale - 0.5));
    if (isPhoneLayout()) {
      rawH += 48;
    }
    outer.style.height = rawH + 'px';

    inner.style.position = 'absolute';
    inner.style.top = '0';
    inner.style.left = '0';
    inner.style.width = CANVAS_W + 'px';
    inner.style.maxWidth = 'none';
    inner.style.boxSizing = 'border-box';
    inner.style.transformOrigin = 'top left';
    var t = 'scale(' + scale + ')';
    inner.style.webkitTransform = t;
    inner.style.transform = t;
  }

  function resetDesktopLayoutState() {
    frozenLayout = null;
    layoutLocked = false;
    desktopCaptureScheduled = false;
    desktopCaptureAttempts = 0;
  }

  function applyDesktopRefCanvas(outer, inner) {
    var vw = layoutViewportWidth();
    syncDesktopScrollClass(true);
    clearCanvasStyles(outer, inner);

    inner.style.setProperty('width', DESKTOP_REF_W + 'px', 'important');
    inner.style.setProperty('min-width', DESKTOP_REF_W + 'px', 'important');
    inner.style.setProperty('max-width', DESKTOP_REF_W + 'px', 'important');
    inner.style.setProperty('transform', 'none', 'important');
    inner.style.setProperty('-webkit-transform', 'none', 'important');

    applyDesktopOuter(outer, inner, vw);

    if (
      frozenLayout &&
      frozenLayout._refW === DESKTOP_REF_W &&
      frozenLayout._captured
    ) {
      if (hasAboutSnap(frozenLayout)) {
        applyLayoutChainLocks(inner);
      }
      applyDesktopOuter(outer, inner, vw);
      return;
    }

    layoutLocked = false;
    scheduleDesktopCapture(inner);
  }

  function update() {
    var outer = document.getElementById('site-scale-outer');
    var inner = document.getElementById('site-scale-inner');
    if (!outer || !inner) return;

    if (isDesktopClipBrowser()) {
      applyDesktopRefCanvas(outer, inner);
      return;
    }

    resetDesktopLayoutState();
    syncDesktopScrollClass(false);
    clearLayoutChainLocks(inner);
    clearCanvasStyles(outer, inner);

    if (!needsCanvas()) {
      return;
    }

    var vwLayout = layoutViewportWidth();
    var vwScale = vwLayout;
    if (isPhoneLayout() && vwLayout < 768) {
      vwScale = Math.max(280, vwLayout - 4);
    }
    applyCanvasStyles(outer, inner, vwScale);
  }

  function init() {
    update();
    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        'resize',
        function () {
          if (isPhoneLayout() || useScrollLayoutInsteadOfCanvas()) return;
          window.requestAnimationFrame(update);
        },
        { passive: true }
      );
    }
    window.addEventListener(
      'resize',
      function () {
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
    window.addEventListener('orientationchange', function () {
      window.setTimeout(update, 280);
    });

    window.addEventListener('load', function () {
      window.requestAnimationFrame(function () {
        update();
      });
    });
  }

  function debugLayoutChain() {
    var inner = document.getElementById('site-scale-inner');
    if (!inner) return [];
    var rows = [];
    var i;
    for (i = 0; i < LAYOUT_CHAIN.length; i++) {
      var item = LAYOUT_CHAIN[i];
      var el = item.find(inner);
      rows.push({
        key: item.key,
        width: el ? measureW(el) : null,
        frozen: el ? el.getAttribute(ATTR_FROZEN) : null,
        cssWidth: el ? getComputedStyle(el).width : null,
      });
    }
    rows.push({
      key: '_frozenLayout',
      snap: frozenLayout,
      refW: DESKTOP_REF_W,
      refH: DESKTOP_REF_H,
      vw: layoutViewportWidth(),
      classOn: document.documentElement.classList.contains(CLS_DESKTOP_SCROLL),
    });
    return rows;
  }

  window.debugLayoutChain = debugLayoutChain;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(update);
  });
})();
