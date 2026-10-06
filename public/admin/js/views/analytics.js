/* Analytics: KPIs, performance tables, A/B results, conversions entry, recommendations. */
(function () {
  'use strict';
  var esc = UI.esc;

  Views.analytics = function (el, ctx) {
    var q = ctx.query;
    var from = q.from || UI.daysAgo(30), to = q.to || UI.daysAgo(0);
    var payload = { from: from, to: to };
    if (q.campaignId) payload.campaignId = q.campaignId;
    return Promise.all([
      UI.load(el, ctx, 'getAnalytics', payload),
      Backend.call('getCampaigns').then(function (r) { return r.success ? r.data : { campaigns: [], products: [], pages: [] }; })
    ]).then(function (res) {
      var d = res[0], meta = res[1];
      if (!d) return;
      var s = d.summary, t = s.totals;
      var maxDay = Math.max.apply(null, [1].concat(s.daily.map(function (x) { return x.views; })));
      var chart = s.daily.length ? '<div class="bars" role="img" aria-label="Daily visits">' + s.daily.map(function (x) {
        return '<span title="' + esc(x.date + ': ' + x.views + ' visits, ' + x.clicks + ' clicks') + '" style="height:' + Math.max(2, Math.round(x.views / maxDay * 100)) + '%"></span>';
      }).join('') + '</div><div class="legend"><span>' + esc(s.daily[0].date) + '</span><span>' + esc(s.daily[s.daily.length - 1].date) + '</span></div>' : '<p class="muted">No visits in this period.</p>';

      var cards = [['Visitors', UI.num(t.views)], ['Sessions', UI.num(t.sessions)], ['Affiliate clicks', UI.num(t.clicks)], ['CTR', UI.pct(t.ctr)],
        ['Conversions', s.hasConversionData ? UI.num(t.conversions) : '—'], ['Conv. rate', s.hasConversionData ? UI.pct(t.conversionRate) : '—'],
        ['Revenue', s.hasConversionData ? UI.money(t.revenue) : '—'], ['EPC', s.hasConversionData ? UI.money(t.epc) : '—']]
        .map(function (x) { return '<div class="card"><div class="label">' + x[0] + '</div><div class="value">' + x[1] + '</div></div>'; }).join('');

      var abHtml = d.abResults.length ? d.abResults.map(function (x) {
        return '<li><strong>' + esc(x.test.name) + '</strong> ' + UI.badge(x.test.status) + ' ' + UI.badge(x.result.state, UI.label(x.result.state)) +
          '<div class="small">' + x.result.variants.map(function (v) { return esc(v.id) + ': ' + v.views + ' visits, CTR ' + UI.pct(v.ctr, 2); }).join(' · ') + '</div>' +
          '<div class="small muted">' + esc(x.result.message) + ' <a href="#/pages/' + x.test.pageId + '?tab=ab">Open</a></div></li>';
      }).join('') : '';

      var prodOpts = meta.products.map(function (p) { return [p.id, p.name || p.id]; });
      el.innerHTML =
        '<div class="page-head"><div><h1>Analytics</h1><p class="sub">Recorded data only. Conversions and revenue come from the numbers you enter from your network reports.</p></div></div>' +
        '<form class="panel actions" id="af">' +
        '<label class="small">From <input type="date" name="from" value="' + esc(from) + '"></label><label class="small">To <input type="date" name="to" value="' + esc(to) + '"></label>' +
        '<select name="campaignId" aria-label="Campaign"><option value="">All campaigns</option>' + meta.campaigns.map(function (c) { return '<option value="' + c.id + '"' + (c.id === q.campaignId ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
        '<button class="btn" type="submit">Apply</button></form>' +
        '<div class="cards">' + cards + '</div>' +
        '<div class="panel"><h2>Daily visits</h2>' + chart + '</div>' +
        '<div class="panel"><h2>Landing-page performance</h2>' + UI.table(UI.perfCols(function (r) { return '<a href="#/pages/' + r.id + '">' + esc(r.name) + '</a>'; }), s.byPage, 'No page data yet.') + '</div>' +
        '<div class="grid grid-2"><div class="panel"><h2>Campaigns</h2>' + UI.table(UI.perfCols(function (r) { return '<a href="#/campaigns/' + r.id + '">' + esc(r.name) + '</a>'; }).slice(0, 5).concat([UI.perfCols()[8]]), s.byCampaign, 'No campaign data yet.') + '</div>' +
        '<div class="panel"><h2>Traffic sources</h2>' + UI.table([
          { label: 'Source', render: function (r) { return esc(r.name) + (r.medium ? ' <span class="small muted">/ ' + esc(r.medium) + '</span>' : '') + (r.social ? ' <span class="badge">social</span>' : ''); } },
          { label: 'Visits', num: true, render: function (r) { return UI.num(r.views); } },
          { label: 'Clicks', num: true, render: function (r) { return UI.num(r.clicks); } },
          { label: 'CTR', num: true, render: function (r) { return UI.pct(r.ctr); } }
        ], s.bySource, 'No traffic yet.') + '<h3>Clicks by CTA position</h3>' + UI.table([
          { label: 'CTA', render: function (r) { return esc(UI.label(r.name)); } }, { label: 'Clicks', num: true, render: function (r) { return UI.num(r.clicks); } }
        ], s.byCta, 'No clicks yet.') + '</div></div>' +
        '<div class="grid grid-2"><div class="panel"><h2>Recommendations</h2>' + UI.recommendations(d.recommendations) + '</div>' +
        '<div class="panel"><h2>A/B tests</h2>' + (abHtml ? '<ul class="list">' + abHtml + '</ul>' : '<p class="muted">No running or finished tests.</p>') + '</div></div>' +
        '<div class="panel"><h2>Record conversions</h2><p class="small muted">Copy sales and commissions from your Digistore24 / ClickBank reports. Never estimate.</p>' +
        '<form id="cf" class="form cols-2">' +
        UI.field({ name: 'date', label: 'Date', type: 'date', value: UI.daysAgo(0) }) +
        UI.field({ name: 'productId', label: 'Offer', type: 'select', options: prodOpts }) +
        UI.field({ name: 'campaignId', label: 'Campaign (optional)', type: 'select', value: q.campaignId || '', options: [['', '—']].concat(meta.campaigns.map(function (c) { return [c.id, c.name]; })) }) +
        UI.field({ name: 'count', label: 'Number of sales', type: 'number', value: 1 }) +
        UI.field({ name: 'revenue', label: 'Commission earned', type: 'number', step: '0.01', value: '' }) +
        UI.field({ name: 'currency', label: 'Currency', value: 'USD' }) +
        UI.field({ name: 'notes', label: 'Notes', span: true, value: '' }) +
        '<div class="actions span-2"><button class="btn primary" type="submit"' + (prodOpts.length ? '' : ' disabled') + '>Record</button></div></form>' +
        '<h3>Recorded conversions</h3>' + UI.table([
          { label: 'Date', render: function (c) { return esc(c.date); } },
          { label: 'Offer', render: function (c) { var p = meta.products.filter(function (x) { return x.id === c.productId; })[0]; return esc(p ? p.name : c.productId); } },
          { label: 'Sales', num: true, render: function (c) { return UI.num(c.count); } },
          { label: 'Revenue', num: true, render: function (c) { return UI.money(c.revenue, c.currency); } },
          { label: '', render: function (c) { return '<button class="btn small danger" data-del="' + c.id + '">Delete</button>'; } }
        ], AH.util.sortBy(d.conversions, function (c) { return c.date; }, true).slice(0, 50), 'None recorded.') + '</div>';

      el.querySelector('#af').addEventListener('submit', function (ev) {
        ev.preventDefault();
        location.hash = '#/analytics?' + AH.util.buildQuery(UI.formData(ev.target));
      });
      el.querySelector('#cf').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = UI.formData(ev.target);
        f.currency = String(f.currency || '').toUpperCase();
        UI.busy(ev.target.querySelector('[type=submit]'), function () {
          return UI.act('recordConversion', f, ev.target).then(function (r) { if (r) { UI.toast('Conversion recorded', 'ok'); ctx.rerender(); } });
        });
      });
      UI.on(el, '[data-del]', 'click', function (ev, b) {
        UI.confirm('Delete this conversion record?', 'Delete').then(function (y) { if (y) UI.act('deleteConversion', { id: b.getAttribute('data-del') }).then(function (r) { if (r) ctx.rerender(); }); });
      });
    });
  };
})();
