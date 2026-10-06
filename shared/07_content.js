/*
 * Affiliate Campaign Hub — content planning engine.
 *
 * Plans a small number of genuinely useful pieces per offer (not a spam generator).
 * Pieces that need first-hand experience are flagged; case studies stay LOCKED until
 * real evidence exists. Everything produced here is a draft for human review.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.content = (function () {
  var V = function (p) { return AH.campaign.vars(p); };

  var INTENT_LABELS = {
    informational: 'Informational',
    commercial: 'Commercial investigation',
    comparison: 'Comparison',
    transactional: 'Transactional',
    problem: 'Problem-solving'
  };

  /** Content concepts for an offer (one per type). */
  function ideas(product) {
    var v = V(product);
    var hasExp = AH.compliance.hasExperience(product);
    var evidence = hasExp && product.experienceNotes && AH.util.cleanString(product.experienceNotes.evidence);
    var list = [
      {
        type: 'problem_solution', clusterRole: 'pillar', intent: 'problem',
        title: 'How to Solve ' + AH.util.capFirst(v.problem) + ': A Practical Guide for ' + v.audience,
        outline: ['Why ' + v.problem + ' happens', 'Options compared: free, DIY and paid', 'Step-by-step plan', 'When a product like ' + v.product + ' makes sense (and when it does not)', 'FAQ'],
        requiresFirstHand: false
      },
      {
        type: 'buyer_guide', clusterRole: 'supporting', intent: 'commercial',
        title: 'What to Look for When Choosing a ' + AH.util.capFirst(v.category),
        outline: ['The 5 criteria that actually matter', 'Red flags and hype to avoid', 'Questions to ask before you pay', 'Checklist (downloadable)', 'Where ' + v.product + ' fits'],
        requiresFirstHand: false
      },
      {
        type: 'faq', clusterRole: 'supporting', intent: 'informational',
        title: 'Questions to Ask Before Buying a ' + AH.util.capFirst(v.category),
        outline: ['Price and refund questions', 'Fit: is it right for your situation?', 'Time and effort required', 'Alternatives worth considering'],
        requiresFirstHand: false
      },
      {
        type: 'tutorial', clusterRole: 'supporting', intent: 'informational',
        title: 'How to ' + AH.util.capFirst(v.benefit) + ' (Step by Step)',
        outline: ['What you need before you start', 'Step-by-step instructions', 'Common mistakes', 'Tools that can help (with honest trade-offs)'],
        requiresFirstHand: false
      },
      {
        type: 'comparison', clusterRole: 'commercial', intent: 'comparison',
        title: v.product + ' vs [[main alternative]]: Which Is Better for ' + v.audience + '?',
        outline: ['Quick verdict (who should pick which)', 'Comparison table: price, features, support, refund policy', 'Key differences explained', 'Who should choose ' + v.product, 'Who should choose [[main alternative]]'],
        requiresFirstHand: false
      },
      {
        type: 'alternatives', clusterRole: 'commercial', intent: 'commercial',
        title: 'Best Alternatives to ' + v.product + ' (Including Free Options)',
        outline: ['Why people look for alternatives', 'Free and low-cost options', 'Paid alternatives compared', 'How to choose'],
        requiresFirstHand: false
      },
      {
        type: 'review', clusterRole: 'commercial', intent: 'commercial',
        title: hasExp ? 'Is ' + v.product + ' Worth It? My Hands-On Review' : v.product + ' Review: What to Know Before You Buy (Research-Based)',
        outline: hasExp
          ? ['Summary verdict', 'What I tested and how', 'What I liked', 'What I did not like', 'Who it is for / not for', 'Alternatives', 'FAQ']
          : ['Summary (research-based — not personally tested)', 'What the product includes (from the official page)', 'Pros and cons based on research', 'Who it is for / not for', 'Alternatives', 'FAQ'],
        requiresFirstHand: true
      },
      {
        type: 'case_study', clusterRole: 'commercial', intent: 'commercial',
        title: evidence ? v.product + ' Case Study: [[Specific result]] Documented Step by Step' : 'Case study (locked — needs real, documented evidence)',
        outline: evidence ? ['Starting situation', 'What was done (with dates)', 'Measured results (with screenshots)', 'What did not work', 'Lessons'] : ['Record real results in Experience Notes → Supporting evidence to unlock.'],
        requiresFirstHand: true,
        locked: !evidence
      }
    ];
    return list.map(function (i) {
      i.intentLabel = INTENT_LABELS[i.intent];
      i.locked = !!i.locked;
      i.seo = {
        title: i.title.length > 60 ? i.title.slice(0, 57).replace(/\s+\S*$/, '') + '…' : i.title,
        metaDescription: metaFor(i, v),
        slug: AH.util.slugify(i.title.replace(/\[\[.*?\]\]/g, 'alternative'))
      };
      i.internalLinks = linkSuggestions(i.clusterRole);
      return i;
    });
  }

  function metaFor(i, v) {
    var m = {
      problem_solution: 'A practical, step-by-step guide to ' + v.problem + ' — free options, paid options and how to choose.',
      buyer_guide: 'The criteria that matter when choosing a ' + v.category + ', red flags to avoid and a free checklist.',
      faq: 'Honest answers to the questions you should ask before buying a ' + v.category + '.',
      tutorial: 'Learn how to ' + v.benefit + ' step by step, with common mistakes to avoid.',
      comparison: v.product + ' compared side by side: price, features, refund policy and who each option suits.',
      alternatives: 'Free and paid alternatives to ' + v.product + ', compared honestly.',
      review: 'What ' + v.product + ' includes, honest pros and cons, who it is for and alternatives.',
      case_study: 'A documented case study with real, verifiable results.'
    }[i.type];
    return m.length > 160 ? m.slice(0, 157) + '…' : m;
  }

  function linkSuggestions(role) {
    if (role === 'pillar') return ['Link to the buyer guide, tutorial and comparison pages.', 'Link once to the main landing page in the "options" section.'];
    if (role === 'supporting') return ['Link up to the pillar guide.', 'Link across to the comparison/review page where readers are ready to decide.'];
    return ['Link up to the pillar guide for context.', 'Link to the landing page (affiliate CTA lives there).'];
  }

  /** Topic cluster (pillar → supporting → commercial → landing page). */
  function cluster(product) {
    var items = ideas(product);
    function by(role) { return items.filter(function (i) { return i.clusterRole === role; }).map(function (i) { return i.title; }); }
    return {
      mainTopic: AH.util.capFirst(V(product).niche),
      pillar: by('pillar'),
      supporting: by('supporting'),
      commercial: by('commercial'),
      landing: 'Affiliate landing page for ' + V(product).product
    };
  }

  // ---------------------------------------------------------------- social / video

  var ANGLE_TEMPLATES = {
    problem: { platforms: ['tiktok', 'instagram_reels', 'youtube_shorts'], dur: 30, firstHand: false,
      hook: 'Struggling with {problem}? Here is what is usually going on.',
      problem: 'Name the problem in the viewer\'s words and why common fixes fail.',
      value: 'Share 2–3 practical causes and one thing they can try today (no product needed).',
      demo: 'On-screen text list of causes; you talking to camera.',
      cta: 'Full guide (with options compared) — link in bio.' },
    mistake: { platforms: ['tiktok', 'instagram_reels', 'youtube_shorts'], dur: 30, firstHand: false,
      hook: 'A common mistake when trying to {benefit}…',
      problem: 'Describe the mistake and its consequence.',
      value: 'Show the better approach in simple steps.',
      demo: 'Split screen: "mistake" vs "better way".',
      cta: 'More mistakes to avoid in my guide — link in bio.' },
    tip: { platforms: ['tiktok', 'instagram_reels', 'youtube_shorts', 'pinterest'], dur: 20, firstHand: false,
      hook: 'One practical tip to {benefit}.',
      problem: 'Quick context: who this tip is for.',
      value: 'Explain the tip clearly enough that it works without buying anything.',
      demo: 'Show the tip being applied.',
      cta: 'Save this and see the full step-by-step guide.' },
    comparison: { platforms: ['youtube_shorts', 'tiktok', 'instagram_reels', 'pinterest'], dur: 45, firstHand: false,
      hook: 'Before you buy a {category}, check these three things.',
      problem: 'Buyers often compare on price alone.',
      value: 'Explain the three decision factors (e.g. fit, total cost, refund policy).',
      demo: 'Simple comparison table on screen.',
      cta: 'See my full comparison — link in bio.' },
    tutorial: { platforms: ['youtube_shorts', 'tiktok', 'instagram_reels'], dur: 60, firstHand: false,
      hook: 'How to {benefit} — step by step.',
      problem: 'Why people get stuck at the start.',
      value: 'Walk through 3–5 concrete steps.',
      demo: 'Screen recording or hands-on steps.',
      cta: 'Detailed written tutorial — link in bio.' },
    myth: { platforms: ['tiktok', 'instagram_reels', 'x'], dur: 30, firstHand: false,
      hook: 'Myth: [[a common myth about {niche}]].',
      problem: 'Why the myth sounds believable.',
      value: 'What is actually true — cite a source if you state a fact.',
      demo: 'Myth vs fact text overlay.',
      cta: 'More honest answers in my guide.' },
    faq: { platforms: ['youtube_shorts', 'tiktok', 'facebook', 'x'], dur: 40, firstHand: false,
      hook: '"Is {product} worth it?" The honest answer depends on this.',
      problem: 'The question buyers keep asking.',
      value: 'Explain who it suits, who it does not, and the refund policy.',
      demo: 'Talking head + key points on screen.',
      cta: 'Full pros and cons — link in bio.' },
    review: { platforms: ['youtube_shorts', 'tiktok', 'facebook'], dur: 60, firstHand: true,
      hook: 'I used {product} for [[how long]] — here is my honest verdict.',
      problem: 'What you hoped it would solve.',
      value: 'What you liked, what you did not like, who should skip it.',
      demo: 'Real footage/screenshots from your own use.',
      cta: 'My full review with pros and cons — link in bio.' },
    story: { platforms: ['tiktok', 'instagram_reels', 'facebook'], dur: 45, firstHand: true,
      hook: '[[Your real story: the moment you realised {problem} needed fixing]]',
      problem: 'Your real situation (only true details).',
      value: 'What you tried and what you learned.',
      demo: 'B-roll from your real experience.',
      cta: 'What I recommend now — link in bio.' },
    demonstration: { platforms: ['youtube_shorts', 'tiktok', 'instagram_reels'], dur: 60, firstHand: true,
      hook: 'Watch me set up {product} from scratch.',
      problem: 'Viewers want to see what it is really like before buying.',
      value: 'Show the actual setup / first use, including any friction.',
      demo: 'Unedited screen recording or hands-on footage.',
      cta: 'Full walkthrough and honest verdict — link in bio.' }
  };

  function fillT(tpl, v) {
    return String(tpl).replace(/\{(\w+)\}/g, function (_, k) { return v[k] !== undefined ? v[k] : '[[' + k + ']]'; });
  }

  function socialDrafts(product, angles) {
    var v = V(product);
    var hasExp = AH.compliance.hasExperience(product);
    angles = (angles && angles.length ? angles : AH.schema.SOCIAL_ANGLES).filter(function (a) { return ANGLE_TEMPLATES[a]; });
    return angles.map(function (angle) {
      var t = ANGLE_TEMPLATES[angle];
      var hook = fillT(t.hook, v);
      var needsFH = t.firstHand && !hasExp;
      var caption = hook + '\n\n' + fillT(t.value, v) + '\n\n' + t.cta + '\n' + AH.compliance.socialDisclosure(t.platforms[0]);
      return {
        angle: angle,
        platforms: t.platforms,
        hook: needsFH ? '[[Needs first-hand experience — record Experience Notes first]] ' + hook : hook,
        problem: t.problem,
        value: fillT(t.value, v),
        demonstration: t.demo,
        cta: t.cta,
        disclosure: AH.compliance.socialDisclosure(t.platforms[0]),
        caption: caption,
        durationSec: t.dur,
        requiresFirstHand: t.firstHand,
        status: 'draft'
      };
    });
  }

  // ---------------------------------------------------------------- email

  function leadMagnets(product) {
    var v = V(product);
    var type = product.productType;
    var list = [
      { kind: 'checklist', title: AH.util.capFirst(v.category) + ' Buyer Checklist', description: 'A one-page checklist of the criteria and red flags from your buyer guide.' },
      { kind: 'comparison_sheet', title: v.product + ' vs Alternatives — Comparison Sheet', description: 'Side-by-side table of price, features and refund policy (verify every cell).' },
      { kind: 'quick_start', title: 'Quick-Start Guide: ' + AH.util.capFirst(v.benefit), description: 'The first 5 steps anyone can take, with or without a paid product.' },
      { kind: 'resource_list', title: 'Free Resources for ' + v.audience, description: 'Curated free tools and guides — builds trust before any recommendation.' }
    ];
    if (type === 'software') list.push({ kind: 'template', title: v.product + ' Starter Template', description: 'A template that saves setup time (only if licensing allows).' });
    if (/finance|budget|money|invest|business|marketing/i.test(v.niche)) list.push({ kind: 'calculator', title: 'Simple ' + v.niche + ' Calculator (spreadsheet)', description: 'A spreadsheet that helps readers run their own numbers — no income promises.' });
    return list;
  }

  function emailSequence(product, opts) {
    opts = opts || {};
    var v = V(product);
    var magnet = opts.leadMagnet || leadMagnets(product)[0].title;
    var disclosure = 'Disclosure: the link below is an affiliate link. If you buy through it I may earn a commission, at no extra cost to you.';
    var footer = '\n\n—\nYou are receiving this because you asked for "' + magnet + '". Unsubscribe anytime: {unsubscribe_link}';
    var steps = [
      { type: 'welcome', sendDay: 0, subject: 'Here is your ' + magnet,
        body: 'Hi {first_name},\n\nThanks for signing up. Here is your ' + magnet + ': {download_link}\n\nOver the next few days I will send a few short, practical emails about ' + v.problem + '. No hype — just what helps.\n\nQuick question: what is your biggest challenge with ' + v.niche + ' right now? Hit reply and tell me.' },
      { type: 'educational', sendDay: 2, subject: 'The basics most people skip',
        body: 'Hi {first_name},\n\n[[One genuinely useful lesson about ' + v.niche + ' — something readers can apply without buying anything.]]\n\nRead the full guide: {pillar_guide_link}' },
      { type: 'problem', sendDay: 4, subject: 'Why ' + v.problem + ' keeps happening',
        body: 'Hi {first_name},\n\n[[Explain the root causes of ' + v.problem + ' and what usually does not work.]]\n\nNext time I will compare the main options side by side.' },
      { type: 'comparison', sendDay: 6, subject: 'Free vs paid options, compared honestly',
        body: 'Hi {first_name},\n\nHere is how the main options compare — including free ones:\n\n[[Short comparison: free/DIY option, ' + v.product + ', one alternative. Price, effort, who each suits.]]\n\nFull comparison: {comparison_link}' },
      { type: 'recommendation', sendDay: 8, subject: 'Is ' + v.product + ' right for you?',
        body: 'Hi {first_name},\n\nIf you are ' + v.audience + ' and want to ' + v.benefit + ', ' + v.product + ' may be worth a look.\n\nIt is a good fit if: [[fit criteria]]\nIt is NOT a good fit if: [[non-fit criteria]]\nRefund policy: ' + (AH.util.cleanString(product.refundPolicy) || '[[verify on the official page]]') + '\n\n' + disclosure + '\nView the official offer: {affiliate_link}' },
      { type: 'follow_up', sendDay: 11, subject: 'Questions about ' + v.product + '?',
        body: 'Hi {first_name},\n\nA few readers asked me questions about ' + v.product + '. Here are honest answers:\n\n[[2–3 real reader questions and answers]]\n\nIf it is not for you, that is completely fine — the free resources still apply.' }
    ];
    return steps.map(function (s, i) {
      return {
        step: i + 1, type: s.type, sendDay: s.sendDay, subject: s.subject, body: s.body + footer,
        leadMagnet: magnet, status: 'draft', clicks: 0, conversions: 0, unsubscribes: 0
      };
    });
  }

  return {
    ideas: ideas,
    cluster: cluster,
    socialDrafts: socialDrafts,
    leadMagnets: leadMagnets,
    emailSequence: emailSequence,
    ANGLE_TEMPLATES: ANGLE_TEMPLATES,
    INTENT_LABELS: INTENT_LABELS
  };
})();
