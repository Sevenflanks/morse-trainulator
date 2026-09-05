/**
 * TEST SUITE: test_straight_key_gap_timing.js
 * 驗證直鍵模式下「第二個音按下時立即停止結算計時，防止按長音時被提前斷字」
 */
const assert = require('assert');
const path = require('path');

// 1. Mock requestAnimationFrame & cancelAnimationFrame
let nextFrameId = 1;
const activeCallbacks = new Map();

global.requestAnimationFrame = (cb) => {
  const id = nextFrameId++;
  activeCallbacks.set(id, cb);
  return id;
};

global.cancelAnimationFrame = (id) => {
  activeCallbacks.delete(id);
};

// 2. Mock DOM Elements
class MockElement {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.textContent = '';
    this.classList = {
      add: () => {},
      remove: () => {},
      contains: () => false
    };
  }
}

const domElements = new Map();
function getEl(id) {
  if (!domElements.has(id)) {
    domElements.set(id, new MockElement(id));
  }
  return domElements.get(id);
}

global.document = {
  getElementById: (id) => getEl(id),
  querySelectorAll: () => []
};

// 3. Load Modules
const { MorseEngine } = require(path.resolve(process.cwd(), 'js/core/morse-engine.js'));
const engine = new MorseEngine({
  unitT: 80,
  threshold: 160,
  letterGap: 240,
  wordGap: 560
});

global.window = {
  engine,
  gapAnimFrame: null,
  finalizeLetter: null,
  updateCharCursor: () => {},
  renderCommittedText: () => engine.committedLetters.join('')
};

const meterController = require(path.resolve(process.cwd(), 'js/ui/meter-controller.js'));
const { startGapCountdown, stopGapCountdown } = meterController;

let finalizeCount = 0;
let finalizedResults = [];
global.window.finalizeLetter = () => {
  if (engine.isKeyDown) return;
  const res = engine.commitCurrentSequence();
  if (res) {
    finalizeCount++;
    finalizedResults.push(res);
  }
};

console.log('--- Testing Straight Key Gap Countdown Cancellation ---');

let simulatedTime = 1000;
global.performance = {
  now: () => simulatedTime
};

// Step 1: User presses Dit '.' (80ms)
engine.pressStart(simulatedTime);
simulatedTime += 80;
const res1 = engine.pressEnd(simulatedTime);
assert.strictEqual(res1.symbol, '.', 'Tone 1 is Dit');
assert.strictEqual(engine.currentSequence, '.', 'Current sequence is .');

// Tone 1 ended, start gap countdown!
startGapCountdown();
assert.ok(activeCallbacks.size > 0, 'Animation frame registered for gap countdown');

// Step 2: Gap countdown is ticking (100ms passed since release)
simulatedTime += 100;
// Trigger the rAF callback (consuming the previous frame ID as browsers do)
const [firstFrameId, frameCallback] = Array.from(activeCallbacks.entries())[0];
activeCallbacks.delete(firstFrameId);
frameCallback(); // Ticks at elapsed = 100ms (< letterGap 240ms), schedules new frame
assert.strictEqual(finalizeCount, 0, 'Should not finalize before letterGap');

// Step 3: User presses DOWN for Dah '-' (second tone)
// This is the critical moment: handleKeyDown must stop the gap countdown!
stopGapCountdown();
engine.pressStart(simulatedTime);
assert.strictEqual(activeCallbacks.size, 0, 'activeCallbacks must be empty after stopGapCountdown!');
assert.strictEqual(window.gapAnimFrame, null, 'window.gapAnimFrame must be null');

// Step 4: Time elapses 240ms while holding Dah down!
// (Total elapsed since Tone 1 release would have been 100 + 240 = 340ms > 240ms letterGap!)
simulatedTime += 240;

// Even if any dangling callback or check attempts to finalize:
// A) activeCallbacks is 0, so rAF won't tick
// B) engine.isKeyDown is true, so finalizeLetter() and commitCurrentSequence() refuse to commit
assert.strictEqual(finalizeCount, 0, 'Letter MUST NOT be finalized while user is holding key down for Dah!');
assert.strictEqual(engine.currentSequence, '.', 'Sequence must NOT be cleared mid-key-press!');

// Step 5: User releases Dah!
const res2 = engine.pressEnd(simulatedTime);
assert.strictEqual(res2.symbol, '-', 'Tone 2 is Dah');
assert.strictEqual(engine.currentSequence, '.-', 'Sequence is successfully built as .- (A)');

// Gap countdown starts freshly for letter settlement
startGapCountdown();
assert.ok(activeCallbacks.size > 0, 'New gap countdown started');

// Step 6: 250ms of silence passes (> letterGap 240ms)
simulatedTime += 250;
const secondFrameCallback = Array.from(activeCallbacks.values())[0];
secondFrameCallback(); // Ticks at elapsed = 250ms >= letterGap

assert.strictEqual(finalizeCount, 1, 'Finalize should trigger exactly once');
assert.strictEqual(finalizedResults[0].letter, 'A', 'Committed letter must be A (.-), NOT split into E and T!');
assert.strictEqual(engine.committedLetters[0], 'A', 'engine.committedLetters has A');

console.log('   -> Straight key timing test passed with 100% accuracy!');
console.log('   -> Verified: No premature settlement during Dah key-press!');

console.log('\n========================================');
console.log('All Straight Key Settlement Tests Passed (Exit 0)!');
console.log('========================================');

