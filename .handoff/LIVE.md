# handoff: live
project: affliatemarketer
type: code + apps-script
generated: 2026-10-07 14:49
goal: Pivot hub into a SIMPLE platform: paste affiliate link → auto-pull product facts → AI writes 2 landing versions + free guide + emails → funnel (page A/B → MailerLite opt-in → thank-you → vendor) → results screen with only marketing/scaling numbers. User approved plan; build in fresh session.

## next-steps  <!-- resume here -->
1. Confirm with user, then build Part 1 (link intake + auto-pull) as its own PR off fresh main (merged-PR rule).
2. Part 2 AI writer · Part 3 funnel + MailerLite · Part 4 Digistore24 IPN sales + results screen · Part 5 simplified dashboard (wizard main, old screens under "Advanced"). One PR per part, tests + e2e each.
3. Pending small items: merge PR dsc26support-beep/affliatemarketer#4 (green, ready; user must say "merge PR 4"); confirm `offerflower` is user's DS24 ID; admin token rotated?; site settings saved?

## spec (user-approved answers)
- Approach: wizard ON TOP of existing hub (keep backend, Sheet, compliance gate, Pages site). Rejected: fresh minimal app.
- Step 1 Link: Apps Script UrlFetchApp fetches vendor page → extract title, meta desc, og:image, price, refund days, headings; DS24 product id from /redir/ID if present. JS-rendered/blocked → ask user for vendor URL / sales page / paste facts. User reviews fact sheet before writing. Facts only, never copy vendor text.
- Step 2 Pages: AI drafts, user approves. Claude API key in Script Properties (cost ~$0.01–0.05/page; model configurable, default latest Sonnet). Two distinct angles (A problem-story, B quick honest overview) + lead-magnet guide (AI-drafted 1–2 page checklist) + 3–5 follow-up emails. All through existing compliance gate (no medical/income/fake claims, [[placeholders]] block publish, approve:true).
- Step 3 Funnel: page A/B 50/50 split → email opt-in for free guide → MailerLite (API key in Script Properties; group + fields: variant, source) → thank-you page w/ affiliate link → MailerLite automation sends emails. Pass variant/source into DS24 link tracking param for attribution (verify DS24 param name — campaignkey/trackingkey, unverified).
- Results: per version & per source: visits → opt-ins → vendor clicks → sales; commission, EPC; ad spend (manual entry) → profit, ROAS; verdict Scale / Keep testing / Stop. Sales via Digistore24 IPN → /exec (passphrase in Script Properties, respond "OK").
- Traffic: Facebook/Instagram (optional Meta Pixel, ad-policy-safe), TikTok/YouTube (mobile-first), Google SEO. Tagged (UTM) link generator per channel.

## state
- done: PRs #1–#3 merged (main cd300ce). Backend live (ping v1.0.0), sheet "Affiliate Hub DB", Pages via Actions, dashboard Test connection OK (2026-10-07).
- open: PR #4 (head 81f912a) — `shared/03_validation.js` accepts DS24 `aff=` in query OR #fragment; CI green. Session subscribed.
- First offer in progress: Digistore24 Advanced Bionutritionals "Advanced Mitochondrial" (health supplement → strict claims), vendor-page link `#aff=offerflower`.

## decisions  <!-- carried forward + new -->
- Secrets (admin token, Claude key, MailerLite key, DS24 IPN passphrase) only in Script Properties / user's browser — never chat/repo/config.js. /exec URL is public by design.
- Original brief banned mass AI content + phase 5 AI; user now explicitly chose AI drafts WITH human approval — allowed; compliance gate stays.
- Only marketing/scaling analytics; drop other dashboard noise (hide under Advanced, don't delete).
- clasp impossible from cloud → single-file dist/AffiliateHub.gs paste bundle; backend updates = Manage deployments → Edit → New version.
- Merged-PR rule: restart branch from origin/main before new work.

## gotchas
- Cloud env blocks script.google.com, github.io and likely vendor sites — can't test live fetch here; mock UrlFetchApp in tests, user verifies live.
- Admin token was once pasted in chat → told to run rotateAdminToken(); unconfirmed.
- Google "unable to open file" on /exec = multi-account login; incognito works.
- Apps Script quotas: UrlFetch 20k/day consumer; MailApp 100/day (why MailerLite).
- Context hit ~200k in old session → fresh session chosen. Full plan also in Drive: Claude Handoffs/affliatemarketer/20261007-1449-simple-funnel-v2-plan.

## git
- branch: claude/compassionate-turing-f8vfgf (= PR #4)
- uncommitted: clean (before this file)
- recent: 81f912a chore(handoff) · cf25fe2 chore(handoff) · 1fabc00 DS24 #aff= fix

## open-questions
- Merge PR #4 first? (recommended before Part 1)
- User needs: Claude API key, MailerLite account+key, DS24 IPN setup — guide when reached.
