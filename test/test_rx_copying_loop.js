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
assert.strictEqual(rx.autoAdvance, true, 'Auto-advance should default to true');
rx.autoAdvance = false; // Disable for synchronous step-by-step assertions
assert.strictEqual(rx.currentTrialIndex, 0);
console.log('   -> Instantiation and defaults verified!');

// 2. Session Start and Target Generation (Non-autoplay, enters READY)
console.log('\n2. Verifying Session Start & Submode Target Generation...');
assert.ok(typeof rx.generateTargetForSubmode('koch') === 'string', 'Koch target must be string');
assert.ok(typeof rx.generateTargetForSubmode('callsign') === 'string', 'Callsign target must be string');
assert.strictEqual(rx.generateTargetForSubmode('groups').length, 5, 'Groups target must be 5 chars');
assert.ok(typeof rx.generateTargetForSubmode('qcodes') === 'string', 'Q-codes target must be string');

rx.startSession('koch', ['K', 'M']);
assert.strictEqual(rx.totalTrials, 2, 'Custom queue should set total trials');
assert.strictEqual(rx.state, 'READY', 'Starting session should move state to READY (not auto-playing)');
assert.strictEqual(rx.currentTrial.target, 'K', 'First target should be K');
assert.strictEqual(player.isPlaying, false, 'CWPlayer must not auto-play on session start');
console.log('   -> Session start and READY state verified (Non-autoplay)!');

// 3. Audio Transport Controls (Start, Stop, Replay, Audio Completion)
console.log('\n3. Verifying Audio Transport Controls (Start, Stop, Replay, Audio Completion)...');
rx.startAudio();
assert.strictEqual(rx.state, 'PLAYING', 'startAudio should move state to PLAYING');
assert.strictEqual(player.playedText, 'K', 'CWPlayer should play target K');
assert.strictEqual(player.isPlaying, true, 'CWPlayer should be playing');

// Test Stop
rx.stopAudio();
assert.strictEqual(rx.state, 'WAITING_INPUT', 'stopAudio should move state to WAITING_INPUT');
assert.strictEqual(player.isPlaying, false, 'CWPlayer should stop playing');

// Test Replay
rx.replayAudio();
assert.strictEqual(rx.state, 'PLAYING', 'replayAudio should move state back to PLAYING');

// Complete playback
player.complete();
assert.strictEqual(rx.state, 'WAITING_INPUT', 'State should transition to WAITING_INPUT on playbackComplete');
assert.ok(rx.currentTrial.audioEndTime > 0, 'audioEndTime must be recorded');
console.log('   -> Audio transport controls and WAITING_INPUT transition verified!');

// 4. Keystroke Handling, Instant Submit & Reflex Latency
console.log('\n4. Verifying Keystroke Handling, Instant Submit & Reflex Latency...');
rx.currentTrial.audioEndTime = 1000;
// Simulate key press at timestamp 1350ms
rx.now = () => 1350;
rx.handleKey('K');

// In Koch Rx mode (科赫盲聽), pressing an answer immediately submits without Enter!
assert.strictEqual(rx.inputBuffer, 'K', 'Input buffer should record key K');
assert.strictEqual(rx.currentTrial.firstKeyTime, 1350, 'firstKeyTime should be recorded on first key');
assert.strictEqual(rx.state, 'EVALUATED', 'State should become EVALUATED immediately on keypress without enter');
assert.strictEqual(rx.currentTrial.isCorrect, true, 'K should be marked correct');
assert.strictEqual(rx.currentTrial.reflexLatency, 350, 'Reflex latency should be 1350 - 1000 = 350 ms');
assert.strictEqual(rx.trials.length, 1, 'Trials array should contain 1 completed trial');
console.log('   -> Instant submit without enter verified for Koch Rx mode!');

// Multi-character submode: verify input buffer and Backspace
const rxMulti = new RxMode({ submode: 'callsign' });
rxMulti.state = 'WAITING_INPUT';
rxMulti.currentTrial = { target: 'BV2AB', confusions: [] };
rxMulti.handleKey('B');
rxMulti.handleKey('V');
assert.strictEqual(rxMulti.inputBuffer, 'BV', 'Multi-char submode should buffer letters');
rxMulti.handleKey('Backspace');
assert.strictEqual(rxMulti.inputBuffer, 'B', 'Backspace should delete last char in multi-char submode');
console.log('   -> Multi-char buffering and Backspace verified!');

// 5. Advance To Next Trial & Acoustic Confusion Matrix Tracking
console.log('\n5. Verifying Advance To Next Trial & Confusion Matrix on Error...');
// Advance to next trial (Trial 2: 'M')
rx.advanceToNextTrial();
assert.strictEqual(rx.currentTrial.target, 'M');
assert.strictEqual(rx.state, 'PLAYING', 'advanceToNextTrial should start playing audio for next trial');
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

// 7. Koch Stage Integration & Progression Controls
console.log('\n7. Verifying Koch Stage Integration & Progression Controls...');
class MockKochManager {
  constructor() {
    this.currentLevel = 1;
    this.maxUnlockedLevel = 1;
    this.clears = {};
  }
  getUnlockedPool(lvl = this.currentLevel) {
    const seq = ['K', 'M', 'R', 'S', 'U', 'A', 'P'];
    return seq.slice(0, lvl + 1);
  }
  getTargetChar(lvl = this.currentLevel) {
    const seq = ['K', 'M', 'R', 'S', 'U', 'A', 'P'];
    return seq[lvl] || 'K';
  }
  recordClear(stage, mode, acc) {
    this.clears[stage] = { mode, acc };
  }
  saveProgress() {}
}

const mockKm = new MockKochManager();
const rxKoch = new RxMode({ cwPlayer: player, kochManager: mockKm, submode: 'koch' });
assert.strictEqual(rxKoch.getKochManager(), mockKm, 'rxKoch should return assigned kochManager');

// Level switching
rxKoch.setKochLevel(1);
assert.strictEqual(mockKm.currentLevel, 1);
assert.strictEqual(rxKoch.generateTargetForSubmode('koch').length, 1, 'Stage 1 target should be 1 char');

// Advance level
rxKoch.advanceToNextStage();
assert.strictEqual(mockKm.currentLevel, 2, 'advanceToNextStage should move currentLevel to 2');
assert.strictEqual(mockKm.maxUnlockedLevel, 2, 'advanceToNextStage should unlock level 2');

// Test stage advance button setup in completeSession on 90%+ pass
rxKoch.submode = 'koch';
rxKoch.trials = [
  { isCorrect: true, reflexLatency: 200 },
  { isCorrect: true, reflexLatency: 210 }
]; // 100% accuracy
const mockAdvanceBtn = { style: {}, innerHTML: '' };
rxKoch.el = { btnStageAdvance: mockAdvanceBtn };
rxKoch.completeSession();
assert.strictEqual(mockAdvanceBtn.style.display, 'inline-flex', 'btnStageAdvance must be shown on >=90% accuracy in Koch submode');
assert.ok(mockAdvanceBtn.innerHTML.includes('晉級第 3 關'), 'btnStageAdvance text should show next stage');
assert.strictEqual(mockKm.clears[2].acc, 100, 'recordClear should record 100% clear for stage 2');
console.log('   -> Koch Stage integration, level switching & advance button verified!');

// 8. Zero Emoji Check on rx-mode.js
console.log('\n8. Verifying Zero Emoji in js/ui/rx-mode.js...');
const rxModeSrc = fs.readFileSync(path.join(projectRoot, 'js/ui/rx-mode.js'), 'utf8');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
assert.ok(!emojiRegex.test(rxModeSrc), 'js/ui/rx-mode.js must contain 0 Unicode emojis');
console.log('   -> js/ui/rx-mode.js has 0 emojis!');

// 9. Dual-Track Inclusion
console.log('\n9. Verifying Dual-Track inclusion of RxMode...');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
assert.ok(indexHtml.includes('js/ui/rx-mode.js'), 'index.html must reference js/ui/rx-mode.js');
assert.ok(protoHtml.includes('class RxMode'), 'prototype_morse_card.html must embed class RxMode');
assert.ok(protoHtml.includes('window.rxMode = rxMode'), 'prototype_morse_card.html must instantiate rxMode');
console.log('   -> Dual-track inclusion verified!');

// 10. Blind Mode Oscilloscope & Ribbon Concealment Verification
console.log('\n10. Verifying Blind Mode Oscilloscope & Ribbon Concealment...');
let pulseStartCalls = 0;
let pulseEndCalls = 0;
global.window = {
  ribbon: {
    startPulse: () => { pulseStartCalls++; },
    endPulse: () => { pulseEndCalls++; }
  }
};
global.performance = { now: () => 1000 };

const ribbonElement = {
  classList: {
    classes: new Set(),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    contains(c) { return this.classes.has(c); }
  }
};

const wsRxElement = {
  classList: {
    classes: new Set(['active']),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    toggle(c, force) { if (force) this.classes.add(c); else this.classes.delete(c); },
    contains(c) { return this.classes.has(c); }
  },
  style: { display: 'flex' }
};

global.document = {
  getElementById: (id) => {
    if (id === 'cockpit-top-ribbon') return ribbonElement;
    if (id === 'ws-container-rx') return wsRxElement;
    return null;
  },
  querySelector: (sel) => {
    if (sel === '.pcb-card') return { classList: { remove: () => {} } };
    return null;
  }
};

const testPlayer = new MockCWPlayer();
const rxBlindTest = new RxMode({ cwPlayer: testPlayer });
rxBlindTest.el = { wsContainer: wsRxElement };
rxBlindTest.attachPlayerHooks(testPlayer);

// In blind mode: pulses should be suppressed
rxBlindTest.blindMode = true;
testPlayer.emit('pulseStart', '.');
testPlayer.emit('pulseEnd', '.');
assert.strictEqual(pulseStartCalls, 0, 'Pulses must NOT be emitted to ribbon when blindMode is true');
assert.strictEqual(pulseEndCalls, 0, 'Pulses must NOT be emitted to ribbon when blindMode is true');

// In visual mode (blindMode = false): pulses should pass through
rxBlindTest.blindMode = false;
testPlayer.emit('pulseStart', '-');
testPlayer.emit('pulseEnd', '-');
assert.strictEqual(pulseStartCalls, 1, 'Pulses should be emitted when blindMode is false');
assert.strictEqual(pulseEndCalls, 1, 'Pulses should be emitted when blindMode is false');

// Verify updateBlindMode toggles ribbon-blind-mode class
rxBlindTest.updateBlindMode(true);
assert.ok(ribbonElement.classList.contains('ribbon-blind-mode'), 'Ribbon must have ribbon-blind-mode class when blindMode is enabled');

rxBlindTest.updateBlindMode(false);
assert.ok(!ribbonElement.classList.contains('ribbon-blind-mode'), 'Ribbon must NOT have ribbon-blind-mode class when blindMode is disabled');

// Verify onLeaveRx removes ribbon-blind-mode
ribbonElement.classList.add('ribbon-blind-mode');
rxBlindTest.onLeaveRx();
assert.ok(!ribbonElement.classList.contains('ribbon-blind-mode'), 'onLeaveRx must clear ribbon-blind-mode class');

console.log('   -> Blind mode oscilloscope and ribbon concealment verified!');

console.log('\n====================================================');
console.log('ALL RX COPYING LOOP & SCORECARD TESTS PASSED!');
console.log('====================================================\n');
