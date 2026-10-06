/* Affiliate link manager: list, add, edit, activate/deactivate, validate, check. */
(function () {
  'use strict';
  var esc = UI.esc;

  Views.links = function (el, ctx) {
    return Promise.all([
      UI.load(el, ctx, 'getLinks'),
      Backend.call('getCampaigns').then(function (r) { return r.success ? r.data : { campaigns: [], products: [] }; })
    ]).then(function (res) {
      var d = res[0], meta = res[1];
      if (!d) return;
      var prod = {};
      meta.products.forEach(function (p) { prod[p.id] = p; });
      var links = ctx.query.productId ? d.links.filter(function (l) { return l.productId === ctx.query.productId; }) : d.links;

      el.innerHTML =
        '<div class="page-head"><div><h1>Affiliate links</h1><p class="sub">Every CTA points directly to a validated network link with rel="sponsored". No cloaking, no misleading redirects.</p></div>' +
        '<div class="actions"><button class="btn" id="check">Check links now</button><button class="btn primary" id="add"' + (meta.products.length ? '' : ' disabled') + '>+ Add link</button></div></div>' +
        (Backend.isDemo() ? '<p class="issue warning">Demo mode: link checks need the Apps Script backend (browsers cannot test other sites). URL validation still works.</p>' : '') +
        '<div class="panel">' + UI.table([
          { label: 'Link', render: function (l) { return '<strong>' + esc(l.label || 'Link') + '</strong><div class="small truncate"><code>' + esc(l.url) + '</code></div>'; } },
          { label: 'Offer', render: function (l) { var p = prod[l.productId]; return p ? '<a href="#/offers/' + p.id + '">' + esc(p.name) + '</a>' : '—'; } },
          { label: 'Network', render: function (l) { return esc(UI.networkLabel(l.network)); } },
          { label: 'Active', render: function (l) { return l.active ? 'Yes' : 'No'; } },
          { label: 'Check', render: function (l) { return UI.badge(l.status) + (l.lastStatusCode ? ' <span class="small muted">HTTP ' + esc(l.lastStatusCode) + '</span>' : '') + '<div class="small muted">' + UI.date(l.lastCheckedAt) + '</div>'; } },
          { label: 'ID', render: function (l) { return '<code class="small">' + esc(l.id) + '</code>'; } },
          { label: '', render: function (l) { return '<button class="btn small" data-edit="' + l.id + '">Edit</button> <button class="btn small" data-toggle="' + l.id + '">' + (l.active ? 'Deactivate' : 'Activate') + '</button>'; } }
        ], links, 'No links yet. A primary link is created automatically when you add an offer with an affiliate URL.') + '</div>';

      function find(id) { return d.links.filter(function (l) { return l.id === id; })[0]; }
      function form(l) {
        var isNew = !l;
        l = l || { active: true, productId: ctx.query.productId || '' };
        UI.modal('<h2>' + (isNew ? 'Add affiliate link' : 'Edit link') + '</h2><form id="lf" class="form">' +
          (isNew ? UI.field({ name: 'productId', label: 'Offer', type: 'select', value: l.productId, options: meta.products.map(function (p) { return [p.id, (p.name || p.id) + ' · ' + UI.networkLabel(p.network)]; }) }) : '') +
          UI.field({ name: 'url', label: 'Affiliate URL', type: 'url', value: l.url, help: 'Must be an https link on the network\'s domain.' }) +
          '<p class="help" id="lv" aria-live="polite"></p>' +
          UI.field({ name: 'label', label: 'Label', value: l.label, placeholder: 'e.g. TikTok bio link' }) +
          UI.field({ name: 'campaignId', label: 'Campaign (optional)', type: 'select', value: l.campaignId, options: [['', '—']].concat(meta.campaigns.map(function (c) { return [c.id, c.name]; })) }) +
          UI.field({ name: 'active', label: 'Active', type: 'checkbox', value: l.active }) +
          UI.field({ name: 'notes', label: 'Notes', type: 'textarea', rows: 2, value: l.notes }) +
          '<div class="actions"><button class="btn primary" type="submit">Save</button>' + (!isNew ? '<button class="btn danger" type="button" id="ldel">Delete</button>' : '') + '<button class="btn" type="button" data-close>Cancel</button></div></form>', function (root) {
          var f = root.querySelector('#lf');
          f.elements.url.addEventListener('blur', function () {
            var pid = isNew ? f.elements.productId.value : l.productId;
            Backend.call('validateLink', { url: f.elements.url.value, network: (prod[pid] || {}).network }).then(function (r) {
              if (!r.success) return;
              root.querySelector('#lv').innerHTML = r.data.ok ? '<span style="color:var(--ok)">✓ Valid (' + esc(r.data.host) + ')</span>' + (r.data.warnings[0] ? '<br><span style="color:var(--warn)">' + esc(r.data.warnings[0]) + '</span>' : '') : '<span style="color:var(--bad)">' + esc(r.data.error) + '</span>';
            });
          });
          f.addEventListener('submit', function (ev) {
            ev.preventDefault();
            var data = UI.formData(f);
            if (!isNew) data.id = l.id;
            var action = isNew ? 'createLink' : 'updateLink';
            Backend.call(action, data).then(function (res2) {
              if (!res2.success && res2.error.code === 'CONFIRMATION_REQUIRED') {
                return UI.confirm(res2.error.message, 'Change link').then(function (y) {
                  if (!y) return;
                  data.confirmOfferChange = true;
                  return UI.act(action, data).then(function (r) { if (r) { UI.toast('Link saved', 'ok'); ctx.rerender(); } });
                });
              }
              if (!res2.success) return UI.apiError(res2, f);
              UI.closeModal(); UI.toast('Link saved', 'ok'); ctx.rerender();
            });
          });
          var del = root.querySelector('#ldel');
          if (del) del.addEventListener('click', function () {
            UI.act('deleteLink', { id: l.id }).then(function (r) { if (r) { UI.closeModal(); UI.toast('Link deleted', 'ok'); ctx.rerender(); } });
          });
        });
      }
      el.querySelector('#add').addEventListener('click', function () { form(null); });
      UI.on(el, '[data-edit]', 'click', function (ev, b) { form(find(b.getAttribute('data-edit'))); });
      UI.on(el, '[data-toggle]', 'click', function (ev, b) {
        var l = find(b.getAttribute('data-toggle'));
        UI.act('updateLink', { id: l.id, active: !l.active }).then(function (r) { if (r) ctx.rerender(); });
      });
      el.querySelector('#check').addEventListener('click', function (ev) {
        UI.busy(ev.target, function () {
          return UI.act('checkLinks', {}).then(function (r) {
            if (!r) return;
            var broken = r.checked.filter(function (c) { return c.status === 'broken'; }).length;
            UI.toast(r.checked.length + ' link(s) checked' + (broken ? ', ' + broken + ' broken' : ''), broken ? 'error' : 'ok');
            ctx.rerender();
          });
        });
      });
    });
  };
})();
