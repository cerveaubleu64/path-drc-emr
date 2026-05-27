(function () {
  'use strict';

  var STYLE_ID = 'path-drc-login-illustration-style';
  var BODY_CLASS = 'path-drc-on-login';

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '@media (min-width: 64rem) {' +
      '  body.' + BODY_CLASS + '::before {' +
      '    content: "";' +
      '    position: fixed;' +
      '    top: 0; right: 0; bottom: 0;' +
      '    width: 50vw;' +
      '    background-image: url("/openmrs/spa/AfyaDME.png");' +
      '    background-size: cover;' +
      '    background-position: center;' +
      '    background-repeat: no-repeat;' +
      '    pointer-events: none;' +
      '    z-index: 0;' +
      '  }' +
      '  body.' + BODY_CLASS + ' [class*="esm-login__login__container"] {' +
      '    margin-right: 50vw;' +
      '  }' +
      '}';
    (document.head || document.documentElement).appendChild(style);
  }

  function update() {
    if (!document.body) return;
    var onLogin = /\/login(\b|\/|$)/.test(window.location.pathname);
    document.body.classList.toggle(BODY_CLASS, onLogin);
  }

  injectStyleOnce();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update, { once: true });
  } else {
    update();
  }

  window.addEventListener('popstate', update);

  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      // microtask so URL is committed first
      Promise.resolve().then(update);
      return result;
    };
  });
})();
