/*
 * Affiliate Campaign Hub — backend client.
 *
 * Two interchangeable modes behind one `Backend.call(action, payload)` promise:
 *  - "remote": POSTs to the Apps Script web app (Google Sheets database).
 *  - "demo":   runs the exact same API code in the browser with localStorage, so the
 *              dashboard can be tried (and tested) without any setup.
 * The admin token is kept in sessionStorage by default (localStorage only if the user
 * opts in on a trusted device). It is never written into the repository.
 */
(function () {
  'use strict';
  var CFG_KEY = 'ah_admin_cfg';
  var TOKEN_KEY = 'ah_admin_token';
  var DB_KEY = 'ah_demo_db';

  function safeGet(storage, key) { try { return window[storage].getItem(key); } catch (e) { return null; } }
  function safeSet(storage, key, val) { try { if (val === null) window[storage].removeItem(key); else window[storage].setItem(key, val); } catch (e) { /* storage unavailable */ } }

  function readConfig() {
    var cfg = {};
    try { cfg = JSON.parse(safeGet('localStorage', CFG_KEY) || '{}') || {}; } catch (e) { cfg = {}; }
    var site = window.AH_SITE || {};
    if (!cfg.apiUrl && site.apiUrl) cfg.apiUrl = site.apiUrl;
    if (!cfg.mode) cfg.mode = cfg.apiUrl ? 'remote' : 'demo';
    if (!cfg.timeoutMs) cfg.timeoutMs = 30000;
    cfg.token = safeGet('sessionStorage', TOKEN_KEY) || safeGet('localStorage', TOKEN_KEY) || '';
    return cfg;
  }

  var config = readConfig();
  var demoApi = null;

  function saveConfig(next) {
    var token = next.token;
    var remember = !!next.rememberToken;
    var stored = { mode: next.mode, apiUrl: next.apiUrl || '', timeoutMs: Number(next.timeoutMs) || 30000, rememberToken: remember };
    safeSet('localStorage', CFG_KEY, JSON.stringify(stored));
    if (token !== undefined) {
      safeSet('sessionStorage', TOKEN_KEY, token || null);
      safeSet('localStorage', TOKEN_KEY, remember && token ? token : null);
    }
    config = readConfig();
    config.rememberToken = remember;
  }

  function getDemoApi() {
    if (demoApi) return demoApi;
    var data = {};
    try { data = JSON.parse(safeGet('localStorage', DB_KEY) || '{}') || {}; } catch (e) { data = {}; }
    var timer = null;
    var store = AH.MemoryStore(data, function (d) {
      clearTimeout(timer);
      timer = setTimeout(function () { safeSet('localStorage', DB_KEY, JSON.stringify(d)); }, 50);
    });
    demoApi = AH.createApi({
      store: store,
      platform: AH.MemoryPlatform({ adminToken: 'local-demo', onError: function (e) { console.error(e); } })
    });
    return demoApi;
  }

  function resetDemo() {
    safeSet('localStorage', DB_KEY, null);
    demoApi = null;
  }

  function errorResult(code, message) {
    return { success: false, error: { code: code, message: message } };
  }

  function remoteCall(action, payload) {
    if (!config.apiUrl) return Promise.resolve(errorResult('NOT_CONFIGURED', 'Add your Apps Script web app URL in Settings.'));
    if (!/^https:\/\//.test(config.apiUrl)) return Promise.resolve(errorResult('NOT_CONFIGURED', 'The API URL must start with https://.'));
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; if (ctrl) ctrl.abort(); }, config.timeoutMs);
    // text/plain keeps this a "simple" CORS request (no preflight, which Apps Script can't answer).
    return fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: config.token, payload: payload || {} }),
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.text().then(function (text) {
        try { return JSON.parse(text); } catch (e) {
          return errorResult('BAD_RESPONSE', 'The server did not return JSON (HTTP ' + r.status + '). Check that the web app is deployed with access "Anyone".');
        }
      });
    }).catch(function () {
      if (timedOut) return errorResult('TIMEOUT', 'The server took longer than ' + Math.round(config.timeoutMs / 1000) + 's to respond (Apps Script may be cold-starting or busy). Please try again.');
      return errorResult('NETWORK_ERROR', 'Could not reach the server. Check your connection and the API URL.');
    }).finally(function () { clearTimeout(timer); });
  }

  function demoCall(action, payload) {
    return new Promise(function (resolve) {
      // Async like the real backend so the UI exercises its loading states.
      setTimeout(function () {
        var copy = payload === undefined ? {} : JSON.parse(JSON.stringify(payload));
        resolve(getDemoApi().handle({ action: action, token: 'local-demo', payload: copy }));
      }, 0);
    });
  }

  var SAMPLE_OFFER = {
    name: 'Example Sleep Routine Course (sample data)',
    network: 'clickbank',
    affiliateUrl: 'https://hop.clickbank.net/?affiliate=yourid&vendor=example',
    productPageUrl: 'https://example.com/sleep-course',
    category: 'Online course',
    niche: 'Parenting',
    targetAudience: 'parents of toddlers who struggle with bedtime',
    problem: 'toddlers who resist bedtime and wake up at night',
    mainBenefit: 'build a calm, consistent bedtime routine',
    commissionInfo: '50% per sale (sample)',
    commissionPercent: 50,
    price: 47,
    currency: 'USD',
    recurring: 'no',
    productType: 'digital_course',
    refundPolicy: '60-day refund through ClickBank (sample — verify on the real offer)',
    notes: 'Sample offer to explore the workflow. Replace with a real offer.',
    status: 'researching'
  };

  window.Backend = {
    call: function (action, payload) {
      return config.mode === 'remote' ? remoteCall(action, payload) : demoCall(action, payload);
    },
    config: function () { return JSON.parse(JSON.stringify(config)); },
    saveConfig: saveConfig,
    resetDemo: resetDemo,
    isDemo: function () { return config.mode !== 'remote'; },
    SAMPLE_OFFER: SAMPLE_OFFER
  };
})();
