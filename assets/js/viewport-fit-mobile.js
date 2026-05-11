/**
 * 竖屏手机：整页（完整文档宽高）等比缩放到一屏内，无滚动；余下为 html 背景色。
 * 桌面 / 横屏 / 大屏不启用。
 *
 * 注意：勿把 inner 的 width 写成 scrollWidth（会与子元素 width:100% 形成正反馈，页面无限变长）；
 * 勿对 inner 使用 ResizeObserver（transform / stage 尺寸变化会反复触发）。
 */
(function () {
  var CLS = 'viewport-fit--portrait-mobile';
  var outer = document.getElementById('viewport-fit-outer');
  var stage = document.getElementById('viewport-fit-stage');
  var inner = document.getElementById('viewport-fit-inner');
  if (!outer || !stage || !inner) return;

  var measureRetries = 0;
  var MAX_MEASURE_RETRIES = 40;

  function isPortraitPhone() {
    return window.matchMedia('(max-device-width: 900px) and (orientation: portrait)').matches;
  }

  function clear() {
    document.documentElement.classList.remove(CLS);
    outer.removeAttribute('style');
    stage.removeAttribute('style');
    inner.removeAttribute('style');
    measureRetries = 0;
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
    if (!isPortraitPhone()) {
      clear();
      return;
    }

    document.documentElement.classList.add(CLS);
    bindImgLoads();

    var safeTop = 0;
    try {
      var st = getComputedStyle(outer);
      safeTop = parseFloat(st.paddingTop) || 0;
    } catch (e) {}

    var vw = outer.clientWidth;
    var vh = Math.max(0, outer.clientHeight - safeTop);

    inner.style.width = '';

    var w = inner.scrollWidth;
    var h = inner.scrollHeight;

    if (w < 1 || h < 1 || vw < 1 || vh < 1) {
      if (measureRetries++ < MAX_MEASURE_RETRIES) {
        requestAnimationFrame(function () {
          requestAnimationFrame(apply);
        });
      }
      return;
    }
    measureRetries = 0;

    var s = Math.min(vw / w, vh / h) * 0.992;

    /* 不要設 inner.style.width = scrollWidth，否則與 picture/img 100% 寬形成遞增循環 */
    inner.style.transformOrigin = 'top left';
    inner.style.transform = 'scale(' + s + ')';

    var sw = Math.round(w * s * 1000) / 1000;
    var sh = Math.round(h * s * 1000) / 1000;

    stage.style.width = sw + 'px';
    stage.style.height = sh + 'px';
    stage.style.overflow = 'hidden';
    stage.style.flexShrink = '0';
  }

  var t;
  function schedule() {
    clearTimeout(t);
    t = setTimeout(apply, 100);
  }

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', function () {
    setTimeout(schedule, 250);
  });
  window.addEventListener('load', schedule);
  if (document.readyState === 'complete') {
    schedule();
  } else {
    document.addEventListener('DOMContentLoaded', schedule);
  }
})();
