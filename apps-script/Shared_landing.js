/* GENERATED FILE — do not edit. Source: /shared. Run `npm run build`. */
/*
 * Affiliate Campaign Hub — landing pages: draft generator + safe HTML renderer.
 *
 * Generator: builds a structured page from the offer + campaign. Facts it does not know
 * become [[placeholders]]; the compliance check blocks publishing until they are filled.
 * Renderer: every user string is HTML-escaped; affiliate links use rel="sponsored";
 * the disclosure appears at the top and beside every CTA. No timers, no fake scarcity,
 * no testimonials, no rating markup.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.landing = (function () {
  var PRODUCT_TYPE_LABELS = {
    digital_course: 'Online course', ebook: 'E-book / digital guide', software: 'Software', membership: 'Membership',
    physical: 'Physical product', supplement: 'Supplement', service: 'Service', other: 'Product'
  };

  var CTA_KEYS = ['afterIntro', 'afterSolution', 'afterEvaluation', 'final'];

  function lines(text) {
    return String(text || '').split(/\r?\n/).map(function (s) { return s.replace(/^[-*•]\s*/, '').trim(); }).filter(Boolean);
  }

  // ------------------------------------------------------------------ generator

  function generate(product, campaign, link, opts) {
    opts = opts || {};
    var U = AH.util;
    var v = AH.campaign.vars(product);
    var type = opts.pageType || 'review';
    var exp = product.experienceNotes || {};
    var hasExp = AH.compliance.hasExperience(product);
    var risk = AH.compliance.nicheRisk(product);
    var price = product.price ? (product.currency || '') + ' ' + product.price + (product.recurring === 'yes' ? ' (recurring)' : '') : '[[price from the official page]]';
    var refund = U.cleanString(product.refundPolicy) || '[[verify the refund policy on the official page]]';
    var plan = (campaign && campaign.plan) || {};

    var headlines = {
      review: hasExp ? v.product + ' Review: Is It Worth It?' : v.product + ': What to Know Before You Buy',
      comparison: v.product + ' vs [[main alternative]]: Which Should You Choose?',
      problem_solution: 'How to ' + U.capFirst(v.benefit) + ' — and Whether ' + v.product + ' Can Help',
      buyer_guide: 'Choosing a ' + U.capFirst(v.category) + '? What Matters and Where ' + v.product + ' Fits'
    };
    var headline = headlines[type] || headlines.review;
    var sub = hasExp
      ? 'A hands-on look at what ' + v.product + ' offers ' + v.audience + ' — what worked, what did not, and who should skip it.'
      : 'A research-based look at what ' + v.product + ' offers ' + v.audience + ', with honest pros, cons and alternatives.';

    var liked = lines(exp.liked);
    var disliked = lines(exp.disliked).concat(lines(exp.problems));

    var sections = {
      hero: {
        headline: headline,
        subheadline: sub,
        summary: 'Short answer: ' + v.product + ' may suit ' + v.audience + ' who want to ' + v.benefit + '. [[Add your one-paragraph verdict: who it suits, the main trade-off, and who should look elsewhere.]]',
        ctaText: 'See the full product details'
      },
      problem: {
        heading: 'The problem: ' + v.problem,
        body: 'If you are ' + v.audience + ', you probably know the frustration of ' + v.problem + '.\n\n[[Explain why this happens and what people usually try first. Use your own research or experience — no copied merchant text.]]'
      },
      solution: {
        heading: 'How ' + v.product + ' approaches it',
        body: v.product + ' is a ' + (PRODUCT_TYPE_LABELS[product.productType] || 'product').toLowerCase() + ' designed to help you ' + v.benefit + '.\n\n[[Explain in plain words how it works: the method, what is included and what you have to do yourself.]]'
      },
      benefits: {
        heading: 'Key benefits',
        items: [U.capFirst(v.benefit), '[[Second concrete benefit — verified on the official page]]', '[[Third concrete benefit]]']
      },
      product: {
        heading: 'What you get',
        body: '- Format: ' + (PRODUCT_TYPE_LABELS[product.productType] || '[[format]]') + '\n- Price at time of writing: ' + price + '\n- Refund policy: ' + refund +
          '\n- Sold through ' + (AH.schema.NETWORK_LABELS[product.network] || 'the vendor') + ' (the official checkout handles payment and refunds)\n- [[What is included — modules, features, bonuses]]'
      },
      method: {
        heading: hasExp ? 'How I evaluated ' + v.product : 'How this overview was researched',
        body: hasExp
          ? 'I tested ' + v.product + ' myself: ' + U.cleanString(exp.tested) + '. My notes, screenshots and observations are summarised below.'
          : 'I have not personally tested ' + v.product + '. This overview is based on the official product page, the vendor\'s refund policy and [[other sources you checked — list them below]]. Where I give an opinion, it is labelled as such.'
      },
      experience: {
        enabled: hasExp,
        heading: 'My hands-on notes',
        body: hasExp ? [
          exp.tested ? 'What I tested: ' + exp.tested : '',
          exp.liked ? 'What I liked: ' + exp.liked : '',
          exp.disliked ? 'What I did not like: ' + exp.disliked : '',
          exp.problems ? 'Problems I ran into: ' + exp.problems : '',
          exp.setupDifficulty ? 'Setup difficulty: ' + exp.setupDifficulty : '',
          exp.observations ? 'Observations: ' + exp.observations : ''
        ].filter(Boolean).join('\n\n') : '',
        screenshots: hasExp ? lines(exp.screenshots).filter(function (s) { var p = U.parseUrl(s); return p && p.protocol === 'https'; }).slice(0, 6) : []
      },
      forWho: { heading: 'Who it is for', items: [U.capFirst(v.audience) + ' who want to ' + v.benefit, '[[Another reader profile that fits well]]'] },
      notFor: { heading: 'Who it is NOT for', items: ['Anyone expecting a quick fix or instant results', '[[Who should skip it — be specific]]'] },
      pros: { heading: 'Pros', items: liked.length ? liked.slice(0, 6) : ['[[A genuine strength you verified]]', '[[Another strength]]'] },
      cons: { heading: 'Cons', items: disliked.length ? disliked.slice(0, 6) : ['[[An honest limitation or drawback]]'] },
      comparison: {
        enabled: type === 'comparison' || type === 'review' || type === 'buyer_guide',
        heading: type === 'comparison' ? v.product + ' vs [[main alternative]]' : 'How it compares',
        columns: ['', v.product, '[[Alternative]]', 'Free / DIY option'],
        rows: [
          ['Price', price, '[[price]]', 'Free'],
          ['Best for', U.capFirst(v.audience), '[[who]]', 'People with time to research and experiment'],
          ['Refund policy', refund, '[[policy]]', 'n/a'],
          ['Main trade-off', '[[main trade-off]]', '[[trade-off]]', 'More time and trial-and-error']
        ],
        note: 'Prices and policies can change — check the official pages before buying.'
      },
      faq: {
        heading: 'Frequently asked questions',
        items: [
          { q: 'Is ' + v.product + ' worth it?', a: 'It depends on your situation. It is likely a good fit if [[fit criteria]]. If [[non-fit criteria]], one of the alternatives above may suit you better.' },
          { q: 'Does ' + v.product + ' have a refund policy?', a: refund === '[[verify the refund policy on the official page]]' ? refund : 'According to the official page: ' + refund + '. Always confirm the current terms before buying.' },
          { q: 'How much does ' + v.product + ' cost?', a: product.price ? 'At the time of writing, the official page lists ' + price + '. Prices can change, so check the official page.' : '[[Price from the official page]]' },
          { q: 'Are there free alternatives?', a: '[[Name genuine free alternatives and when they are enough.]]' }
        ]
      },
      disclaimer: {
        body: risk.level === 'high'
          ? (risk.kind === 'health'
            ? 'This content is general information, not medical advice. Talk to a qualified healthcare professional before starting any supplement, diet or treatment — especially if you have a medical condition or take medication. Individual results vary.'
            : 'This content is general information, not financial advice. Results vary and are not typical or guaranteed. Never spend or invest money you cannot afford to lose.')
          : ''
      },
      leadCapture: {
        enabled: false,
        heading: 'Get the free checklist',
        body: 'A one-page checklist to help you compare options before you buy.',
        magnet: AH.content.leadMagnets(product)[0].title,
        consentText: 'Yes, email me the checklist and occasional related tips. I can unsubscribe at any time.',
        buttonText: 'Send me the checklist'
      },
      finalCta: {
        heading: 'Is ' + v.product + ' right for you?',
        body: 'If you are ' + v.audience + ' and the pros above matter more to you than the cons, check the official page for the current price and full details. If not, the alternatives above may suit you better.',
        ctaText: 'View the official offer'
      },
      ctaText: (plan.ctaStrategy && plan.ctaStrategy.ctaTexts && plan.ctaStrategy.ctaTexts[0]) || 'See the full product details',
      ctaPlacements: { afterIntro: true, afterSolution: true, afterEvaluation: true, final: true },
      sources: { heading: 'Sources', items: product.productPageUrl ? [{ label: 'Official ' + v.product + ' page', url: product.productPageUrl }] : [] }
    };

    var slugBase = { review: v.product + ' review', comparison: v.product + ' vs alternative', problem_solution: 'how to ' + v.benefit, buyer_guide: v.category + ' buyer guide' }[type];
    var title = headline;
    var seoTitle = title.length > 60 ? title.slice(0, 57).replace(/\s+\S*$/, '') + '…' : title;
    var meta = (hasExp ? 'Hands-on' : 'Research-based') + ' look at ' + v.product + ' for ' + v.audience + ': what it includes, honest pros and cons, price and alternatives.';
    return {
      campaignId: campaign ? campaign.id : '',
      productId: product.id,
      linkId: link ? link.id : '',
      pageType: type,
      slug: AH.util.slugify(slugBase || title) || 'page',
      title: title,
      sections: sections,
      seo: {
        title: seoTitle,
        metaDescription: meta.length > 160 ? meta.slice(0, 157) + '…' : meta,
        canonical: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        noindex: false
      }
    };
  }

  // ------------------------------------------------------------------ renderer

  var E = function (s) { return AH.util.escapeHtml(s); };

  /** Paragraphs + "- " bullet lists; everything escaped. */
  function rich(text) {
    var blocks = String(text || '').split(/\n\s*\n/);
    return blocks.map(function (b) {
      var ls = b.split(/\r?\n/).filter(function (l) { return l.trim(); });
      if (!ls.length) return '';
      if (ls.every(function (l) { return /^\s*[-*•]\s+/.test(l); })) {
        return '<ul>' + ls.map(function (l) { return '<li>' + E(l.replace(/^\s*[-*•]\s+/, '')) + '</li>'; }).join('') + '</ul>';
      }
      return '<p>' + ls.map(E).join('<br>') + '</p>';
    }).join('\n');
  }

  function list(items, cls) {
    items = (items || []).filter(function (i) { return AH.util.cleanString(i); });
    if (!items.length) return '';
    return '<ul class="' + cls + '">' + items.map(function (i) { return '<li>' + E(i) + '</li>'; }).join('') + '</ul>';
  }

  function safeHref(url) {
    var p = AH.util.parseUrl(url);
    return p ? p.href : '';
  }

  function cta(key, text, ctx) {
    var placements = (ctx.page.sections && ctx.page.sections.ctaPlacements) || {};
    if (placements[key] === false) return '';
    var href = ctx.link ? safeHref(ctx.link.url) : '';
    if (!href) return '<p class="ah-cta ah-cta-missing">[Affiliate link missing]</p>';
    return '<div class="ah-cta" data-ah-cta-wrap="' + key + '">' +
      '<a class="ah-btn" href="' + E(href) + '" rel="sponsored nofollow noopener" target="_blank" data-ah-link="' + E(ctx.link.id) + '" data-ah-cta="' + key + '" data-ah-ab="cta_text">' + E(text) + '</a>' +
      '<p class="ah-cta-note">Affiliate link — I may earn a commission if you buy, at no extra cost to you. Opens the official page.</p>' +
      '</div>';
  }

  function section(key, heading, inner) {
    if (!inner) return '';
    return '<section class="ah-section" data-ah-section="' + key + '">' + (heading ? '<h2>' + E(heading) + '</h2>' : '') + inner + '</section>';
  }

  /** Renders the <main> article. ctx = { page, product, link, settings, preview } */
  function renderArticle(ctx) {
    var page = ctx.page;
    var s = page.sections || {};
    var settings = ctx.settings || {};
    var ctaText = s.ctaText || 'See the full product details';
    var out = [];

    out.push('<header class="ah-hero"><h1 data-ah-ab="headline">' + E(s.hero && s.hero.headline || page.title) + '</h1>' +
      (s.hero && s.hero.subheadline ? '<p class="ah-sub" data-ah-ab="subheadline">' + E(s.hero.subheadline) + '</p>' : '') +
      '<p class="ah-meta">' + (settings.authorName ? 'By ' + E(settings.authorName) + ' · ' : '') + 'Updated ' + E(AH.util.dateKey(page.updatedAt) || AH.util.dateKey(AH.util.isoNow())) + '</p></header>');

    // Disclosure: clear, conspicuous, before the first recommendation.
    out.push('<aside class="ah-disclosure" role="note"><strong>Disclosure:</strong> ' + E(settings.disclosureText || '') +
      (settings.disclosureUrl ? ' <a href="' + E(safeHref(settings.disclosureUrl)) + '">Learn more</a>' : '') + '</aside>');

    if (s.disclaimer && AH.util.cleanString(s.disclaimer.body)) {
      out.push('<aside class="ah-disclaimer" role="note">' + E(s.disclaimer.body) + '</aside>');
    }

    if (s.hero && s.hero.summary) out.push(section('summary', '', '<div class="ah-summary">' + rich(s.hero.summary) + '</div>'));
    out.push(cta('afterIntro', (s.hero && s.hero.ctaText) || ctaText, ctx));

    if (s.problem) out.push(section('problem', s.problem.heading, rich(s.problem.body)));
    if (s.solution) out.push(section('solution', s.solution.heading, rich(s.solution.body)));
    if (s.benefits) out.push(section('benefits', s.benefits.heading, list(s.benefits.items, 'ah-list ah-benefits')));
    if (s.product) out.push(section('product', s.product.heading, rich(s.product.body)));
    out.push(cta('afterSolution', ctaText, ctx));

    if (s.method) out.push(section('method', s.method.heading, rich(s.method.body)));
    if (s.experience && s.experience.enabled && s.experience.body) {
      var shots = (s.experience.screenshots || []).map(safeHref).filter(Boolean).map(function (u) {
        return '<figure><img src="' + E(u) + '" alt="Screenshot from my own testing" loading="lazy" decoding="async"></figure>';
      }).join('');
      out.push(section('experience', s.experience.heading, rich(s.experience.body) + (shots ? '<div class="ah-shots">' + shots + '</div>' : '')));
    }

    var fit = '';
    if (s.forWho) fit += '<div class="ah-col"><h3>' + E(s.forWho.heading || 'Who it is for') + '</h3>' + list(s.forWho.items, 'ah-list ah-yes') + '</div>';
    if (s.notFor) fit += '<div class="ah-col"><h3>' + E(s.notFor.heading || 'Who it is NOT for') + '</h3>' + list(s.notFor.items, 'ah-list ah-no') + '</div>';
    if (fit) out.push(section('fit', '', '<div class="ah-cols">' + fit + '</div>'));

    var pc = '';
    if (s.pros) pc += '<div class="ah-col"><h3>' + E(s.pros.heading || 'Pros') + '</h3>' + list(s.pros.items, 'ah-list ah-yes') + '</div>';
    if (s.cons) pc += '<div class="ah-col"><h3>' + E(s.cons.heading || 'Cons') + '</h3>' + list(s.cons.items, 'ah-list ah-no') + '</div>';
    if (pc) out.push(section('proscons', 'Pros and cons', '<div class="ah-cols">' + pc + '</div>'));

    if (s.comparison && s.comparison.enabled && s.comparison.rows && s.comparison.rows.length) {
      var cols = s.comparison.columns || [];
      var table = '<div class="ah-table-wrap"><table class="ah-table"><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + E(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        s.comparison.rows.map(function (r) {
          return '<tr>' + (r || []).map(function (c, i) { return i === 0 ? '<th scope="row">' + E(c) + '</th>' : '<td>' + E(c) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' + (s.comparison.note ? '<p class="ah-note">' + E(s.comparison.note) + '</p>' : '');
      out.push(section('comparison', s.comparison.heading, table));
    }
    out.push(cta('afterEvaluation', ctaText, ctx));

    if (s.leadCapture && s.leadCapture.enabled) {
      var lc = s.leadCapture;
      out.push(section('leadCapture', lc.heading,
        rich(lc.body) +
        '<form class="ah-lead" data-ah-lead="' + E(lc.magnet || '') + '" novalidate>' +
        '<label for="ah-email">Email address</label>' +
        '<input id="ah-email" name="email" type="email" autocomplete="email" required>' +
        '<label class="ah-hp" aria-hidden="true">Leave empty<input name="website" tabindex="-1" autocomplete="off"></label>' +
        '<label class="ah-consent"><input type="checkbox" name="consent" required> <span>' + E(lc.consentText) + '</span></label>' +
        '<button type="submit" class="ah-btn ah-btn-secondary">' + E(lc.buttonText || 'Send it to me') + '</button>' +
        '<p class="ah-lead-msg" role="status" aria-live="polite"></p>' +
        '<p class="ah-note">See the <a href="' + E(safeHref(settings.privacyUrl)) + '">privacy policy</a> for how your email is used.</p>' +
        '</form>'));
    }

    if (s.faq && s.faq.items && s.faq.items.length) {
      out.push(section('faq', s.faq.heading || 'FAQ', s.faq.items.map(function (f) {
        return '<details class="ah-faq"><summary>' + E(f.q) + '</summary>' + rich(f.a) + '</details>';
      }).join('')));
    }

    if (s.finalCta) out.push(section('finalCta', s.finalCta.heading, rich(s.finalCta.body)));
    out.push(cta('final', (s.finalCta && s.finalCta.ctaText) || ctaText, ctx));

    var srcs = (s.sources && s.sources.items || []).filter(function (x) { return x && safeHref(x.url); });
    if (srcs.length) {
      out.push(section('sources', s.sources.heading || 'Sources', '<ul class="ah-list">' + srcs.map(function (x) {
        return '<li><a href="' + E(safeHref(x.url)) + '" rel="noopener" target="_blank">' + E(x.label || x.url) + '</a></li>';
      }).join('') + '</ul>'));
    }

    if (settings.authorName) {
      out.push('<section class="ah-author" data-ah-section="author"><h2>About the author</h2><p><strong>' + E(settings.authorName) + '</strong></p>' + rich(settings.authorBio) + '</section>');
    }
    return '<main class="ah-main" id="main">' + out.filter(Boolean).join('\n') + '</main>';
  }

  function renderFooter(settings) {
    settings = settings || {};
    var links = [];
    if (settings.privacyUrl) links.push('<a href="' + E(safeHref(settings.privacyUrl)) + '">Privacy policy</a>');
    if (settings.termsUrl) links.push('<a href="' + E(safeHref(settings.termsUrl)) + '">Terms</a>');
    if (settings.disclosureUrl) links.push('<a href="' + E(safeHref(settings.disclosureUrl)) + '">Affiliate disclosure</a>');
    if (settings.contactUrl) links.push('<a href="' + E(safeHref(settings.contactUrl)) + '">Contact</a>');
    else if (settings.contactEmail) links.push('<a href="mailto:' + E(settings.contactEmail) + '">Contact</a>');
    return '<footer class="ah-footer"><p class="ah-footer-disclosure">' + E(settings.disclosureText || '') + '</p>' +
      '<nav aria-label="Legal">' + links.join(' · ') + '</nav>' +
      '<p class="ah-footer-small">© ' + new Date().getFullYear() + ' ' + E(settings.siteName || '') + '. Analytics on this page are anonymous and first-party.</p></footer>';
  }

  var CSS = [
    ':root{--ah-fg:#1b1f24;--ah-muted:#5b6470;--ah-bg:#fff;--ah-soft:#f5f7fa;--ah-line:#e3e7ec;--ah-accent:#0b6bcb;--ah-accent-fg:#fff;--ah-yes:#1a7f37;--ah-no:#b42318}',
    '@media (prefers-color-scheme:dark){:root{--ah-fg:#e8ebef;--ah-muted:#a5adb8;--ah-bg:#111418;--ah-soft:#1a1f25;--ah-line:#2b323a;--ah-accent:#4aa3ff;--ah-accent-fg:#06131f;--ah-yes:#4cc26b;--ah-no:#ff7a6b}}',
    '*{box-sizing:border-box}body{margin:0;font:17px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ah-fg);background:var(--ah-bg)}',
    '.ah-main{max-width:760px;margin:0 auto;padding:24px 16px 48px}',
    'h1{font-size:clamp(1.7rem,4.5vw,2.4rem);line-height:1.2;margin:.2em 0 .3em}h2{font-size:1.35rem;margin:1.8em 0 .5em;line-height:1.3}h3{font-size:1.05rem;margin:.6em 0}',
    '.ah-sub{font-size:1.15rem;color:var(--ah-muted);margin:0 0 .5em}.ah-meta{font-size:.9rem;color:var(--ah-muted)}',
    '.ah-disclosure,.ah-disclaimer{background:var(--ah-soft);border-left:4px solid var(--ah-accent);padding:12px 14px;margin:16px 0;font-size:.98rem;border-radius:6px}',
    '.ah-disclaimer{border-left-color:#c27c0e}',
    '.ah-summary{font-size:1.05rem}',
    '.ah-cta{margin:24px 0;text-align:center}.ah-btn{display:inline-block;background:var(--ah-accent);color:var(--ah-accent-fg);text-decoration:none;font-weight:600;padding:14px 22px;border-radius:10px;border:0;font-size:1.02rem;cursor:pointer;min-height:48px}',
    '.ah-btn:hover,.ah-btn:focus-visible{filter:brightness(1.08)}.ah-btn:focus-visible{outline:3px solid var(--ah-fg);outline-offset:2px}',
    '.ah-cta-note{font-size:.92rem;color:var(--ah-muted);margin:.5em 0 0}',
    '.ah-cols{display:grid;gap:16px}@media(min-width:640px){.ah-cols{grid-template-columns:1fr 1fr}}',
    '.ah-col{background:var(--ah-soft);border:1px solid var(--ah-line);border-radius:10px;padding:12px 16px}',
    '.ah-list{padding-left:1.2em}.ah-yes li::marker{content:"✓  ";color:var(--ah-yes)}.ah-no li::marker{content:"✗  ";color:var(--ah-no)}',
    '.ah-table-wrap{overflow-x:auto}.ah-table{width:100%;border-collapse:collapse;font-size:.95rem}.ah-table th,.ah-table td{border:1px solid var(--ah-line);padding:8px 10px;text-align:left;vertical-align:top}.ah-table thead th{background:var(--ah-soft)}',
    '.ah-note{font-size:.9rem;color:var(--ah-muted)}',
    '.ah-faq{border:1px solid var(--ah-line);border-radius:8px;padding:10px 14px;margin:8px 0}.ah-faq summary{font-weight:600;cursor:pointer}',
    '.ah-shots{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}.ah-shots img{width:100%;height:auto;border-radius:8px;border:1px solid var(--ah-line)}',
    '.ah-lead{display:grid;gap:8px;max-width:440px}.ah-lead input[type=email]{padding:12px;font-size:1rem;border:1px solid var(--ah-line);border-radius:8px;background:var(--ah-bg);color:var(--ah-fg)}',
    '.ah-consent{display:flex;gap:8px;align-items:flex-start;font-size:.95rem}.ah-hp{position:absolute;left:-9999px}.ah-btn-secondary{background:var(--ah-fg);color:var(--ah-bg)}',
    '.ah-author{border-top:1px solid var(--ah-line);margin-top:32px;padding-top:8px}',
    '.ah-footer{border-top:1px solid var(--ah-line);padding:24px 16px;max-width:760px;margin:0 auto;font-size:.92rem;color:var(--ah-muted)}.ah-footer a{color:inherit}',
    '.ah-consent-banner{position:fixed;left:12px;right:12px;bottom:12px;background:var(--ah-soft);border:1px solid var(--ah-line);border-radius:10px;padding:12px 14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:.95rem;z-index:10}',
    '.ah-consent-banner button{padding:8px 14px;border-radius:8px;border:1px solid var(--ah-line);background:var(--ah-bg);color:var(--ah-fg);cursor:pointer}',
    'a{color:var(--ah-accent)}img{max-width:100%}'
  ].join('\n');

  /** Build the A/B config embedded in the page for the tracker. */
  function abConfig(tests) {
    return (tests || []).filter(function (t) { return t.status === 'running' && Array.isArray(t.variants) && t.variants.length >= 2; })
      .map(function (t) {
        return { id: t.id, element: t.element, variants: t.variants.map(function (v) { return { id: String(v.id), value: String(v.value || '') }; }) };
      });
  }

  /**
   * Full standalone HTML document (static export / preview).
   * ctx = { page, product, link, settings, abTests, assetBase, preview }
   */
  function renderDocument(ctx) {
    var page = ctx.page;
    var settings = ctx.settings || {};
    var seo = page.seo || {};
    var canonical = AH.seo.canonical(page, settings);
    var title = seo.title || page.title || '';
    var desc = seo.metaDescription || '';
    var assetBase = ctx.assetBase === undefined ? '../' : ctx.assetBase;
    var ab = abConfig(ctx.abTests);
    var robots = ctx.preview || seo.noindex ? 'noindex,nofollow' : 'index,follow';
    var ogImage = safeHref(seo.ogImage);
    var head = [
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + E(title) + '</title>',
      '<meta name="description" content="' + E(desc) + '">',
      '<meta name="robots" content="' + robots + '">',
      /^https?:/.test(canonical) ? '<link rel="canonical" href="' + E(canonical) + '">' : '',
      '<meta property="og:type" content="article">',
      '<meta property="og:title" content="' + E(seo.ogTitle || title) + '">',
      '<meta property="og:description" content="' + E(seo.ogDescription || desc) + '">',
      /^https?:/.test(canonical) ? '<meta property="og:url" content="' + E(canonical) + '">' : '',
      ogImage ? '<meta property="og:image" content="' + E(ogImage) + '">' : '',
      settings.siteName ? '<meta property="og:site_name" content="' + E(settings.siteName) + '">' : '',
      '<meta name="twitter:card" content="' + (ogImage ? 'summary_large_image' : 'summary') + '">',
      '<style>' + CSS + '</style>',
      '<script type="application/ld+json">' + AH.seo.jsonLd(page, ctx.product, settings) + '</script>',
      ab.length ? '<script type="application/json" id="ah-ab">' + JSON.stringify(ab).replace(/</g, '\\u003c') + '</script>' : '',
      ctx.preview ? '' : '<script src="' + E(assetBase) + 'assets/js/track.js" defer></script>'
    ].filter(Boolean).join('\n');

    var bodyAttrs = ' data-ah-page="' + E(page.id || '') + '"' +
      ' data-ah-api="' + E(ctx.preview ? '' : safeHref(settings.apiUrl)) + '"' +
      ' data-ah-dnt="' + (settings.respectDoNotTrack === false ? '0' : '1') + '"' +
      ' data-ah-consent="' + (settings.requireTrackingConsent ? '1' : '0') + '"' +
      ' data-ah-privacy="' + E(safeHref(settings.privacyUrl)) + '"';

    return '<!doctype html>\n<html lang="en">\n<head>\n' + head + '\n</head>\n<body' + bodyAttrs + '>\n' +
      renderArticle(ctx) + '\n' + renderFooter(settings) + '\n</body>\n</html>\n';
  }

  return {
    generate: generate,
    renderArticle: renderArticle,
    renderFooter: renderFooter,
    renderDocument: renderDocument,
    abConfig: abConfig,
    rich: rich,
    CSS: CSS,
    CTA_KEYS: CTA_KEYS,
    PRODUCT_TYPE_LABELS: PRODUCT_TYPE_LABELS
  };
})();
