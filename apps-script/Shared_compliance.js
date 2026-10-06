/* GENERATED FILE — do not edit. Source: /shared. Run `npm run build`. */
/*
 * Affiliate Campaign Hub — compliance checks.
 *
 * Deliberately conservative: it flags claims that need evidence (income, health,
 * statistics, first-hand experience) and deceptive urgency. Errors block publishing;
 * warnings require the human reviewer's judgement.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.compliance = (function () {
  var RULES = [
    // Income / financial promises
    { level: 'error', code: 'INCOME_CLAIM', re: /\bguarantee(?:d|s)?\b[^.!?\n]{0,40}\b(income|profits?|earnings|money|returns?|results)\b/i, msg: 'Guaranteed income/results claim. Remove it — results are never guaranteed.' },
    { level: 'error', code: 'INCOME_CLAIM', re: /\b(make|earn|making|earning)\s+\$?\d[\d,.]*k?\s*(\+\s*)?(per|a|every|\/)\s*(day|week|month|hour)\b/i, msg: 'Specific earnings claim. Remove it unless you can document typical results.' },
    { level: 'error', code: 'INCOME_CLAIM', re: /\b(get rich|overnight success|financial freedom guaranteed|quit your job (in|within))\b/i, msg: 'Get-rich style claim. Remove it.' },
    { level: 'error', code: 'INCOME_CLAIM', re: /\brisk[- ]free\s+(income|profits?|investment|returns?)\b/i, msg: '"Risk-free" financial claim. Remove it.' },
    // Health / medical claims
    { level: 'error', code: 'HEALTH_CLAIM', re: /\b(cures?|cured|curing)\b/i, msg: 'Medical "cure" claim. Remove it — only regulators/clinicians can support such claims.' },
    { level: 'error', code: 'HEALTH_CLAIM', re: /\b(treats?|prevents?|reverses?|eliminates?)\s+(cancer|diabetes|disease|covid|depression|anxiety|arthritis|alzheimer'?s|hypertension|obesity|tinnitus)\b/i, msg: 'Disease treatment/prevention claim. Remove it.' },
    { level: 'error', code: 'HEALTH_CLAIM', re: /\blose\s+\d+\s*(lbs?|pounds|kg|kilos?)\s+(in|within)\s+\d+/i, msg: 'Specific weight-loss result claim. Remove it.' },
    { level: 'warning', code: 'HEALTH_CLAIM', re: /\b(miracle|doctors? (hate|don'?t want)|clinically proven|fda[- ]approved|scientifically proven)\b/i, msg: 'Strong health/science claim. Keep only if you link a credible source.' },
    // Deceptive urgency / scarcity
    { level: 'error', code: 'FAKE_URGENCY', re: /\bonly\s+\d+\s+(left|spots?|copies|seats|units)\b/i, msg: 'Scarcity claim. Remove it unless the merchant publicly states it and you can verify it.' },
    { level: 'error', code: 'FAKE_URGENCY', re: /\bcount\s?down\b/i, msg: 'Countdown timers are not allowed on these pages.' },
    { level: 'warning', code: 'URGENCY', re: /\b(act now|last chance|hurry|ends (today|tonight)|expires (today|tonight|soon)|before it'?s too late)\b/i, msg: 'Urgency wording. Only keep it if a real, verifiable deadline exists.' },
    // Fabricated social proof / statistics
    { level: 'warning', code: 'TESTIMONIAL', re: /\btestimonials?\b/i, msg: 'Testimonials must be real, verifiable and representative. Never invent them.' },
    { level: 'warning', code: 'RATING', re: /\b\d(\.\d)?\s*(\/|out of)\s*5\s*stars?\b|★★★/i, msg: 'Star rating. Only publish ratings you can explain from your own documented evaluation.' },
    { level: 'warning', code: 'STATISTIC', re: /\b\d{1,3}(\.\d+)?\s?%\s+of\s+(people|users|customers|buyers|women|men|americans|adults)\b/i, msg: 'Statistic without a visible source. Cite the source or remove it.' },
    { level: 'warning', code: 'INDEPENDENCE', re: /\b(independent|unbiased|impartial)\s+(review|opinion|evaluation)\b/i, msg: 'Avoid "independent/unbiased review" — this page is affiliate-supported. Describe the relationship honestly instead.' },
    { level: 'warning', code: 'ABSOLUTE', re: /\b(100%\s+(effective|guaranteed|safe|natural)|works for everyone|no side effects)\b/i, msg: 'Absolute claim. Qualify it or remove it.' }
  ];

  var FIRST_HAND_RE = /\b(I|we)\s+(have\s+)?(tested|tried|used|bought|purchased|been using|installed|followed)\b|\bmy\s+(results|experience|testing|hands-on)\b|\bhands[- ]on\b|\bin my (test|tests|testing)\b/i;
  var PLACEHOLDER_RE = /\[\[[^\]]{0,120}\]\]/g;

  var HIGH_RISK_NICHES = /\b(health|weight|diet|keto|fat|supplement|medical|medicine|diabetes|blood|pain|tinnitus|prostate|vision|hearing|sleep|anxiety|joint|immune|cbd|finance|crypto|bitcoin|trading|forex|invest|stock|loan|credit|debt|income|make money|wealth|casino|betting|gambling)\b/i;
  var MEDIUM_RISK_NICHES = /\b(fitness|beauty|skin|hair|relationship|dating|manifest|survival|self[- ]help|mlm|business opportunity)\b/i;

  /** Scan free text. Returns [{level, code, message, excerpt}] */
  function scanText(text, ctx) {
    ctx = ctx || {};
    var s = String(text || '');
    var issues = [];
    if (!s) return issues;
    RULES.forEach(function (r) {
      var m = r.re.exec(s);
      if (m) issues.push({ level: r.level, code: r.code, message: r.msg, excerpt: excerpt(s, m.index, m[0].length) });
    });
    var fh = FIRST_HAND_RE.exec(s);
    if (fh && !ctx.hasExperience) {
      issues.push({
        level: 'error',
        code: 'FIRST_HAND_CLAIM',
        message: 'This text implies personal testing, but no Experience Notes are recorded for this product. Add real notes or rephrase as research-based.',
        excerpt: excerpt(s, fh.index, fh[0].length)
      });
    }
    return issues;
  }

  function excerpt(s, idx, len) {
    var start = Math.max(0, idx - 30);
    var end = Math.min(s.length, idx + len + 30);
    return (start > 0 ? '…' : '') + s.slice(start, end).replace(/\s+/g, ' ') + (end < s.length ? '…' : '');
  }

  function findPlaceholders(text) {
    return String(text || '').match(PLACEHOLDER_RE) || [];
  }

  function hasExperience(product) {
    var n = product && product.experienceNotes;
    if (!n || typeof n !== 'object') return false;
    return !!(n.hasFirstHand && (AH.util.cleanString(n.tested) || AH.util.cleanString(n.observations)));
  }

  /** Niche risk used by scoring + warnings. */
  function nicheRisk(product) {
    var text = [product.niche, product.category, product.name, product.problem, product.mainBenefit, product.productType]
      .join(' ');
    if (HIGH_RISK_NICHES.test(text) || product.productType === 'supplement') {
      var health = /\b(health|weight|diet|keto|fat|supplement|medical|medicine|diabetes|blood|pain|tinnitus|prostate|vision|hearing|sleep|anxiety|joint|immune|cbd)\b/i.test(text) || product.productType === 'supplement';
      return { level: 'high', kind: health ? 'health' : 'finance', reason: health ? 'Health-related offers attract strict advertising and consumer-protection rules.' : 'Money/finance offers attract strict rules on earnings claims.' };
    }
    if (MEDIUM_RISK_NICHES.test(text)) return { level: 'medium', kind: 'general', reason: 'This niche often relies on exaggerated promises — keep claims modest.' };
    return { level: 'low', kind: 'general', reason: '' };
  }

  /** Flatten every user-visible string of a landing page. */
  function pageText(page) {
    var parts = [];
    function walk(v) {
      if (v === null || v === undefined) return;
      if (typeof v === 'string') parts.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === 'object') {
        if (v.enabled === false) return; // disabled sections are not rendered, so not scanned
        Object.keys(v).forEach(function (k) { if (k !== 'enabled' && k !== 'ctaPlacements') walk(v[k]); });
      }
    }
    walk(page.title);
    walk(page.sections);
    walk(page.seo);
    return parts.join('\n');
  }

  /**
   * Full pre-publish check for a landing page.
   * Returns { ok, errors: [...], warnings: [...], stats: {...} }.
   */
  function checkLandingPage(page, product, link, settings) {
    var errors = [];
    var warnings = [];
    settings = settings || {};
    product = product || {};
    var sections = page.sections || {};
    var text = pageText(page);
    var words = AH.util.wordCount(text);
    var exp = hasExperience(product);

    scanText(text, { hasExperience: exp }).forEach(function (i) {
      (i.level === 'error' ? errors : warnings).push(i);
    });

    var ph = findPlaceholders(text);
    if (ph.length) {
      errors.push({ level: 'error', code: 'PLACEHOLDERS', message: ph.length + ' placeholder(s) still need your input: ' + AH.util.uniq(ph).slice(0, 5).join(', '), excerpt: '' });
    }

    if (AH.util.cleanString(settings.disclosureText).length < 40) {
      errors.push({ level: 'error', code: 'DISCLOSURE', message: 'Set a clear affiliate disclosure in Settings (at least 40 characters).', excerpt: '' });
    }
    if (!settings.privacyUrl) errors.push({ level: 'error', code: 'PRIVACY', message: 'Add your Privacy Policy URL in Settings.', excerpt: '' });
    if (!settings.termsUrl) errors.push({ level: 'error', code: 'TERMS', message: 'Add your Terms URL in Settings.', excerpt: '' });
    if (!settings.contactEmail && !settings.contactUrl) warnings.push({ level: 'warning', code: 'CONTACT', message: 'Add contact information (email or contact page) in Settings.', excerpt: '' });

    if (!link) errors.push({ level: 'error', code: 'LINK', message: 'Select an affiliate link for this page.', excerpt: '' });
    else if (!link.active) errors.push({ level: 'error', code: 'LINK', message: 'The selected affiliate link is inactive.', excerpt: '' });
    else if (link.status === 'broken') errors.push({ level: 'error', code: 'LINK', message: 'The selected affiliate link failed its last check. Fix it before publishing.', excerpt: '' });

    if (words < 150) errors.push({ level: 'error', code: 'THIN', message: 'Only ' + words + ' words. Thin pages are not allowed — add genuinely useful information.', excerpt: '' });
    else if (words < 400) warnings.push({ level: 'warning', code: 'THIN', message: 'Only ' + words + ' words. Consider adding more genuinely useful detail (comparisons, decision criteria, FAQs).', excerpt: '' });

    var cons = (sections.cons && sections.cons.items) || [];
    if (!cons.filter(function (c) { return AH.util.cleanString(c); }).length) {
      errors.push({ level: 'error', code: 'NO_CONS', message: 'Add at least one honest con or limitation. One-sided pages mislead readers.', excerpt: '' });
    }
    var faq = (sections.faq && sections.faq.items) || [];
    if (!faq.length) warnings.push({ level: 'warning', code: 'NO_FAQ', message: 'Add an FAQ section answering real buyer questions.', excerpt: '' });

    var seo = page.seo || {};
    if (!AH.util.cleanString(seo.title)) errors.push({ level: 'error', code: 'SEO_TITLE', message: 'Add an SEO title.', excerpt: '' });
    else if (seo.title.length > 65) warnings.push({ level: 'warning', code: 'SEO_TITLE', message: 'SEO title is ' + seo.title.length + ' characters; aim for ≤ 60.', excerpt: '' });
    if (!AH.util.cleanString(seo.metaDescription)) warnings.push({ level: 'warning', code: 'SEO_META', message: 'Add a meta description.', excerpt: '' });
    else if (seo.metaDescription.length > 165) warnings.push({ level: 'warning', code: 'SEO_META', message: 'Meta description is ' + seo.metaDescription.length + ' characters; aim for ≤ 160.', excerpt: '' });
    if (!settings.siteUrl) warnings.push({ level: 'warning', code: 'SITE_URL', message: 'Set your Site URL in Settings so canonical URLs and the sitemap are correct.', excerpt: '' });

    var ctas = countCtas(page);
    if (ctas === 0) errors.push({ level: 'error', code: 'CTA', message: 'Enable at least one call-to-action placement.', excerpt: '' });
    if (ctas > 4) warnings.push({ level: 'warning', code: 'CTA', message: ctas + ' CTA placements. Avoid excessive buttons — 2–4 is usually enough.', excerpt: '' });

    var risk = nicheRisk(product);
    if (risk.level === 'high') {
      var hasDisclaimer = AH.util.cleanString(sections.disclaimer && sections.disclaimer.body).length > 30;
      var msg = risk.kind === 'health'
        ? 'Health niche: include a disclaimer ("not medical advice; consult a qualified professional") and avoid any treatment claims.'
        : 'Money niche: include a disclaimer that results vary and are not typical or guaranteed.';
      (hasDisclaimer ? warnings : errors).push({ level: hasDisclaimer ? 'warning' : 'error', code: 'NICHE_DISCLAIMER', message: hasDisclaimer ? 'High-risk niche — double-check every claim. ' + risk.reason : msg, excerpt: '' });
    }

    return { ok: errors.length === 0, errors: errors, warnings: warnings, stats: { words: words, ctas: ctas, placeholders: ph.length, hasExperience: exp } };
  }

  function countCtas(page) {
    var p = (page.sections && page.sections.ctaPlacements) || {};
    return ['afterIntro', 'afterSolution', 'afterEvaluation', 'final'].filter(function (k) { return p[k] !== false; }).length;
  }

  /** Disclosure line for short-form social/video content. */
  function socialDisclosure(platform) {
    if (platform === 'pinterest') return 'Affiliate link — I may earn a commission if you buy.';
    return '#ad · Affiliate link — I may earn a commission if you buy through it.';
  }

  return {
    scanText: scanText,
    findPlaceholders: findPlaceholders,
    hasExperience: hasExperience,
    nicheRisk: nicheRisk,
    pageText: pageText,
    checkLandingPage: checkLandingPage,
    countCtas: countCtas,
    socialDisclosure: socialDisclosure
  };
})();
