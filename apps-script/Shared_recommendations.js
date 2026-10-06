/* GENERATED FILE — do not edit. Source: /shared. Run `npm run build`. */
/*
 * Affiliate Campaign Hub — optimisation recommendations.
 *
 * Every recommendation is derived from recorded data and carries the evidence it was
 * based on. When data is insufficient, the system says so instead of guessing.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.recommend = (function () {
  function pct(x) { return x === null || x === undefined ? '—' : (x * 100).toFixed(1) + '%'; }

  /**
   * input: { summary, products, campaigns, pages, links, emails, abResults, settings, now }
   * Returns [{ level: 'action'|'warning'|'info', title, detail, evidence, entityType, entityId }]
   */
  function build(input) {
    var out = [];
    var s = input.summary;
    var settings = input.settings || AH.schema.DEFAULT_SETTINGS;
    var minViews = Number(settings.minViewsForDecision) || 100;
    var low = Number(settings.lowCtrThreshold) || 0.02;
    var now = input.now || Date.now();
    var pages = input.pages || [];
    var campaigns = input.campaigns || [];

    // Broken / inactive links first — they waste every visit.
    (input.links || []).forEach(function (l) {
      if (l.active && l.status === 'broken') {
        out.push({ level: 'action', title: 'Fix a broken affiliate link', detail: 'The link "' + (l.label || l.url) + '" failed its last check (HTTP ' + (l.lastStatusCode || '?') + '). Replace it or deactivate it.', evidence: 'Last checked ' + (l.lastCheckedAt || 'never'), entityType: 'link', entityId: l.id });
      }
    });

    // Per-page performance
    (s && s.byPage || []).forEach(function (r) {
      if (r.status === 'not_enough') return;
      if (r.ctr !== null && r.ctr < low) {
        out.push({ level: 'action', title: 'Low affiliate CTR on "' + r.name + '"', detail: 'Your landing page receives traffic but has a low affiliate CTR. Test the headline and the first CTA (text and placement), and check that the page matches what visitors expected.', evidence: r.views + ' visits, ' + r.clicks + ' clicks, CTR ' + pct(r.ctr) + ' (threshold ' + pct(low) + ').', entityType: 'page', entityId: r.id });
      }
      if (r.conversions === 0 && r.clicks >= 100) {
        out.push({ level: 'warning', title: 'Clicks without recorded conversions', detail: 'Visitors click through but no sales are recorded. Check that you recorded conversions from your network report, then review offer-to-page alignment and the merchant\'s sales page.', evidence: r.clicks + ' clicks, 0 conversions recorded.', entityType: 'page', entityId: r.id });
      }
    });

    // Page-type comparison (only between pages with enough data)
    var typeStats = {};
    (s && s.byPage || []).filter(function (r) { return r.views >= minViews && r.pageType; }).forEach(function (r) {
      var t = typeStats[r.pageType] || (typeStats[r.pageType] = { views: 0, clicks: 0 });
      t.views += r.views; t.clicks += r.clicks;
    });
    var types = Object.keys(typeStats);
    if (types.length >= 2) {
      types.sort(function (a, b) { return typeStats[b].clicks / typeStats[b].views - typeStats[a].clicks / typeStats[a].views; });
      var top = types[0], bottom = types[types.length - 1];
      var topCtr = typeStats[top].clicks / typeStats[top].views, botCtr = typeStats[bottom].clicks / typeStats[bottom].views;
      if (botCtr > 0 ? topCtr / botCtr >= 1.5 : topCtr > 0) {
        out.push({ level: 'info', title: label(top) + ' pages outperform ' + label(bottom) + ' pages', detail: 'Your ' + label(top).toLowerCase() + ' pages generate more clicks per visit than your ' + label(bottom).toLowerCase() + ' pages. Consider creating additional ' + label(top).toLowerCase() + ' content.', evidence: label(top) + ' CTR ' + pct(topCtr) + ' vs ' + label(bottom) + ' CTR ' + pct(botCtr) + '.', entityType: '', entityId: '' });
      }
    }

    // Social traffic that does not click through
    var social = (s && s.bySource || []).filter(function (r) { return r.social; });
    var socViews = social.reduce(function (a, r) { return a + r.views; }, 0);
    var socClicks = social.reduce(function (a, r) { return a + r.clicks; }, 0);
    var nonSocViews = (s ? s.totals.views : 0) - socViews;
    var nonSocClicks = (s ? s.totals.clicks : 0) - socClicks;
    if (socViews >= minViews) {
      var socCtr = socClicks / socViews;
      var otherCtr = nonSocViews >= minViews ? nonSocClicks / nonSocViews : null;
      if (socCtr < low || (otherCtr !== null && socCtr < otherCtr * 0.6)) {
        out.push({ level: 'action', title: 'Social traffic is not converting to clicks', detail: 'Your social content generates traffic but the landing page does not convert it. Review the offer-to-page alignment: does the first screen continue the promise made in the video/post?', evidence: 'Social: ' + socViews + ' visits, CTR ' + pct(socCtr) + (otherCtr !== null ? '; other sources CTR ' + pct(otherCtr) : '') + '.', entityType: '', entityId: '' });
      }
    }

    // Campaign-level data sufficiency + staleness
    var staleMs = (Number(settings.staleCampaignDays) || 14) * 86400000;
    campaigns.filter(function (c) { return c.status === 'active'; }).forEach(function (c) {
      var row = find(s && s.byCampaign || [], c.id);
      var views = row ? row.views : 0;
      var livePages = pages.filter(function (p) { return p.campaignId === c.id && p.status === 'published'; });
      if (!livePages.length) {
        out.push({ level: 'action', title: 'Active campaign without a published page', detail: '"' + c.name + '" is active but has no published landing page. Finish, review and publish one.', evidence: 'Published pages: 0.', entityType: 'campaign', entityId: c.id });
        return;
      }
      if (views < minViews) {
        out.push({ level: 'info', title: 'Not enough data for "' + c.name + '"', detail: 'This campaign does not yet have enough data to make a decision. Focus on distribution before changing the page.', evidence: views + ' of ' + minViews + ' visits in the selected period.', entityType: 'campaign', entityId: c.id });
      }
      var updated = Date.parse(c.updatedAt || c.createdAt || '') || now;
      if (views === 0 && now - updated > staleMs) {
        out.push({ level: 'warning', title: 'Stale campaign: "' + c.name + '"', detail: 'No visits recorded in the selected period. Check that the tracking script is on the page and that you are actually distributing content.', evidence: 'Last update ' + AH.util.dateKey(c.updatedAt) + '.', entityType: 'campaign', entityId: c.id });
      }
    });

    // A/B tests
    (input.abResults || []).forEach(function (r) {
      if (r.test.status === 'running' && r.result.state === 'significant') {
        out.push({ level: 'action', title: 'A/B test has a significant result', detail: '"' + r.test.name + '": ' + r.result.message, evidence: r.result.variants.map(function (v) { return v.id + ': ' + v.views + ' visits, CTR ' + pct(v.ctr); }).join('; '), entityType: 'abtest', entityId: r.test.id });
      }
    });

    // Email: unsubscribes outpacing clicks
    (input.emails || []).forEach(function (e) {
      var clicks = Number(e.clicks) || 0, unsub = Number(e.unsubscribes) || 0;
      if (unsub >= 5 && unsub > clicks) {
        out.push({ level: 'warning', title: 'Email "' + e.subject + '" loses more subscribers than it engages', detail: 'Make it more useful and less promotional, or send it later in the sequence.', evidence: clicks + ' clicks vs ' + unsub + ' unsubscribes.', entityType: 'email', entityId: e.id });
      }
    });

    // Drafts waiting for review
    var drafts = pages.filter(function (p) { return p.status === 'draft'; });
    if (drafts.length) {
      out.push({ level: 'info', title: drafts.length + ' landing page draft(s) awaiting review', detail: 'Complete the placeholders, run the compliance check and publish when you are confident the page is genuinely useful.', evidence: drafts.slice(0, 3).map(function (p) { return p.title; }).join('; '), entityType: 'page', entityId: drafts[0].id });
    }

    if (!out.length && s && s.totals.views === 0) {
      out.push({ level: 'info', title: 'No traffic recorded yet', detail: 'There is no data to optimise yet. Publish a useful page, add the tracking script and start distributing content.', evidence: '0 visits in the selected period.', entityType: '', entityId: '' });
    }
    var order = { action: 0, warning: 1, info: 2 };
    return out.sort(function (a, b) { return order[a.level] - order[b.level]; });
  }

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function label(type) {
    return { review: 'Review', comparison: 'Comparison', problem_solution: 'Problem-solution', buyer_guide: 'Buyer-guide' }[type] || type;
  }

  return { build: build };
})();
