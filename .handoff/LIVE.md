# handoff: live
project: affliatemarketer
type: code + apps-script
updated: 2026-10-06 (after PR #3 opened)
goal: Affiliate Campaign Hub (Digistore24/ClickBank) — vanilla JS static site + Apps Script API + Google Sheets. PRs #1, #2 merged; PR #3 (connect site to backend) open as draft.

## next-steps  <!-- resume here -->
1. PR dsc26support-beep/affliatemarketer#3 (draft) — sets public/config.js apiUrl to user's /exec URL. Session subscribed; watch CI. Merge only when user says so.
2. User verifies backend in browser: <exec-url>?action=ping → {"success":true}. If sign-in page → deployment access not "Anyone".
3. User: GitHub Settings → Pages → Source: GitHub Actions; dashboard at https://dsc26support-beep.github.io/affliatemarketer/admin/
4. User: dashboard Settings → remote mode, paste admin token (never in chat/repo), Test connection; site settings (site URL, contact admin@mwakete.com, legal URLs, alert email).
5. Then first real offer → campaign → page → publish → export static HTML to public/p/.

## state
- done: PR #1 (full app), PR #2 (legal pages: Mote Nakau, Betio, Tarawa, Kiribati; contact admin@mwakete.com; dist/AffiliateHub.gs single-file backend) merged.
- done: user deployed backend on Sheet 1LP-Zuoc6N8VYotYQhRiwuOxEyLtZCHLGuMmka4LVPAA; web app URL in PR #3.
- 34 node tests pass; CI green on merged PRs.

## decisions
- /exec URL is public by design (tracker calls it); admin token stays in Script Properties + user's browser only.
- clasp push not possible from cloud session (needs browser OAuth) → single-file paste bundle.
- Branch reset to origin/main after each merged PR (force-with-lease), per merged-PR rule.

## gotchas
- This cloud env's network policy blocks script.google.com (CONNECT 403) — cannot ping backend from here; user verifies in browser.
- Pages deploy workflow fails until Pages source = GitHub Actions; re-run after enabling.
- Real Apps Script runtime only verified via mocks + user's deploy; first real setup() result unconfirmed.

## open-questions
- Did ?action=ping return success? Merge PR #3?
