# Testing

## Automated

```bash
npm test          # build freshness check + 33 Node tests (API, Apps Script runtime mock, renderer)
npm run test:e2e  # Playwright + Chromium: real browser workflow, mobile layout, tracker (≈30 checks)
```

| Requirement | Covered by |
|---|---|
| Invalid affiliate URLs (foreign host, http, credentials, `javascript:`, look-alike host) | `api.test.js` › products |
| Missing fields / drafts / leaving draft status | `api.test.js` › products |
| Duplicate products (URL incl. UTM variants, name) and slugs | `api.test.js`, `render.test.js` |
| Unauthorized admin requests + brute-force limit | `api.test.js` › token |
| Malformed API requests, oversized bodies, admin via GET | `api.test.js`, `appsscript.test.js` |
| Page view + affiliate click tracking, derived ids, referrer host only | `api.test.js` › tracking, e2e › tracker |
| Duplicate click/view events | `api.test.js` › tracking |
| Rate limiting of public endpoints | `api.test.js` |
| Landing-page rendering (`rel="sponsored"`, disclosure beside CTAs, legal links, SEO, escaping) | `render.test.js` |
| Compliance blocking (placeholders, income/health claims, urgency, first-hand claims) | `api.test.js` |
| Mobile responsiveness (no horizontal scroll at 390 px) | e2e › mobile |
| Broken affiliate links | `api.test.js` › checkLinks |
| Empty database | `api.test.js` › empty database |
| API failure / Apps Script timeout | e2e › remote API failure handling |
| Google Sheets operations (setup, insert/update/delete, formula neutralisation) | `appsscript.test.js` |
| A/B: no winner without data; significant winner applied | `api.test.js` |
| Do-Not-Track / GPC respected | e2e › tracker |

## Manual checklist (after deploying to Apps Script)

- [ ] `setup()` ran; all 16 tabs exist; admin token logged.
- [ ] `GET <web-app-url>?action=ping` returns `{"success":true,…}`.
- [ ] Dashboard → Settings → **Test connection** succeeds; a wrong token shows "Invalid or missing admin token".
- [ ] Add an offer with a real Digistore24/ClickBank link → row appears in `PRODUCTS` and `AFFILIATE_LINKS`.
- [ ] Links → **Check links now** → status `ok`/`redirect` (a 403 from a merchant is reported as `error`, not broken).
- [ ] Generate a landing page → the compliance panel lists placeholders; **Publish** stays disabled.
- [ ] Fill everything, approve, publish → **Export static HTML** → open the file locally:
  - [ ] disclosure at the top and under every button; buttons have `rel="sponsored nofollow noopener"`;
  - [ ] privacy/terms/contact links work; layout looks right on a phone.
- [ ] Deploy the exported page; visit it with `?utm_source=test&utm_medium=social` → a row appears in `PAGE_VIEWS`.
- [ ] Click a CTA → a row appears in `CLICK_EVENTS` with `ctaId` and `utmSource=test`.
- [ ] Enable lead capture → sign up with consent → row in `LEADS`; without the checkbox the form refuses.
- [ ] Record a conversion → it appears in Analytics; nothing appears without one.
- [ ] `installTriggers()` → the weekly email arrives on Monday; a broken link triggers an alert email.
- [ ] Force an error (e.g. rename a tab) → visitors see a generic error; details are in `ERROR_LOG`.
