// Minimal mock of Google Apps Script services to run backend/Code.gs in Node
const vm = require('vm'), fs = require('fs');
function colToIdx(c) { return c.charCodeAt(0) - 64; }
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.data[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); } out.push(row); } return out; }
  setValues(v) { v.forEach((row, i) => row.forEach((x, j) => { const R = this.r - 1 + i; this.sh.data[R] = this.sh.data[R] || []; this.sh.data[R][this.c - 1 + j] = x; })); return this; }
  clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) if (this.sh.data[this.r - 1 + i]) this.sh.data[this.r - 1 + i][this.c - 1 + j] = ''; return this; }
  setFontWeight() { return this; } setBackground() { return this; } setFontColor() { return this; } setNumberFormat() { return this; }
}
class Sheet {
  constructor(name) { this.name = name; this.data = []; }
  getName() { return this.name; }
  getLastRow() { let n = 0; this.data.forEach((r, i) => { if (r && r.some(x => x !== '' && x !== undefined)) n = i + 1; }); return n; }
  getRange(a, b, c, d) {
    if (typeof a === 'string') { const m = a.match(/^([A-Z]):([A-Z])$/); return new Range(this, 1, colToIdx(m[1]), Math.max(this.data.length, 1), colToIdx(m[2]) - colToIdx(m[1]) + 1); }
    return new Range(this, a, b, c || 1, d || 1);
  }
  appendRow(row) { this.data[this.getLastRow()] = row.slice(); }
  deleteRow(i) { this.data.splice(i - 1, 1); }
  setFrozenRows() {} setColumnWidths() {}
  setName(n) { this.name = n; return this; }
}
function makeEnv() {
  const sheets = [new Sheet('Sheet1')];
  const ss = {
    getSheetByName: n => sheets.find(s => s.name === n) || null,
    insertSheet: n => { const s = new Sheet(n); sheets.push(s); return s; },
    getSheets: () => sheets, deleteSheet: s => sheets.splice(sheets.indexOf(s), 1)
  };
  const pad = n => String(n).padStart(2, '0');
  const env = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => { throw new Error('no ui'); } },
    Utilities: { computeHmacSha256Signature: (v, k) => Array.from(require('crypto').createHmac('sha256', k).update(v).digest()).map(b => b > 127 ? b - 256 : b), formatDate: (d, tz, f) => { const x = new Date(d.getTime() + 8 * 3600e3); const D = x.getUTCFullYear() + '-' + pad(x.getUTCMonth() + 1) + '-' + pad(x.getUTCDate()); return f.includes('HH') ? D + 'T' + pad(x.getUTCHours()) + ':' + pad(x.getUTCMinutes()) + ':' + pad(x.getUTCSeconds()) : D; } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ s, setMimeType() { return this; }, getContent() { return this.s; } }) },
    Logger: { log: () => {} }, console, Math, JSON, Date
  };
  vm.createContext(env);
  vm.runInContext(fs.readFileSync(__dirname + '/../backend/Code.gs', 'utf8'), env);
  env.setup();
  return { env, ss, sheets };
}
module.exports = { makeEnv };
