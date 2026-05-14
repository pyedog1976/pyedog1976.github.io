/**
 * 窄视口（含 iPhone「请求桌面网站」、visualViewport）：在 #site-scale-inner 内固定 1180px 排版，
 * 用内联 transform 缩放到当前布局宽度；#site-scale-outer 高度 = scrollHeight * scale。
 * 不缩放 body。宽 >= 1180 时清除内联，恢复桌面。
 * 文件名避免含 “canvas” 以免部分广告拦截扩展误拦。
 *
 * 手机（CSS 宽 ≤767px）：双指缩放会改变 visualViewport，若仍用其 width 重算 scale，整页会「跟着缩」。
 * 此处改用 innerWidth，并忽略 visualViewport 的 resize，仅保留 window resize / 方向变化等。
 *
 * 电脑（存在精细指针）：Ctrl± 缩放时 visualViewport.width 常与布局宽度不一致，而 #site-scale-outer 为 100%
 * 时以布局视口为宽；若仍用 vv.width 算 scale，会出现留白/裁切/与 100vw 系 CSS 错位。故同样用布局宽度
 * 并忽略 vv.resize；触控平板等无 fine pointer 时仍可用 visualViewport（如 iPad 类场景）。
 *
 * 电脑拖拽变窄：若仍按当前 innerWidth 重算 scale，整页会随窗口持续「缩小」。在 fine pointer 下于 <1180
 * 内用「当前曾达到的最大布局宽度」作为 scale 基准：继续拖窄时基准不降低，缩放不变；在仍 <1180 时拉宽
 * 则基准可升高以利用空间。回到 ≥1180 时清除。窗口窄于当前基准时 outer 允许横向滚动。手机/触控不走此逻辑。
 */
(function () {
  var CANVAS_W = 1180;
  /** 电脑端：<1180 内用于固定「不再随拖窄而缩小」的 scale 的基准宽度（取本段内曾达到的最大布局宽） */
  var fineDesktopScaleBasisW = null;

  function isPhoneLayout() {
    try {
      return window.matchMedia('(max-width: 767px)').matches;
    } catch (e) {
      return (window.innerWidth || 0) < 768;
    }
  }

  /** 典型键鼠电脑：避免用 visualViewport.width 参与窄屏画布缩放 */
  function hasFinePointer() {
    try {
      return window.matchMedia('(pointer: fine)').matches;
    } catch (e) {
      return true;
    }
  }

  function layoutWidthForScale() {
    return (
      window.innerWidth ||
      document.documentElement.clientWidth ||
      CANVAS_W
    );
  }

  function layoutViewportWidth() {
    if (isPhoneLayout()) {
      return layoutWidthForScale();
    }
    if (hasFinePointer()) {
      return layoutWidthForScale();
    }
    if (window.visualViewport && window.visualViewport.width > 0) {
      return window.visualViewport.width;
    }
    return layoutWidthForScale();
  }

  function needsCanvas() {
    return layoutViewportWidth() < CANVAS_W;
  }

  function clearCanvasStyles(outer, inner) {
    if (!outer || !inner) return;
    outer.style.height = '';
    outer.style.width = '';
    outer.style.maxWidth = '';
    outer.style.overflowX = '';
    outer.style.overflowY = '';
    outer.style.position = '';
    outer.style.boxSizing = '';
    inner.style.position = '';
    inner.style.top = '';
    inner.style.left = '';
    inner.style.width = '';
    inner.style.maxWidth = '';
    inner.style.boxSizing = '';
    inner.style.transformOrigin = '';
    inner.style.webkitTransform = '';
    inner.style.transform = '';
  }

  function applyCanvasStyles(outer, inner, vw, vwLayout) {
    var scale = vw / CANVAS_W;
    outer.style.position = 'relative';
    outer.style.width = '100%';
    outer.style.maxWidth = '100vw';
    var allowHScroll =
      hasFinePointer() &&
      !isPhoneLayout() &&
      fineDesktopScaleBasisW !== null &&
      vwLayout < vw;
    outer.style.overflowX = allowHScroll ? 'auto' : 'hidden';
    outer.style.overflowY = 'hidden';
    outer.style.boxSizing = 'border-box';
    var rawH = Math.max(1, Math.ceil(inner.scrollHeight * scale - 0.5));
    /* 手机：避免底栏/底边框被 outer overflow-y:hidden 裁掉一截（取整 + 安全区） */
    if (isPhoneLayout()) {
      rawH += 48;
    }
    outer.style.height = rawH + 'px';

    inner.style.position = 'absolute';
    inner.style.top = '0';
    inner.style.left = '0';
    inner.style.width = CANVAS_W + 'px';
    inner.style.maxWidth = 'none';
    inner.style.boxSizing = 'border-box';
    inner.style.transformOrigin = 'top left';
    var t = 'scale(' + scale + ')';
    inner.style.webkitTransform = t;
    inner.style.transform = t;
  }

  function update() {
    var outer = document.getElementById('site-scale-outer');
    var inner = document.getElementById('site-scale-inner');
    if (!outer || !inner) return;

    var vwLayout = layoutViewportWidth();

    if (hasFinePointer() && !isPhoneLayout()) {
      if (vwLayout >= CANVAS_W) {
        fineDesktopScaleBasisW = null;
      } else {
        if (fineDesktopScaleBasisW === null) {
          fineDesktopScaleBasisW = vwLayout;
        } else {
          fineDesktopScaleBasisW = Math.max(fineDesktopScaleBasisW, vwLayout);
        }
      }
    } else {
      fineDesktopScaleBasisW = null;
    }

    if (!needsCanvas()) {
      clearCanvasStyles(outer, inner);
      return;
    }

    var basisForScale = vwLayout;
    if (hasFinePointer() && !isPhoneLayout() && fineDesktopScaleBasisW !== null) {
      basisForScale = fineDesktopScaleBasisW;
    }
    var vwScale = basisForScale;
    if (isPhoneLayout() && vwLayout < 768) {
      vwScale = Math.max(280, vwLayout - 4);
    }
    applyCanvasStyles(outer, inner, vwScale, vwLayout);
  }

  function init() {
    update();
    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        'resize',
        function () {
          if (isPhoneLayout() || hasFinePointer()) return;
          window.requestAnimationFrame(update);
        },
        { passive: true }
      );
    }
    window.addEventListener(
      'resize',
      function () {
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
    window.addEventListener('orientationchange', function () {
      window.setTimeout(update, 280);
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

  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(update);
  });
})();
