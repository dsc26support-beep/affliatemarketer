# Architecture

## Goal

A low-cost, single-owner marketing operations tool for affiliate offers (Digistore24 and ClickBank):

```
ADD OFFER → ANALYZE/SCORE → CAMPAIGN STRATEGY → LANDING PAGE → CONTENT PLAN
          → DISTRIBUTE (drafts) → TRACK → ANALYTICS → OPTIMIZE
```

It is not an automatic money machine. Everything it generates is a draft, and anything public needs human approval.

## Overview

```
                 ┌──────────────────────── GitHub Pages / Cloudflare Pages (static) ─────────────────────────┐
                 │  /admin/          Dashboard SPA (vanilla JS, noindex)                                     │
 Owner ─────────►│  /p/<slug>.html   Exported landing pages (static HTML, SEO)                               │
                 │  /p/?slug=…       Live viewer fallback (noindex)                                          │
 Visitors ──────►│  /assets/js/track.js   ~3 KB cookie-free tracker (page views, clicks, UTM, A/B)           │
                 └──────────────┬──────────────────────────────────────────────┬────────────────────────────┘
                                │ POST text/plain JSON {action, token, payload}  │ sendBeacon (public actions)
                                ▼                                                ▼
                 ┌──────────────────────────── Google Apps Script web app ───────────────────────────────────┐
                 │  Code.js        doPost/doGet → AH.createApi(...)                                          │
                 │  SheetStore.js  storage adapter (one tab per table, cached reads, LockService writes)     │
                 │  Platform.js    Script Properties token, CacheService rate limits/dedupe, UrlFetch checks │
                 │  Automation.js  daily link check, weekly summary (admin emails only)                      │
                 │  Shared_*.js    ← generated copy of /shared (the business logic)                         │
                 └──────────────────────────────────────────────┬────────────────────────────────────────────┘
                                                                ▼
                                                     Google Sheets (database)
```

### One shared core, three runtimes

All business logic lives in `/shared` as plain, dependency-free JavaScript. That covers validation, scoring, compliance, the generators, analytics, recommendations and the API router. `npm run build` copies it to:

| Output | Used by |
|---|---|
| `apps-script/Shared_*.js` | The production API (Apps Script V8) |
| `public/assets/js/ah-core.js` | The dashboard: demo mode, live preview, instant compliance feedback |
| `public/assets/js/ah-render.js` | The public live viewer (renderer only, ~18 KB gzipped) |

The API takes two adapters (`AH.createApi({ store, platform })`), so the same code runs in three places:

- On Apps Script with `SheetStore` + `AppsScriptPlatform`.
- In the browser with `MemoryStore` saved to localStorage (**demo mode**, no setup needed).
- In Node tests with `MemoryStore` and a fake clock.

`npm test` fails if the generated copies are out of date.

## Folder layout

```
shared/            Single source of truth for business logic (edit here)
  01_util.js         ids, escaping, strict URL parser (Apps Script has no URL class)
  02_schema.js       tables/columns/types, settings defaults
  03_validation.js   server-side validation, affiliate URL allowlists, mass-assignment protection
  04_compliance.js   claim scanner + pre-publish checks
  05_scoring.js      explainable 0–100 offer score
  06_campaign.js     campaign strategy A–L
  07_content.js      content plan, topic clusters, social/video drafts, email sequences, lead magnets
  08_seo.js          canonical, sitemap, JSON-LD, internal links, metadata lint
  09_landing.js      landing page generator + safe HTML renderer
  10_analytics.js    aggregation, BEST/ATTENTION/NOT ENOUGH DATA, A/B significance
  11_recommendations.js  evidence-based recommendations
  12_api.js          action router + services
  13_memory.js       in-memory adapters (browser demo + tests)
apps-script/       Apps Script project (push with clasp or copy/paste)
public/            Static site: admin dashboard, public pages, tracker, legal templates
tests/             Node test runner suites + Playwright e2e
scripts/           build + local static server
docs/              This documentation
```

## Key design decisions

| Decision | Why |
|---|---|
| Vanilla JS, no framework or bundler | Cheap to host, fast, nothing to upgrade. The only build step is a file copy. |
| `text/plain` POST to Apps Script | A "simple" CORS request. Apps Script cannot answer CORS preflight requests. |
| Admin token in Script Properties + browser storage | No secrets in GitHub. The token goes in the request body, never in URLs. |
| Affiliate CTAs link **directly** to the network URL with `rel="sponsored nofollow"` | No cloaking or misleading redirects. Clicks are recorded with `sendBeacon`. |
| Static HTML export for SEO | Fast pages that do not depend on Apps Script being up. The live viewer is `noindex`. |
| Conversions entered manually from network reports | The app never estimates or invents revenue. |
| Editing a published page sends it back to draft | Every public change needs fresh human approval. |
| `[[placeholders]]` in generated drafts | The system never invents facts. The compliance check blocks publishing until a human fills them. |
| Fixed-window rate limits + short dedupe windows (CacheService) | Protects the public tracking endpoints at near-zero cost. |

## Security model

- **Untrusted frontend.** Every write is validated server-side by schema type. Unknown and system fields are ignored, which prevents mass assignment.
- **Affiliate URLs** must be https, contain no credentials, and match the network's domain allowlist (extendable in Settings).
- **Admin actions** need the token. Failed attempts are rate limited (30 per 10 minutes). GET requests can only run public actions.
- **Public endpoints:**
  - `recordPageView`, `recordAffiliateClick` and `recordLead` only accept known, published pages and active links.
  - Campaign and product IDs are derived on the server, never taken from the client.
  - Requests are rate limited per session and globally. Lead sign-ups have a honeypot and require explicit consent.
- **Output escaping.** The renderer HTML-escapes all stored text. JSON-LD and A/B config are escaped against `</script>` breakouts.
- **Sheet formula injection** is neutralised on write (leading apostrophe).
- **Errors.** Internal errors go to the private `ERROR_LOG` sheet. Callers only see `INTERNAL_ERROR`.

## Compliance model (built in, not optional)

- Every page shows an affiliate disclosure **before the first CTA and beside every CTA**, plus links to the privacy policy, terms and contact.
- These are **blocked**: unfilled placeholders, guaranteed-income or earnings claims, disease or cure claims, fake scarcity and countdowns, thin pages (< 150 words), pages without honest cons, missing privacy/terms URLs, and inactive or broken links.
- First-hand claims ("I tested…") are blocked unless Experience Notes exist. Case-study content stays locked until real evidence is recorded.
- Health and money niches require a disclaimer.
- Pages never include Review or AggregateRating markup, testimonials, or countdown timers.

## AI integration (Phase 5 — intentionally not built)

The core works without AI. If AI is added later, it should be an optional module that:

1. receives the same structured inputs the template generators use (`AH.campaign.vars(product)`),
2. returns drafts in the same shapes (plan sections, page sections, social and email drafts),
3. stores them through the existing API so validation, compliance and approval still apply.

The API key stays in Script Properties. No AI output can bypass the approval steps.
