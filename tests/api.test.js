'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeApi, VALID_OFFER, SETTINGS_OK, publishedPage } = require('./helpers');

test('malformed requests are rejected with INVALID_REQUEST', () => {
  const h = makeApi();
  assert.equal(h.api.handle(null).error.code, 'INVALID_REQUEST');
  assert.equal(h.api.handle('nope').error.code, 'INVALID_REQUEST');
  assert.equal(h.api.handle({}).error.code, 'INVALID_REQUEST');
  assert.equal(h.api.handle({ action: 'getProducts', token: 'secret-token', payload: [] }).error.code, 'INVALID_REQUEST');
  assert.equal(h.call('doesNotExist', {}).error.code, 'UNKNOWN_ACTION');
});

test('admin actions require the token; wrong tokens are rate limited', () => {
  const h = makeApi();
  assert.equal(h.call('getProducts', {}, '').error.code, 'UNAUTHORIZED');
  assert.equal(h.call('getProducts', {}, 'wrong').error.code, 'UNAUTHORIZED');
  assert.equal(h.call('getProducts', {}).success, true);
  for (let i = 0; i < 30; i++) h.call('getProducts', {}, 'wrong');
  assert.equal(h.call('getProducts', {}, 'wrong').error.code, 'RATE_LIMITED');
  // Successful requests never count against the limit.
  const h2 = makeApi();
  for (let i = 0; i < 50; i++) assert.equal(h2.call('getProducts', {}).success, true);
});

test('missing server token reports NOT_CONFIGURED', () => {
  const h = makeApi({ token: null });
  assert.equal(h.call('getProducts', {}).error.code, 'NOT_CONFIGURED');
});

test('empty database: dashboard and analytics work without inventing data', () => {
  const h = makeApi();
  const d = h.call('getDashboard', {}).data;
  assert.equal(d.counts.offers, 0);
  assert.equal(d.summary.totals.views, 0);
  assert.equal(d.summary.totals.ctr, null);
  assert.equal(d.summary.totals.conversions, null, 'no conversions recorded -> null, not 0');
  assert.equal(d.summary.totals.revenue, null);
  assert.equal(d.summary.hasConversionData, false);
  assert.ok(d.recommendations.every((r) => r.evidence), 'recommendations always carry evidence');
});

test('products: drafts, required fields, invalid URLs, duplicates', () => {
  const h = makeApi();
  // nothing at all
  assert.equal(h.call('createProduct', {}).error.code, 'VALIDATION_ERROR');
  // incomplete draft is allowed
  const draft = h.call('createProduct', { name: 'Half-researched thing' });
  assert.equal(draft.success, true);
  assert.equal(draft.data.product.status, 'draft');
  // leaving draft status enforces required fields
  const up = h.call('updateProduct', { id: draft.data.product.id, status: 'active' });
  assert.equal(up.error.code, 'VALIDATION_ERROR');
  assert.ok(up.error.details.network && up.error.details.affiliateUrl && up.error.details.targetAudience);
  // invalid / foreign / injected URLs
  for (const url of ['not a url', 'javascript:alert(1)', 'http://hop.clickbank.net/?a=1', 'https://evil.example.com/?vendor=x', 'https://user:pw@hop.clickbank.net/', 'https://hop.clickbank.net.evil.com/']) {
    const r = h.call('createProduct', Object.assign({}, VALID_OFFER, { affiliateUrl: url }));
    assert.equal(r.success, false, url);
    assert.ok(r.error.details.affiliateUrl, url);
  }
  // valid offer + auto primary link + score
  const ok = h.call('createProduct', VALID_OFFER);
  assert.equal(ok.success, true);
  assert.match(ok.data.product.id, /^prd_/);
  assert.ok(ok.data.product.score > 0);
  assert.equal(h.call('getLinks').data.links.length, 1);
  // duplicate by URL (utm params ignored) and by name
  assert.equal(h.call('createProduct', Object.assign({}, VALID_OFFER, { name: 'Other', affiliateUrl: VALID_OFFER.affiliateUrl + '&utm_source=x' })).error.code, 'DUPLICATE');
  assert.equal(h.call('createProduct', Object.assign({}, VALID_OFFER, { affiliateUrl: 'https://hop.clickbank.net/?affiliate=me&vendor=other' })).error.code, 'DUPLICATE');
});

test('mass assignment: system fields cannot be set by the client', () => {
  const h = makeApi();
  const r = h.call('createProduct', Object.assign({}, VALID_OFFER, { id: 'prd_hack_hack', score: 100, scoreLabel: 'EXCELLENT', createdAt: '1999' }));
  assert.notEqual(r.data.product.id, 'prd_hack_hack');
  assert.notEqual(r.data.product.createdAt, '1999');
});

test('formula-like input is stored as text and extra domains can be allowed', () => {
  const h = makeApi();
  const r = h.call('createProduct', Object.assign({}, VALID_OFFER, { notes: '=IMPORTXML("http://x")' }));
  assert.equal(r.data.product.notes, '=IMPORTXML("http://x")'); // value preserved; SheetStore neutralises on write
  assert.equal(h.call('validateLink', { url: 'https://go.partner-ds24.example/redir/1/me/', network: 'digistore24' }).data.ok, false);
  h.call('saveSettings', { extraAllowedDomains: 'partner-ds24.example' });
  assert.equal(h.call('validateLink', { url: 'https://go.partner-ds24.example/redir/1/me/', network: 'digistore24' }).data.ok, true);
});

test('changing the affiliate URL of an offer with live pages needs confirmation', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  const newUrl = 'https://hop.clickbank.net/?affiliate=me&vendor=calm2';
  assert.equal(h.call('updateProduct', { id: ids.productId, affiliateUrl: newUrl }).error.code, 'CONFIRMATION_REQUIRED');
  const ok = h.call('updateProduct', { id: ids.productId, affiliateUrl: newUrl, confirmOfferChange: true });
  assert.equal(ok.success, true);
  assert.equal(h.call('getLinks').data.links[0].url, newUrl, 'primary link follows the offer URL');
});

test('delete rules protect related data', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  assert.equal(h.call('deleteProduct', { id: ids.productId }).error.code, 'CONFLICT');
  assert.equal(h.call('deleteCampaign', { id: ids.campaignId }).error.code, 'CONFLICT');
  assert.equal(h.call('deleteLandingPage', { id: ids.pageId }).error.code, 'CONFLICT');
  assert.equal(h.call('deleteLink', { id: ids.linkId }).error.code, 'CONFLICT');
  assert.equal(h.call('getProduct', { id: 'prd_nope_nope' }).error.code, 'NOT_FOUND');
});

test('campaign plan has sections A–L and no guaranteed-income language', () => {
  const h = makeApi();
  const p = h.call('createProduct', VALID_OFFER).data.product;
  const c = h.call('createCampaign', { productId: p.id }).data.campaign;
  for (const k of ['primaryAudience', 'coreProblem', 'desiredOutcome', 'uniqueAngle', 'mainPromise', 'objections', 'trustElements', 'ctaStrategy', 'trafficChannels', 'contentIdeas', 'emailIdeas', 'testingIdeas']) {
    assert.ok(c.plan[k], k);
  }
  assert.equal(c.plan.isDraft, true);
  const errs = h.AH.compliance.scanText(JSON.stringify(c.plan).replace(/no guaranteed results/gi, ''), { hasExperience: false }).filter((i) => i.level === 'error');
  assert.equal(errs.length, 0, JSON.stringify(errs));
});

test('publishing requires explicit approval and a passing compliance check', () => {
  const h = makeApi();
  const p = h.call('createProduct', VALID_OFFER).data.product;
  const c = h.call('createCampaign', { productId: p.id }).data.campaign;
  const gen = h.call('generateLandingPage', { campaignId: c.id }).data;
  const codes = gen.check.errors.map((e) => e.code);
  assert.ok(codes.includes('PLACEHOLDERS'));
  assert.ok(codes.includes('PRIVACY') && codes.includes('TERMS'));
  assert.ok(!codes.includes('FIRST_HAND_CLAIM'), 'fresh drafts never imply personal testing');
  assert.equal(h.call('publishLandingPage', { id: gen.page.id }).error.code, 'APPROVAL_REQUIRED');
  assert.equal(h.call('publishLandingPage', { id: gen.page.id, approve: 'yes' }).error.code, 'APPROVAL_REQUIRED');
  assert.equal(h.call('publishLandingPage', { id: gen.page.id, approve: true }).error.code, 'COMPLIANCE_FAILED');
});

test('first-hand claims are blocked without experience notes and allowed with them', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  const page = h.call('getLandingPage', { id: ids.pageId }).data.page;
  page.sections.hero.summary = 'I tested this course for three weeks and my results were great.';
  const saved = h.call('saveLandingPage', { id: ids.pageId, sections: page.sections });
  assert.equal(saved.data.unpublished, true, 'editing a live page sends it back to draft');
  assert.ok(saved.data.check.errors.some((e) => e.code === 'FIRST_HAND_CLAIM'));
  assert.equal(h.call('publishLandingPage', { id: ids.pageId, approve: true }).error.code, 'COMPLIANCE_FAILED');
  h.call('saveExperienceNotes', { id: ids.productId, notes: { hasFirstHand: true, tested: 'Followed the course for three weeks with my toddler', liked: 'Clear videos' } });
  assert.equal(h.call('publishLandingPage', { id: ids.pageId, approve: true }).success, true);
});

test('fake urgency, income and health claims are blocked', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  const page = h.call('getLandingPage', { id: ids.pageId }).data.page;
  for (const bad of ['Only 3 spots left!', 'Guaranteed results in 7 days', 'Make $500 per day from home', 'This cures insomnia', 'Watch the countdown timer']) {
    const s = JSON.parse(JSON.stringify(page.sections));
    s.problem.body += ' ' + bad;
    const r = h.call('saveLandingPage', { id: ids.pageId, sections: s });
    assert.equal(r.data.check.ok, false, bad);
  }
});

test('tracking: page views, clicks, dedupe, validation and derived ids', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  const base = { pageId: ids.pageId, sessionId: 'abcdefgh12345678', referrer: 'https://www.tiktok.com/@me/video/123?x=private', utm: { source: 'TikTok', medium: 'social' } };
  assert.equal(h.publicCall('recordPageView', base).data.recorded, true);
  assert.equal(h.publicCall('recordPageView', base).data.duplicate, true, 'reload within 10s is de-duplicated');
  const click = { linkId: ids.linkId, pageId: ids.pageId, ctaId: 'afterIntro', sessionId: 'abcdefgh12345678' };
  assert.equal(h.publicCall('recordAffiliateClick', click).data.recorded, true);
  assert.equal(h.publicCall('recordAffiliateClick', click).data.duplicate, true, 'double click de-duplicated');
  h.clock.t += 6000;
  assert.equal(h.publicCall('recordAffiliateClick', click).data.recorded, true);
  const views = h.store.list('PAGE_VIEWS');
  assert.equal(views.length, 1);
  assert.equal(views[0].referrer, 'www.tiktok.com', 'only the referrer host is stored');
  assert.equal(views[0].campaignId, ids.campaignId, 'campaign derived server-side');
  assert.equal(views[0].utmSource, 'tiktok');
  // unknown / unpublished targets are ignored, malformed requests rejected
  assert.equal(h.publicCall('recordPageView', { pageId: 'pg_nope_nope' }).data.recorded, false);
  assert.equal(h.publicCall('recordPageView', {}).error.code, 'INVALID_REQUEST');
  assert.equal(h.publicCall('recordAffiliateClick', { linkId: 'javascript:1' }).error.code, 'INVALID_REQUEST');
  // inactive link
  h.call('updateLink', { id: ids.linkId, active: false });
  assert.equal(h.publicCall('recordAffiliateClick', Object.assign({}, click, { ctaId: 'final' })).data.recorded, false);
  // analytics reflect recorded events only
  const a = h.call('getAnalytics', {}).data.summary;
  assert.equal(a.totals.views, 1);
  assert.equal(a.totals.clicks, 2);
  assert.equal(a.byPage[0].status, 'not_enough');
});

test('tracking endpoints are rate limited per session', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  let limited = false;
  // A flood from one session (even to unknown pages) is cut off within the window.
  for (let i = 0; i < 130; i++) {
    const r = h.publicCall('recordPageView', { pageId: i % 2 ? ids.pageId : 'pg_nope_nope', sessionId: 'spammer12345678' });
    if (!r.success && r.error.code === 'RATE_LIMITED') limited = true;
  }
  assert.equal(limited, true);
  // Other visitors are unaffected.
  assert.equal(h.publicCall('recordPageView', { pageId: ids.pageId, sessionId: 'normalvisitor1234' }).data.recorded, true);
});

test('leads require consent, valid email and an enabled form; honeypot drops bots', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  assert.equal(h.publicCall('recordLead', { email: 'a@b.co', consent: true, pageId: ids.pageId }).error.code, 'INVALID_REQUEST', 'lead form disabled');
  const page = h.call('getLandingPage', { id: ids.pageId }).data.page;
  page.sections.leadCapture.enabled = true;
  h.call('saveLandingPage', { id: ids.pageId, sections: page.sections });
  h.call('publishLandingPage', { id: ids.pageId, approve: true });
  assert.equal(h.publicCall('recordLead', { email: 'a@b.co', consent: false, pageId: ids.pageId }).error.code, 'VALIDATION_ERROR');
  assert.equal(h.publicCall('recordLead', { email: 'nope', consent: true, pageId: ids.pageId }).error.code, 'VALIDATION_ERROR');
  assert.equal(h.publicCall('recordLead', { email: 'bot@b.co', consent: true, pageId: ids.pageId, website: 'spam' }).success, true);
  assert.equal(h.publicCall('recordLead', { email: 'A@B.co', consent: true, pageId: ids.pageId }).success, true);
  assert.equal(h.publicCall('recordLead', { email: 'a@b.co', consent: true, pageId: ids.pageId }).success, true);
  const leads = h.call('getLeads').data.leads;
  assert.equal(leads.length, 1, 'bot dropped, duplicate not re-added');
  assert.equal(leads[0].email, 'a@b.co');
  h.call('updateLead', { id: leads[0].id, status: 'unsubscribed' });
  assert.equal(h.call('updateLead', { id: leads[0].id, status: 'subscribed' }).error.code, 'CONFLICT');
});

test('public landing page endpoint only exposes published pages and public settings', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  h.call('saveSettings', { alertEmail: 'private@example.com' });
  const r = h.publicCall('getPublicLandingPage', { slug: ids.slug });
  assert.equal(r.success, true);
  assert.equal(r.data.settings.alertEmail, undefined);
  assert.equal(r.data.link.id, ids.linkId);
  h.call('unpublishLandingPage', { id: ids.pageId });
  assert.equal(h.publicCall('getPublicLandingPage', { slug: ids.slug }).error.code, 'NOT_FOUND');
  assert.equal(h.publicCall('getPublicPages', {}).data.pages.length, 0);
});

test('conversions are only what the user records', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  assert.equal(h.call('recordConversion', { date: '2026-10-06', productId: ids.productId, count: -1 }).error.code, 'VALIDATION_ERROR');
  assert.equal(h.call('recordConversion', { date: 'yesterday', productId: ids.productId, count: 1 }).error.code, 'VALIDATION_ERROR');
  assert.equal(h.call('recordConversion', { date: '2026-10-06', productId: ids.productId, campaignId: ids.campaignId, count: 2, revenue: 47 }).success, true);
  const t = h.call('getAnalytics', {}).data.summary.totals;
  assert.equal(t.conversions, 2);
  assert.equal(t.revenue, 47);
  assert.equal(t.epc, null, 'EPC needs clicks');
});

test('A/B tests: no winner without enough data; significant winner can be applied', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  assert.equal(h.call('createAbTest', { pageId: ids.pageId, name: 'H', element: 'headline', variants: [{ value: 'A' }] }).error.code, 'VALIDATION_ERROR');
  assert.equal(h.call('createAbTest', { pageId: ids.pageId, name: 'H', element: 'headline', variants: [{ value: 'Control' }, { value: 'Guaranteed results fast' }] }).error.code, 'COMPLIANCE_FAILED');
  const test1 = h.call('createAbTest', { pageId: ids.pageId, name: 'Headline', element: 'headline', minSamplePerVariant: 100, variants: [{ value: 'Old headline' }, { value: 'New headline' }] }).data.test;
  assert.equal(h.call('updateAbTest', { id: test1.id, status: 'running' }).success, true);
  // little data -> cannot declare B
  const r0 = h.call('updateAbTest', { id: test1.id, status: 'completed', winner: 'B' });
  assert.equal(r0.error.code, 'NOT_ENOUGH_DATA');
  // simulate recorded events: A 2% CTR, B 10% CTR on 400 visits each
  const ev = (variant, n, clicks) => {
    for (let i = 0; i < n; i++) h.store.append('PAGE_VIEWS', { id: 'pv_x_' + variant + i, ts: '2026-10-06T00:00:00Z', pageId: ids.pageId, variant: test1.id + ':' + variant });
    for (let i = 0; i < clicks; i++) h.store.append('CLICK_EVENTS', { id: 'clk_x_' + variant + i, ts: '2026-10-06T00:00:00Z', pageId: ids.pageId, variant: test1.id + ':' + variant });
  };
  ev('A', 400, 8); ev('B', 400, 40);
  const res = h.call('getAbTests', { pageId: ids.pageId }).data.tests[0].result;
  assert.equal(res.state, 'significant');
  assert.equal(res.winner, 'B');
  const done = h.call('updateAbTest', { id: test1.id, status: 'completed', winner: 'B', applyWinner: true });
  assert.equal(done.success, true);
  assert.equal(done.data.appliedToPage, true);
  assert.equal(h.call('getLandingPage', { id: ids.pageId }).data.page.sections.hero.headline, 'New headline');
});

test('recommendations are evidence-based', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  h.call('updateCampaign', { id: ids.campaignId, status: 'active' });
  for (let i = 0; i < 150; i++) h.store.append('PAGE_VIEWS', { id: 'pv_r_' + i, ts: '2026-10-06T00:00:00Z', pageId: ids.pageId, campaignId: ids.campaignId, productId: ids.productId, sessionId: 's' + i, utmSource: 'tiktok', utmMedium: 'social' });
  h.store.append('CLICK_EVENTS', { id: 'clk_r_1', ts: '2026-10-06T00:00:00Z', pageId: ids.pageId, campaignId: ids.campaignId, productId: ids.productId, linkId: ids.linkId, ctaId: 'afterIntro' });
  const recs = h.call('getAnalytics', {}).data.recommendations;
  const titles = recs.map((r) => r.title).join(' | ');
  assert.match(titles, /Low affiliate CTR/);
  assert.match(titles, /Social traffic/);
  assert.ok(recs.every((r) => r.evidence && r.evidence.length > 5));
});

test('broken link detection via platform.checkUrl', () => {
  const h = makeApi({ checkUrl: (url) => (url.includes('vendor=calm') ? { code: 404 } : { code: 302 }) });
  publishedPage(h);
  const r = h.call('checkLinks', {});
  assert.equal(r.data.checked[0].status, 'broken');
  assert.equal(h.call('getDashboard', {}).data.counts.brokenLinks, 1);
  const demo = makeApi();
  assert.equal(demo.call('checkLinks', {}).error.code, 'NOT_AVAILABLE');
});

test('internal errors are logged privately and never leaked', () => {
  const h = makeApi();
  h.store.list = () => { throw new Error('secret stack detail: sheet id 123'); };
  const r = h.call('getProducts', {});
  assert.equal(r.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(r.error.message, /secret|sheet id/);
  assert.equal(h.platform.errors.length, 1);
});

test('settings validation', () => {
  const h = makeApi();
  const bad = h.call('saveSettings', { lowCtrThreshold: 5, siteUrl: 'ftp://x', disclosureText: 'ads', unknownKey: 1 });
  assert.equal(bad.error.code, 'VALIDATION_ERROR');
  assert.ok(bad.error.details.lowCtrThreshold && bad.error.details.siteUrl && bad.error.details.disclosureText);
  const ok = h.call('saveSettings', Object.assign({}, SETTINGS_OK, { siteUrl: 'https://x.dev/' }));
  assert.equal(ok.data.settings.siteUrl, 'https://x.dev');
});
