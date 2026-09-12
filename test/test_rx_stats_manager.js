/**
 * TEST SUITE: test_rx_stats_manager.js
 * 驗證 RxStatsManager 領域核心、歷史持久化、結算看板累計戰報與雙軌結構一致性
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Architecture)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- [Test: RxStatsManager Core & Persistence] ---');

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

// 1. Check file existence
const statsManagerPath = path.join(__dirname, '../js/core/rx-stats-manager.js');
assert.ok(fs.existsSync(statsManagerPath), 'js/core/rx-stats-manager.js must exist');

const { RxStatsManager } = require(statsManagerPath);
assert.strictEqual(typeof RxStatsManager, 'function', 'RxStatsManager must be a constructor class');

// 2. Unit tests for RxStatsManager core logic
const mockStorage = new MockStorage();
const mgr = new RxStatsManager(mockStorage);

// Initial state
assert.deepStrictEqual(mgr.getHistory(), [], 'History should be empty initially');
let summary = mgr.getSummaryStats();
assert.strictEqual(summary.totalSessions, 0, 'Total sessions should be 0');
assert.strictEqual(summary.recentAccuracy, 0, 'Recent accuracy should be 0');
assert.strictEqual(summary.recentAvgLatency, 0, 'Recent avg latency should be 0');

// Record session 1
mgr.recordSession({
  submode: 'koch',
  charWpm: 20,
  totalTrials: 10,
  correctCount: 9,
  accuracy: 90,
  avgLatency: 300,
  confusions: [{ expected: 'B', actual: 'D', count: 1 }]
});

assert.strictEqual(mgr.getHistory().length, 1, 'History length should be 1');
summary = mgr.getSummaryStats();
assert.strictEqual(summary.totalSessions, 1, 'Total sessions should be 1');
assert.strictEqual(summary.recentAccuracy, 90, 'Recent accuracy should be 90%');
assert.strictEqual(summary.recentAvgLatency, 300, 'Recent latency should be 300ms');

// Persistence test across instances
const mgr2 = new RxStatsManager(mockStorage);
assert.strictEqual(mgr2.getHistory().length, 1, 'Data should persist in storage');
assert.strictEqual(mgr2.getHistory()[0].accuracy, 90, 'Data should match persisted record');

// Record multiple sessions to test recent 5 rolling average
for (let i = 2; i <= 6; i++) {
  mgr2.recordSession({
    submode: 'callsign',
    charWpm: 20,
    totalTrials: 10,
    correctCount: 10,
    accuracy: 100,
    avgLatency: 200
  });
}

assert.strictEqual(mgr2.getHistory().length, 6, 'Should have 6 records');
summary = mgr2.getSummaryStats();
assert.strictEqual(summary.totalSessions, 6, 'Total sessions should be 6');
// Last 5 are all 100% accuracy, 200ms
assert.strictEqual(summary.recentAccuracy, 100, 'Recent 5 accuracy should be 100%');
assert.strictEqual(summary.recentAvgLatency, 200, 'Recent 5 latency should be 200ms');

// FIFO capping at 50 records
for (let i = 7; i <= 60; i++) {
  mgr2.recordSession({
    submode: 'groups',
    accuracy: 80,
    avgLatency: 250
  });
}
assert.strictEqual(mgr2.getHistory().length, 50, 'History should be capped at maxSessions (50)');

// Clear history
mgr2.clearHistory();
assert.strictEqual(mgr2.getHistory().length, 0, 'History should be empty after clear');
assert.strictEqual(mgr2.getSummaryStats().totalSessions, 0, 'Total sessions should reset to 0');
assert.strictEqual(mockStorage.getItem('morse_rx_sessions'), '[]', 'Storage should be updated to empty array');

console.log('✓ RxStatsManager pure unit tests passed.');

// 3. Dual-track HTML Structure Verification
console.log('--- [Test: Dual-track DOM Verification] ---');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(__dirname, '../prototype_morse_card.html'), 'utf8');

// Check script inclusion in index.html
assert.ok(indexHtml.includes('js/core/rx-stats-manager.js'), 'index.html must link js/core/rx-stats-manager.js');

// Check scorecard history bar in both tracks
assert.ok(indexHtml.includes('rx-sc-history-bar'), 'index.html must contain rx-sc-history-bar element');
assert.ok(protoHtml.includes('rx-sc-history-bar'), 'prototype_morse_card.html must contain rx-sc-history-bar element');

assert.ok(indexHtml.includes('btn-rx-clear-history'), 'index.html must contain btn-rx-clear-history button');
assert.ok(protoHtml.includes('btn-rx-clear-history'), 'prototype_morse_card.html must contain btn-rx-clear-history button');

assert.ok(indexHtml.includes('rx-sc-hist-count'), 'index.html must contain rx-sc-hist-count');
assert.ok(protoHtml.includes('rx-sc-hist-count'), 'prototype_morse_card.html must contain rx-sc-hist-count');

assert.ok(indexHtml.includes('rx-sc-hist-avg-acc'), 'index.html must contain rx-sc-hist-avg-acc');
assert.ok(protoHtml.includes('rx-sc-hist-avg-acc'), 'prototype_morse_card.html must contain rx-sc-hist-avg-acc');

assert.ok(indexHtml.includes('rx-sc-hist-avg-lat'), 'index.html must contain rx-sc-hist-avg-lat');
assert.ok(protoHtml.includes('rx-sc-hist-avg-lat'), 'prototype_morse_card.html must contain rx-sc-hist-avg-lat');

// 4. CSS Verification
const rxCss = fs.readFileSync(path.join(__dirname, '../css/rx-mode.css'), 'utf8');
assert.ok(rxCss.includes('.rx-sc-history-bar'), 'css/rx-mode.css must style .rx-sc-history-bar');
assert.ok(protoHtml.includes('.rx-sc-history-bar'), 'prototype_morse_card.html must style .rx-sc-history-bar');

// 5. Zero-Emoji Rule (ADR 0001)
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
assert.ok(!EMOJI_REGEX.test(rxCss), 'css/rx-mode.css must not contain emojis');

console.log('✓ Dual-track DOM and CSS assertions passed.');
console.log('=== ALL RX STATS MANAGER TESTS PASSED ===');
