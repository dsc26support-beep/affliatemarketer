# handoff: mvp-built-pr-pending
project: affliatemarketer
type: code + apps-script
generated: 2026-10-06 13:19
goal: Affiliate Campaign Hub (Digistore24/ClickBank) — vanilla JS static site + Apps Script API + Google Sheets. Phases 1–4 built; open PR next.

## next-steps  <!-- resume here -->
1. User APPROVED: create `main` from `claude/compassionate-turing-f8vfgf` (`git push origin claude/compassionate-turing-f8vfgf:main`), then open DRAFT PR head=claude/compassionate-turing-f8vfgf base=main via mcp__github__create_pull_request. Note: branch == main at creation → PR may have no diff/GitHub may refuse; if so tell user (alt: create main from an empty initial commit, ask first). No PR template in repo.
2. After PR: subscribe_pr_activity; watch CI (.github/workflows/ci.yml runs npm test + Playwright e2e).
3. Real deploy per docs/SETUP.md (user does Google side): bound script, `clasp push`, run `setup()`, deploy web app "Anyone", paste URL+token in /admin Settings. Then docs/TESTING.md manual checklist.

## state
- done: shared core, Apps Script adapters, admin SPA (10 views), tracker, public viewer, legal templates, docs, CI, tests.
- todo: Phase 5 (AI, more networks) intentionally not started.

## changes
- A shared/01..13_*.js — single source of business logic; `npm run build` copies → apps-script/Shared_*.js, public/assets/js/ah-core.js, ah-render.js (generated, committed; `npm test` fails if stale)
- A shared/12_api.js — AH.createApi({store, platform}); platform = now/getAdminToken/hit/count/seen/logError/checkUrl
- A apps-script/{Code,SheetStore,Platform,Setup,Automation}.js, appsscript.json
- A public/admin/ (index.html, admin.css, js/{app,ui,backend}.js, js/views/*.js), public/assets/js/track.js, public/p/index.html (live viewer, noindex), 404.html (/p/slug.html → viewer)
- A tests/{helpers,api,appsscript,render}.test.js, tests/e2e/run.mjs, scripts/{build,serve}.mjs, docs/*.md

## decisions
- Same API code runs in Apps Script, browser demo mode (MemoryStore+localStorage) and Node tests — rejected separate backend/demo implementations (drift).
- text/plain POST to Apps Script — avoids CORS preflight Apps Script can't answer.
- CTAs link directly to network URL rel="sponsored nofollow", clicks via sendBeacon — rejected redirect/cloaking.
- Static HTML export = SEO path; live viewer noindex.
- Generators leave `[[placeholders]]`; compliance blocks publish; editing published page → draft (re-approval).
- Conversions only manually entered; no estimates.
- Admin token: Script Properties + sessionStorage (localStorage only opt-in); never in repo/URLs.

## verified
- works: 33 node tests (`npm test`); 30 Playwright checks (`NODE_PATH=$(npm root -g) npm run test:e2e`) incl. mobile 390px, timeout, tracker, GPC.
- unverified: real Apps Script/Sheets deployment (only mocked runtime); real Digistore24 link formats (allowlist digistore24.com, checkout-ds24.com, digistore24.de; extendable in Settings).

## gotchas
- Delegated listeners: app.js clones #view per render (fixed bug: actions fired N times).
- No nested <form>: page editor A/B panel lives outside #page-form.
- VM-realm arrays in tests: compare via JSON or length, not deepEqual.
- Rate limits are fixed windows (CacheService); auth fail limit 30/10min.
- Remote repo had NO base branch — reason PR wasn't opened.

## git
- branch: claude/compassionate-turing-f8vfgf (pushed)
- uncommitted: clean (except this handoff)
- recent: 225d04c docs/CI · d3c0c7c e2e + handler fix · 3aa1a4f tests

## open-questions
- If GitHub refuses a PR with identical head/base, OK to make `main` an empty initial commit instead?
