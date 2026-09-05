/**
 * TEST SUITE: test_realtime_wpm.js
 * 驗證即時 WPM (Real-time Words Per Minute) 計算與 UI 元素連動
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('--- Testing Real-time WPM Calculation & UI Synchronization ---');

// 1. Load MorseEngine
const { MorseEngine } = require(path.resolve(process.cwd(), 'js/core/morse-engine.js'));

// Test A: Baseline WPM
console.log('1. Testing MorseEngine.getBaselineWpm()...');
const engine15 = new MorseEngine({ unitT: 80 });
assert.strictEqual(engine15.getBaselineWpm(), 15, '80ms should yield 15 WPM');

const engine5 = new MorseEngine({ unitT: 240 });
assert.strictEqual(engine5.getBaselineWpm(), 5, '240ms should yield 5 WPM');

const engine10 = new MorseEngine({ unitT: 120 });
assert.strictEqual(engine10.getBaselineWpm(), 10, '120ms should yield 10 WPM');

const engine20 = new MorseEngine({ unitT: 60 });
assert.strictEqual(engine20.getBaselineWpm(), 20, '60ms should yield 20 WPM');

const engine50 = new MorseEngine({ unitT: 24 });
assert.strictEqual(engine50.getBaselineWpm(), 50, '24ms should yield 50 WPM');

// Test Farnsworth Baseline
const engineFarnsworth = new MorseEngine({ unitT: 120, farnsworthEnabled: true, charWpm: 18 });
assert.strictEqual(engineFarnsworth.getBaselineWpm(), 18, 'Farnsworth enabled should report charWpm (18 WPM)');

// Test B: Stroke WPM calculation (PARIS standard)
console.log('2. Testing MorseEngine.calculateStrokeWpm()...');
const engine = new MorseEngine({ unitT: 80, threshold: 160 });

// Dits (< threshold 160ms)
assert.strictEqual(engine.calculateStrokeWpm(80), 15, '80ms dit = 15 WPM');
assert.strictEqual(engine.calculateStrokeWpm(60), 20, '60ms dit = 20 WPM');
assert.strictEqual(engine.calculateStrokeWpm(120), 10, '120ms dit = 10 WPM');

// Dahs (>= threshold 160ms)
assert.strictEqual(engine.calculateStrokeWpm(240), 15, '240ms dah = 15 WPM');
assert.strictEqual(engine.calculateStrokeWpm(180), 20, '180ms dah = 20 WPM');
assert.strictEqual(engine.calculateStrokeWpm(360), 10, '360ms dah = 10 WPM');

// Edge clamping
assert.strictEqual(engine.calculateStrokeWpm(0), 15, '0 duration falls back to baseline');
assert.strictEqual(engine.calculateStrokeWpm(5), 99, 'Ultra fast clamped to 99 WPM max');

// Test C: Rolling WPM with weighted elements
console.log('3. Testing Rolling WPM with weighted elements...');
engine.resetStrokeHistory();
// Send "S" (...) at 15 WPM: 80ms, 80ms, 80ms
engine.recordStroke(80, '.');
engine.recordStroke(80, '.');
engine.recordStroke(80, '.');
assert.strictEqual(engine.getRollingWpm(), 15, '3 dits of 80ms should yield rolling 15 WPM');

// Send "O" (---) at 15 WPM: 240ms, 240ms, 240ms
engine.resetStrokeHistory();
engine.recordStroke(240, '-');
engine.recordStroke(240, '-');
engine.recordStroke(240, '-');
assert.strictEqual(engine.getRollingWpm(), 15, '3 dahs of 240ms should yield rolling 15 WPM');

// Mixed "K" (-.-) at 20 WPM: 180ms dah (3 units), 60ms dit (1 unit), 180ms dah (3 units)
// Total duration = 420ms, Total units = 7, avgT = 60ms -> 1200 / 60 = 20 WPM
engine.resetStrokeHistory();
engine.recordStroke(180, '-');
engine.recordStroke(60, '.');
engine.recordStroke(180, '-');
assert.strictEqual(engine.getRollingWpm(), 20, 'K at 20 WPM should yield rolling 20 WPM');

// Test D: HTML presence in index.html and prototype_morse_card.html
console.log('4. Testing HTML element existence...');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const protoHtml = fs.readFileSync('prototype_morse_card.html', 'utf8');

const requiredElements = [
  'id="meter-wpm-badge"',
  'id="readout-wpm"',
  'id="state-wpm"'
];

requiredElements.forEach(elem => {
  assert.ok(indexHtml.includes(elem), `index.html must contain ${elem}`);
  assert.ok(protoHtml.includes(elem), `prototype_morse_card.html must contain ${elem}`);
});

console.log('   -> All Real-time WPM tests PASSED!');
