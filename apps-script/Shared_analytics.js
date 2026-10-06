/* GENERATED FILE — do not edit. Source: /shared. Run `npm run build`. */
/*
 * Affiliate Campaign Hub — analytics + A/B test evaluation.
 *
 * Only aggregates recorded events. Conversions/revenue come exclusively from data the
 * user records (network reports); when absent, metrics are null — never estimated.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.analytics = (function () {
  var SOCIAL_SOURCES = /^(tiktok|instagram|ig|youtube|yt|facebook|fb|pinterest|x|twitter|threads|reddit|linkedin)$/i;

  function ratio(a, b) { return b ? a / b : null; }

  function inRange(ts, from, to) {
    var d = AH.util.dateKey(ts);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  function sourceOf(e) {
    if (e.utmSource) return String(e.utmSource).toLowerCase();
    if (e.referrer) return String(e.referrer).toLowerCase().replace(/^www\./, '');
    return 'direct';
  }

  function isSocial(source, medium) {
    if (/social|video|reel|short/i.test(medium || '')) return true;
    var host = String(source || '').replace(/^(m|l|lm|www)\./, '').split('.')[0];
    return SOCIAL_SOURCES.test(host);
  }

  function newRow(id, name, extra) {
    var r = { id: id, name: name, views: 0, clicks: 0, conversions: null, revenue: null, _sessions: {} };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }

  function finish(row) {
    row.sessions = Object.keys(row._sessions).length;
    delete row._sessions;
    row.ctr = ratio(row.clicks, row.views);
    row.conversionRate = row.conversions === null ? null : ratio(row.conversions, row.clicks);
    row.epc = row.revenue === null ? null : ratio(row.revenue, row.clicks);
    return row;
  }

  /**
   * input: { pageViews, clicks, conversions, pages, campaigns, products, from, to, filter, settings }
   */
  function summarize(input) {
    var settings = input.settings || AH.schema.DEFAULT_SETTINGS;
    var filter = input.filter || {};
    var from = input.from || '';
    var to = input.to || '';
    function match(e) {
      if (!inRange(e.ts || e.date, from, to)) return false;
      if (filter.campaignId && e.campaignId !== filter.campaignId) return false;
      if (filter.productId && e.productId !== filter.productId) return false;
      if (filter.pageId && e.pageId !== filter.pageId) return false;
      return true;
    }
    var views = (input.pageViews || []).filter(match);
    var clicks = (input.clicks || []).filter(match);
    var convs = (input.conversions || []).filter(function (c) { return match({ ts: c.date, campaignId: c.campaignId, productId: c.productId, pageId: c.pageId }); });

    var pageById = index(input.pages), campById = index(input.campaigns), prodById = index(input.products);
    var groups = { page: {}, campaign: {}, product: {}, source: {}, cta: {}, daily: {} };
    var totals = newRow('all', 'All');

    function bucket(kind, id, name, extra) {
      if (!groups[kind][id]) groups[kind][id] = newRow(id, name, extra);
      return groups[kind][id];
    }
    function rowsFor(e) {
      var out = [totals];
      if (e.pageId) { var pg = pageById[e.pageId] || {}; out.push(bucket('page', e.pageId, pg.title || e.pageId, { pageType: pg.pageType || '', campaignId: pg.campaignId || e.campaignId || '', productId: pg.productId || e.productId || '' })); }
      if (e.campaignId) out.push(bucket('campaign', e.campaignId, (campById[e.campaignId] || {}).name || e.campaignId, { productId: e.productId || '' }));
      if (e.productId) out.push(bucket('product', e.productId, (prodById[e.productId] || {}).name || e.productId));
      var src = sourceOf(e);
      out.push(bucket('source', src, src, { medium: e.utmMedium || '', social: isSocial(src, e.utmMedium) }));
      out.push(bucket('daily', AH.util.dateKey(e.ts), AH.util.dateKey(e.ts)));
      return out;
    }

    views.forEach(function (e) {
      rowsFor(e).forEach(function (r) { r.views++; if (e.sessionId) r._sessions[e.sessionId] = 1; });
    });
    clicks.forEach(function (e) {
      rowsFor(e).forEach(function (r) { r.clicks++; });
      var cta = e.ctaId || 'unknown';
      bucket('cta', cta, cta).clicks++;
    });
    convs.forEach(function (c) {
      var targets = [totals];
      if (c.pageId) targets.push(bucket('page', c.pageId, (pageById[c.pageId] || {}).title || c.pageId));
      if (c.campaignId) targets.push(bucket('campaign', c.campaignId, (campById[c.campaignId] || {}).name || c.campaignId));
      if (c.productId) targets.push(bucket('product', c.productId, (prodById[c.productId] || {}).name || c.productId));
      targets.forEach(function (r) {
        r.conversions = (r.conversions || 0) + (Number(c.count) || 0);
        r.revenue = (r.revenue || 0) + (Number(c.revenue) || 0);
      });
    });

    finish(totals);
    var out = { totals: totals, from: from, to: to, hasConversionData: convs.length > 0 };
    ['page', 'campaign', 'product', 'source', 'cta'].forEach(function (k) {
      out['by' + AH.util.capFirst(k)] = Object.keys(groups[k]).map(function (id) { return finish(groups[k][id]); })
        .sort(function (a, b) { return (b.views + b.clicks) - (a.views + a.clicks); });
    });
    out.daily = Object.keys(groups.daily).sort().map(function (d) { var r = finish(groups.daily[d]); return { date: d, views: r.views, clicks: r.clicks }; });

    classify(out.byPage, totals, settings);
    classify(out.byCampaign, totals, settings);
    out.groups = {
      best: out.byPage.filter(function (r) { return r.status === 'best'; }).concat(out.byCampaign.filter(function (r) { return r.status === 'best'; }).map(tag('campaign'))),
      attention: out.byPage.filter(function (r) { return r.status === 'attention'; }).concat(out.byCampaign.filter(function (r) { return r.status === 'attention'; }).map(tag('campaign'))),
      notEnough: out.byPage.filter(function (r) { return r.status === 'not_enough'; })
    };
    out.groups.best.forEach(function (r) { if (!r.kind) r.kind = 'page'; });
    out.groups.attention.forEach(function (r) { if (!r.kind) r.kind = 'page'; });
    out.groups.notEnough.forEach(function (r) { if (!r.kind) r.kind = 'page'; });
    return out;
  }

  function tag(kind) { return function (r) { var c = AH.util.clone(r); c.kind = kind; return c; }; }

  function index(list) {
    var o = {};
    (list || []).forEach(function (x) { o[x.id] = x; });
    return o;
  }

  /** Mark rows as best / attention / not_enough / ok, with an evidence-based reason. */
  function classify(rows, totals, settings) {
    var minViews = Number(settings.minViewsForDecision) || 100;
    var low = Number(settings.lowCtrThreshold) || 0.02;
    var qualified = rows.filter(function (r) { return r.views >= minViews; });
    var qClicks = qualified.reduce(function (a, r) { return a + r.clicks; }, 0);
    var qViews = qualified.reduce(function (a, r) { return a + r.views; }, 0);
    var avg = qViews ? qClicks / qViews : null;
    rows.forEach(function (r) {
      if (r.views < minViews) {
        r.status = 'not_enough';
        r.reason = r.views + ' of ' + minViews + ' visits needed before judging performance.';
        return;
      }
      var pct = function (x) { return (x * 100).toFixed(1) + '%'; };
      if (r.ctr < low || (qualified.length > 1 && avg !== null && r.ctr < avg * 0.6)) {
        r.status = 'attention';
        r.reason = 'Affiliate CTR ' + pct(r.ctr) + ' is below ' + (r.ctr < low ? 'your ' + pct(low) + ' threshold' : '60% of the average (' + pct(avg) + ')') + '.';
      } else if (r.conversions === 0 && r.clicks >= 100) {
        r.status = 'attention';
        r.reason = r.clicks + ' clicks but 0 recorded conversions.';
      } else if ((qualified.length > 1 && r.ctr >= Math.max(low, avg * 1.2)) || (qualified.length === 1 && r.ctr >= low * 1.5)) {
        r.status = 'best';
        r.reason = 'Affiliate CTR ' + pct(r.ctr) + (qualified.length > 1 ? ' vs ' + pct(avg) + ' average' : '') + ' on ' + r.views + ' visits.';
      } else {
        r.status = 'ok';
        r.reason = 'Affiliate CTR ' + pct(r.ctr) + ' on ' + r.views + ' visits.';
      }
    });
  }

  // ---------------------------------------------------------------- A/B tests

  function normCdf(z) {
    // Abramowitz–Stegun approximation
    var t = 1 / (1 + 0.2316419 * Math.abs(z));
    var d = 0.3989423 * Math.exp(-z * z / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  /** Split "ab_x:A|ab_y:B" → {ab_x: 'A', ab_y: 'B'} */
  function parseVariant(v) {
    var out = {};
    String(v || '').split('|').forEach(function (pair) {
      var i = pair.indexOf(':');
      if (i > 0) out[pair.slice(0, i)] = pair.slice(i + 1);
    });
    return out;
  }

  /**
   * Evaluate a test against recorded events.
   * Returns { variants:[{id,label,value,views,clicks,ctr,lift,pValue}], state, winner, message }
   * state: 'not_enough' | 'no_difference' | 'significant'
   */
  function evaluateAbTest(test, pageViews, clicks, settings) {
    var minN = Number(test.minSamplePerVariant) || Number(settings && settings.abMinSamplePerVariant) || 300;
    var variants = (test.variants || []).map(function (v) {
      return { id: String(v.id), label: v.label || ('Variant ' + v.id), value: v.value || '', views: 0, clicks: 0, ctr: null, lift: null, pValue: null };
    });
    var byId = {};
    variants.forEach(function (v) { byId[v.id] = v; });
    (pageViews || []).forEach(function (e) { var vid = parseVariant(e.variant)[test.id]; if (vid && byId[vid]) byId[vid].views++; });
    (clicks || []).forEach(function (e) { var vid = parseVariant(e.variant)[test.id]; if (vid && byId[vid]) byId[vid].clicks++; });
    variants.forEach(function (v) { v.ctr = ratio(v.clicks, v.views); });

    var res = { variants: variants, state: 'not_enough', winner: null, minSamplePerVariant: minN, message: '' };
    if (variants.length < 2) { res.message = 'Add at least two variants.'; return res; }
    var under = variants.filter(function (v) { return v.views < minN; });
    var control = variants[0];
    var comparisons = variants.length - 1;
    var alpha = 0.05 / comparisons; // Bonferroni correction for multiple variants
    var best = null;
    variants.slice(1).forEach(function (v) {
      var p1 = control.ctr || 0, p2 = v.ctr || 0;
      var pooled = (control.clicks + v.clicks) / Math.max(1, control.views + v.views);
      var se = Math.sqrt(pooled * (1 - pooled) * (1 / Math.max(1, control.views) + 1 / Math.max(1, v.views)));
      var z = se ? (p2 - p1) / se : 0;
      v.pValue = AH.util.round(2 * (1 - normCdf(Math.abs(z))), 4);
      v.lift = p1 ? AH.util.round((p2 - p1) / p1, 4) : null;
      v._z = z;
    });
    if (under.length) {
      res.message = 'Not enough data yet: every variant needs ' + minN + ' visits (lowest so far: ' + Math.min.apply(null, variants.map(function (v) { return v.views; })) + '). No winner can be declared.';
      variants.forEach(function (v) { delete v._z; });
      return res;
    }
    variants.slice(1).forEach(function (v) {
      if (v.pValue !== null && v.pValue < alpha) {
        var winnerVar = v._z > 0 ? v : control;
        if (!best || (winnerVar.ctr || 0) > (best.ctr || 0)) best = winnerVar;
      }
    });
    variants.forEach(function (v) { delete v._z; });
    if (best) {
      res.state = 'significant';
      res.winner = best.id;
      res.message = best.label + ' has a statistically significant higher CTR (' + (best.ctr * 100).toFixed(2) + '%, 95% confidence). Review it before applying.';
    } else {
      res.state = 'no_difference';
      res.message = 'No statistically significant difference yet. Keep the test running or stop it and keep the control.';
    }
    return res;
  }

  return {
    summarize: summarize,
    classify: classify,
    evaluateAbTest: evaluateAbTest,
    parseVariant: parseVariant,
    isSocial: isSocial,
    sourceOf: sourceOf
  };
})();
