/**
 * TEST SUITE: test_rx_dictionaries_and_generators.js
 * 驗證電信抄收題庫產生器 (Issue #31)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Rx Dictionaries & Generators Tests (Issue #31) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const dataModule = require('../js/core/morse-data.js');

// 1. Data Dictionaries Presence
console.log('1. Verifying CW Dictionaries in morse-data.js...');
assert.ok(Array.isArray(dataModule.CALLSIGN_PREFIXES), 'CALLSIGN_PREFIXES must be an array');
assert.ok(dataModule.CALLSIGN_PREFIXES.includes('BV'), 'CALLSIGN_PREFIXES must include BV');
assert.ok(dataModule.CALLSIGN_PREFIXES.includes('JA'), 'CALLSIGN_PREFIXES must include JA');
assert.ok(dataModule.CALLSIGN_PREFIXES.includes('W'), 'CALLSIGN_PREFIXES must include W');

assert.ok(Array.isArray(dataModule.CW_Q_CODES), 'CW_Q_CODES must be an array');
assert.ok(dataModule.CW_Q_CODES.some(q => q.code === 'QTH'), 'CW_Q_CODES must contain QTH');
assert.ok(dataModule.CW_Q_CODES.some(q => q.code === 'QSL'), 'CW_Q_CODES must contain QSL');

assert.ok(Array.isArray(dataModule.CW_ABBREVIATIONS), 'CW_ABBREVIATIONS must be an array');
assert.ok(dataModule.CW_ABBREVIATIONS.some(a => a.word === '73'), 'CW_ABBREVIATIONS must contain 73');
assert.ok(dataModule.CW_ABBREVIATIONS.some(a => a.word === 'CQ'), 'CW_ABBREVIATIONS must contain CQ');
console.log('   -> Dictionaries verified!');

// 2. Koch Rx Targets Generator
console.log('\n2. Verifying generateKochRxTargets...');
assert.strictEqual(typeof dataModule.generateKochRxTargets, 'function', 'generateKochRxTargets must be a function');

// Level 1: Only K and M
const targetsLvl1 = dataModule.generateKochRxTargets(1, 20);
assert.strictEqual(targetsLvl1.length, 20, 'Should generate 20 items');
targetsLvl1.forEach(char => {
  assert.ok(['K', 'M'].includes(char), `Level 1 items must only be K or M, got ${char}`);
});

// Level 3: K, M, R, S
const targetsLvl3 = dataModule.generateKochRxTargets(3, 30);
const allowedLvl3 = dataModule.KOCH_SEQUENCE.slice(0, 4); // index 0,1,2,3
targetsLvl3.forEach(char => {
  assert.ok(allowedLvl3.includes(char), `Level 3 items must be in ${allowedLvl3.join(',')}, got ${char}`);
});
console.log('   -> generateKochRxTargets verified!');

// 3. Callsign Generator
console.log('\n3. Verifying generateCallsign...');
assert.strictEqual(typeof dataModule.generateCallsign, 'function', 'generateCallsign must be a function');
const callsignRegex = /^[A-Z0-9]{1,4}\d[A-Z]{1,3}$/;

for (let i = 0; i < 50; i++) {
  const call = dataModule.generateCallsign();
  assert.ok(callsignRegex.test(call), `Callsign "${call}" must match international callsign regex format`);
}
console.log('   -> 50 random callsigns generated and verified against standard format!');

// 4. Code Group Generator (5-character standard)
console.log('\n4. Verifying generateCodeGroup...');
assert.strictEqual(typeof dataModule.generateCodeGroup, 'function', 'generateCodeGroup must be a function');
for (let i = 0; i < 30; i++) {
  const group = dataModule.generateCodeGroup(5);
  assert.strictEqual(group.length, 5, 'Code group length must be 5');
  assert.ok(/^[A-Z0-9]{5}$/.test(group), `Code group "${group}" must be 5 alphanumeric uppercase characters`);
}
console.log('   -> generateCodeGroup 5-character blocks verified!');

// 5. Dual-Track Synchronization in prototype_morse_card.html
console.log('\n5. Verifying Dual-Track presence in prototype_morse_card.html...');
const requiredIdentifiers = [
  'CALLSIGN_PREFIXES',
  'CW_Q_CODES',
  'CW_ABBREVIATIONS',
  'generateKochRxTargets',
  'generateCallsign',
  'generateCodeGroup'
];

requiredIdentifiers.forEach(id => {
  assert.ok(protoHtml.includes(id), `prototype_morse_card.html must define ${id}`);
});
console.log('   -> prototype_morse_card.html verified with all dictionaries and generators!');

console.log('\n====================================================');
console.log('ALL RX DICTIONARIES & GENERATORS TESTS PASSED!');
console.log('====================================================\n');
