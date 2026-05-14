/**
 * 全站不再使用「#site-scale-inner + transform: scale()」整页缩放。
 * 保留脚本占位：清除可能来自旧缓存的内联样式，避免 absolute/固定高度残留。
 */
(function () {
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

  function update() {
    var outer = document.getElementById('site-scale-outer');
    var inner = document.getElementById('site-scale-inner');
    if (!outer || !inner) return;
    clearCanvasStyles(outer, inner);
    document.documentElement.classList.remove('site-desktop-scroll-1180');
  }

  function init() {
    update();
    window.addEventListener(
      'resize',
      function () {
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
    window.addEventListener('orientationchange', function () {
      window.setTimeout(update, 200);
    });
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
