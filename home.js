// A "Home" button at the top right of every page except the front page. Include with <script src="home.js"></script>;
// a page in a sub-folder passes data-home="../". publish.py points it at the public front page.
(function () {
  var me = document.currentScript, home = (me && me.getAttribute('data-home')) || 'index.html';
  var a = document.createElement('a');
  a.href = home; a.textContent = '← Home'; a.title = 'Back to the Pikes Peak Rail Atlas front page'; a.setAttribute('aria-label', 'Back to the atlas front page');
  a.style.cssText = 'position:fixed;top:10px;right:12px;z-index:5000;font:14px Georgia,"Times New Roman",serif;padding:6px 12px;border-radius:16px;' +
    'background:#fffdf6;color:#7a4a16;border:1px solid #cfc7b3;text-decoration:none;box-shadow:0 1px 4px rgba(0,0,0,.18)';
  a.onmouseenter = function () { a.style.borderColor = '#8a5a2b'; }; a.onmouseleave = function () { a.style.borderColor = '#cfc7b3'; };
  (document.body || document.documentElement).appendChild(a);
})();
