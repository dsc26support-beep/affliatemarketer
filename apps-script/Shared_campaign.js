/* GENERATED FILE — do not edit. Source: /shared. Run `npm run build`. */
/*
 * Affiliate Campaign Hub — campaign strategy builder.
 *
 * Produces a structured DRAFT (sections A–L) from the offer data. It never invents
 * facts: anything that needs knowledge the system doesn't have becomes a visible
 * [[placeholder]] for the marketer to complete.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.campaign = (function () {
  function vars(p) {
    var U = AH.util;
    return {
      product: U.cleanString(p.name) || '[[product name]]',
      audience: U.cleanString(p.targetAudience) || '[[target audience]]',
      problem: U.lowerFirst(U.cleanString(p.problem).replace(/[.!]+$/, '')) || '[[main problem]]',
      benefit: U.lowerFirst(U.cleanString(p.mainBenefit).replace(/[.!]+$/, '')) || '[[main benefit]]',
      category: U.lowerFirst(U.cleanString(p.category)) || 'solution',
      niche: U.cleanString(p.niche) || U.cleanString(p.category) || '[[niche]]',
      price: p.price ? (p.currency || '') + ' ' + p.price : '[[price]]'
    };
  }

  function angleOptions(p, v) {
    var type = p.productType || 'other';
    var common = [
      'Problem-first guide: explain why ' + v.problem + ' happens and where ' + v.product + ' fits among the options.',
      'Buyer checklist: the criteria that matter when choosing a ' + v.category + ', then how ' + v.product + ' measures up.',
      'Honest comparison: ' + v.product + ' vs the most common alternative (including free options).'
    ];
    var byType = {
      software: ['Workflow walkthrough: what setup and the first useful result actually look like (show the screens).'],
      digital_course: ['Inside look: who the course is (and is not) for, what each module covers and the time commitment.'],
      ebook: ['Inside look: what the guide covers, who benefits most and what it leaves out.'],
      membership: ['Value check: is the ongoing cost justified, and how easy is it to cancel?'],
      supplement: ['Ingredient overview with linked sources — no health promises, and a clear "talk to your doctor" message.'],
      physical: ['Practical overview: build quality, setup and day-to-day use, with honest limitations.'],
      service: ['Process overview: what working with the service looks like step by step.']
    };
    return (byType[type] || []).concat(common);
  }

  function objections(p, v) {
    var list = [
      { objection: 'Is it worth ' + v.price + '?', response: 'Show what is included, who gets the most value, and cheaper/free alternatives so readers can decide.' },
      { objection: 'Will it work for my situation?', response: 'Use the "Who it is for / not for" section to help readers self-qualify honestly.' },
      { objection: 'What if it does not work for me?', response: 'State the vendor\'s actual refund policy: ' + (AH.util.cleanString(p.refundPolicy) || '[[verify refund policy on the official sales page]]') + '.' },
      { objection: 'Is this legit?', response: 'Link to the official product page, explain the vendor/network, and mention any real limitations or complaints you found.' },
      { objection: 'Can I do this for free?', response: 'Acknowledge free options and explain when the paid product adds value (and when it does not).' }
    ];
    var type = p.productType;
    if (type === 'software') list.push({ objection: 'Is it hard to learn?', response: 'Describe the setup steps and learning curve; include screenshots if you have tested it.' });
    if (type === 'digital_course' || type === 'ebook') list.push({ objection: 'What if I never finish it, like other courses?', response: 'Give the real time commitment and suggest a simple plan for the first week.' });
    if (type === 'supplement') list.push({ objection: 'Is it safe?', response: 'Do not make safety claims. Tell readers to check ingredients with their doctor, especially if they take medication.' });
    if (p.recurring === 'yes' || type === 'membership') list.push({ objection: 'Can I cancel anytime?', response: 'Explain the billing terms and cancellation process from the official page.' });
    return list;
  }

  function trafficChannels(p, scored) {
    var r = {};
    (scored && scored.breakdown || []).forEach(function (b) { r[b.key] = b.rating; });
    function prio(rating) { return rating === null || rating === undefined ? 'medium' : rating >= 4 ? 'high' : rating >= 2.5 ? 'medium' : 'low'; }
    var visualNiche = /home|garden|recipe|food|diy|craft|fitness|beauty|fashion|travel|decor|wedding|pet/i.test([p.niche, p.category].join(' '));
    var list = [
      { channel: 'SEO / organic search', priority: prio(r.searchIntent), why: 'Problem guides, buyer guides and comparisons capture people already researching a decision.' },
      { channel: 'Email list (owned audience)', priority: prio(r.emailPotential), why: 'A useful lead magnet + educational sequence builds trust before any recommendation.' },
      { channel: 'YouTube Shorts / long-form YouTube', priority: p.productType === 'software' || p.productType === 'digital_course' ? 'high' : prio(r.socialPotential), why: 'Tutorials and walkthroughs show value instead of claiming it.' },
      { channel: 'TikTok / Instagram Reels', priority: prio(r.socialPotential), why: 'Short problem/mistake/tip videos that point to the full guide.' },
      { channel: 'Pinterest', priority: visualNiche ? 'high' : 'low', why: visualNiche ? 'Visual niche with long-lived, search-driven pins.' : 'Only if you can create genuinely useful visual guides.' },
      { channel: 'Facebook groups / communities', priority: 'low', why: 'Value-first answers only; follow each group\'s rules on links and self-promotion.' },
      { channel: 'Paid ads', priority: 'low', why: 'Only after organic validation. Check the network\'s and ad platform\'s rules (many forbid direct-linking or certain claims).' }
    ];
    var order = { high: 0, medium: 1, low: 2 };
    return list.sort(function (a, b) { return order[a.priority] - order[b.priority]; });
  }

  /** Build the full A–L plan. */
  function buildPlan(product, opts) {
    opts = opts || {};
    var v = vars(product);
    var scored = AH.scoring.score(product);
    var angles = angleOptions(product, v);
    var hasExp = AH.compliance.hasExperience(product);
    var ideas = AH.content.ideas(product).map(function (i) { return i.title + (i.requiresFirstHand && !hasExp ? ' (needs first-hand evidence)' : ''); });
    var emails = AH.content.emailSequence(product, {}).map(function (e) { return 'Day ' + e.sendDay + ' — ' + e.subject; });

    return {
      version: 1,
      isDraft: true,
      generatedAt: AH.util.isoNow(opts.now),
      primaryAudience: v.audience,
      coreProblem: AH.util.capFirst(v.problem),
      desiredOutcome: AH.util.capFirst(v.benefit),
      uniqueAngle: angles[0],
      angleOptions: angles,
      mainPromise: 'Help ' + v.audience + ' decide whether ' + v.product + ' is a good way to ' + v.benefit + ' — with clear pros, cons and alternatives. No hype, no guaranteed results.',
      objections: objections(product, v),
      trustElements: [
        'Clear affiliate disclosure at the top and next to every recommendation link.',
        hasExp ? 'Your documented first-hand notes and screenshots (Experience Notes).' : 'Research-based framing only — you have no Experience Notes yet, so do not imply personal testing.',
        'Honest cons and a "who it is NOT for" section.',
        'The vendor\'s real refund policy, linked to the official page.',
        'Comparison with alternatives, including free options.',
        'Author box: who you are and how you evaluated the product.',
        'Sources for any factual claim; "last updated" date.'
      ],
      ctaStrategy: {
        placements: [
          'After the initial recommendation (top summary)',
          'After explaining the solution / how it works',
          'After the comparison and pros/cons evaluation',
          'At the final decision point'
        ],
        ctaTexts: ['See the full product details', 'View the official offer', 'Explore ' + v.product, 'Check today\'s price on the official site'],
        rules: 'Max 4 placements. Benefit-oriented but factual text. No fake urgency, countdowns or scarcity. Links use rel="sponsored".'
      },
      trafficChannels: trafficChannels(product, scored),
      contentIdeas: ideas,
      emailIdeas: emails,
      testingIdeas: [
        'Headline: problem-framed vs outcome-framed.',
        'CTA text: "See the full product details" vs "View the official offer".',
        'CTA placement: first CTA after the intro vs after the solution section.',
        'Comparison format: table vs short prose.',
        'Lead magnet: checklist vs comparison sheet (if you collect emails).',
        'Content angle: buyer guide vs problem-first guide as the main traffic page.'
      ],
      kpis: {
        primary: 'Affiliate CTR (clicks ÷ visits) and conversions from your network report.',
        decisionRule: 'Make no decision before the minimum sample in Settings is reached.'
      },
      scoreSnapshot: { score: scored.score, label: scored.label, confidence: scored.confidence }
    };
  }

  /** Human-readable section titles (A–L) used by the UI. */
  var SECTIONS = [
    ['primaryAudience', 'A. Primary audience'],
    ['coreProblem', 'B. Core problem'],
    ['desiredOutcome', 'C. Desired outcome'],
    ['uniqueAngle', 'D. Unique angle'],
    ['mainPromise', 'E. Main promise'],
    ['objections', 'F. Objections'],
    ['trustElements', 'G. Trust elements'],
    ['ctaStrategy', 'H. CTA strategy'],
    ['trafficChannels', 'I. Traffic channels'],
    ['contentIdeas', 'J. Content ideas'],
    ['emailIdeas', 'K. Email sequence ideas'],
    ['testingIdeas', 'L. Testing ideas']
  ];

  return { buildPlan: buildPlan, angleOptions: angleOptions, SECTIONS: SECTIONS, vars: vars };
})();
