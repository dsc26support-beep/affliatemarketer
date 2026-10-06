/* GENERATED FILE — do not edit. Source: /shared. Run `npm run build`. */
/* ---- 01_util.js ---- */
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

/* ---- 02_schema.js ---- */
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

/* ---- 04_compliance.js ---- */
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

/* ---- 08_seo.js ---- */
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

/* ---- 09_landing.js ---- */
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
