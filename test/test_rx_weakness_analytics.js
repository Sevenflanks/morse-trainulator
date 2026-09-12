/**
 * TEST SUITE: test_rx_weakness_analytics.js
 * 驗證 RxStatsManager 全域混淆熱點分析、弱點字元統計、戰情面板與雙軌結構
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Architecture)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- [Test: Rx Confusion Profile & Weakness Analytics] ---');

// Mock localStorage
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const { RxStatsManager } = require('../js/core/rx-stats-manager.js');

const storage = new MockStorage();
const stats = new RxStatsManager(storage);

// Initial state
assert.deepStrictEqual(stats.getTopConfusions(), [], 'Top confusions should be empty initially');
assert.deepStrictEqual(stats.getWeakestCharacters(), [], 'Weakest chars should be empty initially');

// Record a session with multiple trials and confusions
stats.recordSession({
  submode: 'koch',
  charWpm: 20,
  totalTrials: 5,
  correctCount: 2,
  accuracy: 40,
  avgLatency: 350,
  confusions: [
    { expected: 'B', actual: 'D', count: 2 },
    { expected: 'S', actual: 'H', count: 1 }
  ],
  trials: [
    { target: 'B', userInput: 'D', isCorrect: false, reflexLatency: 400 },
    { target: 'B', userInput: 'D', isCorrect: false, reflexLatency: 450 },
    { target: 'B', userInput: 'B', isCorrect: true, reflexLatency: 300 },
    { target: 'S', userInput: 'H', isCorrect: false, reflexLatency: 380 },
    { target: 'S', userInput: 'S', isCorrect: true, reflexLatency: 220 }
  ]
});

let topPairs = stats.getTopConfusions();
assert.strictEqual(topPairs.length, 2, 'Should have 2 confusion pairs');
assert.strictEqual(topPairs[0].pair, 'B->D', 'Top pair should be B->D');
assert.strictEqual(topPairs[0].count, 2, 'B->D count should be 2');
assert.strictEqual(topPairs[1].pair, 'S->H', 'Second pair should be S->H');
assert.strictEqual(topPairs[1].count, 1, 'S->H count should be 1');

// Severity classification
assert.strictEqual(topPairs[1].severity, 'notice', '1 count should be notice');

// Record more B->D confusions to test critical severity
stats.recordSession({
  submode: 'callsign',
  confusions: [
    { expected: 'B', actual: 'D', count: 4 }
  ],
  trials: [
    { target: 'B', userInput: 'D', isCorrect: false, reflexLatency: 410 },
    { target: 'B', userInput: 'D', isCorrect: false, reflexLatency: 420 },
    { target: 'B', userInput: 'D', isCorrect: false, reflexLatency: 430 },
    { target: 'B', userInput: 'D', isCorrect: false, reflexLatency: 440 }
  ]
});

topPairs = stats.getTopConfusions();
assert.strictEqual(topPairs[0].pair, 'B->D', 'Top pair should still be B->D');
assert.strictEqual(topPairs[0].count, 6, 'B->D count should now be 6');
assert.strictEqual(topPairs[0].severity, 'critical', 'Count >= 5 should be critical');

// Weakest characters test
const weakest = stats.getWeakestCharacters(3);
assert.ok(weakest.length > 0, 'Should return weakest characters');
assert.strictEqual(weakest[0].char, 'B', 'B should be the weakest character');
assert.ok(weakest[0].accuracy < 50, 'B accuracy should be low');

// Persistence across instances
const stats2 = new RxStatsManager(storage);
assert.strictEqual(stats2.getTopConfusions()[0].count, 6, 'Confusion profile should persist in storage');

// Clear test
stats2.clearHistory();
assert.deepStrictEqual(stats2.getTopConfusions(), [], 'Confusions should be cleared');
assert.deepStrictEqual(stats2.getWeakestCharacters(), [], 'Weakest characters should be cleared');

console.log('✓ RxStatsManager confusion and weakness analytics unit tests passed.');

// Dual-track DOM verification
console.log('--- [Test: Dual-track Analytics Panel Verification] ---');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(__dirname, '../prototype_morse_card.html'), 'utf8');

// Analytics toggle button
assert.ok(indexHtml.includes('btn-rx-toggle-analytics'), 'index.html must contain btn-rx-toggle-analytics');
assert.ok(protoHtml.includes('btn-rx-toggle-analytics'), 'prototype_morse_card.html must contain btn-rx-toggle-analytics');

// Analytics panel
assert.ok(indexHtml.includes('rx-analytics-panel'), 'index.html must contain rx-analytics-panel');
assert.ok(protoHtml.includes('rx-analytics-panel'), 'prototype_morse_card.html must contain rx-analytics-panel');

assert.ok(indexHtml.includes('rx-top-confusions-grid'), 'index.html must contain rx-top-confusions-grid');
assert.ok(protoHtml.includes('rx-top-confusions-grid'), 'prototype_morse_card.html must contain rx-top-confusions-grid');

assert.ok(indexHtml.includes('rx-weak-chars-list'), 'index.html must contain rx-weak-chars-list');
assert.ok(protoHtml.includes('rx-weak-chars-list'), 'prototype_morse_card.html must contain rx-weak-chars-list');

assert.ok(indexHtml.includes('rx-latency-trend'), 'index.html must contain rx-latency-trend');
assert.ok(protoHtml.includes('rx-latency-trend'), 'prototype_morse_card.html must contain rx-latency-trend');

// Method presence in RxMode
const { RxMode } = require('../js/ui/rx-mode.js');
assert.strictEqual(typeof RxMode.prototype.toggleAnalyticsPanel, 'function', 'RxMode must have toggleAnalyticsPanel');
assert.strictEqual(typeof RxMode.prototype.renderAnalyticsPanel, 'function', 'RxMode must have renderAnalyticsPanel');

assert.ok(protoHtml.includes('toggleAnalyticsPanel(forceOpen'), 'prototype_morse_card.html must include toggleAnalyticsPanel');
assert.ok(protoHtml.includes('renderAnalyticsPanel()'), 'prototype_morse_card.html must include renderAnalyticsPanel');

// CSS styles
const rxCss = fs.readFileSync(path.join(__dirname, '../css/rx-mode.css'), 'utf8');
assert.ok(rxCss.includes('.rx-analytics-panel'), 'css/rx-mode.css must style .rx-analytics-panel');
assert.ok(protoHtml.includes('.rx-analytics-panel'), 'prototype_morse_card.html must style .rx-analytics-panel');
assert.ok(rxCss.includes('.rx-trend-chip'), 'css/rx-mode.css must style .rx-trend-chip');
assert.ok(protoHtml.includes('.rx-trend-chip'), 'prototype_morse_card.html must style .rx-trend-chip');

// Zero emoji
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
assert.ok(!EMOJI_REGEX.test(rxCss), 'CSS must not contain emojis');
assert.ok(!EMOJI_REGEX.test(indexHtml.substring(indexHtml.indexOf('rx-analytics-panel'))), 'Analytics HTML must not contain emojis');

console.log('✓ Dual-track DOM and CSS assertions passed.');
console.log('=== ALL WEAKNESS ANALYTICS TESTS PASSED ===');

