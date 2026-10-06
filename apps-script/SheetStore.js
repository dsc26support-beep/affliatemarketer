/**
 * Google Sheets storage adapter (implements the store interface used by AH.createApi).
 *
 * - One tab per table, header row = column names (see AH.schema).
 * - Each table is read at most once per request (getDataRange().getValues()) and cached.
 * - Values that look like formulas are neutralised before writing.
 * - Columns are mapped by header name, so re-ordering columns in the sheet is safe.
 */
function SheetStore_(ss) {
  this.ss = ss;
  this.cache = {};
  this.lockDepth = 0;
}

SheetStore_.prototype.pk_ = function (table) {
  return AH.schema.tables[table].key || 'id';
};

SheetStore_.prototype.sheet_ = function (table) {
  if (!AH.schema.tables[table]) throw new Error('Unknown table: ' + table);
  var sh = this.ss.getSheetByName(table);
  if (!sh) throw new Error('Missing sheet "' + table + '". Run setup() in the Apps Script editor.');
  return sh;
};

SheetStore_.prototype.load_ = function (table) {
  if (this.cache[table]) return this.cache[table];
  var sh = this.sheet_(table);
  var values = sh.getDataRange().getValues();
  var headers = values.length ? values[0].map(function (h) { return String(h).trim(); }) : [];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var empty = true;
    for (var c = 0; c < row.length; c++) if (row[c] !== '' && row[c] !== null) { empty = false; break; }
    if (empty) continue;
    rows.push({ rowIndex: i + 1, rec: this.deserialize_(table, headers, row) });
  }
  this.cache[table] = { sheet: sh, headers: headers, rows: rows };
  return this.cache[table];
};

SheetStore_.prototype.deserialize_ = function (table, headers, row) {
  var fields = AH.schema.tables[table].fields;
  var rec = {};
  headers.forEach(function (h, i) {
    if (!fields[h]) return;
    var v = row[i];
    if (v instanceof Date) v = isNaN(v.getTime()) ? '' : v.toISOString();
    var type = fields[h].type;
    if (type === 'json') {
      if (v === '' || v === null) { rec[h] = null; return; }
      try { rec[h] = JSON.parse(String(v)); } catch (e) { rec[h] = null; }
    } else if (type === 'bool') {
      rec[h] = v === true || String(v).toUpperCase() === 'TRUE';
    } else if (type === 'number') {
      rec[h] = v === '' || v === null ? null : Number(v);
      if (rec[h] !== null && !isFinite(rec[h])) rec[h] = null;
    } else {
      rec[h] = v === null || v === undefined ? '' : String(v);
    }
  });
  return rec;
};

SheetStore_.prototype.serialize_ = function (table, headers, rec) {
  var fields = AH.schema.tables[table].fields;
  return headers.map(function (h) {
    var f = fields[h];
    var v = rec[h];
    if (!f || v === undefined || v === null) return '';
    if (f.type === 'json') return AH.util.neutralizeFormula(JSON.stringify(v));
    if (f.type === 'bool') return v === true;
    if (f.type === 'number') return typeof v === 'number' && isFinite(v) ? v : '';
    return AH.util.neutralizeFormula(String(v));
  });
};

SheetStore_.prototype.find_ = function (table, id) {
  var t = this.load_(table);
  var k = this.pk_(table);
  for (var i = 0; i < t.rows.length; i++) if (t.rows[i].rec[k] === id) return { t: t, i: i };
  return null;
};

function clone_(v) { return JSON.parse(JSON.stringify(v)); }

SheetStore_.prototype.list = function (table) {
  return this.load_(table).rows.map(function (r) { return clone_(r.rec); });
};

SheetStore_.prototype.get = function (table, id) {
  var hit = this.find_(table, id);
  return hit ? clone_(hit.t.rows[hit.i].rec) : null;
};

SheetStore_.prototype.insert = function (table, rec) {
  var t = this.load_(table);
  t.sheet.appendRow(this.serialize_(table, t.headers, rec));
  t.rows.push({ rowIndex: t.sheet.getLastRow(), rec: clone_(rec) });
  return clone_(rec);
};

/** Fast path for high-volume event rows: no read of the existing sheet. */
SheetStore_.prototype.append = function (table, rec) {
  var sh = this.sheet_(table);
  var headers = this.cache[table] ? this.cache[table].headers : sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(this.serialize_(table, headers, rec));
  delete this.cache[table];
  return clone_(rec);
};

SheetStore_.prototype.update = function (table, id, rec) {
  var hit = this.find_(table, id);
  if (!hit) throw new Error('Record not found: ' + table + '/' + id);
  var row = hit.t.rows[hit.i];
  hit.t.sheet.getRange(row.rowIndex, 1, 1, hit.t.headers.length).setValues([this.serialize_(table, hit.t.headers, rec)]);
  row.rec = clone_(rec);
  return clone_(rec);
};

SheetStore_.prototype.remove = function (table, id) {
  var hit = this.find_(table, id);
  if (!hit) return false;
  var rowIndex = hit.t.rows[hit.i].rowIndex;
  hit.t.sheet.deleteRow(rowIndex);
  hit.t.rows.splice(hit.i, 1);
  hit.t.rows.forEach(function (r) { if (r.rowIndex > rowIndex) r.rowIndex--; });
  return true;
};

/** Serialise writes across concurrent executions. Re-entrant within one execution. */
SheetStore_.prototype.withLock = function (fn) {
  if (this.lockDepth > 0) return fn();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Could not obtain the write lock (busy). Try again.');
  this.lockDepth++;
  this.cache = {}; // re-read inside the lock so concurrent writes are not lost
  try {
    return fn();
  } finally {
    this.lockDepth--;
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
};
