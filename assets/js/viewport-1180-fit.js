/**
 * 手机（≤767 触控）：1180px 画布 + scale（§16a）。
 * 键鼠桌面：宽屏快照父链像素宽；变窄后仅 #site-scale-outer 裁切，子树宽度不再随 viewport 变。
 */
(function () {
  var CANVAS_W = 1180;
  var CLS_DESKTOP_SCROLL = 'site-desktop-scroll-1180';
  var ATTR_FROZEN = 'data-desktop-layout-frozen';

  /** 与 About 页黄框相关的父链（自上而下） */
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

  function syncDesktopScrollClass(vwLayout, on) {
    if (typeof on !== 'boolean') {
      on =
        useScrollLayoutInsteadOfCanvas() &&
        !isPhoneLayout() &&
        vwLayout < CANVAS_W;
    }
    document.documentElement.classList.toggle(CLS_DESKTOP_SCROLL, on);
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

  /** 宽屏自然排版下快照父链宽度 */
  function captureLayoutChain(inner) {
    if (!inner) return;
    var snap = {};
    var i;
    for (i = 0; i < LAYOUT_CHAIN.length; i++) {
      var item = LAYOUT_CHAIN[i];
      var el = item.find(inner);
      if (!el) continue;
      var w = measureW(el);
      if (w > 0) snap[item.key] = w;
    }
    if (!snap.inner || snap.inner < CANVAS_W) return;
    frozenLayout = snap;
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

  /**
   * 未先经过宽屏时：在 site-desktop-scroll-1180 + inner=1180 下快照（仍受 viewport 断点影响，配合 CSS 保持双栏）
   */
  function captureLayoutChainAt1180(inner, done) {
    if (!inner) {
      if (done) done();
      return;
    }
    syncDesktopScrollClass(CANVAS_W - 1, true);
    inner.style.width = CANVAS_W + 'px';
    inner.style.minWidth = CANVAS_W + 'px';
    inner.style.maxWidth = 'none';
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        captureLayoutChain(inner);
        inner.style.width = '';
        inner.style.minWidth = '';
        inner.style.maxWidth = '';
        if (done) done();
      });
    });
  }

  function applyLayoutChainLocks(inner) {
    if (!inner || !frozenLayout) return;
    var snap = frozenLayout;

    setFrozenBox(inner, snap.inner);
    setFrozenBox(LAYOUT_CHAIN[1].find(inner), snap.container);
    setFrozenBox(LAYOUT_CHAIN[2].find(inner), snap.post);
    setFrozenBox(LAYOUT_CHAIN[3].find(inner), snap.row, { row: true });
    setFrozenBox(LAYOUT_CHAIN[4].find(inner), snap.leftCol, { flexBasis: true });
    setFrozenBox(LAYOUT_CHAIN[5].find(inner), snap.rightCol, { flexBasis: true });
    setFrozenBox(LAYOUT_CHAIN[6].find(inner), snap.intro);
    setFrozenBox(LAYOUT_CHAIN[7].find(inner), snap.pubs);

    inner.style.setProperty('position', 'relative', 'important');
    inner.style.setProperty('top', '0', 'important');
    inner.style.setProperty('left', '0', 'important');
    inner.style.setProperty('margin-left', '0', 'important');
    inner.style.setProperty('transform', 'none', 'important');
    inner.style.setProperty('-webkit-transform', 'none', 'important');
    inner.style.setProperty('transform-origin', 'top left', 'important');

    layoutLocked = true;
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

  function update() {
    var outer = document.getElementById('site-scale-outer');
    var inner = document.getElementById('site-scale-inner');
    if (!outer || !inner) return;

    var vwLayout = layoutViewportWidth();
    var desktopClip = useScrollLayoutInsteadOfCanvas() && !isPhoneLayout();

    if (desktopClip && vwLayout >= CANVAS_W) {
      syncDesktopScrollClass(vwLayout, false);
      clearLayoutChainLocks(inner);
      clearCanvasStyles(outer, inner);
      captureLayoutChain(inner);
      return;
    }

    if (desktopClip && vwLayout < CANVAS_W) {
      syncDesktopScrollClass(vwLayout, true);
      clearCanvasStyles(outer, inner);
      if (frozenLayout) {
        applyLayoutChainLocks(inner);
        return;
      }
      captureLayoutChainAt1180(inner, function () {
        if (frozenLayout) {
          applyLayoutChainLocks(inner);
        } else {
          setFrozenBox(inner, CANVAS_W);
          inner.style.setProperty('transform', 'none', 'important');
          inner.style.setProperty('-webkit-transform', 'none', 'important');
        }
      });
      return;
    }

    syncDesktopScrollClass(vwLayout);
    clearLayoutChainLocks(inner);
    clearCanvasStyles(outer, inner);

    if (!needsCanvas()) {
      return;
    }

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

    var inner = document.getElementById('site-scale-inner');
    if (inner && typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () {
        if (layoutLocked) return;
        if (
          useScrollLayoutInsteadOfCanvas() &&
          !isPhoneLayout() &&
          layoutViewportWidth() >= CANVAS_W
        ) {
          captureLayoutChain(inner);
        }
      });
      ro.observe(inner);
    }

    window.addEventListener('load', function () {
      window.requestAnimationFrame(function () {
        update();
        var innerEl = document.getElementById('site-scale-inner');
        if (
          innerEl &&
          useScrollLayoutInsteadOfCanvas() &&
          !isPhoneLayout() &&
          layoutViewportWidth() >= CANVAS_W
        ) {
          captureLayoutChain(innerEl);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(update);
  });
})();
