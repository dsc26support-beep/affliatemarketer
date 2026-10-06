# API reference

**Endpoint:** your Apps Script web app URL (`…/exec`).
**Request:** `POST`, body = JSON text (send it as `Content-Type: text/plain` to avoid a CORS preflight).

```json
{ "action": "createProduct", "token": "ADMIN_TOKEN", "payload": { "name": "…" } }
```

**Responses**

```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "affiliateUrl": "…" } } }
```

`warnings` may appear next to `data` (e.g. "this does not look like a HopLink").

## Error codes

| Code | Meaning |
|---|---|
| `INVALID_REQUEST` | Malformed body, missing action or ids |
| `UNKNOWN_ACTION` | No such action |
| `UNAUTHORIZED` / `NOT_CONFIGURED` | Missing or wrong token / server token not set |
| `VALIDATION_ERROR` | Field errors in `details` |
| `DUPLICATE` | Offer URL/name or page slug already exists |
| `NOT_FOUND` | Record does not exist |
| `CONFLICT` | Blocked by related data or the current state |
| `CONFIRMATION_REQUIRED` | Changing a live affiliate URL: resend with `confirmOfferChange: true` |
| `APPROVAL_REQUIRED` | Publishing needs `approve: true` |
| `COMPLIANCE_FAILED` | Pre-publish/approval check failed: `details.errors` |
| `NOT_ENOUGH_DATA` | A/B winner requested without significance |
| `NOT_AVAILABLE` | Link checks in demo mode |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Logged privately in `ERROR_LOG`; no details are exposed |

## Public actions (no token)

| Action | Payload | Notes |
|---|---|---|
| `ping` | – | Health check. Also available via `GET ?action=ping` |
| `recordPageView` | `pageId, sessionId, path, referrer, variant, utm{source,medium,campaign,content,term}` | Published pages only. Deduped for 10 s per session+page |
| `recordAffiliateClick` | `linkId, pageId, ctaId, sessionId, variant, referrer, utm` | Active links only. Deduped for 5 s per session+link+CTA |
| `recordLead` | `email, consent:true, pageId, website (honeypot)` | Only when the page's lead form is enabled |
| `getPublicLandingPage` | `slug` | Published page + public settings. Also `GET` |
| `getPublicPages` | – | List of published, indexable pages. Also `GET` |
| (GET) `?action=sitemap` | – | XML sitemap of published pages |

## Admin actions (token required)

| Area | Actions |
|---|---|
| Dashboard | `getDashboard {from,to}`: counts, analytics, recommendations, lists (one call) |
| Offers | `getProducts`, `getProduct {id}`, `createProduct`, `updateProduct`, `deleteProduct`, `scoreProduct {id, inputs}`, `saveExperienceNotes {id, notes}` |
| Links | `getLinks`, `createLink`, `updateLink`, `deleteLink`, `validateLink {url, network}`, `checkLinks {ids?}` |
| Campaigns | `getCampaigns`, `getCampaign {id}`, `createCampaign {productId, name?}`, `updateCampaign {id, plan?, status?, regeneratePlan?}`, `deleteCampaign` |
| Landing pages | `getLandingPages`, `getLandingPage {id}`, `generateLandingPage {campaignId, pageType}`, `saveLandingPage`, `checkLandingPage`, `publishLandingPage {id, approve:true}`, `unpublishLandingPage`, `deleteLandingPage`, `exportLandingPage {id}` → `{filename, html}`, `getSitemap` |
| Content | `createContentPlan {campaignId}`, `getContentPlan`, `updateContentItem`, `deleteContentItem` |
| Social | `createSocialDraft {campaignId, angles?}`, `getSocialContent`, `updateSocialDraft`, `deleteSocialDraft` |
| Email | `createEmailDraft {campaignId, leadMagnet?, replace?}`, `getEmailCampaigns`, `updateEmailDraft`, `deleteEmailDraft`, `getLeads`, `updateLead`, `deleteLead` |
| Analytics | `getAnalytics {from,to,campaignId?,productId?,pageId?}`, `recordConversion`, `deleteConversion` |
| A/B tests | `createAbTest`, `getAbTests {pageId?}`, `updateAbTest {id, status, winner?, applyWinner?}`, `deleteAbTest` |
| Settings | `getSettings`, `saveSettings`, `getAuditLog {limit}`, `exportData`, `verifyToken` |

### A/B test variants

| Element | Variant value |
|---|---|
| `headline`, `cta_text` | Replacement text (compliance-scanned) |
| `cta_placement` | Comma list of CTAs to show: `afterIntro,afterSolution,afterEvaluation,final` |
| `page_structure`, `comparison_format`, … | `hide:sectionA,sectionB` (section keys such as `comparison`, `faq`, `problem`) |

A winner can only be declared when every variant reaches the minimum sample **and** the difference is significant at 95% (two-proportion z-test, Bonferroni-corrected for >2 variants).
