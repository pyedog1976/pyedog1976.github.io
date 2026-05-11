/**
 * 竖屏手机：与 meta 固定排版宽（如 1280）一致先排版，再按「可视宽度」整体 scale，使横向铺满手机；
 * 纵向超出由 stage 裁切；无整页滚动。outer 内水平居中、竖向贴顶（见 dark-sci-min §16）。
 *
 * 与「整页 min(vw/w,vh/h) 塞进一屏」不同：后者常被高度限制，左右留大黑边；本版为宽度优先 = 横向铺满。
 *
 * 条件：max-device-width: 900px 且 orientation: portrait
 * 注意：inner 宽度用 meta 排版宽，勿写 scrollWidth（与子元素 100% 宽正反馈会无限拉长）。
 * 勿对 inner 使用 ResizeObserver（与 transform/stage 易套娃）。
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

  function readDesignWFromMeta() {
    var el = document.querySelector('meta[name="viewport"]');
    if (!el) return 0;
    var m = (el.getAttribute('content') || '').match(/\bwidth\s*=\s*(\d+)/i);
    return m ? Math.max(1, parseInt(m[1], 10)) : 0;
  }

  /** layout 仍显宽时，用 screen 短边÷dpr 估真实 CSS 宽（Chrome iOS 常见） */
  function coerceVisibleWidth(designW, vw) {
    if (designW < 1 || vw < designW * 0.92) return vw;
    var n = Math.min(window.screen.width, window.screen.height);
    var dpr = window.devicePixelRatio || 1;
    if (n > 600) n = Math.round(n / Math.max(dpr, 2));
    if (n >= 280 && n <= 620) return n;
    return vw;
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
      safeTop = parseFloat(getComputedStyle(outer).paddingTop) || 0;
    } catch (e) {}

    var designW =
      readDesignWFromMeta() ||
      document.documentElement.clientWidth ||
      outer.clientWidth;

    var vv = window.visualViewport;
    var vw;
    var vh;
    if (vv && vv.width > 0 && vv.height > 0 && vv.width + 8 < designW) {
      vw = vv.width;
      vh = vv.height;
    } else if (window.innerWidth > 200 && window.innerWidth + 8 < designW) {
      vw = window.innerWidth;
      vh = Math.max(200, window.innerHeight);
    } else {
      vw = outer.clientWidth;
      vh = Math.max(0, outer.clientHeight - safeTop);
    }
    vw = coerceVisibleWidth(designW, vw);

    inner.style.width = designW + 'px';
    inner.style.boxSizing = 'border-box';

    var h = inner.scrollHeight;

    if (designW < 1 || h < 1 || vw < 1 || vh < 1) {
      if (measureRetries++ < MAX_MEASURE_RETRIES) {
        requestAnimationFrame(function () {
          requestAnimationFrame(apply);
        });
      }
      return;
    }
    measureRetries = 0;

    var scale = designW > 0 ? (vw / designW) * 0.998 : 1;
    if (scale > 3) scale = 3;

    inner.style.transformOrigin = 'top left';
    inner.style.transform = 'scale(' + scale + ')';

    outer.style.position = 'fixed';
    outer.style.left = '0';
    outer.style.top = '0';
    outer.style.right = 'auto';
    outer.style.bottom = 'auto';
    outer.style.width = vw + 'px';
    outer.style.height = vh + safeTop + 'px';
    outer.style.maxWidth = '100%';
    outer.style.boxSizing = 'border-box';
    outer.style.display = 'flex';
    outer.style.alignItems = 'flex-start';
    outer.style.justifyContent = 'center';
    outer.style.overflow = 'hidden';

    stage.style.width = vw + 'px';
    stage.style.height = vh + 'px';
    stage.style.overflow = 'hidden';
    stage.style.flexShrink = '0';
    stage.style.boxSizing = 'border-box';
  }

  var t;
  function schedule() {
    clearTimeout(t);
    t = setTimeout(apply, 100);
  }

  window.addEventListener('resize', schedule);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule, { passive: true });
  }
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
