'use strict';
/* Test helpers: load the shared core into an isolated VM context, build APIs with adapters. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function loadCore(extraGlobals) {
  const ctx = vm.createContext(Object.assign({ console }, extraGlobals || {}));
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/assets/js/ah-core.js'), 'utf8'), ctx, { filename: 'ah-core.js' });
  return ctx;
}

/** Fresh API over an in-memory store. Returns { AH, api, call, publicCall, store, platform, clock }. */
function makeApi(opts) {
  opts = opts || {};
  const ctx = loadCore();
  const AH = ctx.AH;
  const clock = { t: opts.now || Date.parse('2026-10-06T12:00:00Z') };
  const store = AH.MemoryStore();
  const platform = AH.MemoryPlatform({ adminToken: 'token' in opts ? opts.token : 'secret-token', now: () => clock.t, checkUrl: opts.checkUrl });
  const api = AH.createApi({ store, platform });
  const plain = (x) => JSON.parse(JSON.stringify(x)); // strip VM-realm prototypes for deepStrictEqual
  const call = (action, payload, token) => plain(api.handle({ action, token: token === undefined ? 'secret-token' : token, payload }));
  const publicCall = (action, payload) => plain(api.handle({ action, payload }));
  return { AH, api, call, publicCall, store, platform, clock };
}

const VALID_OFFER = {
  name: 'Calm Bedtime Course',
  network: 'clickbank',
  affiliateUrl: 'https://hop.clickbank.net/?affiliate=me&vendor=calm',
  targetAudience: 'parents of toddlers who struggle with bedtime',
  problem: 'toddlers who resist bedtime every night',
  mainBenefit: 'build a calm bedtime routine',
  price: 47,
  commissionPercent: 50,
  productType: 'digital_course',
  niche: 'Parenting',
  category: 'Online course',
  status: 'researching'
};

const SETTINGS_OK = {
  siteUrl: 'https://example.github.io/guides',
  apiUrl: 'https://script.google.com/macros/s/abc/exec',
  privacyUrl: 'https://example.github.io/guides/privacy.html',
  termsUrl: 'https://example.github.io/guides/terms.html',
  contactEmail: 'me@example.com',
  authorName: 'Sam Writer'
};

/** Fill every [[placeholder]] in a generated page so it can pass compliance. */
function fillPlaceholders(page) {
  const walk = (v) => {
    if (typeof v === 'string') return v.replace(/\[\[[^\]]*\]\]/g, 'a verified detail from the official page');
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = walk(v[k]); return o; }
    return v;
  };
  const sections = walk(JSON.parse(JSON.stringify(page.sections)));
  sections.cons.items = ['Requires about 20 minutes every evening for the first two weeks'];
  sections.disclaimer = { body: 'This content is general information, not medical advice. Talk to a qualified healthcare professional about sleep concerns.' };
  return sections;
}

/** Create offer → campaign → page, fill it and publish. Returns ids. */
function publishedPage(h) {
  h.call('saveSettings', SETTINGS_OK);
  const prod = h.call('createProduct', VALID_OFFER).data.product;
  const camp = h.call('createCampaign', { productId: prod.id }).data.campaign;
  const page = h.call('generateLandingPage', { campaignId: camp.id }).data.page;
  const saved = h.call('saveLandingPage', { id: page.id, sections: fillPlaceholders(page) });
  if (!saved.success) throw new Error(JSON.stringify(saved));
  const pub = h.call('publishLandingPage', { id: page.id, approve: true });
  if (!pub.success) throw new Error(JSON.stringify(pub.error));
  const link = h.call('getLinks').data.links[0];
  return { productId: prod.id, campaignId: camp.id, pageId: page.id, linkId: link.id, slug: page.slug };
}

module.exports = { ROOT, loadCore, makeApi, VALID_OFFER, SETTINGS_OK, fillPlaceholders, publishedPage };
