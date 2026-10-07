# handoff: live
project: affliatemarketer
type: code + apps-script
updated: 2026-10-07
goal: Affiliate Campaign Hub (Digistore24/ClickBank) — vanilla JS static site + Apps Script API + Google Sheets. Backend, website, dashboard all live + connected; user now configuring site + first offer.

## next-steps  <!-- resume here -->
1. Confirm user ran rotateAdminToken() (old token was pasted in chat) and re-saved new token in dashboard Settings → Connection.
2. User: Settings → Site, author & compliance — siteUrl https://dsc26support-beep.github.io/affliatemarketer, public API URL = /exec URL, author Mote Nakau + honest bio, legal URLs (privacy/terms/affiliate-disclosure/contact .html), contact admin@mwakete.com, DNT + consent on. Save.
3. First real offer → campaign → page → fill [[placeholders]] → approve → publish → export static HTML.
4. User sends exported HTML → commit to public/p/<slug>.html via PR (for indexing).
5. Asked user: which product first? Help fill offer fields from official page facts only.

## state
- done: PRs #1–#3 merged (main cd300ce): app, legal pages, single-file backend dist/AffiliateHub.gs, config.js apiUrl.
- done: backend verified (incognito ?action=ping → success, v1.0.0); setup() ran → sheet "Affiliate Hub DB".
- done: Pages via GitHub Actions; run 37513914977 succeeded 2026-10-06.
- done: dashboard Test connection succeeded 2026-10-07 ("admin token is valid").

## decisions
- /exec URL public by design; admin token only in Script Properties + user's browser. Never in chat/repo/config.js.
- Token exposed in chat → rotate (setup() is idempotent, does NOT rotate).
- Dashboard defaults to remote mode when apiUrl set; e2e seeds demo mode.
- clasp impossible from cloud env → single-file paste bundle.
- Merged-PR rule: reset branch to origin/main before new work.
- First-hand experience checkbox only if true; otherwise page labelled research-based (compliance).

## gotchas
- Cloud env blocks script.google.com and github.io — user verifies live URLs.
- Google "unable to open the file" on /exec = multi-account login; incognito works.
- Updating backend: Manage deployments → Edit → New version (keeps URL); "New deployment" changes URL.
- Site settings Save button disabled until connected.

## open-questions
- Admin token rotated yet?
- Which product/network for first offer?
