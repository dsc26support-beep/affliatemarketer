# handoff: live
project: affliatemarketer
type: code + apps-script
updated: 2026-10-06 19:20
goal: Affiliate Campaign Hub (Digistore24/ClickBank) — vanilla JS static site + Apps Script API + Google Sheets. PRs #1–#3 merged; backend live; fixing GitHub Pages publish.

## next-steps  <!-- resume here -->
1. User: Settings → Pages → Source must be "GitHub Actions" (currently "Deploy from a branch" → serves repo root, site lives in public/ → /admin/ 404). Then re-run run 37513914977 ("Deploy site to GitHub Pages").
2. Verify dashboard https://dsc26support-beep.github.io/affliatemarketer/admin/ loads (user — github.io blocked from this env).
3. User: dashboard Settings → remote mode, paste admin token (never chat/repo), Test connection; site settings (site URL https://dsc26support-beep.github.io/affliatemarketer, legal URLs, contact admin@mwakete.com, author bio).
4. First real offer → campaign → page → publish → export static HTML → commit to public/p/<slug>.html (offer to do commit).

## state
- done: PR #1 app, PR #2 legal pages + dist/AffiliateHub.gs, PR #3 config.js apiUrl (+ e2e demo-mode fix) — all merged (main cd300ce).
- done: backend verified by user: ?action=ping → {"success":true,"version":"1.0.0"}.
- Pages: pages.yml runs 1–3 failed (Pages not enabled / wrong source); dynamic "pages build and deployment" succeeded 19:13 = branch mode (wrong).

## decisions
- /exec URL public by design; admin token only in Script Properties + user's browser.
- With apiUrl set, dashboard defaults to remote mode (intended); e2e seeds demo mode via addInitScript.
- clasp impossible from cloud env → single-file paste bundle.
- Merged-PR rule: reset branch to origin/main before new work (force-with-lease).

## gotchas
- Cloud env network blocks script.google.com AND github.io — user must verify live URLs.
- Pages "Deploy from a branch" breaks site (needs public/ as root) → must use GitHub Actions source.
- If repo private on free plan, Pages unavailable → make public or use Cloudflare Pages.

## open-questions
- Pages switched to GitHub Actions + re-run green?
