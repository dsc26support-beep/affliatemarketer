/*
 * Affiliate Campaign Hub — SEO helpers: canonical URLs, sitemap, structured data,
 * internal-link suggestions. Built around search intent, never keyword stuffing.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.seo = (function () {
  var U = function () { return AH.util; };

  function pagePath(page) {
    return '/p/' + page.slug + '.html';
  }

  function canonical(page, settings) {
    var seo = page.seo || {};
    if (seo.canonical && U().parseUrl(seo.canonical)) return seo.canonical;
    var base = String((settings && settings.siteUrl) || '').replace(/\/+$/, '');
    return base ? base + pagePath(page) : pagePath(page);
  }

  /** XML sitemap of published, indexable pages (+ optional static URLs). */
  function sitemap(pages, settings, extraPaths) {
    var base = String((settings && settings.siteUrl) || '').replace(/\/+$/, '');
    var urls = [];
    (extraPaths || []).forEach(function (p) { urls.push({ loc: base + p, lastmod: '' }); });
    pages
      .filter(function (p) { return p.status === 'published' && !(p.seo && p.seo.noindex); })
      .forEach(function (p) { urls.push({ loc: canonical(p, settings), lastmod: U().dateKey(p.updatedAt || p.publishedAt) }); });
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(function (u) {
        return '  <url><loc>' + U().escapeXml(u.loc) + '</loc>' + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '') + '</url>';
      }).join('\n') +
      '\n</urlset>\n';
  }

  function robots(settings) {
    var base = String((settings && settings.siteUrl) || '').replace(/\/+$/, '');
    return 'User-agent: *\nDisallow: /admin/\n' + (base ? 'Sitemap: ' + base + '/sitemap.xml\n' : '');
  }

  /** JSON-LD: Article (+ FAQPage when real FAQ answers exist). No fake Review/Rating markup. */
  function jsonLd(page, product, settings) {
    var seo = page.seo || {};
    var hasPh = function (s) { return AH.compliance.findPlaceholders(s).length > 0; };
    var graph = [{
      '@type': 'Article',
      headline: seo.title || page.title,
      description: seo.metaDescription || '',
      dateModified: page.updatedAt || page.publishedAt || '',
      datePublished: page.publishedAt || '',
      mainEntityOfPage: canonical(page, settings),
      author: settings && settings.authorName ? { '@type': 'Person', name: settings.authorName } : undefined,
      about: product && product.name ? { '@type': 'Thing', name: product.name } : undefined
    }];
    var faq = (page.sections && page.sections.faq && page.sections.faq.items) || [];
    var realFaq = faq.filter(function (f) { return f && f.q && f.a && !hasPh(f.q) && !hasPh(f.a); });
    if (realFaq.length) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: realFaq.map(function (f) {
          return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } };
        })
      });
    }
    // JSON.stringify drops undefined; escape "<" so the payload can't close the <script> tag.
    return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  }

  /** Suggest internal links between published/draft pages in the same niche or product. */
  function internalLinks(page, allPages, products) {
    var prodById = {};
    (products || []).forEach(function (p) { prodById[p.id] = p; });
    var me = prodById[page.productId] || {};
    return allPages
      .filter(function (p) { return p.id !== page.id && p.status !== 'archived'; })
      .map(function (p) {
        var other = prodById[p.productId] || {};
        var score = 0;
        if (p.productId && p.productId === page.productId) score += 2;
        if (me.niche && other.niche && me.niche.toLowerCase() === other.niche.toLowerCase()) score += 2;
        if (me.category && other.category && me.category.toLowerCase() === other.category.toLowerCase()) score += 1;
        return { pageId: p.id, title: p.title, path: pagePath(p), pageType: p.pageType, score: score };
      })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 6);
  }

  /** Simple metadata lint used in the editor. */
  function lint(seo) {
    seo = seo || {};
    var out = [];
    var t = AH.util.cleanString(seo.title);
    var d = AH.util.cleanString(seo.metaDescription);
    if (!t) out.push('Missing SEO title.');
    else if (t.length > 60) out.push('SEO title is ' + t.length + ' chars (≤ 60 recommended).');
    if (!d) out.push('Missing meta description.');
    else if (d.length < 70) out.push('Meta description is short (' + d.length + ' chars). Aim for 120–160.');
    else if (d.length > 160) out.push('Meta description is ' + d.length + ' chars (≤ 160 recommended).');
    if (t && /(\b\w+\b)(?:\W+\w+){0,3}\W+\1\b.*\1/i.test(t)) out.push('Title repeats a word several times — avoid keyword stuffing.');
    return out;
  }

  return { canonical: canonical, pagePath: pagePath, sitemap: sitemap, robots: robots, jsonLd: jsonLd, internalLinks: internalLinks, lint: lint };
})();
