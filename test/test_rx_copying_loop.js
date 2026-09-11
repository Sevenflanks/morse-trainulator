/**
 * TEST SUITE: test_rx_copying_loop.js
 * 驗證 Rx 聽力抄收核心循環、即時比對與結算記分板 (Issue #33)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Rx Copying Loop & Scorecard Tests (Issue #33) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const { RxMode } = require(path.join(projectRoot, 'js/ui/rx-mode.js'));
const { generateKochRxTargets, generateCallsign, generateCodeGroup, generateQSignalOrAbbreviation } = require(path.join(projectRoot, 'js/core/morse-data.js'));

// Global mock setup
global.generateKochRxTargets = generateKochRxTargets;
global.generateCallsign = generateCallsign;
global.generateCodeGroup = generateCodeGroup;
global.generateQSignalOrAbbreviation = generateQSignalOrAbbreviation;

// Mock CWPlayer
class MockCWPlayer {
  constructor() {
    this.events = {};
    this.playedText = null;
    this.isPlaying = false;
    this.charWpm = 20;
  }
  on(event, cb) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(cb);
  }
  off(event, cb) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(fn => fn !== cb);
  }
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(...args));
    }
  }
  playText(text) {
    this.playedText = text;
    this.isPlaying = true;
  }
  complete() {
    this.isPlaying = false;
    this.emit('playbackComplete');
  }
  stop() {
    this.isPlaying = false;
    this.emit('playbackAbort');
  }
}

// 1. Instantiation and Defaults
console.log('1. Verifying RxMode instantiation and default state...');
const player = new MockCWPlayer();
const rx = new RxMode({ cwPlayer: player, submode: 'koch' });
assert.strictEqual(rx.state, 'IDLE', 'Initial state should be IDLE');
assert.strictEqual(rx.submode, 'koch', 'Initial submode should be koch');
assert.strictEqual(rx.blindMode, true, 'Blind mode should default to true');
assert.strictEqual(rx.currentTrialIndex, 0);
console.log('   -> Instantiation and defaults verified!');

// 2. Session Start and Target Generation
console.log('\n2. Verifying Session Start & Submode Target Generation...');
assert.ok(typeof rx.generateTargetForSubmode('koch') === 'string', 'Koch target must be string');
assert.ok(typeof rx.generateTargetForSubmode('callsign') === 'string', 'Callsign target must be string');
assert.strictEqual(rx.generateTargetForSubmode('groups').length, 5, 'Groups target must be 5 chars');
assert.ok(typeof rx.generateTargetForSubmode('qcodes') === 'string', 'Q-codes target must be string');

rx.startSession('koch', ['K', 'M']);
assert.strictEqual(rx.totalTrials, 2, 'Custom queue should set total trials');
assert.strictEqual(rx.state, 'PLAYING', 'Starting session should move state to PLAYING');
assert.strictEqual(rx.currentTrial.target, 'K', 'First target should be K');
assert.strictEqual(player.playedText, 'K', 'CWPlayer should play target K');
console.log('   -> Session start and custom target queue verified!');

// 3. Audio Playback Completion & Waiting Input State
console.log('\n3. Verifying Audio Completion and Waiting Input State...');
assert.strictEqual(rx.state, 'PLAYING');
player.complete();
assert.strictEqual(rx.state, 'WAITING_INPUT', 'State should transition to WAITING_INPUT on playbackComplete');
assert.ok(rx.currentTrial.audioEndTime > 0, 'audioEndTime must be recorded');
console.log('   -> Audio completion and WAITING_INPUT transition verified!');

// 4. Keystroke Handling, Input Buffer & Reflex Latency
console.log('\n4. Verifying Keystroke Handling, Input Buffer & Reflex Latency...');
rx.currentTrial.audioEndTime = 1000;
// Simulate key press at timestamp 1350ms
rx.now = () => 1350;
rx.handleKey('K');

assert.strictEqual(rx.inputBuffer, 'K', 'Input buffer should record key K');
assert.strictEqual(rx.currentTrial.firstKeyTime, 1350, 'firstKeyTime should be recorded on first key');

// Backspace test
rx.handleKey('A');
assert.strictEqual(rx.inputBuffer, 'KA');
rx.handleKey('Backspace');
assert.strictEqual(rx.inputBuffer, 'K', 'Backspace should delete last char');

// Submit answer
rx.submitAnswer();
assert.strictEqual(rx.state, 'EVALUATED', 'State should become EVALUATED after submit');
assert.strictEqual(rx.currentTrial.isCorrect, true, 'K should be marked correct');
assert.strictEqual(rx.currentTrial.reflexLatency, 350, 'Reflex latency should be 1350 - 1000 = 350 ms');
assert.strictEqual(rx.trials.length, 1, 'Trials array should contain 1 completed trial');
console.log('   -> Keystroke input and reflex latency calculated accurately (350 ms)!');

// 5. Acoustic Confusion Matrix Tracking
console.log('\n5. Verifying Acoustic Confusion Matrix Tracking on Error...');
// Advance to next trial (Trial 2: 'M')
rx.nextTrial();
assert.strictEqual(rx.currentTrial.target, 'M');
player.complete();
rx.currentTrial.audioEndTime = 2000;

// Type wrong letter 'O'
rx.now = () => 2420;
rx.handleKey('O');
rx.submitAnswer();

assert.strictEqual(rx.currentTrial.isCorrect, false, 'M vs O should be marked incorrect');
assert.strictEqual(rx.currentTrial.reflexLatency, 420, 'Reflex latency should be 420 ms');
assert.strictEqual(rx.confusionMatrix['M->O'], 1, 'Confusion matrix should record M->O = 1');
assert.strictEqual(rx.trials.length, 2);
console.log('   -> Confusion Matrix recorded M->O mismatch successfully!');

// 6. Session Completion & Scorecard Statistics
console.log('\n6. Verifying Session Completion & Scorecard Calculation...');
rx.completeSession();
assert.strictEqual(rx.state, 'COMPLETED', 'Session should be COMPLETED');
const correctCount = rx.trials.filter(t => t.isCorrect).length;
const accuracy = Math.round((correctCount / rx.trials.length) * 100);
assert.strictEqual(accuracy, 50, 'Accuracy should be 50% (1 correct, 1 wrong)');

// Retry errors
let retryStarted = false;
rx.startSession = (mode, targets) => {
  assert.deepStrictEqual(targets, ['M'], 'Retry should only pass error target M');
  retryStarted = true;
};
rx.retryErrors();
assert.ok(retryStarted, 'retryErrors should trigger startSession with error targets');
console.log('   -> Scorecard calculation and Retry Errors verified!');

// 7. Zero Emoji Check on rx-mode.js
console.log('\n7. Verifying Zero Emoji in js/ui/rx-mode.js...');
const rxModeSrc = fs.readFileSync(path.join(projectRoot, 'js/ui/rx-mode.js'), 'utf8');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
assert.ok(!emojiRegex.test(rxModeSrc), 'js/ui/rx-mode.js must contain 0 Unicode emojis');
console.log('   -> js/ui/rx-mode.js has 0 emojis!');

// 8. Dual-Track Inclusion
console.log('\n8. Verifying Dual-Track inclusion of RxMode...');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
assert.ok(indexHtml.includes('js/ui/rx-mode.js'), 'index.html must reference js/ui/rx-mode.js');
assert.ok(protoHtml.includes('class RxMode'), 'prototype_morse_card.html must embed class RxMode');
assert.ok(protoHtml.includes('window.rxMode = rxMode'), 'prototype_morse_card.html must instantiate rxMode');
console.log('   -> Dual-track inclusion verified!');

console.log('\n====================================================');
console.log('ALL RX COPYING LOOP & SCORECARD TESTS PASSED!');
console.log('====================================================\n');
