/**
 * 窄视口（含 iPhone「请求桌面网站」、visualViewport）：在 #site-scale-inner 内固定 1180px 排版，
 * 用内联 transform 缩放到当前布局宽度；#site-scale-outer 高度 = scrollHeight * scale。
 * 不缩放 body。宽 >= 1180 时清除内联，恢复桌面。
 * 文件名避免含 “canvas” 以免部分广告拦截扩展误拦。
 *
 * 手机（CSS 宽 ≤767px）：双指缩放会改变 visualViewport，若仍用其 width 重算 scale，整页会「跟着缩」。
 * 此处改用 innerWidth，并忽略 visualViewport 的 resize，仅保留 window resize / 方向变化等。
 */
(function () {
  var CANVAS_W = 1180;

  function isPhoneLayout() {
    try {
      return window.matchMedia('(max-width: 767px)').matches;
    } catch (e) {
      return (window.innerWidth || 0) < 768;
    }
  }

  function layoutViewportWidth() {
    if (isPhoneLayout()) {
      return window.innerWidth || document.documentElement.clientWidth || CANVAS_W;
    }
    if (window.visualViewport && window.visualViewport.width > 0) {
      return window.visualViewport.width;
    }
    return window.innerWidth || document.documentElement.clientWidth || CANVAS_W;
  }

  function needsCanvas() {
    return layoutViewportWidth() < CANVAS_W;
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
    inner.style.maxWidth = '';
    inner.style.boxSizing = '';
    inner.style.transformOrigin = '';
    inner.style.webkitTransform = '';
    inner.style.transform = '';
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
    /* 手机：避免底栏/底边框被 outer overflow-y:hidden 裁掉一截（取整 + 安全区） */
    if (layoutViewportWidth() < 768) {
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

    var vw = layoutViewportWidth();

    if (!needsCanvas()) {
      clearCanvasStyles(outer, inner);
      return;
    }

    var vwScale = vw;
    if (vw < 768) {
      vwScale = Math.max(280, vw - 4);
    }
    applyCanvasStyles(outer, inner, vwScale);
  }

  function init() {
    update();
    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        'resize',
        function () {
          if (isPhoneLayout()) return;
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
        window.requestAnimationFrame(update);
      });
      ro.observe(inner);
    }

    window.addEventListener('load', function () {
      window.requestAnimationFrame(update);
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
