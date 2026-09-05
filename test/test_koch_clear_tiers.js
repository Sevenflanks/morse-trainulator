const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Koch Stage Map & Clearance Prestige Tiers Tests ===\n');

// 1. Test KochManager domain logic
console.log('1. Testing KochManager clearance logic...');
const { KochManager } = require('../js/core/koch-manager.js');

const mockStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, val) { this.data[key] = val.toString(); },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

const km = new KochManager(mockStorage);
assert.deepStrictEqual(km.clears, {}, 'Clears should be empty initially');
assert.strictEqual(km.getStageClear(1), null, 'getStageClear(1) should be null initially');

const initialCounts = km.getClearanceCounts();
assert.strictEqual(initialCounts.quick, 0);
assert.strictEqual(initialCounts.standard, 0);
assert.strictEqual(initialCounts.challenge, 0);
assert.strictEqual(initialCounts.totalCleared, 0);

// Record quick clear
console.log('  -> Testing recordClear (quick)...');
km.recordClear(1, 'quick', 91.6);
assert.strictEqual(km.getStageClear(1).highest, 'quick');
assert.strictEqual(km.getStageClear(1).modes.quick, true);
assert.strictEqual(km.getStageClear(1).accuracy, 91.6);
assert.strictEqual(km.getClearanceCounts().quick, 1);
assert.strictEqual(km.getClearanceCounts().totalCleared, 1);

// Upgrade to standard clear
console.log('  -> Testing promotion from quick to standard...');
km.recordClear(1, 'standard', 94.0);
assert.strictEqual(km.getStageClear(1).highest, 'standard');
assert.strictEqual(km.getStageClear(1).modes.standard, true);
assert.strictEqual(km.getStageClear(1).modes.quick, true);
assert.strictEqual(km.getStageClear(1).accuracy, 94.0);
assert.strictEqual(km.getClearanceCounts().quick, 0);
assert.strictEqual(km.getClearanceCounts().standard, 1);
assert.strictEqual(km.getClearanceCounts().totalCleared, 1);

// Upgrade to challenge clear (highest honor)
console.log('  -> Testing promotion from standard to challenge...');
km.recordClear(1, 'challenge', 98.0);
assert.strictEqual(km.getStageClear(1).highest, 'challenge');
assert.strictEqual(km.getStageClear(1).modes.challenge, true);
assert.strictEqual(km.getClearanceCounts().challenge, 1);
assert.strictEqual(km.getClearanceCounts().totalCleared, 1);

// Retaining highest honor when lower tier is practiced later
console.log('  -> Testing honor retention when playing quick on cleared challenge stage...');
km.recordClear(1, 'quick', 92.0);
assert.strictEqual(km.getStageClear(1).highest, 'challenge', 'Highest tier should remain challenge');
assert.strictEqual(km.getStageClear(1).accuracy, 98.0, 'Highest accuracy should be retained');

// Test stage 2 quick & stage 3 standard
km.recordClear(2, 'quick', 90);
km.recordClear(3, 'standard', 95);
const multiCounts = km.getClearanceCounts();
assert.strictEqual(multiCounts.challenge, 1); // Stage 1
assert.strictEqual(multiCounts.quick, 1);     // Stage 2
assert.strictEqual(multiCounts.standard, 1);  // Stage 3
assert.strictEqual(multiCounts.totalCleared, 3);

// Test persistence & restore
console.log('  -> Testing persistence in localStorage...');
const restoredKm = new KochManager(mockStorage);
assert.strictEqual(restoredKm.getStageClear(1).highest, 'challenge');
assert.strictEqual(restoredKm.getStageClear(2).highest, 'quick');
assert.strictEqual(restoredKm.getStageClear(3).highest, 'standard');
assert.strictEqual(restoredKm.getClearanceCounts().totalCleared, 3);

// Test resetProgress
console.log('  -> Testing resetProgress...');
restoredKm.resetProgress();
assert.deepStrictEqual(restoredKm.clears, {});
assert.strictEqual(restoredKm.getClearanceCounts().totalCleared, 0);
assert.strictEqual(mockStorage.getItem('morse_koch_clears'), '{}');

console.log('  ✓ KochManager clearance tier methods passed!');

// 2. Test DOM existence in index.html & prototype_morse_card.html
console.log('\n2. Testing DOM elements and CSS rules in HTML files...');
const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.resolve(__dirname, '../prototype_morse_card.html'), 'utf8');

const requiredDoms = [
  'id="koch-trophy-summary"',
  'id="trophy-cnt-challenge"',
  'id="trophy-cnt-standard"',
  'id="trophy-cnt-quick"',
  'id="trophy-cnt-total"',
  'id="koch-matrix-card"',
  'id="koch-stage-grid"',
  'id="koch-target-clear-badge"'
];

for (const dom of requiredDoms) {
  assert(indexHtml.includes(dom), `index.html must include ${dom}`);
  assert(protoHtml.includes(dom), `prototype_morse_card.html must include ${dom}`);
}

assert(indexHtml.includes('id="koch-stage1-clear-badge"'), 'index.html must include koch-stage1-clear-badge');

const modesCss = fs.readFileSync(path.resolve(__dirname, '../css/modes.css'), 'utf8');
const requiredCss = [
  '.koch-trophy-summary',
  '.trophy-pill.pill-challenge',
  '.trophy-pill.pill-standard',
  '.trophy-pill.pill-quick',
  '.trophy-pill.pill-total',
  '.koch-matrix-card',
  '.koch-stage-grid',
  '.stage-cell',
  '.stage-cell.active-stage',
  '.stage-cell.cell-cleared-challenge',
  '.stage-cell.cell-cleared-standard',
  '.stage-cell.cell-cleared-quick',
  '.stage-cell.cell-locked',
  '.badge-tier.tier-challenge',
  '.badge-tier.tier-standard',
  '.badge-tier.tier-quick',
  '.badge-tier.tier-none'
];

for (const css of requiredCss) {
  assert(modesCss.includes(css), `css/modes.css must include ${css}`);
  assert(protoHtml.includes(css), `prototype_morse_card.html must include ${css}`);
}

console.log('  ✓ DOM and CSS rules verified across all files!');

// 3. Test UI Helpers: getClearBadgeHtml & renderStageMatrix
console.log('\n3. Testing UI helper functions...');
const kochMode = require('../js/ui/koch-mode.js');
assert.strictEqual(typeof kochMode.getClearBadgeHtml, 'function');
assert.strictEqual(typeof kochMode.renderStageMatrix, 'function');
assert.strictEqual(typeof kochMode.selectKochStage, 'function');

assert(kochMode.getClearBadgeHtml(null).includes('tier-none'));
assert(kochMode.getClearBadgeHtml({ highest: 'challenge' }).includes('tier-challenge'));
assert(kochMode.getClearBadgeHtml({ highest: 'standard' }).includes('tier-standard'));
assert(kochMode.getClearBadgeHtml({ highest: 'quick' }).includes('tier-quick'));

console.log('  ✓ UI helper functions verified!');

console.log('\n====================================================');
console.log('ALL KOCH CLEAR TIERS TESTS PASSED!');
console.log('====================================================');
