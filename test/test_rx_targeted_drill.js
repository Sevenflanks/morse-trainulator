/**
 * TEST SUITE: test_rx_targeted_drill.js
 * 驗證針對性弱點對抗出題引擎、動態降權狀態機、一鍵特訓工作流與雙軌結構
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Architecture)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- [Test: Rx Targeted Weakness Drill & Demotion Engine] ---');

// 1. Test generateWeaknessTargets generator in morse-data.js
const { generateWeaknessTargets } = require('../js/core/morse-data.js');
assert.strictEqual(typeof generateWeaknessTargets, 'function', 'generateWeaknessTargets must be exported');

// Generate 10 trials for pair B and D
const targets10 = generateWeaknessTargets(['B', 'D'], 10);
assert.strictEqual(targets10.length, 10, 'Should generate exactly 10 targets');

const targetCharsCount = targets10.filter(c => c === 'B' || c === 'D').length;
assert.ok(targetCharsCount >= 6, `At least 60% must be B or D, got ${targetCharsCount}/10`);

// Generate with string format 'B->D'
const targetsStr = generateWeaknessTargets('B->D', 10);
assert.strictEqual(targetsStr.length, 10);
const strTargetCount = targetsStr.filter(c => c === 'B' || c === 'D').length;
assert.ok(strTargetCount >= 6, `At least 60% must be B or D with string format, got ${strTargetCount}/10`);

// Generate 20 trials
const targets20 = generateWeaknessTargets(['S', 'H'], 20);
assert.strictEqual(targets20.length, 20);
const shCount = targets20.filter(c => c === 'S' || c === 'H').length;
assert.ok(shCount >= 12, `At least 60% must be S or H, got ${shCount}/20`);

console.log('✓ generateWeaknessTargets distribution tests passed.');

// 2. Test RxStatsManager.demoteConfusion
class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] || null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

const { RxStatsManager } = require('../js/core/rx-stats-manager.js');
const storage = new MockStorage();
const stats = new RxStatsManager(storage);

// Seed confusion data
stats.recordSession({
  submode: 'koch',
  confusions: [
    { expected: 'B', actual: 'D', count: 6 },
    { expected: 'S', actual: 'H', count: 2 }
  ]
});

let top = stats.getTopConfusions();
assert.strictEqual(top[0].pair, 'B->D');
assert.strictEqual(top[0].count, 6);

// Demote B->D (first breakthrough)
const res1 = stats.demoteConfusion('B->D');
assert.strictEqual(res1.pairKey, 'B->D');
assert.ok(res1.newCount < 6, 'Count should be reduced');
assert.strictEqual(res1.newCount, 3, 'Count should be halved or reduced by at least half');

// Demote again
const res2 = stats.demoteConfusion('B->D');
assert.ok(res2.newCount < 3);

// Demote until resolved
const res3 = stats.demoteConfusion('B->D');
assert.strictEqual(res3.resolved, true, 'Should be marked as resolved when count reaches 0');
assert.strictEqual(stats.getTopConfusions().filter(p => p.pair === 'B->D').length, 0, 'B->D should be removed from confusions');

console.log('✓ RxStatsManager.demoteConfusion passed.');

// 3. Test Dual-track Sync & No Emojis
console.log('--- [Test: Dual-track Verification for Targeted Drill] ---');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(__dirname, '../prototype_morse_card.html'), 'utf8');
const rxDataJs = fs.readFileSync(path.join(__dirname, '../js/core/morse-data.js'), 'utf8');
const rxStatsJs = fs.readFileSync(path.join(__dirname, '../js/core/rx-stats-manager.js'), 'utf8');
const rxModeJs = fs.readFileSync(path.join(__dirname, '../js/ui/rx-mode.js'), 'utf8');
const rxCss = fs.readFileSync(path.join(__dirname, '../css/rx-mode.css'), 'utf8');

// Ensure generateWeaknessTargets in both
assert.ok(rxDataJs.includes('generateWeaknessTargets'), 'js/core/morse-data.js must contain generateWeaknessTargets');
assert.ok(protoHtml.includes('generateWeaknessTargets'), 'prototype_morse_card.html must contain generateWeaknessTargets');

// Ensure demoteConfusion in both
assert.ok(rxStatsJs.includes('demoteConfusion'), 'js/core/rx-stats-manager.js must contain demoteConfusion');
assert.ok(protoHtml.includes('demoteConfusion'), 'prototype_morse_card.html must contain demoteConfusion');

// Ensure startTargetedDrill in both
assert.ok(rxModeJs.includes('startTargetedDrill'), 'js/ui/rx-mode.js must contain startTargetedDrill');
assert.ok(protoHtml.includes('startTargetedDrill'), 'prototype_morse_card.html must contain startTargetedDrill');

// Zero Emoji check
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
assert.ok(!EMOJI_REGEX.test(rxDataJs), 'morse-data.js must not contain emojis');
assert.ok(!EMOJI_REGEX.test(rxStatsJs), 'rx-stats-manager.js must not contain emojis');
assert.ok(!EMOJI_REGEX.test(rxModeJs), 'rx-mode.js must not contain emojis');
assert.ok(!EMOJI_REGEX.test(rxCss), 'rx-mode.css must not contain emojis');

console.log('✓ Dual-track and Zero-Emoji assertions passed.');

// 4. Test RxMode.startTargetedDrill and Breakthrough Workflow
console.log('--- [Test: RxMode Targeted Drill Workflow] ---');
const { RxMode } = require('../js/ui/rx-mode.js');

const mockDom = {
  scorecard: { style: { display: 'none' } },
  scModeTag: { textContent: '', innerHTML: '' },
  scAccuracy: { textContent: '', style: {} },
  scWpm: { textContent: '' },
  scLatency: { textContent: '' },
  scTotal: { textContent: '' },
  scBreakthroughBox: { style: { display: 'none' }, innerHTML: '' },
  scConfusionBox: { style: { display: 'none' } },
  scConfusionList: { innerHTML: '' },
  progressBadge: { textContent: '', innerHTML: '' },
  feedbackMsg: { innerHTML: '' },
  wsContainer: {
    classList: { contains: () => true, toggle: () => {} },
    style: { display: 'block' },
    addEventListener: () => {}
  }
};

const drillStorage = new MockStorage();
const drillStats = new RxStatsManager(drillStorage);

// Seed confusion
drillStats.recordSession({
  submode: 'koch',
  confusions: [{ expected: 'B', actual: 'D', count: 5 }]
});
assert.strictEqual(drillStats.getTopConfusions()[0].count, 5);

const rx = new RxMode({ statsManager: drillStats });
rx.el = mockDom;

// Start targeted drill for B->D
rx.startTargetedDrill('B', 'D');
assert.strictEqual(rx.submode, 'drill');
assert.deepStrictEqual(rx.drillTarget, { expected: 'B', actual: 'D', pairKey: 'B->D' });
assert.strictEqual(rx.totalTrials, 10);
assert.ok(mockDom.progressBadge.innerHTML.includes('B'));
assert.ok(mockDom.progressBadge.innerHTML.includes('D'));
assert.ok(mockDom.progressBadge.innerHTML.includes('mdi-sword-cross'));

// Simulate 10 successful trials (100% accuracy)
rx.trials = [];
for (let i = 0; i < 10; i++) {
  rx.trials.push({
    target: (i % 2 === 0) ? 'B' : 'D',
    userInput: (i % 2 === 0) ? 'B' : 'D',
    isCorrect: true,
    reflexLatency: 280
  });
}

rx.completeSession();

// Verify breakthrough box displayed and confusion demoted
assert.strictEqual(mockDom.scBreakthroughBox.style.display, 'block');
assert.ok(mockDom.scBreakthroughBox.innerHTML.includes('突破成功'));
assert.ok(mockDom.scBreakthroughBox.innerHTML.includes('mdi-trophy-variant'));
assert.ok(!EMOJI_REGEX.test(mockDom.scBreakthroughBox.innerHTML), 'Breakthrough HTML must not contain emojis');

// Verify B->D count was demoted
assert.strictEqual(drillStats.getTopConfusions()[0].count, 2, 'Confusion count should be demoted from 5 to 2');

console.log('✓ RxMode Targeted Drill E2E workflow passed.');
console.log('=== ALL TARGETED DRILL TESTS PASSED ===');

