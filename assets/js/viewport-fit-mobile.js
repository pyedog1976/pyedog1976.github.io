/**
 * 竖屏手机：整页（与 meta viewport 宽布局一致）整体 transform 缩放；以宽度对齐视口，
 * 不出现横向滚动与两侧大块留白；纵向超出由 stage 裁切，无页面滚动条。
 * 视口外区域由 .viewport-fit-outer 的 background（与站点 --bg 一致）铺满。
 *
 * 条件：max-device-width: 900px 且 orientation: portrait
 * 算法：竖屏以「铺满屏宽」为先：scale = 屏宽/scrollWidth（略留边 0.998），
 * 保证两栏与整页在水平方向占满手机；纵向超出视口部分由 stage overflow:hidden 裁掉（顶对齐、无横条留白）。
 * transform 作用于 inner，origin 左上；stage 固定为视口 vw×vh。
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

      /* 宽度优先：水平铺满手机，避免 min(vw,w, vh/h) 被高度绑死导致两侧大黑边 */
      var s = (vw / w) * 0.998;

      inner.style.transformOrigin = 'top left';
      inner.style.transform = 'scale(' + s + ')';

      stage.style.width = vw + 'px';
      stage.style.height = vh + 'px';
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
