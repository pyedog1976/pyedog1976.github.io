/**
 * 窄视口（含 iPhone「请求桌面网站」、visualViewport）：在 #site-scale-inner 内固定 1180px 排版，
 * 用内联 transform 缩放到当前布局宽度；#site-scale-outer 高度 = scrollHeight * scale。
 * 不缩放 body。宽 >= 1180 时清除内联，恢复桌面。
 * 文件名避免含 “canvas” 以免部分广告拦截扩展误拦。
 *
 * 手机（CSS 宽 ≤767px）：双指缩放会改变 visualViewport，若仍用其 width 重算 scale，整页会「跟着缩」。
 * 此处改用 innerWidth，并忽略 visualViewport 的 resize，仅保留 window resize / 方向变化等。
 *
 * 电脑固定 1180+滚动：优先 (any-pointer:fine)（外接鼠标/触控板在 Linux 上常只有 any 为 fine）；
 * 若媒体查询全否但 maxTouchPoints===0，按无触摸键鼠桌面回退（部分 Wayland/GTK 误报 hover/pointer）。
 * 不走画布时在 html 上加 site-desktop-scroll-1180，与 CSS §16a-fine 一致（1180 固定宽 + 视口裁切，不 scale）。
 * 纯触控机（仅 coarse、有触摸点）仍走画布 + visualViewport。
 * 视口 768–1179 且键鼠：§16a 的 scale 不生效（html:not(.site-desktop-scroll-1180)），避免与 fine 路径冲突。
 */
(function () {
  var CANVAS_W = 1180;
  var CLS_DESKTOP_SCROLL = 'site-desktop-scroll-1180';

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

  function maxTouchPoints() {
    if (typeof navigator.maxTouchPoints === 'number') {
      return navigator.maxTouchPoints;
    }
    if (typeof navigator.msMaxTouchPoints === 'number') {
      return navigator.msMaxTouchPoints;
    }
    return 'ontouchstart' in window ? 1 : 0;
  }

  /**
   * 窄视口下用固定 1180+滚动、不用整页 scale。
   * 典型纯触控手机仍走画布（避免接鼠标时 any-pointer:fine 误判）。
   * any-pointer:fine 覆盖「主指针 coarse 但有鼠标」；maxTouchPoints===0 覆盖 Linux 上全误报为 coarse 的键鼠环境。
   */
  function useScrollLayoutInsteadOfCanvas() {
    try {
      if (maxTouchPoints() > 0) {
        if (
          window.matchMedia(
            '(max-width: 767px) and (hover: none) and (pointer: coarse)'
          ).matches
        ) {
          return false;
        }
      }
    } catch (e0) {}
    try {
      if (window.matchMedia('(any-pointer: fine)').matches) return true;
    } catch (e) {}
    try {
      if (window.matchMedia('(pointer: fine)').matches) return true;
    } catch (e2) {}
    return maxTouchPoints() === 0;
  }

  /**
   * 仅「视口 ≥768 且 <1180」的窄屏键鼠桌机挂 site-desktop-scroll-1180（§16a-fine / §16c）。
   * 视口 ≤767 时绝不挂：否则 §16c 会盖过 §16b，手机三叠（Intro+News → 论文）被破坏。
   */
  function syncDesktopScrollClass(vwLayout) {
    var on =
      useScrollLayoutInsteadOfCanvas() &&
      vwLayout < CANVAS_W &&
      vwLayout >= 768;
    document.documentElement.classList.toggle(CLS_DESKTOP_SCROLL, on);
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
    if (useScrollLayoutInsteadOfCanvas()) {
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
    if (useScrollLayoutInsteadOfCanvas()) {
      return false;
    }
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
    inner.style.marginLeft = '';
  }

  function applyCanvasStyles(outer, inner, vw) {
    var scale = vw / CANVAS_W;
    outer.style.position = 'relative';
    outer.style.width = '100%';
    outer.style.maxWidth = '100vw';
    outer.style.overflowX = 'hidden';
    outer.style.overflowY = 'hidden';
    outer.style.boxSizing = 'border-box';
    var rawH = Math.max(1, Math.ceil(inner.scrollHeight * scale - 0.5));
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
    syncDesktopScrollClass(vwLayout);

    if (!needsCanvas()) {
      clearCanvasStyles(outer, inner);
      return;
    }

    var vwScale = vwLayout;
    if (isPhoneLayout() && vwLayout < 768) {
      vwScale = Math.max(280, vwLayout - 4);
    }
    applyCanvasStyles(outer, inner, vwScale);
  }

  function init() {
    update();
    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        'resize',
        function () {
          if (isPhoneLayout() || useScrollLayoutInsteadOfCanvas()) return;
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
