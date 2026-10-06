'use strict';
/* Runs the real Apps Script files against an in-memory mock of the Google runtime. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ROOT, VALID_OFFER } = require('./helpers');

function mockGoogle() {
  const sheets = {};
  function makeSheet(name) {
    const rows = [];
    const sh = {
      _rows: rows,
      getName: () => name,
      getLastRow: () => rows.length,
      getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
      getMaxRows: () => 1000,
      getDataRange: () => ({ getValues: () => rows.map((r) => r.slice()) }),
      appendRow: (r) => { rows.push(r.slice()); },
      deleteRow: (i) => { rows.splice(i - 1, 1); },
      setFrozenRows: () => {},
      getRange: (row, col, nr, nc) => ({
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => ((rows[row - 1 + i] || [])[col - 1 + j] ?? ''))),
        setValues: (vals) => vals.forEach((vr, i) => { const r = rows[row - 1 + i] || (rows[row - 1 + i] = []); vr.forEach((v, j) => { r[col - 1 + j] = v; }); }),
        setFontWeight() { return this; }, setBackground() { return this; }, setNumberFormat() { return this; }
      })
    };
    return sh;
  }
  const ss = {
    getId: () => 'sheet-id',
    getName: () => 'Hub',
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = makeSheet(n)),
    getSheets: () => Object.values(sheets),
    deleteSheet: (s) => { delete sheets[s.getName()]; }
  };
  const props = {};
  const cache = {};
  const out = (text) => ({ text, setMimeType() { return this; } });
  return {
    sheets,
    globals: {
      console: { log() {}, error() {} },
      SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, flush: () => {} },
      PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
      CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; } }) },
      LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
      ContentService: { createTextOutput: out, MimeType: { JSON: 'json', XML: 'xml' } },
      Utilities: { getUuid: () => require('node:crypto').randomUUID() },
      Logger: { log() {} },
      UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200 }) }
    },
    props
  };
}

function loadAppsScript() {
  const g = mockGoogle();
  const ctx = vm.createContext(g.globals);
  const dir = path.join(ROOT, 'apps-script');
  // Apps Script loads every file into one global scope (order-independent by design).
  fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().reverse().forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  });
  return { ctx, g };
}

const post = (ctx, body) => JSON.parse(ctx.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).text);

test('setup() creates every sheet with headers and an admin token', () => {
  const { ctx, g } = loadAppsScript();
  ctx.setup();
  for (const t of Object.keys(ctx.AH.schema.tables)) {
    assert.ok(g.sheets[t], t);
    assert.deepEqual(g.sheets[t]._rows[0], JSON.parse(JSON.stringify(ctx.AH.schema.columns(t))));
  }
  assert.match(g.props.ADMIN_TOKEN, /^[0-9a-f]{64}$/);
  // idempotent
  ctx.setup();
  assert.equal(g.sheets.PRODUCTS._rows.length, 1);
});

test('doPost round-trips through Google Sheets with formula neutralisation', () => {
  const { ctx, g } = loadAppsScript();
  ctx.setup();
  const token = g.props.ADMIN_TOKEN;
  const r = post(ctx, { action: 'createProduct', token, payload: Object.assign({}, VALID_OFFER, { notes: '=HYPERLINK("http://evil")' }) });
  assert.equal(r.success, true, JSON.stringify(r));
  const headers = g.sheets.PRODUCTS._rows[0];
  const row = g.sheets.PRODUCTS._rows[1];
  assert.equal(row[headers.indexOf('notes')], '\'=HYPERLINK("http://evil")');
  assert.equal(row[headers.indexOf('name')], VALID_OFFER.name);
  assert.equal(g.sheets.AFFILIATE_LINKS._rows.length, 2, 'primary link row');
  // read back
  const list = post(ctx, { action: 'getProducts', token });
  assert.equal(list.data.products[0].price, 47);
  // update + delete work against row indexes
  const id = r.data.product.id;
  assert.equal(post(ctx, { action: 'updateProduct', token, payload: { id, niche: 'Sleep' } }).data.product.niche, 'Sleep');
  assert.equal(post(ctx, { action: 'deleteProduct', token, payload: { id } }).success, true);
  assert.equal(g.sheets.PRODUCTS._rows.length, 1);
  assert.equal(g.sheets.AFFILIATE_LINKS._rows.length, 1);
  assert.ok(g.sheets.AUDIT_LOG._rows.length > 1, 'audit log written');
});

test('doPost/doGet reject malformed, oversized and unauthorized requests', () => {
  const { ctx } = loadAppsScript();
  ctx.setup();
  assert.equal(post(ctx, '{not json').error.code, 'INVALID_REQUEST');
  assert.equal(post(ctx, 'x'.repeat(300000)).error.code, 'INVALID_REQUEST');
  assert.equal(post(ctx, { action: 'getProducts', token: 'nope' }).error.code, 'UNAUTHORIZED');
  const ping = JSON.parse(ctx.doGet({ parameter: {} }).text);
  assert.equal(ping.success, true);
  const adminViaGet = JSON.parse(ctx.doGet({ parameter: { action: 'getProducts', token: 'x' } }).text);
  assert.equal(adminViaGet.error.code, 'INVALID_REQUEST');
  assert.match(ctx.doGet({ parameter: { action: 'sitemap' } }).text, /<urlset/);
});

test('missing sheets produce a logged internal error, not a leak', () => {
  const { ctx, g } = loadAppsScript();
  g.props.ADMIN_TOKEN = 't';
  const r = post(ctx, { action: 'getProducts', token: 't' });
  assert.equal(r.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(r.error.message, /setup|sheet/i);
});
