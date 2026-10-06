# handoff: live
project: affliatemarketer
type: code + apps-script
updated: 2026-10-06 13:50
goal: Affiliate Campaign Hub (Digistore24/ClickBank) — vanilla JS static site + Apps Script API + Google Sheets. PR #1 merged; PR #2 (legal pages + single-file backend) open, ready for review.

## next-steps  <!-- resume here -->
1. PR dsc26support-beep/affliatemarketer#2 — ready (not draft), CI pending on latest push. Merge only when user says so. Session subscribed; safety-net check-in trig_01VrswSDCoBhAwN9hN3Hj2oF (14:31Z).
2. User installs backend on their Sheet (ID 1LP-Zuoc6N8VYotYQhRiwuOxEyLtZCHLGuMmka4LVPAA): paste dist/AffiliateHub.gs into Code.gs + dist/appsscript.json, run setup(), deploy web app (Me / Anyone). Waiting for user to send /exec URL.
3. With /exec URL: put it in public/config.js `apiUrl` (public, not secret) → commit/PR. Token stays with user (dashboard Settings only, never chat/repo).
4. User: GitHub Settings → Pages → Source: GitHub Actions; re-run Pages deploy. Dashboard: https://dsc26support-beep.github.io/affliatemarketer/admin/
5. Settings in dashboard: contact email admin@mwakete.com, alert email (user's choice), site URL, legal URLs.

## state
- done: PR #1 merged (55e1c21) — full app, 33→34 tests, e2e 30 checks.
- done (PR #2): legal pages filled — owner Mote Nakau, Betio, Tarawa, Kiribati; governing law Kiribati; contact admin@mwakete.com; dated 6 Oct 2026.
- done (PR #2): build emits dist/AffiliateHub.gs (single-file backend) + dist/appsscript.json; npm test checks staleness + runs bundle in mocked runtime.

## decisions
- clasp push impossible from cloud session (needs browser OAuth to user's Google; no ~/.clasprc.json) — don't ask user for OAuth codes/tokens; single-file paste bundle instead.
- Bundle = concatenation of shared + apps-script files (Apps Script shares one global scope).
- Branch restarted from main after PR #1 merge (force-with-lease) per merged-PR rule.
- Earlier: main = empty root commit merged into branch (user-approved) so PR #1 had a diff.
- Privacy policy written GDPR-friendly since Kiribati lacks a comprehensive data-protection law (not legal advice).

## gotchas
- Script "unverified app" warning on first run — expected (Advanced → Go to project).
- Web app must be access "Anyone" + /exec URL, else BAD_RESPONSE.
- Real Apps Script run still unverified (only mocked).

## open-questions
- Merge PR #2? (awaiting user)
- /exec URL from user after deploy.
