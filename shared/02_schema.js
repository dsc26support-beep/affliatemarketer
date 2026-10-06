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
