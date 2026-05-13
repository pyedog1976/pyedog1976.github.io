/**
 * 宽屏（≥xl 且精细指针）：CV 语言下拉悬停展开，避免依赖点击。
 * 窄屏 / 触控仍走 Bootstrap 默认点击。
 */
(function ($) {
  'use strict';

  var CV_SEL = '#navbar .nav-item-cv';
  var DESKTOP_CV =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(
          '(min-width: 1200px) and (hover: hover) and (pointer: fine)'
        )
      : { matches: false, addEventListener: null, addListener: null };

  var hideTimer = null;
  var HIDE_MS = 220;

  function clearHide() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function bind() {
    var $cv = $(CV_SEL);
    if (!$cv.length) return;
    var $toggle = $cv.find('[data-toggle="dropdown"]').first();
    if (!$toggle.length) return;

    $cv.off('.cvHoverDd');
    clearHide();

    if (!DESKTOP_CV.matches) return;

    $cv.on('mouseenter.cvHoverDd', function () {
      clearHide();
      $toggle.dropdown('show');
    });
    $cv.on('mouseleave.cvHoverDd', function () {
      hideTimer = setTimeout(function () {
        hideTimer = null;
        $toggle.dropdown('hide');
      }, HIDE_MS);
    });
  }

  function init() {
    bind();
    function onChange() {
      bind();
    }
    window.addEventListener('resize', onChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onChange);
    }
    if (DESKTOP_CV.addEventListener) {
      DESKTOP_CV.addEventListener('change', onChange);
    } else if (DESKTOP_CV.addListener) {
      DESKTOP_CV.addListener(onChange);
    }
  }

  $(init);
})(jQuery);
