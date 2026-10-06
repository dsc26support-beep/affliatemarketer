'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeApi, publishedPage, VALID_OFFER } = require('./helpers');

test('exported page: sponsored links, disclosure near CTAs, legal links, SEO metadata', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  const r = h.call('exportLandingPage', { id: ids.pageId }).data;
  const html = r.html;
  assert.equal(r.published, true);
  const ctas = html.match(/<a class="ah-btn"[^>]*>/g) || [];
  assert.ok(ctas.length >= 1 && ctas.length <= 4);
  ctas.forEach((a) => assert.match(a, /rel="sponsored nofollow noopener"/));
  assert.equal((html.match(/class="ah-cta-note"/g) || []).length, ctas.length, 'disclosure note beside every CTA');
  assert.ok(html.indexOf('ah-disclosure') < html.indexOf('ah-btn'), 'disclosure before the first CTA');
  assert.match(html, /href="https:\/\/example.github.io\/guides\/privacy.html"/);
  assert.match(html, /href="https:\/\/example.github.io\/guides\/terms.html"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/example.github.io\/guides\/p\/[a-z0-9-]+\.html">/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /<meta name="robots" content="index,follow">/);
  assert.match(html, /data-ah-api="https:\/\/script.google.com\/macros\/s\/abc\/exec"/);
  assert.doesNotMatch(html, /aggregateRating|"@type":"Review"|countdown|testimonial/i);
  assert.match(html, /<meta name="viewport"/);
});

test('renderer escapes user content (no HTML/script injection)', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  const page = h.call('getLandingPage', { id: ids.pageId }).data.page;
  page.sections.problem.body = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  page.sections.faq.items.push({ q: '</script><script>alert(3)</script>', a: 'ok' });
  page.seo.title = '"><script>alert(4)</script>';
  h.call('saveLandingPage', { id: ids.pageId, sections: page.sections, seo: page.seo });
  const html = h.call('exportLandingPage', { id: ids.pageId }).data.html;
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;alert\(1\)/);
});

test('unpublished export is a noindex preview without tracking', () => {
  const h = makeApi();
  const p = h.call('createProduct', VALID_OFFER).data.product;
  const c = h.call('createCampaign', { productId: p.id }).data.campaign;
  const pg = h.call('generateLandingPage', { campaignId: c.id }).data.page;
  const r = h.call('exportLandingPage', { id: pg.id }).data;
  assert.equal(r.published, false);
  assert.match(r.html, /noindex,nofollow/);
  assert.doesNotMatch(r.html, /track\.js/);
});

test('research-based pages never claim personal testing; hands-on pages use real notes', () => {
  const h = makeApi();
  const p = h.call('createProduct', VALID_OFFER).data.product;
  const c = h.call('createCampaign', { productId: p.id }).data.campaign;
  const pg = h.call('generateLandingPage', { campaignId: c.id }).data.page;
  assert.match(pg.sections.method.body, /have not personally tested/);
  assert.equal(pg.sections.experience.enabled, false);
  h.call('saveExperienceNotes', { id: p.id, notes: { hasFirstHand: true, tested: 'Used it for 2 weeks', liked: 'Short lessons', disliked: 'No mobile app' } });
  const pg2 = h.call('generateLandingPage', { campaignId: c.id }).data.page;
  assert.equal(pg2.sections.experience.enabled, true);
  assert.deepEqual([...pg2.sections.pros.items], ['Short lessons']);
  assert.deepEqual([...pg2.sections.cons.items], ['No mobile app']);
  assert.notEqual(pg2.slug, pg.slug, 'slugs stay unique');
});

test('sitemap lists only published, indexable pages', () => {
  const h = makeApi();
  const ids = publishedPage(h);
  const xml = h.call('getSitemap').data.xml;
  assert.match(xml, new RegExp('/p/' + ids.slug + '\\.html'));
  const page = h.call('getLandingPage', { id: ids.pageId }).data.page;
  h.call('saveLandingPage', { id: ids.pageId, seo: Object.assign({}, page.seo, { noindex: true }) });
  h.call('publishLandingPage', { id: ids.pageId, approve: true });
  assert.doesNotMatch(h.call('getSitemap').data.xml, /\/p\//);
});

test('content engine: limited plan, first-hand flags, locked case study', () => {
  const h = makeApi();
  const p = h.call('createProduct', VALID_OFFER).data.product;
  const c = h.call('createCampaign', { productId: p.id }).data.campaign;
  const plan = h.call('createContentPlan', { campaignId: c.id }).data;
  assert.equal(plan.items.length, 8, 'one concept per type — not a mass generator');
  assert.equal(h.call('createContentPlan', { campaignId: c.id }).data.created.length, 0, 'idempotent');
  const cs = plan.items.find((i) => i.type === 'case_study');
  assert.equal(cs.locked, true);
  assert.equal(h.call('updateContentItem', { id: cs.id, status: 'drafting' }).error.code, 'CONFLICT');
  const social = h.call('createSocialDraft', { campaignId: c.id }).data.items;
  assert.equal(social.length, 10);
  const review = social.find((s) => s.angle === 'review');
  assert.equal(review.requiresFirstHand, true);
  assert.equal(h.call('updateSocialDraft', { id: review.id, status: 'approved' }).success, false, 'cannot approve with placeholders / first-hand claims');
  social.forEach((s) => assert.match(s.disclosure, /affiliate/i));
  const emails = h.call('createEmailDraft', { campaignId: c.id }).data.items;
  assert.equal(emails.length, 6);
  assert.ok(emails.every((e) => /unsubscribe/i.test(e.body)));
  assert.match(emails.find((e) => e.type === 'recommendation').body, /affiliate link/i);
});
