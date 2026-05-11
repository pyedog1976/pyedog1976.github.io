/**
 * 竖屏手机：整页按「手机可视宽 ÷ 页面声明的排版宽」等比缩小，横向铺满真实屏宽；纵向超出由 stage 裁切。
 *
 * 说明（重要）：
 * - 「1280」来自 <meta name="viewport" content="width=1280,...">，是浏览器给 CSS 用的**排版基准宽**，
 *   不是手机硬件宽。手机实际多为一侧约 360–430 的 CSS 像素（由 visualViewport / innerWidth / screen 估）。
 * - 缩放比例：**scale = phoneW / designW**（与电脑同版式 = 先在 designW 下排版，再整体乘比例画满手机宽）。
 *
 * 条件：max-device-width: 900px 且 orientation: portrait
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

  /** 从 meta viewport 读「排版宽」designW（如 width=1280）；没有数字则用 documentElement.clientWidth。 */
  function readDesignWidthFromViewportMeta() {
    var el = document.querySelector('meta[name="viewport"]');
    if (!el) return 0;
    var c = el.getAttribute('content') || '';
    var m = c.match(/\bwidth\s*=\s*(\d+(?:\.\d+)?)/i);
    if (m) return Math.max(1, Math.round(parseFloat(m[1], 10)));
    if (/\bwidth\s*=\s*device-width\b/i.test(c)) {
      return Math.max(1, document.documentElement.clientWidth || window.innerWidth || 0);
    }
    return 0;
  }

  /**
   * 手机真实可视区域 phoneW×phoneH（CSS 像素量级），与 designW 无关。
   * apply 末尾会把 outer 收成 phoneW 宽；首轮须优先 vv / innerWidth，勿把排版宽当成手机宽。
   */
  function readPhoneViewportCssSize(designW) {
    var vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0 && vv.width + 2 < designW) {
      return { phoneW: vv.width, phoneH: vv.height };
    }
    var iw = window.innerWidth;
    var ih = window.innerHeight;
    if (iw > 0 && ih > 0 && iw + 2 < designW) {
      return { phoneW: iw, phoneH: ih };
    }
    var phoneW = outer.clientWidth;
    var phoneH = outer.clientHeight;
    if (isPortraitPhone() && designW > 0 && phoneW / designW >= 0.92) {
      var sw = window.screen.width;
      var sh = window.screen.height;
      var narrow = Math.min(sw, sh);
      if (narrow > 240 && narrow <= 520 && narrow < phoneW * 0.92) {
        phoneW = narrow;
      }
    }
    return { phoneW: phoneW, phoneH: phoneH };
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

      var designW =
        readDesignWidthFromViewportMeta() ||
        document.documentElement.clientWidth ||
        outer.clientWidth;
      var ph = readPhoneViewportCssSize(designW);
      var phoneW = ph.phoneW;
      var phoneH = ph.phoneH;

      inner.style.width = designW + 'px';
      inner.style.boxSizing = 'border-box';

      var h = inner.scrollHeight;

      if (designW < 1 || h < 1 || phoneW < 1 || phoneH < 1) {
        if (badMeasureRetries++ < MAX_BAD_MEASURE) {
          requestAnimationFrame(function () {
            requestAnimationFrame(apply);
          });
        }
        return;
      }
      badMeasureRetries = 0;

      /* designW * scale = phoneW  ⇒  scale = phoneW / designW（手机相对排版宽的比例） */
      var scale = designW > 0 ? phoneW / designW : 1;
      if (scale > 0 && scale < 0.04) scale = 0.04;
      if (scale > 4) scale = 4;

      inner.style.transformOrigin = 'top left';
      inner.style.transform = 'scale(' + scale + ')';

      outer.style.position = 'fixed';
      outer.style.left = '0';
      outer.style.top = '0';
      outer.style.right = 'auto';
      outer.style.bottom = 'auto';
      outer.style.width = phoneW + 'px';
      outer.style.height = phoneH + 'px';
      outer.style.maxWidth = '100%';
      outer.style.boxSizing = 'border-box';
      outer.style.display = 'flex';
      outer.style.alignItems = 'flex-start';
      outer.style.justifyContent = 'flex-start';
      outer.style.overflow = 'hidden';

      stage.style.width = phoneW + 'px';
      stage.style.height = phoneH + 'px';
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
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule, { passive: true });
  }
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
