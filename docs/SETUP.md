# Setup & deployment

Total time: about 20 minutes. Cost: free (Google account + GitHub, optionally Cloudflare).

## 0. Try it first (no setup)

```bash
npm run serve            # http://localhost:8080/admin/
```

The dashboard starts in **Demo mode**: the full app runs in your browser and data stays in this browser's storage. Click **Load a sample offer** and go through the workflow. Switch to Google Sheets when you are ready.

---

## 1. Google Sheets + Apps Script backend

1. Create a new Google Sheet, e.g. "Affiliate Hub DB".
2. In the sheet: **Extensions → Apps Script**. This creates a *bound* script.
3. Add the project files using **one** of these options:
   - **clasp (recommended)**
     ```bash
     npm i -g @google/clasp && clasp login
     cp apps-script/.clasp.json.example apps-script/.clasp.json   # paste the Script ID (Project Settings → IDs)
     cd apps-script && clasp push
     ```
   - **Copy/paste:** for every `.js` file in `apps-script/`, create a script file with the same name and paste the content. Then replace `appsscript.json`: Project Settings → "Show appsscript.json in editor".
4. In the editor, select the function **`setup`** and click **Run**. Grant the permissions.
   - This creates every tab with headers (see [SHEETS_SCHEMA.md](SHEETS_SCHEMA.md)).
   - It creates a random **admin token** and saves it in Script Properties.
   - Open **Execution log** and copy the token. You can print it again later with `showAdminToken()`.
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (public pages must be able to send tracking events; admin actions still need the token)
   - Copy the **Web app URL** (ends in `/exec`).
6. Optional: run **`installTriggers()`** to turn on the daily broken-link check and the weekly summary email (sent to you only).

**After changing backend code:** run `npm run build`, then `clasp push`. Then **Deploy → Manage deployments → Edit → New version**, so the same URL serves the new code.

### Secrets

| Secret | Where it lives | Never |
|---|---|---|
| `ADMIN_TOKEN` | Apps Script → Project Settings → Script Properties | in GitHub, in URLs, in `config.js` |
| `SPREADSHEET_ID` | Script Properties (set by `setup()`) | — |

Rotate the token any time with `rotateAdminToken()`.

---

## 2. Connect the dashboard

1. Open `/admin/` → **Settings → Connection**.
2. Data source: **Google Sheets via Apps Script**. Paste the web app URL and the admin token, then click **Test connection**.
   - The token is kept for this browser session. Tick "Remember" only on a private device.
3. Under **Site, author & compliance**, set:
   - Site URL, e.g. `https://USER.github.io/REPO`
   - Public API URL (the same web app URL)
   - Author name and bio
   - Privacy, Terms, Disclosure and Contact URLs (templates are in `public/*.html` — edit them first)
4. Optionally put the web app URL in `public/config.js` (`apiUrl`). It is public, not secret. The home page uses it to list guides.

---

## 3. Host the static site

### GitHub Pages (included workflow)

1. Push to GitHub. **Settings → Pages → Source: GitHub Actions**.
2. The workflow `.github/workflows/pages.yml` runs the tests and deploys `public/` on every push to `main`.
3. Your site will be at `https://USER.github.io/REPO/`. The dashboard is at `/admin/`.

### Cloudflare Pages (alternative)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Build command: `npm run build` (or leave empty; generated files are committed). Output directory: `public`.
3. Optional: add `public/_headers` for caching, e.g. `/assets/*  Cache-Control: public, max-age=86400`.

---

## 4. Publishing a landing page

1. Build the page in **Landing Pages**: fill every `[[placeholder]]` and fix all "Must fix" items.
2. Tick the review statement and click **Publish**.
3. Click **Export static HTML** and commit the file to `public/p/<slug>.html`. Push.
4. **Landing Pages → Download sitemap.xml** → commit to `public/sitemap.xml`. Add `Sitemap: https://…/sitemap.xml` to `public/robots.txt`, then submit the sitemap in Google Search Console.
5. Share links built in the editor's **Tracking links** tab (UTM-tagged).

Until step 3 is done, `/p/<slug>.html` falls back to the live viewer. That works for sharing, but it is marked noindex.

---

## 5. Recording results

- **Conversions/revenue:** copy them from your Digistore24/ClickBank reports into **Analytics → Record conversions**. The app never estimates them.
- **Email results:** enter clicks, conversions and unsubscribes from your email provider into each email draft.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `BAD_RESPONSE` / HTML instead of JSON | The web app access is not "Anyone", or you used the `/dev` URL. Use `/exec`. |
| `UNAUTHORIZED` | The token is wrong or was rotated. Run `showAdminToken()`. |
| `TIMEOUT` | Apps Script cold start. Retry, or raise the timeout in Settings. |
| `Missing sheet …` in ERROR_LOG | Run `setup()` again (safe). |
| No page views recorded | Check: the Public API URL is set before export; the page is published; the browser isn't sending Do-Not-Track/GPC; consent was given if consent is required. |
