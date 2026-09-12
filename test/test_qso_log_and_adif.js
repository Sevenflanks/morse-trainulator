/**
 * UNIT TEST SUITE: test_qso_log_and_adif.js
 * 測試 QSO 日誌持久化、統計、ADIF 3.1.4 與 CSV 格式匯出引擎
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { QsoLogManager } = require('../js/core/qso-log-manager.js');

console.log('=== Running test_qso_log_and_adif.js ===');

// Mock Storage implementation
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
}

const mockStorage = new MockStorage();
const logManager = new QsoLogManager(mockStorage, { maxEntries: 5 });

// 1. Initial Empty State
console.log('Test 1: Initial empty state...');
assert.strictEqual(logManager.logs.length, 0);
assert.strictEqual(logManager.getStats().total, 0);
console.log('  PASSED: Empty state verified');

// 2. Add Log Entry
console.log('Test 2: Adding QSO log entries...');
const entry1 = logManager.addLog({
  dxCall: 'JA1ABC',
  myCall: 'BV2TT',
  band: '20M',
  freq: '14.025',
  rstSent: '599',
  rstRcvd: '579',
  name: 'KEN',
  qth: 'TOKYO',
  grid: 'PM95',
  dateUtc: '20260912',
  timeUtc: '142400',
  notes: 'Guided CW QSO complete'
});

assert.ok(entry1.id, 'Entry must be assigned an ID');
assert.strictEqual(entry1.dxCall, 'JA1ABC');
assert.strictEqual(logManager.logs.length, 1);
assert.strictEqual(logManager.getStats().total, 1);
assert.strictEqual(logManager.getStats().uniqueCalls, 1);
console.log('  PASSED: Entry added successfully:', entry1.id);

// 3. Persistence in Storage
console.log('Test 3: Storage persistence...');
const reloadedManager = new QsoLogManager(mockStorage);
assert.strictEqual(reloadedManager.logs.length, 1);
assert.strictEqual(reloadedManager.logs[0].dxCall, 'JA1ABC');
console.log('  PASSED: Persistence reloaded correctly');

// 4. Max Entries Truncation (Cap at 5)
console.log('Test 4: Max entries limit truncation...');
for (let i = 1; i <= 6; i++) {
  logManager.addLog({
    dxCall: `W6XYZ${i}`,
    band: '40M',
    dateUtc: '20260912',
    timeUtc: `15000${i}`
  });
}
assert.strictEqual(logManager.logs.length, 5, 'Must be capped at maxEntries (5)');
assert.strictEqual(logManager.logs[0].dxCall, 'W6XYZ6', 'Most recent must be first');
console.log('  PASSED: Truncation verified, count is 5');

// 5. Get and Delete Log
console.log('Test 5: Get and delete single log...');
const targetId = logManager.logs[0].id;
const retrieved = logManager.getLog(targetId);
assert.strictEqual(retrieved.dxCall, 'W6XYZ6');

const deleted = logManager.deleteLog(targetId);
assert.strictEqual(deleted, true);
assert.strictEqual(logManager.logs.length, 4);
assert.strictEqual(logManager.getLog(targetId), null);
console.log('  PASSED: Log deleted successfully');

// 6. ADIF 3.1.4 Export Specification
console.log('Test 6: ADIF 3.1.4 string generation...');
// Add a known entry for ADIF inspection
logManager.clearLogs();
logManager.addLog({
  dxCall: 'DL3HEX',
  myCall: 'BV2TT',
  band: '20M',
  freq: '14.025',
  mode: 'CW',
  rstSent: '599',
  rstRcvd: '599',
  name: 'HANS',
  qth: 'BERLIN',
  grid: 'JO62',
  dateUtc: '20260912',
  timeUtc: '123000',
  notes: 'FB CW CONTACT'
});

const adifOutput = logManager.exportADIF();
assert.ok(adifOutput.includes('<ADIF_VER:5>3.1.4'), 'ADIF must include version tag 3.1.4');
assert.ok(adifOutput.includes('<PROGRAMID:17>MorseTrainulator'), 'ADIF must include PROGRAMID');
assert.ok(adifOutput.includes('<EOH>'), 'ADIF must terminate header with <EOH>');
assert.ok(adifOutput.includes('<CALL:6>DL3HEX'), 'ADIF record must have <CALL:6>DL3HEX');
assert.ok(adifOutput.includes('<QSO_DATE:8>20260912'), 'ADIF record must have valid <QSO_DATE>');
assert.ok(adifOutput.includes('<BAND:3>20M'), 'ADIF record must have valid <BAND>');
assert.ok(adifOutput.includes('<MODE:2>CW'), 'ADIF record must have <MODE:2>CW');
assert.ok(adifOutput.includes('<RST_SENT:3>599'), 'ADIF record must have <RST_SENT:3>599');
assert.ok(adifOutput.includes('<NAME:4>HANS'), 'ADIF record must have <NAME:4>HANS');
assert.ok(adifOutput.includes('<QTH:6>BERLIN'), 'ADIF record must have <QTH:6>BERLIN');
assert.ok(adifOutput.includes('<GRIDSQUARE:4>JO62'), 'ADIF record must have <GRIDSQUARE:4>JO62');
assert.ok(adifOutput.includes('<EOR>'), 'ADIF record must terminate with <EOR>');
console.log('  PASSED: ADIF 3.1.4 format strictly validated:\n' + adifOutput.slice(0, 300) + '...');

// 7. CSV Export
console.log('Test 7: CSV string generation...');
const csvOutput = logManager.exportCSV();
assert.ok(csvOutput.startsWith('ID,Date_UTC,Time_UTC'), 'CSV must include header row');
assert.ok(csvOutput.includes('"DL3HEX"'), 'CSV must include DX callsign');
assert.ok(csvOutput.includes('"BERLIN"'), 'CSV must include QTH');
assert.ok(csvOutput.includes('"20M"'), 'CSV must include Band');
console.log('  PASSED: CSV format validated');

// 8. ADR 0001: Strict 0 Unicode Emoji Check
console.log('Test 8: ADR 0001 Zero Emoji check on qso-log-manager.js...');
const logCode = fs.readFileSync(path.join(__dirname, '../js/core/qso-log-manager.js'), 'utf8');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
assert.strictEqual(emojiRegex.test(logCode), false, 'qso-log-manager.js must contain strictly ZERO emojis');
console.log('  PASSED: ADR 0001 Zero Emoji strictly verified');

console.log('\nALL 8 TESTS PASSED IN test_qso_log_and_adif.js!');
