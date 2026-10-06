# Affiliate Campaign Hub

A lightweight, low-cost tool for **one affiliate marketer** working with **Digistore24** and **ClickBank**. It helps you discover, organise, promote, test and measure offers honestly.

```
PASTE OFFER → SCORE → BUILD CAMPAIGN → USEFUL LANDING PAGE → CONTENT PLAN
            → DISTRIBUTE (drafts) → TRACK → LEARN → OPTIMIZE
```

**Stack:** static HTML/CSS/vanilla JS (GitHub Pages or Cloudflare Pages) · Google Apps Script API · Google Sheets database. No framework, no paid SaaS, no AI dependency.

> This is a marketing operations tool, not an income machine. It never promises results, never invents testimonials, reviews or statistics, and never publishes anything without your approval.

## What it does

| Area | Highlights |
|---|---|
| **Offers** | Add offers (drafts allowed). Affiliate URLs are validated against network domain allowlists, duplicates are detected, and you can record Experience Notes. |
| **Offer score** | Explainable 0–100 score across 14 criteria → EXCELLENT / GOOD / TEST / WEAK. It shows a confidence level, auto-rates what it can, and caps the label when trust or compliance risk is high. |
| **Campaigns** | Strategy draft, sections A–L: audience, problem, outcome, angle, promise, objections, trust, CTA strategy, channels, content, email, tests. |
| **Landing pages** | Structured generator plus editor with live preview. Disclosure at the top and beside every CTA; `rel="sponsored"`; pros *and* cons; FAQ; comparison table; author box; JSON-LD; OG tags. Static HTML export. |
| **Compliance** | Blocks unfilled placeholders, income and health claims, fake urgency and countdowns, thin pages, missing cons, missing legal links, and first-hand claims without evidence. Publishing requires explicit approval. |
| **Content engine** | Topic cluster: pillar → supporting → commercial → landing page. 8 concepts per offer with SEO title/meta/slug, internal-link guidance and first-hand flags. Case studies stay locked until evidence exists. |
| **Social & video** | 10 angles (problem, mistake, tip, comparison, tutorial, myth, FAQ, review, story, demo), each with hook, problem, value, demo idea, CTA, disclosure and duration. Drafts only. |
| **Email** | Lead-magnet ideas, a 6-email consent-based sequence, and a lead list with unsubscribe/erase. Results are measured by clicks and conversions, not opens. |
| **Tracking** | ~3 KB cookie-free tracker: page views, sessions, affiliate/CTA clicks, UTM, referrer host, A/B variant. Respects Do-Not-Track/GPC; optional consent banner. |
| **Analytics** | Visitors, clicks, CTR, conversions, conversion rate, revenue and EPC (only from data you record). BEST PERFORMERS / NEEDS ATTENTION / NOT ENOUGH DATA. |
| **A/B tests** | Headline, CTA text, CTA placement and section visibility. No winner is declared until every variant reaches the minimum sample and the result is significant at 95%. |
| **Recommendations** | Rules driven by your data, each with the evidence it was based on. |
| **Automation** | Daily broken-link check and weekly summary email to you. Nothing is auto-published or auto-sent. |

## Quick start

```bash
npm run serve          # http://localhost:8080/admin/  → demo mode, no setup
npm test               # unit/integration tests
npm run test:e2e       # browser tests (needs Playwright + Chromium)
```

To go live with Google Sheets, follow **[docs/SETUP.md](docs/SETUP.md)**. It takes about 20 minutes.

## Documentation

- [docs/SETUP.md](docs/SETUP.md): Apps Script deployment, GitHub/Cloudflare Pages, publishing, troubleshooting
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): design, security and compliance model
- [docs/API.md](docs/API.md): actions, payloads, error codes
- [docs/SHEETS_SCHEMA.md](docs/SHEETS_SCHEMA.md): every tab and column
- [docs/TESTING.md](docs/TESTING.md): automated coverage + manual checklist

## Developing

Business logic lives in `/shared` and is copied into Apps Script and the browser bundles:

```bash
# edit shared/*.js, then
npm run build          # regenerates apps-script/Shared_*.js and public/assets/js/ah-*.js
npm test               # fails if generated files are stale
```

## Roadmap status

| Phase | Scope | Status |
|---|---|---|
| 1 | Dashboard, products, links, campaigns, Sheets backend, Apps Script API | ✅ |
| 2 | Landing pages, tracking, analytics, SEO metadata, disclosures | ✅ |
| 3 | Content, social and email planners, lead magnets | ✅ |
| 4 | A/B testing, advanced analytics, offer scoring, recommendations | ✅ |
| 5 | Optional AI, advanced automation, more networks | ⏸ Not started on purpose (see ARCHITECTURE.md) |

Legal page templates in `public/` (privacy, terms, disclosure, contact) must be completed and reviewed for your jurisdiction before you publish.
