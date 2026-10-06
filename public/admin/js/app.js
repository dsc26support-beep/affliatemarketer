/* Affiliate Campaign Hub — app shell: hash router, navigation, mode badge. */
(function () {
  'use strict';
  var view = document.getElementById('view');
  var nav = document.getElementById('nav');
  var toggle = document.querySelector('.nav-toggle');
  var renderSeq = 0;

  // Route table: pattern -> [navKey, view function name]
  var ROUTES = [
    [/^\/dashboard$/, 'dashboard', 'dashboard'],
    [/^\/offers$/, 'offers', 'offerList'],
    [/^\/offers\/new$/, 'offers', 'offerForm'],
    [/^\/offers\/(prd_[a-z0-9_]+)\/edit$/, 'offers', 'offerForm'],
    [/^\/offers\/(prd_[a-z0-9_]+)$/, 'offers', 'offerDetail'],
    [/^\/campaigns$/, 'campaigns', 'campaignList'],
    [/^\/campaigns\/(cmp_[a-z0-9_]+)$/, 'campaigns', 'campaignDetail'],
    [/^\/pages$/, 'pages', 'pageList'],
    [/^\/pages\/(pg_[a-z0-9_]+)$/, 'pages', 'pageEditor'],
    [/^\/content$/, 'content', 'contentPlan'],
    [/^\/social$/, 'social', 'social'],
    [/^\/email$/, 'email', 'email'],
    [/^\/analytics$/, 'analytics', 'analytics'],
    [/^\/links$/, 'links', 'links'],
    [/^\/settings$/, 'settings', 'settings']
  ];

  function parseHash() {
    var raw = location.hash.replace(/^#/, '') || '/dashboard';
    var q = {};
    var i = raw.indexOf('?');
    if (i !== -1) { q = AH.util.parseQuery(raw.slice(i + 1)); raw = raw.slice(0, i); }
    return { path: raw, query: q };
  }

  function updateModeBadge() {
    var badge = document.getElementById('mode-badge');
    var demo = Backend.isDemo();
    badge.textContent = demo ? 'Demo · browser storage' : 'Connected · Google Sheets';
    badge.className = 'mode' + (demo ? '' : ' remote');
  }

  function render() {
    var seq = ++renderSeq;
    var r = parseHash();
    var match = null;
    for (var i = 0; i < ROUTES.length; i++) {
      var m = ROUTES[i][1] && ROUTES[i][0].exec(r.path);
      if (m) { match = { nav: ROUTES[i][1], fn: ROUTES[i][2], params: m.slice(1), query: r.query }; break; }
    }
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
      var on = match && a.getAttribute('data-nav') === match.nav;
      a.classList.toggle('active', !!on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    updateModeBadge();
    if (!match || !Views[match.fn]) {
      view.innerHTML = UI.empty('Page not found', 'This screen does not exist.', '<a class="btn" href="#/dashboard">Go to dashboard</a>');
      return;
    }
    // Fresh container per render: drops delegated listeners from the previous screen
    // (otherwise handlers accumulate and actions fire more than once).
    var fresh = view.cloneNode(false);
    view.parentNode.replaceChild(fresh, view);
    view = fresh;
    UI.loading(view);
    var ctx = {
      params: match.params,
      query: match.query,
      isCurrent: function () { return seq === renderSeq; },
      rerender: render
    };
    Promise.resolve()
      .then(function () { return Views[match.fn](view, ctx); })
      .catch(function (err) {
        console.error(err);
        if (seq === renderSeq) view.innerHTML = UI.errorBox({ message: 'Unexpected error while rendering this screen.', code: 'CLIENT_ERROR' });
      })
      .then(function () {
        if (seq === renderSeq && document.activeElement === document.body) view.focus({ preventScroll: true });
      });
  }

  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  window.App = { render: render, updateModeBadge: updateModeBadge };
  render();
})();
