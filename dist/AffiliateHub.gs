/* GENERATED FILE — Affiliate Campaign Hub backend, single file for pasting into Apps Script.
 * Source: /shared + /apps-script. Regenerate with `npm run build`. */
/* ---- shared/01_util.js ---- */
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

/* ---- shared/02_schema.js ---- */
/*
 * Affiliate Campaign Hub — data model.
 *
 * One table == one Google Sheet tab. The column order below is the header row order.
 * Field types drive server-side validation, (de)serialisation and mass-assignment
 * protection: only fields marked `editable` can be set through the API.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.schema = (function () {
  var NETWORKS = ['digistore24', 'clickbank'];
  var NETWORK_LABELS = { digistore24: 'Digistore24', clickbank: 'ClickBank' };

  /**
   * Default affiliate-link host allowlists. Extra domains can be added in Settings
   * (`extraAllowedDomains`) without touching code.
   */
  var NETWORK_DOMAINS = {
    digistore24: ['digistore24.com', 'checkout-ds24.com', 'digistore24.de'],
    clickbank: ['clickbank.net', 'clkbank.com']
  };

  var PRODUCT_STATUSES = ['draft', 'researching', 'approved', 'active', 'paused', 'rejected', 'archived'];
  var PRODUCT_TYPES = ['digital_course', 'ebook', 'software', 'membership', 'physical', 'supplement', 'service', 'other'];
  var CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'];
  var PAGE_STATUSES = ['draft', 'published', 'archived'];
  var PAGE_TYPES = ['review', 'comparison', 'problem_solution', 'buyer_guide'];
  var CONTENT_TYPES = ['review', 'comparison', 'alternatives', 'problem_solution', 'tutorial', 'buyer_guide', 'faq', 'case_study'];
  var CONTENT_STATUSES = ['idea', 'outlining', 'drafting', 'published', 'rejected'];
  var DRAFT_STATUSES = ['draft', 'approved', 'posted', 'rejected'];
  var EMAIL_STATUSES = ['draft', 'approved', 'sent', 'rejected'];
  var PLATFORMS = ['tiktok', 'instagram_reels', 'youtube_shorts', 'facebook', 'pinterest', 'x'];
  var SOCIAL_ANGLES = ['problem', 'mistake', 'tip', 'comparison', 'tutorial', 'myth', 'faq', 'review', 'story', 'demonstration'];
  var EMAIL_TYPES = ['welcome', 'educational', 'problem', 'comparison', 'recommendation', 'follow_up'];
  var AB_ELEMENTS = ['headline', 'cta_text', 'cta_placement', 'page_structure', 'comparison_format', 'lead_magnet', 'content_angle'];
  var AB_STATUSES = ['draft', 'running', 'stopped', 'completed'];
  var LINK_STATUSES = ['unchecked', 'ok', 'redirect', 'broken', 'error'];

  // Shorthand field builders
  function s(max, extra) { return mix({ type: 'string', max: max || 200, editable: true }, extra); }
  function t(max, extra) { return mix({ type: 'text', max: max || 5000, editable: true }, extra); }
  function e(values, extra) { return mix({ type: 'enum', values: values, editable: true }, extra); }
  function n(extra) { return mix({ type: 'number', editable: true }, extra); }
  function b(extra) { return mix({ type: 'bool', editable: true }, extra); }
  function j(extra) { return mix({ type: 'json', editable: true, max: 45000 }, extra); }
  function u(extra) { return mix({ type: 'url', editable: true }, extra); }
  function ref(extra) { return mix({ type: 'ref', max: 64, editable: true }, extra); }
  function sys(type) { return { type: type || 'string', editable: false }; }
  function mix(a, c) { if (c) for (var k in c) a[k] = c[k]; return a; }

  var tables = {
    CONFIG: {
      key: 'key',
      fields: { key: sys(), value: sys('text'), updatedAt: sys() }
    },
    USERS: {
      prefix: 'usr',
      fields: { id: sys(), email: s(254), name: s(120), role: e(['owner', 'editor', 'viewer']), createdAt: sys(), updatedAt: sys() }
    },
    PRODUCTS: {
      prefix: 'prd',
      fields: {
        id: sys(),
        network: e(NETWORKS, { requiredWhenActive: true }),
        affiliateUrl: mix(u({ requiredWhenActive: true }), { affiliate: true }),
        productPageUrl: u(),
        name: s(160, { requiredWhenActive: true }),
        category: s(120),
        niche: s(120),
        targetAudience: t(1000, { requiredWhenActive: true }),
        problem: t(1000, { requiredWhenActive: true }),
        mainBenefit: t(1000, { requiredWhenActive: true }),
        commissionInfo: s(300),
        commissionPercent: n({ min: 0, max: 100 }),
        commissionAmount: n({ min: 0, max: 100000 }),
        price: n({ min: 0, max: 1000000 }),
        currency: s(3),
        recurring: e(['unknown', 'yes', 'no']),
        recurringInfo: s(300),
        productType: e(PRODUCT_TYPES),
        refundPolicy: s(300),
        notes: t(5000),
        status: e(PRODUCT_STATUSES),
        scoreInputs: j(),
        score: sys('number'),
        scoreLabel: sys(),
        scoreConfidence: sys('number'),
        experienceNotes: j(),
        createdAt: sys(),
        updatedAt: sys()
      }
    },
    CAMPAIGNS: {
      prefix: 'cmp',
      fields: {
        id: sys(),
        productId: ref({ required: true }),
        name: s(160, { required: true }),
        status: e(CAMPAIGN_STATUSES),
        plan: j(),
        notes: t(5000),
        createdAt: sys(),
        updatedAt: sys()
      }
    },
    LANDING_PAGES: {
      prefix: 'pg',
      fields: {
        id: sys(),
        campaignId: ref({ required: true }),
        productId: ref(),
        linkId: ref(),
        slug: s(80, { required: true }),
        pageType: e(PAGE_TYPES),
        title: s(160),
        status: sys(),
        seo: j(),
        sections: j(),
        approvedAt: sys(),
        publishedAt: sys(),
        createdAt: sys(),
        updatedAt: sys()
      }
    },
    CONTENT: {
      prefix: 'cnt',
      fields: {
        id: sys(),
        campaignId: ref({ required: true }),
        productId: ref(),
        type: e(CONTENT_TYPES, { required: true }),
        title: s(200, { required: true }),
        intent: s(60),
        clusterRole: s(60),
        outline: j(),
        seo: j(),
        requiresFirstHand: b(),
        locked: b(),
        status: e(CONTENT_STATUSES),
        notes: t(3000),
        createdAt: sys(),
        updatedAt: sys()
      }
    },
    SOCIAL_CONTENT: {
      prefix: 'soc',
      fields: {
        id: sys(),
        campaignId: ref({ required: true }),
        productId: ref(),
        angle: e(SOCIAL_ANGLES),
        platforms: j(),
        hook: t(500),
        problem: t(1000),
        value: t(2000),
        demonstration: t(1000),
        cta: s(300),
        disclosure: s(300),
        caption: t(2200),
        durationSec: n({ min: 5, max: 600 }),
        requiresFirstHand: b(),
        status: e(DRAFT_STATUSES),
        createdAt: sys(),
        updatedAt: sys()
      }
    },
    EMAIL_CAMPAIGNS: {
      prefix: 'eml',
      fields: {
        id: sys(),
        campaignId: ref({ required: true }),
        productId: ref(),
        step: n({ min: 0, max: 50 }),
        type: e(EMAIL_TYPES),
        sendDay: n({ min: 0, max: 365 }),
        subject: s(200),
        body: t(10000),
        leadMagnet: s(200),
        status: e(EMAIL_STATUSES),
        clicks: n({ min: 0 }),
        conversions: n({ min: 0 }),
        unsubscribes: n({ min: 0 }),
        createdAt: sys(),
        updatedAt: sys()
      }
    },
    AFFILIATE_LINKS: {
      prefix: 'lnk',
      fields: {
        id: sys(),
        productId: ref({ required: true }),
        network: e(NETWORKS),
        url: mix(u({ required: true }), { affiliate: true }),
        label: s(120),
        campaignId: ref(),
        pageId: ref(),
        active: b(),
        status: sys(),
        lastStatusCode: sys('number'),
        lastCheckedAt: sys(),
        notes: t(2000),
        createdAt: sys(),
        updatedAt: sys()
      }
    },
    CLICK_EVENTS: {
      prefix: 'clk',
      fields: {
        id: sys(), ts: sys(), linkId: sys(), productId: sys(), campaignId: sys(), pageId: sys(),
        ctaId: sys(), variant: sys(), sessionId: sys(), referrer: sys(),
        utmSource: sys(), utmMedium: sys(), utmCampaign: sys(), utmContent: sys(), utmTerm: sys()
      }
    },
    PAGE_VIEWS: {
      prefix: 'pv',
      fields: {
        id: sys(), ts: sys(), pageId: sys(), campaignId: sys(), productId: sys(), variant: sys(),
        sessionId: sys(), path: sys(), referrer: sys(),
        utmSource: sys(), utmMedium: sys(), utmCampaign: sys(), utmContent: sys(), utmTerm: sys()
      }
    },
    CONVERSIONS: {
      prefix: 'cnv',
      fields: {
        id: sys(),
        date: s(10, { required: true }),
        productId: ref({ required: true }),
        campaignId: ref(),
        pageId: ref(),
        source: s(60),
        count: n({ min: 0, max: 100000, required: true }),
        revenue: n({ min: 0, max: 10000000 }),
        currency: s(3),
        notes: t(1000),
        createdAt: sys()
      }
    },
    AB_TESTS: {
      prefix: 'ab',
      fields: {
        id: sys(),
        pageId: ref({ required: true }),
        campaignId: ref(),
        name: s(160, { required: true }),
        element: e(AB_ELEMENTS, { required: true }),
        hypothesis: t(1000),
        variants: j({ required: true }),
        status: e(AB_STATUSES),
        minSamplePerVariant: n({ min: 50, max: 100000 }),
        winner: s(10),
        startedAt: sys(),
        endedAt: sys(),
        createdAt: sys(),
        updatedAt: sys()
      }
    },
    LEADS: {
      prefix: 'ld',
      fields: {
        id: sys(), ts: sys(), email: sys(), consent: sys('bool'), consentText: sys(), pageId: sys(),
        campaignId: sys(), leadMagnet: sys(), status: sys(), createdAt: sys(), updatedAt: sys()
      }
    },
    AUDIT_LOG: {
      prefix: 'aud',
      fields: { id: sys(), ts: sys(), action: sys(), entity: sys(), entityId: sys(), details: sys('text') }
    },
    ERROR_LOG: {
      prefix: 'err',
      fields: { id: sys(), ts: sys(), code: sys(), message: sys('text'), context: sys('text') }
    }
  };

  // JSON columns are stored as strings in Sheets; everything else is scalar.
  function columns(table) {
    return Object.keys(tables[table].fields);
  }

  function jsonColumns(table) {
    var f = tables[table].fields;
    return Object.keys(f).filter(function (k) { return f[k].type === 'json'; });
  }

  var DEFAULT_SETTINGS = {
    siteName: 'My Affiliate Guides',
    siteUrl: '',
    apiUrl: '',
    authorName: '',
    authorBio: '',
    contactEmail: '',
    contactUrl: '',
    privacyUrl: '',
    termsUrl: '',
    disclosureUrl: '',
    disclosureText: 'Affiliate disclosure: this page contains affiliate links. If you buy through them, I may earn a commission at no extra cost to you. This does not change my evaluation.',
    defaultCurrency: 'USD',
    minViewsForDecision: 100,
    lowCtrThreshold: 0.02,
    abMinSamplePerVariant: 300,
    staleCampaignDays: 14,
    extraAllowedDomains: '',
    respectDoNotTrack: true,
    requireTrackingConsent: false,
    alertEmail: ''
  };

  var SETTING_TYPES = {
    minViewsForDecision: 'int',
    lowCtrThreshold: 'ratio',
    abMinSamplePerVariant: 'int',
    staleCampaignDays: 'int',
    respectDoNotTrack: 'bool',
    requireTrackingConsent: 'bool',
    siteUrl: 'url',
    apiUrl: 'url',
    privacyUrl: 'url',
    termsUrl: 'url',
    disclosureUrl: 'url',
    contactUrl: 'url',
    contactEmail: 'email',
    alertEmail: 'email'
  };

  /** Settings that are safe to expose on public landing pages. */
  var PUBLIC_SETTINGS = ['siteName', 'siteUrl', 'apiUrl', 'authorName', 'authorBio', 'contactEmail', 'contactUrl',
    'privacyUrl', 'termsUrl', 'disclosureUrl', 'disclosureText', 'respectDoNotTrack', 'requireTrackingConsent'];

  return {
    tables: tables,
    columns: columns,
    jsonColumns: jsonColumns,
    NETWORKS: NETWORKS,
    NETWORK_LABELS: NETWORK_LABELS,
    NETWORK_DOMAINS: NETWORK_DOMAINS,
    PRODUCT_STATUSES: PRODUCT_STATUSES,
    PRODUCT_TYPES: PRODUCT_TYPES,
    CAMPAIGN_STATUSES: CAMPAIGN_STATUSES,
    PAGE_STATUSES: PAGE_STATUSES,
    PAGE_TYPES: PAGE_TYPES,
    CONTENT_TYPES: CONTENT_TYPES,
    CONTENT_STATUSES: CONTENT_STATUSES,
    DRAFT_STATUSES: DRAFT_STATUSES,
    EMAIL_STATUSES: EMAIL_STATUSES,
    PLATFORMS: PLATFORMS,
    SOCIAL_ANGLES: SOCIAL_ANGLES,
    EMAIL_TYPES: EMAIL_TYPES,
    AB_ELEMENTS: AB_ELEMENTS,
    AB_STATUSES: AB_STATUSES,
    LINK_STATUSES: LINK_STATUSES,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    SETTING_TYPES: SETTING_TYPES,
    PUBLIC_SETTINGS: PUBLIC_SETTINGS
  };
})();

/* ---- shared/03_validation.js ---- */
/*
 * Affiliate Campaign Hub — validation.
 * The frontend is untrusted: every write goes through `AH.validate.record` on the server.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.validate = (function () {
  var REF_RE = /^[a-z]{1,8}_[a-z0-9]{1,16}_[a-z0-9]{1,16}$/;
  var INACTIVE_PRODUCT_STATUSES = ['', 'draft', 'researching', 'rejected', 'archived'];

  function allowedDomains(network, settings) {
    var base = (AH.schema.NETWORK_DOMAINS[network] || []).slice();
    var extra = String((settings && settings.extraAllowedDomains) || '')
      .split(/[\s,]+/)
      .map(function (d) { return d.trim().toLowerCase().replace(/^\*\./, ''); })
      .filter(function (d) { return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d); });
    return AH.util.uniq(base.concat(extra));
  }

  /**
   * Validate an affiliate URL for a given network.
   * Returns { ok, error, warnings, parsed, normalized }.
   */
  function affiliateUrl(url, network, settings) {
    var warnings = [];
    var parsed = AH.util.parseUrl(url);
    if (!parsed) return { ok: false, error: 'Enter a complete URL starting with https:// (no spaces or embedded credentials).', warnings: warnings };
    if (parsed.protocol !== 'https') return { ok: false, error: 'Affiliate links must use https://.', warnings: warnings };
    if (AH.schema.NETWORKS.indexOf(network) === -1) return { ok: false, error: 'Select the affiliate network (Digistore24 or ClickBank) first.', warnings: warnings };
    var domains = allowedDomains(network, settings);
    var allowed = domains.some(function (d) { return AH.util.hostMatches(parsed.host, d); });
    if (!allowed) {
      return {
        ok: false,
        error: 'The host "' + parsed.host + '" is not an allowed ' + AH.schema.NETWORK_LABELS[network] +
          ' domain (' + domains.join(', ') + '). If this is a legitimate network link, add the domain under Settings → Allowed link domains.',
        warnings: warnings
      };
    }
    if (network === 'clickbank' && !/hop\./.test(parsed.host) && !/hop/i.test(parsed.path + parsed.query)) {
      warnings.push('This does not look like a ClickBank HopLink (usually https://hop.clickbank.net/?affiliate=…&vendor=…). Double-check it in your ClickBank account.');
    }
    // Vendor-page promolinks carry the affiliate ID as ?aff=… or #aff=… (fragment).
    if (network === 'digistore24' && !/\/redir\//i.test(parsed.path) && !/(^|&)aff=/i.test(parsed.query) && !/(^|&)aff=/i.test(parsed.hash)) {
      warnings.push('This does not look like a Digistore24 promolink (usually contains /redir/PRODUCT/AFFILIATE/ or aff=YOUR_ID). Double-check it in your Digistore24 account.');
    }
    return { ok: true, error: null, warnings: warnings, parsed: parsed, normalized: normalizeUrl(parsed) };
  }

  /** Canonical form for duplicate detection (ignores utm_* params, trailing slash, case of host). */
  function normalizeUrl(parsedOrString) {
    var p = typeof parsedOrString === 'string' ? AH.util.parseUrl(parsedOrString) : parsedOrString;
    if (!p) return '';
    var q = AH.util.parseQuery(p.query);
    var keys = Object.keys(q).filter(function (k) { return !/^utm_/i.test(k); }).sort();
    var query = keys.map(function (k) { return k + '=' + q[k]; }).join('&');
    return p.host + p.path.replace(/\/+$/, '') + (query ? '?' + query : '');
  }

  function isRef(v) {
    return typeof v === 'string' && REF_RE.test(v);
  }

  function fieldLabel(name) {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
  }

  /**
   * Validate + coerce a record.
   * opts.partial  -> only validate supplied fields (updates)
   * opts.existing -> current stored record (for cross-field checks on update)
   * opts.settings -> settings (for URL allowlists)
   * Returns { value, errors, warnings } — `value` only contains editable fields.
   */
  function record(table, input, opts) {
    opts = opts || {};
    var def = AH.schema.tables[table];
    var errors = {};
    var warnings = [];
    var value = {};
    if (!AH.util.isObject(input)) return { value: value, errors: { _: 'Expected an object.' }, warnings: warnings };

    var merged = {};
    var existing = opts.existing || {};
    Object.keys(existing).forEach(function (k) { merged[k] = existing[k]; });

    Object.keys(def.fields).forEach(function (name) {
      var f = def.fields[name];
      if (!f.editable) return;
      var present = Object.prototype.hasOwnProperty.call(input, name);
      if (!present && opts.partial) return;
      var raw = present ? input[name] : undefined;
      var res = coerce(f, raw, name);
      if (res.error) { errors[name] = res.error; return; }
      if (present || !opts.partial) {
        value[name] = res.value;
        merged[name] = res.value;
      }
    });

    // Required checks against the merged view (so partial updates can't blank required fields).
    var status = merged.status || '';
    Object.keys(def.fields).forEach(function (name) {
      var f = def.fields[name];
      if (errors[name]) return;
      var needed = f.required || (f.requiredWhenActive && INACTIVE_PRODUCT_STATUSES.indexOf(status) === -1);
      if (!needed) return;
      var v = merged[name];
      var empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
      if (empty) {
        errors[name] = f.requiredWhenActive && !f.required
          ? fieldLabel(name) + ' is required before an offer can leave draft status.'
          : fieldLabel(name) + ' is required.';
      }
    });

    // Affiliate URL fields are validated against the network allowlist.
    Object.keys(def.fields).forEach(function (name) {
      var f = def.fields[name];
      if (!f.affiliate || errors[name]) return;
      var v = merged[name];
      if (!v) return;
      if (opts.partial && !Object.prototype.hasOwnProperty.call(value, name) && !Object.prototype.hasOwnProperty.call(value, 'network')) return;
      var r = affiliateUrl(v, merged.network, opts.settings);
      if (!r.ok) errors[name] = r.error;
      else warnings = warnings.concat(r.warnings);
    });

    return { value: value, errors: errors, warnings: warnings };
  }

  function coerce(f, raw, name) {
    var U = AH.util;
    if (raw === undefined || raw === null) {
      if (f.type === 'bool') return { value: false };
      if (f.type === 'number') return { value: null };
      if (f.type === 'json') return { value: null };
      return { value: '' };
    }
    switch (f.type) {
      case 'string':
      case 'text': {
        if (typeof raw === 'object') return { error: fieldLabel(name) + ' must be text.' };
        var str = U.cleanString(raw);
        if (f.type === 'string') str = str.replace(/\s*[\r\n]+\s*/g, ' ');
        if (str.length > f.max) return { error: fieldLabel(name) + ' is too long (max ' + f.max + ' characters).' };
        return { value: str };
      }
      case 'enum': {
        var ev = U.cleanString(raw, 64);
        if (ev && f.values.indexOf(ev) === -1) return { error: fieldLabel(name) + ' must be one of: ' + f.values.join(', ') + '.' };
        return { value: ev };
      }
      case 'number': {
        if (raw === '') return { value: null };
        var num = typeof raw === 'number' ? raw : Number(String(raw).trim());
        if (!isFinite(num)) return { error: fieldLabel(name) + ' must be a number.' };
        if (f.min !== undefined && num < f.min) return { error: fieldLabel(name) + ' must be at least ' + f.min + '.' };
        if (f.max !== undefined && num > f.max) return { error: fieldLabel(name) + ' must be at most ' + f.max + '.' };
        return { value: num };
      }
      case 'bool':
        return { value: U.toBool(raw) };
      case 'url': {
        var us = U.cleanString(raw, 2048);
        if (!us) return { value: '' };
        var p = U.parseUrl(us);
        if (!p) return { error: fieldLabel(name) + ' must be a complete http(s) URL.' };
        return { value: p.href };
      }
      case 'ref': {
        var rs = U.cleanString(raw, 64);
        if (rs && !isRef(rs)) return { error: fieldLabel(name) + ' is not a valid ID.' };
        return { value: rs };
      }
      case 'json': {
        var jv = raw;
        if (typeof jv === 'string') {
          if (!jv.trim()) return { value: null };
          try { jv = JSON.parse(jv); } catch (err) { return { error: fieldLabel(name) + ' must be valid JSON.' }; }
        }
        if (typeof jv !== 'object') return { error: fieldLabel(name) + ' must be an object or list.' };
        var size = JSON.stringify(jv).length;
        if (size > f.max) return { error: fieldLabel(name) + ' is too large (' + size + ' > ' + f.max + ' characters).' };
        return { value: sanitizeJson(jv, 0) };
      }
      default:
        return { value: U.cleanString(raw, 2000) };
    }
  }

  /** Strip control characters from strings inside nested JSON and cap depth. */
  function sanitizeJson(v, depth) {
    if (depth > 8) return null;
    if (Array.isArray(v)) return v.slice(0, 200).map(function (x) { return sanitizeJson(x, depth + 1); });
    if (v && typeof v === 'object') {
      var out = {};
      Object.keys(v).slice(0, 100).forEach(function (k) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
        out[AH.util.cleanString(k, 64)] = sanitizeJson(v[k], depth + 1);
      });
      return out;
    }
    if (typeof v === 'string') return AH.util.cleanString(v, 10000);
    if (typeof v === 'number' || typeof v === 'boolean' || v === null) return v;
    return null;
  }

  function hasErrors(res) {
    return Object.keys(res.errors).length > 0;
  }

  /** Validate a settings patch. Returns { value, errors }. */
  function settings(input) {
    var errors = {};
    var value = {};
    var U = AH.util;
    if (!U.isObject(input)) return { value: value, errors: { _: 'Expected an object.' } };
    Object.keys(input).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(AH.schema.DEFAULT_SETTINGS, k)) return; // ignore unknown keys
      var type = AH.schema.SETTING_TYPES[k] || 'string';
      var raw = input[k];
      if (type === 'int') {
        var n = Number(raw);
        if (!isFinite(n) || n < 1 || n > 1000000) errors[k] = 'Must be a whole number ≥ 1.';
        else value[k] = Math.round(n);
      } else if (type === 'ratio') {
        var r = Number(raw);
        if (!isFinite(r) || r <= 0 || r >= 1) errors[k] = 'Must be a decimal between 0 and 1 (e.g. 0.02 for 2%).';
        else value[k] = r;
      } else if (type === 'bool') {
        value[k] = U.toBool(raw);
      } else if (type === 'url') {
        var su = U.cleanString(raw, 2048);
        if (su && !U.parseUrl(su)) errors[k] = 'Must be a complete http(s) URL.';
        else value[k] = su.replace(/\/+$/, '');
      } else if (type === 'email') {
        var se = U.cleanString(raw, 254);
        if (se && !U.isEmail(se)) errors[k] = 'Must be a valid email address.';
        else value[k] = se;
      } else {
        var max = k === 'authorBio' || k === 'disclosureText' || k === 'extraAllowedDomains' ? 1500 : 200;
        var ss = U.cleanString(raw);
        if (ss.length > max) errors[k] = 'Too long (max ' + max + ' characters).';
        else value[k] = ss;
      }
    });
    if (value.disclosureText !== undefined && value.disclosureText.length < 40) {
      errors.disclosureText = 'The affiliate disclosure must clearly explain the relationship (at least 40 characters).';
    }
    return { value: value, errors: errors };
  }

  return {
    affiliateUrl: affiliateUrl,
    allowedDomains: allowedDomains,
    normalizeUrl: normalizeUrl,
    record: record,
    settings: settings,
    hasErrors: hasErrors,
    isRef: isRef
  };
})();

/* ---- shared/04_compliance.js ---- */
/*
 * Affiliate Campaign Hub — compliance checks.
 *
 * Deliberately conservative: it flags claims that need evidence (income, health,
 * statistics, first-hand experience) and deceptive urgency. Errors block publishing;
 * warnings require the human reviewer's judgement.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.compliance = (function () {
  var RULES = [
    // Income / financial promises
    { level: 'error', code: 'INCOME_CLAIM', re: /\bguarantee(?:d|s)?\b[^.!?\n]{0,40}\b(income|profits?|earnings|money|returns?|results)\b/i, msg: 'Guaranteed income/results claim. Remove it — results are never guaranteed.' },
    { level: 'error', code: 'INCOME_CLAIM', re: /\b(make|earn|making|earning)\s+\$?\d[\d,.]*k?\s*(\+\s*)?(per|a|every|\/)\s*(day|week|month|hour)\b/i, msg: 'Specific earnings claim. Remove it unless you can document typical results.' },
    { level: 'error', code: 'INCOME_CLAIM', re: /\b(get rich|overnight success|financial freedom guaranteed|quit your job (in|within))\b/i, msg: 'Get-rich style claim. Remove it.' },
    { level: 'error', code: 'INCOME_CLAIM', re: /\brisk[- ]free\s+(income|profits?|investment|returns?)\b/i, msg: '"Risk-free" financial claim. Remove it.' },
    // Health / medical claims
    { level: 'error', code: 'HEALTH_CLAIM', re: /\b(cures?|cured|curing)\b/i, msg: 'Medical "cure" claim. Remove it — only regulators/clinicians can support such claims.' },
    { level: 'error', code: 'HEALTH_CLAIM', re: /\b(treats?|prevents?|reverses?|eliminates?)\s+(cancer|diabetes|disease|covid|depression|anxiety|arthritis|alzheimer'?s|hypertension|obesity|tinnitus)\b/i, msg: 'Disease treatment/prevention claim. Remove it.' },
    { level: 'error', code: 'HEALTH_CLAIM', re: /\blose\s+\d+\s*(lbs?|pounds|kg|kilos?)\s+(in|within)\s+\d+/i, msg: 'Specific weight-loss result claim. Remove it.' },
    { level: 'warning', code: 'HEALTH_CLAIM', re: /\b(miracle|doctors? (hate|don'?t want)|clinically proven|fda[- ]approved|scientifically proven)\b/i, msg: 'Strong health/science claim. Keep only if you link a credible source.' },
    // Deceptive urgency / scarcity
    { level: 'error', code: 'FAKE_URGENCY', re: /\bonly\s+\d+\s+(left|spots?|copies|seats|units)\b/i, msg: 'Scarcity claim. Remove it unless the merchant publicly states it and you can verify it.' },
    { level: 'error', code: 'FAKE_URGENCY', re: /\bcount\s?down\b/i, msg: 'Countdown timers are not allowed on these pages.' },
    { level: 'warning', code: 'URGENCY', re: /\b(act now|last chance|hurry|ends (today|tonight)|expires (today|tonight|soon)|before it'?s too late)\b/i, msg: 'Urgency wording. Only keep it if a real, verifiable deadline exists.' },
    // Fabricated social proof / statistics
    { level: 'warning', code: 'TESTIMONIAL', re: /\btestimonials?\b/i, msg: 'Testimonials must be real, verifiable and representative. Never invent them.' },
    { level: 'warning', code: 'RATING', re: /\b\d(\.\d)?\s*(\/|out of)\s*5\s*stars?\b|★★★/i, msg: 'Star rating. Only publish ratings you can explain from your own documented evaluation.' },
    { level: 'warning', code: 'STATISTIC', re: /\b\d{1,3}(\.\d+)?\s?%\s+of\s+(people|users|customers|buyers|women|men|americans|adults)\b/i, msg: 'Statistic without a visible source. Cite the source or remove it.' },
    { level: 'warning', code: 'INDEPENDENCE', re: /\b(independent|unbiased|impartial)\s+(review|opinion|evaluation)\b/i, msg: 'Avoid "independent/unbiased review" — this page is affiliate-supported. Describe the relationship honestly instead.' },
    { level: 'warning', code: 'ABSOLUTE', re: /\b(100%\s+(effective|guaranteed|safe|natural)|works for everyone|no side effects)\b/i, msg: 'Absolute claim. Qualify it or remove it.' }
  ];

  var FIRST_HAND_RE = /\b(I|we)\s+(have\s+)?(tested|tried|used|bought|purchased|been using|installed|followed)\b|\bmy\s+(results|experience|testing|hands-on)\b|\bhands[- ]on\b|\bin my (test|tests|testing)\b/i;
  var PLACEHOLDER_RE = /\[\[[^\]]{0,120}\]\]/g;

  var HIGH_RISK_NICHES = /\b(health|weight|diet|keto|fat|supplement|medical|medicine|diabetes|blood|pain|tinnitus|prostate|vision|hearing|sleep|anxiety|joint|immune|cbd|finance|crypto|bitcoin|trading|forex|invest|stock|loan|credit|debt|income|make money|wealth|casino|betting|gambling)\b/i;
  var MEDIUM_RISK_NICHES = /\b(fitness|beauty|skin|hair|relationship|dating|manifest|survival|self[- ]help|mlm|business opportunity)\b/i;

  /** Scan free text. Returns [{level, code, message, excerpt}] */
  function scanText(text, ctx) {
    ctx = ctx || {};
    var s = String(text || '');
    var issues = [];
    if (!s) return issues;
    RULES.forEach(function (r) {
      var m = r.re.exec(s);
      if (m) issues.push({ level: r.level, code: r.code, message: r.msg, excerpt: excerpt(s, m.index, m[0].length) });
    });
    var fh = FIRST_HAND_RE.exec(s);
    if (fh && !ctx.hasExperience) {
      issues.push({
        level: 'error',
        code: 'FIRST_HAND_CLAIM',
        message: 'This text implies personal testing, but no Experience Notes are recorded for this product. Add real notes or rephrase as research-based.',
        excerpt: excerpt(s, fh.index, fh[0].length)
      });
    }
    return issues;
  }

  function excerpt(s, idx, len) {
    var start = Math.max(0, idx - 30);
    var end = Math.min(s.length, idx + len + 30);
    return (start > 0 ? '…' : '') + s.slice(start, end).replace(/\s+/g, ' ') + (end < s.length ? '…' : '');
  }

  function findPlaceholders(text) {
    return String(text || '').match(PLACEHOLDER_RE) || [];
  }

  function hasExperience(product) {
    var n = product && product.experienceNotes;
    if (!n || typeof n !== 'object') return false;
    return !!(n.hasFirstHand && (AH.util.cleanString(n.tested) || AH.util.cleanString(n.observations)));
  }

  /** Niche risk used by scoring + warnings. */
  function nicheRisk(product) {
    var text = [product.niche, product.category, product.name, product.problem, product.mainBenefit, product.productType]
      .join(' ');
    if (HIGH_RISK_NICHES.test(text) || product.productType === 'supplement') {
      var health = /\b(health|weight|diet|keto|fat|supplement|medical|medicine|diabetes|blood|pain|tinnitus|prostate|vision|hearing|sleep|anxiety|joint|immune|cbd)\b/i.test(text) || product.productType === 'supplement';
      return { level: 'high', kind: health ? 'health' : 'finance', reason: health ? 'Health-related offers attract strict advertising and consumer-protection rules.' : 'Money/finance offers attract strict rules on earnings claims.' };
    }
    if (MEDIUM_RISK_NICHES.test(text)) return { level: 'medium', kind: 'general', reason: 'This niche often relies on exaggerated promises — keep claims modest.' };
    return { level: 'low', kind: 'general', reason: '' };
  }

  /** Flatten every user-visible string of a landing page. */
  function pageText(page) {
    var parts = [];
    function walk(v) {
      if (v === null || v === undefined) return;
      if (typeof v === 'string') parts.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === 'object') {
        if (v.enabled === false) return; // disabled sections are not rendered, so not scanned
        Object.keys(v).forEach(function (k) { if (k !== 'enabled' && k !== 'ctaPlacements') walk(v[k]); });
      }
    }
    walk(page.title);
    walk(page.sections);
    walk(page.seo);
    return parts.join('\n');
  }

  /**
   * Full pre-publish check for a landing page.
   * Returns { ok, errors: [...], warnings: [...], stats: {...} }.
   */
  function checkLandingPage(page, product, link, settings) {
    var errors = [];
    var warnings = [];
    settings = settings || {};
    product = product || {};
    var sections = page.sections || {};
    var text = pageText(page);
    var words = AH.util.wordCount(text);
    var exp = hasExperience(product);

    scanText(text, { hasExperience: exp }).forEach(function (i) {
      (i.level === 'error' ? errors : warnings).push(i);
    });

    var ph = findPlaceholders(text);
    if (ph.length) {
      errors.push({ level: 'error', code: 'PLACEHOLDERS', message: ph.length + ' placeholder(s) still need your input: ' + AH.util.uniq(ph).slice(0, 5).join(', '), excerpt: '' });
    }

    if (AH.util.cleanString(settings.disclosureText).length < 40) {
      errors.push({ level: 'error', code: 'DISCLOSURE', message: 'Set a clear affiliate disclosure in Settings (at least 40 characters).', excerpt: '' });
    }
    if (!settings.privacyUrl) errors.push({ level: 'error', code: 'PRIVACY', message: 'Add your Privacy Policy URL in Settings.', excerpt: '' });
    if (!settings.termsUrl) errors.push({ level: 'error', code: 'TERMS', message: 'Add your Terms URL in Settings.', excerpt: '' });
    if (!settings.contactEmail && !settings.contactUrl) warnings.push({ level: 'warning', code: 'CONTACT', message: 'Add contact information (email or contact page) in Settings.', excerpt: '' });

    if (!link) errors.push({ level: 'error', code: 'LINK', message: 'Select an affiliate link for this page.', excerpt: '' });
    else if (!link.active) errors.push({ level: 'error', code: 'LINK', message: 'The selected affiliate link is inactive.', excerpt: '' });
    else if (link.status === 'broken') errors.push({ level: 'error', code: 'LINK', message: 'The selected affiliate link failed its last check. Fix it before publishing.', excerpt: '' });

    if (words < 150) errors.push({ level: 'error', code: 'THIN', message: 'Only ' + words + ' words. Thin pages are not allowed — add genuinely useful information.', excerpt: '' });
    else if (words < 400) warnings.push({ level: 'warning', code: 'THIN', message: 'Only ' + words + ' words. Consider adding more genuinely useful detail (comparisons, decision criteria, FAQs).', excerpt: '' });

    var cons = (sections.cons && sections.cons.items) || [];
    if (!cons.filter(function (c) { return AH.util.cleanString(c); }).length) {
      errors.push({ level: 'error', code: 'NO_CONS', message: 'Add at least one honest con or limitation. One-sided pages mislead readers.', excerpt: '' });
    }
    var faq = (sections.faq && sections.faq.items) || [];
    if (!faq.length) warnings.push({ level: 'warning', code: 'NO_FAQ', message: 'Add an FAQ section answering real buyer questions.', excerpt: '' });

    var seo = page.seo || {};
    if (!AH.util.cleanString(seo.title)) errors.push({ level: 'error', code: 'SEO_TITLE', message: 'Add an SEO title.', excerpt: '' });
    else if (seo.title.length > 65) warnings.push({ level: 'warning', code: 'SEO_TITLE', message: 'SEO title is ' + seo.title.length + ' characters; aim for ≤ 60.', excerpt: '' });
    if (!AH.util.cleanString(seo.metaDescription)) warnings.push({ level: 'warning', code: 'SEO_META', message: 'Add a meta description.', excerpt: '' });
    else if (seo.metaDescription.length > 165) warnings.push({ level: 'warning', code: 'SEO_META', message: 'Meta description is ' + seo.metaDescription.length + ' characters; aim for ≤ 160.', excerpt: '' });
    if (!settings.siteUrl) warnings.push({ level: 'warning', code: 'SITE_URL', message: 'Set your Site URL in Settings so canonical URLs and the sitemap are correct.', excerpt: '' });

    var ctas = countCtas(page);
    if (ctas === 0) errors.push({ level: 'error', code: 'CTA', message: 'Enable at least one call-to-action placement.', excerpt: '' });
    if (ctas > 4) warnings.push({ level: 'warning', code: 'CTA', message: ctas + ' CTA placements. Avoid excessive buttons — 2–4 is usually enough.', excerpt: '' });

    var risk = nicheRisk(product);
    if (risk.level === 'high') {
      var hasDisclaimer = AH.util.cleanString(sections.disclaimer && sections.disclaimer.body).length > 30;
      var msg = risk.kind === 'health'
        ? 'Health niche: include a disclaimer ("not medical advice; consult a qualified professional") and avoid any treatment claims.'
        : 'Money niche: include a disclaimer that results vary and are not typical or guaranteed.';
      (hasDisclaimer ? warnings : errors).push({ level: hasDisclaimer ? 'warning' : 'error', code: 'NICHE_DISCLAIMER', message: hasDisclaimer ? 'High-risk niche — double-check every claim. ' + risk.reason : msg, excerpt: '' });
    }

    return { ok: errors.length === 0, errors: errors, warnings: warnings, stats: { words: words, ctas: ctas, placeholders: ph.length, hasExperience: exp } };
  }

  function countCtas(page) {
    var p = (page.sections && page.sections.ctaPlacements) || {};
    return ['afterIntro', 'afterSolution', 'afterEvaluation', 'final'].filter(function (k) { return p[k] !== false; }).length;
  }

  /** Disclosure line for short-form social/video content. */
  function socialDisclosure(platform) {
    if (platform === 'pinterest') return 'Affiliate link — I may earn a commission if you buy.';
    return '#ad · Affiliate link — I may earn a commission if you buy through it.';
  }

  return {
    scanText: scanText,
    findPlaceholders: findPlaceholders,
    hasExperience: hasExperience,
    nicheRisk: nicheRisk,
    pageText: pageText,
    checkLandingPage: checkLandingPage,
    countCtas: countCtas,
    socialDisclosure: socialDisclosure
  };
})();

/* ---- shared/05_scoring.js ---- */
/*
 * Affiliate Campaign Hub — explainable offer score (0–100).
 *
 * The score is a structured checklist, NOT a revenue prediction. Each criterion is
 * rated 0–5 (5 = favourable; for risk criteria 5 = LOW risk). Some ratings are
 * derived automatically from offer data; the user can override any of them.
 * Unrated criteria are excluded and lower the confidence value instead of being guessed.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.scoring = (function () {
  var CRITERIA = [
    { key: 'audienceClarity', label: 'Audience / problem clarity', weight: 8, auto: true, help: 'Is it obvious who this is for and which problem it solves?' },
    { key: 'marketRelevance', label: 'Product–market relevance', weight: 8, help: 'Does the product fit a real, current need of your audience?' },
    { key: 'commission', label: 'Commission attractiveness', weight: 10, auto: true, help: 'Estimated commission per sale.' },
    { key: 'recurring', label: 'Recurring revenue potential', weight: 6, auto: true, help: 'Recurring commissions (subscriptions/memberships).' },
    { key: 'qualityEvidence', label: 'Product quality evidence', weight: 8, help: 'Refund policy, real reviews elsewhere, track record, your own testing.' },
    { key: 'salesPageQuality', label: 'Merchant sales-page quality', weight: 7, help: 'Clear, honest, professional sales page without hype.' },
    { key: 'competition', label: 'Competition (5 = low)', weight: 6, help: 'How crowded are search results / social feeds for this offer?' },
    { key: 'contentPotential', label: 'Content potential', weight: 7, help: 'Can you create genuinely useful guides, tutorials and comparisons?' },
    { key: 'searchIntent', label: 'Search-intent potential', weight: 7, help: 'Do people actively search for solutions/comparisons in this space?' },
    { key: 'socialPotential', label: 'Social content potential', weight: 6, help: 'Is it demonstrable / visual / easy to explain in short videos?' },
    { key: 'emailPotential', label: 'Email potential', weight: 5, help: 'Is there a natural lead magnet and an educational sequence?' },
    { key: 'conversionPotential', label: 'Conversion potential', weight: 8, help: 'Price point, offer clarity, guarantee, checkout experience.' },
    { key: 'trustRisk', label: 'Trust (5 = low risk)', weight: 7, help: 'Vendor reputation, refund rates, complaints.' },
    { key: 'complianceRisk', label: 'Compliance (5 = low risk)', weight: 7, auto: true, help: 'Health/finance/income claims, regulated niche.' }
  ];

  var LABELS = [
    { min: 80, label: 'EXCELLENT' },
    { min: 65, label: 'GOOD' },
    { min: 45, label: 'TEST' },
    { min: 0, label: 'WEAK' }
  ];

  function estimatedCommission(p) {
    var amount = AH.util.toNumber(p.commissionAmount);
    if (amount !== null && amount > 0) return amount;
    var price = AH.util.toNumber(p.price);
    var pct = AH.util.toNumber(p.commissionPercent);
    if (price !== null && pct !== null) return price * pct / 100;
    return null;
  }

  /** Automatic ratings derived from offer data. Each returns {rating, reason} or null. */
  function autoRating(key, p) {
    var U = AH.util;
    if (key === 'audienceClarity') {
      var filled = 0;
      if (U.cleanString(p.targetAudience).length >= 15) filled++;
      if (U.cleanString(p.problem).length >= 15) filled++;
      if (U.cleanString(p.mainBenefit).length >= 10) filled++;
      var map = [0, 2, 3.5, 5];
      return { rating: map[filled], reason: filled + '/3 of audience, problem and benefit are described in enough detail.' };
    }
    if (key === 'commission') {
      var c = estimatedCommission(p);
      if (c === null) return null;
      var r = c >= 100 ? 5 : c >= 50 ? 4 : c >= 25 ? 3 : c >= 10 ? 2 : c > 0 ? 1 : 0;
      return { rating: r, reason: 'Estimated ' + U.round(c, 2) + ' ' + (p.currency || '') + ' per sale.' };
    }
    if (key === 'recurring') {
      if (p.recurring === 'yes') return { rating: 5, reason: 'Recurring commission available.' };
      if (p.recurring === 'no') return { rating: 1, reason: 'One-time commission only.' };
      return null;
    }
    if (key === 'complianceRisk') {
      var risk = AH.compliance.nicheRisk(p);
      var claimIssues = AH.compliance.scanText([p.mainBenefit, p.notes, p.problem].join('\n'), { hasExperience: true })
        .filter(function (i) { return i.level === 'error'; });
      var base = risk.level === 'high' ? 2 : risk.level === 'medium' ? 3 : 4.5;
      if (claimIssues.length) base = Math.max(0, base - 1.5);
      var why = risk.level === 'high' ? risk.reason : risk.level === 'medium' ? risk.reason : 'No regulated-niche signals detected.';
      if (claimIssues.length) why += ' Offer notes contain risky claims (' + claimIssues[0].code + ').';
      return { rating: base, reason: why };
    }
    return null;
  }

  /**
   * Compute the score. `inputs` = { criterionKey: 0..5 } manual ratings (override auto).
   * Returns { score, label, confidence, lowConfidence, breakdown[], warnings[] }.
   */
  function score(product, inputs) {
    inputs = inputs || product.scoreInputs || {};
    var total = 0;
    var ratedWeight = 0;
    var allWeight = 0;
    var warnings = [];
    var breakdown = CRITERIA.map(function (c) {
      allWeight += c.weight;
      var manual = AH.util.toNumber(inputs[c.key]);
      var rating = null, source = 'unrated', reason = '';
      if (manual !== null && manual >= 0 && manual <= 5) {
        rating = manual; source = 'manual'; reason = 'Your rating.';
      } else if (c.auto) {
        var a = autoRating(c.key, product);
        if (a) { rating = a.rating; source = 'auto'; reason = a.reason; }
      }
      var contribution = null;
      if (rating !== null) {
        contribution = c.weight * rating / 5;
        total += contribution;
        ratedWeight += c.weight;
      }
      return {
        key: c.key, label: c.label, weight: c.weight, rating: rating, source: source,
        reason: reason, contribution: contribution === null ? null : AH.util.round(contribution, 1), help: c.help
      };
    });

    var scoreVal = ratedWeight ? Math.round(total / ratedWeight * 100) : null;
    var confidence = Math.round(ratedWeight / allWeight * 100);
    var label = scoreVal === null ? 'UNRATED' : labelFor(scoreVal);

    // Hard safety caps: a dangerous offer can't be "EXCELLENT" because the other numbers look good.
    var trust = find(breakdown, 'trustRisk');
    var comp = find(breakdown, 'complianceRisk');
    if ((trust.rating !== null && trust.rating <= 1) || (comp.rating !== null && comp.rating <= 1)) {
      if (label === 'EXCELLENT' || label === 'GOOD') label = 'TEST';
      warnings.push('Trust or compliance risk is rated very high — label capped at TEST. Promote only with great care, if at all.');
    }
    if (confidence < 50) warnings.push('Low confidence: only ' + confidence + '% of the scoring weight is rated. Rate more criteria for a meaningful score.');
    warnings.push('This score organises your judgement; it does not predict sales or revenue.');

    var strengths = breakdown.filter(function (b) { return b.rating !== null && b.rating >= 4; }).map(function (b) { return b.label; });
    var weaknesses = breakdown.filter(function (b) { return b.rating !== null && b.rating <= 2; }).map(function (b) { return b.label; });

    return {
      score: scoreVal,
      label: label,
      confidence: confidence,
      lowConfidence: confidence < 50,
      breakdown: breakdown,
      strengths: strengths,
      weaknesses: weaknesses,
      warnings: warnings,
      estimatedCommission: estimatedCommission(product)
    };
  }

  function find(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return {};
  }

  function labelFor(s) {
    for (var i = 0; i < LABELS.length; i++) if (s >= LABELS[i].min) return LABELS[i].label;
    return 'WEAK';
  }

  /** Strip unknown keys / out-of-range values from user ratings. */
  function cleanInputs(inputs) {
    var out = {};
    if (!inputs || typeof inputs !== 'object') return out;
    CRITERIA.forEach(function (c) {
      var v = AH.util.toNumber(inputs[c.key]);
      if (v !== null && v >= 0 && v <= 5) out[c.key] = Math.round(v * 2) / 2;
    });
    return out;
  }

  return { CRITERIA: CRITERIA, score: score, labelFor: labelFor, cleanInputs: cleanInputs, estimatedCommission: estimatedCommission };
})();

/* ---- shared/06_campaign.js ---- */
/*
 * Affiliate Campaign Hub — campaign strategy builder.
 *
 * Produces a structured DRAFT (sections A–L) from the offer data. It never invents
 * facts: anything that needs knowledge the system doesn't have becomes a visible
 * [[placeholder]] for the marketer to complete.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.campaign = (function () {
  function vars(p) {
    var U = AH.util;
    return {
      product: U.cleanString(p.name) || '[[product name]]',
      audience: U.cleanString(p.targetAudience) || '[[target audience]]',
      problem: U.lowerFirst(U.cleanString(p.problem).replace(/[.!]+$/, '')) || '[[main problem]]',
      benefit: U.lowerFirst(U.cleanString(p.mainBenefit).replace(/[.!]+$/, '')) || '[[main benefit]]',
      category: U.lowerFirst(U.cleanString(p.category)) || 'solution',
      niche: U.cleanString(p.niche) || U.cleanString(p.category) || '[[niche]]',
      price: p.price ? (p.currency || '') + ' ' + p.price : '[[price]]'
    };
  }

  function angleOptions(p, v) {
    var type = p.productType || 'other';
    var common = [
      'Problem-first guide: explain why ' + v.problem + ' happens and where ' + v.product + ' fits among the options.',
      'Buyer checklist: the criteria that matter when choosing a ' + v.category + ', then how ' + v.product + ' measures up.',
      'Honest comparison: ' + v.product + ' vs the most common alternative (including free options).'
    ];
    var byType = {
      software: ['Workflow walkthrough: what setup and the first useful result actually look like (show the screens).'],
      digital_course: ['Inside look: who the course is (and is not) for, what each module covers and the time commitment.'],
      ebook: ['Inside look: what the guide covers, who benefits most and what it leaves out.'],
      membership: ['Value check: is the ongoing cost justified, and how easy is it to cancel?'],
      supplement: ['Ingredient overview with linked sources — no health promises, and a clear "talk to your doctor" message.'],
      physical: ['Practical overview: build quality, setup and day-to-day use, with honest limitations.'],
      service: ['Process overview: what working with the service looks like step by step.']
    };
    return (byType[type] || []).concat(common);
  }

  function objections(p, v) {
    var list = [
      { objection: 'Is it worth ' + v.price + '?', response: 'Show what is included, who gets the most value, and cheaper/free alternatives so readers can decide.' },
      { objection: 'Will it work for my situation?', response: 'Use the "Who it is for / not for" section to help readers self-qualify honestly.' },
      { objection: 'What if it does not work for me?', response: 'State the vendor\'s actual refund policy: ' + (AH.util.cleanString(p.refundPolicy) || '[[verify refund policy on the official sales page]]') + '.' },
      { objection: 'Is this legit?', response: 'Link to the official product page, explain the vendor/network, and mention any real limitations or complaints you found.' },
      { objection: 'Can I do this for free?', response: 'Acknowledge free options and explain when the paid product adds value (and when it does not).' }
    ];
    var type = p.productType;
    if (type === 'software') list.push({ objection: 'Is it hard to learn?', response: 'Describe the setup steps and learning curve; include screenshots if you have tested it.' });
    if (type === 'digital_course' || type === 'ebook') list.push({ objection: 'What if I never finish it, like other courses?', response: 'Give the real time commitment and suggest a simple plan for the first week.' });
    if (type === 'supplement') list.push({ objection: 'Is it safe?', response: 'Do not make safety claims. Tell readers to check ingredients with their doctor, especially if they take medication.' });
    if (p.recurring === 'yes' || type === 'membership') list.push({ objection: 'Can I cancel anytime?', response: 'Explain the billing terms and cancellation process from the official page.' });
    return list;
  }

  function trafficChannels(p, scored) {
    var r = {};
    (scored && scored.breakdown || []).forEach(function (b) { r[b.key] = b.rating; });
    function prio(rating) { return rating === null || rating === undefined ? 'medium' : rating >= 4 ? 'high' : rating >= 2.5 ? 'medium' : 'low'; }
    var visualNiche = /home|garden|recipe|food|diy|craft|fitness|beauty|fashion|travel|decor|wedding|pet/i.test([p.niche, p.category].join(' '));
    var list = [
      { channel: 'SEO / organic search', priority: prio(r.searchIntent), why: 'Problem guides, buyer guides and comparisons capture people already researching a decision.' },
      { channel: 'Email list (owned audience)', priority: prio(r.emailPotential), why: 'A useful lead magnet + educational sequence builds trust before any recommendation.' },
      { channel: 'YouTube Shorts / long-form YouTube', priority: p.productType === 'software' || p.productType === 'digital_course' ? 'high' : prio(r.socialPotential), why: 'Tutorials and walkthroughs show value instead of claiming it.' },
      { channel: 'TikTok / Instagram Reels', priority: prio(r.socialPotential), why: 'Short problem/mistake/tip videos that point to the full guide.' },
      { channel: 'Pinterest', priority: visualNiche ? 'high' : 'low', why: visualNiche ? 'Visual niche with long-lived, search-driven pins.' : 'Only if you can create genuinely useful visual guides.' },
      { channel: 'Facebook groups / communities', priority: 'low', why: 'Value-first answers only; follow each group\'s rules on links and self-promotion.' },
      { channel: 'Paid ads', priority: 'low', why: 'Only after organic validation. Check the network\'s and ad platform\'s rules (many forbid direct-linking or certain claims).' }
    ];
    var order = { high: 0, medium: 1, low: 2 };
    return list.sort(function (a, b) { return order[a.priority] - order[b.priority]; });
  }

  /** Build the full A–L plan. */
  function buildPlan(product, opts) {
    opts = opts || {};
    var v = vars(product);
    var scored = AH.scoring.score(product);
    var angles = angleOptions(product, v);
    var hasExp = AH.compliance.hasExperience(product);
    var ideas = AH.content.ideas(product).map(function (i) { return i.title + (i.requiresFirstHand && !hasExp ? ' (needs first-hand evidence)' : ''); });
    var emails = AH.content.emailSequence(product, {}).map(function (e) { return 'Day ' + e.sendDay + ' — ' + e.subject; });

    return {
      version: 1,
      isDraft: true,
      generatedAt: AH.util.isoNow(opts.now),
      primaryAudience: v.audience,
      coreProblem: AH.util.capFirst(v.problem),
      desiredOutcome: AH.util.capFirst(v.benefit),
      uniqueAngle: angles[0],
      angleOptions: angles,
      mainPromise: 'Help ' + v.audience + ' decide whether ' + v.product + ' is a good way to ' + v.benefit + ' — with clear pros, cons and alternatives. No hype, no guaranteed results.',
      objections: objections(product, v),
      trustElements: [
        'Clear affiliate disclosure at the top and next to every recommendation link.',
        hasExp ? 'Your documented first-hand notes and screenshots (Experience Notes).' : 'Research-based framing only — you have no Experience Notes yet, so do not imply personal testing.',
        'Honest cons and a "who it is NOT for" section.',
        'The vendor\'s real refund policy, linked to the official page.',
        'Comparison with alternatives, including free options.',
        'Author box: who you are and how you evaluated the product.',
        'Sources for any factual claim; "last updated" date.'
      ],
      ctaStrategy: {
        placements: [
          'After the initial recommendation (top summary)',
          'After explaining the solution / how it works',
          'After the comparison and pros/cons evaluation',
          'At the final decision point'
        ],
        ctaTexts: ['See the full product details', 'View the official offer', 'Explore ' + v.product, 'Check today\'s price on the official site'],
        rules: 'Max 4 placements. Benefit-oriented but factual text. No fake urgency, countdowns or scarcity. Links use rel="sponsored".'
      },
      trafficChannels: trafficChannels(product, scored),
      contentIdeas: ideas,
      emailIdeas: emails,
      testingIdeas: [
        'Headline: problem-framed vs outcome-framed.',
        'CTA text: "See the full product details" vs "View the official offer".',
        'CTA placement: first CTA after the intro vs after the solution section.',
        'Comparison format: table vs short prose.',
        'Lead magnet: checklist vs comparison sheet (if you collect emails).',
        'Content angle: buyer guide vs problem-first guide as the main traffic page.'
      ],
      kpis: {
        primary: 'Affiliate CTR (clicks ÷ visits) and conversions from your network report.',
        decisionRule: 'Make no decision before the minimum sample in Settings is reached.'
      },
      scoreSnapshot: { score: scored.score, label: scored.label, confidence: scored.confidence }
    };
  }

  /** Human-readable section titles (A–L) used by the UI. */
  var SECTIONS = [
    ['primaryAudience', 'A. Primary audience'],
    ['coreProblem', 'B. Core problem'],
    ['desiredOutcome', 'C. Desired outcome'],
    ['uniqueAngle', 'D. Unique angle'],
    ['mainPromise', 'E. Main promise'],
    ['objections', 'F. Objections'],
    ['trustElements', 'G. Trust elements'],
    ['ctaStrategy', 'H. CTA strategy'],
    ['trafficChannels', 'I. Traffic channels'],
    ['contentIdeas', 'J. Content ideas'],
    ['emailIdeas', 'K. Email sequence ideas'],
    ['testingIdeas', 'L. Testing ideas']
  ];

  return { buildPlan: buildPlan, angleOptions: angleOptions, SECTIONS: SECTIONS, vars: vars };
})();

/* ---- shared/07_content.js ---- */
/*
 * Affiliate Campaign Hub — content planning engine.
 *
 * Plans a small number of genuinely useful pieces per offer (not a spam generator).
 * Pieces that need first-hand experience are flagged; case studies stay LOCKED until
 * real evidence exists. Everything produced here is a draft for human review.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.content = (function () {
  var V = function (p) { return AH.campaign.vars(p); };

  var INTENT_LABELS = {
    informational: 'Informational',
    commercial: 'Commercial investigation',
    comparison: 'Comparison',
    transactional: 'Transactional',
    problem: 'Problem-solving'
  };

  /** Content concepts for an offer (one per type). */
  function ideas(product) {
    var v = V(product);
    var hasExp = AH.compliance.hasExperience(product);
    var evidence = hasExp && product.experienceNotes && AH.util.cleanString(product.experienceNotes.evidence);
    var list = [
      {
        type: 'problem_solution', clusterRole: 'pillar', intent: 'problem',
        title: 'How to Solve ' + AH.util.capFirst(v.problem) + ': A Practical Guide for ' + v.audience,
        outline: ['Why ' + v.problem + ' happens', 'Options compared: free, DIY and paid', 'Step-by-step plan', 'When a product like ' + v.product + ' makes sense (and when it does not)', 'FAQ'],
        requiresFirstHand: false
      },
      {
        type: 'buyer_guide', clusterRole: 'supporting', intent: 'commercial',
        title: 'What to Look for When Choosing a ' + AH.util.capFirst(v.category),
        outline: ['The 5 criteria that actually matter', 'Red flags and hype to avoid', 'Questions to ask before you pay', 'Checklist (downloadable)', 'Where ' + v.product + ' fits'],
        requiresFirstHand: false
      },
      {
        type: 'faq', clusterRole: 'supporting', intent: 'informational',
        title: 'Questions to Ask Before Buying a ' + AH.util.capFirst(v.category),
        outline: ['Price and refund questions', 'Fit: is it right for your situation?', 'Time and effort required', 'Alternatives worth considering'],
        requiresFirstHand: false
      },
      {
        type: 'tutorial', clusterRole: 'supporting', intent: 'informational',
        title: 'How to ' + AH.util.capFirst(v.benefit) + ' (Step by Step)',
        outline: ['What you need before you start', 'Step-by-step instructions', 'Common mistakes', 'Tools that can help (with honest trade-offs)'],
        requiresFirstHand: false
      },
      {
        type: 'comparison', clusterRole: 'commercial', intent: 'comparison',
        title: v.product + ' vs [[main alternative]]: Which Is Better for ' + v.audience + '?',
        outline: ['Quick verdict (who should pick which)', 'Comparison table: price, features, support, refund policy', 'Key differences explained', 'Who should choose ' + v.product, 'Who should choose [[main alternative]]'],
        requiresFirstHand: false
      },
      {
        type: 'alternatives', clusterRole: 'commercial', intent: 'commercial',
        title: 'Best Alternatives to ' + v.product + ' (Including Free Options)',
        outline: ['Why people look for alternatives', 'Free and low-cost options', 'Paid alternatives compared', 'How to choose'],
        requiresFirstHand: false
      },
      {
        type: 'review', clusterRole: 'commercial', intent: 'commercial',
        title: hasExp ? 'Is ' + v.product + ' Worth It? My Hands-On Review' : v.product + ' Review: What to Know Before You Buy (Research-Based)',
        outline: hasExp
          ? ['Summary verdict', 'What I tested and how', 'What I liked', 'What I did not like', 'Who it is for / not for', 'Alternatives', 'FAQ']
          : ['Summary (research-based — not personally tested)', 'What the product includes (from the official page)', 'Pros and cons based on research', 'Who it is for / not for', 'Alternatives', 'FAQ'],
        requiresFirstHand: true
      },
      {
        type: 'case_study', clusterRole: 'commercial', intent: 'commercial',
        title: evidence ? v.product + ' Case Study: [[Specific result]] Documented Step by Step' : 'Case study (locked — needs real, documented evidence)',
        outline: evidence ? ['Starting situation', 'What was done (with dates)', 'Measured results (with screenshots)', 'What did not work', 'Lessons'] : ['Record real results in Experience Notes → Supporting evidence to unlock.'],
        requiresFirstHand: true,
        locked: !evidence
      }
    ];
    return list.map(function (i) {
      i.intentLabel = INTENT_LABELS[i.intent];
      i.locked = !!i.locked;
      i.seo = {
        title: i.title.length > 60 ? i.title.slice(0, 57).replace(/\s+\S*$/, '') + '…' : i.title,
        metaDescription: metaFor(i, v),
        slug: AH.util.slugify(i.title.replace(/\[\[.*?\]\]/g, 'alternative'))
      };
      i.internalLinks = linkSuggestions(i.clusterRole);
      return i;
    });
  }

  function metaFor(i, v) {
    var m = {
      problem_solution: 'A practical, step-by-step guide to ' + v.problem + ' — free options, paid options and how to choose.',
      buyer_guide: 'The criteria that matter when choosing a ' + v.category + ', red flags to avoid and a free checklist.',
      faq: 'Honest answers to the questions you should ask before buying a ' + v.category + '.',
      tutorial: 'Learn how to ' + v.benefit + ' step by step, with common mistakes to avoid.',
      comparison: v.product + ' compared side by side: price, features, refund policy and who each option suits.',
      alternatives: 'Free and paid alternatives to ' + v.product + ', compared honestly.',
      review: 'What ' + v.product + ' includes, honest pros and cons, who it is for and alternatives.',
      case_study: 'A documented case study with real, verifiable results.'
    }[i.type];
    return m.length > 160 ? m.slice(0, 157) + '…' : m;
  }

  function linkSuggestions(role) {
    if (role === 'pillar') return ['Link to the buyer guide, tutorial and comparison pages.', 'Link once to the main landing page in the "options" section.'];
    if (role === 'supporting') return ['Link up to the pillar guide.', 'Link across to the comparison/review page where readers are ready to decide.'];
    return ['Link up to the pillar guide for context.', 'Link to the landing page (affiliate CTA lives there).'];
  }

  /** Topic cluster (pillar → supporting → commercial → landing page). */
  function cluster(product) {
    var items = ideas(product);
    function by(role) { return items.filter(function (i) { return i.clusterRole === role; }).map(function (i) { return i.title; }); }
    return {
      mainTopic: AH.util.capFirst(V(product).niche),
      pillar: by('pillar'),
      supporting: by('supporting'),
      commercial: by('commercial'),
      landing: 'Affiliate landing page for ' + V(product).product
    };
  }

  // ---------------------------------------------------------------- social / video

  var ANGLE_TEMPLATES = {
    problem: { platforms: ['tiktok', 'instagram_reels', 'youtube_shorts'], dur: 30, firstHand: false,
      hook: 'Struggling with {problem}? Here is what is usually going on.',
      problem: 'Name the problem in the viewer\'s words and why common fixes fail.',
      value: 'Share 2–3 practical causes and one thing they can try today (no product needed).',
      demo: 'On-screen text list of causes; you talking to camera.',
      cta: 'Full guide (with options compared) — link in bio.' },
    mistake: { platforms: ['tiktok', 'instagram_reels', 'youtube_shorts'], dur: 30, firstHand: false,
      hook: 'A common mistake when trying to {benefit}…',
      problem: 'Describe the mistake and its consequence.',
      value: 'Show the better approach in simple steps.',
      demo: 'Split screen: "mistake" vs "better way".',
      cta: 'More mistakes to avoid in my guide — link in bio.' },
    tip: { platforms: ['tiktok', 'instagram_reels', 'youtube_shorts', 'pinterest'], dur: 20, firstHand: false,
      hook: 'One practical tip to {benefit}.',
      problem: 'Quick context: who this tip is for.',
      value: 'Explain the tip clearly enough that it works without buying anything.',
      demo: 'Show the tip being applied.',
      cta: 'Save this and see the full step-by-step guide.' },
    comparison: { platforms: ['youtube_shorts', 'tiktok', 'instagram_reels', 'pinterest'], dur: 45, firstHand: false,
      hook: 'Before you buy a {category}, check these three things.',
      problem: 'Buyers often compare on price alone.',
      value: 'Explain the three decision factors (e.g. fit, total cost, refund policy).',
      demo: 'Simple comparison table on screen.',
      cta: 'See my full comparison — link in bio.' },
    tutorial: { platforms: ['youtube_shorts', 'tiktok', 'instagram_reels'], dur: 60, firstHand: false,
      hook: 'How to {benefit} — step by step.',
      problem: 'Why people get stuck at the start.',
      value: 'Walk through 3–5 concrete steps.',
      demo: 'Screen recording or hands-on steps.',
      cta: 'Detailed written tutorial — link in bio.' },
    myth: { platforms: ['tiktok', 'instagram_reels', 'x'], dur: 30, firstHand: false,
      hook: 'Myth: [[a common myth about {niche}]].',
      problem: 'Why the myth sounds believable.',
      value: 'What is actually true — cite a source if you state a fact.',
      demo: 'Myth vs fact text overlay.',
      cta: 'More honest answers in my guide.' },
    faq: { platforms: ['youtube_shorts', 'tiktok', 'facebook', 'x'], dur: 40, firstHand: false,
      hook: '"Is {product} worth it?" The honest answer depends on this.',
      problem: 'The question buyers keep asking.',
      value: 'Explain who it suits, who it does not, and the refund policy.',
      demo: 'Talking head + key points on screen.',
      cta: 'Full pros and cons — link in bio.' },
    review: { platforms: ['youtube_shorts', 'tiktok', 'facebook'], dur: 60, firstHand: true,
      hook: 'I used {product} for [[how long]] — here is my honest verdict.',
      problem: 'What you hoped it would solve.',
      value: 'What you liked, what you did not like, who should skip it.',
      demo: 'Real footage/screenshots from your own use.',
      cta: 'My full review with pros and cons — link in bio.' },
    story: { platforms: ['tiktok', 'instagram_reels', 'facebook'], dur: 45, firstHand: true,
      hook: '[[Your real story: the moment you realised {problem} needed fixing]]',
      problem: 'Your real situation (only true details).',
      value: 'What you tried and what you learned.',
      demo: 'B-roll from your real experience.',
      cta: 'What I recommend now — link in bio.' },
    demonstration: { platforms: ['youtube_shorts', 'tiktok', 'instagram_reels'], dur: 60, firstHand: true,
      hook: 'Watch me set up {product} from scratch.',
      problem: 'Viewers want to see what it is really like before buying.',
      value: 'Show the actual setup / first use, including any friction.',
      demo: 'Unedited screen recording or hands-on footage.',
      cta: 'Full walkthrough and honest verdict — link in bio.' }
  };

  function fillT(tpl, v) {
    return String(tpl).replace(/\{(\w+)\}/g, function (_, k) { return v[k] !== undefined ? v[k] : '[[' + k + ']]'; });
  }

  function socialDrafts(product, angles) {
    var v = V(product);
    var hasExp = AH.compliance.hasExperience(product);
    angles = (angles && angles.length ? angles : AH.schema.SOCIAL_ANGLES).filter(function (a) { return ANGLE_TEMPLATES[a]; });
    return angles.map(function (angle) {
      var t = ANGLE_TEMPLATES[angle];
      var hook = fillT(t.hook, v);
      var needsFH = t.firstHand && !hasExp;
      var caption = hook + '\n\n' + fillT(t.value, v) + '\n\n' + t.cta + '\n' + AH.compliance.socialDisclosure(t.platforms[0]);
      return {
        angle: angle,
        platforms: t.platforms,
        hook: needsFH ? '[[Needs first-hand experience — record Experience Notes first]] ' + hook : hook,
        problem: t.problem,
        value: fillT(t.value, v),
        demonstration: t.demo,
        cta: t.cta,
        disclosure: AH.compliance.socialDisclosure(t.platforms[0]),
        caption: caption,
        durationSec: t.dur,
        requiresFirstHand: t.firstHand,
        status: 'draft'
      };
    });
  }

  // ---------------------------------------------------------------- email

  function leadMagnets(product) {
    var v = V(product);
    var type = product.productType;
    var list = [
      { kind: 'checklist', title: AH.util.capFirst(v.category) + ' Buyer Checklist', description: 'A one-page checklist of the criteria and red flags from your buyer guide.' },
      { kind: 'comparison_sheet', title: v.product + ' vs Alternatives — Comparison Sheet', description: 'Side-by-side table of price, features and refund policy (verify every cell).' },
      { kind: 'quick_start', title: 'Quick-Start Guide: ' + AH.util.capFirst(v.benefit), description: 'The first 5 steps anyone can take, with or without a paid product.' },
      { kind: 'resource_list', title: 'Free Resources for ' + v.audience, description: 'Curated free tools and guides — builds trust before any recommendation.' }
    ];
    if (type === 'software') list.push({ kind: 'template', title: v.product + ' Starter Template', description: 'A template that saves setup time (only if licensing allows).' });
    if (/finance|budget|money|invest|business|marketing/i.test(v.niche)) list.push({ kind: 'calculator', title: 'Simple ' + v.niche + ' Calculator (spreadsheet)', description: 'A spreadsheet that helps readers run their own numbers — no income promises.' });
    return list;
  }

  function emailSequence(product, opts) {
    opts = opts || {};
    var v = V(product);
    var magnet = opts.leadMagnet || leadMagnets(product)[0].title;
    var disclosure = 'Disclosure: the link below is an affiliate link. If you buy through it I may earn a commission, at no extra cost to you.';
    var footer = '\n\n—\nYou are receiving this because you asked for "' + magnet + '". Unsubscribe anytime: {unsubscribe_link}';
    var steps = [
      { type: 'welcome', sendDay: 0, subject: 'Here is your ' + magnet,
        body: 'Hi {first_name},\n\nThanks for signing up. Here is your ' + magnet + ': {download_link}\n\nOver the next few days I will send a few short, practical emails about ' + v.problem + '. No hype — just what helps.\n\nQuick question: what is your biggest challenge with ' + v.niche + ' right now? Hit reply and tell me.' },
      { type: 'educational', sendDay: 2, subject: 'The basics most people skip',
        body: 'Hi {first_name},\n\n[[One genuinely useful lesson about ' + v.niche + ' — something readers can apply without buying anything.]]\n\nRead the full guide: {pillar_guide_link}' },
      { type: 'problem', sendDay: 4, subject: 'Why ' + v.problem + ' keeps happening',
        body: 'Hi {first_name},\n\n[[Explain the root causes of ' + v.problem + ' and what usually does not work.]]\n\nNext time I will compare the main options side by side.' },
      { type: 'comparison', sendDay: 6, subject: 'Free vs paid options, compared honestly',
        body: 'Hi {first_name},\n\nHere is how the main options compare — including free ones:\n\n[[Short comparison: free/DIY option, ' + v.product + ', one alternative. Price, effort, who each suits.]]\n\nFull comparison: {comparison_link}' },
      { type: 'recommendation', sendDay: 8, subject: 'Is ' + v.product + ' right for you?',
        body: 'Hi {first_name},\n\nIf you are ' + v.audience + ' and want to ' + v.benefit + ', ' + v.product + ' may be worth a look.\n\nIt is a good fit if: [[fit criteria]]\nIt is NOT a good fit if: [[non-fit criteria]]\nRefund policy: ' + (AH.util.cleanString(product.refundPolicy) || '[[verify on the official page]]') + '\n\n' + disclosure + '\nView the official offer: {affiliate_link}' },
      { type: 'follow_up', sendDay: 11, subject: 'Questions about ' + v.product + '?',
        body: 'Hi {first_name},\n\nA few readers asked me questions about ' + v.product + '. Here are honest answers:\n\n[[2–3 real reader questions and answers]]\n\nIf it is not for you, that is completely fine — the free resources still apply.' }
    ];
    return steps.map(function (s, i) {
      return {
        step: i + 1, type: s.type, sendDay: s.sendDay, subject: s.subject, body: s.body + footer,
        leadMagnet: magnet, status: 'draft', clicks: 0, conversions: 0, unsubscribes: 0
      };
    });
  }

  return {
    ideas: ideas,
    cluster: cluster,
    socialDrafts: socialDrafts,
    leadMagnets: leadMagnets,
    emailSequence: emailSequence,
    ANGLE_TEMPLATES: ANGLE_TEMPLATES,
    INTENT_LABELS: INTENT_LABELS
  };
})();

/* ---- shared/08_seo.js ---- */
/*
 * Affiliate Campaign Hub — SEO helpers: canonical URLs, sitemap, structured data,
 * internal-link suggestions. Built around search intent, never keyword stuffing.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.seo = (function () {
  var U = function () { return AH.util; };

  function pagePath(page) {
    return '/p/' + page.slug + '.html';
  }

  function canonical(page, settings) {
    var seo = page.seo || {};
    if (seo.canonical && U().parseUrl(seo.canonical)) return seo.canonical;
    var base = String((settings && settings.siteUrl) || '').replace(/\/+$/, '');
    return base ? base + pagePath(page) : pagePath(page);
  }

  /** XML sitemap of published, indexable pages (+ optional static URLs). */
  function sitemap(pages, settings, extraPaths) {
    var base = String((settings && settings.siteUrl) || '').replace(/\/+$/, '');
    var urls = [];
    (extraPaths || []).forEach(function (p) { urls.push({ loc: base + p, lastmod: '' }); });
    pages
      .filter(function (p) { return p.status === 'published' && !(p.seo && p.seo.noindex); })
      .forEach(function (p) { urls.push({ loc: canonical(p, settings), lastmod: U().dateKey(p.updatedAt || p.publishedAt) }); });
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(function (u) {
        return '  <url><loc>' + U().escapeXml(u.loc) + '</loc>' + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '') + '</url>';
      }).join('\n') +
      '\n</urlset>\n';
  }

  function robots(settings) {
    var base = String((settings && settings.siteUrl) || '').replace(/\/+$/, '');
    return 'User-agent: *\nDisallow: /admin/\n' + (base ? 'Sitemap: ' + base + '/sitemap.xml\n' : '');
  }

  /** JSON-LD: Article (+ FAQPage when real FAQ answers exist). No fake Review/Rating markup. */
  function jsonLd(page, product, settings) {
    var seo = page.seo || {};
    var hasPh = function (s) { return AH.compliance.findPlaceholders(s).length > 0; };
    var graph = [{
      '@type': 'Article',
      headline: seo.title || page.title,
      description: seo.metaDescription || '',
      dateModified: page.updatedAt || page.publishedAt || '',
      datePublished: page.publishedAt || '',
      mainEntityOfPage: canonical(page, settings),
      author: settings && settings.authorName ? { '@type': 'Person', name: settings.authorName } : undefined,
      about: product && product.name ? { '@type': 'Thing', name: product.name } : undefined
    }];
    var faq = (page.sections && page.sections.faq && page.sections.faq.items) || [];
    var realFaq = faq.filter(function (f) { return f && f.q && f.a && !hasPh(f.q) && !hasPh(f.a); });
    if (realFaq.length) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: realFaq.map(function (f) {
          return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } };
        })
      });
    }
    // JSON.stringify drops undefined; escape "<" so the payload can't close the <script> tag.
    return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  }

  /** Suggest internal links between published/draft pages in the same niche or product. */
  function internalLinks(page, allPages, products) {
    var prodById = {};
    (products || []).forEach(function (p) { prodById[p.id] = p; });
    var me = prodById[page.productId] || {};
    return allPages
      .filter(function (p) { return p.id !== page.id && p.status !== 'archived'; })
      .map(function (p) {
        var other = prodById[p.productId] || {};
        var score = 0;
        if (p.productId && p.productId === page.productId) score += 2;
        if (me.niche && other.niche && me.niche.toLowerCase() === other.niche.toLowerCase()) score += 2;
        if (me.category && other.category && me.category.toLowerCase() === other.category.toLowerCase()) score += 1;
        return { pageId: p.id, title: p.title, path: pagePath(p), pageType: p.pageType, score: score };
      })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 6);
  }

  /** Simple metadata lint used in the editor. */
  function lint(seo) {
    seo = seo || {};
    var out = [];
    var t = AH.util.cleanString(seo.title);
    var d = AH.util.cleanString(seo.metaDescription);
    if (!t) out.push('Missing SEO title.');
    else if (t.length > 60) out.push('SEO title is ' + t.length + ' chars (≤ 60 recommended).');
    if (!d) out.push('Missing meta description.');
    else if (d.length < 70) out.push('Meta description is short (' + d.length + ' chars). Aim for 120–160.');
    else if (d.length > 160) out.push('Meta description is ' + d.length + ' chars (≤ 160 recommended).');
    if (t && /(\b\w+\b)(?:\W+\w+){0,3}\W+\1\b.*\1/i.test(t)) out.push('Title repeats a word several times — avoid keyword stuffing.');
    return out;
  }

  return { canonical: canonical, pagePath: pagePath, sitemap: sitemap, robots: robots, jsonLd: jsonLd, internalLinks: internalLinks, lint: lint };
})();

/* ---- shared/09_landing.js ---- */
/*
 * Affiliate Campaign Hub — landing pages: draft generator + safe HTML renderer.
 *
 * Generator: builds a structured page from the offer + campaign. Facts it does not know
 * become [[placeholders]]; the compliance check blocks publishing until they are filled.
 * Renderer: every user string is HTML-escaped; affiliate links use rel="sponsored";
 * the disclosure appears at the top and beside every CTA. No timers, no fake scarcity,
 * no testimonials, no rating markup.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.landing = (function () {
  var PRODUCT_TYPE_LABELS = {
    digital_course: 'Online course', ebook: 'E-book / digital guide', software: 'Software', membership: 'Membership',
    physical: 'Physical product', supplement: 'Supplement', service: 'Service', other: 'Product'
  };

  var CTA_KEYS = ['afterIntro', 'afterSolution', 'afterEvaluation', 'final'];

  function lines(text) {
    return String(text || '').split(/\r?\n/).map(function (s) { return s.replace(/^[-*•]\s*/, '').trim(); }).filter(Boolean);
  }

  // ------------------------------------------------------------------ generator

  function generate(product, campaign, link, opts) {
    opts = opts || {};
    var U = AH.util;
    var v = AH.campaign.vars(product);
    var type = opts.pageType || 'review';
    var exp = product.experienceNotes || {};
    var hasExp = AH.compliance.hasExperience(product);
    var risk = AH.compliance.nicheRisk(product);
    var price = product.price ? (product.currency || '') + ' ' + product.price + (product.recurring === 'yes' ? ' (recurring)' : '') : '[[price from the official page]]';
    var refund = U.cleanString(product.refundPolicy) || '[[verify the refund policy on the official page]]';
    var plan = (campaign && campaign.plan) || {};

    var headlines = {
      review: hasExp ? v.product + ' Review: Is It Worth It?' : v.product + ': What to Know Before You Buy',
      comparison: v.product + ' vs [[main alternative]]: Which Should You Choose?',
      problem_solution: 'How to ' + U.capFirst(v.benefit) + ' — and Whether ' + v.product + ' Can Help',
      buyer_guide: 'Choosing a ' + U.capFirst(v.category) + '? What Matters and Where ' + v.product + ' Fits'
    };
    var headline = headlines[type] || headlines.review;
    var sub = hasExp
      ? 'A hands-on look at what ' + v.product + ' offers ' + v.audience + ' — what worked, what did not, and who should skip it.'
      : 'A research-based look at what ' + v.product + ' offers ' + v.audience + ', with honest pros, cons and alternatives.';

    var liked = lines(exp.liked);
    var disliked = lines(exp.disliked).concat(lines(exp.problems));

    var sections = {
      hero: {
        headline: headline,
        subheadline: sub,
        summary: 'Short answer: ' + v.product + ' may suit ' + v.audience + ' who want to ' + v.benefit + '. [[Add your one-paragraph verdict: who it suits, the main trade-off, and who should look elsewhere.]]',
        ctaText: 'See the full product details'
      },
      problem: {
        heading: 'The problem: ' + v.problem,
        body: 'If you are ' + v.audience + ', you probably know the frustration of ' + v.problem + '.\n\n[[Explain why this happens and what people usually try first. Use your own research or experience — no copied merchant text.]]'
      },
      solution: {
        heading: 'How ' + v.product + ' approaches it',
        body: v.product + ' is a ' + (PRODUCT_TYPE_LABELS[product.productType] || 'product').toLowerCase() + ' designed to help you ' + v.benefit + '.\n\n[[Explain in plain words how it works: the method, what is included and what you have to do yourself.]]'
      },
      benefits: {
        heading: 'Key benefits',
        items: [U.capFirst(v.benefit), '[[Second concrete benefit — verified on the official page]]', '[[Third concrete benefit]]']
      },
      product: {
        heading: 'What you get',
        body: '- Format: ' + (PRODUCT_TYPE_LABELS[product.productType] || '[[format]]') + '\n- Price at time of writing: ' + price + '\n- Refund policy: ' + refund +
          '\n- Sold through ' + (AH.schema.NETWORK_LABELS[product.network] || 'the vendor') + ' (the official checkout handles payment and refunds)\n- [[What is included — modules, features, bonuses]]'
      },
      method: {
        heading: hasExp ? 'How I evaluated ' + v.product : 'How this overview was researched',
        body: hasExp
          ? 'I tested ' + v.product + ' myself: ' + U.cleanString(exp.tested) + '. My notes, screenshots and observations are summarised below.'
          : 'I have not personally tested ' + v.product + '. This overview is based on the official product page, the vendor\'s refund policy and [[other sources you checked — list them below]]. Where I give an opinion, it is labelled as such.'
      },
      experience: {
        enabled: hasExp,
        heading: 'My hands-on notes',
        body: hasExp ? [
          exp.tested ? 'What I tested: ' + exp.tested : '',
          exp.liked ? 'What I liked: ' + exp.liked : '',
          exp.disliked ? 'What I did not like: ' + exp.disliked : '',
          exp.problems ? 'Problems I ran into: ' + exp.problems : '',
          exp.setupDifficulty ? 'Setup difficulty: ' + exp.setupDifficulty : '',
          exp.observations ? 'Observations: ' + exp.observations : ''
        ].filter(Boolean).join('\n\n') : '',
        screenshots: hasExp ? lines(exp.screenshots).filter(function (s) { var p = U.parseUrl(s); return p && p.protocol === 'https'; }).slice(0, 6) : []
      },
      forWho: { heading: 'Who it is for', items: [U.capFirst(v.audience) + ' who want to ' + v.benefit, '[[Another reader profile that fits well]]'] },
      notFor: { heading: 'Who it is NOT for', items: ['Anyone expecting a quick fix or instant results', '[[Who should skip it — be specific]]'] },
      pros: { heading: 'Pros', items: liked.length ? liked.slice(0, 6) : ['[[A genuine strength you verified]]', '[[Another strength]]'] },
      cons: { heading: 'Cons', items: disliked.length ? disliked.slice(0, 6) : ['[[An honest limitation or drawback]]'] },
      comparison: {
        enabled: type === 'comparison' || type === 'review' || type === 'buyer_guide',
        heading: type === 'comparison' ? v.product + ' vs [[main alternative]]' : 'How it compares',
        columns: ['', v.product, '[[Alternative]]', 'Free / DIY option'],
        rows: [
          ['Price', price, '[[price]]', 'Free'],
          ['Best for', U.capFirst(v.audience), '[[who]]', 'People with time to research and experiment'],
          ['Refund policy', refund, '[[policy]]', 'n/a'],
          ['Main trade-off', '[[main trade-off]]', '[[trade-off]]', 'More time and trial-and-error']
        ],
        note: 'Prices and policies can change — check the official pages before buying.'
      },
      faq: {
        heading: 'Frequently asked questions',
        items: [
          { q: 'Is ' + v.product + ' worth it?', a: 'It depends on your situation. It is likely a good fit if [[fit criteria]]. If [[non-fit criteria]], one of the alternatives above may suit you better.' },
          { q: 'Does ' + v.product + ' have a refund policy?', a: refund === '[[verify the refund policy on the official page]]' ? refund : 'According to the official page: ' + refund + '. Always confirm the current terms before buying.' },
          { q: 'How much does ' + v.product + ' cost?', a: product.price ? 'At the time of writing, the official page lists ' + price + '. Prices can change, so check the official page.' : '[[Price from the official page]]' },
          { q: 'Are there free alternatives?', a: '[[Name genuine free alternatives and when they are enough.]]' }
        ]
      },
      disclaimer: {
        body: risk.level === 'high'
          ? (risk.kind === 'health'
            ? 'This content is general information, not medical advice. Talk to a qualified healthcare professional before starting any supplement, diet or treatment — especially if you have a medical condition or take medication. Individual results vary.'
            : 'This content is general information, not financial advice. Results vary and are not typical or guaranteed. Never spend or invest money you cannot afford to lose.')
          : ''
      },
      leadCapture: {
        enabled: false,
        heading: 'Get the free checklist',
        body: 'A one-page checklist to help you compare options before you buy.',
        magnet: AH.content.leadMagnets(product)[0].title,
        consentText: 'Yes, email me the checklist and occasional related tips. I can unsubscribe at any time.',
        buttonText: 'Send me the checklist'
      },
      finalCta: {
        heading: 'Is ' + v.product + ' right for you?',
        body: 'If you are ' + v.audience + ' and the pros above matter more to you than the cons, check the official page for the current price and full details. If not, the alternatives above may suit you better.',
        ctaText: 'View the official offer'
      },
      ctaText: (plan.ctaStrategy && plan.ctaStrategy.ctaTexts && plan.ctaStrategy.ctaTexts[0]) || 'See the full product details',
      ctaPlacements: { afterIntro: true, afterSolution: true, afterEvaluation: true, final: true },
      sources: { heading: 'Sources', items: product.productPageUrl ? [{ label: 'Official ' + v.product + ' page', url: product.productPageUrl }] : [] }
    };

    var slugBase = { review: v.product + ' review', comparison: v.product + ' vs alternative', problem_solution: 'how to ' + v.benefit, buyer_guide: v.category + ' buyer guide' }[type];
    var title = headline;
    var seoTitle = title.length > 60 ? title.slice(0, 57).replace(/\s+\S*$/, '') + '…' : title;
    var meta = (hasExp ? 'Hands-on' : 'Research-based') + ' look at ' + v.product + ' for ' + v.audience + ': what it includes, honest pros and cons, price and alternatives.';
    return {
      campaignId: campaign ? campaign.id : '',
      productId: product.id,
      linkId: link ? link.id : '',
      pageType: type,
      slug: AH.util.slugify(slugBase || title) || 'page',
      title: title,
      sections: sections,
      seo: {
        title: seoTitle,
        metaDescription: meta.length > 160 ? meta.slice(0, 157) + '…' : meta,
        canonical: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        noindex: false
      }
    };
  }

  // ------------------------------------------------------------------ renderer

  var E = function (s) { return AH.util.escapeHtml(s); };

  /** Paragraphs + "- " bullet lists; everything escaped. */
  function rich(text) {
    var blocks = String(text || '').split(/\n\s*\n/);
    return blocks.map(function (b) {
      var ls = b.split(/\r?\n/).filter(function (l) { return l.trim(); });
      if (!ls.length) return '';
      if (ls.every(function (l) { return /^\s*[-*•]\s+/.test(l); })) {
        return '<ul>' + ls.map(function (l) { return '<li>' + E(l.replace(/^\s*[-*•]\s+/, '')) + '</li>'; }).join('') + '</ul>';
      }
      return '<p>' + ls.map(E).join('<br>') + '</p>';
    }).join('\n');
  }

  function list(items, cls) {
    items = (items || []).filter(function (i) { return AH.util.cleanString(i); });
    if (!items.length) return '';
    return '<ul class="' + cls + '">' + items.map(function (i) { return '<li>' + E(i) + '</li>'; }).join('') + '</ul>';
  }

  function safeHref(url) {
    var p = AH.util.parseUrl(url);
    return p ? p.href : '';
  }

  function cta(key, text, ctx) {
    var placements = (ctx.page.sections && ctx.page.sections.ctaPlacements) || {};
    if (placements[key] === false) return '';
    var href = ctx.link ? safeHref(ctx.link.url) : '';
    if (!href) return '<p class="ah-cta ah-cta-missing">[Affiliate link missing]</p>';
    return '<div class="ah-cta" data-ah-cta-wrap="' + key + '">' +
      '<a class="ah-btn" href="' + E(href) + '" rel="sponsored nofollow noopener" target="_blank" data-ah-link="' + E(ctx.link.id) + '" data-ah-cta="' + key + '" data-ah-ab="cta_text">' + E(text) + '</a>' +
      '<p class="ah-cta-note">Affiliate link — I may earn a commission if you buy, at no extra cost to you. Opens the official page.</p>' +
      '</div>';
  }

  function section(key, heading, inner) {
    if (!inner) return '';
    return '<section class="ah-section" data-ah-section="' + key + '">' + (heading ? '<h2>' + E(heading) + '</h2>' : '') + inner + '</section>';
  }

  /** Renders the <main> article. ctx = { page, product, link, settings, preview } */
  function renderArticle(ctx) {
    var page = ctx.page;
    var s = page.sections || {};
    var settings = ctx.settings || {};
    var ctaText = s.ctaText || 'See the full product details';
    var out = [];

    out.push('<header class="ah-hero"><h1 data-ah-ab="headline">' + E(s.hero && s.hero.headline || page.title) + '</h1>' +
      (s.hero && s.hero.subheadline ? '<p class="ah-sub" data-ah-ab="subheadline">' + E(s.hero.subheadline) + '</p>' : '') +
      '<p class="ah-meta">' + (settings.authorName ? 'By ' + E(settings.authorName) + ' · ' : '') + 'Updated ' + E(AH.util.dateKey(page.updatedAt) || AH.util.dateKey(AH.util.isoNow())) + '</p></header>');

    // Disclosure: clear, conspicuous, before the first recommendation.
    out.push('<aside class="ah-disclosure" role="note"><strong>Disclosure:</strong> ' + E(settings.disclosureText || '') +
      (settings.disclosureUrl ? ' <a href="' + E(safeHref(settings.disclosureUrl)) + '">Learn more</a>' : '') + '</aside>');

    if (s.disclaimer && AH.util.cleanString(s.disclaimer.body)) {
      out.push('<aside class="ah-disclaimer" role="note">' + E(s.disclaimer.body) + '</aside>');
    }

    if (s.hero && s.hero.summary) out.push(section('summary', '', '<div class="ah-summary">' + rich(s.hero.summary) + '</div>'));
    out.push(cta('afterIntro', (s.hero && s.hero.ctaText) || ctaText, ctx));

    if (s.problem) out.push(section('problem', s.problem.heading, rich(s.problem.body)));
    if (s.solution) out.push(section('solution', s.solution.heading, rich(s.solution.body)));
    if (s.benefits) out.push(section('benefits', s.benefits.heading, list(s.benefits.items, 'ah-list ah-benefits')));
    if (s.product) out.push(section('product', s.product.heading, rich(s.product.body)));
    out.push(cta('afterSolution', ctaText, ctx));

    if (s.method) out.push(section('method', s.method.heading, rich(s.method.body)));
    if (s.experience && s.experience.enabled && s.experience.body) {
      var shots = (s.experience.screenshots || []).map(safeHref).filter(Boolean).map(function (u) {
        return '<figure><img src="' + E(u) + '" alt="Screenshot from my own testing" loading="lazy" decoding="async"></figure>';
      }).join('');
      out.push(section('experience', s.experience.heading, rich(s.experience.body) + (shots ? '<div class="ah-shots">' + shots + '</div>' : '')));
    }

    var fit = '';
    if (s.forWho) fit += '<div class="ah-col"><h3>' + E(s.forWho.heading || 'Who it is for') + '</h3>' + list(s.forWho.items, 'ah-list ah-yes') + '</div>';
    if (s.notFor) fit += '<div class="ah-col"><h3>' + E(s.notFor.heading || 'Who it is NOT for') + '</h3>' + list(s.notFor.items, 'ah-list ah-no') + '</div>';
    if (fit) out.push(section('fit', '', '<div class="ah-cols">' + fit + '</div>'));

    var pc = '';
    if (s.pros) pc += '<div class="ah-col"><h3>' + E(s.pros.heading || 'Pros') + '</h3>' + list(s.pros.items, 'ah-list ah-yes') + '</div>';
    if (s.cons) pc += '<div class="ah-col"><h3>' + E(s.cons.heading || 'Cons') + '</h3>' + list(s.cons.items, 'ah-list ah-no') + '</div>';
    if (pc) out.push(section('proscons', 'Pros and cons', '<div class="ah-cols">' + pc + '</div>'));

    if (s.comparison && s.comparison.enabled && s.comparison.rows && s.comparison.rows.length) {
      var cols = s.comparison.columns || [];
      var table = '<div class="ah-table-wrap"><table class="ah-table"><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + E(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        s.comparison.rows.map(function (r) {
          return '<tr>' + (r || []).map(function (c, i) { return i === 0 ? '<th scope="row">' + E(c) + '</th>' : '<td>' + E(c) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' + (s.comparison.note ? '<p class="ah-note">' + E(s.comparison.note) + '</p>' : '');
      out.push(section('comparison', s.comparison.heading, table));
    }
    out.push(cta('afterEvaluation', ctaText, ctx));

    if (s.leadCapture && s.leadCapture.enabled) {
      var lc = s.leadCapture;
      out.push(section('leadCapture', lc.heading,
        rich(lc.body) +
        '<form class="ah-lead" data-ah-lead="' + E(lc.magnet || '') + '" novalidate>' +
        '<label for="ah-email">Email address</label>' +
        '<input id="ah-email" name="email" type="email" autocomplete="email" required>' +
        '<label class="ah-hp" aria-hidden="true">Leave empty<input name="website" tabindex="-1" autocomplete="off"></label>' +
        '<label class="ah-consent"><input type="checkbox" name="consent" required> <span>' + E(lc.consentText) + '</span></label>' +
        '<button type="submit" class="ah-btn ah-btn-secondary">' + E(lc.buttonText || 'Send it to me') + '</button>' +
        '<p class="ah-lead-msg" role="status" aria-live="polite"></p>' +
        '<p class="ah-note">See the <a href="' + E(safeHref(settings.privacyUrl)) + '">privacy policy</a> for how your email is used.</p>' +
        '</form>'));
    }

    if (s.faq && s.faq.items && s.faq.items.length) {
      out.push(section('faq', s.faq.heading || 'FAQ', s.faq.items.map(function (f) {
        return '<details class="ah-faq"><summary>' + E(f.q) + '</summary>' + rich(f.a) + '</details>';
      }).join('')));
    }

    if (s.finalCta) out.push(section('finalCta', s.finalCta.heading, rich(s.finalCta.body)));
    out.push(cta('final', (s.finalCta && s.finalCta.ctaText) || ctaText, ctx));

    var srcs = (s.sources && s.sources.items || []).filter(function (x) { return x && safeHref(x.url); });
    if (srcs.length) {
      out.push(section('sources', s.sources.heading || 'Sources', '<ul class="ah-list">' + srcs.map(function (x) {
        return '<li><a href="' + E(safeHref(x.url)) + '" rel="noopener" target="_blank">' + E(x.label || x.url) + '</a></li>';
      }).join('') + '</ul>'));
    }

    if (settings.authorName) {
      out.push('<section class="ah-author" data-ah-section="author"><h2>About the author</h2><p><strong>' + E(settings.authorName) + '</strong></p>' + rich(settings.authorBio) + '</section>');
    }
    return '<main class="ah-main" id="main">' + out.filter(Boolean).join('\n') + '</main>';
  }

  function renderFooter(settings) {
    settings = settings || {};
    var links = [];
    if (settings.privacyUrl) links.push('<a href="' + E(safeHref(settings.privacyUrl)) + '">Privacy policy</a>');
    if (settings.termsUrl) links.push('<a href="' + E(safeHref(settings.termsUrl)) + '">Terms</a>');
    if (settings.disclosureUrl) links.push('<a href="' + E(safeHref(settings.disclosureUrl)) + '">Affiliate disclosure</a>');
    if (settings.contactUrl) links.push('<a href="' + E(safeHref(settings.contactUrl)) + '">Contact</a>');
    else if (settings.contactEmail) links.push('<a href="mailto:' + E(settings.contactEmail) + '">Contact</a>');
    return '<footer class="ah-footer"><p class="ah-footer-disclosure">' + E(settings.disclosureText || '') + '</p>' +
      '<nav aria-label="Legal">' + links.join(' · ') + '</nav>' +
      '<p class="ah-footer-small">© ' + new Date().getFullYear() + ' ' + E(settings.siteName || '') + '. Analytics on this page are anonymous and first-party.</p></footer>';
  }

  var CSS = [
    ':root{--ah-fg:#1b1f24;--ah-muted:#5b6470;--ah-bg:#fff;--ah-soft:#f5f7fa;--ah-line:#e3e7ec;--ah-accent:#0b6bcb;--ah-accent-fg:#fff;--ah-yes:#1a7f37;--ah-no:#b42318}',
    '@media (prefers-color-scheme:dark){:root{--ah-fg:#e8ebef;--ah-muted:#a5adb8;--ah-bg:#111418;--ah-soft:#1a1f25;--ah-line:#2b323a;--ah-accent:#4aa3ff;--ah-accent-fg:#06131f;--ah-yes:#4cc26b;--ah-no:#ff7a6b}}',
    '*{box-sizing:border-box}body{margin:0;font:17px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ah-fg);background:var(--ah-bg)}',
    '.ah-main{max-width:760px;margin:0 auto;padding:24px 16px 48px}',
    'h1{font-size:clamp(1.7rem,4.5vw,2.4rem);line-height:1.2;margin:.2em 0 .3em}h2{font-size:1.35rem;margin:1.8em 0 .5em;line-height:1.3}h3{font-size:1.05rem;margin:.6em 0}',
    '.ah-sub{font-size:1.15rem;color:var(--ah-muted);margin:0 0 .5em}.ah-meta{font-size:.9rem;color:var(--ah-muted)}',
    '.ah-disclosure,.ah-disclaimer{background:var(--ah-soft);border-left:4px solid var(--ah-accent);padding:12px 14px;margin:16px 0;font-size:.98rem;border-radius:6px}',
    '.ah-disclaimer{border-left-color:#c27c0e}',
    '.ah-summary{font-size:1.05rem}',
    '.ah-cta{margin:24px 0;text-align:center}.ah-btn{display:inline-block;background:var(--ah-accent);color:var(--ah-accent-fg);text-decoration:none;font-weight:600;padding:14px 22px;border-radius:10px;border:0;font-size:1.02rem;cursor:pointer;min-height:48px}',
    '.ah-btn:hover,.ah-btn:focus-visible{filter:brightness(1.08)}.ah-btn:focus-visible{outline:3px solid var(--ah-fg);outline-offset:2px}',
    '.ah-cta-note{font-size:.92rem;color:var(--ah-muted);margin:.5em 0 0}',
    '.ah-cols{display:grid;gap:16px}@media(min-width:640px){.ah-cols{grid-template-columns:1fr 1fr}}',
    '.ah-col{background:var(--ah-soft);border:1px solid var(--ah-line);border-radius:10px;padding:12px 16px}',
    '.ah-list{padding-left:1.2em}.ah-yes li::marker{content:"✓  ";color:var(--ah-yes)}.ah-no li::marker{content:"✗  ";color:var(--ah-no)}',
    '.ah-table-wrap{overflow-x:auto}.ah-table{width:100%;border-collapse:collapse;font-size:.95rem}.ah-table th,.ah-table td{border:1px solid var(--ah-line);padding:8px 10px;text-align:left;vertical-align:top}.ah-table thead th{background:var(--ah-soft)}',
    '.ah-note{font-size:.9rem;color:var(--ah-muted)}',
    '.ah-faq{border:1px solid var(--ah-line);border-radius:8px;padding:10px 14px;margin:8px 0}.ah-faq summary{font-weight:600;cursor:pointer}',
    '.ah-shots{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}.ah-shots img{width:100%;height:auto;border-radius:8px;border:1px solid var(--ah-line)}',
    '.ah-lead{display:grid;gap:8px;max-width:440px}.ah-lead input[type=email]{padding:12px;font-size:1rem;border:1px solid var(--ah-line);border-radius:8px;background:var(--ah-bg);color:var(--ah-fg)}',
    '.ah-consent{display:flex;gap:8px;align-items:flex-start;font-size:.95rem}.ah-hp{position:absolute;left:-9999px}.ah-btn-secondary{background:var(--ah-fg);color:var(--ah-bg)}',
    '.ah-author{border-top:1px solid var(--ah-line);margin-top:32px;padding-top:8px}',
    '.ah-footer{border-top:1px solid var(--ah-line);padding:24px 16px;max-width:760px;margin:0 auto;font-size:.92rem;color:var(--ah-muted)}.ah-footer a{color:inherit}',
    '.ah-consent-banner{position:fixed;left:12px;right:12px;bottom:12px;background:var(--ah-soft);border:1px solid var(--ah-line);border-radius:10px;padding:12px 14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:.95rem;z-index:10}',
    '.ah-consent-banner button{padding:8px 14px;border-radius:8px;border:1px solid var(--ah-line);background:var(--ah-bg);color:var(--ah-fg);cursor:pointer}',
    'a{color:var(--ah-accent)}img{max-width:100%}'
  ].join('\n');

  /** Build the A/B config embedded in the page for the tracker. */
  function abConfig(tests) {
    return (tests || []).filter(function (t) { return t.status === 'running' && Array.isArray(t.variants) && t.variants.length >= 2; })
      .map(function (t) {
        return { id: t.id, element: t.element, variants: t.variants.map(function (v) { return { id: String(v.id), value: String(v.value || '') }; }) };
      });
  }

  /**
   * Full standalone HTML document (static export / preview).
   * ctx = { page, product, link, settings, abTests, assetBase, preview }
   */
  function renderDocument(ctx) {
    var page = ctx.page;
    var settings = ctx.settings || {};
    var seo = page.seo || {};
    var canonical = AH.seo.canonical(page, settings);
    var title = seo.title || page.title || '';
    var desc = seo.metaDescription || '';
    var assetBase = ctx.assetBase === undefined ? '../' : ctx.assetBase;
    var ab = abConfig(ctx.abTests);
    var robots = ctx.preview || seo.noindex ? 'noindex,nofollow' : 'index,follow';
    var ogImage = safeHref(seo.ogImage);
    var head = [
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + E(title) + '</title>',
      '<meta name="description" content="' + E(desc) + '">',
      '<meta name="robots" content="' + robots + '">',
      /^https?:/.test(canonical) ? '<link rel="canonical" href="' + E(canonical) + '">' : '',
      '<meta property="og:type" content="article">',
      '<meta property="og:title" content="' + E(seo.ogTitle || title) + '">',
      '<meta property="og:description" content="' + E(seo.ogDescription || desc) + '">',
      /^https?:/.test(canonical) ? '<meta property="og:url" content="' + E(canonical) + '">' : '',
      ogImage ? '<meta property="og:image" content="' + E(ogImage) + '">' : '',
      settings.siteName ? '<meta property="og:site_name" content="' + E(settings.siteName) + '">' : '',
      '<meta name="twitter:card" content="' + (ogImage ? 'summary_large_image' : 'summary') + '">',
      '<style>' + CSS + '</style>',
      '<script type="application/ld+json">' + AH.seo.jsonLd(page, ctx.product, settings) + '</script>',
      ab.length ? '<script type="application/json" id="ah-ab">' + JSON.stringify(ab).replace(/</g, '\\u003c') + '</script>' : '',
      ctx.preview ? '' : '<script src="' + E(assetBase) + 'assets/js/track.js" defer></script>'
    ].filter(Boolean).join('\n');

    var bodyAttrs = ' data-ah-page="' + E(page.id || '') + '"' +
      ' data-ah-api="' + E(ctx.preview ? '' : safeHref(settings.apiUrl)) + '"' +
      ' data-ah-dnt="' + (settings.respectDoNotTrack === false ? '0' : '1') + '"' +
      ' data-ah-consent="' + (settings.requireTrackingConsent ? '1' : '0') + '"' +
      ' data-ah-privacy="' + E(safeHref(settings.privacyUrl)) + '"';

    return '<!doctype html>\n<html lang="en">\n<head>\n' + head + '\n</head>\n<body' + bodyAttrs + '>\n' +
      renderArticle(ctx) + '\n' + renderFooter(settings) + '\n</body>\n</html>\n';
  }

  return {
    generate: generate,
    renderArticle: renderArticle,
    renderFooter: renderFooter,
    renderDocument: renderDocument,
    abConfig: abConfig,
    rich: rich,
    CSS: CSS,
    CTA_KEYS: CTA_KEYS,
    PRODUCT_TYPE_LABELS: PRODUCT_TYPE_LABELS
  };
})();

/* ---- shared/10_analytics.js ---- */
/*
 * Affiliate Campaign Hub — analytics + A/B test evaluation.
 *
 * Only aggregates recorded events. Conversions/revenue come exclusively from data the
 * user records (network reports); when absent, metrics are null — never estimated.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.analytics = (function () {
  var SOCIAL_SOURCES = /^(tiktok|instagram|ig|youtube|yt|facebook|fb|pinterest|x|twitter|threads|reddit|linkedin)$/i;

  function ratio(a, b) { return b ? a / b : null; }

  function inRange(ts, from, to) {
    var d = AH.util.dateKey(ts);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  function sourceOf(e) {
    if (e.utmSource) return String(e.utmSource).toLowerCase();
    if (e.referrer) return String(e.referrer).toLowerCase().replace(/^www\./, '');
    return 'direct';
  }

  function isSocial(source, medium) {
    if (/social|video|reel|short/i.test(medium || '')) return true;
    var host = String(source || '').replace(/^(m|l|lm|www)\./, '').split('.')[0];
    return SOCIAL_SOURCES.test(host);
  }

  function newRow(id, name, extra) {
    var r = { id: id, name: name, views: 0, clicks: 0, conversions: null, revenue: null, _sessions: {} };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }

  function finish(row) {
    row.sessions = Object.keys(row._sessions).length;
    delete row._sessions;
    row.ctr = ratio(row.clicks, row.views);
    row.conversionRate = row.conversions === null ? null : ratio(row.conversions, row.clicks);
    row.epc = row.revenue === null ? null : ratio(row.revenue, row.clicks);
    return row;
  }

  /**
   * input: { pageViews, clicks, conversions, pages, campaigns, products, from, to, filter, settings }
   */
  function summarize(input) {
    var settings = input.settings || AH.schema.DEFAULT_SETTINGS;
    var filter = input.filter || {};
    var from = input.from || '';
    var to = input.to || '';
    function match(e) {
      if (!inRange(e.ts || e.date, from, to)) return false;
      if (filter.campaignId && e.campaignId !== filter.campaignId) return false;
      if (filter.productId && e.productId !== filter.productId) return false;
      if (filter.pageId && e.pageId !== filter.pageId) return false;
      return true;
    }
    var views = (input.pageViews || []).filter(match);
    var clicks = (input.clicks || []).filter(match);
    var convs = (input.conversions || []).filter(function (c) { return match({ ts: c.date, campaignId: c.campaignId, productId: c.productId, pageId: c.pageId }); });

    var pageById = index(input.pages), campById = index(input.campaigns), prodById = index(input.products);
    var groups = { page: {}, campaign: {}, product: {}, source: {}, cta: {}, daily: {} };
    var totals = newRow('all', 'All');

    function bucket(kind, id, name, extra) {
      if (!groups[kind][id]) groups[kind][id] = newRow(id, name, extra);
      return groups[kind][id];
    }
    function rowsFor(e) {
      var out = [totals];
      if (e.pageId) { var pg = pageById[e.pageId] || {}; out.push(bucket('page', e.pageId, pg.title || e.pageId, { pageType: pg.pageType || '', campaignId: pg.campaignId || e.campaignId || '', productId: pg.productId || e.productId || '' })); }
      if (e.campaignId) out.push(bucket('campaign', e.campaignId, (campById[e.campaignId] || {}).name || e.campaignId, { productId: e.productId || '' }));
      if (e.productId) out.push(bucket('product', e.productId, (prodById[e.productId] || {}).name || e.productId));
      var src = sourceOf(e);
      out.push(bucket('source', src, src, { medium: e.utmMedium || '', social: isSocial(src, e.utmMedium) }));
      out.push(bucket('daily', AH.util.dateKey(e.ts), AH.util.dateKey(e.ts)));
      return out;
    }

    views.forEach(function (e) {
      rowsFor(e).forEach(function (r) { r.views++; if (e.sessionId) r._sessions[e.sessionId] = 1; });
    });
    clicks.forEach(function (e) {
      rowsFor(e).forEach(function (r) { r.clicks++; });
      var cta = e.ctaId || 'unknown';
      bucket('cta', cta, cta).clicks++;
    });
    convs.forEach(function (c) {
      var targets = [totals];
      if (c.pageId) targets.push(bucket('page', c.pageId, (pageById[c.pageId] || {}).title || c.pageId));
      if (c.campaignId) targets.push(bucket('campaign', c.campaignId, (campById[c.campaignId] || {}).name || c.campaignId));
      if (c.productId) targets.push(bucket('product', c.productId, (prodById[c.productId] || {}).name || c.productId));
      targets.forEach(function (r) {
        r.conversions = (r.conversions || 0) + (Number(c.count) || 0);
        r.revenue = (r.revenue || 0) + (Number(c.revenue) || 0);
      });
    });

    finish(totals);
    var out = { totals: totals, from: from, to: to, hasConversionData: convs.length > 0 };
    ['page', 'campaign', 'product', 'source', 'cta'].forEach(function (k) {
      out['by' + AH.util.capFirst(k)] = Object.keys(groups[k]).map(function (id) { return finish(groups[k][id]); })
        .sort(function (a, b) { return (b.views + b.clicks) - (a.views + a.clicks); });
    });
    out.daily = Object.keys(groups.daily).sort().map(function (d) { var r = finish(groups.daily[d]); return { date: d, views: r.views, clicks: r.clicks }; });

    classify(out.byPage, totals, settings);
    classify(out.byCampaign, totals, settings);
    out.groups = {
      best: out.byPage.filter(function (r) { return r.status === 'best'; }).concat(out.byCampaign.filter(function (r) { return r.status === 'best'; }).map(tag('campaign'))),
      attention: out.byPage.filter(function (r) { return r.status === 'attention'; }).concat(out.byCampaign.filter(function (r) { return r.status === 'attention'; }).map(tag('campaign'))),
      notEnough: out.byPage.filter(function (r) { return r.status === 'not_enough'; })
    };
    out.groups.best.forEach(function (r) { if (!r.kind) r.kind = 'page'; });
    out.groups.attention.forEach(function (r) { if (!r.kind) r.kind = 'page'; });
    out.groups.notEnough.forEach(function (r) { if (!r.kind) r.kind = 'page'; });
    return out;
  }

  function tag(kind) { return function (r) { var c = AH.util.clone(r); c.kind = kind; return c; }; }

  function index(list) {
    var o = {};
    (list || []).forEach(function (x) { o[x.id] = x; });
    return o;
  }

  /** Mark rows as best / attention / not_enough / ok, with an evidence-based reason. */
  function classify(rows, totals, settings) {
    var minViews = Number(settings.minViewsForDecision) || 100;
    var low = Number(settings.lowCtrThreshold) || 0.02;
    var qualified = rows.filter(function (r) { return r.views >= minViews; });
    var qClicks = qualified.reduce(function (a, r) { return a + r.clicks; }, 0);
    var qViews = qualified.reduce(function (a, r) { return a + r.views; }, 0);
    var avg = qViews ? qClicks / qViews : null;
    rows.forEach(function (r) {
      if (r.views < minViews) {
        r.status = 'not_enough';
        r.reason = r.views + ' of ' + minViews + ' visits needed before judging performance.';
        return;
      }
      var pct = function (x) { return (x * 100).toFixed(1) + '%'; };
      if (r.ctr < low || (qualified.length > 1 && avg !== null && r.ctr < avg * 0.6)) {
        r.status = 'attention';
        r.reason = 'Affiliate CTR ' + pct(r.ctr) + ' is below ' + (r.ctr < low ? 'your ' + pct(low) + ' threshold' : '60% of the average (' + pct(avg) + ')') + '.';
      } else if (r.conversions === 0 && r.clicks >= 100) {
        r.status = 'attention';
        r.reason = r.clicks + ' clicks but 0 recorded conversions.';
      } else if ((qualified.length > 1 && r.ctr >= Math.max(low, avg * 1.2)) || (qualified.length === 1 && r.ctr >= low * 1.5)) {
        r.status = 'best';
        r.reason = 'Affiliate CTR ' + pct(r.ctr) + (qualified.length > 1 ? ' vs ' + pct(avg) + ' average' : '') + ' on ' + r.views + ' visits.';
      } else {
        r.status = 'ok';
        r.reason = 'Affiliate CTR ' + pct(r.ctr) + ' on ' + r.views + ' visits.';
      }
    });
  }

  // ---------------------------------------------------------------- A/B tests

  function normCdf(z) {
    // Abramowitz–Stegun approximation
    var t = 1 / (1 + 0.2316419 * Math.abs(z));
    var d = 0.3989423 * Math.exp(-z * z / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  /** Split "ab_x:A|ab_y:B" → {ab_x: 'A', ab_y: 'B'} */
  function parseVariant(v) {
    var out = {};
    String(v || '').split('|').forEach(function (pair) {
      var i = pair.indexOf(':');
      if (i > 0) out[pair.slice(0, i)] = pair.slice(i + 1);
    });
    return out;
  }

  /**
   * Evaluate a test against recorded events.
   * Returns { variants:[{id,label,value,views,clicks,ctr,lift,pValue}], state, winner, message }
   * state: 'not_enough' | 'no_difference' | 'significant'
   */
  function evaluateAbTest(test, pageViews, clicks, settings) {
    var minN = Number(test.minSamplePerVariant) || Number(settings && settings.abMinSamplePerVariant) || 300;
    var variants = (test.variants || []).map(function (v) {
      return { id: String(v.id), label: v.label || ('Variant ' + v.id), value: v.value || '', views: 0, clicks: 0, ctr: null, lift: null, pValue: null };
    });
    var byId = {};
    variants.forEach(function (v) { byId[v.id] = v; });
    (pageViews || []).forEach(function (e) { var vid = parseVariant(e.variant)[test.id]; if (vid && byId[vid]) byId[vid].views++; });
    (clicks || []).forEach(function (e) { var vid = parseVariant(e.variant)[test.id]; if (vid && byId[vid]) byId[vid].clicks++; });
    variants.forEach(function (v) { v.ctr = ratio(v.clicks, v.views); });

    var res = { variants: variants, state: 'not_enough', winner: null, minSamplePerVariant: minN, message: '' };
    if (variants.length < 2) { res.message = 'Add at least two variants.'; return res; }
    var under = variants.filter(function (v) { return v.views < minN; });
    var control = variants[0];
    var comparisons = variants.length - 1;
    var alpha = 0.05 / comparisons; // Bonferroni correction for multiple variants
    var best = null;
    variants.slice(1).forEach(function (v) {
      var p1 = control.ctr || 0, p2 = v.ctr || 0;
      var pooled = (control.clicks + v.clicks) / Math.max(1, control.views + v.views);
      var se = Math.sqrt(pooled * (1 - pooled) * (1 / Math.max(1, control.views) + 1 / Math.max(1, v.views)));
      var z = se ? (p2 - p1) / se : 0;
      v.pValue = AH.util.round(2 * (1 - normCdf(Math.abs(z))), 4);
      v.lift = p1 ? AH.util.round((p2 - p1) / p1, 4) : null;
      v._z = z;
    });
    if (under.length) {
      res.message = 'Not enough data yet: every variant needs ' + minN + ' visits (lowest so far: ' + Math.min.apply(null, variants.map(function (v) { return v.views; })) + '). No winner can be declared.';
      variants.forEach(function (v) { delete v._z; });
      return res;
    }
    variants.slice(1).forEach(function (v) {
      if (v.pValue !== null && v.pValue < alpha) {
        var winnerVar = v._z > 0 ? v : control;
        if (!best || (winnerVar.ctr || 0) > (best.ctr || 0)) best = winnerVar;
      }
    });
    variants.forEach(function (v) { delete v._z; });
    if (best) {
      res.state = 'significant';
      res.winner = best.id;
      res.message = best.label + ' has a statistically significant higher CTR (' + (best.ctr * 100).toFixed(2) + '%, 95% confidence). Review it before applying.';
    } else {
      res.state = 'no_difference';
      res.message = 'No statistically significant difference yet. Keep the test running or stop it and keep the control.';
    }
    return res;
  }

  return {
    summarize: summarize,
    classify: classify,
    evaluateAbTest: evaluateAbTest,
    parseVariant: parseVariant,
    isSocial: isSocial,
    sourceOf: sourceOf
  };
})();

/* ---- shared/11_recommendations.js ---- */
/*
 * Affiliate Campaign Hub — optimisation recommendations.
 *
 * Every recommendation is derived from recorded data and carries the evidence it was
 * based on. When data is insufficient, the system says so instead of guessing.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.recommend = (function () {
  function pct(x) { return x === null || x === undefined ? '—' : (x * 100).toFixed(1) + '%'; }

  /**
   * input: { summary, products, campaigns, pages, links, emails, abResults, settings, now }
   * Returns [{ level: 'action'|'warning'|'info', title, detail, evidence, entityType, entityId }]
   */
  function build(input) {
    var out = [];
    var s = input.summary;
    var settings = input.settings || AH.schema.DEFAULT_SETTINGS;
    var minViews = Number(settings.minViewsForDecision) || 100;
    var low = Number(settings.lowCtrThreshold) || 0.02;
    var now = input.now || Date.now();
    var pages = input.pages || [];
    var campaigns = input.campaigns || [];

    // Broken / inactive links first — they waste every visit.
    (input.links || []).forEach(function (l) {
      if (l.active && l.status === 'broken') {
        out.push({ level: 'action', title: 'Fix a broken affiliate link', detail: 'The link "' + (l.label || l.url) + '" failed its last check (HTTP ' + (l.lastStatusCode || '?') + '). Replace it or deactivate it.', evidence: 'Last checked ' + (l.lastCheckedAt || 'never'), entityType: 'link', entityId: l.id });
      }
    });

    // Per-page performance
    (s && s.byPage || []).forEach(function (r) {
      if (r.status === 'not_enough') return;
      if (r.ctr !== null && r.ctr < low) {
        out.push({ level: 'action', title: 'Low affiliate CTR on "' + r.name + '"', detail: 'Your landing page receives traffic but has a low affiliate CTR. Test the headline and the first CTA (text and placement), and check that the page matches what visitors expected.', evidence: r.views + ' visits, ' + r.clicks + ' clicks, CTR ' + pct(r.ctr) + ' (threshold ' + pct(low) + ').', entityType: 'page', entityId: r.id });
      }
      if (r.conversions === 0 && r.clicks >= 100) {
        out.push({ level: 'warning', title: 'Clicks without recorded conversions', detail: 'Visitors click through but no sales are recorded. Check that you recorded conversions from your network report, then review offer-to-page alignment and the merchant\'s sales page.', evidence: r.clicks + ' clicks, 0 conversions recorded.', entityType: 'page', entityId: r.id });
      }
    });

    // Page-type comparison (only between pages with enough data)
    var typeStats = {};
    (s && s.byPage || []).filter(function (r) { return r.views >= minViews && r.pageType; }).forEach(function (r) {
      var t = typeStats[r.pageType] || (typeStats[r.pageType] = { views: 0, clicks: 0 });
      t.views += r.views; t.clicks += r.clicks;
    });
    var types = Object.keys(typeStats);
    if (types.length >= 2) {
      types.sort(function (a, b) { return typeStats[b].clicks / typeStats[b].views - typeStats[a].clicks / typeStats[a].views; });
      var top = types[0], bottom = types[types.length - 1];
      var topCtr = typeStats[top].clicks / typeStats[top].views, botCtr = typeStats[bottom].clicks / typeStats[bottom].views;
      if (botCtr > 0 ? topCtr / botCtr >= 1.5 : topCtr > 0) {
        out.push({ level: 'info', title: label(top) + ' pages outperform ' + label(bottom) + ' pages', detail: 'Your ' + label(top).toLowerCase() + ' pages generate more clicks per visit than your ' + label(bottom).toLowerCase() + ' pages. Consider creating additional ' + label(top).toLowerCase() + ' content.', evidence: label(top) + ' CTR ' + pct(topCtr) + ' vs ' + label(bottom) + ' CTR ' + pct(botCtr) + '.', entityType: '', entityId: '' });
      }
    }

    // Social traffic that does not click through
    var social = (s && s.bySource || []).filter(function (r) { return r.social; });
    var socViews = social.reduce(function (a, r) { return a + r.views; }, 0);
    var socClicks = social.reduce(function (a, r) { return a + r.clicks; }, 0);
    var nonSocViews = (s ? s.totals.views : 0) - socViews;
    var nonSocClicks = (s ? s.totals.clicks : 0) - socClicks;
    if (socViews >= minViews) {
      var socCtr = socClicks / socViews;
      var otherCtr = nonSocViews >= minViews ? nonSocClicks / nonSocViews : null;
      if (socCtr < low || (otherCtr !== null && socCtr < otherCtr * 0.6)) {
        out.push({ level: 'action', title: 'Social traffic is not converting to clicks', detail: 'Your social content generates traffic but the landing page does not convert it. Review the offer-to-page alignment: does the first screen continue the promise made in the video/post?', evidence: 'Social: ' + socViews + ' visits, CTR ' + pct(socCtr) + (otherCtr !== null ? '; other sources CTR ' + pct(otherCtr) : '') + '.', entityType: '', entityId: '' });
      }
    }

    // Campaign-level data sufficiency + staleness
    var staleMs = (Number(settings.staleCampaignDays) || 14) * 86400000;
    campaigns.filter(function (c) { return c.status === 'active'; }).forEach(function (c) {
      var row = find(s && s.byCampaign || [], c.id);
      var views = row ? row.views : 0;
      var livePages = pages.filter(function (p) { return p.campaignId === c.id && p.status === 'published'; });
      if (!livePages.length) {
        out.push({ level: 'action', title: 'Active campaign without a published page', detail: '"' + c.name + '" is active but has no published landing page. Finish, review and publish one.', evidence: 'Published pages: 0.', entityType: 'campaign', entityId: c.id });
        return;
      }
      if (views < minViews) {
        out.push({ level: 'info', title: 'Not enough data for "' + c.name + '"', detail: 'This campaign does not yet have enough data to make a decision. Focus on distribution before changing the page.', evidence: views + ' of ' + minViews + ' visits in the selected period.', entityType: 'campaign', entityId: c.id });
      }
      var updated = Date.parse(c.updatedAt || c.createdAt || '') || now;
      if (views === 0 && now - updated > staleMs) {
        out.push({ level: 'warning', title: 'Stale campaign: "' + c.name + '"', detail: 'No visits recorded in the selected period. Check that the tracking script is on the page and that you are actually distributing content.', evidence: 'Last update ' + AH.util.dateKey(c.updatedAt) + '.', entityType: 'campaign', entityId: c.id });
      }
    });

    // A/B tests
    (input.abResults || []).forEach(function (r) {
      if (r.test.status === 'running' && r.result.state === 'significant') {
        out.push({ level: 'action', title: 'A/B test has a significant result', detail: '"' + r.test.name + '": ' + r.result.message, evidence: r.result.variants.map(function (v) { return v.id + ': ' + v.views + ' visits, CTR ' + pct(v.ctr); }).join('; '), entityType: 'abtest', entityId: r.test.id });
      }
    });

    // Email: unsubscribes outpacing clicks
    (input.emails || []).forEach(function (e) {
      var clicks = Number(e.clicks) || 0, unsub = Number(e.unsubscribes) || 0;
      if (unsub >= 5 && unsub > clicks) {
        out.push({ level: 'warning', title: 'Email "' + e.subject + '" loses more subscribers than it engages', detail: 'Make it more useful and less promotional, or send it later in the sequence.', evidence: clicks + ' clicks vs ' + unsub + ' unsubscribes.', entityType: 'email', entityId: e.id });
      }
    });

    // Drafts waiting for review
    var drafts = pages.filter(function (p) { return p.status === 'draft'; });
    if (drafts.length) {
      out.push({ level: 'info', title: drafts.length + ' landing page draft(s) awaiting review', detail: 'Complete the placeholders, run the compliance check and publish when you are confident the page is genuinely useful.', evidence: drafts.slice(0, 3).map(function (p) { return p.title; }).join('; '), entityType: 'page', entityId: drafts[0].id });
    }

    if (!out.length && s && s.totals.views === 0) {
      out.push({ level: 'info', title: 'No traffic recorded yet', detail: 'There is no data to optimise yet. Publish a useful page, add the tracking script and start distributing content.', evidence: '0 visits in the selected period.', entityType: '', entityId: '' });
    }
    var order = { action: 0, warning: 1, info: 2 };
    return out.sort(function (a, b) { return order[a.level] - order[b.level]; });
  }

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function label(type) {
    return { review: 'Review', comparison: 'Comparison', problem_solution: 'Problem-solution', buyer_guide: 'Buyer-guide' }[type] || type;
  }

  return { build: build };
})();

/* ---- shared/12_api.js ---- */
/*
 * Affiliate Campaign Hub — API (action router + services).
 *
 *   var api = AH.createApi({ store: store, platform: platform });
 *   api.handle({ action: 'getProducts', token: '...', payload: {} })
 *     -> { success: true, data: ... }  |  { success: false, error: { code, message, details? } }
 *
 * `store` (storage adapter): list, get, insert, update, remove, append, withLock.
 * `platform` (runtime adapter): now, getAdminToken, hit, count, seen, logError, checkUrl?.
 *   hit(key, windowSec)   -> increments + returns the request count in the current window
 *   count(key, windowSec) -> current count without incrementing
 *   seen(key, ttlSec)     -> true if key was seen within ttl (else marks it and returns false)
 * Apps Script, the browser demo mode and the Node tests each supply their own adapters.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.ApiError = function (code, message, details) {
  this.isApiError = true;
  this.code = code;
  this.message = message;
  this.details = details;
};

AH.createApi = function (deps) {
  var store = deps.store;
  var platform = deps.platform;
  var U = AH.util;
  var S = AH.schema;
  var V = AH.validate;

  function fail(code, message, details) { throw new AH.ApiError(code, message, details); }
  function now() { return platform.now ? platform.now() : Date.now(); }
  function iso() { return U.isoNow(now()); }

  // ------------------------------------------------------------------ helpers

  function getSettings() {
    var out = U.clone(S.DEFAULT_SETTINGS);
    store.list('CONFIG').forEach(function (row) {
      if (!Object.prototype.hasOwnProperty.call(out, row.key)) return;
      try { out[row.key] = JSON.parse(row.value); } catch (e) { out[row.key] = row.value; }
    });
    return out;
  }

  function publicSettings(settings) {
    var out = {};
    S.PUBLIC_SETTINGS.forEach(function (k) { out[k] = settings[k]; });
    return out;
  }

  function requireRecord(table, id, label) {
    if (!V.isRef(id)) fail('INVALID_REQUEST', 'A valid ' + label + ' id is required.');
    var rec = store.get(table, id);
    if (!rec) fail('NOT_FOUND', label.charAt(0).toUpperCase() + label.slice(1) + ' not found.');
    return rec;
  }

  function validateOrFail(table, input, opts) {
    var res = V.record(table, input, opts);
    if (V.hasErrors(res)) fail('VALIDATION_ERROR', 'Please fix the highlighted fields.', res.errors);
    return res;
  }

  function audit(action, entity, entityId, details) {
    try {
      store.append('AUDIT_LOG', { id: U.newId('aud'), ts: iso(), action: action, entity: entity, entityId: entityId || '', details: details ? String(details).slice(0, 500) : '' });
    } catch (e) { /* auditing must never break the request */ }
  }

  function insert(table, value) {
    var rec = U.clone(value);
    rec.id = U.newId(S.tables[table].prefix);
    if (S.tables[table].fields.createdAt) rec.createdAt = iso();
    if (S.tables[table].fields.updatedAt) rec.updatedAt = rec.createdAt;
    return store.insert(table, rec);
  }

  function patch(table, rec, value) {
    var next = U.clone(rec);
    Object.keys(value).forEach(function (k) { next[k] = value[k]; });
    if (S.tables[table].fields.updatedAt) next.updatedAt = iso();
    return store.update(table, rec.id, next);
  }

  function byField(table, field, val) {
    return store.list(table).filter(function (r) { return r[field] === val; });
  }

  function requireObject(p) {
    if (!U.isObject(p)) fail('INVALID_REQUEST', 'Payload must be an object.');
    return p;
  }

  function dateParam(v, name) {
    if (v === undefined || v === null || v === '') return '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) fail('INVALID_REQUEST', name + ' must be a date in YYYY-MM-DD format.');
    return String(v);
  }

  function rescore(product) {
    var r = AH.scoring.score(product);
    product.score = r.score;
    product.scoreLabel = r.label;
    product.scoreConfidence = r.confidence;
    return r;
  }

  function withScore(p) {
    var c = U.clone(p);
    c.scoreDetails = AH.scoring.score(p);
    return c;
  }

  // ------------------------------------------------------------------ products

  function findDuplicateProduct(value, exceptId) {
    var norm = value.affiliateUrl ? V.normalizeUrl(value.affiliateUrl) : '';
    var name = String(value.name || '').toLowerCase();
    return store.list('PRODUCTS').filter(function (p) {
      if (p.id === exceptId || p.status === 'archived') return false;
      if (norm && p.affiliateUrl && V.normalizeUrl(p.affiliateUrl) === norm) return true;
      return name && p.network === value.network && String(p.name || '').toLowerCase() === name;
    })[0];
  }

  function createProduct(p) {
    var settings = getSettings();
    var input = requireObject(p);
    if (!U.cleanString(input.name) && !U.cleanString(input.affiliateUrl)) {
      fail('VALIDATION_ERROR', 'Enter at least a product name or an affiliate URL to save a draft.', { name: 'Required for drafts (or an affiliate URL).' });
    }
    if (!input.status) input.status = 'draft';
    var res = validateOrFail('PRODUCTS', input, { settings: settings });
    var value = res.value;
    value.scoreInputs = AH.scoring.cleanInputs(value.scoreInputs);
    if (!value.currency) value.currency = settings.defaultCurrency;
    if (!value.recurring) value.recurring = 'unknown';
    var dup = findDuplicateProduct(value);
    if (dup) fail('DUPLICATE', 'This offer already exists ("' + (dup.name || dup.id) + '").', { existingId: dup.id });
    return store.withLock(function () {
      rescore(value);
      var rec = insert('PRODUCTS', value);
      if (rec.affiliateUrl && rec.network) {
        insert('AFFILIATE_LINKS', { productId: rec.id, network: rec.network, url: rec.affiliateUrl, label: 'Primary link', campaignId: '', pageId: '', active: true, status: 'unchecked', notes: '' });
      }
      audit('createProduct', 'product', rec.id, rec.name);
      return { product: withScore(rec), warnings: res.warnings };
    });
  }

  function updateProduct(p) {
    var input = requireObject(p);
    var settings = getSettings();
    var rec = requireRecord('PRODUCTS', input.id, 'offer');
    var res = validateOrFail('PRODUCTS', input, { partial: true, existing: rec, settings: settings });
    var value = res.value;
    if (value.scoreInputs !== undefined) value.scoreInputs = AH.scoring.cleanInputs(value.scoreInputs);
    var urlChanged = value.affiliateUrl !== undefined && value.affiliateUrl !== rec.affiliateUrl;
    if (urlChanged) {
      var live = byField('LANDING_PAGES', 'productId', rec.id).filter(function (pg) { return pg.status === 'published'; });
      if (live.length && input.confirmOfferChange !== true) {
        fail('CONFIRMATION_REQUIRED', 'This offer has ' + live.length + ' published page(s). Confirm that you want to change the affiliate URL.', { publishedPages: live.length });
      }
    }
    var merged = U.clone(rec);
    Object.keys(value).forEach(function (k) { merged[k] = value[k]; });
    var dup = findDuplicateProduct(merged, rec.id);
    if (dup) fail('DUPLICATE', 'Another offer already uses this affiliate URL or name ("' + (dup.name || dup.id) + '").', { existingId: dup.id });
    return store.withLock(function () {
      rescore(merged);
      value.score = merged.score; value.scoreLabel = merged.scoreLabel; value.scoreConfidence = merged.scoreConfidence;
      var updated = patch('PRODUCTS', rec, value);
      if (urlChanged) {
        byField('AFFILIATE_LINKS', 'productId', rec.id).forEach(function (l) {
          if (l.url === rec.affiliateUrl) patch('AFFILIATE_LINKS', l, { url: updated.affiliateUrl, network: updated.network, status: 'unchecked' });
        });
        if (!rec.affiliateUrl && updated.affiliateUrl && updated.network) {
          insert('AFFILIATE_LINKS', { productId: rec.id, network: updated.network, url: updated.affiliateUrl, label: 'Primary link', campaignId: '', pageId: '', active: true, status: 'unchecked', notes: '' });
        }
        audit('changeAffiliateUrl', 'product', rec.id, rec.affiliateUrl + ' -> ' + updated.affiliateUrl);
      }
      audit('updateProduct', 'product', rec.id, Object.keys(value).join(','));
      return { product: withScore(updated), warnings: res.warnings };
    });
  }

  function deleteProduct(p) {
    var rec = requireRecord('PRODUCTS', requireObject(p).id, 'offer');
    var camps = byField('CAMPAIGNS', 'productId', rec.id);
    if (camps.length) fail('CONFLICT', 'This offer has ' + camps.length + ' campaign(s). Archive it instead, or delete the campaigns first.');
    return store.withLock(function () {
      byField('AFFILIATE_LINKS', 'productId', rec.id).forEach(function (l) { store.remove('AFFILIATE_LINKS', l.id); });
      store.remove('PRODUCTS', rec.id);
      audit('deleteProduct', 'product', rec.id, rec.name);
      return { deleted: rec.id };
    });
  }

  function getProducts() {
    return { products: store.list('PRODUCTS').map(withScore) };
  }

  function getProduct(p) {
    var rec = requireRecord('PRODUCTS', requireObject(p).id, 'offer');
    var settings = getSettings();
    var campaigns = byField('CAMPAIGNS', 'productId', rec.id);
    var pages = byField('LANDING_PAGES', 'productId', rec.id);
    var links = byField('AFFILIATE_LINKS', 'productId', rec.id);
    var summary = AH.analytics.summarize({
      pageViews: store.list('PAGE_VIEWS'), clicks: store.list('CLICK_EVENTS'), conversions: store.list('CONVERSIONS'),
      pages: pages, campaigns: campaigns, products: [rec], filter: { productId: rec.id }, settings: settings
    });
    var emails = byField('EMAIL_CAMPAIGNS', 'productId', rec.id);
    return {
      product: withScore(rec),
      campaigns: campaigns,
      pages: pages,
      links: links,
      content: byField('CONTENT', 'productId', rec.id),
      social: byField('SOCIAL_CONTENT', 'productId', rec.id),
      emails: emails,
      leadMagnets: AH.content.leadMagnets(rec),
      cluster: AH.content.cluster(rec),
      analytics: summary,
      recommendations: AH.recommend.build({ summary: summary, campaigns: campaigns, pages: pages, links: links, emails: emails, settings: settings, now: now() })
    };
  }

  function scoreProduct(p) {
    var input = requireObject(p);
    return updateProduct({ id: input.id, scoreInputs: input.inputs || {} });
  }

  function saveExperienceNotes(p) {
    var input = requireObject(p);
    var rec = requireRecord('PRODUCTS', input.id, 'offer');
    var n = U.isObject(input.notes) ? input.notes : {};
    var notes = {
      hasFirstHand: U.toBool(n.hasFirstHand),
      tested: U.cleanString(n.tested, 2000),
      liked: U.cleanString(n.liked, 2000),
      disliked: U.cleanString(n.disliked, 2000),
      problems: U.cleanString(n.problems, 2000),
      setupDifficulty: U.cleanString(n.setupDifficulty, 300),
      observations: U.cleanString(n.observations, 3000),
      screenshots: U.cleanString(n.screenshots, 3000),
      evidence: U.cleanString(n.evidence, 3000),
      updatedAt: iso()
    };
    if (notes.hasFirstHand && !notes.tested && !notes.observations) {
      fail('VALIDATION_ERROR', 'Describe what you tested (or your observations) to record first-hand experience.', { tested: 'Required when you mark first-hand experience.' });
    }
    var bad = lines(notes.screenshots).filter(function (s) { var u = U.parseUrl(s); return !u || u.protocol !== 'https'; });
    if (bad.length) fail('VALIDATION_ERROR', 'Screenshot links must be https URLs (one per line).', { screenshots: 'Invalid: ' + bad[0] });
    return store.withLock(function () {
      var updated = patch('PRODUCTS', rec, { experienceNotes: notes });
      audit('saveExperienceNotes', 'product', rec.id, notes.hasFirstHand ? 'first-hand' : 'no first-hand');
      return { product: withScore(updated) };
    });
  }

  function lines(t) { return String(t || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); }

  // ------------------------------------------------------------------ links

  function createLink(p) {
    var input = requireObject(p);
    var product = requireRecord('PRODUCTS', input.productId, 'offer');
    input.network = product.network;
    if (input.active === undefined) input.active = true;
    var res = validateOrFail('AFFILIATE_LINKS', input, { settings: getSettings() });
    if (res.value.campaignId) requireRecord('CAMPAIGNS', res.value.campaignId, 'campaign');
    if (res.value.pageId) requireRecord('LANDING_PAGES', res.value.pageId, 'landing page');
    return store.withLock(function () {
      res.value.status = 'unchecked';
      var rec = insert('AFFILIATE_LINKS', res.value);
      audit('createLink', 'link', rec.id, rec.url);
      return { link: rec, warnings: res.warnings };
    });
  }

  function updateLink(p) {
    var input = requireObject(p);
    var rec = requireRecord('AFFILIATE_LINKS', input.id, 'link');
    delete input.productId; // a link can't move between offers
    delete input.network;
    var res = validateOrFail('AFFILIATE_LINKS', input, { partial: true, existing: rec, settings: getSettings() });
    if (res.value.url !== undefined && res.value.url !== rec.url) {
      var live = store.list('LANDING_PAGES').filter(function (pg) { return pg.linkId === rec.id && pg.status === 'published'; });
      if (live.length && input.confirmOfferChange !== true) {
        fail('CONFIRMATION_REQUIRED', 'This link is used on ' + live.length + ' published page(s). Confirm the change.', { publishedPages: live.length });
      }
      res.value.status = 'unchecked';
    }
    return store.withLock(function () {
      var updated = patch('AFFILIATE_LINKS', rec, res.value);
      audit('updateLink', 'link', rec.id, Object.keys(res.value).join(','));
      return { link: updated, warnings: res.warnings };
    });
  }

  function deleteLink(p) {
    var rec = requireRecord('AFFILIATE_LINKS', requireObject(p).id, 'link');
    var used = store.list('LANDING_PAGES').filter(function (pg) { return pg.linkId === rec.id && pg.status !== 'archived'; });
    if (used.length) fail('CONFLICT', 'This link is used by ' + used.length + ' landing page(s). Deactivate it or switch those pages to another link first.');
    return store.withLock(function () {
      store.remove('AFFILIATE_LINKS', rec.id);
      audit('deleteLink', 'link', rec.id, rec.url);
      return { deleted: rec.id };
    });
  }

  function validateLink(p) {
    var input = requireObject(p);
    var r = V.affiliateUrl(input.url, input.network, getSettings());
    return { ok: r.ok, error: r.error, warnings: r.warnings, host: r.parsed ? r.parsed.host : '' };
  }

  function checkLinks(p) {
    var input = requireObject(p || {});
    if (typeof platform.checkUrl !== 'function') {
      fail('NOT_AVAILABLE', 'Link checks run on the Apps Script backend (browsers cannot check cross-site links). Connect the backend in Settings.');
    }
    var links = store.list('AFFILIATE_LINKS').filter(function (l) {
      return l.active && (!input.ids || input.ids.indexOf(l.id) !== -1);
    }).slice(0, 25);
    var results = links.map(function (l) {
      var r = platform.checkUrl(l.url) || {};
      var code = Number(r.code) || 0;
      var status = r.error ? 'error' : code >= 200 && code < 300 ? 'ok' : code >= 300 && code < 400 ? 'redirect' : code === 0 ? 'error' : 'broken';
      // Some merchants answer bots with 403/405/429 — that is not proof of a broken link.
      if (code === 403 || code === 405 || code === 429) status = 'error';
      return { link: l, code: code, status: status, error: r.error || '' };
    });
    store.withLock(function () {
      results.forEach(function (r) { patch('AFFILIATE_LINKS', r.link, { status: r.status, lastStatusCode: r.code, lastCheckedAt: iso() }); });
    });
    return { checked: results.map(function (r) { return { id: r.link.id, status: r.status, code: r.code, error: r.error }; }) };
  }

  // ------------------------------------------------------------------ campaigns

  function createCampaign(p) {
    var input = requireObject(p);
    var product = requireRecord('PRODUCTS', input.productId, 'offer');
    if (product.status === 'rejected' || product.status === 'archived') fail('CONFLICT', 'This offer is ' + product.status + '. Change its status before building a campaign.');
    input.name = U.cleanString(input.name) || ((product.name || 'Offer') + ' campaign');
    input.status = 'draft';
    var res = validateOrFail('CAMPAIGNS', input, {});
    res.value.plan = AH.campaign.buildPlan(product, { now: now() });
    return store.withLock(function () {
      var rec = insert('CAMPAIGNS', res.value);
      audit('createCampaign', 'campaign', rec.id, rec.name);
      return { campaign: rec };
    });
  }

  function updateCampaign(p) {
    var input = requireObject(p);
    var rec = requireRecord('CAMPAIGNS', input.id, 'campaign');
    delete input.productId;
    if (input.regeneratePlan === true) {
      input.plan = AH.campaign.buildPlan(requireRecord('PRODUCTS', rec.productId, 'offer'), { now: now() });
    }
    var res = validateOrFail('CAMPAIGNS', input, { partial: true, existing: rec });
    return store.withLock(function () {
      var updated = patch('CAMPAIGNS', rec, res.value);
      audit('updateCampaign', 'campaign', rec.id, Object.keys(res.value).join(','));
      return { campaign: updated };
    });
  }

  function deleteCampaign(p) {
    var rec = requireRecord('CAMPAIGNS', requireObject(p).id, 'campaign');
    var live = byField('LANDING_PAGES', 'campaignId', rec.id).filter(function (pg) { return pg.status === 'published'; });
    if (live.length) fail('CONFLICT', 'Unpublish this campaign\'s landing pages first.');
    return store.withLock(function () {
      ['LANDING_PAGES', 'CONTENT', 'SOCIAL_CONTENT', 'EMAIL_CAMPAIGNS'].forEach(function (t) {
        byField(t, 'campaignId', rec.id).forEach(function (r) { store.remove(t, r.id); });
      });
      store.remove('CAMPAIGNS', rec.id);
      audit('deleteCampaign', 'campaign', rec.id, rec.name);
      return { deleted: rec.id };
    });
  }

  function slimProducts() {
    return store.list('PRODUCTS').map(function (p) {
      return { id: p.id, name: p.name, network: p.network, status: p.status, score: p.score, scoreLabel: p.scoreLabel, scoreConfidence: p.scoreConfidence };
    });
  }

  function getCampaigns() {
    return { campaigns: store.list('CAMPAIGNS'), products: slimProducts(), pages: store.list('LANDING_PAGES').map(function (pg) { return { id: pg.id, campaignId: pg.campaignId, status: pg.status }; }) };
  }

  function getCampaign(p) {
    var rec = requireRecord('CAMPAIGNS', requireObject(p).id, 'campaign');
    return {
      campaign: rec,
      product: withScore(store.get('PRODUCTS', rec.productId) || {}),
      pages: byField('LANDING_PAGES', 'campaignId', rec.id),
      content: byField('CONTENT', 'campaignId', rec.id),
      social: byField('SOCIAL_CONTENT', 'campaignId', rec.id),
      emails: byField('EMAIL_CAMPAIGNS', 'campaignId', rec.id),
      links: byField('AFFILIATE_LINKS', 'productId', rec.productId)
    };
  }

  // ------------------------------------------------------------------ landing pages

  function uniqueSlug(base, exceptId) {
    var slug = U.slugify(base) || 'page';
    var taken = {};
    store.list('LANDING_PAGES').forEach(function (pg) { if (pg.id !== exceptId) taken[pg.slug] = true; });
    if (!taken[slug]) return slug;
    for (var i = 2; i < 1000; i++) if (!taken[slug + '-' + i]) return slug + '-' + i;
    return slug + '-' + U.randomString(4);
  }

  function primaryLink(productId, campaignId) {
    var links = byField('AFFILIATE_LINKS', 'productId', productId).filter(function (l) { return l.active; });
    return links.filter(function (l) { return l.campaignId === campaignId; })[0] || links.filter(function (l) { return !l.campaignId; })[0] || links[0] || null;
  }

  function generateLandingPage(p) {
    var input = requireObject(p);
    var campaign = requireRecord('CAMPAIGNS', input.campaignId, 'campaign');
    var product = requireRecord('PRODUCTS', campaign.productId, 'offer');
    var type = S.PAGE_TYPES.indexOf(input.pageType) !== -1 ? input.pageType : 'review';
    var link = primaryLink(product.id, campaign.id);
    var draft = AH.landing.generate(product, campaign, link, { pageType: type });
    draft.slug = uniqueSlug(draft.slug);
    var res = validateOrFail('LANDING_PAGES', draft, {});
    return store.withLock(function () {
      res.value.status = 'draft';
      var rec = insert('LANDING_PAGES', res.value);
      audit('generateLandingPage', 'page', rec.id, rec.slug);
      return { page: rec, check: AH.compliance.checkLandingPage(rec, product, link, getSettings()) };
    });
  }

  function pageContext(page) {
    var settings = getSettings();
    var product = store.get('PRODUCTS', page.productId) || {};
    var link = page.linkId ? store.get('AFFILIATE_LINKS', page.linkId) : null;
    return { page: page, product: product, link: link, settings: settings, abTests: byField('AB_TESTS', 'pageId', page.id) };
  }

  function abResultsFor(tests, settings) {
    if (!tests.length) return [];
    var pv = store.list('PAGE_VIEWS'), ck = store.list('CLICK_EVENTS');
    return tests.map(function (t) { return { test: t, result: AH.analytics.evaluateAbTest(t, pv, ck, settings) }; });
  }

  function getLandingPages() {
    return { pages: store.list('LANDING_PAGES'), products: slimProducts(), campaigns: store.list('CAMPAIGNS').map(function (c) { return { id: c.id, name: c.name }; }), settings: getSettings() };
  }

  function getLandingPage(p) {
    var page = requireRecord('LANDING_PAGES', requireObject(p).id, 'landing page');
    var ctx = pageContext(page);
    return {
      page: page,
      product: withScore(ctx.product),
      link: ctx.link,
      links: byField('AFFILIATE_LINKS', 'productId', page.productId),
      abTests: ctx.abTests,
      abResults: abResultsFor(ctx.abTests, ctx.settings),
      settings: ctx.settings,
      check: AH.compliance.checkLandingPage(page, ctx.product, ctx.link, ctx.settings),
      internalLinks: AH.seo.internalLinks(page, store.list('LANDING_PAGES'), store.list('PRODUCTS')),
      seoLint: AH.seo.lint(page.seo)
    };
  }

  function saveLandingPage(p) {
    var input = requireObject(p);
    var page = requireRecord('LANDING_PAGES', input.id, 'landing page');
    delete input.campaignId; delete input.productId;
    if (input.slug !== undefined) {
      var slug = U.slugify(input.slug);
      if (!slug) fail('VALIDATION_ERROR', 'Slug is required.', { slug: 'Use letters, numbers and hyphens.' });
      if (store.list('LANDING_PAGES').some(function (pg) { return pg.slug === slug && pg.id !== page.id; })) {
        fail('DUPLICATE', 'Another page already uses this slug.', { slug: 'Slug already in use.' });
      }
      input.slug = slug;
    }
    if (input.linkId) {
      var link = requireRecord('AFFILIATE_LINKS', input.linkId, 'link');
      if (link.productId !== page.productId) fail('VALIDATION_ERROR', 'That link belongs to a different offer.', { linkId: 'Choose a link for this offer.' });
    }
    if (input.seo && U.isObject(input.seo)) {
      ['canonical', 'ogImage'].forEach(function (k) {
        if (input.seo[k] && !U.parseUrl(input.seo[k])) fail('VALIDATION_ERROR', 'SEO ' + k + ' must be a full URL.', { seo: k + ' is invalid' });
      });
    }
    var res = validateOrFail('LANDING_PAGES', input, { partial: true, existing: page });
    return store.withLock(function () {
      // Editing a live page sends it back for review: publishing always needs fresh human approval.
      var wasPublished = page.status === 'published';
      if (wasPublished) { res.value.status = 'draft'; res.value.approvedAt = ''; }
      var updated = patch('LANDING_PAGES', page, res.value);
      audit('saveLandingPage', 'page', page.id, wasPublished ? 'unpublished by edit' : '');
      var ctx = pageContext(updated);
      return { page: updated, check: AH.compliance.checkLandingPage(updated, ctx.product, ctx.link, ctx.settings), unpublished: wasPublished };
    });
  }

  function checkLandingPage(p) {
    var page = requireRecord('LANDING_PAGES', requireObject(p).id, 'landing page');
    var ctx = pageContext(page);
    return { check: AH.compliance.checkLandingPage(page, ctx.product, ctx.link, ctx.settings) };
  }

  function publishLandingPage(p) {
    var input = requireObject(p);
    var page = requireRecord('LANDING_PAGES', input.id, 'landing page');
    if (input.approve !== true) fail('APPROVAL_REQUIRED', 'Publishing requires your explicit approval (approve: true) after reviewing the page.');
    var ctx = pageContext(page);
    var check = AH.compliance.checkLandingPage(page, ctx.product, ctx.link, ctx.settings);
    if (!check.ok) fail('COMPLIANCE_FAILED', 'Fix ' + check.errors.length + ' compliance issue(s) before publishing.', { errors: check.errors });
    return store.withLock(function () {
      var t = iso();
      var updated = patch('LANDING_PAGES', page, { status: 'published', approvedAt: t, publishedAt: page.publishedAt || t });
      audit('publishLandingPage', 'page', page.id, page.slug);
      return { page: updated, check: check };
    });
  }

  function unpublishLandingPage(p) {
    var page = requireRecord('LANDING_PAGES', requireObject(p).id, 'landing page');
    return store.withLock(function () {
      var updated = patch('LANDING_PAGES', page, { status: requireObject(p).archive === true ? 'archived' : 'draft' });
      audit('unpublishLandingPage', 'page', page.id, updated.status);
      return { page: updated };
    });
  }

  function deleteLandingPage(p) {
    var page = requireRecord('LANDING_PAGES', requireObject(p).id, 'landing page');
    if (page.status === 'published') fail('CONFLICT', 'Unpublish the page before deleting it.');
    return store.withLock(function () {
      byField('AB_TESTS', 'pageId', page.id).forEach(function (t) { store.remove('AB_TESTS', t.id); });
      store.remove('LANDING_PAGES', page.id);
      audit('deleteLandingPage', 'page', page.id, page.slug);
      return { deleted: page.id };
    });
  }

  function exportLandingPage(p) {
    var page = requireRecord('LANDING_PAGES', requireObject(p).id, 'landing page');
    var ctx = pageContext(page);
    ctx.preview = page.status !== 'published';
    return { filename: page.slug + '.html', html: AH.landing.renderDocument(ctx), published: page.status === 'published' };
  }

  function getSitemap() {
    var settings = getSettings();
    return { xml: AH.seo.sitemap(store.list('LANDING_PAGES'), settings, ['/']), robots: AH.seo.robots(settings) };
  }

  // ------------------------------------------------------------------ content / social / email

  function campaignAndProduct(campaignId) {
    var campaign = requireRecord('CAMPAIGNS', campaignId, 'campaign');
    return { campaign: campaign, product: requireRecord('PRODUCTS', campaign.productId, 'offer') };
  }

  function createContentPlan(p) {
    var cp = campaignAndProduct(requireObject(p).campaignId);
    var existing = {};
    byField('CONTENT', 'campaignId', cp.campaign.id).forEach(function (c) { existing[c.type] = c; });
    return store.withLock(function () {
      var created = [];
      AH.content.ideas(cp.product).forEach(function (idea) {
        if (existing[idea.type]) return;
        created.push(insert('CONTENT', {
          campaignId: cp.campaign.id, productId: cp.product.id, type: idea.type, title: idea.title, intent: idea.intentLabel,
          clusterRole: idea.clusterRole, outline: { sections: idea.outline, internalLinks: idea.internalLinks }, seo: idea.seo,
          requiresFirstHand: idea.requiresFirstHand, locked: idea.locked, status: 'idea', notes: ''
        }));
      });
      audit('createContentPlan', 'campaign', cp.campaign.id, created.length + ' items');
      return { created: created, items: byField('CONTENT', 'campaignId', cp.campaign.id), cluster: AH.content.cluster(cp.product) };
    });
  }

  function getContentPlan(p) {
    var input = p || {};
    var items = input.campaignId ? byField('CONTENT', 'campaignId', input.campaignId) : store.list('CONTENT');
    return { items: items };
  }

  function genericUpdate(table, label, extraCheck) {
    return function (p) {
      var input = requireObject(p);
      var rec = requireRecord(table, input.id, label);
      delete input.campaignId; delete input.productId;
      var res = validateOrFail(table, input, { partial: true, existing: rec });
      if (extraCheck) extraCheck(rec, res.value);
      return store.withLock(function () {
        var updated = patch(table, rec, res.value);
        audit('update' + table, label, rec.id, Object.keys(res.value).join(','));
        return { item: updated };
      });
    };
  }

  function genericDelete(table, label) {
    return function (p) {
      var rec = requireRecord(table, requireObject(p).id, label);
      return store.withLock(function () {
        store.remove(table, rec.id);
        audit('delete' + table, label, rec.id, '');
        return { deleted: rec.id };
      });
    };
  }

  function contentUnlockCheck(rec, value) {
    if (rec.locked && value.status && value.status !== 'idea' && value.status !== 'rejected') {
      var product = store.get('PRODUCTS', rec.productId) || {};
      var ev = product.experienceNotes && product.experienceNotes.evidence;
      if (!ev) fail('CONFLICT', 'Case studies stay locked until you record real supporting evidence in Experience Notes.');
    }
  }

  function approvalCheck(rec, value) {
    // Drafts containing first-hand claims or placeholders cannot be approved.
    if (value.status !== 'approved') return;
    var merged = U.clone(rec);
    Object.keys(value).forEach(function (k) { merged[k] = value[k]; });
    var text = [merged.hook, merged.value, merged.caption, merged.subject, merged.body].join('\n');
    var product = store.get('PRODUCTS', rec.productId) || {};
    var ph = AH.compliance.findPlaceholders(text);
    if (ph.length) fail('VALIDATION_ERROR', 'Fill in the placeholders before approving: ' + ph.slice(0, 3).join(', '), { status: 'Placeholders remain.' });
    var issues = AH.compliance.scanText(text, { hasExperience: AH.compliance.hasExperience(product) }).filter(function (i) { return i.level === 'error'; });
    if (issues.length) fail('COMPLIANCE_FAILED', issues[0].message, { errors: issues });
  }

  function createSocialDraft(p) {
    var input = requireObject(p);
    var cp = campaignAndProduct(input.campaignId);
    var angles = Array.isArray(input.angles) ? input.angles.filter(function (a) { return S.SOCIAL_ANGLES.indexOf(a) !== -1; }) : null;
    var existing = {};
    byField('SOCIAL_CONTENT', 'campaignId', cp.campaign.id).forEach(function (s) { existing[s.angle] = true; });
    return store.withLock(function () {
      var created = AH.content.socialDrafts(cp.product, angles).filter(function (d) { return input.allowDuplicates === true || !existing[d.angle]; }).map(function (d) {
        d.campaignId = cp.campaign.id; d.productId = cp.product.id;
        return insert('SOCIAL_CONTENT', validateOrFail('SOCIAL_CONTENT', d, {}).value);
      });
      audit('createSocialDraft', 'campaign', cp.campaign.id, created.length + ' drafts');
      return { created: created, items: byField('SOCIAL_CONTENT', 'campaignId', cp.campaign.id) };
    });
  }

  function getSocialContent(p) {
    var input = p || {};
    return { items: input.campaignId ? byField('SOCIAL_CONTENT', 'campaignId', input.campaignId) : store.list('SOCIAL_CONTENT') };
  }

  function createEmailDraft(p) {
    var input = requireObject(p);
    var cp = campaignAndProduct(input.campaignId);
    var existing = byField('EMAIL_CAMPAIGNS', 'campaignId', cp.campaign.id);
    if (existing.length && input.replace !== true) {
      return { created: [], items: existing, leadMagnets: AH.content.leadMagnets(cp.product), message: 'A sequence already exists for this campaign.' };
    }
    var magnet = U.cleanString(input.leadMagnet, 200);
    return store.withLock(function () {
      if (input.replace === true) existing.forEach(function (e) { store.remove('EMAIL_CAMPAIGNS', e.id); });
      var created = AH.content.emailSequence(cp.product, { leadMagnet: magnet }).map(function (e) {
        e.campaignId = cp.campaign.id; e.productId = cp.product.id;
        return insert('EMAIL_CAMPAIGNS', validateOrFail('EMAIL_CAMPAIGNS', e, {}).value);
      });
      audit('createEmailDraft', 'campaign', cp.campaign.id, created.length + ' emails');
      return { created: created, items: byField('EMAIL_CAMPAIGNS', 'campaignId', cp.campaign.id), leadMagnets: AH.content.leadMagnets(cp.product) };
    });
  }

  function getEmailCampaigns(p) {
    var input = p || {};
    return { items: input.campaignId ? byField('EMAIL_CAMPAIGNS', 'campaignId', input.campaignId) : store.list('EMAIL_CAMPAIGNS') };
  }

  // ------------------------------------------------------------------ analytics & conversions

  function analyticsBundle(input) {
    var settings = getSettings();
    var from = dateParam(input.from, 'from');
    var to = dateParam(input.to, 'to');
    var filter = {};
    ['campaignId', 'productId', 'pageId'].forEach(function (k) { if (input[k]) { if (!V.isRef(input[k])) fail('INVALID_REQUEST', k + ' is invalid.'); filter[k] = input[k]; } });
    var pageViews = store.list('PAGE_VIEWS');
    var clicks = store.list('CLICK_EVENTS');
    var pages = store.list('LANDING_PAGES');
    var campaigns = store.list('CAMPAIGNS');
    var products = store.list('PRODUCTS');
    var links = store.list('AFFILIATE_LINKS');
    var summary = AH.analytics.summarize({ pageViews: pageViews, clicks: clicks, conversions: store.list('CONVERSIONS'), pages: pages, campaigns: campaigns, products: products, from: from, to: to, filter: filter, settings: settings });
    var inRange = function (e) { var d = U.dateKey(e.ts); return (!from || d >= from) && (!to || d <= to); };
    var abResults = store.list('AB_TESTS').filter(function (t) { return t.status !== 'draft'; }).map(function (t) {
      return { test: t, result: AH.analytics.evaluateAbTest(t, pageViews.filter(inRange), clicks.filter(inRange), settings) };
    });
    var recs = AH.recommend.build({ summary: summary, products: products, campaigns: campaigns, pages: pages, links: links, emails: store.list('EMAIL_CAMPAIGNS'), abResults: abResults, settings: settings, now: now() });
    return { settings: settings, summary: summary, abResults: abResults, recommendations: recs, products: products, campaigns: campaigns, pages: pages, links: links };
  }

  function getAnalytics(p) {
    var b = analyticsBundle(requireObject(p || {}));
    return { summary: b.summary, abResults: b.abResults, recommendations: b.recommendations, conversions: store.list('CONVERSIONS') };
  }

  function getDashboard(p) {
    var b = analyticsBundle(requireObject(p || {}));
    var products = b.products.map(withScore);
    return {
      settings: b.settings,
      counts: {
        offers: products.filter(function (x) { return x.status !== 'archived'; }).length,
        activeCampaigns: b.campaigns.filter(function (c) { return c.status === 'active'; }).length,
        campaigns: b.campaigns.length,
        publishedPages: b.pages.filter(function (pg) { return pg.status === 'published'; }).length,
        draftPages: b.pages.filter(function (pg) { return pg.status === 'draft'; }).length,
        brokenLinks: b.links.filter(function (l) { return l.active && l.status === 'broken'; }).length,
        leads: store.list('LEADS').filter(function (l) { return l.status === 'subscribed'; }).length
      },
      summary: b.summary,
      recommendations: b.recommendations,
      abResults: b.abResults,
      products: products,
      campaigns: b.campaigns,
      pages: b.pages,
      links: b.links
    };
  }

  function recordConversion(p) {
    var input = requireObject(p);
    var res = validateOrFail('CONVERSIONS', input, {});
    if (!/^\d{4}-\d{2}-\d{2}$/.test(res.value.date)) fail('VALIDATION_ERROR', 'Date must be YYYY-MM-DD.', { date: 'Use YYYY-MM-DD.' });
    requireRecord('PRODUCTS', res.value.productId, 'offer');
    if (res.value.campaignId) requireRecord('CAMPAIGNS', res.value.campaignId, 'campaign');
    if (res.value.pageId) requireRecord('LANDING_PAGES', res.value.pageId, 'landing page');
    if (!res.value.source) res.value.source = 'network report';
    return store.withLock(function () {
      var rec = insert('CONVERSIONS', res.value);
      audit('recordConversion', 'conversion', rec.id, rec.count + ' / ' + rec.revenue);
      return { conversion: rec };
    });
  }

  // ------------------------------------------------------------------ A/B tests

  var TEXT_ELEMENTS = ['headline', 'cta_text'];

  function cleanVariants(element, variants) {
    if (!Array.isArray(variants) || variants.length < 2 || variants.length > 4) fail('VALIDATION_ERROR', 'Provide 2–4 variants.', { variants: '2–4 variants required.' });
    var ids = ['A', 'B', 'C', 'D'];
    return variants.map(function (v, i) {
      v = U.isObject(v) ? v : {};
      var value = U.cleanString(v.value, 300);
      if (TEXT_ELEMENTS.indexOf(element) !== -1) {
        if (!value) fail('VALIDATION_ERROR', 'Every variant needs text.', { variants: 'Variant ' + ids[i] + ' is empty.' });
        var issues = AH.compliance.scanText(value, { hasExperience: false }).filter(function (x) { return x.level === 'error'; });
        if (issues.length) fail('COMPLIANCE_FAILED', 'Variant ' + ids[i] + ': ' + issues[0].message, { errors: issues });
      } else if (element === 'cta_placement') {
        value = value.split(/[\s,]+/).filter(function (k) { return AH.landing.CTA_KEYS.indexOf(k) !== -1; }).join(',');
        if (!value) fail('VALIDATION_ERROR', 'CTA placement variants list the CTAs to show: ' + AH.landing.CTA_KEYS.join(', '), { variants: 'Variant ' + ids[i] + ' is invalid.' });
      } else {
        value = value.replace(/^hide:/, '').split(/[\s,]+/).filter(function (k) { return /^[a-zA-Z]{2,30}$/.test(k); }).join(',');
        value = value ? 'hide:' + value : '';
      }
      return { id: ids[i], label: U.cleanString(v.label, 60) || (i === 0 ? 'Control' : 'Variant ' + ids[i]), value: value };
    });
  }

  function createAbTest(p) {
    var input = requireObject(p);
    var page = requireRecord('LANDING_PAGES', input.pageId, 'landing page');
    input.campaignId = page.campaignId;
    input.status = 'draft';
    var res = validateOrFail('AB_TESTS', input, { settings: getSettings() });
    res.value.variants = cleanVariants(res.value.element, input.variants);
    if (!res.value.minSamplePerVariant) res.value.minSamplePerVariant = getSettings().abMinSamplePerVariant;
    return store.withLock(function () {
      var rec = insert('AB_TESTS', res.value);
      audit('createAbTest', 'abtest', rec.id, rec.name);
      return { test: rec };
    });
  }

  function getAbTests(p) {
    var input = p || {};
    var settings = getSettings();
    var tests = input.pageId ? byField('AB_TESTS', 'pageId', input.pageId) : store.list('AB_TESTS');
    var pv = store.list('PAGE_VIEWS'), ck = store.list('CLICK_EVENTS');
    return { tests: tests.map(function (t) { return { test: t, result: AH.analytics.evaluateAbTest(t, pv, ck, settings) }; }) };
  }

  function updateAbTest(p) {
    var input = requireObject(p);
    var test = requireRecord('AB_TESTS', input.id, 'A/B test');
    var value = {};
    if (input.name !== undefined) value.name = U.cleanString(input.name, 160);
    if (input.hypothesis !== undefined) value.hypothesis = U.cleanString(input.hypothesis, 1000);
    if (input.variants !== undefined) {
      if (test.status !== 'draft') fail('CONFLICT', 'Variants can only be changed while the test is a draft.');
      value.variants = cleanVariants(test.element, input.variants);
    }
    var pageUpdate = null;
    if (input.status !== undefined && input.status !== test.status) {
      var allowed = { draft: ['running'], running: ['stopped', 'completed'], stopped: ['running', 'completed'], completed: [] };
      if ((allowed[test.status] || []).indexOf(input.status) === -1) fail('CONFLICT', 'Cannot change a ' + test.status + ' test to ' + input.status + '.');
      if (input.status === 'running') {
        var clash = byField('AB_TESTS', 'pageId', test.pageId).filter(function (t) { return t.id !== test.id && t.status === 'running' && t.element === test.element; });
        if (clash.length) fail('CONFLICT', 'Another test on this page is already testing the ' + test.element + '.');
        value.startedAt = test.startedAt || iso();
      }
      if (input.status === 'completed') {
        var settings = getSettings();
        var result = AH.analytics.evaluateAbTest(test, store.list('PAGE_VIEWS'), store.list('CLICK_EVENTS'), settings);
        var winner = U.cleanString(input.winner, 4);
        if (winner && winner !== 'A') {
          if (result.state !== 'significant' || result.winner !== winner) {
            fail('NOT_ENOUGH_DATA', 'Variant ' + winner + ' is not a statistically significant winner. ' + result.message);
          }
          var variant = (test.variants || []).filter(function (v) { return v.id === winner; })[0];
          if (variant && TEXT_ELEMENTS.indexOf(test.element) !== -1 && input.applyWinner === true) pageUpdate = { element: test.element, value: variant.value };
        }
        value.winner = winner || 'A';
        value.endedAt = iso();
      }
      if (input.status === 'stopped') value.endedAt = iso();
      value.status = input.status;
    }
    return store.withLock(function () {
      var updated = patch('AB_TESTS', test, value);
      if (pageUpdate) {
        var page = store.get('LANDING_PAGES', test.pageId);
        if (page) {
          var sections = U.clone(page.sections || {});
          if (pageUpdate.element === 'headline') { sections.hero = sections.hero || {}; sections.hero.headline = pageUpdate.value; }
          if (pageUpdate.element === 'cta_text') { sections.ctaText = pageUpdate.value; if (sections.hero) sections.hero.ctaText = pageUpdate.value; }
          patch('LANDING_PAGES', page, { sections: sections });
        }
      }
      audit('updateAbTest', 'abtest', test.id, JSON.stringify(value).slice(0, 200));
      return { test: updated, appliedToPage: !!pageUpdate };
    });
  }

  // ------------------------------------------------------------------ leads, settings, audit

  function getLeads() {
    return { leads: store.list('LEADS') };
  }

  function updateLead(p) {
    var input = requireObject(p);
    var lead = requireRecord('LEADS', input.id, 'lead');
    if (['subscribed', 'unsubscribed'].indexOf(input.status) === -1) fail('VALIDATION_ERROR', 'Status must be subscribed or unsubscribed.', { status: 'Invalid' });
    if (input.status === 'subscribed' && lead.status === 'unsubscribed') fail('CONFLICT', 'You cannot re-subscribe someone who unsubscribed. They must sign up again themselves.');
    return store.withLock(function () {
      var updated = patch('LEADS', lead, { status: input.status });
      audit('updateLead', 'lead', lead.id, input.status);
      return { lead: updated };
    });
  }

  function getSettingsAction() {
    return { settings: getSettings(), defaults: S.DEFAULT_SETTINGS };
  }

  function saveSettings(p) {
    var res = V.settings(requireObject(p));
    if (Object.keys(res.errors).length) fail('VALIDATION_ERROR', 'Please fix the highlighted settings.', res.errors);
    return store.withLock(function () {
      Object.keys(res.value).forEach(function (k) {
        var row = { key: k, value: JSON.stringify(res.value[k]), updatedAt: iso() };
        if (store.get('CONFIG', k)) store.update('CONFIG', k, row); else store.insert('CONFIG', row);
      });
      audit('saveSettings', 'settings', '', Object.keys(res.value).join(','));
      return { settings: getSettings() };
    });
  }

  function getAuditLog(p) {
    var limit = Math.min(500, Math.max(1, Number((p || {}).limit) || 100));
    return { entries: U.sortBy(store.list('AUDIT_LOG'), function (e) { return e.ts; }, true).slice(0, limit) };
  }

  function exportData() {
    var out = {};
    Object.keys(S.tables).forEach(function (t) { if (t !== 'ERROR_LOG') out[t] = store.list(t); });
    return { exportedAt: iso(), tables: out };
  }

  // ------------------------------------------------------------------ public tracking endpoints

  var SESSION_RE = /^[a-z0-9]{8,40}$/i;
  var VARIANT_RE = /^(ab_[a-z0-9_]{1,40}:[A-D])(\|ab_[a-z0-9_]{1,40}:[A-D]){0,5}$/;

  /** Fixed-window limiter: platform.hit() increments and returns the count for the current window. */
  function allow(key, limit, windowSec) {
    return platform.hit(key, windowSec) <= limit;
  }

  function rateLimitPublic(sessionId) {
    if (!allow('pub:all', 3000, 60)) fail('RATE_LIMITED', 'Too many requests. Please try again shortly.');
    if (sessionId && !allow('pub:s:' + sessionId, 120, 600)) fail('RATE_LIMITED', 'Too many requests. Please try again shortly.');
  }

  function trackingFields(input) {
    var utm = U.isObject(input.utm) ? input.utm : {};
    var ref = U.parseUrl(input.referrer);
    var variant = U.cleanString(input.variant, 300);
    return {
      sessionId: SESSION_RE.test(String(input.sessionId || '')) ? String(input.sessionId) : '',
      // Store only the referring host — never full URLs (they can contain personal data).
      referrer: ref ? ref.host : '',
      variant: VARIANT_RE.test(variant) ? variant : '',
      utmSource: U.cleanString(utm.source, 100).toLowerCase(),
      utmMedium: U.cleanString(utm.medium, 100).toLowerCase(),
      utmCampaign: U.cleanString(utm.campaign, 100),
      utmContent: U.cleanString(utm.content, 100),
      utmTerm: U.cleanString(utm.term, 100)
    };
  }

  function recordPageView(p) {
    var input = requireObject(p);
    if (!V.isRef(input.pageId)) fail('INVALID_REQUEST', 'pageId is required.');
    var f = trackingFields(input);
    rateLimitPublic(f.sessionId);
    var page = store.get('LANDING_PAGES', input.pageId);
    if (!page || page.status !== 'published') return { recorded: false };
    if (f.sessionId && platform.seen('pv:' + f.sessionId + ':' + page.id, 10)) return { recorded: false, duplicate: true };
    var path = U.cleanString(input.path, 200).split('?')[0].split('#')[0];
    f.id = U.newId('pv'); f.ts = iso(); f.pageId = page.id; f.campaignId = page.campaignId; f.productId = page.productId; f.path = path;
    store.append('PAGE_VIEWS', f);
    return { recorded: true };
  }

  function recordAffiliateClick(p) {
    var input = requireObject(p);
    if (!V.isRef(input.linkId)) fail('INVALID_REQUEST', 'linkId is required.');
    var f = trackingFields(input);
    rateLimitPublic(f.sessionId);
    var link = store.get('AFFILIATE_LINKS', input.linkId);
    if (!link || !link.active) return { recorded: false };
    var page = V.isRef(input.pageId) ? store.get('LANDING_PAGES', input.pageId) : null;
    if (page && (page.status !== 'published' || page.productId !== link.productId)) return { recorded: false };
    var cta = AH.landing.CTA_KEYS.indexOf(input.ctaId) !== -1 ? input.ctaId : 'other';
    if (f.sessionId && platform.seen('ck:' + f.sessionId + ':' + link.id + ':' + cta, 5)) return { recorded: false, duplicate: true };
    f.id = U.newId('clk'); f.ts = iso(); f.linkId = link.id; f.productId = link.productId; f.pageId = page ? page.id : '';
    f.campaignId = page ? page.campaignId : (link.campaignId || ''); f.ctaId = cta;
    store.append('CLICK_EVENTS', f);
    return { recorded: true };
  }

  function recordLead(p) {
    var input = requireObject(p);
    if (U.cleanString(input.website)) return { recorded: true }; // honeypot: silently drop bots
    var f = trackingFields(input);
    rateLimitPublic(f.sessionId);
    if (input.consent !== true) fail('VALIDATION_ERROR', 'Please tick the consent box to receive emails.', { consent: 'Consent is required.' });
    var email = U.cleanString(input.email, 254).toLowerCase();
    if (!U.isEmail(email)) fail('VALIDATION_ERROR', 'Please enter a valid email address.', { email: 'Invalid email.' });
    if (!allow('lead:' + email, 3, 3600)) fail('RATE_LIMITED', 'Too many requests. Please try again later.');
    var page = V.isRef(input.pageId) ? store.get('LANDING_PAGES', input.pageId) : null;
    if (!page || page.status !== 'published' || !(page.sections && page.sections.leadCapture && page.sections.leadCapture.enabled)) {
      fail('INVALID_REQUEST', 'Sign-up is not available on this page.');
    }
    var existing = store.list('LEADS').filter(function (l) { return l.email === email && l.status === 'subscribed'; })[0];
    if (existing) return { recorded: true };
    store.withLock(function () {
      insert('LEADS', {
        ts: iso(), email: email, consent: true, consentText: U.cleanString(page.sections.leadCapture.consentText, 500),
        pageId: page.id, campaignId: page.campaignId, leadMagnet: U.cleanString(page.sections.leadCapture.magnet, 200), status: 'subscribed'
      });
    });
    return { recorded: true };
  }

  function getPublicLandingPage(p) {
    var input = requireObject(p);
    var slug = U.slugify(input.slug);
    if (!slug) fail('INVALID_REQUEST', 'slug is required.');
    var page = store.list('LANDING_PAGES').filter(function (pg) { return pg.slug === slug && pg.status === 'published'; })[0];
    if (!page) fail('NOT_FOUND', 'Page not found.');
    var ctx = pageContext(page);
    var link = ctx.link && ctx.link.active ? { id: ctx.link.id, url: ctx.link.url } : null;
    return {
      page: { id: page.id, slug: page.slug, title: page.title, pageType: page.pageType, sections: page.sections, seo: page.seo, status: page.status, updatedAt: page.updatedAt, publishedAt: page.publishedAt },
      product: { id: ctx.product.id, name: ctx.product.name, network: ctx.product.network },
      link: link,
      settings: publicSettings(ctx.settings),
      abTests: AH.landing.abConfig(ctx.abTests)
    };
  }

  function getPublicPages() {
    var pages = store.list('LANDING_PAGES').filter(function (pg) { return pg.status === 'published' && !(pg.seo && pg.seo.noindex); });
    return {
      pages: U.sortBy(pages, function (pg) { return pg.publishedAt || ''; }, true).slice(0, 100).map(function (pg) {
        return { slug: pg.slug, title: pg.title, description: (pg.seo && pg.seo.metaDescription) || '', pageType: pg.pageType, updatedAt: pg.updatedAt };
      }),
      settings: publicSettings(getSettings())
    };
  }

  function ping() {
    return { ok: true, time: iso(), version: AH.VERSION };
  }

  // ------------------------------------------------------------------ router

  var PUBLIC = {
    ping: ping,
    recordPageView: recordPageView,
    recordAffiliateClick: recordAffiliateClick,
    recordLead: recordLead,
    getPublicLandingPage: getPublicLandingPage,
    getPublicPages: getPublicPages
  };

  var ADMIN = {
    verifyToken: function () { return { ok: true }; },
    getDashboard: getDashboard,
    getProducts: getProducts,
    getProduct: getProduct,
    createProduct: createProduct,
    updateProduct: updateProduct,
    deleteProduct: deleteProduct,
    scoreProduct: scoreProduct,
    saveExperienceNotes: saveExperienceNotes,
    getLinks: function () { return { links: store.list('AFFILIATE_LINKS') }; },
    createLink: createLink,
    updateLink: updateLink,
    deleteLink: deleteLink,
    validateLink: validateLink,
    checkLinks: checkLinks,
    getCampaigns: getCampaigns,
    getCampaign: getCampaign,
    createCampaign: createCampaign,
    updateCampaign: updateCampaign,
    deleteCampaign: deleteCampaign,
    getLandingPages: getLandingPages,
    getLandingPage: getLandingPage,
    generateLandingPage: generateLandingPage,
    saveLandingPage: saveLandingPage,
    checkLandingPage: checkLandingPage,
    publishLandingPage: publishLandingPage,
    unpublishLandingPage: unpublishLandingPage,
    deleteLandingPage: deleteLandingPage,
    exportLandingPage: exportLandingPage,
    getSitemap: getSitemap,
    createContentPlan: createContentPlan,
    getContentPlan: getContentPlan,
    updateContentItem: genericUpdate('CONTENT', 'content item', contentUnlockCheck),
    deleteContentItem: genericDelete('CONTENT', 'content item'),
    createSocialDraft: createSocialDraft,
    getSocialContent: getSocialContent,
    updateSocialDraft: genericUpdate('SOCIAL_CONTENT', 'social draft', approvalCheck),
    deleteSocialDraft: genericDelete('SOCIAL_CONTENT', 'social draft'),
    createEmailDraft: createEmailDraft,
    getEmailCampaigns: getEmailCampaigns,
    updateEmailDraft: genericUpdate('EMAIL_CAMPAIGNS', 'email', approvalCheck),
    deleteEmailDraft: genericDelete('EMAIL_CAMPAIGNS', 'email'),
    getAnalytics: getAnalytics,
    recordConversion: recordConversion,
    deleteConversion: genericDelete('CONVERSIONS', 'conversion'),
    createAbTest: createAbTest,
    getAbTests: getAbTests,
    updateAbTest: updateAbTest,
    deleteAbTest: genericDelete('AB_TESTS', 'A/B test'),
    getLeads: getLeads,
    updateLead: updateLead,
    deleteLead: genericDelete('LEADS', 'lead'),
    getSettings: getSettingsAction,
    saveSettings: saveSettings,
    getAuditLog: getAuditLog,
    exportData: exportData
  };

  function authorize(token) {
    var expected = platform.getAdminToken();
    if (!expected) fail('NOT_CONFIGURED', 'The admin token is not configured on the server. Run setup() in Apps Script.');
    if (platform.count('auth:fail', 600) >= 30) fail('RATE_LIMITED', 'Too many failed sign-in attempts. Wait 10 minutes.');
    if (!U.safeEqual(token, expected)) {
      platform.hit('auth:fail', 600);
      fail('UNAUTHORIZED', 'Invalid or missing admin token.');
    }
  }

  function ok(data) {
    var res = { success: true, data: data };
    if (data && data.warnings && data.warnings.length) res.warnings = data.warnings;
    return res;
  }

  function errorResponse(code, message, details) {
    var e = { code: code, message: message };
    if (details !== undefined) e.details = details;
    return { success: false, error: e };
  }

  function handle(req) {
    var action = '';
    try {
      if (!U.isObject(req)) return errorResponse('INVALID_REQUEST', 'Request body must be a JSON object.');
      action = typeof req.action === 'string' ? req.action : '';
      if (!action) return errorResponse('INVALID_REQUEST', 'Missing "action".');
      var payload = req.payload === undefined ? {} : req.payload;
      if (!U.isObject(payload)) return errorResponse('INVALID_REQUEST', '"payload" must be an object.');
      if (Object.prototype.hasOwnProperty.call(PUBLIC, action)) return ok(PUBLIC[action](payload));
      if (Object.prototype.hasOwnProperty.call(ADMIN, action)) {
        authorize(req.token);
        return ok(ADMIN[action](payload));
      }
      return errorResponse('UNKNOWN_ACTION', 'Unknown action.');
    } catch (e) {
      if (e && e.isApiError) return errorResponse(e.code, e.message, e.details);
      // Never leak internals to callers; log privately.
      try { platform.logError(e, { action: action }); } catch (ignored) { /* nothing else we can do */ }
      return errorResponse('INTERNAL_ERROR', 'Something went wrong. The error has been logged.');
    }
  }

  return { handle: handle, getSettings: getSettings, PUBLIC_ACTIONS: Object.keys(PUBLIC), ADMIN_ACTIONS: Object.keys(ADMIN) };
};

AH.VERSION = '1.0.0';

/* ---- apps-script/Automation.js ---- */
/**
 * Administrative automation only. Nothing here publishes content, posts to social
 * networks, emails subscribers or changes offers — those always need human approval.
 *
 *   installTriggers()    daily link check + weekly summary to the owner
 *   removeTriggers()     remove them again
 *   runLinkCheck()       check active affiliate links, email the owner about broken ones
 *   sendWeeklySummary()  analytics summary, stale campaigns and recommendations
 */

var TRIGGER_HANDLERS_ = ['runLinkCheck', 'sendWeeklySummary'];

function installTriggers() {
  removeTriggers();
  ScriptApp.newTrigger('runLinkCheck').timeBased().everyDays(1).atHour(6).create();
  ScriptApp.newTrigger('sendWeeklySummary').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();
  Logger.log('Installed triggers: daily link check (06:00), weekly summary (Mon 07:00).');
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (TRIGGER_HANDLERS_.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
}

function adminCall_(action, payload) {
  var token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  return getApi_().handle({ action: action, token: token, payload: payload || {} });
}

function ownerEmail_(settings) {
  return (settings && settings.alertEmail) || Session.getEffectiveUser().getEmail();
}

function runLinkCheck() {
  var res = adminCall_('checkLinks', {});
  if (!res.success) { console.error('Link check failed', res.error); return; }
  var broken = res.data.checked.filter(function (c) { return c.status === 'broken'; });
  if (!broken.length) return;
  var settings = adminCall_('getSettings', {}).data.settings;
  var links = adminCall_('getLinks', {}).data.links;
  var lines = broken.map(function (b) {
    var l = links.filter(function (x) { return x.id === b.id; })[0] || {};
    return '- ' + (l.label || b.id) + ' → HTTP ' + b.code + '\n  ' + (l.url || '');
  });
  MailApp.sendEmail(ownerEmail_(settings), '[Affiliate Hub] ' + broken.length + ' broken affiliate link(s)',
    'The daily check found broken affiliate links. Visitors clicking them cannot reach the offer.\n\n' + lines.join('\n') +
    '\n\nOpen the Links page in your dashboard to fix or deactivate them.');
}

function sendWeeklySummary() {
  var to = new Date();
  var from = new Date(to.getTime() - 7 * 86400000);
  var res = adminCall_('getDashboard', { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
  if (!res.success) { console.error('Summary failed', res.error); return; }
  var d = res.data;
  var t = d.summary.totals;
  var pct = function (x) { return x === null ? '—' : (x * 100).toFixed(1) + '%'; };
  var body = [
    'Affiliate Campaign Hub — last 7 days',
    '',
    'Visitors: ' + t.views + ' (' + t.sessions + ' sessions)',
    'Affiliate clicks: ' + t.clicks + ' · CTR ' + pct(t.ctr),
    'Conversions: ' + (t.conversions === null ? 'none recorded' : t.conversions) + (t.revenue === null ? '' : ' · Revenue ' + t.revenue.toFixed(2)),
    '',
    'Active campaigns: ' + d.counts.activeCampaigns + ' · Published pages: ' + d.counts.publishedPages + ' · Draft pages: ' + d.counts.draftPages,
    'Broken links: ' + d.counts.brokenLinks,
    '',
    'Recommendations:'
  ].concat(d.recommendations.slice(0, 10).map(function (r) { return '- [' + r.level + '] ' + r.title + ' — ' + r.evidence; }));
  if (!d.recommendations.length) body.push('- Nothing to act on.');
  body.push('', 'Reminder: decisions need enough data. Nothing was published or sent automatically.');
  MailApp.sendEmail(ownerEmail_(d.settings), '[Affiliate Hub] Weekly summary', body.join('\n'));
}

/* ---- apps-script/Code.js ---- */
/**
 * Affiliate Campaign Hub — Apps Script web app entry points.
 *
 * Deploy as a web app: Execute as "Me", access "Anyone" (public tracking endpoints need
 * anonymous access; admin actions are protected by the ADMIN_TOKEN script property).
 *
 * The frontend POSTs `text/plain` JSON ({ action, token, payload }) so browsers send a
 * "simple" CORS request without a preflight (Apps Script cannot answer OPTIONS).
 */

var MAX_BODY_BYTES_ = 250000;
// Only harmless, public actions may be called with GET (never put the admin token in a URL).
var GET_ACTIONS_ = ['ping', 'getPublicLandingPage', 'getPublicPages'];

function doPost(e) {
  var raw = (e && e.postData && e.postData.contents) || '';
  if (raw.length > MAX_BODY_BYTES_) {
    return json_({ success: false, error: { code: 'INVALID_REQUEST', message: 'Request body is too large.' } });
  }
  var body;
  try {
    body = JSON.parse(raw);
  } catch (err) {
    return json_({ success: false, error: { code: 'INVALID_REQUEST', message: 'Request body must be valid JSON.' } });
  }
  return json_(getApi_().handle(body));
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || 'ping';
  if (action === 'sitemap') return sitemap_();
  if (GET_ACTIONS_.indexOf(action) === -1) {
    return json_({ success: false, error: { code: 'INVALID_REQUEST', message: 'Use POST for this action.' } });
  }
  var payload = {};
  Object.keys(params).forEach(function (k) {
    if (k !== 'action' && k !== 'token') payload[k] = String(params[k]).slice(0, 500);
  });
  return json_(getApi_().handle({ action: action, payload: payload }));
}

/** Public XML sitemap of published pages: <web-app-url>?action=sitemap */
function sitemap_() {
  try {
    var store = new SheetStore_(getSpreadsheet_());
    var api = AH.createApi({ store: store, platform: AppsScriptPlatform_() });
    var xml = AH.seo.sitemap(store.list('LANDING_PAGES'), api.getSettings(), ['/']);
    return ContentService.createTextOutput(xml).setMimeType(ContentService.MimeType.XML);
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')
      .setMimeType(ContentService.MimeType.XML);
  }
}

function getApi_() {
  var ss = getSpreadsheet_();
  return AH.createApi({ store: new SheetStore_(ss), platform: AppsScriptPlatform_(ss) });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run an admin action from the Apps Script editor (handy for debugging), e.g.
 *   runAction_('getDashboard', {})
 */
function runAction_(action, payload) {
  var token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  var res = getApi_().handle({ action: action, token: token, payload: payload || {} });
  Logger.log(JSON.stringify(res, null, 2).slice(0, 5000));
  return res;
}

/* ---- apps-script/Platform.js ---- */
/**
 * Apps Script runtime adapter for AH.createApi:
 * secrets (Script Properties), rate limiting + de-duplication (CacheService),
 * private error logging (ERROR_LOG sheet) and link checks (UrlFetchApp).
 */
function AppsScriptPlatform_(ss) {
  var cache = CacheService.getScriptCache();

  function bucketKey(key, windowSec) {
    return 'rl:' + key + ':' + Math.floor(Date.now() / (windowSec * 1000));
  }

  return {
    now: function () { return Date.now(); },

    getAdminToken: function () {
      return PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
    },

    // CacheService has no atomic increment; under heavy concurrency counts may be slightly
    // low, which is acceptable for abuse protection on a single-owner tool.
    hit: function (key, windowSec) {
      var k = bucketKey(key, windowSec);
      var n = Number(cache.get(k) || 0) + 1;
      cache.put(k, String(n), Math.min(21600, windowSec + 5));
      return n;
    },

    count: function (key, windowSec) {
      return Number(cache.get(bucketKey(key, windowSec)) || 0);
    },

    seen: function (key, ttlSec) {
      var k = 'seen:' + key;
      if (cache.get(k)) return true;
      cache.put(k, '1', Math.max(1, Math.min(21600, ttlSec)));
      return false;
    },

    logError: function (err, context) {
      console.error(err && err.stack ? err.stack : err, context);
      try {
        new SheetStore_(ss || getSpreadsheet_()).append('ERROR_LOG', {
          id: AH.util.newId('err'),
          ts: new Date().toISOString(),
          code: 'INTERNAL_ERROR',
          message: String(err && err.message || err).slice(0, 1000),
          context: JSON.stringify(context || {}).slice(0, 1000)
        });
      } catch (ignored) { /* logging must never throw */ }
    },

    checkUrl: function (url) {
      try {
        var res = UrlFetchApp.fetch(url, {
          method: 'get',
          muteHttpExceptions: true,
          followRedirects: false,
          validateHttpsCertificates: true,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AffiliateCampaignHub-LinkCheck/1.0)' }
        });
        return { code: res.getResponseCode() };
      } catch (err) {
        return { code: 0, error: String(err && err.message || err).slice(0, 200) };
      }
    }
  };
}

/* ---- apps-script/Setup.js ---- */
/**
 * One-time setup + maintenance helpers. Run these from the Apps Script editor.
 *
 *   setup()             create/upgrade all sheets, create the admin token (idempotent)
 *   showAdminToken()    print the admin token to the execution log
 *   rotateAdminToken()  invalidate the old token and create a new one
 */

function setup() {
  var ss = getSpreadsheet_();
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());

  Object.keys(AH.schema.tables).forEach(function (table) {
    ensureSheet_(ss, table, AH.schema.columns(table));
  });

  // Remove the empty default tab if present.
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Tabelle1') || ss.getSheetByName('Feuille 1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);

  if (!props.getProperty('ADMIN_TOKEN')) props.setProperty('ADMIN_TOKEN', newToken_());
  Logger.log('Setup complete for spreadsheet "%s".', ss.getName());
  Logger.log('Admin token (keep it secret, paste it into the dashboard Settings page): %s', props.getProperty('ADMIN_TOKEN'));
}

function showAdminToken() {
  Logger.log(PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN') || 'No token yet — run setup().');
}

function rotateAdminToken() {
  var token = newToken_();
  PropertiesService.getScriptProperties().setProperty('ADMIN_TOKEN', token);
  Logger.log('New admin token: %s (the old token no longer works).', token);
}

function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

/** Bound script: uses the parent spreadsheet. Standalone: set SPREADSHEET_ID in Script Properties. */
function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet: open the script from a Google Sheet (Extensions → Apps Script) or set SPREADSHEET_ID.');
  return ss;
}

/** Create the tab if missing and append any missing header columns (non-destructive). */
function ensureSheet_(ss, name, columns) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var lastCol = sh.getLastColumn();
  var existing = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var missing = columns.filter(function (c) { return existing.indexOf(c) === -1; });
  if (missing.length) sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  var width = existing.length + missing.length;
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#eef2f6');
  // Plain-text format stops Sheets from auto-converting ISO dates / IDs into other types.
  sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), width).setNumberFormat('@');
  return sh;
}

/* ---- apps-script/SheetStore.js ---- */
/**
 * Google Sheets storage adapter (implements the store interface used by AH.createApi).
 *
 * - One tab per table, header row = column names (see AH.schema).
 * - Each table is read at most once per request (getDataRange().getValues()) and cached.
 * - Values that look like formulas are neutralised before writing.
 * - Columns are mapped by header name, so re-ordering columns in the sheet is safe.
 */
function SheetStore_(ss) {
  this.ss = ss;
  this.cache = {};
  this.lockDepth = 0;
}

SheetStore_.prototype.pk_ = function (table) {
  return AH.schema.tables[table].key || 'id';
};

SheetStore_.prototype.sheet_ = function (table) {
  if (!AH.schema.tables[table]) throw new Error('Unknown table: ' + table);
  var sh = this.ss.getSheetByName(table);
  if (!sh) throw new Error('Missing sheet "' + table + '". Run setup() in the Apps Script editor.');
  return sh;
};

SheetStore_.prototype.load_ = function (table) {
  if (this.cache[table]) return this.cache[table];
  var sh = this.sheet_(table);
  var values = sh.getDataRange().getValues();
  var headers = values.length ? values[0].map(function (h) { return String(h).trim(); }) : [];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var empty = true;
    for (var c = 0; c < row.length; c++) if (row[c] !== '' && row[c] !== null) { empty = false; break; }
    if (empty) continue;
    rows.push({ rowIndex: i + 1, rec: this.deserialize_(table, headers, row) });
  }
  this.cache[table] = { sheet: sh, headers: headers, rows: rows };
  return this.cache[table];
};

SheetStore_.prototype.deserialize_ = function (table, headers, row) {
  var fields = AH.schema.tables[table].fields;
  var rec = {};
  headers.forEach(function (h, i) {
    if (!fields[h]) return;
    var v = row[i];
    if (v instanceof Date) v = isNaN(v.getTime()) ? '' : v.toISOString();
    var type = fields[h].type;
    if (type === 'json') {
      if (v === '' || v === null) { rec[h] = null; return; }
      try { rec[h] = JSON.parse(String(v)); } catch (e) { rec[h] = null; }
    } else if (type === 'bool') {
      rec[h] = v === true || String(v).toUpperCase() === 'TRUE';
    } else if (type === 'number') {
      rec[h] = v === '' || v === null ? null : Number(v);
      if (rec[h] !== null && !isFinite(rec[h])) rec[h] = null;
    } else {
      rec[h] = v === null || v === undefined ? '' : String(v);
    }
  });
  return rec;
};

SheetStore_.prototype.serialize_ = function (table, headers, rec) {
  var fields = AH.schema.tables[table].fields;
  return headers.map(function (h) {
    var f = fields[h];
    var v = rec[h];
    if (!f || v === undefined || v === null) return '';
    if (f.type === 'json') return AH.util.neutralizeFormula(JSON.stringify(v));
    if (f.type === 'bool') return v === true;
    if (f.type === 'number') return typeof v === 'number' && isFinite(v) ? v : '';
    return AH.util.neutralizeFormula(String(v));
  });
};

SheetStore_.prototype.find_ = function (table, id) {
  var t = this.load_(table);
  var k = this.pk_(table);
  for (var i = 0; i < t.rows.length; i++) if (t.rows[i].rec[k] === id) return { t: t, i: i };
  return null;
};

function clone_(v) { return JSON.parse(JSON.stringify(v)); }

SheetStore_.prototype.list = function (table) {
  return this.load_(table).rows.map(function (r) { return clone_(r.rec); });
};

SheetStore_.prototype.get = function (table, id) {
  var hit = this.find_(table, id);
  return hit ? clone_(hit.t.rows[hit.i].rec) : null;
};

SheetStore_.prototype.insert = function (table, rec) {
  var t = this.load_(table);
  t.sheet.appendRow(this.serialize_(table, t.headers, rec));
  t.rows.push({ rowIndex: t.sheet.getLastRow(), rec: clone_(rec) });
  return clone_(rec);
};

/** Fast path for high-volume event rows: no read of the existing sheet. */
SheetStore_.prototype.append = function (table, rec) {
  var sh = this.sheet_(table);
  var headers = this.cache[table] ? this.cache[table].headers : sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(this.serialize_(table, headers, rec));
  delete this.cache[table];
  return clone_(rec);
};

SheetStore_.prototype.update = function (table, id, rec) {
  var hit = this.find_(table, id);
  if (!hit) throw new Error('Record not found: ' + table + '/' + id);
  var row = hit.t.rows[hit.i];
  hit.t.sheet.getRange(row.rowIndex, 1, 1, hit.t.headers.length).setValues([this.serialize_(table, hit.t.headers, rec)]);
  row.rec = clone_(rec);
  return clone_(rec);
};

SheetStore_.prototype.remove = function (table, id) {
  var hit = this.find_(table, id);
  if (!hit) return false;
  var rowIndex = hit.t.rows[hit.i].rowIndex;
  hit.t.sheet.deleteRow(rowIndex);
  hit.t.rows.splice(hit.i, 1);
  hit.t.rows.forEach(function (r) { if (r.rowIndex > rowIndex) r.rowIndex--; });
  return true;
};

/** Serialise writes across concurrent executions. Re-entrant within one execution. */
SheetStore_.prototype.withLock = function (fn) {
  if (this.lockDepth > 0) return fn();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Could not obtain the write lock (busy). Try again.');
  this.lockDepth++;
  this.cache = {}; // re-read inside the lock so concurrent writes are not lost
  try {
    return fn();
  } finally {
    this.lockDepth--;
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
};
