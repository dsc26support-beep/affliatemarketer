/* Settings: backend connection, site/compliance settings, thresholds, data export. */
(function () {
  'use strict';
  Views.settings = function (el, ctx) {
    var cfg = Backend.config();
    return UI.load(el, ctx, 'getSettings').then(function (d) {
      if (!ctx.isCurrent()) return;
      var s = d ? d.settings : AH.schema.DEFAULT_SETTINGS;
      var connected = !!d;
      // When loading fails we still render the connection form so it can be fixed.
      var connHtml = '<form id="conn" class="panel"><h2>Connection</h2>' +
        '<div class="form cols-2">' +
        UI.field({ name: 'mode', label: 'Data source', type: 'select', value: cfg.mode, options: [['demo', 'Demo — this browser only (localStorage)'], ['remote', 'Google Sheets via Apps Script']] }) +
        UI.field({ name: 'timeoutMs', label: 'Request timeout (ms)', type: 'number', value: cfg.timeoutMs }) +
        UI.field({ name: 'apiUrl', label: 'Apps Script web app URL', type: 'url', value: cfg.apiUrl, span: true, placeholder: 'https://script.google.com/macros/s/…/exec' }) +
        UI.field({ name: 'token', label: 'Admin token', type: 'password', value: cfg.token, span: true, help: 'From the Apps Script log after running setup(). Stored only in this browser — never in the repository.', attrs: 'autocomplete="off"' }) +
        UI.field({ name: 'rememberToken', label: 'Remember the token on this device (only on a private, trusted device)', type: 'checkbox', value: cfg.rememberToken, span: true }) +
        '</div><div class="actions" style="margin-top:10px"><button class="btn primary" type="submit">Save connection</button><button class="btn" type="button" id="test">Test connection</button>' +
        (Backend.isDemo() ? '<button class="btn danger" type="button" id="reset">Reset demo data</button>' : '') + '</div></form>';

      var siteHtml = '<form id="site" class="panel"><h2>Site, author &amp; compliance</h2><div class="form cols-2">' +
        UI.field({ name: 'siteName', label: 'Site name', value: s.siteName }) +
        UI.field({ name: 'siteUrl', label: 'Site URL', type: 'url', value: s.siteUrl, help: 'e.g. https://you.github.io/repo — used for canonical URLs and the sitemap.' }) +
        UI.field({ name: 'apiUrl', label: 'Public API URL for tracking', type: 'url', value: s.apiUrl, help: 'Usually the same Apps Script web app URL. Embedded in exported pages.' }) +
        UI.field({ name: 'authorName', label: 'Author name', value: s.authorName }) +
        UI.field({ name: 'authorBio', label: 'Author bio (who you are, how you evaluate products)', type: 'textarea', rows: 3, value: s.authorBio, span: true }) +
        UI.field({ name: 'disclosureText', label: 'Affiliate disclosure (shown at the top of every page)', type: 'textarea', rows: 3, value: s.disclosureText, span: true }) +
        UI.field({ name: 'privacyUrl', label: 'Privacy policy URL', type: 'url', value: s.privacyUrl }) +
        UI.field({ name: 'termsUrl', label: 'Terms URL', type: 'url', value: s.termsUrl }) +
        UI.field({ name: 'disclosureUrl', label: 'Disclosure page URL', type: 'url', value: s.disclosureUrl }) +
        UI.field({ name: 'contactUrl', label: 'Contact page URL', type: 'url', value: s.contactUrl }) +
        UI.field({ name: 'contactEmail', label: 'Contact email', type: 'email', value: s.contactEmail }) +
        UI.field({ name: 'alertEmail', label: 'Alert email (link checks, weekly summary)', type: 'email', value: s.alertEmail }) +
        UI.field({ name: 'respectDoNotTrack', label: 'Respect Do-Not-Track / Global Privacy Control', type: 'checkbox', value: s.respectDoNotTrack }) +
        UI.field({ name: 'requireTrackingConsent', label: 'Ask for consent before analytics (recommended for EU/UK visitors)', type: 'checkbox', value: s.requireTrackingConsent }) +
        '</div><h3>Decision thresholds</h3><div class="form cols-2">' +
        UI.field({ name: 'minViewsForDecision', label: 'Minimum visits before judging a page', type: 'number', value: s.minViewsForDecision }) +
        UI.field({ name: 'lowCtrThreshold', label: 'Low CTR threshold (0.02 = 2%)', type: 'number', step: '0.001', value: s.lowCtrThreshold }) +
        UI.field({ name: 'abMinSamplePerVariant', label: 'A/B minimum visits per variant', type: 'number', value: s.abMinSamplePerVariant }) +
        UI.field({ name: 'staleCampaignDays', label: 'Stale campaign after (days)', type: 'number', value: s.staleCampaignDays }) +
        UI.field({ name: 'defaultCurrency', label: 'Default currency', value: s.defaultCurrency }) +
        UI.field({ name: 'extraAllowedDomains', label: 'Extra allowed link domains (comma-separated)', value: s.extraAllowedDomains, help: 'Defaults: ' + AH.validate.allowedDomains('digistore24').concat(AH.validate.allowedDomains('clickbank')).join(', ') }) +
        '</div><div class="actions" style="margin-top:10px"><button class="btn primary" type="submit"' + (connected ? '' : ' disabled') + '>Save settings</button></div></form>';

      var dataHtml = '<div class="panel"><h2>Data</h2><p class="small muted">Download a JSON backup of every table (your Google Sheet is the primary copy).</p><button class="btn" id="export"' + (connected ? '' : ' disabled') + '>Export all data (JSON)</button></div>';

      var errorPart = connected ? '' : '<p class="issue error">Could not load settings from the current data source. Fix the connection below.</p>';
      el.innerHTML = '<div class="page-head"><div><h1>Settings</h1><p class="sub">Secrets stay out of GitHub: the admin token lives in Apps Script Script Properties and in this browser only.</p></div></div>' + errorPart + connHtml + siteHtml + dataHtml;

      var conn = el.querySelector('#conn');
      conn.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = UI.formData(conn);
        if (f.mode === 'remote' && !/^https:\/\/script\.google(usercontent)?\.com\//.test(f.apiUrl)) {
          UI.showFieldErrors(conn, { apiUrl: 'Use your Apps Script web app URL (https://script.google.com/macros/s/…/exec).' });
          return;
        }
        Backend.saveConfig(f);
        App.updateModeBadge();
        UI.toast('Connection saved', 'ok');
        ctx.rerender();
      });
      el.querySelector('#test').addEventListener('click', function (ev) {
        UI.busy(ev.target, function () {
          Backend.saveConfig(UI.formData(conn));
          App.updateModeBadge();
          return Backend.call('verifyToken', {}).then(function (r) {
            if (r.success) { UI.toast('Connected — the token is valid.', 'ok'); ctx.rerender(); } else UI.apiError(r);
          });
        });
      });
      var reset = el.querySelector('#reset');
      if (reset) reset.addEventListener('click', function () {
        UI.confirm('Delete all demo data stored in this browser?', 'Reset').then(function (y) { if (y) { Backend.resetDemo(); UI.toast('Demo data cleared', 'ok'); location.hash = '#/dashboard'; } });
      });
      el.querySelector('#site').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = UI.formData(ev.target);
        f.defaultCurrency = String(f.defaultCurrency || '').toUpperCase();
        UI.busy(ev.target.querySelector('[type=submit]'), function () {
          return UI.act('saveSettings', f, ev.target).then(function (r) { if (r) UI.toast('Settings saved', 'ok'); });
        });
      });
      el.querySelector('#export').addEventListener('click', function (ev) {
        UI.busy(ev.target, function () {
          return UI.act('exportData').then(function (r) { if (r) UI.download('affiliate-hub-backup-' + r.exportedAt.slice(0, 10) + '.json', JSON.stringify(r, null, 2), 'application/json'); });
        });
      });
    });
  };
})();
