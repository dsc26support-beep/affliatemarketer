/*
 * Affiliate Campaign Hub — in-memory adapters.
 * Used by the browser demo mode (persisted to localStorage by the caller) and by tests.
 * Apps Script uses SheetStore / AppsScriptPlatform instead (see /apps-script).
 */
var AH = (typeof AH !== 'undefined' && AH) || {};

AH.MemoryStore = function (initial, onChange) {
  var data = initial && typeof initial === 'object' ? initial : {};

  function pk(table) { return AH.schema.tables[table].key || 'id'; }
  function rows(table) {
    if (!AH.schema.tables[table]) throw new Error('Unknown table: ' + table);
    if (!Array.isArray(data[table])) data[table] = [];
    return data[table];
  }
  function indexOf(table, id) {
    var r = rows(table), k = pk(table);
    for (var i = 0; i < r.length; i++) if (r[i][k] === id) return i;
    return -1;
  }
  function changed() { if (onChange) onChange(data); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }

  return {
    list: function (table) { return copy(rows(table)); },
    get: function (table, id) { var i = indexOf(table, id); return i === -1 ? null : copy(rows(table)[i]); },
    insert: function (table, rec) { rows(table).push(copy(rec)); changed(); return copy(rec); },
    append: function (table, rec) { rows(table).push(copy(rec)); changed(); return copy(rec); },
    update: function (table, id, rec) {
      var i = indexOf(table, id);
      if (i === -1) throw new Error('Record not found: ' + table + '/' + id);
      rows(table)[i] = copy(rec);
      changed();
      return copy(rec);
    },
    remove: function (table, id) {
      var i = indexOf(table, id);
      if (i === -1) return false;
      rows(table).splice(i, 1);
      changed();
      return true;
    },
    withLock: function (fn) { return fn(); },
    dump: function () { return copy(data); }
  };
};

AH.MemoryPlatform = function (opts) {
  opts = opts || {};
  var counters = {};
  var seenKeys = {};
  var errors = [];
  var clock = opts.now || function () { return Date.now(); };

  function bucket(key, windowSec) {
    return key + '@' + Math.floor(clock() / (windowSec * 1000));
  }

  return {
    now: clock,
    getAdminToken: function () { return opts.adminToken === undefined ? 'local-demo' : opts.adminToken; },
    hit: function (key, windowSec) { var b = bucket(key, windowSec); counters[b] = (counters[b] || 0) + 1; return counters[b]; },
    count: function (key, windowSec) { return counters[bucket(key, windowSec)] || 0; },
    seen: function (key, ttlSec) {
      var t = clock();
      if (seenKeys[key] && seenKeys[key] > t) return true;
      seenKeys[key] = t + ttlSec * 1000;
      return false;
    },
    logError: function (err, ctx) { errors.push({ message: String(err && err.stack || err), context: ctx }); if (opts.onError) opts.onError(err, ctx); },
    checkUrl: opts.checkUrl,
    errors: errors
  };
};
