#!/usr/bin/env node
/**
 * Build: copies the single source of truth in /shared to where it is consumed.
 *
 *   /shared/*.js  ->  /apps-script/Shared_*.js          (Apps Script project files)
 *                 ->  /public/assets/js/ah-core.js       (admin dashboard + demo mode)
 *                 ->  /public/assets/js/ah-render.js     (public page viewer: renderer only)
 *
 * Usage:  node scripts/build.mjs          write outputs
 *         node scripts/build.mjs --check  exit 1 if outputs are stale (used in CI/tests)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sharedDir = join(root, 'shared');
const gasDir = join(root, 'apps-script');
const browserOut = join(root, 'public', 'assets', 'js', 'ah-core.js');
const renderOut = join(root, 'public', 'assets', 'js', 'ah-render.js');
const check = process.argv.includes('--check');

// Files the Apps Script runtime does not need.
const BROWSER_ONLY = new Set(['13_memory.js']);
const HEADER = '/* GENERATED FILE — do not edit. Source: /shared. Run `npm run build`. */\n';

const files = readdirSync(sharedDir).filter((f) => f.endsWith('.js')).sort();
const outputs = new Map();

for (const f of files) {
  const src = readFileSync(join(sharedDir, f), 'utf8');
  if (!BROWSER_ONLY.has(f)) {
    const name = 'Shared_' + f.replace(/^\d+_/, '').replace(/\.js$/, '') + '.js';
    outputs.set(join(gasDir, name), HEADER + src);
  }
}
outputs.set(
  browserOut,
  HEADER + files.map((f) => `/* ---- ${f} ---- */\n` + readFileSync(join(sharedDir, f), 'utf8')).join('\n')
);

// Minimal subset needed to render a published page in the public viewer.
const RENDER_FILES = ['01_util.js', '02_schema.js', '04_compliance.js', '08_seo.js', '09_landing.js'];
outputs.set(
  renderOut,
  HEADER + RENDER_FILES.map((f) => `/* ---- ${f} ---- */\n` + readFileSync(join(sharedDir, f), 'utf8')).join('\n')
);

// Single-file backend for copy/paste installs (no clasp): every Apps Script file in one .gs.
// Apps Script shares one global scope across files, so concatenation is equivalent.
const bundleOut = join(root, 'dist', 'AffiliateHub.gs');
const gasOwn = readdirSync(gasDir).filter((f) => f.endsWith('.js') && !f.startsWith('Shared_')).sort();
outputs.set(
  bundleOut,
  '/* GENERATED FILE — Affiliate Campaign Hub backend, single file for pasting into Apps Script.\n' +
  ' * Source: /shared + /apps-script. Regenerate with `npm run build`. */\n' +
  files.filter((f) => !BROWSER_ONLY.has(f)).map((f) => `/* ---- shared/${f} ---- */\n` + readFileSync(join(sharedDir, f), 'utf8'))
    .concat(gasOwn.map((f) => `/* ---- apps-script/${f} ---- */\n` + readFileSync(join(gasDir, f), 'utf8')))
    .join('\n')
);

outputs.set(join(root, 'dist', 'appsscript.json'), readFileSync(join(gasDir, 'appsscript.json'), 'utf8'));

// Remove stale generated Apps Script files (e.g. a shared file that was renamed).
const stale = readdirSync(gasDir).filter((f) => f.startsWith('Shared_') && !outputs.has(join(gasDir, f)));

let dirty = stale.length > 0;
for (const [path, content] of outputs) {
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current !== content) {
    dirty = true;
    if (!check) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }
  }
}
if (!check) stale.forEach((f) => unlinkSync(join(gasDir, f)));

if (check) {
  if (dirty) {
    console.error('Generated files are out of date. Run: npm run build');
    process.exit(1);
  }
  console.log('Generated files are up to date.');
} else {
  console.log(`Built ${outputs.size} file(s)${stale.length ? `, removed ${stale.length} stale` : ''}.`);
}
