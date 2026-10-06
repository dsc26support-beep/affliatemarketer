/**
 * Affiliate Campaign Hub — Apps Script web app entry points.
 *
 * Deploy as a web app: Execute as "Me", access "Anyone" (public tracking endpoints need
 * anonymous access; admin actions are protected by the ADMIN_TOKEN script property).
 *
 * The frontend POSTs `text/plain` JSON ({ action, token, payload }) so browsers send a
 * "simple" CORS request without a preflight (Apps Script cannot answer OPTIONS).
 */

var MAX_BODY_BYTES_ = 250000;
// Only harmless, public actions may be called with GET (never put the admin token in a URL).
var GET_ACTIONS_ = ['ping', 'getPublicLandingPage', 'getPublicPages'];

function doPost(e) {
  var raw = (e && e.postData && e.postData.contents) || '';
  if (raw.length > MAX_BODY_BYTES_) {
    return json_({ success: false, error: { code: 'INVALID_REQUEST', message: 'Request body is too large.' } });
  }
  var body;
  try {
    body = JSON.parse(raw);
  } catch (err) {
    return json_({ success: false, error: { code: 'INVALID_REQUEST', message: 'Request body must be valid JSON.' } });
  }
  return json_(getApi_().handle(body));
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || 'ping';
  if (action === 'sitemap') return sitemap_();
  if (GET_ACTIONS_.indexOf(action) === -1) {
    return json_({ success: false, error: { code: 'INVALID_REQUEST', message: 'Use POST for this action.' } });
  }
  var payload = {};
  Object.keys(params).forEach(function (k) {
    if (k !== 'action' && k !== 'token') payload[k] = String(params[k]).slice(0, 500);
  });
  return json_(getApi_().handle({ action: action, payload: payload }));
}

/** Public XML sitemap of published pages: <web-app-url>?action=sitemap */
function sitemap_() {
  try {
    var store = new SheetStore_(getSpreadsheet_());
    var api = AH.createApi({ store: store, platform: AppsScriptPlatform_() });
    var xml = AH.seo.sitemap(store.list('LANDING_PAGES'), api.getSettings(), ['/']);
    return ContentService.createTextOutput(xml).setMimeType(ContentService.MimeType.XML);
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')
      .setMimeType(ContentService.MimeType.XML);
  }
}

function getApi_() {
  var ss = getSpreadsheet_();
  return AH.createApi({ store: new SheetStore_(ss), platform: AppsScriptPlatform_(ss) });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run an admin action from the Apps Script editor (handy for debugging), e.g.
 *   runAction_('getDashboard', {})
 */
function runAction_(action, payload) {
  var token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  var res = getApi_().handle({ action: action, token: token, payload: payload || {} });
  Logger.log(JSON.stringify(res, null, 2).slice(0, 5000));
  return res;
}
