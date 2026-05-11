/**
 * 竖屏手机：整页（与 meta viewport 宽布局一致）整体 transform 缩放；以宽度对齐视口，
 * 不出现横向滚动与两侧大块留白；纵向超出由 stage 裁切，无页面滚动条。
 * 视口外区域由 .viewport-fit-outer 的 background（与站点 --bg 一致）铺满。
 *
 * 条件：max-device-width: 900px 且 orientation: portrait
 * 算法：双栏与电脑一致 = 按 layoutW（documentElement.clientWidth，通常与 meta 一致）排版；
 * scale = 真实可视宽 vw / layoutW，使整页横向正好铺满手机屏幕（不用 scrollWidth 做分母，避免被撑宽后反而缩得更小）。
 * meta width=1280 时须用 visualViewport / innerWidth（明显小于 layoutW 时）或 screen 窄边估 vw，并把 outer 收成 vw 宽。
 * transform 作用于 inner，origin 左上；outer/stage 与 vw×vh 对齐。
 *
 * inner 必须按「布局视口」宽度排版（documentElement.clientWidth，与 meta width=1280 一致），
 * 不能默认 100% 跟 stage 变窄；否则双栏会在 ~390px 下重排，极窄且纵向巨长。
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

  /**
   * 在 width=1280 等「虚宽」布局下，layoutW≈1280，须单独得到「肉眼可视」vw/vh（CSS 像素量级）。
   * 注意：apply 末尾会把 outer 收成 vw 宽，下一轮若只用 outer.clientWidth 仍能得到 vw，但首轮应优先 vv / innerWidth。
   */
  function effectiveViewportCssSize(layoutW) {
    var vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0 && vv.width + 2 < layoutW) {
      return { vw: vv.width, vh: vv.height };
    }
    var iw = window.innerWidth;
    var ih = window.innerHeight;
    if (iw > 0 && ih > 0 && iw + 2 < layoutW) {
      return { vw: iw, vh: ih };
    }
    var vw = outer.clientWidth;
    var vh = outer.clientHeight;
    if (isPortraitPhone() && layoutW > 0 && vw / layoutW >= 0.92) {
      var sw = window.screen.width;
      var sh = window.screen.height;
      var narrow = Math.min(sw, sh);
      /* 排除 screen 为物理像素量级（如 1080）的误用：常见手机竖屏 CSS 宽度约 320–430 */
      if (narrow > 240 && narrow <= 520 && narrow < vw * 0.92) {
        vw = narrow;
      }
    }
    return { vw: vw, vh: vh };
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

      var layoutW = document.documentElement.clientWidth || outer.clientWidth;
      var vp = effectiveViewportCssSize(layoutW);
      var vw = vp.vw;
      var vh = vp.vh;
      /* 固定为布局视口宽，避免父级 stage 为真实屏宽时 inner 被挤窄导致整页按窄屏重排 */
      inner.style.width = layoutW + 'px';
      inner.style.boxSizing = 'border-box';

      var h = inner.scrollHeight;

      if (layoutW < 1 || h < 1 || vw < 1 || vh < 1) {
        if (badMeasureRetries++ < MAX_BAD_MEASURE) {
          requestAnimationFrame(function () {
            requestAnimationFrame(apply);
          });
        }
        return;
      }
      badMeasureRetries = 0;

      /*
       * 代数：inner 定宽 layoutW、origin 左上、scale(s) 时横向视觉宽度 ≈ layoutW * s。
       * 要铺满 stage（宽 vw）：layoutW * s = vw ⇒ s = vw / layoutW（与 scrollWidth 无关）。
       */
      var s = layoutW > 0 ? vw / layoutW : 1;
      if (s > 0 && s < 0.04) s = 0.04;
      if (s > 4) s = 4;

      inner.style.transformOrigin = 'top left';
      inner.style.transform = 'scale(' + s + ')';

      outer.style.position = 'fixed';
      outer.style.left = '0';
      outer.style.top = '0';
      outer.style.right = 'auto';
      outer.style.bottom = 'auto';
      outer.style.width = vw + 'px';
      outer.style.height = vh + 'px';
      outer.style.maxWidth = '100%';
      outer.style.boxSizing = 'border-box';
      outer.style.display = 'flex';
      outer.style.alignItems = 'flex-start';
      outer.style.justifyContent = 'flex-start';
      outer.style.overflow = 'hidden';

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
