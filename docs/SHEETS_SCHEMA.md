# Google Sheets schema

The spreadsheet has **one tab per table**. Row 1 holds the column names. `setup()` creates the tabs and adds any missing columns. It never deletes data, so it is safe to re-run after an upgrade.

Rules:

- **Stable IDs.** Every record has an opaque ID such as `prd_m1x2k3_a8f3k2q9` (prefix = table). Product names are never used as keys.
- **Columns are matched by header name.** You may reorder columns or add your own extra columns; the app ignores unknown columns.
- **JSON columns** (plans, page sections, SEO, A/B variants) hold JSON text. Edit them in the dashboard, not by hand.
- **Formula protection.** Text starting with `= + - @` is written with a leading apostrophe, so it is never run as a formula.
- **Privacy.** Event tables store no names, emails or IP addresses. Referrers are stored as a host name only.
- **Source of truth:** `shared/02_schema.js`. This document mirrors it.

| Tab | Purpose |
|---|---|
| CONFIG | Settings (key → JSON value) |
| USERS | Reserved for multi-user support (single owner today) |
| PRODUCTS | Affiliate offers, score inputs, experience notes |
| CAMPAIGNS | Campaign strategy (plan A–L as JSON) |
| LANDING_PAGES | Page sections + SEO, status draft/published/archived |
| CONTENT | Content plan items (topic cluster) |
| SOCIAL_CONTENT | Social/video drafts |
| EMAIL_CAMPAIGNS | Email sequence drafts + manually entered results |
| AFFILIATE_LINKS | Link manager + link-check results |
| CLICK_EVENTS | Affiliate click events (append-only) |
| PAGE_VIEWS | Page view events (append-only) |
| CONVERSIONS | Conversions/revenue you copy from network reports |
| AB_TESTS | A/B tests and variants |
| LEADS | Consented email sign-ups |
| AUDIT_LOG | Who changed what (admin actions) |
| ERROR_LOG | Private technical errors (never shown to visitors) |

**Housekeeping:** Google Sheets handles hundreds of thousands of rows, but analytics reads are faster on smaller tabs. Once a year, move old rows from `PAGE_VIEWS` and `CLICK_EVENTS` to an archive spreadsheet.

## Columns

### CONFIG

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `key` | string | no | primary key |
| `value` | text | no |  |
| `updatedAt` | string | no |  |

### USERS

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `email` | string | yes | max 254 chars |
| `name` | string | yes | max 120 chars |
| `role` | enum | yes | one of: owner, editor, viewer |
| `createdAt` | string | no |  |
| `updatedAt` | string | no |  |

### PRODUCTS

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `network` | enum | yes | required once the offer leaves draft; one of: digistore24, clickbank |
| `affiliateUrl` | url | yes | required once the offer leaves draft; validated against network domain allowlist |
| `productPageUrl` | url | yes |  |
| `name` | string | yes | required once the offer leaves draft; max 160 chars |
| `category` | string | yes | max 120 chars |
| `niche` | string | yes | max 120 chars |
| `targetAudience` | text | yes | required once the offer leaves draft; max 1000 chars |
| `problem` | text | yes | required once the offer leaves draft; max 1000 chars |
| `mainBenefit` | text | yes | required once the offer leaves draft; max 1000 chars |
| `commissionInfo` | string | yes | max 300 chars |
| `commissionPercent` | number | yes | max 100 chars |
| `commissionAmount` | number | yes | max 100000 chars |
| `price` | number | yes | max 1000000 chars |
| `currency` | string | yes | max 3 chars |
| `recurring` | enum | yes | one of: unknown, yes, no |
| `recurringInfo` | string | yes | max 300 chars |
| `productType` | enum | yes | one of: digital_course, ebook, software, membership, physical, supplement, service, other |
| `refundPolicy` | string | yes | max 300 chars |
| `notes` | text | yes | max 5000 chars |
| `status` | enum | yes | one of: draft, researching, approved, active, paused, rejected, archived |
| `scoreInputs` | json | yes | JSON text |
| `score` | number | no |  |
| `scoreLabel` | string | no |  |
| `scoreConfidence` | number | no |  |
| `experienceNotes` | json | yes | JSON text |
| `createdAt` | string | no |  |
| `updatedAt` | string | no |  |

### CAMPAIGNS

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `productId` | ref | yes | required; max 64 chars |
| `name` | string | yes | required; max 160 chars |
| `status` | enum | yes | one of: draft, active, paused, completed, archived |
| `plan` | json | yes | JSON text |
| `notes` | text | yes | max 5000 chars |
| `createdAt` | string | no |  |
| `updatedAt` | string | no |  |

### LANDING_PAGES

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `campaignId` | ref | yes | required; max 64 chars |
| `productId` | ref | yes | max 64 chars |
| `linkId` | ref | yes | max 64 chars |
| `slug` | string | yes | required; max 80 chars |
| `pageType` | enum | yes | one of: review, comparison, problem_solution, buyer_guide |
| `title` | string | yes | max 160 chars |
| `status` | string | no |  |
| `seo` | json | yes | JSON text |
| `sections` | json | yes | JSON text |
| `approvedAt` | string | no |  |
| `publishedAt` | string | no |  |
| `createdAt` | string | no |  |
| `updatedAt` | string | no |  |

### CONTENT

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `campaignId` | ref | yes | required; max 64 chars |
| `productId` | ref | yes | max 64 chars |
| `type` | enum | yes | required; one of: review, comparison, alternatives, problem_solution, tutorial, buyer_guide, faq, case_study |
| `title` | string | yes | required; max 200 chars |
| `intent` | string | yes | max 60 chars |
| `clusterRole` | string | yes | max 60 chars |
| `outline` | json | yes | JSON text |
| `seo` | json | yes | JSON text |
| `requiresFirstHand` | bool | yes |  |
| `locked` | bool | yes |  |
| `status` | enum | yes | one of: idea, outlining, drafting, published, rejected |
| `notes` | text | yes | max 3000 chars |
| `createdAt` | string | no |  |
| `updatedAt` | string | no |  |

### SOCIAL_CONTENT

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `campaignId` | ref | yes | required; max 64 chars |
| `productId` | ref | yes | max 64 chars |
| `angle` | enum | yes | one of: problem, mistake, tip, comparison, tutorial, myth, faq, review, story, demonstration |
| `platforms` | json | yes | JSON text |
| `hook` | text | yes | max 500 chars |
| `problem` | text | yes | max 1000 chars |
| `value` | text | yes | max 2000 chars |
| `demonstration` | text | yes | max 1000 chars |
| `cta` | string | yes | max 300 chars |
| `disclosure` | string | yes | max 300 chars |
| `caption` | text | yes | max 2200 chars |
| `durationSec` | number | yes | max 600 chars |
| `requiresFirstHand` | bool | yes |  |
| `status` | enum | yes | one of: draft, approved, posted, rejected |
| `createdAt` | string | no |  |
| `updatedAt` | string | no |  |

### EMAIL_CAMPAIGNS

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `campaignId` | ref | yes | required; max 64 chars |
| `productId` | ref | yes | max 64 chars |
| `step` | number | yes | max 50 chars |
| `type` | enum | yes | one of: welcome, educational, problem, comparison, recommendation, follow_up |
| `sendDay` | number | yes | max 365 chars |
| `subject` | string | yes | max 200 chars |
| `body` | text | yes | max 10000 chars |
| `leadMagnet` | string | yes | max 200 chars |
| `status` | enum | yes | one of: draft, approved, sent, rejected |
| `clicks` | number | yes |  |
| `conversions` | number | yes |  |
| `unsubscribes` | number | yes |  |
| `createdAt` | string | no |  |
| `updatedAt` | string | no |  |

### AFFILIATE_LINKS

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `productId` | ref | yes | required; max 64 chars |
| `network` | enum | yes | one of: digistore24, clickbank |
| `url` | url | yes | required; validated against network domain allowlist |
| `label` | string | yes | max 120 chars |
| `campaignId` | ref | yes | max 64 chars |
| `pageId` | ref | yes | max 64 chars |
| `active` | bool | yes |  |
| `status` | string | no |  |
| `lastStatusCode` | number | no |  |
| `lastCheckedAt` | string | no |  |
| `notes` | text | yes | max 2000 chars |
| `createdAt` | string | no |  |
| `updatedAt` | string | no |  |

### CLICK_EVENTS

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `ts` | string | no |  |
| `linkId` | string | no |  |
| `productId` | string | no |  |
| `campaignId` | string | no |  |
| `pageId` | string | no |  |
| `ctaId` | string | no |  |
| `variant` | string | no |  |
| `sessionId` | string | no |  |
| `referrer` | string | no |  |
| `utmSource` | string | no |  |
| `utmMedium` | string | no |  |
| `utmCampaign` | string | no |  |
| `utmContent` | string | no |  |
| `utmTerm` | string | no |  |

### PAGE_VIEWS

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `ts` | string | no |  |
| `pageId` | string | no |  |
| `campaignId` | string | no |  |
| `productId` | string | no |  |
| `variant` | string | no |  |
| `sessionId` | string | no |  |
| `path` | string | no |  |
| `referrer` | string | no |  |
| `utmSource` | string | no |  |
| `utmMedium` | string | no |  |
| `utmCampaign` | string | no |  |
| `utmContent` | string | no |  |
| `utmTerm` | string | no |  |

### CONVERSIONS

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `date` | string | yes | required; max 10 chars |
| `productId` | ref | yes | required; max 64 chars |
| `campaignId` | ref | yes | max 64 chars |
| `pageId` | ref | yes | max 64 chars |
| `source` | string | yes | max 60 chars |
| `count` | number | yes | required; max 100000 chars |
| `revenue` | number | yes | max 10000000 chars |
| `currency` | string | yes | max 3 chars |
| `notes` | text | yes | max 1000 chars |
| `createdAt` | string | no |  |

### AB_TESTS

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `pageId` | ref | yes | required; max 64 chars |
| `campaignId` | ref | yes | max 64 chars |
| `name` | string | yes | required; max 160 chars |
| `element` | enum | yes | required; one of: headline, cta_text, cta_placement, page_structure, comparison_format, lead_magnet, content_angle |
| `hypothesis` | text | yes | max 1000 chars |
| `variants` | json | yes | required; JSON text |
| `status` | enum | yes | one of: draft, running, stopped, completed |
| `minSamplePerVariant` | number | yes | max 100000 chars |
| `winner` | string | yes | max 10 chars |
| `startedAt` | string | no |  |
| `endedAt` | string | no |  |
| `createdAt` | string | no |  |
| `updatedAt` | string | no |  |

### LEADS

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `ts` | string | no |  |
| `email` | string | no |  |
| `consent` | bool | no |  |
| `consentText` | string | no |  |
| `pageId` | string | no |  |
| `campaignId` | string | no |  |
| `leadMagnet` | string | no |  |
| `status` | string | no |  |
| `createdAt` | string | no |  |
| `updatedAt` | string | no |  |

### AUDIT_LOG

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `ts` | string | no |  |
| `action` | string | no |  |
| `entity` | string | no |  |
| `entityId` | string | no |  |
| `details` | text | no |  |

### ERROR_LOG

| Column | Type | Editable via API | Notes |
|---|---|---|---|
| `id` | string | no | primary key |
| `ts` | string | no |  |
| `code` | string | no |  |
| `message` | text | no |  |
| `context` | text | no |  |
