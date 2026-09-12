/**
 * UNIT TEST SUITE: test_qso_manager.js
 * 測試 QSO 通聯狀態機、引導流程、Bot 應答腳本與語意校驗
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Import domain dependencies
const morseData = require('../js/core/morse-data.js');
const { QsoManager } = require('../js/core/qso-manager.js');

console.log('=== Running test_qso_manager.js ===');

// 1. Initial State & Configuration
console.log('Test 1: Initial state and station configuration...');
const qso = new QsoManager({
  operatorCallsign: 'BV2TT',
  operatorName: 'EDDIE',
  operatorQth: 'TAIPEI',
  operatorGrid: 'PL05'
});

assert.strictEqual(qso.submode, 'guided');
assert.strictEqual(qso.activeBand, '20M');
assert.strictEqual(qso.currentFreq, '14.025');
assert.strictEqual(qso.myStation.call, 'BV2TT');
assert.strictEqual(qso.myStation.name, 'EDDIE');
assert.strictEqual(qso.myStation.qth, 'TAIPEI');
assert.strictEqual(qso.guidedPhase, 1);
assert.ok(qso.remoteStation, 'Remote station should be automatically assigned');
assert.ok(qso.remoteStation.call, 'Remote station must have a callsign');
console.log('  PASSED: Initial configuration verified');

// 2. Guided Step Info
console.log('Test 2: Guided step info resolution...');
const step1 = qso.getGuidedStepInfo();
assert.strictEqual(step1.step, 1);
assert.strictEqual(step1.key, 'CQ');
assert.ok(step1.hint.includes('BV2TT'), 'Hint must contain operator callsign');
assert.ok(step1.hint.includes('CQ'), 'Hint must contain CQ');
console.log('  PASSED: Step 1 info correctly formatted:', step1.hint);

// 3. Phase 1 Transmit: CQ Calling
console.log('Test 3: Phase 1 CQ transmit & Bot response...');
let botMsg = null;
qso.on('botResponseReady', (data) => {
  botMsg = data.text;
});

const res1 = qso.handleUserTransmit('CQ CQ CQ DE BV2TT BV2TT K');
assert.strictEqual(res1.valid, true);
assert.strictEqual(qso.guidedPhase, 2, 'Guided phase must advance to Phase 2 (RST)');
assert.ok(botMsg, 'Bot must generate response');
assert.ok(botMsg.includes('BV2TT'), 'Bot response must address user callsign');
assert.ok(botMsg.includes(qso.remoteStation.call), 'Bot response must identify remote callsign');
assert.ok(botMsg.endsWith('K'), 'Bot response must conclude with K prosign');
console.log('  PASSED: Phase 1 successful, Bot replied:', botMsg);

// 4. Phase 2 Transmit: RST Signal Report
console.log('Test 4: Phase 2 RST report transmit...');
botMsg = null;
const res2 = qso.handleUserTransmit(`${qso.remoteStation.call} DE BV2TT UR RST 599 5NN BK`);
assert.strictEqual(res2.valid, true);
assert.strictEqual(qso.guidedPhase, 3, 'Guided phase must advance to Phase 3 (QTH & Name)');
assert.ok(botMsg.includes('599') || botMsg.includes('5NN'), 'Bot response should acknowledge RST');
console.log('  PASSED: Phase 2 successful, Bot replied:', botMsg);

// 5. Phase 3 Transmit: QTH & Name Exchange
console.log('Test 5: Phase 3 QTH & Name transmit...');
botMsg = null;
const res3 = qso.handleUserTransmit('QTH TAIPEI OP EDDIE BK');
assert.strictEqual(res3.valid, true);
assert.strictEqual(qso.guidedPhase, 4, 'Guided phase must advance to Phase 4 (Sign-off)');
assert.ok(botMsg.includes(qso.remoteStation.qth), 'Bot must state its QTH');
assert.ok(botMsg.includes(qso.remoteStation.name), 'Bot must state its Name/OP');
console.log('  PASSED: Phase 3 successful, Bot replied:', botMsg);

// 6. Phase 4 Transmit: Sign-off (73 & SK)
console.log('Test 6: Phase 4 73 sign-off & QSO completion...');
botMsg = null;
let completedLog = null;
qso.on('qsoComplete', (log) => {
  completedLog = log;
});

const res4 = qso.handleUserTransmit('TNX FER FB QSO 73 GL TU EE SK');
assert.strictEqual(res4.valid, true);
assert.strictEqual(qso.guidedCompleted, true);
assert.strictEqual(qso.guidedPhase, 5);
assert.ok(completedLog, 'QSO complete event must emit valid log entry');
assert.strictEqual(completedLog.myCall, 'BV2TT');
assert.strictEqual(completedLog.dxCall, qso.remoteStation.call);
assert.strictEqual(completedLog.band, '20M');
assert.strictEqual(completedLog.mode, 'CW');
assert.ok(botMsg.includes('73') && botMsg.includes('SK'), 'Bot must send 73 and SK');
console.log('  PASSED: Phase 4 successful, QSO completed. Log DX Call:', completedLog.dxCall);

// 7. Repeat request handling (AGN?)
console.log('Test 7: Repeat request handling (AGN?)...');
botMsg = null;
const repeatRes = qso.handleUserTransmit('AGN?');
assert.strictEqual(repeatRes.valid, true);
assert.strictEqual(repeatRes.repeat, true);
assert.ok(botMsg, 'Bot must repeat its last message');
console.log('  PASSED: Bot repeated last message:', botMsg);

// 8. Validation warnings
console.log('Test 8: Validation warnings for incorrect inputs...');
const freshQso = new QsoManager();
let warningEmitted = false;
freshQso.on('validationWarning', (data) => {
  warningEmitted = true;
});
const failRes = freshQso.handleUserTransmit('HELLO WORLD RANDOM TEXT');
assert.strictEqual(failRes.valid, false);
assert.strictEqual(warningEmitted, true);
console.log('  PASSED: Invalid input caught with guidance');

// 9. Contest Mode
console.log('Test 9: Contest mode operation...');
freshQso.setSubmode('contest');
assert.strictEqual(freshQso.submode, 'contest');
let contestLog = null;
freshQso.on('qsoComplete', (log) => { contestLog = log; });
const contestRes = freshQso.handleUserTransmit('5NN 001');
assert.strictEqual(contestRes.valid, true);
assert.ok(contestLog, 'Contest log generated');
console.log('  PASSED: Contest mode verified');

// 10. Free Airwaves Mode
console.log('Test 10: Free Airwaves mode operation...');
freshQso.setSubmode('free');
assert.strictEqual(freshQso.submode, 'free');
botMsg = null;
freshQso.on('botResponseReady', (data) => { botMsg = data.text; });
freshQso.handleUserTransmit('CQ CQ CQ DE BV2TT K');
assert.ok(botMsg, 'Bot responded in free mode');
console.log('  PASSED: Free airwaves mode verified');

// 11. ADR 0001: Strict 0 Unicode Emoji Check
console.log('Test 11: ADR 0001 Zero Emoji check on qso-manager.js...');
const qsoCode = fs.readFileSync(path.join(__dirname, '../js/core/qso-manager.js'), 'utf8');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
assert.strictEqual(emojiRegex.test(qsoCode), false, 'qso-manager.js must contain strictly ZERO emojis');
console.log('  PASSED: ADR 0001 Zero Emoji strictly verified');

console.log('\nALL 11 TESTS PASSED IN test_qso_manager.js!');
