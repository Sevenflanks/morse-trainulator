/**
 * TEST SUITE: test_rx_instant_submit_and_latency_metrics.js
 * 驗證科赫盲聽按下答案即送出 (免按 Enter) 與測驗結算中位數、25% Low 遲疑反射指標
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Synchronization)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const { RxStatsManager } = require(path.join(projectRoot, 'js/core/rx-stats-manager.js'));
const { RxMode } = require(path.join(projectRoot, 'js/ui/rx-mode.js'));
const { generateKochRxTargets, generateCallsign } = require(path.join(projectRoot, 'js/core/morse-data.js'));

global.generateKochRxTargets = generateKochRxTargets;
global.generateCallsign = generateCallsign;

console.log('=== Running Instant Submit & Latency Metrics Tests ===\n');

class MockCWPlayer {
  constructor() {
    this.isPlaying = false;
    this.charWpm = 20;
    this.listeners = {};
  }
  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  emit(event, ...args) {
    if (this.listeners[event]) this.listeners[event].forEach(fn => fn(...args));
  }
  playText(txt) {
    this.isPlaying = true;
    this.emit('playbackStart', txt);
  }
  stop() {
    this.isPlaying = false;
    this.emit('playbackAbort');
  }
}

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(k) { return this.store[k] || null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

// 1. 科赫盲聽 (Koch Rx) 按下答案即送出 (無需按 Enter)
console.log('1. Verifying Instant Submit in Koch Rx submode...');
const player = new MockCWPlayer();
const rx = new RxMode({ cwPlayer: player, submode: 'koch' });
rx.autoAdvance = false;
rx.startSession('koch', ['M', 'K']);

assert.strictEqual(rx.state, 'READY');
rx.startAudio();
assert.strictEqual(rx.state, 'PLAYING');

// Simulate pressing 'M' while audio is playing (early recognition)
rx.now = () => 1200;
rx.handleKey('M');

assert.strictEqual(rx.inputBuffer, 'M');
assert.strictEqual(rx.state, 'EVALUATED', 'Koch Rx must immediately evaluate on character keypress without Enter');
assert.strictEqual(rx.currentTrial.isCorrect, true);
assert.strictEqual(rx.trials.length, 1);
console.log('   -> Instant submit on keypress verified for Koch Rx!');

// 2. 多字元題型 (Callsign / Groups) 需按 Enter 送出
console.log('\n2. Verifying Multi-character submodes require Enter...');
const rxCallsign = new RxMode({ cwPlayer: player, submode: 'callsign' });
rxCallsign.autoAdvance = false;
rxCallsign.startSession('callsign', ['BV2AB']);
rxCallsign.startAudio();
rxCallsign.stopAudio();
assert.strictEqual(rxCallsign.state, 'WAITING_INPUT');

rxCallsign.handleKey('B');
assert.strictEqual(rxCallsign.state, 'WAITING_INPUT', 'Callsign should NOT auto-submit on single char');
rxCallsign.handleKey('V');
assert.strictEqual(rxCallsign.inputBuffer, 'BV');
assert.strictEqual(rxCallsign.state, 'WAITING_INPUT');

rxCallsign.handleKey('Enter');
assert.strictEqual(rxCallsign.state, 'EVALUATED', 'Callsign should evaluate upon Enter');
assert.strictEqual(rxCallsign.currentTrial.userInput, 'BV');
console.log('   -> Multi-character submodes preserve buffer and require Enter!');

// 3. 反射延遲中位數 (Median) 與 25% Low (遲疑反射) 統計演算法
console.log('\n3. Verifying Median Latency and 25% Low calculation...');
const rxStats = new RxMode({ cwPlayer: player, submode: 'koch' });
const mockDom = {
  scorecard: { style: { display: 'none' } },
  scModeTag: { textContent: '', innerHTML: '' },
  scAccuracy: { textContent: '', style: {} },
  scWpm: { textContent: '' },
  scLatency: { textContent: '' },
  scMedianLatency: { textContent: '' },
  scLow25Latency: { textContent: '' },
  scTotal: { textContent: '' }
};
rxStats.el = mockDom;

// Case A: 10 trials with known sorted latencies
// [200, 220, 240, 260, 280, 300, 320, 360, 480, 600]
// Mean = 3260 / 10 = 326 ms
// Median (even, average of 280 & 300) = 290 ms
// 25% Low (count = round(10 * 0.25) = 3 slowest: 360, 480, 600) -> (360+480+600)/3 = 480 ms
const testLatencies10 = [200, 220, 240, 260, 280, 300, 320, 360, 480, 600];
rxStats.trials = testLatencies10.map((lat, idx) => ({
  target: 'K',
  userInput: 'K',
  isCorrect: true,
  reflexLatency: lat
}));

rxStats.completeSession();

assert.strictEqual(mockDom.scLatency.textContent, '326 ms', 'Average latency must be 326 ms');
assert.strictEqual(mockDom.scMedianLatency.textContent, '290 ms', 'Median latency must be 290 ms');
assert.strictEqual(mockDom.scLow25Latency.textContent, '480 ms', '25% Low latency must be 480 ms');
console.log('   -> Case A (10 trials): Mean 326ms, Median 290ms, 25% Low 480ms verified!');

// Case B: 5 trials (Odd count)
// [200, 250, 300, 400, 500]
// Mean = 1650 / 5 = 330 ms
// Median = 300 ms (middle)
// 25% Low (count = round(5 * 0.25) = 1 slowest: 500) = 500 ms
const testLatencies5 = [200, 250, 300, 400, 500];
rxStats.trials = testLatencies5.map(lat => ({
  target: 'M',
  userInput: 'M',
  isCorrect: true,
  reflexLatency: lat
}));

rxStats.completeSession();

assert.strictEqual(mockDom.scLatency.textContent, '330 ms');
assert.strictEqual(mockDom.scMedianLatency.textContent, '300 ms');
assert.strictEqual(mockDom.scLow25Latency.textContent, '500 ms');
console.log('   -> Case B (5 trials): Mean 330ms, Median 300ms, 25% Low 500ms verified!');

// Case C: 1 trial edge case
rxStats.trials = [{ target: 'A', userInput: 'A', isCorrect: true, reflexLatency: 275 }];
rxStats.completeSession();
assert.strictEqual(mockDom.scLatency.textContent, '275 ms');
assert.strictEqual(mockDom.scMedianLatency.textContent, '275 ms');
assert.strictEqual(mockDom.scLow25Latency.textContent, '275 ms');
console.log('   -> Case C (1 trial): All metrics equal 275ms verified!');

// Case D: 0 answered trials (all 0 latency)
rxStats.trials = [{ target: 'A', userInput: '', isCorrect: false, reflexLatency: 0 }];
rxStats.completeSession();
assert.strictEqual(mockDom.scLatency.textContent, '0 ms');
assert.strictEqual(mockDom.scMedianLatency.textContent, '-- ms');
assert.strictEqual(mockDom.scLow25Latency.textContent, '-- ms');
console.log('   -> Case D (0 valid latency): Fallback placeholders verified!');

// 4. RxStatsManager 持久化儲存中位數與 25% Low
console.log('\n4. Verifying RxStatsManager persistence of medianLatency and low25Latency...');
const storage = new MockStorage();
const mgr = new RxStatsManager(storage);

mgr.recordSession({
  submode: 'koch',
  charWpm: 20,
  totalTrials: 10,
  correctCount: 9,
  accuracy: 90,
  avgLatency: 326,
  medianLatency: 290,
  low25Latency: 480
});

assert.strictEqual(mgr.sessions.length, 1);
assert.strictEqual(mgr.sessions[0].medianLatency, 290);
assert.strictEqual(mgr.sessions[0].low25Latency, 480);

// Verify re-load from storage
const mgr2 = new RxStatsManager(storage);
assert.strictEqual(mgr2.sessions[0].medianLatency, 290);
assert.strictEqual(mgr2.sessions[0].low25Latency, 480);
console.log('   -> Persistence across instances verified!');

// 5. 雙軌架構鏡像檢查 (Dual-Track HTML Synchronization)
console.log('\n5. Verifying Dual-Track HTML elements for median and 25% Low...');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');

assert.ok(indexHtml.includes('id="rx-sc-median-latency"'), 'index.html must contain id="rx-sc-median-latency"');
assert.ok(protoHtml.includes('id="rx-sc-median-latency"'), 'prototype_morse_card.html must contain id="rx-sc-median-latency"');
assert.ok(indexHtml.includes('id="rx-sc-low25-latency"'), 'index.html must contain id="rx-sc-low25-latency"');
assert.ok(protoHtml.includes('id="rx-sc-low25-latency"'), 'prototype_morse_card.html must contain id="rx-sc-low25-latency"');
assert.ok(indexHtml.includes('反射中位數'), 'index.html must display label 反射中位數');
assert.ok(protoHtml.includes('反射中位數'), 'prototype_morse_card.html must display label 反射中位數');
assert.ok(indexHtml.includes('25% Low'), 'index.html must display label 25% Low');
assert.ok(protoHtml.includes('25% Low'), 'prototype_morse_card.html must display label 25% Low');
console.log('   -> Dual-track HTML elements and labels verified!');

// 6. ADR 0001: 嚴格零 Emoji 檢查
console.log('\n6. Verifying ADR 0001 (Zero Unicode Emoji)...');
const rxModeSrc = fs.readFileSync(path.join(projectRoot, 'js/ui/rx-mode.js'), 'utf8');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
assert.ok(!emojiRegex.test(rxModeSrc), 'js/ui/rx-mode.js must contain 0 Unicode emojis');
assert.ok(!emojiRegex.test(indexHtml.substring(indexHtml.indexOf('id="rx-scorecard"'), indexHtml.indexOf('id="rx-sc-breakthrough-box"'))), 'Scorecard HTML must have 0 emojis');
console.log('   -> ADR 0001 Zero-Emoji verified!');

console.log('\n====================================================');
console.log('ALL INSTANT SUBMIT & LATENCY METRICS TESTS PASSED!');
console.log('====================================================');
