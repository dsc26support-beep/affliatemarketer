# handoff: live
project: affliatemarketer
type: code + apps-script
updated: 2026-10-07
goal: Affiliate Campaign Hub (Digistore24/ClickBank) — vanilla JS static site + Apps Script API + Google Sheets. Backend + website both live; user onboarding in dashboard.

## next-steps  <!-- resume here -->
1. User: Site/author/compliance settings — site URL https://dsc26support-beep.github.io/affliatemarketer, privacy/terms/affiliate-disclosure .html URLs, contact admin@mwakete.com, author Mote Nakau + bio.
2. First real offer → campaign → page → publish → export static HTML → commit to public/p/<slug>.html (offer to do commit via PR).

## state
- done: PRs #1–#3 merged (main cd300ce): app, legal pages, single-file backend dist/AffiliateHub.gs, config.js apiUrl.
- done: backend verified (incognito ?action=ping → success, v1.0.0).
- done: dashboard Test connection succeeded (2026-10-07). Token was pasted in chat once — advised rotateAdminToken(); unconfirmed whether rotated.
- done: Pages source switched to GitHub Actions; pages.yml run 37513914977 attempt 3 succeeded 2026-10-06 20:46Z.

## decisions
- /exec URL public by design; admin token only in Script Properties + user's browser.
- Dashboard defaults to remote mode when apiUrl set; e2e seeds demo mode.
- clasp impossible from cloud env → single-file paste bundle.
- Merged-PR rule: reset branch to origin/main before new work.

## gotchas
- Cloud env blocks script.google.com and github.io — user verifies live URLs.
- Google "unable to open the file" on /exec = multi-account login in browser; incognito works; visitors unaffected.
- Updating backend: Manage deployments → Edit → New version (keeps URL); "New deployment" changes URL.

## open-questions
- Was the admin token rotated after the chat exposure?
