/**
 * 竖屏手机：整页（完整文档宽高）等比缩放到一屏内，无滚动；余下为 html 背景色。
 * 桌面 / 横屏 / 大屏不启用。
 */
(function () {
  var CLS = 'viewport-fit--portrait-mobile';
  var outer = document.getElementById('viewport-fit-outer');
  var stage = document.getElementById('viewport-fit-stage');
  var inner = document.getElementById('viewport-fit-inner');
  if (!outer || !stage || !inner) return;

  function isPortraitPhone() {
    return window.matchMedia('(max-device-width: 900px) and (orientation: portrait)').matches;
  }

  function clear() {
    document.documentElement.classList.remove(CLS);
    outer.removeAttribute('style');
    stage.removeAttribute('style');
    inner.removeAttribute('style');
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

    /* 外層扣掉 safe-area 後，與 CSS padding-top 對齊，避免縮放比例用滿屏高度導致底部被裁 */
    var safeTop = 0;
    try {
      var st = getComputedStyle(outer);
      safeTop = parseFloat(st.paddingTop) || 0;
    } catch (e) {}

    var vw = outer.clientWidth;
    var vh = Math.max(0, outer.clientHeight - safeTop);
    var w = inner.scrollWidth;
    var h = inner.scrollHeight;

    if (w < 1 || h < 1 || vw < 1 || vh < 1) {
      requestAnimationFrame(function () {
        requestAnimationFrame(apply);
      });
      return;
    }

    var s = Math.min(vw / w, vh / h) * 0.992;

    inner.style.width = w + 'px';
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
    t = setTimeout(apply, 80);
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
    var ro = new ResizeObserver(schedule);
    ro.observe(inner);
  }
})();
