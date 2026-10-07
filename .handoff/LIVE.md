# handoff: live
project: affliatemarketer
type: code + apps-script
updated: 2026-10-07
goal: Affiliate Campaign Hub (Digistore24/ClickBank) — vanilla JS static site + Apps Script API + Google Sheets. All live + connected; user entering first offer.

## next-steps  <!-- resume here -->
1. PR dsc26support-beep/affliatemarketer#4 (draft) — Digistore24 `#aff=` fragment promolink fix. Subscribed; drive CI green. Merge only when user says.
2. After merge: user pastes new dist/AffiliateHub.gs into Apps Script → Manage deployments → Edit → New version (keeps URL). Pages redeploys frontend automatically.
3. User confirms `offerflower` in their link is THEIR Digistore24 ID (else commissions lost).
4. Offered: help fill offer fields with compliant wording (health supplement — no medical claims).
5. Then campaign → page → fill [[placeholders]] → approve → publish → export HTML → commit to public/p/<slug>.html via PR.
6. Still unconfirmed: admin token rotated after chat exposure; site settings saved.

## state
- done: PRs #1–#3 merged (main cd300ce).
- done: backend live (ping v1.0.0), sheet "Affiliate Hub DB", Pages via Actions, dashboard Test connection OK.
- PR #4 head 1fabc00: shared/03_validation.js checks aff= in query OR hash (param-boundary regex, rejects staff=); new test; rebuilt copies. npm test 35/35, e2e all pass.
- First offer: Digistore24, Advanced Bionutritionals "Advanced Mitochondrial" (vendor page link with #aff=offerflower). Vendor domain passed allowlist (user evidently added it to extra allowed domains).

## decisions
- Warning was false positive (heuristic ignored URL fragment) → fix code, not user's link.
- Branch reset to origin/main after PR #3 merge; handoff commits cherry-picked; force-with-lease push.
- /exec URL public; admin token only Script Properties + user's browser.
- Health/supplement offers: factual label/refund facts only, advise consulting doctor; compliance gate blocks medical claims.

## gotchas
- Cloud env blocks script.google.com and github.io — user verifies live URLs.
- Backend changes need Apps Script New version, not New deployment (URL would change).
- normalizeUrl (duplicate detection) ignores hash — fine for now.
- Google "unable to open file" on /exec = multi-account login; incognito works.

## open-questions
- Is offerflower the user's Digistore24 ID?
- Token rotated? Merge PR #4?
