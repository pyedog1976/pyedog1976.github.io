/**
 * 真机：固定 1180px 桌面画布在 #site-scale-inner 内排版，横向用 CSS transform 缩小到屏宽；
 * 外层 #site-scale-outer 预留缩放后的高度（transform 不改变文档流高度）。
 * 不缩放 body；桌面不满足 max-device-width 时不做任何事。
 */
(function () {
  var CANVAS_W = 1180;

  function isMobileCanvas() {
    return window.matchMedia('(max-device-width: 767px)').matches;
  }

  function update() {
    var outer = document.getElementById('site-scale-outer');
    var inner = document.getElementById('site-scale-inner');
    if (!outer || !inner) return;

    if (!isMobileCanvas()) {
      outer.style.height = '';
      outer.style.removeProperty('width');
      outer.style.removeProperty('max-width');
      outer.style.removeProperty('overflow-x');
      return;
    }

    var w = window.innerWidth || document.documentElement.clientWidth || CANVAS_W;
    var scale = w / CANVAS_W;
    outer.style.width = '100%';
    outer.style.maxWidth = '100vw';
    outer.style.overflowX = 'hidden';
    outer.style.height = Math.max(1, Math.ceil(inner.scrollHeight * scale - 0.5)) + 'px';
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
      window.setTimeout(function () {
        update();
      }, 280);
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
})();
