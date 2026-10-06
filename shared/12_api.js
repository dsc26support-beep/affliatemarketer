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
