/*
 * Affiliate Campaign Hub — validation.
 * The frontend is untrusted: every write goes through `AH.validate.record` on the server.
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.validate = (function () {
  var REF_RE = /^[a-z]{1,8}_[a-z0-9]{1,16}_[a-z0-9]{1,16}$/;
  var INACTIVE_PRODUCT_STATUSES = ['', 'draft', 'researching', 'rejected', 'archived'];

  function allowedDomains(network, settings) {
    var base = (AH.schema.NETWORK_DOMAINS[network] || []).slice();
    var extra = String((settings && settings.extraAllowedDomains) || '')
      .split(/[\s,]+/)
      .map(function (d) { return d.trim().toLowerCase().replace(/^\*\./, ''); })
      .filter(function (d) { return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d); });
    return AH.util.uniq(base.concat(extra));
  }

  /**
   * Validate an affiliate URL for a given network.
   * Returns { ok, error, warnings, parsed, normalized }.
   */
  function affiliateUrl(url, network, settings) {
    var warnings = [];
    var parsed = AH.util.parseUrl(url);
    if (!parsed) return { ok: false, error: 'Enter a complete URL starting with https:// (no spaces or embedded credentials).', warnings: warnings };
    if (parsed.protocol !== 'https') return { ok: false, error: 'Affiliate links must use https://.', warnings: warnings };
    if (AH.schema.NETWORKS.indexOf(network) === -1) return { ok: false, error: 'Select the affiliate network (Digistore24 or ClickBank) first.', warnings: warnings };
    var domains = allowedDomains(network, settings);
    var allowed = domains.some(function (d) { return AH.util.hostMatches(parsed.host, d); });
    if (!allowed) {
      return {
        ok: false,
        error: 'The host "' + parsed.host + '" is not an allowed ' + AH.schema.NETWORK_LABELS[network] +
          ' domain (' + domains.join(', ') + '). If this is a legitimate network link, add the domain under Settings → Allowed link domains.',
        warnings: warnings
      };
    }
    if (network === 'clickbank' && !/hop\./.test(parsed.host) && !/hop/i.test(parsed.path + parsed.query)) {
      warnings.push('This does not look like a ClickBank HopLink (usually https://hop.clickbank.net/?affiliate=…&vendor=…). Double-check it in your ClickBank account.');
    }
    if (network === 'digistore24' && !/\/redir\//i.test(parsed.path) && !/aff=/i.test(parsed.query)) {
      warnings.push('This does not look like a Digistore24 promolink (usually contains /redir/PRODUCT/AFFILIATE/). Double-check it in your Digistore24 account.');
    }
    return { ok: true, error: null, warnings: warnings, parsed: parsed, normalized: normalizeUrl(parsed) };
  }

  /** Canonical form for duplicate detection (ignores utm_* params, trailing slash, case of host). */
  function normalizeUrl(parsedOrString) {
    var p = typeof parsedOrString === 'string' ? AH.util.parseUrl(parsedOrString) : parsedOrString;
    if (!p) return '';
    var q = AH.util.parseQuery(p.query);
    var keys = Object.keys(q).filter(function (k) { return !/^utm_/i.test(k); }).sort();
    var query = keys.map(function (k) { return k + '=' + q[k]; }).join('&');
    return p.host + p.path.replace(/\/+$/, '') + (query ? '?' + query : '');
  }

  function isRef(v) {
    return typeof v === 'string' && REF_RE.test(v);
  }

  function fieldLabel(name) {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
  }

  /**
   * Validate + coerce a record.
   * opts.partial  -> only validate supplied fields (updates)
   * opts.existing -> current stored record (for cross-field checks on update)
   * opts.settings -> settings (for URL allowlists)
   * Returns { value, errors, warnings } — `value` only contains editable fields.
   */
  function record(table, input, opts) {
    opts = opts || {};
    var def = AH.schema.tables[table];
    var errors = {};
    var warnings = [];
    var value = {};
    if (!AH.util.isObject(input)) return { value: value, errors: { _: 'Expected an object.' }, warnings: warnings };

    var merged = {};
    var existing = opts.existing || {};
    Object.keys(existing).forEach(function (k) { merged[k] = existing[k]; });

    Object.keys(def.fields).forEach(function (name) {
      var f = def.fields[name];
      if (!f.editable) return;
      var present = Object.prototype.hasOwnProperty.call(input, name);
      if (!present && opts.partial) return;
      var raw = present ? input[name] : undefined;
      var res = coerce(f, raw, name);
      if (res.error) { errors[name] = res.error; return; }
      if (present || !opts.partial) {
        value[name] = res.value;
        merged[name] = res.value;
      }
    });

    // Required checks against the merged view (so partial updates can't blank required fields).
    var status = merged.status || '';
    Object.keys(def.fields).forEach(function (name) {
      var f = def.fields[name];
      if (errors[name]) return;
      var needed = f.required || (f.requiredWhenActive && INACTIVE_PRODUCT_STATUSES.indexOf(status) === -1);
      if (!needed) return;
      var v = merged[name];
      var empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
      if (empty) {
        errors[name] = f.requiredWhenActive && !f.required
          ? fieldLabel(name) + ' is required before an offer can leave draft status.'
          : fieldLabel(name) + ' is required.';
      }
    });

    // Affiliate URL fields are validated against the network allowlist.
    Object.keys(def.fields).forEach(function (name) {
      var f = def.fields[name];
      if (!f.affiliate || errors[name]) return;
      var v = merged[name];
      if (!v) return;
      if (opts.partial && !Object.prototype.hasOwnProperty.call(value, name) && !Object.prototype.hasOwnProperty.call(value, 'network')) return;
      var r = affiliateUrl(v, merged.network, opts.settings);
      if (!r.ok) errors[name] = r.error;
      else warnings = warnings.concat(r.warnings);
    });

    return { value: value, errors: errors, warnings: warnings };
  }

  function coerce(f, raw, name) {
    var U = AH.util;
    if (raw === undefined || raw === null) {
      if (f.type === 'bool') return { value: false };
      if (f.type === 'number') return { value: null };
      if (f.type === 'json') return { value: null };
      return { value: '' };
    }
    switch (f.type) {
      case 'string':
      case 'text': {
        if (typeof raw === 'object') return { error: fieldLabel(name) + ' must be text.' };
        var str = U.cleanString(raw);
        if (f.type === 'string') str = str.replace(/\s*[\r\n]+\s*/g, ' ');
        if (str.length > f.max) return { error: fieldLabel(name) + ' is too long (max ' + f.max + ' characters).' };
        return { value: str };
      }
      case 'enum': {
        var ev = U.cleanString(raw, 64);
        if (ev && f.values.indexOf(ev) === -1) return { error: fieldLabel(name) + ' must be one of: ' + f.values.join(', ') + '.' };
        return { value: ev };
      }
      case 'number': {
        if (raw === '') return { value: null };
        var num = typeof raw === 'number' ? raw : Number(String(raw).trim());
        if (!isFinite(num)) return { error: fieldLabel(name) + ' must be a number.' };
        if (f.min !== undefined && num < f.min) return { error: fieldLabel(name) + ' must be at least ' + f.min + '.' };
        if (f.max !== undefined && num > f.max) return { error: fieldLabel(name) + ' must be at most ' + f.max + '.' };
        return { value: num };
      }
      case 'bool':
        return { value: U.toBool(raw) };
      case 'url': {
        var us = U.cleanString(raw, 2048);
        if (!us) return { value: '' };
        var p = U.parseUrl(us);
        if (!p) return { error: fieldLabel(name) + ' must be a complete http(s) URL.' };
        return { value: p.href };
      }
      case 'ref': {
        var rs = U.cleanString(raw, 64);
        if (rs && !isRef(rs)) return { error: fieldLabel(name) + ' is not a valid ID.' };
        return { value: rs };
      }
      case 'json': {
        var jv = raw;
        if (typeof jv === 'string') {
          if (!jv.trim()) return { value: null };
          try { jv = JSON.parse(jv); } catch (err) { return { error: fieldLabel(name) + ' must be valid JSON.' }; }
        }
        if (typeof jv !== 'object') return { error: fieldLabel(name) + ' must be an object or list.' };
        var size = JSON.stringify(jv).length;
        if (size > f.max) return { error: fieldLabel(name) + ' is too large (' + size + ' > ' + f.max + ' characters).' };
        return { value: sanitizeJson(jv, 0) };
      }
      default:
        return { value: U.cleanString(raw, 2000) };
    }
  }

  /** Strip control characters from strings inside nested JSON and cap depth. */
  function sanitizeJson(v, depth) {
    if (depth > 8) return null;
    if (Array.isArray(v)) return v.slice(0, 200).map(function (x) { return sanitizeJson(x, depth + 1); });
    if (v && typeof v === 'object') {
      var out = {};
      Object.keys(v).slice(0, 100).forEach(function (k) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
        out[AH.util.cleanString(k, 64)] = sanitizeJson(v[k], depth + 1);
      });
      return out;
    }
    if (typeof v === 'string') return AH.util.cleanString(v, 10000);
    if (typeof v === 'number' || typeof v === 'boolean' || v === null) return v;
    return null;
  }

  function hasErrors(res) {
    return Object.keys(res.errors).length > 0;
  }

  /** Validate a settings patch. Returns { value, errors }. */
  function settings(input) {
    var errors = {};
    var value = {};
    var U = AH.util;
    if (!U.isObject(input)) return { value: value, errors: { _: 'Expected an object.' } };
    Object.keys(input).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(AH.schema.DEFAULT_SETTINGS, k)) return; // ignore unknown keys
      var type = AH.schema.SETTING_TYPES[k] || 'string';
      var raw = input[k];
      if (type === 'int') {
        var n = Number(raw);
        if (!isFinite(n) || n < 1 || n > 1000000) errors[k] = 'Must be a whole number ≥ 1.';
        else value[k] = Math.round(n);
      } else if (type === 'ratio') {
        var r = Number(raw);
        if (!isFinite(r) || r <= 0 || r >= 1) errors[k] = 'Must be a decimal between 0 and 1 (e.g. 0.02 for 2%).';
        else value[k] = r;
      } else if (type === 'bool') {
        value[k] = U.toBool(raw);
      } else if (type === 'url') {
        var su = U.cleanString(raw, 2048);
        if (su && !U.parseUrl(su)) errors[k] = 'Must be a complete http(s) URL.';
        else value[k] = su.replace(/\/+$/, '');
      } else if (type === 'email') {
        var se = U.cleanString(raw, 254);
        if (se && !U.isEmail(se)) errors[k] = 'Must be a valid email address.';
        else value[k] = se;
      } else {
        var max = k === 'authorBio' || k === 'disclosureText' || k === 'extraAllowedDomains' ? 1500 : 200;
        var ss = U.cleanString(raw);
        if (ss.length > max) errors[k] = 'Too long (max ' + max + ' characters).';
        else value[k] = ss;
      }
    });
    if (value.disclosureText !== undefined && value.disclosureText.length < 40) {
      errors.disclosureText = 'The affiliate disclosure must clearly explain the relationship (at least 40 characters).';
    }
    return { value: value, errors: errors };
  }

  return {
    affiliateUrl: affiliateUrl,
    allowedDomains: allowedDomains,
    normalizeUrl: normalizeUrl,
    record: record,
    settings: settings,
    hasErrors: hasErrors,
    isRef: isRef
  };
})();
