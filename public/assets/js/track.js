/*
 * Affiliate Campaign Hub — landing-page tracker (~3 KB, no dependencies, no cookies).
 *
 * Records: page views, affiliate clicks, UTM parameters, referrer host, A/B variant.
 * Never records: names, emails (except explicit lead sign-ups), IPs, full referrer URLs.
 * Respects Do-Not-Track / Global Privacy Control when the page enables it, and can
 * require consent before any tracking (data-ah-consent="1").
 */
(function () {
  'use strict';
  var started = false;
  var cfg = {};

  function store(kind) {
    try { var s = window[kind]; var k = '__ah'; s.setItem(k, '1'); s.removeItem(k); return s; } catch (e) { return null; }
  }
  var ss = store('sessionStorage');
  var ls = store('localStorage');

  function rand(n) {
    var a = '';
    var c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var buf = window.crypto && window.crypto.getRandomValues ? window.crypto.getRandomValues(new Uint8Array(n)) : null;
    for (var i = 0; i < n; i++) a += c.charAt((buf ? buf[i] : Math.floor(Math.random() * 256)) % c.length);
    return a;
  }

  function privacyBlocked() {
    if (cfg.dnt !== '1') return false;
    var n = navigator;
    return n.doNotTrack === '1' || window.doNotTrack === '1' || n.globalPrivacyControl === true;
  }

  function consentState() {
    if (cfg.consent !== '1') return 'yes';
    return (ls && ls.getItem('ah_consent')) || 'unknown';
  }

  function canTrack() {
    return !!cfg.api && !!cfg.page && !privacyBlocked() && consentState() === 'yes';
  }

  function sessionId() {
    if (!ss) return '';
    var sid = ss.getItem('ah_sid');
    if (!sid) { sid = rand(16); ss.setItem('ah_sid', sid); }
    return sid;
  }

  function utm() {
    var keys = ['source', 'medium', 'campaign', 'content', 'term'];
    var q = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (p) {
      var i = p.indexOf('=');
      if (i > 0) { try { q[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); } catch (e) { /* skip */ } }
    });
    var found = {};
    var any = false;
    keys.forEach(function (k) { if (q['utm_' + k]) { found[k] = String(q['utm_' + k]).slice(0, 100); any = true; } });
    if (any) { if (ss) ss.setItem('ah_utm', JSON.stringify(found)); return found; }
    try { return ss ? JSON.parse(ss.getItem('ah_utm') || '{}') : {}; } catch (e) { return {}; }
  }

  function referrerHost() {
    var r = document.referrer;
    if (!r) return '';
    var m = /^https?:\/\/([^/?#]+)/i.exec(r);
    if (!m || m[1] === location.host) return '';
    return 'https://' + m[1] + '/'; // host only — the server keeps nothing more
  }

  // --------------------------------------------------------------- A/B tests

  var assigned = [];
  function applyAb() {
    var el = document.getElementById('ah-ab');
    if (!el) return;
    var tests;
    try { tests = JSON.parse(el.textContent || '[]'); } catch (e) { return; }
    var persist = canTrack();
    tests.forEach(function (t) {
      if (!t || !t.id || !t.variants || t.variants.length < 2) return;
      var key = 'ah_ab_' + t.id;
      var vid = persist && ls ? ls.getItem(key) : null;
      var variant = null;
      t.variants.forEach(function (v) { if (v.id === vid) variant = v; });
      if (!variant) {
        // Without tracking permission everyone sees the control and nothing is stored.
        variant = persist ? t.variants[Math.floor(Math.random() * t.variants.length)] : t.variants[0];
        if (persist && ls) ls.setItem(key, variant.id);
      }
      if (variant !== t.variants[0]) render(t.element, variant.value);
      if (persist) assigned.push(t.id + ':' + variant.id);
    });
  }

  function render(element, value) {
    var i;
    if (element === 'headline' || element === 'cta_text') {
      var nodes = document.querySelectorAll('[data-ah-ab="' + element + '"]');
      for (i = 0; i < nodes.length; i++) nodes[i].textContent = value;
    } else if (element === 'cta_placement') {
      var keep = value.split(',');
      var ctas = document.querySelectorAll('[data-ah-cta-wrap]');
      for (i = 0; i < ctas.length; i++) if (keep.indexOf(ctas[i].getAttribute('data-ah-cta-wrap')) === -1) ctas[i].style.display = 'none';
    } else if (/^hide:/.test(value)) {
      value.slice(5).split(',').forEach(function (s) {
        var sec = document.querySelectorAll('[data-ah-section="' + s + '"]');
        for (var j = 0; j < sec.length; j++) sec[j].style.display = 'none';
      });
    }
  }

  // --------------------------------------------------------------- transport

  function send(action, payload) {
    if (!canTrack()) return;
    var body = JSON.stringify({ action: action, payload: payload });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(cfg.api, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
    } catch (e) { /* fall through */ }
    try { fetch(cfg.api, { method: 'POST', body: body, mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } }); } catch (e) { /* ignore */ }
  }

  function base() {
    return { pageId: cfg.page, sessionId: sessionId(), referrer: referrerHost(), utm: utm(), variant: assigned.join('|') };
  }

  function onClick(ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[data-ah-link]') : null;
    if (!a) return;
    var p = base();
    p.linkId = a.getAttribute('data-ah-link');
    p.ctaId = a.getAttribute('data-ah-cta') || 'other';
    send('recordAffiliateClick', p);
  }

  // --------------------------------------------------------------- lead form (explicit consent)

  function bindLeadForms() {
    var forms = document.querySelectorAll('form[data-ah-lead]');
    Array.prototype.forEach.call(forms, function (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var msg = form.querySelector('.ah-lead-msg');
        var email = form.elements.email.value.trim();
        var consent = form.elements.consent.checked;
        if (!consent) { msg.textContent = 'Please tick the consent box to receive the email.'; return; }
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { msg.textContent = 'Please enter a valid email address.'; return; }
        if (!cfg.api) { msg.textContent = 'Sign-up is not available right now.'; return; }
        msg.textContent = 'Sending…';
        fetch(cfg.api, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ action: 'recordLead', payload: { email: email, consent: true, pageId: cfg.page, website: form.elements.website.value, sessionId: sessionId() } })
        }).then(function (r) { return r.json(); }).then(function (res) {
          msg.textContent = res.success ? 'Thanks! Check your inbox.' : (res.error && res.error.message) || 'Something went wrong.';
          if (res.success) form.reset();
        }).catch(function () { msg.textContent = 'Network error — please try again.'; });
      });
    });
  }

  // --------------------------------------------------------------- consent banner

  function consentBanner(next) {
    if (cfg.consent !== '1' || consentState() !== 'unknown' || privacyBlocked()) return next();
    var bar = document.createElement('div');
    bar.className = 'ah-consent-banner';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Analytics consent');
    bar.innerHTML = '<span>May I use anonymous, cookie-free analytics to see which content is useful? </span>' +
      (cfg.privacy ? '<a href="' + cfg.privacy.replace(/"/g, '&quot;') + '">Privacy policy</a>' : '');
    ['Accept', 'Decline'].forEach(function (label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', function () {
        if (ls) ls.setItem('ah_consent', label === 'Accept' ? 'yes' : 'no');
        bar.parentNode.removeChild(bar);
        if (label === 'Accept') next();
      });
      bar.appendChild(b);
    });
    document.body.appendChild(bar);
  }

  function init() {
    var b = document.body;
    if (!b) return;
    cfg = {
      api: b.getAttribute('data-ah-api') || '',
      page: b.getAttribute('data-ah-page') || '',
      dnt: b.getAttribute('data-ah-dnt') || '1',
      consent: b.getAttribute('data-ah-consent') || '0',
      privacy: b.getAttribute('data-ah-privacy') || ''
    };
    bindLeadForms();
    if (!started) document.addEventListener('click', onClick, true);
    if (!started) document.addEventListener('auxclick', onClick, true);
    started = true;
    consentBanner(function () {
      applyAb();
      var p = base();
      p.path = location.pathname;
      send('recordPageView', p);
    });
  }

  window.AHTrack = { init: init };
  if (document.body && document.body.getAttribute('data-ah-auto') === '0') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
