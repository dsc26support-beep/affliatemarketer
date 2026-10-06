/*
 * Affiliate Campaign Hub — shared utilities.
 *
 * Everything in /shared is plain, dependency-free JavaScript that runs unchanged in
 * three places: Google Apps Script (V8), the browser (demo mode + renderers) and
 * Node (tests). Rules for this folder:
 *   - no `URL`, `fetch`, `crypto`, DOM or Apps Script globals,
 *   - no optional chaining / nullish coalescing (keeps Apps Script happy),
 *   - each file attaches one namespace to the global `AH` object and only
 *     references other namespaces at call time (file load order does not matter).
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.util = (function () {
  var ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

  function randomString(len) {
    var out = '';
    for (var i = 0; i < len; i++) out += ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length));
    return out;
  }

  /** Stable, opaque primary key, e.g. "prd_m1x2k3_a8f3k2q9". Never derived from names. */
  function newId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + randomString(8);
  }

  function isObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  /** Trim + collapse control characters + cap length. Returns '' for null/undefined. */
  function cleanString(v, max) {
    if (v === null || v === undefined) return '';
    var s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    if (max && s.length > max) s = s.slice(0, max);
    return s;
  }

  function escapeHtml(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Escape for XML (sitemaps). */
  function escapeXml(v) {
    return escapeHtml(v);
  }

  /**
   * Values written to Google Sheets that start with = + - @ would be interpreted as
   * formulas ("formula injection"). Prefixing an apostrophe forces plain text; Sheets
   * strips the apostrophe again when the value is read back.
   */
  function neutralizeFormula(v) {
    if (typeof v !== 'string') return v;
    return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  }

  function slugify(v) {
    return cleanString(v, 200)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  /**
   * Minimal, strict URL parser (Apps Script has no URL class).
   * Accepts only http(s) URLs without embedded credentials or whitespace.
   */
  var URL_RE = /^(https?):\/\/([^\/?#\s]+)([^?#\s]*)(\?[^#\s]*)?(#\S*)?$/i;
  var HOST_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

  function parseUrl(input) {
    var s = cleanString(input, 2048);
    if (!s) return null;
    var m = URL_RE.exec(s);
    if (!m) return null;
    var authority = m[2];
    if (authority.indexOf('@') !== -1) return null; // credentials / host confusion
    var host = authority;
    var port = '';
    var colon = authority.lastIndexOf(':');
    if (colon !== -1) {
      host = authority.slice(0, colon);
      port = authority.slice(colon + 1);
      if (!/^\d{1,5}$/.test(port)) return null;
    }
    host = host.toLowerCase();
    if (!HOST_RE.test(host)) return null;
    return {
      href: s,
      protocol: m[1].toLowerCase(),
      host: host,
      port: port,
      path: m[3] || '/',
      query: m[4] ? m[4].slice(1) : '',
      hash: m[5] ? m[5].slice(1) : ''
    };
  }

  function hostMatches(host, domain) {
    host = String(host || '').toLowerCase();
    domain = String(domain || '').toLowerCase().replace(/^\*\./, '');
    if (!host || !domain) return false;
    return host === domain || host.slice(-(domain.length + 1)) === '.' + domain;
  }

  function parseQuery(q) {
    var out = {};
    String(q || '').replace(/^\?/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var k = i === -1 ? pair : pair.slice(0, i);
      var v = i === -1 ? '' : pair.slice(i + 1);
      try {
        out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
      } catch (e) { /* ignore malformed pair */ }
    });
    return out;
  }

  function buildQuery(obj) {
    return Object.keys(obj)
      .filter(function (k) { return obj[k] !== '' && obj[k] !== null && obj[k] !== undefined; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); })
      .join('&');
  }

  function isEmail(v) {
    var s = cleanString(v, 254);
    return /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}$/i.test(s);
  }

  function toNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : null;
  }

  function toBool(v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    var s = String(v === null || v === undefined ? '' : v).toLowerCase().trim();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on';
  }

  function round(n, digits) {
    if (n === null || n === undefined || !isFinite(n)) return null;
    var f = Math.pow(10, digits || 0);
    return Math.round(n * f) / f;
  }

  function isoNow(ms) {
    return new Date(ms === undefined ? Date.now() : ms).toISOString();
  }

  function dateKey(iso) {
    return String(iso || '').slice(0, 10);
  }

  /** Constant-time-ish string comparison for tokens. */
  function safeEqual(a, b) {
    a = String(a || '');
    b = String(b || '');
    var diff = a.length ^ b.length;
    var len = Math.max(a.length, b.length);
    for (var i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return diff === 0 && a.length > 0;
  }

  function wordCount(text) {
    var s = String(text || '').trim();
    return s ? s.split(/\s+/).length : 0;
  }

  /** Replace {var} tokens; missing values become a visible [[placeholder]]. */
  function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, function (_, k) {
      var v = vars[k];
      return v === undefined || v === null || v === '' ? '[[' + k + ']]' : String(v);
    });
  }

  function uniq(arr) {
    var seen = {};
    return arr.filter(function (x) {
      var k = typeof x === 'string' ? x : JSON.stringify(x);
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  function sortBy(arr, fn, desc) {
    return arr.slice().sort(function (a, b) {
      var x = fn(a), y = fn(b);
      if (x === y) return 0;
      return (x > y ? 1 : -1) * (desc ? -1 : 1);
    });
  }

  function lowerFirst(s) {
    s = String(s || '');
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  function capFirst(s) {
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  return {
    newId: newId,
    randomString: randomString,
    isObject: isObject,
    clone: clone,
    cleanString: cleanString,
    escapeHtml: escapeHtml,
    escapeXml: escapeXml,
    neutralizeFormula: neutralizeFormula,
    slugify: slugify,
    parseUrl: parseUrl,
    hostMatches: hostMatches,
    parseQuery: parseQuery,
    buildQuery: buildQuery,
    isEmail: isEmail,
    toNumber: toNumber,
    toBool: toBool,
    round: round,
    isoNow: isoNow,
    dateKey: dateKey,
    safeEqual: safeEqual,
    wordCount: wordCount,
    fill: fill,
    uniq: uniq,
    sortBy: sortBy,
    lowerFirst: lowerFirst,
    capFirst: capFirst
  };
})();
