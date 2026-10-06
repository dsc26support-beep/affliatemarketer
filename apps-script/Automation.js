/**
 * Administrative automation only. Nothing here publishes content, posts to social
 * networks, emails subscribers or changes offers — those always need human approval.
 *
 *   installTriggers()    daily link check + weekly summary to the owner
 *   removeTriggers()     remove them again
 *   runLinkCheck()       check active affiliate links, email the owner about broken ones
 *   sendWeeklySummary()  analytics summary, stale campaigns and recommendations
 */

var TRIGGER_HANDLERS_ = ['runLinkCheck', 'sendWeeklySummary'];

function installTriggers() {
  removeTriggers();
  ScriptApp.newTrigger('runLinkCheck').timeBased().everyDays(1).atHour(6).create();
  ScriptApp.newTrigger('sendWeeklySummary').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();
  Logger.log('Installed triggers: daily link check (06:00), weekly summary (Mon 07:00).');
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (TRIGGER_HANDLERS_.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
}

function adminCall_(action, payload) {
  var token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  return getApi_().handle({ action: action, token: token, payload: payload || {} });
}

function ownerEmail_(settings) {
  return (settings && settings.alertEmail) || Session.getEffectiveUser().getEmail();
}

function runLinkCheck() {
  var res = adminCall_('checkLinks', {});
  if (!res.success) { console.error('Link check failed', res.error); return; }
  var broken = res.data.checked.filter(function (c) { return c.status === 'broken'; });
  if (!broken.length) return;
  var settings = adminCall_('getSettings', {}).data.settings;
  var links = adminCall_('getLinks', {}).data.links;
  var lines = broken.map(function (b) {
    var l = links.filter(function (x) { return x.id === b.id; })[0] || {};
    return '- ' + (l.label || b.id) + ' → HTTP ' + b.code + '\n  ' + (l.url || '');
  });
  MailApp.sendEmail(ownerEmail_(settings), '[Affiliate Hub] ' + broken.length + ' broken affiliate link(s)',
    'The daily check found broken affiliate links. Visitors clicking them cannot reach the offer.\n\n' + lines.join('\n') +
    '\n\nOpen the Links page in your dashboard to fix or deactivate them.');
}

function sendWeeklySummary() {
  var to = new Date();
  var from = new Date(to.getTime() - 7 * 86400000);
  var res = adminCall_('getDashboard', { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
  if (!res.success) { console.error('Summary failed', res.error); return; }
  var d = res.data;
  var t = d.summary.totals;
  var pct = function (x) { return x === null ? '—' : (x * 100).toFixed(1) + '%'; };
  var body = [
    'Affiliate Campaign Hub — last 7 days',
    '',
    'Visitors: ' + t.views + ' (' + t.sessions + ' sessions)',
    'Affiliate clicks: ' + t.clicks + ' · CTR ' + pct(t.ctr),
    'Conversions: ' + (t.conversions === null ? 'none recorded' : t.conversions) + (t.revenue === null ? '' : ' · Revenue ' + t.revenue.toFixed(2)),
    '',
    'Active campaigns: ' + d.counts.activeCampaigns + ' · Published pages: ' + d.counts.publishedPages + ' · Draft pages: ' + d.counts.draftPages,
    'Broken links: ' + d.counts.brokenLinks,
    '',
    'Recommendations:'
  ].concat(d.recommendations.slice(0, 10).map(function (r) { return '- [' + r.level + '] ' + r.title + ' — ' + r.evidence; }));
  if (!d.recommendations.length) body.push('- Nothing to act on.');
  body.push('', 'Reminder: decisions need enough data. Nothing was published or sent automatically.');
  MailApp.sendEmail(ownerEmail_(d.settings), '[Affiliate Hub] Weekly summary', body.join('\n'));
}
