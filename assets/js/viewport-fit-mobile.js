/**
 * 竖屏手机：整页按「手机可视宽 ÷ 页面声明的排版宽」等比缩小，横向铺满真实屏宽；纵向超出由 stage 裁切。
 *
 * 说明（重要）：
 * - 「1280」来自 <meta name="viewport" content="width=1280,...">，是浏览器给 CSS 用的**排版基准宽**，
 *   不是手机硬件宽。手机宽勿盲信 visualViewport.width（iOS Chrome + width=1280 下偶发极小假值）；宽布局时优先 screen 窄边再回退。
 * - 缩放比例：**scale = phoneW / designW**（与电脑同版式 = 先在 designW 下排版，再整体乘比例画满手机宽）。
 *
 * 条件：竖屏 +（max-device-width:900px 或 粗指针且非巨屏）；勿依赖 (hover:none)，Chrome iOS 常报成 hover。
 * Chrome iOS：screen 常为物理像素；dpr 异常时仍尝试折算。
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

  function isPortraitPhone() {
    if (!window.matchMedia('(orientation: portrait)').matches) return false;
    if (window.matchMedia('(max-device-width: 900px)').matches) return true;
    /* Chrome iOS 常把 (hover:none) 报成 hover，勿依赖；粗指针 + 非巨屏即尝试缩放 */
    if (
      window.matchMedia('(pointer: coarse)').matches &&
      !window.matchMedia('(min-device-width: 1100px)').matches
    ) {
      return true;
    }
    return false;
  }

  /** screen 短边：Chrome iOS 常给物理像素；用 dpr 折算，dpr 不可靠时再试 /3。 */
  function narrowScreenCssGuess() {
    var sw = window.screen.width;
    var sh = window.screen.height;
    var n = Math.min(sw, sh);
    var dpr = window.devicePixelRatio || 1;
    if (n > 560) {
      var conv = Math.round(n / Math.max(dpr, 1.001));
      if (conv >= 250 && conv <= 580) return conv;
      conv = Math.round(n / 3);
      if (conv >= 250 && conv <= 580) return conv;
    }
    if (n > 220 && n <= 580) return n;
    return 0;
  }

  /** 竖屏触摸且仍拿不到窄边时的经验兜底（避免 scale≈1 完全无感） */
  function fallbackPhoneWidthCss(designW) {
    return Math.min(480, Math.max(300, Math.round(designW * 0.28)));
  }

  /**
   * 手机真实可视区域 phoneW×phoneH（CSS 像素量级），与 designW 无关。
   * iOS Chrome + meta width=1280 时 innerWidth 常仍为 1280，但 visualViewport.width 偶发极小假值；
   * 若盲信 vv 会得到 scale≈0.04、整页缩成左上角一小点——须先做合理性判断，并在「仍显宽」时优先 screen 窄边。
   */
  function readPhoneViewportCssSize(designW) {
    var iw = window.innerWidth;
    var ih = window.innerHeight;
    var vv = window.visualViewport;
    var minSaneVvW = Math.max(200, Math.min(300, Math.floor(designW * 0.16)));

    function tryScreenWhenLayoutStillWide(refW) {
      if (!isPortraitPhone() || designW < 1 || refW < 1) return null;
      if (refW / designW < 0.88) return null;
      var narrow = narrowScreenCssGuess();
      if (narrow > 0 && narrow < refW * 0.92) {
        var ph = ih > 180 ? ih : outer.clientHeight;
        if (vv && vv.height > 180 && vv.height < 2000) ph = vv.height;
        return { phoneW: narrow, phoneH: Math.max(ph, 200) };
      }
      return null;
    }

    var fromScreen = tryScreenWhenLayoutStillWide(iw > 0 ? iw : 0);
    if (!fromScreen && outer.clientWidth > 0) {
      fromScreen = tryScreenWhenLayoutStillWide(outer.clientWidth);
    }
    if (fromScreen) return fromScreen;

    if (vv && vv.width > 0 && vv.height > 0 && vv.width + 2 < designW) {
      var vvTooSmallVsInner = iw > 0 && vv.width + 32 < iw * 0.68;
      if (vv.width >= minSaneVvW && !vvTooSmallVsInner) {
        return { phoneW: vv.width, phoneH: vv.height };
      }
    }
    if (iw > 0 && ih > 0 && iw + 2 < designW) {
      return { phoneW: iw, phoneH: ih };
    }

    var phoneW = outer.clientWidth;
    var phoneH = outer.clientHeight;
    if (isPortraitPhone() && designW > 0 && phoneW / designW >= 0.88) {
      var narrow = narrowScreenCssGuess();
      if (narrow > 0 && narrow < phoneW * 0.92) {
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
      /* 仍把「整页排版宽」当手机宽时，最后一次用 screen÷dpr 估窄边（Chrome iOS 物理像素主因） */
      if (phoneW > designW * 0.82) {
        var guess = narrowScreenCssGuess();
        if (guess > 0) {
          phoneW = guess;
        } else if (isPortraitPhone()) {
          phoneW = fallbackPhoneWidthCss(designW);
        }
      }

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
      /* 不再用极小下限夹 scale（会把整页压成微粒）；phoneW 已由 screen÷dpr 兜底 */
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
  /* 首帧立即跑一次，避免只依赖 60ms debounce / load 时序导致长时间无样式 */
  apply();
})();
