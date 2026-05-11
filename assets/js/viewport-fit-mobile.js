/**
 * 竖屏手机：整页（与 meta viewport 宽布局一致）整体等比缩小，完整塞进屏幕，不出现滚动条；
 * 多出来的区域由 .viewport-fit-outer 的 background（与站点 --bg）铺满；outer 为 flex：水平居中、竖向贴顶。
 *
 * 条件：max-device-width: 900px 且 orientation: portrait
 * 算法：scale = min(屏宽/scrollWidth, 屏高/scrollHeight) * 0.992，transform 作用于 inner，origin 左上；
 * stage 为缩放后内容尺寸 + overflow:hidden（与 vw/vh 同一套布局坐标，不依赖 screen 估宽）。
 *
 * 注意：不得 inner.style.width = scrollWidth（与子元素 width:100% 正反馈会无限拉长页面）。
 * ResizeObserver 在 apply 期间 disconnect，避免布局回调套娃。
 */
(function () {
  var CLS = 'viewport-fit--portrait-mobile';
  var outer = document.getElementById('viewport-fit-outer');
  var stage = document.getElementById('viewport-fit-stage');
  var inner = document.getElementById('viewport-fit-inner');
  if (!outer || !stage || !inner) return;

  var ro = null;
  var badMeasureRetries = 0;
  var MAX_BAD_MEASURE = 50;

  function isPortraitPhone() {
    return window.matchMedia('(max-device-width: 900px) and (orientation: portrait)').matches;
  }

  function clear() {
    document.documentElement.classList.remove(CLS);
    outer.removeAttribute('style');
    stage.removeAttribute('style');
    inner.removeAttribute('style');
    badMeasureRetries = 0;
    inner.querySelectorAll('img[data-vpfit-bound]').forEach(function (img) {
      delete img.dataset.vpfitBound;
    });
  }

  function bindImgLoads() {
    inner.querySelectorAll('img').forEach(function (img) {
      if (img.dataset.vpfitBound) return;
      img.dataset.vpfitBound = '1';
      if (!img.complete) {
        img.addEventListener('load', schedule, { passive: true });
        img.addEventListener('error', schedule, { passive: true });
      }
    });
  }

  function apply() {
    if (ro) {
      ro.disconnect();
    }

    try {
      if (!isPortraitPhone()) {
        clear();
        return;
      }

      document.documentElement.classList.add(CLS);
      bindImgLoads();

      var vw = outer.clientWidth;
      var vh = outer.clientHeight;
      inner.style.width = '';

      var w = inner.scrollWidth;
      var h = inner.scrollHeight;

      if (w < 1 || h < 1 || vw < 1 || vh < 1) {
        if (badMeasureRetries++ < MAX_BAD_MEASURE) {
          requestAnimationFrame(function () {
            requestAnimationFrame(apply);
          });
        }
        return;
      }
      badMeasureRetries = 0;

      var s = Math.min(vw / w, vh / h) * 0.992;

      inner.style.transformOrigin = 'top left';
      inner.style.transform = 'scale(' + s + ')';

      var sw = Math.round(w * s * 1000) / 1000;
      var sh = Math.round(h * s * 1000) / 1000;

      stage.style.width = sw + 'px';
      stage.style.height = sh + 'px';
      stage.style.overflow = 'hidden';
      stage.style.flexShrink = '0';
      stage.style.boxSizing = 'border-box';
    } finally {
      if (ro && isPortraitPhone()) {
        ro.observe(inner);
      }
    }
  }

  var t;
  function schedule() {
    clearTimeout(t);
    t = setTimeout(apply, 60);
  }

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', function () {
    setTimeout(apply, 200);
  });
  window.addEventListener('load', schedule);
  if (document.readyState === 'complete') {
    schedule();
  } else {
    document.addEventListener('DOMContentLoaded', schedule);
  }

  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(function () {
      schedule();
    });
    ro.observe(inner);
  }
})();
