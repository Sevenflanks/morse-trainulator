/**
 * Test Suite: Koch Assessment Modes (Quick, Standard, Challenge) & Reflex Timeout
 */

const assert = require('assert');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');
const { KochManager, KOCH_SEQUENCE } = require(path.join(projectRoot, 'js/core/koch-manager'));
global.KOCH_SEQUENCE = KOCH_SEQUENCE;
const {
  kochState,
  setKochAssessmentMode,
  startKochDrill,
  stopKochDrill,
  startKochSessionTiming,
  rollKochRow,
  formatTime,
  updateKochCursor,
  finalizeLetterKochMode,
  finishKochDrillSession,
  startReflexTimer,
  kochModePauseReflex,
  clearReflexTimer,
  clearKochTimers,
  handleReflexTimeout,
  checkStandardMercyRule,
  advanceToNextKochStage
} = require(path.join(projectRoot, 'js/ui/koch-mode'));

console.log('==============================================');
console.log('Running Test Suite: Koch Assessment Modes & Reflex Timeout');
console.log('==============================================');

// Mock fake DOM for node testing
function setupFakeDOM() {
  const elements = {};
  function makeEl(initialId) {
    let _id = initialId;
    let _innerHTML = '';
    const el = {
      get id() { return _id; },
      set id(val) {
        if (_id && elements[_id] === this) {
          delete elements[_id];
        }
        _id = val;
        if (val) {
          elements[val] = this;
        }
      },
      dataset: {},
      children: [],
      parent: null,
      classList: {
        classes: new Set(),
        add(...c) { c.forEach(x => this.classes.add(x)); },
        remove(...c) { c.forEach(x => this.classes.delete(x)); },
        toggle(c, force) {
          if (force !== undefined) {
            if (force) this.classes.add(c); else this.classes.delete(c);
          } else {
            if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c);
          }
        },
        contains(c) { return this.classes.has(c); }
      },
      style: {},
      get innerHTML() { return this._innerHTML || this._textContent || ''; },
      set innerHTML(val) {
        this._innerHTML = val;
        this._textContent = String(val).replace(/<[^>]+>/g, '');
        if (val === '') {
          this.children = [];
        }
      },
      get textContent() { return this._textContent !== undefined ? this._textContent : (this._innerHTML || '').replace(/<[^>]+>/g, ''); },
      set textContent(val) { this._textContent = val; },
      appendChild(child) {
        this.children = this.children || [];
        child.parent = this;
        this.children.push(child);
      },
      remove() {
        if (this.parent && this.parent.children) {
          this.parent.children = this.parent.children.filter(c => c !== this);
        }
        if (_id && elements[_id]) {
          delete elements[_id];
        }
      },
      scrollIntoView() {},
      addEventListener() {},
      removeEventListener() {},
      click() {}
    };
    if (initialId) {
      elements[initialId] = el;
    }
    return el;
  }

  const ids = [
    'koch-cfg-quick', 'koch-cfg-standard', 'koch-cfg-challenge', 'koch-mode-desc',
    'koch-reflex-container', 'koch-reflex-bar', 'koch-drill-panel', 'koch-passage-container',
    'koch-scorecard', 'koch-sc-total', 'koch-sc-correct', 'koch-sc-errors', 'koch-sc-timeouts',
    'koch-sc-accuracy', 'koch-sc-title', 'koch-sc-mode-tag', 'koch-sc-threshold-tag',
    'koch-sc-desc', 'btn-koch-retry', 'btn-koch-next-stage', 'eval-status', 'koch-progress-badge',
    'koch-fb-target', 'koch-fb-input', 'koch-fb-result', 'koch-stage-badge', 'koch-mastery-text',
    'koch-mastery-bar', 'koch-stage1-card', 'koch-standard-card', 'koch-target-char',
    'koch-target-seq', 'koch-pool-text', 'koch-pool-stage1', 'koch-stage-select',
    'btn-start-koch-drill', 'btn-stop-koch-drill', 'btn-stop-koch-panel',
    'koch-setup-card', 'koch-hud-header'
  ];

  ids.forEach(id => { elements[id] = makeEl(id); });

  const bodyEl = makeEl('body');
  global.document = {
    body: bodyEl,
    getElementById(id) {
      if (!elements[id]) elements[id] = makeEl(id);
      return elements[id];
    },
    querySelectorAll(selector) {
      if (selector === '.koch-mode-tab') {
        return [
          { dataset: { mode: 'quick' }, classList: makeEl().classList },
          { dataset: { mode: 'standard' }, classList: makeEl().classList },
          { dataset: { mode: 'challenge' }, classList: makeEl().classList }
        ];
      }
      if (selector === '.node-group' || selector === '.number-chip') return [];
      if (selector.includes('#koch-passage-container .state-current')) {
        const res = [];
        const pc = elements['koch-passage-container'];
        if (pc && pc.children) {
          pc.children.forEach(row => {
            (row.children || []).forEach(chip => {
              if (chip.classList.contains('state-current')) res.push(chip);
            });
          });
        }
        return res;
      }
      if (selector.includes('.char-chip')) {
        const res = [];
        const pc = elements['koch-passage-container'];
        if (pc && pc.children) {
          pc.children.forEach(row => {
            (row.children || []).forEach(chip => res.push(chip));
          });
        }
        return res;
      }
      return [];
    },
    querySelector(selector) {
      if (selector === 'input[name="koch-len"]:checked') return { value: '24' };
      if (selector === 'input[name="koch-duration"]:checked') return { value: global._mockStandardDuration || '60' };
      if (selector === 'input[name="koch-duration-ch"]:checked') return { value: '180' };
      return null;
    },
    createElement(tag) {
      const el = makeEl();
      el.tagName = tag.toUpperCase();
      return el;
    }
  };

  global.window = {
    scrollTo() {},
    kochManager: null,
    engine: {
      config: {
        letterGap: 240
      },
      getSequenceForLetter(c) {
        if (c === 'K') return '-.-';
        if (c === 'M') return '--';
        if (c === 'R') return '.-.';
        return '.-';
      }
    }
  };

  global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

setupFakeDOM();

// ----------------------------------------------------
// 1. Test Koch Manager generateNextChar
// ----------------------------------------------------
console.log('--- 1. Testing generateNextChar & Distribution ---');
const km = new KochManager();
global.window.kochManager = km;
km.currentLevel = 2; // pool: K, M, R (target: R)

const history = [];
for (let i = 0; i < 100; i++) {
  const c = km.generateNextChar(history);
  history.push(c);
  if (history.length >= 3) {
    const last3 = history.slice(-3);
    assert(!(last3[0] === last3[1] && last3[1] === last3[2]), 'Streak of 3 identical characters detected!');
  }
}
console.log('  -> Anti-streak protection verified across 100 runs (no 3 identical in a row)!');

// ----------------------------------------------------
// 2. Test Assessment Mode Switching
// ----------------------------------------------------
console.log('--- 2. Testing Assessment Mode Switching ---');
setKochAssessmentMode('quick');
assert.strictEqual(kochState.mode, 'quick');
assert.strictEqual(document.getElementById('koch-cfg-quick').style.display, 'flex');
assert.strictEqual(document.getElementById('koch-cfg-standard').style.display, 'none');

setKochAssessmentMode('standard');
assert.strictEqual(kochState.mode, 'standard');
assert.strictEqual(document.getElementById('koch-cfg-standard').style.display, 'flex');

setKochAssessmentMode('challenge');
assert.strictEqual(kochState.mode, 'challenge');
assert.strictEqual(document.getElementById('koch-cfg-challenge').style.display, 'flex');
console.log('  -> Assessment Mode Switching passed!');

// ----------------------------------------------------
// 3. Test Quick Mode (Fixed Count: 24)
// ----------------------------------------------------
console.log('--- 3. Testing Quick Mode (Fixed Count) ---');
setKochAssessmentMode('quick');
startKochDrill();
assert.strictEqual(kochState.running, true);
assert.strictEqual(kochState.targetChars.length, 24);
assert.strictEqual(kochState.charResults.length, 24);
assert.strictEqual(document.getElementById('koch-reflex-container').style.display, 'none');

// Passage container should have 2 rows of 12 chips
const pc = document.getElementById('koch-passage-container');
assert.strictEqual(pc.children.length, 2, 'Should render 2 rows for 24 chars in quick mode');
assert.strictEqual(pc.children[0].children.length, 12, 'Row 1 should have 12 chips');
assert.strictEqual(pc.children[1].children.length, 12, 'Row 2 should have 12 chips');

// Answer 24 characters: 22 correct, 2 wrong (22/24 = 92% >= 90%)
for (let i = 0; i < 24; i++) {
  const target = kochState.targetChars[i];
  const isCorrect = (i < 22);
  finalizeLetterKochMode({
    isValid: true,
    letter: isCorrect ? target : (target === 'K' ? 'M' : 'K'),
    sequence: isCorrect ? window.engine.getSequenceForLetter(target) : '--'
  });
}

assert.strictEqual(kochState.isFinished, true);
assert.strictEqual(document.getElementById('koch-scorecard').style.display, 'block');
assert.strictEqual(document.getElementById('koch-sc-total').textContent, 24);
assert.strictEqual(document.getElementById('koch-sc-correct').textContent, 22);
assert.strictEqual(document.getElementById('koch-sc-errors').textContent, 2);
assert.strictEqual(document.getElementById('koch-sc-accuracy').textContent, '92%');
assert(document.getElementById('koch-sc-title').textContent.includes('關卡突破'));
console.log('  -> Quick mode completion and 92% pass verified!');

// ----------------------------------------------------
// 4. Test Standard Mode & Two-Row Rolling Matrix
// ----------------------------------------------------
console.log('--- 4. Testing Standard Mode & Two-Row Rolling Matrix ---');
setKochAssessmentMode('standard');
startKochDrill();
assert.strictEqual(kochState.running, true);
assert.strictEqual(document.getElementById('koch-reflex-container').style.display, 'block');
// Reflex and session timers should wait for first keystroke
assert.strictEqual(kochState.hasStarted, false, 'Should wait for first stroke before timers start');
assert.strictEqual(kochState.timerId, null, 'Countdown timer should not start before first stroke');
assert.strictEqual(kochState.reflexTimerId, null, 'Reflex timer should not start before first character');

// Keystroke starts timing
kochModePauseReflex();
assert.strictEqual(kochState.hasStarted, true, 'Timing should start upon first key action');
assert(kochState.timerId !== null, 'Countdown timer should be running');

// Verify initial two full rows (24 chips, 12 each, no empty slots)
assert.strictEqual(pc.children.length, 2, 'Initial board must have exactly 2 rows');
assert.strictEqual(pc.children[0].children.length, 12, 'Row 0 must have 12 chips');
assert.strictEqual(pc.children[1].children.length, 12, 'Row 1 must have 12 chips');
assert.strictEqual(pc.children[0].id, 'koch-row-0');
assert.strictEqual(pc.children[1].id, 'koch-row-1');
console.log('  -> Initial 2 full rows (12 + 12 = 24 chars, no blanks) verified!');

// Complete the first row (indices 0..11)
for (let i = 0; i < 12; i++) {
  const target = kochState.targetChars[i];
  finalizeLetterKochMode({
    isValid: true,
    letter: target,
    sequence: window.engine.getSequenceForLetter(target)
  });
}

// After 12th char is completed: Row 0 disappears, Row 1 moves to top, Row 2 generated below!
assert.strictEqual(pc.children.length, 2, 'Board must still have exactly 2 rows after roll');
assert.strictEqual(pc.children[0].id, 'koch-row-1', 'Row 1 must now be at the top');
assert.strictEqual(pc.children[1].id, 'koch-row-2', 'Row 2 must be generated below');
assert.strictEqual(pc.children[0].children.length, 12);
assert.strictEqual(pc.children[1].children.length, 12);
assert.strictEqual(kochState.currentIndex, 12, 'Cursor should be at index 12 (first char of new top row)');
console.log('  -> Row rolling verified: Row 0 disappeared, Row 1 shifted to top, Row 2 generated!');

// Verify Row 2 was generated with clean 'passage-row' and without 'row-rolling-in'
assert.strictEqual(pc.children[1].classList.contains('row-rolling-in'), false, 'Row 2 must not have row-rolling-in');

// Complete Row 1 (indices 12..23)
for (let i = 12; i < 24; i++) {
  const target = kochState.targetChars[i];
  finalizeLetterKochMode({
    isValid: true,
    letter: target,
    sequence: window.engine.getSequenceForLetter(target)
  });
}
// After 24th char: Row 1 removed, Row 2 shifted to top, Row 3 generated!
assert.strictEqual(pc.children.length, 2);
assert.strictEqual(pc.children[0].id, 'koch-row-2', 'Row 2 must now be at the top');
assert.strictEqual(pc.children[1].id, 'koch-row-3', 'Row 3 must be generated below');
assert.strictEqual(pc.children[0].classList.contains('row-rolling-in'), false);
assert.strictEqual(pc.children[1].classList.contains('row-rolling-in'), false);

// Complete Row 2 (indices 24..35) -> Testing row 3 transition!
for (let i = 24; i < 36; i++) {
  const target = kochState.targetChars[i];
  finalizeLetterKochMode({
    isValid: true,
    letter: target,
    sequence: window.engine.getSequenceForLetter(target)
  });
}
// After 36th char: Row 2 removed, Row 3 shifted to top, Row 4 generated!
assert.strictEqual(pc.children.length, 2);
assert.strictEqual(pc.children[0].id, 'koch-row-3', 'Row 3 must now be at the top');
assert.strictEqual(pc.children[1].id, 'koch-row-4', 'Row 4 must be generated below');

// Complete Row 3 (indices 36..47) -> Testing row 4 transition!
for (let i = 36; i < 48; i++) {
  const target = kochState.targetChars[i];
  finalizeLetterKochMode({
    isValid: true,
    letter: target,
    sequence: window.engine.getSequenceForLetter(target)
  });
}
// After 48th char: Row 3 removed, Row 4 shifted to top, Row 5 generated!
assert.strictEqual(pc.children.length, 2);
assert.strictEqual(pc.children[0].id, 'koch-row-4', 'Row 4 must now be at the top');
assert.strictEqual(pc.children[1].id, 'koch-row-5', 'Row 5 must be generated below');
console.log('  -> Multi-row continuous rolling (Row 0 -> 1 -> 2 -> 3 -> 4) verified successfully!');

// Clean up
clearKochTimers();

// ----------------------------------------------------
// 5. Test Challenge Mode: Error resets timer without abort & manual stop
// ----------------------------------------------------
console.log('--- 5. Testing Challenge Mode Error Reset & Active Stop ---');
setKochAssessmentMode('challenge');
startKochDrill();
assert.strictEqual(kochState.mode, 'challenge');
assert.strictEqual(kochState.running, true);
assert.strictEqual(kochState.timeRemaining, 180);
assert.strictEqual(kochState.challengeResetCount, 0);
assert(document.getElementById('btn-stop-koch-drill').innerHTML.includes('結束'));
assert(!document.getElementById('btn-stop-koch-drill').innerHTML.includes('結束考核'));

// Simulate 5 seconds ticking
kochState.timeRemaining = 175;

// Simulate an error on char 0
const target0 = kochState.targetChars[0];
finalizeLetterKochMode({
  isValid: true,
  letter: (target0 === 'K' ? 'M' : 'K'),
  sequence: '--'
});

// Verify: DO NOT abort, reset timer back to 180s, increment reset count!
assert.strictEqual(kochState.running, true, 'Drill must NOT abort on error!');
assert.strictEqual(kochState.timeRemaining, 180, 'Timer must directly reset to 180s on error!');
assert.strictEqual(kochState.runStartIndex, 1, 'runStartIndex must be 1 after char 0 error');
console.log('  -> Wrong answer directly reset timer to 180s and set runStartIndex to 1!');

// Simulate reflex timeout on char 1
kochState.timeRemaining = 170;
handleReflexTimeout();
assert.strictEqual(kochState.running, true, 'Drill must NOT abort on reflex timeout!');
assert.strictEqual(kochState.timeRemaining, 180, 'Reflex timeout must directly reset timer to 180s!');
assert.strictEqual(kochState.challengeResetCount, 2, 'challengeResetCount must increment to 2');
assert.strictEqual(kochState.runStartIndex, 2, 'runStartIndex must be 2 after char 1 timeout');
console.log('  -> Reflex timeout directly reset timer to 180s and set runStartIndex to 2!');

// Char 2: Answer correctly -> Accuracy for new run is 1/1 = 100%
kochState.timeRemaining = 165;
const target2 = kochState.targetChars[2];
finalizeLetterKochMode({
  isValid: true,
  letter: target2,
  sequence: window.engine.getSequenceForLetter(target2)
});
assert.strictEqual(kochState.timeRemaining, 165, 'Timer must not reset on correct answer');
assert.strictEqual(kochState.challengeResetCount, 2, 'Reset count remains 2');

// Chars 3 to 11 (9 questions): Answer all correctly -> 10/10 = 100% in this run
for (let c = 3; c <= 11; c++) {
  const target = kochState.targetChars[c];
  finalizeLetterKochMode({
    isValid: true,
    letter: target,
    sequence: window.engine.getSequenceForLetter(target)
  });
}
assert.strictEqual(kochState.challengeResetCount, 2);

// Char 12: Answer incorrectly -> 10 correct out of 11 = 91% (>= 90% defense line!)
kochState.timeRemaining = 150;
const target12 = kochState.targetChars[12];
finalizeLetterKochMode({
  isValid: true,
  letter: (target12 === 'K' ? 'M' : 'K'),
  sequence: '--'
});
// 91% >= 90%: Does NOT trigger timer reset!
assert.strictEqual(kochState.timeRemaining, 150, 'Single slip keeping >= 90% must NOT reset timer!');
assert.strictEqual(kochState.challengeResetCount, 2, 'challengeResetCount remains 2 when >= 90%');
assert.strictEqual(kochState.runStartIndex, 2, 'runStartIndex stays 2 when defense line holds');
console.log('  -> Accidental error at 91% (>= 90%) successfully absorbed without timer reset!');

// Char 13: Answer incorrectly again -> 10 correct out of 12 = 83% (< 90% defense line broken!)
kochState.timeRemaining = 145;
const target13 = kochState.targetChars[13];
finalizeLetterKochMode({
  isValid: true,
  letter: (target13 === 'K' ? 'M' : 'K'),
  sequence: '--'
});
// 83% < 90%: Triggers timer reset and moves runStartIndex to 14!
assert.strictEqual(kochState.timeRemaining, 180, 'Accuracy < 90% must reset timer back to 180s!');
assert.strictEqual(kochState.challengeResetCount, 3, 'challengeResetCount must increment to 3');
assert.strictEqual(kochState.runStartIndex, 14, 'runStartIndex must jump to 14 (idx 13 + 1)');
console.log('  -> Consecutive errors dropping acc to 83% (< 90%) reset timer and updated runStartIndex to 14!');

// Char 14: Answer correctly -> New attempt starts cleanly at 1/1 = 100%!
kochState.timeRemaining = 175;
const target14 = kochState.targetChars[14];
finalizeLetterKochMode({
  isValid: true,
  letter: target14,
  sequence: window.engine.getSequenceForLetter(target14)
});
assert.strictEqual(kochState.timeRemaining, 175, 'New run begins with 100% accuracy!');
assert.strictEqual(kochState.challengeResetCount, 3);

// Test Active Stop: user manually ends the drill
assert.strictEqual(typeof stopKochDrill, 'function');
stopKochDrill();
assert.strictEqual(kochState.running, false, 'stopKochDrill must stop the session');
assert.strictEqual(kochState.isFinished, true);
assert.strictEqual(document.getElementById('koch-scorecard').style.display, 'block');
assert.strictEqual(document.getElementById('btn-stop-koch-drill').style.display, 'none');

// Verify scorecard reports current attempt stats and cumulative reset notice
assert.strictEqual(document.getElementById('koch-sc-total').textContent, 1, 'Current run total is 1 question');
assert.strictEqual(document.getElementById('koch-sc-correct').textContent, 1, 'Current run correct is 1 question');
assert.strictEqual(document.getElementById('koch-sc-accuracy').textContent, '100%', 'Current run accuracy is 100%');
assert(document.getElementById('koch-sc-desc').innerHTML.includes('考核期間重置計時：<strong>3</strong> 次'), 'Scorecard includes reset count');
assert(document.getElementById('koch-sc-desc').innerHTML.includes('累計發報 15 題'), 'Scorecard includes cumulative total of 15 answered questions');
console.log('  -> Scorecard displays clean current-run accuracy (100%) and reports cumulative 15 questions / 3 resets!');

// ----------------------------------------------------
// 6. Test Challenge Mode Full Conquered (Timer hits 0)
// ----------------------------------------------------
console.log('--- 6. Testing Challenge Mode Full Clear (Conquered) ---');
startKochDrill();
// Answer 24 questions, all correct
for (let i = 0; i < 24; i++) {
  const target = kochState.targetChars[i];
  finalizeLetterKochMode({
    isValid: true,
    letter: target,
    sequence: window.engine.getSequenceForLetter(target)
  });
}
assert.strictEqual(kochState.running, true);
assert.strictEqual(kochState.challengeResetCount, 0);

// Simulate full timer expiration (00:00)
finishKochDrillSession(false);
assert.strictEqual(kochState.isFinished, true);
assert(document.getElementById('koch-sc-title').textContent.includes('極限挑戰征服'), 'Scorecard must display Challenge Conquered');
assert.strictEqual(document.getElementById('koch-sc-accuracy').textContent, '100%');
console.log('  -> Challenge mode full clear (100% accuracy, timer expired naturally) verified!');

// ----------------------------------------------------
// 7. Test Challenge Mode Halved Reflex Timer (Bounded by letterGap)
// ----------------------------------------------------
console.log('--- 7. Testing Challenge Mode Halved Reflex Timer ---');
setKochAssessmentMode('challenge');
startKochDrill();
startReflexTimer();
// Default reflexTimeoutMs is 2000. In challenge mode, it should be halved to 1000.
assert.strictEqual(kochState.reflexDuration, 1000, 'Challenge mode reflexDuration should be halved (2000 -> 1000ms)');

// If letterGap is high (e.g. 1200ms at slow Farnsworth), reflex duration must NOT be lower than letterGap!
window.engine.config.letterGap = 1200;
startReflexTimer();
assert.strictEqual(kochState.reflexDuration, 1200, 'Reflex duration must never drop below letterGap');

// Reset letterGap back to 240
window.engine.config.letterGap = 240;
startReflexTimer();
assert.strictEqual(kochState.reflexDuration, 1000);
clearKochTimers();
console.log('  -> Challenge mode halved reflex timer (1000ms bounded by letterGap) verified!');

// ----------------------------------------------------
// 8. Test Standard Mode Default Duration (60s / 1 Min)
// ----------------------------------------------------
console.log('--- 8. Testing Standard Mode Default Duration (60s) ---');
setKochAssessmentMode('standard');
startKochDrill();
assert.strictEqual(kochState.duration, 60, 'Standard mode duration must default to 60s');
assert.strictEqual(kochState.timeRemaining, 60);
clearKochTimers();
console.log('  -> Standard mode 60s default duration verified!');

// ----------------------------------------------------
// 9. Test Standard Mode Mercy Rule (提前停損)
// ----------------------------------------------------
console.log('--- 9. Testing Standard Mode Mercy Rule (提前停損) ---');
setKochAssessmentMode('standard');
startKochDrill();

// Subtest 9.1: No early cutoff with < 5 answers (Sample protection)
kochState.timeRemaining = 10; // Low remaining time
// Answer 3 questions wrong
for (let i = 0; i < 3; i++) {
  const target = kochState.targetChars[i];
  finalizeLetterKochMode({
    isValid: true,
    letter: (target === 'K' ? 'M' : 'K'),
    sequence: '--'
  });
  assert.strictEqual(kochState.running, true, 'Mercy rule must not abort when totalDone < 5');
  assert.strictEqual(kochState.isFinished, false);
}
console.log('  -> Sample size safety (< 5 answered) verified!');

// Subtest 9.2: Mercy rule triggers when mathematically doomed
// User has 10 seconds remaining, answers 6 questions with 5 errors and 1 correct.
// In 10s at 0.75s/char, max possible remaining is ceil(10/0.75) = 14 chars.
// If all 14 are correct: (1 + 14) / (6 + 14) = 15 / 20 = 75% (< 90%).
// It must trigger Mercy Rule!
startKochDrill();
kochState.timeRemaining = 10;
// Answer 1 correct, 5 wrong
for (let i = 0; i < 6; i++) {
  const target = kochState.targetChars[i];
  const isCorrect = (i === 0);
  finalizeLetterKochMode({
    isValid: true,
    letter: isCorrect ? target : (target === 'K' ? 'M' : 'K'),
    sequence: isCorrect ? window.engine.getSequenceForLetter(target) : '--'
  });
}

// Check state after 6th question (5 errors out of 6 at 10s left)
assert.strictEqual(kochState.running, false, 'Mercy rule should terminate running session');
assert.strictEqual(kochState.isFinished, true, 'Session should be marked finished');
assert.strictEqual(kochState.isMercyCutoff, true, 'isMercyCutoff must be true');

// Check Scorecard UI
assert(document.getElementById('koch-sc-title').innerHTML.includes('提前停損 (Mercy Cutoff)'), 'Title should show Mercy Cutoff');
assert(document.getElementById('koch-sc-desc').innerHTML.includes('提前停損機制'), 'Description should explain Mercy Rule cutoff');
assert.strictEqual(document.getElementById('koch-scorecard').style.borderColor, '#ff9100', 'Border should be amber warning');
assert(document.getElementById('eval-status').innerHTML.includes('提前停損'), 'evalStatus should indicate mercy cutoff');
console.log('  -> Mercy rule mathematical trigger, scorecard and HUD UI verified!');

// Subtest 9.3: Reflex timeout also triggers Mercy Rule
startKochDrill();
kochState.timeRemaining = 8;
// Answer 4 correct, 1 wrong
for (let i = 0; i < 5; i++) {
  const target = kochState.targetChars[i];
  const isCorrect = (i < 4);
  finalizeLetterKochMode({
    isValid: true,
    letter: isCorrect ? target : (target === 'K' ? 'M' : 'K'),
    sequence: isCorrect ? window.engine.getSequenceForLetter(target) : '--'
  });
}
assert.strictEqual(kochState.running, true, 'Still running at 4/5');

// Now trigger 3 consecutive reflex timeouts
// With 8s left, max remaining is ceil(8 / 0.75) = 11 chars.
// At 4 correct, 4 errors (total 8): (4 + 11) / (8 + 11) = 15 / 19 = 78.9% (< 90%).
handleReflexTimeout();
handleReflexTimeout();
handleReflexTimeout();
assert.strictEqual(kochState.running, false, 'Reflex timeouts must trigger mercy rule when doomed');
assert.strictEqual(kochState.isMercyCutoff, true);
console.log('  -> Reflex timeout mercy rule trigger verified!');

// ----------------------------------------------------
// 10. Test Stage Advancement to Staging Area (Issue #23)
// ----------------------------------------------------
console.log('--- 10. Testing Next Stage Advancement to Staging Area ---');
// Set up completed level 1
km.currentLevel = 1;
km.maxUnlockedLevel = 1;
setKochAssessmentMode('quick');
startKochDrill();

// Complete 24 characters with 100% accuracy to clear stage 1
for (let i = 0; i < 24; i++) {
  const target = kochState.targetChars[i];
  finalizeLetterKochMode({
    isValid: true,
    letter: target,
    sequence: window.engine.getSequenceForLetter(target)
  });
}

// Stage 1 cleared, maxUnlockedLevel should be 2, newChar is R
assert.strictEqual(km.maxUnlockedLevel, 2);
assert.strictEqual(kochState.isFinished, true);
const nextBtn = document.getElementById('btn-koch-next-stage');
assert.strictEqual(nextBtn.style.display, 'inline-block');
assert(nextBtn.innerHTML.includes('整備區'), 'Next stage button must mention 整備區');
assert(nextBtn.innerHTML.includes('解鎖 R'), 'Next stage button must mention 解鎖 R');

// Now click next stage (advanceToNextKochStage)
advanceToNextKochStage();

// Verify: level advanced to 2
assert.strictEqual(km.currentLevel, 2, 'Current level must advance to 2');
// Verify: NOT in running drill! Stays in staging!
assert.strictEqual(kochState.running, false, 'Should NOT start drill immediately');
assert.strictEqual(kochState.isFinished, false, 'isFinished must be reset to false');
assert.strictEqual(document.getElementById('koch-scorecard').style.display, 'none', 'Scorecard must be hidden');
assert.strictEqual(document.getElementById('koch-drill-panel').style.display, 'none', 'Drill panel must be hidden');
assert.strictEqual(document.getElementById('koch-setup-card').style.display, 'block', 'Setup card must be visible');
assert.strictEqual(document.getElementById('koch-standard-card').style.display, 'flex', 'Standard stage card must be displayed');
assert.strictEqual(document.getElementById('koch-target-char').textContent, 'R', 'Target char must show R');
assert.strictEqual(document.getElementById('koch-target-seq').textContent, '.-.', 'Target sequence must show .-.');
assert(document.getElementById('eval-status').textContent.includes('第 2 關整備中'), 'evalStatus must indicate staging');
console.log('  -> Stage advancement to staging area (setup card visible, drill not started) verified!');

// Now verify manual start from staging (e.g. user presses Enter or R)
startKochDrill();
assert.strictEqual(kochState.running, true, 'Drill should start when user triggers startKochDrill()');
assert.strictEqual(document.getElementById('koch-setup-card').style.display, 'none', 'Setup card should hide on drill start');
assert.strictEqual(document.getElementById('koch-drill-panel').style.display, 'block', 'Drill panel should display');
clearKochTimers();
console.log('  -> Manual drill start from staging area verified!');

console.log('==============================================');
console.log('ALL TESTS PASSED SUCCESSFULLY (Exit code 0)!');
console.log('==============================================');

