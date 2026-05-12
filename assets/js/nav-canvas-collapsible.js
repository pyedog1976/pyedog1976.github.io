/**
 * 窄布局画布（与 viewport-1180-fit.js 一致：<1180）：可选悬停展开导航折叠层；
 * 触控设备在汉堡上长按约 500ms 也可展开（短按仍走 Bootstrap 默认切换）。
 */
(function ($) {
  'use strict';

  var CANVAS_W = 1180;
  var LONG_PRESS_MS = 500;
  var HIDE_DELAY_MS = 220;

  function layoutViewportWidth() {
    if (window.visualViewport && window.visualViewport.width > 0) {
      return window.visualViewport.width;
    }
    return (
      window.innerWidth ||
      document.documentElement.clientWidth ||
      CANVAS_W
    );
  }

  function needsCanvas() {
    return layoutViewportWidth() < CANVAS_W;
  }

  var hoverMq =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: hover) and (pointer: fine)')
      : { matches: false, addEventListener: null, addListener: null };

  var hideTimer = null;
  var longPressTimer = null;

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function scheduleHide($collapse) {
    clearHideTimer();
    hideTimer = setTimeout(function () {
      hideTimer = null;
      $collapse.collapse('hide');
    }, HIDE_DELAY_MS);
  }

  function bindCanvasNav() {
    var $nav = $('#site-scale-inner #navbar');
    var $collapse = $('#navbarNav');
    if (!$nav.length || !$collapse.length) return;

    $nav.off('.canvasNavHover');
    $nav.find('.navbar-toggler').off('.canvasNavLongPress');

    clearHideTimer();
    clearLongPress();

    if (!needsCanvas()) return;

    if (hoverMq.matches) {
      $nav.on('mouseenter.canvasNavHover', function () {
        clearHideTimer();
        $collapse.collapse('show');
      });
      $nav.on('mouseleave.canvasNavHover', function () {
        scheduleHide($collapse);
      });
    }

    var $toggler = $nav.find('.navbar-toggler');

    $toggler.on('touchstart.canvasNavLongPress', function () {
      clearLongPress();
      longPressTimer = setTimeout(function () {
        longPressTimer = null;
        $collapse.collapse('show');
      }, LONG_PRESS_MS);
    });

    $toggler.on(
      'touchend.canvasNavLongPress touchcancel.canvasNavLongPress',
      function () {
        clearLongPress();
      }
    );

    $toggler.on('pointerdown.canvasNavLongPress', function (e) {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      clearLongPress();
      longPressTimer = setTimeout(function () {
        longPressTimer = null;
        $collapse.collapse('show');
      }, LONG_PRESS_MS);
    });

    $toggler.on(
      'pointerup.canvasNavLongPress pointercancel.canvasNavLongPress pointerleave.canvasNavLongPress',
      function (e) {
        if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
        clearLongPress();
      }
    );
  }

  function init() {
    bindCanvasNav();

    function onLayoutChange() {
      bindCanvasNav();
    }

    window.addEventListener('resize', onLayoutChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onLayoutChange);
    }
    if (hoverMq.addEventListener) {
      hoverMq.addEventListener('change', onLayoutChange);
    } else if (hoverMq.addListener) {
      hoverMq.addListener(onLayoutChange);
    }
  }

  $(init);
})(jQuery);
