/*
 * Affiliate Campaign Hub — explainable offer score (0–100).
 *
 * The score is a structured checklist, NOT a revenue prediction. Each criterion is
 * rated 0–5 (5 = favourable; for risk criteria 5 = LOW risk). Some ratings are
 * derived automatically from offer data; the user can override any of them.
 * Unrated criteria are excluded and lower the confidence value instead of being guessed.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.scoring = (function () {
  var CRITERIA = [
    { key: 'audienceClarity', label: 'Audience / problem clarity', weight: 8, auto: true, help: 'Is it obvious who this is for and which problem it solves?' },
    { key: 'marketRelevance', label: 'Product–market relevance', weight: 8, help: 'Does the product fit a real, current need of your audience?' },
    { key: 'commission', label: 'Commission attractiveness', weight: 10, auto: true, help: 'Estimated commission per sale.' },
    { key: 'recurring', label: 'Recurring revenue potential', weight: 6, auto: true, help: 'Recurring commissions (subscriptions/memberships).' },
    { key: 'qualityEvidence', label: 'Product quality evidence', weight: 8, help: 'Refund policy, real reviews elsewhere, track record, your own testing.' },
    { key: 'salesPageQuality', label: 'Merchant sales-page quality', weight: 7, help: 'Clear, honest, professional sales page without hype.' },
    { key: 'competition', label: 'Competition (5 = low)', weight: 6, help: 'How crowded are search results / social feeds for this offer?' },
    { key: 'contentPotential', label: 'Content potential', weight: 7, help: 'Can you create genuinely useful guides, tutorials and comparisons?' },
    { key: 'searchIntent', label: 'Search-intent potential', weight: 7, help: 'Do people actively search for solutions/comparisons in this space?' },
    { key: 'socialPotential', label: 'Social content potential', weight: 6, help: 'Is it demonstrable / visual / easy to explain in short videos?' },
    { key: 'emailPotential', label: 'Email potential', weight: 5, help: 'Is there a natural lead magnet and an educational sequence?' },
    { key: 'conversionPotential', label: 'Conversion potential', weight: 8, help: 'Price point, offer clarity, guarantee, checkout experience.' },
    { key: 'trustRisk', label: 'Trust (5 = low risk)', weight: 7, help: 'Vendor reputation, refund rates, complaints.' },
    { key: 'complianceRisk', label: 'Compliance (5 = low risk)', weight: 7, auto: true, help: 'Health/finance/income claims, regulated niche.' }
  ];

  var LABELS = [
    { min: 80, label: 'EXCELLENT' },
    { min: 65, label: 'GOOD' },
    { min: 45, label: 'TEST' },
    { min: 0, label: 'WEAK' }
  ];

  function estimatedCommission(p) {
    var amount = AH.util.toNumber(p.commissionAmount);
    if (amount !== null && amount > 0) return amount;
    var price = AH.util.toNumber(p.price);
    var pct = AH.util.toNumber(p.commissionPercent);
    if (price !== null && pct !== null) return price * pct / 100;
    return null;
  }

  /** Automatic ratings derived from offer data. Each returns {rating, reason} or null. */
  function autoRating(key, p) {
    var U = AH.util;
    if (key === 'audienceClarity') {
      var filled = 0;
      if (U.cleanString(p.targetAudience).length >= 15) filled++;
      if (U.cleanString(p.problem).length >= 15) filled++;
      if (U.cleanString(p.mainBenefit).length >= 10) filled++;
      var map = [0, 2, 3.5, 5];
      return { rating: map[filled], reason: filled + '/3 of audience, problem and benefit are described in enough detail.' };
    }
    if (key === 'commission') {
      var c = estimatedCommission(p);
      if (c === null) return null;
      var r = c >= 100 ? 5 : c >= 50 ? 4 : c >= 25 ? 3 : c >= 10 ? 2 : c > 0 ? 1 : 0;
      return { rating: r, reason: 'Estimated ' + U.round(c, 2) + ' ' + (p.currency || '') + ' per sale.' };
    }
    if (key === 'recurring') {
      if (p.recurring === 'yes') return { rating: 5, reason: 'Recurring commission available.' };
      if (p.recurring === 'no') return { rating: 1, reason: 'One-time commission only.' };
      return null;
    }
    if (key === 'complianceRisk') {
      var risk = AH.compliance.nicheRisk(p);
      var claimIssues = AH.compliance.scanText([p.mainBenefit, p.notes, p.problem].join('\n'), { hasExperience: true })
        .filter(function (i) { return i.level === 'error'; });
      var base = risk.level === 'high' ? 2 : risk.level === 'medium' ? 3 : 4.5;
      if (claimIssues.length) base = Math.max(0, base - 1.5);
      var why = risk.level === 'high' ? risk.reason : risk.level === 'medium' ? risk.reason : 'No regulated-niche signals detected.';
      if (claimIssues.length) why += ' Offer notes contain risky claims (' + claimIssues[0].code + ').';
      return { rating: base, reason: why };
    }
    return null;
  }

  /**
   * Compute the score. `inputs` = { criterionKey: 0..5 } manual ratings (override auto).
   * Returns { score, label, confidence, lowConfidence, breakdown[], warnings[] }.
   */
  function score(product, inputs) {
    inputs = inputs || product.scoreInputs || {};
    var total = 0;
    var ratedWeight = 0;
    var allWeight = 0;
    var warnings = [];
    var breakdown = CRITERIA.map(function (c) {
      allWeight += c.weight;
      var manual = AH.util.toNumber(inputs[c.key]);
      var rating = null, source = 'unrated', reason = '';
      if (manual !== null && manual >= 0 && manual <= 5) {
        rating = manual; source = 'manual'; reason = 'Your rating.';
      } else if (c.auto) {
        var a = autoRating(c.key, product);
        if (a) { rating = a.rating; source = 'auto'; reason = a.reason; }
      }
      var contribution = null;
      if (rating !== null) {
        contribution = c.weight * rating / 5;
        total += contribution;
        ratedWeight += c.weight;
      }
      return {
        key: c.key, label: c.label, weight: c.weight, rating: rating, source: source,
        reason: reason, contribution: contribution === null ? null : AH.util.round(contribution, 1), help: c.help
      };
    });

    var scoreVal = ratedWeight ? Math.round(total / ratedWeight * 100) : null;
    var confidence = Math.round(ratedWeight / allWeight * 100);
    var label = scoreVal === null ? 'UNRATED' : labelFor(scoreVal);

    // Hard safety caps: a dangerous offer can't be "EXCELLENT" because the other numbers look good.
    var trust = find(breakdown, 'trustRisk');
    var comp = find(breakdown, 'complianceRisk');
    if ((trust.rating !== null && trust.rating <= 1) || (comp.rating !== null && comp.rating <= 1)) {
      if (label === 'EXCELLENT' || label === 'GOOD') label = 'TEST';
      warnings.push('Trust or compliance risk is rated very high — label capped at TEST. Promote only with great care, if at all.');
    }
    if (confidence < 50) warnings.push('Low confidence: only ' + confidence + '% of the scoring weight is rated. Rate more criteria for a meaningful score.');
    warnings.push('This score organises your judgement; it does not predict sales or revenue.');

    var strengths = breakdown.filter(function (b) { return b.rating !== null && b.rating >= 4; }).map(function (b) { return b.label; });
    var weaknesses = breakdown.filter(function (b) { return b.rating !== null && b.rating <= 2; }).map(function (b) { return b.label; });

    return {
      score: scoreVal,
      label: label,
      confidence: confidence,
      lowConfidence: confidence < 50,
      breakdown: breakdown,
      strengths: strengths,
      weaknesses: weaknesses,
      warnings: warnings,
      estimatedCommission: estimatedCommission(product)
    };
  }

  function find(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return {};
  }

  function labelFor(s) {
    for (var i = 0; i < LABELS.length; i++) if (s >= LABELS[i].min) return LABELS[i].label;
    return 'WEAK';
  }

  /** Strip unknown keys / out-of-range values from user ratings. */
  function cleanInputs(inputs) {
    var out = {};
    if (!inputs || typeof inputs !== 'object') return out;
    CRITERIA.forEach(function (c) {
      var v = AH.util.toNumber(inputs[c.key]);
      if (v !== null && v >= 0 && v <= 5) out[c.key] = Math.round(v * 2) / 2;
    });
    return out;
  }

  return { CRITERIA: CRITERIA, score: score, labelFor: labelFor, cleanInputs: cleanInputs, estimatedCommission: estimatedCommission };
})();
