/* Content engine views: content plan (topic clusters), social/video drafts, email sequences + leads. */
(function () {
  'use strict';
  var esc = UI.esc;

  function campaignFilter(campaigns, current, route) {
    return '<select id="cmp-filter" aria-label="Campaign filter" data-route="' + route + '"><option value="">All campaigns</option>' +
      campaigns.map(function (c) { return '<option value="' + c.id + '"' + (c.id === current ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>';
  }
  function bindFilter(el) {
    var s = el.querySelector('#cmp-filter');
    if (s) s.addEventListener('change', function () { location.hash = s.getAttribute('data-route') + (s.value ? '?campaignId=' + s.value : ''); });
  }
  function noCampaigns(kind) {
    return UI.empty('No ' + kind + ' yet', 'Open a campaign and generate ' + kind + ' drafts from it.', '<a class="btn primary" href="#/campaigns">Go to campaigns</a>');
  }
  function loadBoth(el, ctx, action) {
    var cid = ctx.query.campaignId || '';
    return Promise.all([
      UI.load(el, ctx, action, cid ? { campaignId: cid } : {}),
      Backend.call('getCampaigns').then(function (r) { return r.success ? r.data : { campaigns: [], products: [] }; })
    ]);
  }

  // ------------------------------------------------------------------ content plan
  Views.contentPlan = function (el, ctx) {
    return loadBoth(el, ctx, 'getContentPlan').then(function (res) {
      var d = res[0], meta = res[1];
      if (!d) return;
      var ROLES = [['pillar', 'Pillar (problem guide)'], ['supporting', 'Supporting (buyer guide, tutorial, FAQ)'], ['commercial', 'Commercial (comparison, alternatives, review)']];
      var body = d.items.length ? ROLES.map(function (r) {
        var items = d.items.filter(function (i) { return i.clusterRole === r[0]; });
        if (!items.length) return '';
        return '<div class="panel"><h2>' + esc(r[1]) + '</h2><ul class="list">' + items.map(function (i) {
          var outline = (i.outline && i.outline.sections) || [];
          return '<li><div><strong>' + esc(i.title) + '</strong> ' + UI.badge(i.status) + ' <span class="badge">' + esc(i.intent) + '</span>' +
            (i.requiresFirstHand ? ' <span class="flag">needs first-hand evidence</span>' : '') + (i.locked ? ' <span class="flag">🔒 locked until real evidence exists</span>' : '') + '</div>' +
            '<div class="small muted">SEO: ' + esc(i.seo && i.seo.title) + ' · /' + esc(i.seo && i.seo.slug) + '</div>' +
            '<details><summary class="small">Outline &amp; internal links</summary><ol class="small">' + outline.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ol>' +
            '<p class="small muted">' + esc(((i.outline && i.outline.internalLinks) || []).join(' ')) + '</p></details>' +
            '<div class="actions" style="margin-top:6px"><select data-status="' + i.id + '" aria-label="Status">' + AH.schema.CONTENT_STATUSES.map(function (s) { return '<option' + (s === i.status ? ' selected' : '') + ' value="' + s + '">' + UI.label(s) + '</option>'; }).join('') + '</select>' +
            '<button class="btn small danger" data-del="' + i.id + '">Remove</button></div></li>';
        }).join('') + '</ul></div>';
      }).join('') : '<div class="panel">' + noCampaigns('content plans') + '</div>';
      el.innerHTML = '<div class="page-head"><div><h1>Content</h1><p class="sub">A few genuinely useful pieces per offer, organised as a topic cluster. Not a spam generator.</p></div><div class="actions">' + campaignFilter(meta.campaigns, ctx.query.campaignId, '#/content') + '</div></div>' + body;
      bindFilter(el);
      UI.on(el, '[data-status]', 'change', function (ev, s) {
        UI.act('updateContentItem', { id: s.getAttribute('data-status'), status: s.value }).then(function (r) { if (r) UI.toast('Status updated', 'ok'); else ctx.rerender(); });
      });
      UI.on(el, '[data-del]', 'click', function (ev, b) {
        UI.act('deleteContentItem', { id: b.getAttribute('data-del') }).then(function (r) { if (r) ctx.rerender(); });
      });
    });
  };

  // ------------------------------------------------------------------ social & video
  Views.social = function (el, ctx) {
    return loadBoth(el, ctx, 'getSocialContent').then(function (res) {
      var d = res[0], meta = res[1];
      if (!d) return;
      var cards = d.items.map(function (s) {
        return '<div class="draft-card"><div><strong>' + esc(UI.label(s.angle)) + '</strong> ' + UI.badge(s.status) + (s.requiresFirstHand ? ' <span class="flag">first-hand only</span>' : '') + '</div>' +
          '<div class="small muted">' + esc((s.platforms || []).map(UI.label).join(', ')) + ' · ~' + esc(s.durationSec) + 's</div>' +
          '<dl class="kv small"><dt>Hook</dt><dd>' + esc(s.hook) + '</dd><dt>Problem</dt><dd>' + esc(s.problem) + '</dd><dt>Value</dt><dd>' + esc(s.value) + '</dd><dt>Demo</dt><dd>' + esc(s.demonstration) + '</dd><dt>CTA</dt><dd>' + esc(s.cta) + '</dd><dt>Disclosure</dt><dd>' + esc(s.disclosure) + '</dd></dl>' +
          '<div class="actions"><button class="btn small" data-edit="' + s.id + '">Edit</button><button class="btn small" data-copy="' + s.id + '">Copy caption</button>' +
          (s.status === 'draft' ? '<button class="btn small primary" data-approve="' + s.id + '">Approve</button>' : '') +
          (s.status === 'approved' ? '<button class="btn small" data-posted="' + s.id + '">Mark posted</button>' : '') + '</div></div>';
      }).join('');
      el.innerHTML = '<div class="page-head"><div><h1>Social &amp; video</h1><p class="sub">Drafts for TikTok, Reels, Shorts, Facebook, Pinterest and X. Nothing is posted automatically — review, approve, then post yourself.</p></div><div class="actions">' + campaignFilter(meta.campaigns, ctx.query.campaignId, '#/social') + '</div></div>' +
        (d.items.length ? '<div class="grid grid-2">' + cards + '</div>' : '<div class="panel">' + noCampaigns('social drafts') + '</div>') +
        '<p class="small muted">Tip: use the landing page\'s Tracking links tab to create a UTM link for each post so Analytics shows which videos drive clicks.</p>';
      bindFilter(el);
      function find(id) { return d.items.filter(function (x) { return x.id === id; })[0]; }
      UI.on(el, '[data-copy]', 'click', function (ev, b) { UI.copy(find(b.getAttribute('data-copy')).caption); });
      UI.on(el, '[data-approve]', 'click', function (ev, b) { UI.act('updateSocialDraft', { id: b.getAttribute('data-approve'), status: 'approved' }).then(function (r) { if (r) ctx.rerender(); }); });
      UI.on(el, '[data-posted]', 'click', function (ev, b) { UI.act('updateSocialDraft', { id: b.getAttribute('data-posted'), status: 'posted' }).then(function (r) { if (r) ctx.rerender(); }); });
      UI.on(el, '[data-edit]', 'click', function (ev, b) {
        var s = find(b.getAttribute('data-edit'));
        UI.modal('<h2>Edit ' + esc(UI.label(s.angle)) + ' draft</h2><form id="sf" class="form">' +
          ['hook', 'problem', 'value', 'demonstration', 'cta', 'disclosure'].map(function (k) { return UI.field({ name: k, label: UI.label(k), type: 'textarea', rows: 2, value: s[k] }); }).join('') +
          UI.field({ name: 'caption', label: 'Caption', type: 'textarea', rows: 5, value: s.caption }) +
          UI.field({ name: 'durationSec', label: 'Estimated duration (seconds)', type: 'number', value: s.durationSec }) +
          '<div class="actions"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-close>Cancel</button></div></form>', function (root) {
          root.querySelector('#sf').addEventListener('submit', function (e2) {
            e2.preventDefault();
            var f = UI.formData(e2.target); f.id = s.id;
            UI.act('updateSocialDraft', f, e2.target).then(function (r) { if (r) { UI.closeModal(); ctx.rerender(); } });
          });
        });
      });
    });
  };

  // ------------------------------------------------------------------ email
  Views.email = function (el, ctx) {
    return Promise.all([loadBoth(el, ctx, 'getEmailCampaigns'), Backend.call('getLeads')]).then(function (all) {
      var d = all[0][0], meta = all[0][1], leads = all[1].success ? all[1].data.leads : [];
      if (!d) return;
      var byCampaign = {};
      d.items.forEach(function (e) { (byCampaign[e.campaignId] = byCampaign[e.campaignId] || []).push(e); });
      var cname = {};
      meta.campaigns.forEach(function (c) { cname[c.id] = c.name; });
      var seqs = Object.keys(byCampaign).map(function (cid) {
        var list = AH.util.sortBy(byCampaign[cid], function (e) { return e.step; });
        return '<div class="panel"><h2>' + esc(cname[cid] || cid) + '</h2><p class="small muted">Lead magnet: ' + esc(list[0].leadMagnet) + '</p>' + UI.table([
          { label: '#', render: function (e) { return esc(e.step) + ' · day ' + esc(e.sendDay); } },
          { label: 'Email', render: function (e) { return '<strong>' + esc(UI.label(e.type)) + '</strong><div class="small">' + esc(e.subject) + '</div>'; } },
          { label: 'Status', render: function (e) { return UI.badge(e.status); } },
          { label: 'Clicks', num: true, render: function (e) { return UI.num(e.clicks); } },
          { label: 'Conv.', num: true, render: function (e) { return UI.num(e.conversions); } },
          { label: 'Unsubs', num: true, render: function (e) { return UI.num(e.unsubscribes); } },
          { label: '', render: function (e) { return '<button class="btn small" data-edit="' + e.id + '">Open</button>'; } }
        ], list) + '</div>';
      }).join('');
      el.innerHTML = '<div class="page-head"><div><h1>Email</h1><p class="sub">Consent-based sequences. Drafts only — send them from your email provider after review. Success = clicks and conversions, not open rates.</p></div><div class="actions">' + campaignFilter(meta.campaigns, ctx.query.campaignId, '#/email') + '</div></div>' +
        (seqs || '<div class="panel">' + noCampaigns('email sequences') + '</div>') +
        '<div class="panel"><h2>Leads (' + leads.filter(function (l) { return l.status === 'subscribed'; }).length + ' subscribed)</h2>' +
        '<p class="small muted">Only people who ticked the consent box on a lead-capture form appear here. Never import or add people without consent.</p>' +
        UI.table([
          { label: 'Email', render: function (l) { return esc(l.email); } },
          { label: 'Lead magnet', render: function (l) { return esc(l.leadMagnet); } },
          { label: 'Signed up', render: function (l) { return UI.date(l.ts); } },
          { label: 'Status', render: function (l) { return UI.badge(l.status); } },
          { label: '', render: function (l) { return (l.status === 'subscribed' ? '<button class="btn small" data-unsub="' + l.id + '">Unsubscribe</button> ' : '') + '<button class="btn small danger" data-erase="' + l.id + '">Erase</button>'; } }
        ], leads, 'No leads yet.') +
        (leads.length ? '<button class="btn small" id="export-leads" style="margin-top:8px">Export subscribed (CSV)</button>' : '') + '</div>';
      bindFilter(el);
      UI.on(el, '[data-unsub]', 'click', function (ev, b) { UI.act('updateLead', { id: b.getAttribute('data-unsub'), status: 'unsubscribed' }).then(function (r) { if (r) ctx.rerender(); }); });
      UI.on(el, '[data-erase]', 'click', function (ev, b) {
        UI.confirm('Permanently erase this lead (e.g. a data-deletion request)?', 'Erase').then(function (y) { if (y) UI.act('deleteLead', { id: b.getAttribute('data-erase') }).then(function (r) { if (r) ctx.rerender(); }); });
      });
      var ex = el.querySelector('#export-leads');
      if (ex) ex.addEventListener('click', function () {
        var rows = [['email', 'signed_up', 'lead_magnet', 'consent_text']].concat(leads.filter(function (l) { return l.status === 'subscribed'; }).map(function (l) { return [l.email, l.ts, l.leadMagnet, l.consentText]; }));
        UI.download('leads.csv', rows.map(function (r) { return r.map(function (c) { return '"' + String(c || '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1") + '"'; }).join(','); }).join('\n'), 'text/csv');
      });
      UI.on(el, '[data-edit]', 'click', function (ev, b) {
        var e = d.items.filter(function (x) { return x.id === b.getAttribute('data-edit'); })[0];
        UI.modal('<h2>' + esc(UI.label(e.type)) + ' email</h2><form id="ef" class="form">' +
          UI.field({ name: 'subject', label: 'Subject', value: e.subject }) +
          UI.field({ name: 'body', label: 'Body ({first_name}, {affiliate_link}, {unsubscribe_link} are merge tags for your email tool)', type: 'textarea', rows: 12, value: e.body }) +
          '<fieldset><legend>Results (from your email provider)</legend><div class="form cols-2">' +
          UI.field({ name: 'clicks', label: 'Clicks', type: 'number', value: e.clicks }) + UI.field({ name: 'conversions', label: 'Conversions', type: 'number', value: e.conversions }) +
          UI.field({ name: 'unsubscribes', label: 'Unsubscribes', type: 'number', value: e.unsubscribes }) +
          UI.field({ name: 'status', label: 'Status', type: 'select', value: e.status, options: AH.schema.EMAIL_STATUSES }) + '</div></fieldset>' +
          '<div class="actions"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" id="copy-email">Copy</button><button class="btn" type="button" data-close>Close</button></div></form>', function (root) {
          root.querySelector('#copy-email').addEventListener('click', function () { var f = UI.formData(root.querySelector('#ef')); UI.copy('Subject: ' + f.subject + '\n\n' + f.body); });
          root.querySelector('#ef').addEventListener('submit', function (e2) {
            e2.preventDefault();
            var f = UI.formData(e2.target); f.id = e.id;
            ['clicks', 'conversions', 'unsubscribes'].forEach(function (k) { if (f[k] === '') f[k] = 0; });
            UI.act('updateEmailDraft', f, e2.target).then(function (r) { if (r) { UI.closeModal(); UI.toast('Saved', 'ok'); ctx.rerender(); } });
          });
        });
      });
    });
  };
})();
