/**
 * 竖屏手机：保持与电脑相同的 meta 排版宽（如 1280）先排版，再按「真实可视宽度」整体 scale，
 * 使整页在横向铺满手机屏幕；纵向超出由 stage 裁切，无整页滚动。
 *
 * 与 min(vw/w,vh/h)「整页塞进一屏」不同：本版宽度优先，避免被页高绑死导致左右大黑边。
 *
 * 条件：竖屏 +（max-device-width:900px 或 粗指针非巨屏）
 * inner 固定排版宽，勿写 scrollWidth 为 width（与 100% 子元素正反馈会无限拉长）。
 * ResizeObserver：apply 内先 disconnect，finally 再 observe，避免套娃。
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
    if (!window.matchMedia('(orientation: portrait)').matches) return false;
    if (window.matchMedia('(max-device-width: 900px)').matches) return true;
    if (
      window.matchMedia('(pointer: coarse)').matches &&
      !window.matchMedia('(min-device-width: 1100px)').matches
    ) {
      return true;
    }
    return false;
  }

  function readDesignWFromMeta() {
    var el = document.querySelector('meta[name="viewport"]');
    if (!el) return 0;
    var m = (el.getAttribute('content') || '').match(/\bwidth\s*=\s*(\d+)/i);
    return m ? Math.max(1, parseInt(m[1], 10)) : 0;
  }

  /** Chrome iOS：screen 常为物理像素；短边÷dpr 估 CSS 宽 */
  function screenNarrowCss() {
    var n = Math.min(window.screen.width, window.screen.height);
    var dpr = window.devicePixelRatio || 1;
    if (n > 600) n = Math.round(n / Math.max(dpr, 2));
    if (n >= 280 && n <= 620) return n;
    return 0;
  }

  /**
   * 在 width=1280 下 outer.clientWidth 常仍为 1280；取真实可视宽 phoneW 与可视高 phoneH。
   */
  function readPhoneWH(designW, safeTop) {
    var vv = window.visualViewport;
    var iw = window.innerWidth;
    var ih = window.innerHeight;
    var minW = 200;

    if (vv && vv.width >= minW && vv.width + 8 < designW) {
      if (!(iw > 0 && vv.width + 24 < iw * 0.62)) {
        return { phoneW: vv.width, phoneH: Math.max(200, vv.height) };
      }
    }
    if (iw >= minW && iw + 8 < designW) {
      return { phoneW: iw, phoneH: Math.max(200, ih) };
    }

    var ow = outer.clientWidth;
    var oh = Math.max(0, outer.clientHeight - safeTop);
    if (designW > 0 && ow / designW >= 0.88) {
      var sn = screenNarrowCss();
      if (sn > 0) return { phoneW: sn, phoneH: Math.max(200, ih || oh) };
    }

    var phoneW = ow;
    var phoneH = oh;
    if (phoneW > designW * 0.88) {
      var sn2 = screenNarrowCss();
      if (sn2 > 0) phoneW = sn2;
      else phoneW = Math.min(480, Math.max(300, Math.round(designW * 0.302)));
    }
    if (phoneH < 200) phoneH = Math.max(200, ih || oh);
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
    if (ro) ro.disconnect();

    try {
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

      var ph = readPhoneWH(designW, safeTop);
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

      var scale = (phoneW / designW) * 0.998;
      if (scale > 3) scale = 3;

      inner.style.transformOrigin = 'top left';
      inner.style.transform = 'scale(' + scale + ')';

      outer.style.position = 'fixed';
      outer.style.left = '0';
      outer.style.top = '0';
      outer.style.right = 'auto';
      outer.style.bottom = 'auto';
      outer.style.width = phoneW + 'px';
      outer.style.height = phoneH + safeTop + 'px';
      outer.style.maxWidth = '100%';
      outer.style.boxSizing = 'border-box';
      outer.style.display = 'flex';
      outer.style.alignItems = 'flex-start';
      outer.style.justifyContent = 'center';
      outer.style.overflow = 'hidden';

      stage.style.width = phoneW + 'px';
      stage.style.height = phoneH + 'px';
      stage.style.overflow = 'hidden';
      stage.style.flexShrink = '0';
      stage.style.boxSizing = 'border-box';
    } finally {
      if (ro && isPortraitPhone()) ro.observe(inner);
    }
  }

  var t;
  function schedule() {
    clearTimeout(t);
    t = setTimeout(apply, 80);
  }

  window.addEventListener('resize', schedule);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule, { passive: true });
  }
  window.addEventListener('orientationchange', function () {
    setTimeout(schedule, 200);
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
