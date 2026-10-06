/**
 * Apps Script runtime adapter for AH.createApi:
 * secrets (Script Properties), rate limiting + de-duplication (CacheService),
 * private error logging (ERROR_LOG sheet) and link checks (UrlFetchApp).
 */
function AppsScriptPlatform_(ss) {
  var cache = CacheService.getScriptCache();

  function bucketKey(key, windowSec) {
    return 'rl:' + key + ':' + Math.floor(Date.now() / (windowSec * 1000));
  }

  return {
    now: function () { return Date.now(); },

    getAdminToken: function () {
      return PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
    },

    // CacheService has no atomic increment; under heavy concurrency counts may be slightly
    // low, which is acceptable for abuse protection on a single-owner tool.
    hit: function (key, windowSec) {
      var k = bucketKey(key, windowSec);
      var n = Number(cache.get(k) || 0) + 1;
      cache.put(k, String(n), Math.min(21600, windowSec + 5));
      return n;
    },

    count: function (key, windowSec) {
      return Number(cache.get(bucketKey(key, windowSec)) || 0);
    },

    seen: function (key, ttlSec) {
      var k = 'seen:' + key;
      if (cache.get(k)) return true;
      cache.put(k, '1', Math.max(1, Math.min(21600, ttlSec)));
      return false;
    },

    logError: function (err, context) {
      console.error(err && err.stack ? err.stack : err, context);
      try {
        new SheetStore_(ss || getSpreadsheet_()).append('ERROR_LOG', {
          id: AH.util.newId('err'),
          ts: new Date().toISOString(),
          code: 'INTERNAL_ERROR',
          message: String(err && err.message || err).slice(0, 1000),
          context: JSON.stringify(context || {}).slice(0, 1000)
        });
      } catch (ignored) { /* logging must never throw */ }
    },

    checkUrl: function (url) {
      try {
        var res = UrlFetchApp.fetch(url, {
          method: 'get',
          muteHttpExceptions: true,
          followRedirects: false,
          validateHttpsCertificates: true,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AffiliateCampaignHub-LinkCheck/1.0)' }
        });
        return { code: res.getResponseCode() };
      } catch (err) {
        return { code: 0, error: String(err && err.message || err).slice(0, 200) };
      }
    }
  };
}
