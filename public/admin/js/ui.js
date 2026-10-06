/* Affiliate Campaign Hub — small UI helper library (no framework). */
(function () {
  'use strict';
  var esc = function (s) { return AH.util.escapeHtml(s); };

  var UI = {
    esc: esc,

    pct: function (x, digits) { return x === null || x === undefined || !isFinite(x) ? '—' : (x * 100).toFixed(digits === undefined ? 1 : digits) + '%'; },
    num: function (x) { return x === null || x === undefined ? '—' : Number(x).toLocaleString(); },
    money: function (x, cur) { return x === null || x === undefined ? '—' : (cur ? cur + ' ' : '') + Number(x).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
    date: function (iso) { return iso ? String(iso).slice(0, 10) : '—'; },
    label: function (s) { return String(s || '').replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); },

    badge: function (value, text) {
      var v = String(value || '').toLowerCase();
      return '<span class="badge b-' + esc(v) + '">' + esc(text || UI.label(value) || '—') + '</span>';
    },

    scoreBadge: function (p) {
      if (!p || p.score === null || p.score === undefined) return UI.badge('unrated', 'UNRATED');
      return UI.badge(p.scoreLabel, p.scoreLabel + ' · ' + p.score) + (p.scoreConfidence < 50 ? ' <span class="flag" title="Less than half of the criteria are rated">low confidence</span>' : '');
    },

    loading: function (el, text) {
      el.innerHTML = '<div class="panel" aria-busy="true"><p class="muted">' + esc(text || 'Loading…') + '</p><div class="skeleton"></div><div class="skeleton" style="width:80%"></div><div class="skeleton" style="width:60%"></div></div>';
    },

    empty: function (title, text, actionHtml) {
      return '<div class="state"><h2>' + esc(title) + '</h2><p>' + esc(text || '') + '</p>' + (actionHtml || '') + '</div>';
    },

    errorBox: function (err, retryId) {
      var e = err || {};
      return '<div class="panel state error" role="alert"><h2>Something went wrong</h2><p>' + esc(e.message || 'Unknown error') + '</p>' +
        (e.code ? '<p class="small muted">Code: ' + esc(e.code) + '</p>' : '') +
        (retryId ? '<button class="btn" id="' + esc(retryId) + '">Try again</button>' : '') + '</div>';
    },

    toast: function (msg, type) {
      var box = document.getElementById('toasts');
      var t = document.createElement('div');
      t.className = 'toast ' + (type || '');
      t.textContent = msg;
      box.appendChild(t);
      while (box.children.length > 3) box.removeChild(box.firstChild);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, type === 'error' ? 7000 : 3500);
    },

    /** Show an API error as a toast (+ inline field errors when a form is given). */
    apiError: function (res, form) {
      var e = (res && res.error) || { message: 'Unknown error' };
      if (form) UI.showFieldErrors(form, e.details);
      var extra = '';
      if (e.details && Array.isArray(e.details.errors)) extra = ' ' + e.details.errors.map(function (x) { return x.message; }).slice(0, 2).join(' ');
      UI.toast(e.message + extra, 'error');
    },

    showFieldErrors: function (form, details) {
      Array.prototype.forEach.call(form.querySelectorAll('.field'), function (f) {
        f.classList.remove('has-error');
        var old = f.querySelector('.err');
        if (old) old.parentNode.removeChild(old);
      });
      if (!details || typeof details !== 'object') return;
      var first = null;
      Object.keys(details).forEach(function (name) {
        var input = form.querySelector('[name="' + name + '"]');
        if (!input || typeof details[name] !== 'string') return;
        var field = input.closest('.field');
        if (!field) return;
        field.classList.add('has-error');
        var p = document.createElement('p');
        p.className = 'err';
        p.textContent = details[name];
        field.appendChild(p);
        input.setAttribute('aria-invalid', 'true');
        if (!first) first = input;
      });
      if (first) first.focus();
    },

    /**
     * Render a form field.
     * f = { name, label, type, value, options:[[value,label]], help, required, rows, placeholder, span, attrs }
     */
    field: function (f) {
      var id = 'f-' + f.name.replace(/[^a-z0-9_-]/gi, '-');
      var v = f.value === null || f.value === undefined ? '' : f.value;
      var req = f.required ? ' required' : '';
      var attrs = f.attrs || '';
      var input;
      if (f.type === 'select') {
        input = '<select id="' + id + '" name="' + esc(f.name) + '"' + req + ' ' + attrs + '>' + (f.options || []).map(function (o) {
          var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : UI.label(o);
          return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(lab) + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        input = '<textarea id="' + id + '" name="' + esc(f.name) + '" rows="' + (f.rows || 3) + '"' + req + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + ' ' + attrs + '>' + esc(v) + '</textarea>';
      } else if (f.type === 'checkbox') {
        return '<div class="field' + (f.span ? ' span-2' : '') + '"><label class="check"><input type="checkbox" id="' + id + '" name="' + esc(f.name) + '"' + (v ? ' checked' : '') + ' ' + attrs + '> <span>' + esc(f.label) + '</span></label>' + (f.help ? '<p class="help">' + esc(f.help) + '</p>' : '') + '</div>';
      } else {
        input = '<input id="' + id + '" name="' + esc(f.name) + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '"' + req + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + (f.step ? ' step="' + f.step + '"' : '') + ' ' + attrs + '>';
      }
      return '<div class="field' + (f.span ? ' span-2' : '') + '"><label for="' + id + '">' + esc(f.label) + (f.required ? ' *' : '') + '</label>' + input + (f.help ? '<p class="help">' + esc(f.help) + '</p>' : '') + '</div>';
    },

    /** Collect a form into an object (checkboxes → boolean, data-type="number" → number|''). */
    formData: function (form) {
      var out = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.disabled) return;
        if (el.type === 'checkbox') out[el.name] = el.checked;
        else if (el.type === 'number') out[el.name] = el.value === '' ? '' : Number(el.value);
        else out[el.name] = el.value;
      });
      return out;
    },

    lines: function (text) { return String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); },

    modal: function (html, onMount) {
      var dlg = document.getElementById('modal');
      document.getElementById('modal-body').innerHTML = html;
      if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
      Array.prototype.forEach.call(dlg.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', UI.closeModal); });
      if (onMount) onMount(document.getElementById('modal-body'));
    },

    closeModal: function () {
      var dlg = document.getElementById('modal');
      if (typeof dlg.close === 'function' && dlg.open) dlg.close(); else dlg.removeAttribute('open');
    },

    confirm: function (message, okText) {
      return new Promise(function (resolve) {
        UI.modal('<h2>Please confirm</h2><p>' + esc(message) + '</p><div class="actions"><button class="btn primary" id="c-ok">' + esc(okText || 'Confirm') + '</button><button class="btn" id="c-cancel">Cancel</button></div>', function (root) {
          root.querySelector('#c-ok').addEventListener('click', function () { UI.closeModal(); resolve(true); });
          root.querySelector('#c-cancel').addEventListener('click', function () { UI.closeModal(); resolve(false); });
          root.querySelector('#c-ok').focus();
        });
        document.getElementById('modal').addEventListener('cancel', function () { resolve(false); }, { once: true });
      });
    },

    download: function (filename, content, mime) {
      var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 500);
    },

    copy: function (text) {
      var done = function () { UI.toast('Copied to clipboard', 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(done, function () { UI.toast('Copy failed — select and copy manually.', 'error'); });
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { UI.toast('Copy failed', 'error'); }
      ta.parentNode.removeChild(ta);
    },

    /** Run an async action with a busy button. */
    busy: function (btn, fn) {
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Working…'; }
      return Promise.resolve().then(fn).finally(function () {
        if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      });
    },

    on: function (root, selector, event, handler) {
      root.addEventListener(event, function (ev) {
        var t = ev.target.closest(selector);
        if (t && root.contains(t)) handler(ev, t);
      });
    },

    table: function (cols, rows, emptyText) {
      if (!rows.length) return '<p class="muted">' + esc(emptyText || 'Nothing here yet.') + '</p>';
      return '<div class="table-wrap"><table><thead><tr>' + cols.map(function (c) { return '<th' + (c.num ? ' class="num"' : '') + ' scope="col">' + esc(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td' + (c.num ? ' class="num"' : '') + '>' + c.render(r) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>';
    },

    perfCols: function (nameRender) {
      return [
        { label: 'Name', render: nameRender || function (r) { return esc(r.name); } },
        { label: 'Visits', num: true, render: function (r) { return UI.num(r.views); } },
        { label: 'Sessions', num: true, render: function (r) { return UI.num(r.sessions); } },
        { label: 'Clicks', num: true, render: function (r) { return UI.num(r.clicks); } },
        { label: 'CTR', num: true, render: function (r) { return UI.pct(r.ctr); } },
        { label: 'Conv.', num: true, render: function (r) { return UI.num(r.conversions); } },
        { label: 'Revenue', num: true, render: function (r) { return UI.money(r.revenue); } },
        { label: 'EPC', num: true, render: function (r) { return UI.money(r.epc); } },
        { label: 'Status', render: function (r) { return r.status ? UI.badge(r.status, { best: 'BEST', attention: 'NEEDS ATTENTION', not_enough: 'NOT ENOUGH DATA', ok: 'OK' }[r.status]) : ''; } }
      ];
    },

    recommendations: function (recs) {
      if (!recs || !recs.length) return '<p class="muted">No recommendations — there is nothing in your data that needs action right now.</p>';
      return '<ul class="list">' + recs.map(function (r) {
        return '<li class="rec">' + '<div>' + UI.badge(r.level, r.level.toUpperCase()) + ' <strong>' + esc(r.title) + '</strong></div>' +
          '<div>' + esc(r.detail) + '</div><div class="evidence">Based on: ' + esc(r.evidence) + '</div></li>';
      }).join('') + '</ul>';
    },

    issues: function (check) {
      if (!check) return '';
      var all = check.errors.concat(check.warnings);
      if (!all.length) return '<p class="issue" style="background:var(--ok-soft);color:var(--ok)">All compliance checks passed.</p>';
      return all.map(function (i) {
        return '<div class="issue ' + i.level + '"><strong>' + (i.level === 'error' ? 'Must fix' : 'Review') + ':</strong> ' + esc(i.message) + (i.excerpt ? '<small>“' + esc(i.excerpt) + '”</small>' : '') + '</div>';
      }).join('');
    },

    networkLabel: function (n) { return AH.schema.NETWORK_LABELS[n] || n || '—'; },

    /** Navigate (or re-render when already on that route). */
    go: function (hash) {
      if (location.hash === hash) App.render(); else location.hash = hash;
    },

    daysAgo: function (n) { var d = new Date(Date.now() - n * 86400000); return d.toISOString().slice(0, 10); },

    /**
     * Load data for a view. On failure renders an error state with "Try again" and
     * resolves to null. Ignores responses for views the user already navigated away from.
     */
    load: function (el, ctx, action, payload) {
      return Backend.call(action, payload).then(function (res) {
        if (!ctx.isCurrent()) return null;
        if (!res.success) {
          var e = res.error || {};
          var fix = ['UNAUTHORIZED', 'NOT_CONFIGURED', 'BAD_RESPONSE', 'NETWORK_ERROR'].indexOf(e.code) !== -1
            ? '<p><a class="btn" href="#/settings">Open Settings</a></p>' : '';
          el.innerHTML = UI.errorBox(e, 'retry-load') + fix;
          var b = el.querySelector('#retry-load');
          if (b) b.addEventListener('click', ctx.rerender);
          return null;
        }
        return res.data;
      });
    },

    /** Call a mutating action; toast on error; resolves to data or null. */
    act: function (action, payload, form) {
      return Backend.call(action, payload).then(function (res) {
        if (!res.success) { UI.apiError(res, form); return null; }
        if (res.warnings && res.warnings.length) UI.toast(res.warnings[0]);
        return res.data;
      });
    },

    workflow: [
      ['Add offer', '#/offers/new'], ['Analyze & score', '#/offers'], ['Build campaign', '#/campaigns'], ['Landing page', '#/pages'],
      ['Content plan', '#/content'], ['Distribute', '#/social'], ['Track', '#/analytics'], ['Optimize', '#/analytics']
    ]
  };

  window.UI = UI;
  window.Views = window.Views || {};
})();
