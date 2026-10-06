/* Campaigns: list + strategy builder (sections A–L) + asset generation actions. */
(function () {
  'use strict';
  var esc = UI.esc;

  Views.campaignList = function (el, ctx) {
    return UI.load(el, ctx, 'getCampaigns').then(function (d) {
      if (!d) return;
      var prod = {};
      d.products.forEach(function (p) { prod[p.id] = p; });
      var available = d.products.filter(function (p) { return p.status !== 'archived' && p.status !== 'rejected'; });
      el.innerHTML =
        '<div class="page-head"><div><h1>Campaigns</h1><p class="sub">One campaign = one offer, one audience, one clear angle.</p></div>' +
        '<div class="actions"><button class="btn primary" id="new-campaign"' + (available.length ? '' : ' disabled') + '>+ New campaign</button></div></div>' +
        '<div class="panel">' + (d.campaigns.length ? UI.table([
          { label: 'Campaign', render: function (c) { return '<a href="#/campaigns/' + c.id + '">' + esc(c.name) + '</a>'; } },
          { label: 'Offer', render: function (c) { var p = prod[c.productId] || {}; return p.id ? '<a href="#/offers/' + p.id + '">' + esc(p.name) + '</a> ' + UI.scoreBadge(p) : '—'; } },
          { label: 'Pages', num: true, render: function (c) { var ps = d.pages.filter(function (x) { return x.campaignId === c.id; }); return ps.length + ' (' + ps.filter(function (x) { return x.status === 'published'; }).length + ' live)'; } },
          { label: 'Status', render: function (c) { return UI.badge(c.status); } },
          { label: 'Updated', render: function (c) { return UI.date(c.updatedAt); } }
        ], d.campaigns) : UI.empty('No campaigns yet', available.length ? 'Pick an offer and generate a campaign strategy draft.' : 'Add an offer first.', available.length ? '' : '<a class="btn primary" href="#/offers/new">Add offer</a>')) + '</div>';

      var btn = el.querySelector('#new-campaign');
      btn.addEventListener('click', function () {
        var preselect = ctx.query.productId || '';
        UI.modal('<h2>New campaign</h2><form id="nc" class="form">' +
          UI.field({ name: 'productId', label: 'Offer', type: 'select', value: preselect, options: available.map(function (p) { return [p.id, (p.name || p.id) + (p.scoreLabel ? ' — ' + p.scoreLabel : '')]; }) }) +
          UI.field({ name: 'name', label: 'Campaign name (optional)', placeholder: 'e.g. Bedtime routine — parents of toddlers' }) +
          '<p class="small muted">The strategy is generated from your offer data as a draft. Anything the system cannot know is marked [[like this]] for you to complete.</p>' +
          '<div class="actions"><button class="btn primary" type="submit">Generate strategy draft</button><button class="btn" type="button" data-close>Cancel</button></div></form>', function (root) {
          root.querySelector('#nc').addEventListener('submit', function (ev) {
            ev.preventDefault();
            UI.busy(ev.target.querySelector('[type=submit]'), function () {
              return UI.act('createCampaign', UI.formData(ev.target), ev.target).then(function (r) {
                if (r) { UI.closeModal(); location.hash = '#/campaigns/' + r.campaign.id; }
              });
            });
          });
        });
      });
    });
  };

  // Plan <-> form conversion helpers
  function linesOf(arr) { return (arr || []).join('\n'); }
  function objectionsText(arr) { return (arr || []).map(function (o) { return o.objection + ' :: ' + o.response; }).join('\n'); }
  function channelsText(arr) { return (arr || []).map(function (c) { return c.priority + ' | ' + c.channel + ' | ' + c.why; }).join('\n'); }

  function formToPlan(f, base) {
    var plan = JSON.parse(JSON.stringify(base || {}));
    ['primaryAudience', 'coreProblem', 'desiredOutcome', 'uniqueAngle', 'mainPromise'].forEach(function (k) { plan[k] = f[k]; });
    plan.objections = UI.lines(f.objections).map(function (l) { var parts = l.split('::'); return { objection: parts[0].trim(), response: (parts[1] || '').trim() }; });
    plan.trustElements = UI.lines(f.trustElements);
    plan.ctaStrategy = { placements: UI.lines(f.ctaPlacements), ctaTexts: UI.lines(f.ctaTexts), rules: f.ctaRules };
    plan.trafficChannels = UI.lines(f.trafficChannels).map(function (l) { var p = l.split('|'); return { priority: (p[0] || 'medium').trim(), channel: (p[1] || '').trim(), why: (p[2] || '').trim() }; });
    plan.contentIdeas = UI.lines(f.contentIdeas);
    plan.emailIdeas = UI.lines(f.emailIdeas);
    plan.testingIdeas = UI.lines(f.testingIdeas);
    plan.isDraft = !f.reviewed;
    return plan;
  }

  Views.campaignDetail = function (el, ctx) {
    var id = ctx.params[0];
    return UI.load(el, ctx, 'getCampaign', { id: id }).then(function (d) {
      if (!d) return;
      var c = d.campaign;
      var plan = c.plan || {};
      var cta = plan.ctaStrategy || {};
      var placeholders = AH.compliance.findPlaceholders(JSON.stringify(plan)).length;

      var assets = '<dl class="kv">' +
        '<dt>Landing pages</dt><dd>' + (d.pages.length ? d.pages.map(function (p) { return '<a href="#/pages/' + p.id + '">' + esc(p.title) + '</a> ' + UI.badge(p.status); }).join('<br>') : '<span class="muted">none</span>') + '</dd>' +
        '<dt>Content plan</dt><dd>' + d.content.length + ' items' + (d.content.length ? ' · <a href="#/content?campaignId=' + c.id + '">open</a>' : '') + '</dd>' +
        '<dt>Social drafts</dt><dd>' + d.social.length + (d.social.length ? ' · <a href="#/social?campaignId=' + c.id + '">open</a>' : '') + '</dd>' +
        '<dt>Email sequence</dt><dd>' + d.emails.length + ' emails' + (d.emails.length ? ' · <a href="#/email?campaignId=' + c.id + '">open</a>' : '') + '</dd></dl>';

      el.innerHTML =
        '<div class="crumbs"><a href="#/campaigns">Campaigns</a> ›</div>' +
        '<div class="page-head"><div><h1>' + esc(c.name) + '</h1><p class="sub">Offer: <a href="#/offers/' + d.product.id + '">' + esc(d.product.name || d.product.id) + '</a> · ' + UI.scoreBadge(d.product) + ' · ' + UI.badge(c.status) + '</p></div>' +
        '<div class="actions"><select id="status" aria-label="Campaign status">' + AH.schema.CAMPAIGN_STATUSES.map(function (s) { return '<option value="' + s + '"' + (s === c.status ? ' selected' : '') + '>' + UI.label(s) + '</option>'; }).join('') + '</select>' +
        '<button class="btn danger" id="delete">Delete</button></div></div>' +
        '<div class="grid grid-2">' +
        '<div class="panel"><h2>Build the campaign</h2>' +
        '<div class="form"><div class="actions">' + UI.field({ name: 'pageType', label: 'Landing page type', type: 'select', value: 'review', options: [['review', 'Product overview / review'], ['comparison', 'Comparison'], ['problem_solution', 'Problem → solution guide'], ['buyer_guide', 'Buyer guide']] }) + '</div>' +
        '<div class="actions"><button class="btn primary" data-gen="page">Generate landing page draft</button><button class="btn" data-gen="content">Content plan</button><button class="btn" data-gen="social">Social &amp; video drafts</button><button class="btn" data-gen="email">Email sequence</button></div>' +
        '<p class="small muted">Everything generated is a draft for your review. Nothing is published, posted or sent automatically.</p></div></div>' +
        '<div class="panel"><h2>Campaign assets</h2>' + assets + '</div></div>' +
        '<form id="plan" class="panel"><div class="page-head"><div><h2>Strategy (A–L)</h2><p class="sub">' + (placeholders ? '<span class="flag">' + placeholders + ' placeholder(s) to complete</span> · ' : '') + 'Generated ' + UI.date(plan.generatedAt) + (plan.scoreSnapshot ? ' · score at generation: ' + esc(plan.scoreSnapshot.label) : '') + '</p></div>' +
        '<div class="actions"><button class="btn" type="button" id="regen">Regenerate from offer</button></div></div>' +
        '<div class="form cols-2">' +
        UI.field({ name: 'primaryAudience', label: 'A. Primary audience', type: 'textarea', rows: 2, value: plan.primaryAudience }) +
        UI.field({ name: 'coreProblem', label: 'B. Core problem', type: 'textarea', rows: 2, value: plan.coreProblem }) +
        UI.field({ name: 'desiredOutcome', label: 'C. Desired outcome', type: 'textarea', rows: 2, value: plan.desiredOutcome }) +
        UI.field({ name: 'uniqueAngle', label: 'D. Unique angle', type: 'textarea', rows: 3, value: plan.uniqueAngle, help: 'Other options: ' + (plan.angleOptions || []).slice(1).join(' · ') }) +
        UI.field({ name: 'mainPromise', label: 'E. Main promise (no guarantees)', type: 'textarea', rows: 2, value: plan.mainPromise, span: true }) +
        UI.field({ name: 'objections', label: 'F. Objections (objection :: response, one per line)', type: 'textarea', rows: 6, value: objectionsText(plan.objections), span: true }) +
        UI.field({ name: 'trustElements', label: 'G. Trust elements (one per line)', type: 'textarea', rows: 6, value: linesOf(plan.trustElements), span: true }) +
        UI.field({ name: 'ctaPlacements', label: 'H. CTA placements', type: 'textarea', rows: 4, value: linesOf(cta.placements) }) +
        UI.field({ name: 'ctaTexts', label: 'H. CTA texts', type: 'textarea', rows: 4, value: linesOf(cta.ctaTexts) }) +
        UI.field({ name: 'ctaRules', label: 'H. CTA rules', type: 'textarea', rows: 2, value: cta.rules, span: true }) +
        UI.field({ name: 'trafficChannels', label: 'I. Traffic channels (priority | channel | why)', type: 'textarea', rows: 7, value: channelsText(plan.trafficChannels), span: true }) +
        UI.field({ name: 'contentIdeas', label: 'J. Content ideas', type: 'textarea', rows: 6, value: linesOf(plan.contentIdeas) }) +
        UI.field({ name: 'emailIdeas', label: 'K. Email sequence ideas', type: 'textarea', rows: 6, value: linesOf(plan.emailIdeas) }) +
        UI.field({ name: 'testingIdeas', label: 'L. Testing ideas', type: 'textarea', rows: 5, value: linesOf(plan.testingIdeas), span: true }) +
        UI.field({ name: 'reviewed', type: 'checkbox', label: 'I have reviewed and edited this strategy', value: plan.isDraft === false, span: true }) +
        '</div><div class="actions" style="margin-top:12px"><button class="btn primary" type="submit">Save strategy</button></div></form>';

      var planForm = el.querySelector('#plan');
      planForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        UI.busy(planForm.querySelector('[type=submit]'), function () {
          return UI.act('updateCampaign', { id: c.id, plan: formToPlan(UI.formData(planForm), plan) }).then(function (r) { if (r) { UI.toast('Strategy saved', 'ok'); plan = r.campaign.plan; } });
        });
      });
      el.querySelector('#regen').addEventListener('click', function (ev) {
        UI.confirm('Replace the current strategy with a fresh draft generated from the offer data? Your edits will be lost.', 'Regenerate').then(function (yes) {
          if (yes) UI.busy(ev.target, function () { return UI.act('updateCampaign', { id: c.id, regeneratePlan: true }).then(function (r) { if (r) { UI.toast('Strategy regenerated', 'ok'); ctx.rerender(); } }); });
        });
      });
      el.querySelector('#status').addEventListener('change', function (ev) {
        var status = ev.target.value;
        var go = status === 'active' && !d.pages.some(function (p) { return p.status === 'published'; })
          ? UI.confirm('This campaign has no published landing page yet. Activate anyway?', 'Activate') : Promise.resolve(true);
        go.then(function (yes) {
          if (!yes) { ev.target.value = c.status; return; }
          UI.act('updateCampaign', { id: c.id, status: status }).then(function (r) { if (r) { UI.toast('Status: ' + UI.label(status), 'ok'); ctx.rerender(); } });
        });
      });
      el.querySelector('#delete').addEventListener('click', function () {
        UI.confirm('Delete this campaign and all its drafts (pages, content, social, emails)? Tracking data is kept.', 'Delete').then(function (yes) {
          if (yes) UI.act('deleteCampaign', { id: c.id }).then(function (r) { if (r) { UI.toast('Campaign deleted', 'ok'); location.hash = '#/campaigns'; } });
        });
      });
      UI.on(el, '[data-gen]', 'click', function (ev, b) {
        var kind = b.getAttribute('data-gen');
        UI.busy(b, function () {
          if (kind === 'page') {
            return UI.act('generateLandingPage', { campaignId: c.id, pageType: el.querySelector('[name=pageType]').value }).then(function (r) {
              if (r) { UI.toast('Landing page draft created — complete the placeholders.', 'ok'); location.hash = '#/pages/' + r.page.id; }
            });
          }
          var map = { content: ['createContentPlan', '#/content'], social: ['createSocialDraft', '#/social'], email: ['createEmailDraft', '#/email'] };
          return UI.act(map[kind][0], { campaignId: c.id }).then(function (r) {
            if (!r) return;
            UI.toast(r.message || (r.created.length + ' draft(s) created'), 'ok');
            location.hash = map[kind][1] + '?campaignId=' + c.id;
          });
        });
      });
    });
  };
})();
