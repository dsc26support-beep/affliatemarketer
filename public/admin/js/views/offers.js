/* Offers: list, add/edit form, product detail page (score, experience notes, performance). */
(function () {
  'use strict';
  var esc = UI.esc;
  var S = AH.schema;

  // ------------------------------------------------------------------ list
  Views.offerList = function (el, ctx) {
    return UI.load(el, ctx, 'getProducts').then(function (d) {
      if (!d) return;
      var filter = ctx.query.status || 'all';
      var q = (ctx.query.q || '').toLowerCase();
      var rows = d.products.filter(function (p) {
        if (filter === 'all' ? p.status === 'archived' : p.status !== filter) return false;
        return !q || [p.name, p.niche, p.category].join(' ').toLowerCase().indexOf(q) !== -1;
      });
      rows = AH.util.sortBy(rows, function (p) { return p.score === null ? -1 : p.score; }, true);
      el.innerHTML =
        '<div class="page-head"><div><h1>Offers</h1><p class="sub">Every offer gets an explainable score. It organises your judgement — it does not predict revenue.</p></div>' +
        '<div class="actions"><a class="btn primary" href="#/offers/new">+ Add offer</a></div></div>' +
        '<div class="panel"><form class="actions" id="filters" role="search">' +
        '<input type="search" name="q" placeholder="Search name, niche…" value="' + esc(ctx.query.q || '') + '" aria-label="Search offers" style="max-width:260px">' +
        '<select name="status" aria-label="Status filter">' + [['all', 'All (except archived)']].concat(S.PRODUCT_STATUSES.map(function (s) { return [s, UI.label(s)]; })).map(function (o) {
          return '<option value="' + o[0] + '"' + (o[0] === filter ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
        }).join('') + '</select><button class="btn" type="submit">Filter</button></form>' +
        (d.products.length ? UI.table([
          { label: 'Offer', render: function (p) { return '<a href="#/offers/' + p.id + '">' + esc(p.name || '(unnamed draft)') + '</a><div class="small muted">' + esc([p.niche, p.category].filter(Boolean).join(' · ')) + '</div>'; } },
          { label: 'Network', render: function (p) { return esc(UI.networkLabel(p.network)); } },
          { label: 'Score', render: function (p) { return UI.scoreBadge(p); } },
          { label: 'Est. commission', num: true, render: function (p) { var c = p.scoreDetails && p.scoreDetails.estimatedCommission; return c === null || c === undefined ? '—' : UI.money(c, p.currency); } },
          { label: 'Status', render: function (p) { return UI.badge(p.status); } },
          { label: 'Updated', render: function (p) { return UI.date(p.updatedAt); } }
        ], rows, 'No offers match this filter.')
          : UI.empty('No offers yet', 'Add a Digistore24 or ClickBank offer to get started.', '<a class="btn primary" href="#/offers/new">Add offer</a>')) +
        '</div>';
      el.querySelector('#filters').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = UI.formData(ev.target);
        location.hash = '#/offers?' + AH.util.buildQuery({ status: f.status === 'all' ? '' : f.status, q: f.q });
      });
    });
  };

  // ------------------------------------------------------------------ add / edit form
  Views.offerForm = function (el, ctx) {
    var id = ctx.params[0];
    var load = id ? UI.load(el, ctx, 'getProduct', { id: id }) : Promise.resolve({ product: { status: 'draft', recurring: 'unknown', currency: '' } });
    return load.then(function (d) {
      if (!d) return;
      var p = d.product;
      var types = [['', '— choose —']].concat(S.PRODUCT_TYPES.map(function (t) { return [t, AH.landing.PRODUCT_TYPE_LABELS[t]]; }));
      el.innerHTML =
        '<div class="crumbs"><a href="#/offers">Offers</a> ›</div>' +
        '<div class="page-head"><div><h1>' + (id ? 'Edit offer' : 'Add offer') + '</h1><p class="sub">Save incomplete offers as drafts. Required fields are enforced once the offer leaves draft status.</p></div></div>' +
        '<form id="offer-form" class="panel" novalidate>' +
        '<fieldset><legend>Affiliate offer</legend><div class="form cols-2">' +
        UI.field({ name: 'network', label: 'Affiliate network', type: 'select', value: p.network, options: [['', '— choose —'], ['digistore24', 'Digistore24'], ['clickbank', 'ClickBank']] }) +
        UI.field({ name: 'status', label: 'Offer status', type: 'select', value: p.status || 'draft', options: S.PRODUCT_STATUSES }) +
        UI.field({ name: 'affiliateUrl', label: 'Affiliate URL', type: 'url', value: p.affiliateUrl, span: true, placeholder: 'https://hop.clickbank.net/?affiliate=…&vendor=…', help: 'Your Digistore24 promolink or ClickBank HopLink. Checked against the network domain allowlist.' }) +
        '<p class="help span-2" id="url-check" aria-live="polite"></p>' +
        UI.field({ name: 'productPageUrl', label: 'Official product page (optional)', type: 'url', value: p.productPageUrl, span: true, help: 'For your research and the page\'s Sources section. Never copy the merchant\'s text.' }) +
        '</div></fieldset>' +
        '<fieldset style="margin-top:12px"><legend>Product</legend><div class="form cols-2">' +
        UI.field({ name: 'name', label: 'Product name', value: p.name }) +
        UI.field({ name: 'productType', label: 'Product type', type: 'select', value: p.productType, options: types }) +
        UI.field({ name: 'category', label: 'Product category', value: p.category, placeholder: 'e.g. Online course, Budgeting app' }) +
        UI.field({ name: 'niche', label: 'Niche', value: p.niche, placeholder: 'e.g. Parenting, Personal finance' }) +
        UI.field({ name: 'targetAudience', label: 'Target audience', type: 'textarea', rows: 2, value: p.targetAudience, span: true, placeholder: 'Who exactly is this for?' }) +
        UI.field({ name: 'problem', label: 'Main problem solved', type: 'textarea', rows: 2, value: p.problem }) +
        UI.field({ name: 'mainBenefit', label: 'Main benefit', type: 'textarea', rows: 2, value: p.mainBenefit, help: 'Describe it factually — no guaranteed results.' }) +
        '</div></fieldset>' +
        '<fieldset style="margin-top:12px"><legend>Commission &amp; price</legend><div class="form cols-2">' +
        UI.field({ name: 'price', label: 'Product price', type: 'number', step: '0.01', value: p.price }) +
        UI.field({ name: 'currency', label: 'Currency', value: p.currency, placeholder: 'USD', attrs: 'maxlength="3"' }) +
        UI.field({ name: 'commissionPercent', label: 'Commission %', type: 'number', step: '0.1', value: p.commissionPercent }) +
        UI.field({ name: 'commissionAmount', label: 'Commission per sale (if fixed)', type: 'number', step: '0.01', value: p.commissionAmount }) +
        UI.field({ name: 'commissionInfo', label: 'Commission information', value: p.commissionInfo, span: true, placeholder: 'e.g. 50% on front-end, 30% on upsells' }) +
        UI.field({ name: 'recurring', label: 'Recurring commission?', type: 'select', value: p.recurring || 'unknown', options: [['unknown', 'Unknown'], ['yes', 'Yes'], ['no', 'No']] }) +
        UI.field({ name: 'recurringInfo', label: 'Recurring details', value: p.recurringInfo }) +
        UI.field({ name: 'refundPolicy', label: 'Refund policy (as stated by the vendor)', value: p.refundPolicy, span: true, help: 'Copy the facts (e.g. "60 days"), verify on the official page.' }) +
        '</div></fieldset>' +
        '<fieldset style="margin-top:12px"><legend>Notes</legend>' +
        UI.field({ name: 'notes', label: 'Personal notes', type: 'textarea', rows: 4, value: p.notes }) +
        '</fieldset>' +
        '<div class="actions" style="margin-top:14px"><button class="btn primary" type="submit">Save</button>' +
        (!id ? '<button class="btn" type="button" id="save-draft">Save as draft</button>' : '') +
        '<a class="btn" href="' + (id ? '#/offers/' + id : '#/offers') + '">Cancel</a></div></form>';

      var form = el.querySelector('#offer-form');
      var urlMsg = el.querySelector('#url-check');
      function checkUrl() {
        var f = UI.formData(form);
        if (!f.affiliateUrl) { urlMsg.textContent = ''; return; }
        Backend.call('validateLink', { url: f.affiliateUrl, network: f.network }).then(function (res) {
          if (!res.success) return;
          var r = res.data;
          urlMsg.innerHTML = r.ok ? '<span style="color:var(--ok)">✓ Valid ' + esc(UI.networkLabel(f.network)) + ' link (' + esc(r.host) + ')</span>' + (r.warnings.length ? '<br><span style="color:var(--warn)">' + esc(r.warnings[0]) + '</span>' : '')
            : '<span style="color:var(--bad)">' + esc(r.error) + '</span>';
        });
      }
      form.elements.affiliateUrl.addEventListener('blur', checkUrl);
      form.elements.network.addEventListener('change', checkUrl);
      if (p.affiliateUrl) checkUrl();

      function save(asDraft, btn) {
        var f = UI.formData(form);
        if (asDraft) f.status = 'draft';
        f.currency = String(f.currency || '').toUpperCase();
        var action = id ? 'updateProduct' : 'createProduct';
        if (id) f.id = id;
        return UI.busy(btn, function () {
          return Backend.call(action, f).then(function (res) {
            if (!res.success && res.error.code === 'CONFIRMATION_REQUIRED') {
              return UI.confirm(res.error.message + ' Live pages will start sending visitors to the new link.', 'Change affiliate URL').then(function (yes) {
                if (!yes) return;
                f.confirmOfferChange = true;
                return UI.act(action, f, form).then(done);
              });
            }
            if (!res.success) return UI.apiError(res, form);
            if (res.warnings) UI.toast(res.warnings[0]);
            done(res.data);
          });
        });
      }
      function done(data) {
        if (!data) return;
        UI.toast('Offer saved', 'ok');
        location.hash = '#/offers/' + data.product.id;
      }
      form.addEventListener('submit', function (ev) { ev.preventDefault(); save(false, form.querySelector('[type=submit]')); });
      var draftBtn = el.querySelector('#save-draft');
      if (draftBtn) draftBtn.addEventListener('click', function () { save(true, draftBtn); });
    });
  };

  // ------------------------------------------------------------------ detail
  Views.offerDetail = function (el, ctx) {
    var id = ctx.params[0];
    return UI.load(el, ctx, 'getProduct', { id: id }).then(function (d) {
      if (!d) return;
      var p = d.product;
      var sd = p.scoreDetails;
      var t = d.analytics.totals;
      var tab = ctx.query.tab || 'overview';
      var exp = p.experienceNotes || {};

      var info = '<dl class="kv">' + [
        ['Network', UI.networkLabel(p.network)], ['Type', AH.landing.PRODUCT_TYPE_LABELS[p.productType] || '—'],
        ['Category', p.category], ['Niche', p.niche], ['Audience', p.targetAudience], ['Problem', p.problem], ['Benefit', p.mainBenefit],
        ['Price', p.price === null ? '—' : UI.money(p.price, p.currency)], ['Commission', [p.commissionPercent !== null ? p.commissionPercent + '%' : '', p.commissionAmount !== null ? UI.money(p.commissionAmount, p.currency) : '', p.commissionInfo].filter(Boolean).join(' · ') || '—'],
        ['Recurring', UI.label(p.recurring) + (p.recurringInfo ? ' · ' + p.recurringInfo : '')], ['Refund policy', p.refundPolicy || '—'], ['Notes', p.notes || '—']
      ].map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1] || '—') + '</dd>'; }).join('') +
        '<dt>Affiliate URL</dt><dd>' + (p.affiliateUrl ? '<code>' + esc(p.affiliateUrl) + '</code>' : '—') + '</dd>' +
        '<dt>Product page</dt><dd>' + (p.productPageUrl ? '<a href="' + esc(p.productPageUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(p.productPageUrl) + '</a>' : '—') + '</dd></dl>';

      var campaigns = d.campaigns.length ? '<ul class="list">' + d.campaigns.map(function (c) { return '<li><a href="#/campaigns/' + c.id + '">' + esc(c.name) + '</a> ' + UI.badge(c.status) + '</li>'; }).join('') + '</ul>' : '<p class="muted">No campaign yet.</p>';
      var pages = d.pages.length ? '<ul class="list">' + d.pages.map(function (pg) { return '<li><a href="#/pages/' + pg.id + '">' + esc(pg.title) + '</a> ' + UI.badge(pg.status) + '</li>'; }).join('') + '</ul>' : '<p class="muted">No landing page yet.</p>';
      var links = d.links.length ? '<ul class="list">' + d.links.map(function (l) { return '<li>' + esc(l.label || 'Link') + ' ' + UI.badge(l.active ? l.status : 'inactive') + '<div class="small"><code>' + esc(l.url) + '</code></div></li>'; }).join('') + '</ul>' : '<p class="muted">No affiliate links.</p>';

      var ratingOpts = [['', 'Not rated'], ['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']];
      var scorePanel = '<div class="grid grid-2"><div><div class="card" style="margin-bottom:12px"><div class="label">Offer score</div><div class="value">' + (sd.score === null ? '—' : sd.score + ' / 100') + '</div><div>' + UI.scoreBadge(p) + '</div><div class="hint">Confidence: ' + sd.confidence + '% of the scoring weight is rated</div></div>' +
        sd.warnings.map(function (w) { return '<p class="issue warning">' + esc(w) + '</p>'; }).join('') +
        (sd.strengths.length ? '<h3>Strengths</h3><p>' + esc(sd.strengths.join(', ')) + '</p>' : '') +
        (sd.weaknesses.length ? '<h3>Weaknesses</h3><p>' + esc(sd.weaknesses.join(', ')) + '</p>' : '') +
        '<p class="small muted">Labels: EXCELLENT ≥ 80 · GOOD ≥ 65 · TEST ≥ 45 · WEAK &lt; 45. Very high trust or compliance risk caps the label at TEST.</p></div>' +
        '<form id="score-form"><h3>Rate each criterion (0–5, 5 = favourable)</h3>' + sd.breakdown.map(function (b) {
          var manual = (p.scoreInputs || {})[b.key];
          return '<div class="rating"><label for="r-' + b.key + '"><strong>' + esc(b.label) + '</strong> <span class="small muted">weight ' + b.weight + '</span></label>' +
            '<select id="r-' + b.key + '" name="' + b.key + '">' + ratingOpts.map(function (o) { return '<option value="' + o[0] + '"' + (String(manual === undefined ? '' : manual) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
            '<div class="help">' + esc(b.help) + (b.source === 'auto' ? ' · <strong>Auto: ' + b.rating + '/5</strong> — ' + esc(b.reason) : b.source === 'unrated' ? ' · not rated' : '') + '</div></div>';
        }).join('') + '<div class="actions" style="margin-top:10px"><button class="btn primary" type="submit">Save ratings</button></div></form></div>';

      var expPanel = '<form id="exp-form" class="form cols-2">' +
        '<p class="span-2 small muted">Only record what you genuinely did and saw. Without first-hand notes, generated content is framed as research-based and never implies personal testing.</p>' +
        UI.field({ name: 'hasFirstHand', type: 'checkbox', label: 'I have personally used / tested this product', value: exp.hasFirstHand, span: true }) +
        UI.field({ name: 'tested', label: 'What I tested', type: 'textarea', value: exp.tested, span: true }) +
        UI.field({ name: 'liked', label: 'What I liked (one per line)', type: 'textarea', value: exp.liked }) +
        UI.field({ name: 'disliked', label: 'What I disliked (one per line)', type: 'textarea', value: exp.disliked }) +
        UI.field({ name: 'problems', label: 'Problems encountered', type: 'textarea', value: exp.problems }) +
        UI.field({ name: 'setupDifficulty', label: 'Setup difficulty', value: exp.setupDifficulty, placeholder: 'e.g. Easy — 10 minutes' }) +
        UI.field({ name: 'observations', label: 'Actual observations', type: 'textarea', value: exp.observations, span: true }) +
        UI.field({ name: 'screenshots', label: 'Screenshot URLs (https, one per line)', type: 'textarea', value: exp.screenshots, help: 'e.g. images you host yourself.' }) +
        UI.field({ name: 'evidence', label: 'Supporting evidence (dates, measurements, results)', type: 'textarea', value: exp.evidence, help: 'Unlocks case-study content.' }) +
        '<div class="actions span-2"><button class="btn primary" type="submit">Save experience notes</button>' + (exp.updatedAt ? '<span class="small muted">Last saved ' + UI.date(exp.updatedAt) + '</span>' : '') + '</div></form>';

      var contentPanel = '<div class="grid grid-2"><div><h3>Topic cluster</h3><dl class="kv"><dt>Main topic</dt><dd>' + esc(d.cluster.mainTopic) + '</dd><dt>Pillar</dt><dd>' + esc(d.cluster.pillar.join('; ')) + '</dd><dt>Supporting</dt><dd>' + esc(d.cluster.supporting.join('; ')) + '</dd><dt>Commercial</dt><dd>' + esc(d.cluster.commercial.join('; ')) + '</dd><dt>Money page</dt><dd>' + esc(d.cluster.landing) + '</dd></dl></div>' +
        '<div><h3>Planned assets</h3><dl class="kv"><dt>Content items</dt><dd>' + d.content.length + ' <a href="#/content">open</a></dd><dt>Social drafts</dt><dd>' + d.social.length + ' <a href="#/social">open</a></dd><dt>Emails</dt><dd>' + d.emails.length + ' <a href="#/email">open</a></dd></dl>' +
        '<h3>Lead magnet ideas</h3><ul>' + d.leadMagnets.map(function (m) { return '<li><strong>' + esc(m.title) + '</strong> — <span class="muted">' + esc(m.description) + '</span></li>'; }).join('') + '</ul>' +
        (d.campaigns.length ? '' : '<p><button class="btn primary" data-act="campaign">Build a campaign to generate content</button></p>') + '</div></div>';

      var perfPanel = '<div class="cards">' + [['Visitors', UI.num(t.views)], ['Clicks', UI.num(t.clicks)], ['CTR', UI.pct(t.ctr)], ['Conversions', d.analytics.hasConversionData ? UI.num(t.conversions) : '—']]
        .map(function (x) { return '<div class="card"><div class="label">' + x[0] + '</div><div class="value">' + x[1] + '</div></div>'; }).join('') + '</div>' +
        '<h3>Landing pages</h3>' + UI.table(UI.perfCols(function (r) { return '<a href="#/pages/' + r.id + '">' + esc(r.name) + '</a>'; }), d.analytics.byPage, 'No tracked visits yet.') +
        '<h3>Optimisation recommendations</h3>' + UI.recommendations(d.recommendations);

      var TABS = [['overview', 'Overview'], ['score', 'Offer score'], ['experience', 'Experience notes'], ['content', 'Content & assets'], ['performance', 'Performance']];
      el.innerHTML =
        '<div class="crumbs"><a href="#/offers">Offers</a> ›</div>' +
        '<div class="page-head"><div><h1>' + esc(p.name || '(unnamed draft)') + '</h1><p class="sub">' + esc(UI.networkLabel(p.network)) + ' · ' + UI.badge(p.status) + ' · ' + UI.scoreBadge(p) + '</p></div>' +
        '<div class="actions"><a class="btn" href="#/offers/' + p.id + '/edit">Edit</a><button class="btn primary" data-act="campaign">Build campaign</button><button class="btn danger" data-act="delete">Delete</button></div></div>' +
        '<div class="tabs" role="tablist">' + TABS.map(function (x) { return '<button role="tab" data-tab="' + x[0] + '" aria-selected="' + (x[0] === tab) + '" class="' + (x[0] === tab ? 'active' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<section data-panel="overview" class="grid grid-2"><div class="panel"><h2>Product information</h2>' + info + '</div><div><div class="panel"><h2>Campaigns</h2>' + campaigns + '</div><div class="panel"><h2>Landing pages</h2>' + pages + '</div><div class="panel"><h2>Affiliate links</h2>' + links + '<a href="#/links?productId=' + p.id + '">Manage links</a></div></div></section>' +
        '<section data-panel="score" class="panel">' + scorePanel + '</section>' +
        '<section data-panel="experience" class="panel">' + expPanel + '</section>' +
        '<section data-panel="content" class="panel">' + contentPanel + '</section>' +
        '<section data-panel="performance" class="panel">' + perfPanel + '</section>';

      function showTab(name) {
        Array.prototype.forEach.call(el.querySelectorAll('[data-panel]'), function (s) { s.hidden = s.getAttribute('data-panel') !== name; });
        Array.prototype.forEach.call(el.querySelectorAll('[data-tab]'), function (b) { var on = b.getAttribute('data-tab') === name; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
      }
      showTab(tab);
      UI.on(el, '[data-tab]', 'click', function (ev, b) { showTab(b.getAttribute('data-tab')); history.replaceState(null, '', '#/offers/' + p.id + '?tab=' + b.getAttribute('data-tab')); });

      UI.on(el, '[data-act="campaign"]', 'click', function (ev, b) {
        if (d.campaigns.length) { location.hash = '#/campaigns/' + d.campaigns[0].id; return; }
        UI.busy(b, function () {
          return UI.act('createCampaign', { productId: p.id }).then(function (r) { if (r) { UI.toast('Campaign plan drafted — review every section.', 'ok'); location.hash = '#/campaigns/' + r.campaign.id; } });
        });
      });
      UI.on(el, '[data-act="delete"]', 'click', function () {
        UI.confirm('Delete "' + (p.name || 'this offer') + '" and its links? This cannot be undone.', 'Delete').then(function (yes) {
          if (!yes) return;
          Backend.call('deleteProduct', { id: p.id }).then(function (res) {
            if (res.success) { UI.toast('Offer deleted', 'ok'); location.hash = '#/offers'; return; }
            if (res.error.code === 'CONFLICT') {
              UI.confirm(res.error.message + ' Archive the offer now?', 'Archive').then(function (y) {
                if (y) UI.act('updateProduct', { id: p.id, status: 'archived' }).then(function (r) { if (r) { UI.toast('Offer archived', 'ok'); ctx.rerender(); } });
              });
            } else UI.apiError(res);
          });
        });
      });
      el.querySelector('#score-form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var inputs = {};
        var f = UI.formData(ev.target);
        Object.keys(f).forEach(function (k) { if (f[k] !== '') inputs[k] = Number(f[k]); });
        UI.busy(ev.target.querySelector('[type=submit]'), function () {
          return UI.act('scoreProduct', { id: p.id, inputs: inputs }).then(function (r) { if (r) { UI.toast('Score updated: ' + r.product.scoreLabel, 'ok'); UI.go('#/offers/' + p.id + '?tab=score'); } });
        });
      });
      el.querySelector('#exp-form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var form = ev.target;
        UI.busy(form.querySelector('[type=submit]'), function () {
          return UI.act('saveExperienceNotes', { id: p.id, notes: UI.formData(form) }, form).then(function (r) { if (r) UI.toast('Experience notes saved', 'ok'); });
        });
      });
    });
  };
})();
