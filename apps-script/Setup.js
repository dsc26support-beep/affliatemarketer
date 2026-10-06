/**
 * One-time setup + maintenance helpers. Run these from the Apps Script editor.
 *
 *   setup()             create/upgrade all sheets, create the admin token (idempotent)
 *   showAdminToken()    print the admin token to the execution log
 *   rotateAdminToken()  invalidate the old token and create a new one
 */

function setup() {
  var ss = getSpreadsheet_();
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());

  Object.keys(AH.schema.tables).forEach(function (table) {
    ensureSheet_(ss, table, AH.schema.columns(table));
  });

  // Remove the empty default tab if present.
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Tabelle1') || ss.getSheetByName('Feuille 1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);

  if (!props.getProperty('ADMIN_TOKEN')) props.setProperty('ADMIN_TOKEN', newToken_());
  Logger.log('Setup complete for spreadsheet "%s".', ss.getName());
  Logger.log('Admin token (keep it secret, paste it into the dashboard Settings page): %s', props.getProperty('ADMIN_TOKEN'));
}

function showAdminToken() {
  Logger.log(PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN') || 'No token yet — run setup().');
}

function rotateAdminToken() {
  var token = newToken_();
  PropertiesService.getScriptProperties().setProperty('ADMIN_TOKEN', token);
  Logger.log('New admin token: %s (the old token no longer works).', token);
}

function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

/** Bound script: uses the parent spreadsheet. Standalone: set SPREADSHEET_ID in Script Properties. */
function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet: open the script from a Google Sheet (Extensions → Apps Script) or set SPREADSHEET_ID.');
  return ss;
}

/** Create the tab if missing and append any missing header columns (non-destructive). */
function ensureSheet_(ss, name, columns) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var lastCol = sh.getLastColumn();
  var existing = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var missing = columns.filter(function (c) { return existing.indexOf(c) === -1; });
  if (missing.length) sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  var width = existing.length + missing.length;
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#eef2f6');
  // Plain-text format stops Sheets from auto-converting ISO dates / IDs into other types.
  sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), width).setNumberFormat('@');
  return sh;
}
