# handoff: live
project: affliatemarketer
type: code + apps-script
updated: 2026-10-06 13:27
goal: Affiliate Campaign Hub (Digistore24/ClickBank) — vanilla JS static site + Apps Script API + Google Sheets. Phases 1–4 built; PR open and green.

## next-steps  <!-- resume here -->
1. PR dsc26support-beep/affliatemarketer#1 (draft, base main) — CI green, no reviews. Waits on user to review/mark ready/merge. Session subscribed; safety-net check-in trig_01Kv9H2oeJYervAzAQ9fxa2Q at 14:13Z.
2. User deploys Google side per docs/SETUP.md (bound script, clasp push, setup(), web app access "Anyone", URL+token into /admin Settings), then docs/TESTING.md manual checklist.
3. Phase 5 (AI, more networks) only after real deploy is stable.

## state
- done: shared core (/shared), Apps Script adapters, admin SPA (10 views), tracker, public viewer, legal templates, docs, CI (ci.yml + pages.yml), 33 node tests + 30 Playwright checks.
- done: `main` = empty root commit 89078cc (user-approved); merged into branch (7307f3d) for shared history so PR shows full diff — no history rewrite.

## decisions
- One API codebase for Apps Script, browser demo mode, Node tests — avoids drift.
- text/plain POST → no CORS preflight (Apps Script can't answer OPTIONS).
- Direct affiliate links rel="sponsored nofollow" + sendBeacon clicks; no cloaking.
- Static HTML export for SEO; live viewer noindex.
- `[[placeholders]]` + compliance gate + explicit approve; editing live page → draft.
- Conversions manual only; admin token in Script Properties + sessionStorage.
- Empty-root main chosen because identical head/base can't form a PR.

## gotchas
- app.js clones #view per render (fixed: handlers fired N times).
- No nested <form> (A/B panel outside #page-form).
- Test VM-realm arrays: compare via JSON/length.
- Real Apps Script deploy + Digistore24 link formats unverified (allowlist extendable in Settings).
- e2e locally: `NODE_PATH=$(npm root -g) npm run test:e2e`.

## open-questions
- None pending; awaiting user review of PR #1.
