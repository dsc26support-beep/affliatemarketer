/* Landing pages: list, editor with live preview, compliance check, approval, export, A/B tests. */
(function () {
  'use strict';
  var esc = UI.esc;

  function pageUrl(page, settings) { return AH.seo.canonical(page, settings || {}); }

  // ------------------------------------------------------------------ list
  Views.pageList = function (el, ctx) {
    return UI.load(el, ctx, 'getLandingPages').then(function (d) {
      if (!d) return;
      var prod = {}, camp = {};
      d.products.forEach(function (p) { prod[p.id] = p; });
      d.campaigns.forEach(function (c) { camp[c.id] = c; });
      el.innerHTML =
        '<div class="page-head"><div><h1>Landing Pages</h1><p class="sub">Generated as structured drafts. Publishing requires your review, a passing compliance check and explicit approval.</p></div>' +
        '<div class="actions"><button class="btn" id="sitemap">Download sitemap.xml</button><button class="btn" id="robots">Download robots.txt</button><a class="btn primary" href="#/campaigns">Generate from a campaign</a></div></div>' +
        '<div class="panel">' + (d.pages.length ? UI.table([
          { label: 'Page', render: function (p) { return '<a href="#/pages/' + p.id + '">' + esc(p.title) + '</a><div class="small muted">/p/' + esc(p.slug) + '.html</div>'; } },
          { label: 'Type', render: function (p) { return esc(UI.label(p.pageType)); } },
          { label: 'Offer', render: function (p) { return esc((prod[p.productId] || {}).name || '—'); } },
          { label: 'Campaign', render: function (p) { var c = camp[p.campaignId]; return c ? '<a href="#/campaigns/' + c.id + '">' + esc(c.name) + '</a>' : '—'; } },
          { label: 'Status', render: function (p) { return UI.badge(p.status); } },
          { label: 'Updated', render: function (p) { return UI.date(p.updatedAt); } }
        ], d.pages) : UI.empty('No landing pages yet', 'Open a campaign and generate a landing page draft.', '<a class="btn primary" href="#/campaigns">Go to campaigns</a>')) + '</div>' +
        '<div class="panel"><h2>Publishing to GitHub Pages / Cloudflare Pages</h2><ol class="small">' +
        '<li>Publish the page here (review + approval).</li><li>Click <em>Export static HTML</em> in the editor and commit the file to <code>public/p/&lt;slug&gt;.html</code>.</li>' +
        '<li>Download <em>sitemap.xml</em> and commit it to <code>public/sitemap.xml</code>; submit it in Google Search Console.</li>' +
        '<li>Until a static file exists, <code>/p/&lt;slug&gt;.html</code> falls back to the live viewer (noindex).</li></ol></div>';
      function dl(kind) {
        return function (ev) {
          UI.busy(ev.target, function () {
            return UI.act('getSitemap').then(function (r) {
              if (!r) return;
              if (kind === 'xml') UI.download('sitemap.xml', r.xml, 'application/xml');
              else UI.download('robots.txt', r.robots);
              if (!d.settings.siteUrl) UI.toast('Set your Site URL in Settings — sitemap URLs are relative without it.', 'error');
            });
          });
        };
      }
      el.querySelector('#sitemap').addEventListener('click', dl('xml'));
      el.querySelector('#robots').addEventListener('click', dl('robots'));
    });
  };

  // ------------------------------------------------------------------ editor field spec
  // [path, label, kind, rows/help]
  var CONTENT_FIELDS = [
    ['Hero', [
      ['sections.hero.headline', 'Headline', 'text'],
      ['sections.hero.subheadline', 'Subheadline', 'textarea', 2],
      ['sections.hero.summary', 'Short verdict / summary (shown before the first CTA)', 'textarea', 4],
      ['sections.hero.ctaText', 'First CTA text', 'text']
    ]],
    ['Problem & solution', [
      ['sections.problem.heading', 'Problem heading', 'text'], ['sections.problem.body', 'Problem', 'textarea', 6],
      ['sections.solution.heading', 'Solution heading', 'text'], ['sections.solution.body', 'Solution', 'textarea', 6],
      ['sections.benefits.items', 'Benefits (one per line)', 'lines', 4],
      ['sections.product.heading', 'Product explanation heading', 'text'], ['sections.product.body', 'Product explanation (lines starting with "- " become bullets)', 'textarea', 7]
    ]],
    ['Evaluation', [
      ['sections.method.heading', 'Method heading', 'text'], ['sections.method.body', 'How this was researched / evaluated', 'textarea', 4],
      ['sections.experience.enabled', 'Show my hands-on notes (only if you really tested it)', 'check'],
      ['sections.experience.body', 'Hands-on notes', 'textarea', 6],
      ['sections.experience.screenshots', 'Screenshot URLs (https, one per line)', 'lines', 3],
      ['sections.forWho.items', 'Who it is for (one per line)', 'lines', 3], ['sections.notFor.items', 'Who it is NOT for (one per line)', 'lines', 3],
      ['sections.pros.items', 'Pros (one per line)', 'lines', 4], ['sections.cons.items', 'Cons (one per line — at least one)', 'lines', 4]
    ]],
    ['Comparison & FAQ', [
      ['sections.comparison.enabled', 'Show comparison table', 'check'],
      ['sections.comparison.heading', 'Comparison heading', 'text'],
      ['sections.comparison.columns', 'Columns (separated by |)', 'cols'],
      ['sections.comparison.rows', 'Rows (one per line, cells separated by |)', 'rows', 6],
      ['sections.comparison.note', 'Note under the table', 'text'],
      ['sections.faq.items', 'FAQ (blocks of "Q: …" and "A: …" separated by a blank line)', 'faq', 10]
    ]],
    ['Decision & extras', [
      ['sections.finalCta.heading', 'Final decision heading', 'text'], ['sections.finalCta.body', 'Final decision text', 'textarea', 4],
      ['sections.finalCta.ctaText', 'Final CTA text', 'text'], ['sections.ctaText', 'Middle CTA text', 'text'],
      ['sections.disclaimer.body', 'Disclaimer (required for health/money niches)', 'textarea', 3],
      ['sections.sources.items', 'Sources (one per line: Label | https://url)', 'sources', 3],
      ['sections.leadCapture.enabled', 'Enable email lead capture (explicit consent checkbox)', 'check'],
      ['sections.leadCapture.heading', 'Lead capture heading', 'text'], ['sections.leadCapture.body', 'Lead capture text', 'textarea', 2],
      ['sections.leadCapture.magnet', 'Lead magnet name', 'text'], ['sections.leadCapture.consentText', 'Consent text', 'textarea', 2],
      ['sections.leadCapture.buttonText', 'Button text', 'text']
    ]]
  ];
  var SEO_FIELDS = [
    ['seo.title', 'SEO title (≤ 60 chars)', 'text'], ['seo.metaDescription', 'Meta description (120–160 chars)', 'textarea', 3],
    ['seo.canonical', 'Canonical URL (leave empty for default)', 'text'], ['seo.ogTitle', 'Open Graph title', 'text'],
    ['seo.ogDescription', 'Open Graph description', 'textarea', 2], ['seo.ogImage', 'Open Graph image URL (https)', 'text'],
    ['seo.noindex', 'Hide from search engines (noindex)', 'check']
  ];

  function get(obj, path) { return path.split('.').reduce(function (o, k) { return o && o[k] !== undefined ? o[k] : undefined; }, obj); }
  function set(obj, path, val) {
    var parts = path.split('.'), o = obj;
    for (var i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = val;
  }

  function toText(kind, v) {
    if (kind === 'lines') return (v || []).join('\n');
    if (kind === 'cols') return (v || []).join(' | ');
    if (kind === 'rows') return (v || []).map(function (r) { return (r || []).join(' | '); }).join('\n');
    if (kind === 'faq') return (v || []).map(function (f) { return 'Q: ' + f.q + '\nA: ' + f.a; }).join('\n\n');
    if (kind === 'sources') return (v || []).map(function (s) { return s.label + ' | ' + s.url; }).join('\n');
    return v === undefined || v === null ? '' : v;
  }
  function fromText(kind, t) {
    if (kind === 'lines') return UI.lines(t);
    if (kind === 'cols') return String(t).split('|').map(function (s) { return s.trim(); });
    if (kind === 'rows') return UI.lines(t).map(function (l) { return l.split('|').map(function (s) { return s.trim(); }); });
    if (kind === 'faq') {
      return String(t).split(/\n\s*\n/).map(function (b) {
        var q = /Q:\s*([\s\S]*?)(?:\nA:|$)/.exec(b), a = /A:\s*([\s\S]*)$/.exec(b);
        return q ? { q: q[1].trim(), a: a ? a[1].trim() : '' } : null;
      }).filter(function (f) { return f && f.q; });
    }
    if (kind === 'sources') return UI.lines(t).map(function (l) { var p = l.split('|'); return { label: p[0].trim(), url: (p[1] || p[0]).trim() }; });
    return t;
  }

  function fieldHtml(page, f) {
    var v = get(page, f[0]);
    var kind = f[2];
    if (kind === 'check') return UI.field({ name: f[0], label: f[1], type: 'checkbox', value: !!v, span: true, attrs: 'data-kind="check"' });
    var textual = kind === 'text';
    return UI.field({ name: f[0], label: f[1], type: textual ? 'text' : 'textarea', rows: f[3] || 3, value: toText(kind, v), span: !textual || f[0].indexOf('heading') === -1, attrs: 'data-kind="' + kind + '"' });
  }

  // ------------------------------------------------------------------ editor
  Views.pageEditor = function (el, ctx) {
    var id = ctx.params[0];
    return UI.load(el, ctx, 'getLandingPage', { id: id }).then(function (d) {
      if (!d) return;
      var page = d.page;
      var settings = d.settings;
      var tab = ctx.query.tab || 'content';
      var placements = (page.sections && page.sections.ctaPlacements) || {};

      var contentHtml = CONTENT_FIELDS.map(function (g) {
        return '<fieldset style="margin-bottom:12px"><legend>' + esc(g[0]) + '</legend><div class="form cols-2">' + g[1].map(function (f) { return fieldHtml(page, f); }).join('') + '</div></fieldset>';
      }).join('');
      var basics = '<div class="form cols-2">' +
        UI.field({ name: 'title', label: 'Page title (internal + fallback)', value: page.title }) +
        UI.field({ name: 'slug', label: 'URL slug', value: page.slug, help: '/p/' + page.slug + '.html' }) +
        UI.field({ name: 'linkId', label: 'Affiliate link used by every CTA', type: 'select', value: page.linkId, options: [['', '— none —']].concat(d.links.map(function (l) { return [l.id, (l.label || 'Link') + (l.active ? '' : ' (inactive)') + ' · ' + l.url.slice(0, 50)]; })) }) +
        UI.field({ name: 'pageType', label: 'Page type', type: 'select', value: page.pageType, options: AH.schema.PAGE_TYPES }) +
        '</div>';
      var ctaHtml = '<fieldset><legend>CTA placements (max 4 — avoid excessive buttons)</legend><div class="form cols-2">' +
        [['afterIntro', 'After the initial recommendation'], ['afterSolution', 'After explaining the solution'], ['afterEvaluation', 'After the comparison / evaluation'], ['final', 'At the final decision point']].map(function (x) {
          return UI.field({ name: 'cta.' + x[0], label: x[1], type: 'checkbox', value: placements[x[0]] !== false });
        }).join('') + '</div></fieldset>';
      var seoHtml = '<div class="form cols-2">' + SEO_FIELDS.map(function (f) { return fieldHtml(page, f); }).join('') + '</div>' +
        '<h3>SEO notes</h3><div id="seo-lint"></div>' +
        '<h3>Internal linking suggestions</h3>' + (d.internalLinks.length ? '<ul>' + d.internalLinks.map(function (l) { return '<li><a href="#/pages/' + l.pageId + '">' + esc(l.title) + '</a> <code>' + esc(l.path) + '</code></li>'; }).join('') + '</ul>' : '<p class="muted small">No related pages yet. Build a cluster: problem guide → buyer guide → comparison → this page.</p>');

      var utmHtml = '<div class="form cols-2">' +
        UI.field({ name: 'utm_source', label: 'Source', value: 'tiktok', attrs: 'data-utm' }) +
        UI.field({ name: 'utm_medium', label: 'Medium', value: 'social', attrs: 'data-utm' }) +
        UI.field({ name: 'utm_campaign', label: 'Campaign', value: page.slug, attrs: 'data-utm' }) +
        UI.field({ name: 'utm_content', label: 'Content (e.g. video id)', value: '', attrs: 'data-utm' }) +
        '</div><p class="pre" id="utm-out"></p><button class="btn small" type="button" id="utm-copy">Copy tracking link</button>';

      var abHtml = '<div id="ab-list">' + abList(d.abResults) + '</div><h3>New A/B test</h3><form id="ab-form" class="form cols-2">' +
        UI.field({ name: 'name', label: 'Test name', value: '' }) +
        UI.field({ name: 'element', label: 'What to test', type: 'select', value: 'headline', options: [['headline', 'Headline'], ['cta_text', 'CTA text'], ['cta_placement', 'CTA placement'], ['page_structure', 'Page structure (hide sections)'], ['comparison_format', 'Comparison (hide sections)']] }) +
        UI.field({ name: 'variantA', label: 'A — control', value: get(page, 'sections.hero.headline'), help: 'Current version.' }) +
        UI.field({ name: 'variantB', label: 'B — challenger', value: '', help: 'Text, or for placement: afterIntro,final · for structure: hide:comparison' }) +
        UI.field({ name: 'hypothesis', label: 'Hypothesis', type: 'textarea', rows: 2, span: true, value: '' }) +
        '<div class="actions span-2"><button class="btn" type="submit">Create test (draft)</button><span class="small muted">No winner is declared before ' + settings.abMinSamplePerVariant + ' visits per variant and 95% confidence.</span></div></form>';

      var TABS = [['content', 'Content'], ['basics', 'Settings & CTAs'], ['seo', 'SEO'], ['distribute', 'Tracking links'], ['ab', 'A/B tests']];
      el.innerHTML =
        '<div class="crumbs"><a href="#/pages">Landing Pages</a> ›</div>' +
        '<div class="page-head"><div><h1>' + esc(page.title) + '</h1><p class="sub">' + UI.badge(page.status) + ' · ' + esc(UI.label(page.pageType)) + ' · offer <a href="#/offers/' + d.product.id + '">' + esc(d.product.name) + '</a></p></div>' +
        '<div class="actions"><button class="btn primary" id="save">Save draft</button><button class="btn" id="export">Export static HTML</button>' +
        (page.status === 'published' ? '<button class="btn" id="unpublish">Unpublish</button>' : '<button class="btn danger" id="delete">Delete</button>') + '</div></div>' +
        (page.status === 'published' ? '<p class="issue warning">This page is live. Saving changes moves it back to draft until you approve it again.</p>' : '') +
        '<div class="grid grid-2">' +
        '<form id="page-form" class="panel" novalidate><div class="tabs" role="tablist">' + TABS.map(function (x) { return '<button type="button" role="tab" data-tab="' + x[0] + '" class="' + (x[0] === tab ? 'active' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<section data-panel="content">' + contentHtml + '</section>' +
        '<section data-panel="basics">' + basics + ctaHtml + '</section>' +
        '<section data-panel="seo">' + seoHtml + '</section>' +
        '<section data-panel="distribute"><p class="small muted">Tag every link you share so Analytics can attribute visits to the right channel.</p>' + utmHtml + '</section>' +
        '<section data-panel="ab"></section>' +
        '</form>' +
        '<div><div class="panel"><h2>Compliance check</h2><div id="check"></div></div>' +
        '<div class="panel"><h2>Review &amp; publish</h2>' +
        '<label class="check"><input type="checkbox" id="approve"> <span>I reviewed this page. Every claim is accurate and supported, nothing implies testing I did not do, and it gives readers genuine value beyond the merchant\'s page.</span></label>' +
        '<div class="actions" style="margin-top:10px"><button class="btn primary" id="publish" disabled>' + (page.status === 'published' ? 'Re-publish' : 'Publish') + '</button></div>' +
        '<p class="small muted" style="margin-top:8px">Live URL after export: <code>' + esc(pageUrl(page, settings)) + '</code></p></div>' +
        '<div class="panel"><h2>Preview</h2><p class="small muted">Preview only — tracking is disabled here.</p><iframe class="preview-frame" id="preview" title="Page preview" sandbox="allow-same-origin"></iframe></div></div>' +
        '</div>';
      // A/B section lives outside the page form to avoid nested forms.
      el.querySelector('[data-panel="ab"]').innerHTML = '<div id="ab-root"></div>';
      var abRoot = el.querySelector('#ab-root');
      abRoot.innerHTML = abHtml;

      var form = el.querySelector('#page-form');
      var dirty = false;

      function collect() {
        var next = JSON.parse(JSON.stringify(page));
        Array.prototype.forEach.call(form.querySelectorAll('[data-kind]'), function (inp) {
          var kind = inp.getAttribute('data-kind');
          set(next, inp.name, kind === 'check' ? inp.checked : fromText(kind, inp.value));
        });
        ['title', 'slug', 'linkId', 'pageType'].forEach(function (k) { next[k] = form.elements[k].value; });
        next.sections.ctaPlacements = {};
        AH.landing.CTA_KEYS.forEach(function (k) { next.sections.ctaPlacements[k] = form.elements['cta.' + k].checked; });
        return next;
      }
      function currentLink(next) { return d.links.filter(function (l) { return l.id === next.linkId; })[0] || null; }

      var check = d.check;
      function refresh() {
        var next = collect();
        check = AH.compliance.checkLandingPage(next, d.product, currentLink(next), settings);
        el.querySelector('#check').innerHTML = '<p class="small muted">' + check.stats.words + ' words · ' + check.stats.ctas + ' CTA(s) · ' + (check.stats.hasExperience ? 'first-hand notes recorded' : 'research-based (no first-hand notes)') + '</p>' + UI.issues(check);
        el.querySelector('#seo-lint').innerHTML = AH.seo.lint(next.seo).map(function (m) { return '<p class="issue warning">' + esc(m) + '</p>'; }).join('') || '<p class="small muted">Looks good.</p>';
        var frame = el.querySelector('#preview');
        frame.srcdoc = AH.landing.renderDocument({ page: next, product: d.product, link: currentLink(next), settings: settings, preview: true });
        updatePublish();
      }
      function updatePublish() {
        el.querySelector('#publish').disabled = !(el.querySelector('#approve').checked && check.ok);
      }
      var timer;
      form.addEventListener('input', function () { dirty = true; clearTimeout(timer); timer = setTimeout(refresh, 350); });
      form.addEventListener('change', function () { dirty = true; clearTimeout(timer); timer = setTimeout(refresh, 100); });
      el.querySelector('#approve').addEventListener('change', updatePublish);

      function showTab(name) {
        Array.prototype.forEach.call(form.querySelectorAll('[data-panel]'), function (s) { s.hidden = s.getAttribute('data-panel') !== name; });
        Array.prototype.forEach.call(form.querySelectorAll('[data-tab]'), function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === name); });
      }
      showTab(tab);
      UI.on(form, '[data-tab]', 'click', function (ev, b) { showTab(b.getAttribute('data-tab')); });

      function save() {
        var next = collect();
        return Backend.call('saveLandingPage', { id: page.id, title: next.title, slug: next.slug, linkId: next.linkId, pageType: next.pageType, sections: next.sections, seo: next.seo }).then(function (res) {
          if (!res.success) { UI.apiError(res, form); return null; }
          page = res.data.page;
          dirty = false;
          if (res.data.unpublished) UI.toast('Saved. The page is back in draft until you approve it again.');
          return res.data;
        });
      }
      el.querySelector('#save').addEventListener('click', function (ev) {
        UI.busy(ev.target, function () { return save().then(function (r) { if (r) { UI.toast('Saved', 'ok'); if (r.unpublished) ctx.rerender(); } }); });
      });
      el.querySelector('#publish').addEventListener('click', function (ev) {
        UI.busy(ev.target, function () {
          return save().then(function (r) {
            if (!r) return;
            return UI.act('publishLandingPage', { id: page.id, approve: true }).then(function (p) {
              if (p) { UI.toast('Published. Export the static HTML to put it on your site.', 'ok'); ctx.rerender(); }
            });
          });
        });
      });
      el.querySelector('#export').addEventListener('click', function (ev) {
        var go = dirty ? save() : Promise.resolve(true);
        UI.busy(ev.target, function () {
          return go.then(function (ok) {
            if (!ok) return;
            return UI.act('exportLandingPage', { id: page.id }).then(function (r) {
              if (!r) return;
              UI.download(r.filename, r.html, 'text/html');
              if (!r.published) UI.toast('Exported as a noindex PREVIEW — publish the page first for the live version.', 'error');
            });
          });
        });
      });
      var unpub = el.querySelector('#unpublish');
      if (unpub) unpub.addEventListener('click', function () {
        UI.confirm('Unpublish this page? Remove the static file from your site too.', 'Unpublish').then(function (y) {
          if (y) UI.act('unpublishLandingPage', { id: page.id }).then(function (r) { if (r) { UI.toast('Unpublished', 'ok'); ctx.rerender(); } });
        });
      });
      var del = el.querySelector('#delete');
      if (del) del.addEventListener('click', function () {
        UI.confirm('Delete this landing page draft?', 'Delete').then(function (y) {
          if (y) UI.act('deleteLandingPage', { id: page.id }).then(function (r) { if (r) { UI.toast('Deleted', 'ok'); location.hash = '#/pages'; } });
        });
      });

      // UTM builder
      function utm() {
        var q = {};
        Array.prototype.forEach.call(form.querySelectorAll('[data-utm]'), function (i) { q[i.name] = i.value.trim(); });
        var url = pageUrl(page, settings) + '?' + AH.util.buildQuery(q);
        el.querySelector('#utm-out').textContent = url;
        return url;
      }
      utm();
      form.addEventListener('input', function (ev) { if (ev.target.hasAttribute('data-utm')) utm(); });
      el.querySelector('#utm-copy').addEventListener('click', function () { UI.copy(utm()); });

      // A/B tests
      var abForm = abRoot.querySelector('#ab-form');
      abForm.elements.element.addEventListener('change', function (ev) {
        var e = ev.target.value;
        abForm.elements.variantA.value = e === 'headline' ? get(page, 'sections.hero.headline') : e === 'cta_text' ? (get(page, 'sections.hero.ctaText') || '') :
          e === 'cta_placement' ? AH.landing.CTA_KEYS.filter(function (k) { return placements[k] !== false; }).join(',') : 'hide:';
      });
      abForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = UI.formData(abForm);
        UI.busy(abForm.querySelector('[type=submit]'), function () {
          return UI.act('createAbTest', { pageId: page.id, name: f.name || ('Test ' + f.element), element: f.element, hypothesis: f.hypothesis, variants: [{ value: f.variantA, label: 'Control' }, { value: f.variantB }] }, abForm)
            .then(function (r) { if (r) { UI.toast('Test created as draft — start it when the page is live.', 'ok'); UI.go('#/pages/' + page.id + '?tab=ab'); } });
        });
      });
      UI.on(abRoot, '[data-ab]', 'click', function (ev, b) {
        var payload = { id: b.getAttribute('data-ab'), status: b.getAttribute('data-status') };
        if (payload.status === 'completed') { payload.winner = b.getAttribute('data-winner') || 'A'; payload.applyWinner = payload.winner !== 'A'; }
        UI.busy(b, function () { return UI.act('updateAbTest', payload).then(function (r) { if (r) { UI.toast(r.appliedToPage ? 'Winner applied to the page (review & re-export).' : 'Test updated', 'ok'); UI.go('#/pages/' + page.id + '?tab=ab'); } }); });
      });

      window.addEventListener('beforeunload', function warn(e) { if (dirty && ctx.isCurrent()) { e.preventDefault(); e.returnValue = ''; } else window.removeEventListener('beforeunload', warn); });
      refresh();
    });
  };

  function abList(results) {
    if (!results || !results.length) return '<p class="muted small">No tests yet.</p>';
    return results.map(function (x) {
      var t = x.test, r = x.result;
      var btns = '';
      if (t.status === 'draft') btns = '<button class="btn small" data-ab="' + t.id + '" data-status="running">Start</button>';
      if (t.status === 'running') btns = '<button class="btn small" data-ab="' + t.id + '" data-status="stopped">Stop</button>';
      if (t.status === 'running' || t.status === 'stopped') {
        btns += ' <button class="btn small" data-ab="' + t.id + '" data-status="completed" data-winner="A">Complete — keep control</button>';
        if (r.state === 'significant' && r.winner !== 'A') btns += ' <button class="btn small primary" data-ab="' + t.id + '" data-status="completed" data-winner="' + esc(r.winner) + '">Complete — apply ' + esc(r.winner) + '</button>';
      }
      return '<div class="draft-card" style="margin-bottom:10px"><div><strong>' + esc(t.name) + '</strong> ' + UI.badge(t.status) + ' ' + UI.badge(r.state, UI.label(r.state)) + '</div>' +
        UI.table([
          { label: 'Variant', render: function (v) { return esc(v.id + ' — ' + v.label) + '<div class="small muted">' + esc(v.value) + '</div>'; } },
          { label: 'Visits', num: true, render: function (v) { return UI.num(v.views); } },
          { label: 'Clicks', num: true, render: function (v) { return UI.num(v.clicks); } },
          { label: 'CTR', num: true, render: function (v) { return UI.pct(v.ctr, 2); } },
          { label: 'p-value', num: true, render: function (v) { return v.pValue === null ? '—' : v.pValue; } }
        ], r.variants) + '<p class="small">' + esc(r.message) + '</p><div class="actions">' + btns + '</div></div>';
    }).join('');
  }
})();
