#!/usr/bin/env node
/**
 * Browser end-to-end smoke test (Playwright + Chromium).
 *   npm run test:e2e        (requires the `playwright` package to be resolvable)
 *
 * Covers: the full offer → campaign → page → content workflow in demo mode, every route
 * rendering without console errors, mobile layout (no horizontal scroll), API timeout
 * handling, and the landing-page tracker (page view + affiliate click beacons).
 */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { startServer } from '../../scripts/serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  try { ({ chromium } = require(join(process.execPath, '../../lib/node_modules/playwright'))); } catch {
    console.error('Playwright not found. Install it (npm i -D playwright) to run the e2e test.'); process.exit(2);
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'screenshots');
mkdirSync(outDir, { recursive: true });
const PORT = 8137;
const BASE = `http://localhost:${PORT}`;
const server = await startServer(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let failures = 0;
const check = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) failures++; };

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport });
  // public/config.js may point at a real backend (then the dashboard defaults to remote
  // mode). Tests run in demo mode unless a test sets its own connection config.
  await ctx.addInitScript(() => {
    try { if (!localStorage.getItem('ah_admin_cfg')) localStorage.setItem('ah_admin_cfg', JSON.stringify({ mode: 'demo' })); } catch (e) { /* opaque origin */ }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return { ctx, page, errors };
}

try {
  // ---------------------------------------------------------------- workflow (desktop)
  console.log('Workflow (desktop, demo mode)');
  const { page, errors } = await newPage({ width: 1280, height: 900 });
  await page.goto(`${BASE}/admin/#/dashboard`);
  await page.waitForSelector('text=Start with one good offer');
  check(true, 'empty state renders');

  await page.goto(`${BASE}/admin/#/offers/new`);
  await page.waitForSelector('#offer-form');
  await page.fill('[name=affiliateUrl]', 'https://evil.example.com/x');
  await page.selectOption('[name=network]', 'clickbank');
  await page.fill('[name=name]', 'E2E Course');
  await page.selectOption('[name=status]', 'researching');
  await page.click('#offer-form [type=submit]');
  await page.waitForSelector('.field.has-error');
  check(await page.isVisible('text=is not an allowed ClickBank domain'), 'invalid affiliate URL rejected inline');

  await page.fill('[name=affiliateUrl]', 'https://hop.clickbank.net/?affiliate=me&vendor=e2e');
  await page.fill('[name=targetAudience]', 'busy freelancers who lose track of invoices');
  await page.fill('[name=problem]', 'late payments from forgotten invoices');
  await page.fill('[name=mainBenefit]', 'send and track invoices in minutes');
  await page.fill('[name=price]', '29');
  await page.fill('[name=commissionPercent]', '40');
  await page.selectOption('[name=productType]', 'software');
  await page.click('#offer-form [type=submit]');
  await page.waitForURL(/#\/offers\/prd_/);
  await page.waitForSelector('text=Product information');
  check(true, 'offer saved → detail page');

  await page.click('[data-tab=score]');
  await page.selectOption('#r-marketRelevance', '4');
  await page.selectOption('#r-trustRisk', '4');
  await page.click('#score-form [type=submit]');
  await page.waitForSelector('text=Score updated');
  check(true, 'score saved');

  await page.click('[data-act=campaign] >> nth=0');
  await page.waitForURL(/#\/campaigns\/cmp_/);
  await page.waitForSelector('text=Strategy (A–L)');
  check(await page.isVisible('text=F. Objections'), 'campaign strategy A–L rendered');

  for (const [btn, url] of [['content', '#/content'], ['social', '#/social'], ['email', '#/email']]) {
    const back = page.url();
    await page.click(`[data-gen=${btn}]`);
    await page.waitForURL(new RegExp(url.replace('/', '\\/')));
    await page.waitForSelector('.page-head h1');
    check(true, `${btn} drafts generated`);
    await page.goto(back);
    await page.waitForSelector('text=Strategy (A–L)');
  }

  await page.click('[data-gen=page]');
  await page.waitForURL(/#\/pages\/pg_/);
  await page.waitForSelector('#check .issue');
  check(await page.isVisible('text=placeholder(s) still need your input'), 'compliance check lists placeholders');
  check(await page.isDisabled('#publish'), 'publish disabled until approved and compliant');
  const frame = page.frameLocator('#preview');
  await frame.locator('h1').waitFor();
  check((await frame.locator('a.ah-btn').first().getAttribute('rel')) === 'sponsored nofollow noopener', 'preview CTA uses rel="sponsored"');
  await page.screenshot({ path: join(outDir, 'page-editor-desktop.png') });

  await page.goto(`${BASE}/admin/#/pages`);
  await page.waitForSelector('.page-head h1');
  const pageRows = await page.locator('table tbody tr').count();
  check(pageRows === 1, `each click creates exactly one draft (pages: ${pageRows})`);
  const emailRows = await page.evaluate(() => JSON.parse(localStorage.getItem('ah_demo_db')).EMAIL_CAMPAIGNS.length);
  check(emailRows === 6, `email sequence generated once (${emailRows} emails)`);

  for (const r of ['dashboard', 'offers', 'campaigns', 'pages', 'content', 'social', 'email', 'analytics', 'links', 'settings']) {
    await page.goto(`${BASE}/admin/#/${r}`);
    await page.waitForSelector('.page-head h1, .state');
  }
  await page.screenshot({ path: join(outDir, 'dashboard-desktop.png'), fullPage: true });
  check(errors.length === 0, 'no console errors across all routes' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));

  // ---------------------------------------------------------------- mobile
  console.log('Mobile (390×844)');
  const m = await newPage({ width: 390, height: 844 });
  await m.page.goto(`${BASE}/admin/#/dashboard`);
  await m.page.evaluate(() => localStorage.clear());
  await m.page.reload();
  await m.page.waitForSelector('#sample');
  await m.page.click('#sample');
  await m.page.waitForURL(/#\/offers\/prd_/);
  for (const r of ['dashboard', 'offers', 'analytics', 'settings']) {
    await m.page.goto(`${BASE}/admin/#/${r}`);
    await m.page.waitForSelector('.page-head h1');
    const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 0, `no horizontal scroll on ${r} (${overflow}px)`);
  }
  await m.page.click('.nav-toggle');
  check(await m.page.isVisible('#nav a[href="#/links"]'), 'mobile menu opens');
  await m.page.goto(`${BASE}/admin/#/dashboard`);
  await m.page.waitForSelector('.cards');
  await m.page.screenshot({ path: join(outDir, 'dashboard-mobile.png'), fullPage: true });
  check(m.errors.length === 0, 'no console errors on mobile' + (m.errors.length ? ': ' + m.errors[0] : ''));

  // ---------------------------------------------------------------- API timeout / failure
  console.log('Remote API failure handling');
  const t = await newPage({ width: 1024, height: 768 });
  const API = 'https://script.google.com/macros/s/e2e/exec';
  await t.page.route(API, () => { /* never respond → timeout */ });
  await t.page.goto(`${BASE}/admin/`);
  await t.page.evaluate((api) => {
    localStorage.setItem('ah_admin_cfg', JSON.stringify({ mode: 'remote', apiUrl: api, timeoutMs: 1200 }));
    sessionStorage.setItem('ah_admin_token', 'x');
  }, API);
  await t.page.goto(`${BASE}/admin/#/offers`);
  await t.page.reload(); // config is read at startup
  await t.page.waitForSelector('text=took longer than', { timeout: 8000 });
  check(true, 'timeout shows an error state with retry');
  check(await t.page.isVisible('#retry-load'), 'retry button present');
  await t.page.unroute(API);
  await t.page.route(API, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing admin token.' } }) }));
  await t.page.click('#retry-load');
  await t.page.waitForSelector('text=Invalid or missing admin token');
  check(await t.page.isVisible('a:has-text("Open Settings")'), 'unauthorized → link to Settings');

  // ---------------------------------------------------------------- tracker on an exported page
  console.log('Landing-page tracker');
  const core = readFileSync(join(here, '../../public/assets/js/ah-core.js'), 'utf8');
  const vctx = vm.createContext({ console });
  vm.runInContext(core, vctx);
  const AH = vctx.AH;
  const api = AH.createApi({ store: AH.MemoryStore(), platform: AH.MemoryPlatform({ adminToken: 't' }) });
  const call = (a, p) => api.handle({ action: a, token: 't', payload: p });
  call('saveSettings', { apiUrl: 'https://script.google.com/macros/s/track/exec', privacyUrl: 'https://x.dev/privacy', termsUrl: 'https://x.dev/terms' });
  const prod = call('createProduct', { name: 'Tracker', network: 'clickbank', affiliateUrl: 'https://hop.clickbank.net/?affiliate=me&vendor=t' }).data.product;
  const camp = call('createCampaign', { productId: prod.id }).data.campaign;
  const pg = call('generateLandingPage', { campaignId: camp.id }).data.page;
  const html = AH.landing.renderDocument({ page: pg, product: prod, link: call('getLinks', {}).data.links[0], settings: call('getSettings', {}).data.settings });
  writeFileSync(join(here, '../../public/p/__e2e.html'), html);
  const tr = await newPage({ width: 1024, height: 768 });
  const beacons = [];
  await tr.page.route('https://script.google.com/macros/s/track/exec', (route) => { beacons.push(JSON.parse(route.request().postData())); route.fulfill({ status: 200, body: '{"success":true}' }); });
  await tr.page.route('https://hop.clickbank.net/**', (route) => route.fulfill({ status: 200, body: 'merchant' }));
  await tr.page.goto(`${BASE}/p/__e2e.html?utm_source=tiktok&utm_medium=social`);
  await tr.page.waitForTimeout(500);
  await tr.page.click('a.ah-btn >> nth=0');
  await tr.page.waitForTimeout(800);
  const pv = beacons.find((b) => b.action === 'recordPageView');
  const ck = beacons.find((b) => b.action === 'recordAffiliateClick');
  check(pv && pv.payload.pageId === pg.id && pv.payload.utm.source === 'tiktok', 'page view beacon with UTM');
  check(ck && ck.payload.ctaId === 'afterIntro' && /^lnk_/.test(ck.payload.linkId), 'affiliate click beacon with CTA id');
  check(!JSON.stringify(beacons).includes('@'), 'no personal data in beacons');
  // Do-Not-Track respected
  const dnt = await newPage({ width: 800, height: 600 });
  await dnt.page.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }));
  const before = beacons.length;
  await dnt.page.route('https://script.google.com/macros/s/track/exec', (route) => { beacons.push(1); route.fulfill({ status: 200, body: '{}' }); });
  await dnt.page.goto(`${BASE}/p/__e2e.html`);
  await dnt.page.waitForTimeout(500);
  check(beacons.length === before, 'Global Privacy Control → no tracking');
  // Unknown static page falls back to the live viewer
  await dnt.page.goto(`${BASE}/p/not-exported-yet.html`);
  await dnt.page.waitForURL(/\/p\/\?slug=not-exported-yet/);
  check(true, '404 fallback redirects /p/<slug>.html to the live viewer');
  const { unlinkSync } = await import('node:fs');
  unlinkSync(join(here, '../../public/p/__e2e.html'));
} catch (e) {
  failures++;
  console.error(e);
} finally {
  await browser.close();
  server.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll e2e checks passed');
process.exit(failures ? 1 : 0);
