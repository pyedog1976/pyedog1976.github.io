/**
 * 手机（≤767 触控）：#site-scale-inner 1180px + scale 缩到视口（§16a + applyCanvasStyles）。
 * 键鼠桌面：宽屏时实测并锁定 #site-scale-inner 宽度；变窄后只由 #site-scale-outer 裁切，不改内部布局。
 */
(function () {
  var CANVAS_W = 1180;
  var CLS_DESKTOP_SCROLL = 'site-desktop-scroll-1180';
  var frozenDesktopCanvasW = 0;

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

  function syncDesktopScrollClass(vwLayout) {
    var on =
      useScrollLayoutInsteadOfCanvas() &&
      !isPhoneLayout() &&
      vwLayout < CANVAS_W;
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

  /** 宽屏时记录 inner 实际排版宽（≥1180 视口下与全屏桌面一致） */
  function captureDesktopCanvasWidth(inner) {
    if (!inner) return;
    var rect = inner.getBoundingClientRect();
    var w = Math.max(
      CANVAS_W,
      Math.round(rect.width) || 0,
      inner.scrollWidth || 0,
      inner.offsetWidth || 0
    );
    if (w > frozenDesktopCanvasW) {
      frozenDesktopCanvasW = w;
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

  /** 仅设置 #site-scale-inner 锁定宽；子元素不改 */
  function applyDesktopFrozenCanvas(inner) {
    var w = frozenDesktopCanvasW || CANVAS_W;
    inner.style.position = 'relative';
    inner.style.top = '0';
    inner.style.left = '0';
    inner.style.marginLeft = '0';
    inner.style.width = w + 'px';
    inner.style.minWidth = w + 'px';
    inner.style.maxWidth = 'none';
    inner.style.boxSizing = 'border-box';
    inner.style.transformOrigin = 'top left';
    inner.style.webkitTransform = 'none';
    inner.style.transform = 'none';
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
      syncDesktopScrollClass(vwLayout);
      clearCanvasStyles(outer, inner);
      captureDesktopCanvasWidth(inner);
      return;
    }

    if (desktopClip && vwLayout < CANVAS_W) {
      if (frozenDesktopCanvasW === 0) {
        frozenDesktopCanvasW = CANVAS_W;
      }
      syncDesktopScrollClass(vwLayout);
      clearCanvasStyles(outer, inner);
      applyDesktopFrozenCanvas(inner);
      return;
    }

    syncDesktopScrollClass(vwLayout);
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
        if (
          useScrollLayoutInsteadOfCanvas() &&
          !isPhoneLayout() &&
          layoutViewportWidth() >= CANVAS_W
        ) {
          captureDesktopCanvasWidth(inner);
        }
        window.requestAnimationFrame(update);
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
          layoutViewportWidth() >= CANVAS_W
        ) {
          captureDesktopCanvasWidth(innerEl);
          update();
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
