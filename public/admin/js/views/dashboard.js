/* Dashboard: KPIs, workflow progress, performance groups, recommendations. */
(function () {
  'use strict';
  var esc = UI.esc;

  Views.dashboard = function (el, ctx) {
    var range = Number(ctx.query.days) || 30;
    return UI.load(el, ctx, 'getDashboard', { from: UI.daysAgo(range), to: UI.daysAgo(0) }).then(function (d) {
      if (!d) return;
      var t = d.summary.totals;
      var c = d.counts;
      var hasConv = d.summary.hasConversionData;

      // Workflow progress: which steps already have data?
      var done = [
        c.offers > 0,
        d.products.some(function (p) { return p.scoreConfidence >= 50; }),
        c.campaigns > 0,
        c.publishedPages > 0 || c.draftPages > 0,
        false, false,
        t.views > 0,
        false
      ];
      var nextIdx = done.indexOf(false);
      var steps = UI.workflow.map(function (s, i) {
        var cls = done[i] ? 'done' : i === nextIdx ? 'next' : '';
        return '<li class="' + cls + '"><a href="' + s[1] + '" style="color:inherit;text-decoration:none">' + esc(s[0]) + '</a></li>';
      }).join('');

      var cards = [
        ['Offers', UI.num(c.offers), c.campaigns + ' campaigns'],
        ['Active campaigns', UI.num(c.activeCampaigns), c.publishedPages + ' live pages'],
        ['Visitors', UI.num(t.views), UI.num(t.sessions) + ' sessions'],
        ['Affiliate clicks', UI.num(t.clicks), 'last ' + range + ' days'],
        ['CTR', UI.pct(t.ctr), 'clicks ÷ visits'],
        ['Conversions', hasConv ? UI.num(t.conversions) : '—', hasConv ? 'from your network reports' : 'none recorded yet'],
        ['Revenue', hasConv ? UI.money(t.revenue) : '—', hasConv ? 'EPC ' + UI.money(t.epc) : 'record in Analytics']
      ].map(function (x) { return '<div class="card"><div class="label">' + esc(x[0]) + '</div><div class="value">' + x[1] + '</div><div class="hint">' + esc(x[2]) + '</div></div>'; }).join('');

      function group(title, rows, status, emptyText) {
        return '<div class="panel"><h2>' + UI.badge(status, title) + '</h2>' + (rows.length ? '<ul class="list">' + rows.slice(0, 6).map(function (r) {
          var href = r.kind === 'campaign' ? '#/campaigns/' + r.id : '#/pages/' + r.id;
          return '<li><a href="' + href + '">' + esc(r.name) + '</a><div class="small muted">' + esc(r.reason || '') + '</div></li>';
        }).join('') + '</ul>' : '<p class="muted small">' + esc(emptyText) + '</p>') + '</div>';
      }

      var offers = d.products.filter(function (p) { return p.status !== 'archived'; }).slice(0, 8);
      var offerTable = UI.table([
        { label: 'Offer', render: function (p) { return '<a href="#/offers/' + p.id + '">' + esc(p.name || '(unnamed draft)') + '</a>'; } },
        { label: 'Network', render: function (p) { return esc(UI.networkLabel(p.network)); } },
        { label: 'Score', render: function (p) { return UI.scoreBadge(p); } },
        { label: 'Status', render: function (p) { return UI.badge(p.status); } }
      ], offers, 'No offers yet.');

      el.innerHTML =
        '<div class="page-head"><div><h1>Dashboard</h1><p class="sub">Last ' + range + ' days · ' + (Backend.isDemo() ? 'demo data in this browser' : 'live data from Google Sheets') + '</p></div>' +
        '<div class="actions"><select id="range" aria-label="Date range">' + [7, 30, 90, 365].map(function (n) { return '<option value="' + n + '"' + (n === range ? ' selected' : '') + '>Last ' + n + ' days</option>'; }).join('') + '</select>' +
        '<a class="btn primary" href="#/offers/new">+ Add offer</a></div></div>' +
        (c.offers === 0 ? '<div class="panel">' + UI.empty('Start with one good offer', 'Paste a Digistore24 or ClickBank affiliate offer, score it honestly and build one genuinely useful campaign. Quality beats quantity.',
          '<div class="actions" style="justify-content:center"><a class="btn primary" href="#/offers/new">Add your first offer</a>' + (Backend.isDemo() ? '<button class="btn" id="sample">Load a sample offer</button>' : '') + '</div>') + '</div>' : '') +
        '<div class="panel"><h2>Workflow</h2><ol class="steps">' + steps + '</ol></div>' +
        '<div class="cards cards-7">' + cards + '</div>' +
        '<div class="grid grid-3">' +
        group('BEST PERFORMERS', d.summary.groups.best, 'best', 'No page has enough data to be called a winner yet.') +
        group('NEEDS ATTENTION', d.summary.groups.attention, 'attention', 'Nothing needs attention right now.') +
        group('NOT ENOUGH DATA', d.summary.groups.notEnough, 'not_enough', 'No tracked pages below the data threshold.') +
        '</div>' +
        '<div class="grid grid-2"><div class="panel"><h2>Recommendations</h2>' + UI.recommendations(d.recommendations) + '</div>' +
        '<div class="panel"><h2>Offers</h2>' + offerTable + (c.brokenLinks ? '<p class="issue error">' + c.brokenLinks + ' broken affiliate link(s). <a href="#/links">Fix now</a></p>' : '') + '</div></div>' +
        '<p class="small muted">Scores and recommendations organise your judgement and your recorded data. They never predict income.</p>';

      el.querySelector('#range').addEventListener('change', function (ev) { location.hash = '#/dashboard?days=' + ev.target.value; });
      var sample = el.querySelector('#sample');
      if (sample) sample.addEventListener('click', function () {
        UI.busy(sample, function () {
          return UI.act('createProduct', Backend.SAMPLE_OFFER).then(function (r) { if (r) location.hash = '#/offers/' + r.product.id; });
        });
      });
    });
  };
})();
