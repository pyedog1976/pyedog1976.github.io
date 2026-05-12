/**
 * 窄屏真机：论文详情 .pub-details 仅靠 CSS 的 :hover 不可靠且易误显。
 * 点击某条 li 切换 .is-open；点空白或其它处关闭。桌面不启用。
 */
(function () {
  if (!window.matchMedia('(max-device-width: 767px)').matches) return;

  function pubsRoot() {
    return document.querySelector('.about-section.about-pubs .publications-two-cols');
  }

  function closeAll(root) {
    if (!root) return;
    root.querySelectorAll('ol.bibliography > li.is-open').forEach(function (n) {
      n.classList.remove('is-open');
    });
  }

  document.addEventListener(
    'click',
    function (e) {
      if (e.target.closest('a, button, input, textarea, select')) return;

      var root = pubsRoot();
      if (!root) return;

      var li = e.target.closest('.publications-two-cols ol.bibliography > li');
      if (li && root.contains(li)) {
        var wasOpen = li.classList.contains('is-open');
        closeAll(root);
        if (!wasOpen) li.classList.add('is-open');
        return;
      }

      closeAll(root);
    },
    true
  );
})();
