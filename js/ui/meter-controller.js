/**
 * KEYING & GAP METERS CONTROLLER: meter-controller.js
 * 1. 按壓時長判定 (Press Duration Meter)
 * 2. 結算間隔時間軸 (Settlement Gap Timeline - 防抖佈局)
 */

let maxMeterScale = 600; // ms
let maxGapScale = 700;   // ms
let animFrame = null;
let gapAnimFrame = null;
let letterSettled = false;
let wordSettled = false;

function updateMeterMarkers() {
  const engine = window.engine;
  if (!engine) return;

  const unitT = engine.getEffectiveUnitT();
  const th = engine.getEffectiveThreshold();
  const dahTarget = unitT * 3;
  maxMeterScale = Math.max(120, Math.round(Math.max(th * 2.2, dahTarget * 1.4)));

  const readoutMax = document.getElementById('readout-max');
  const readoutThresholdTag = document.getElementById('readout-threshold-tag');
  const meterMarkers = document.getElementById('meter-markers');
  const gapMaxReadout = document.getElementById('gap-max-readout');
  const gapMarkers = document.getElementById('gap-markers');

  if (readoutMax) readoutMax.textContent = `${maxMeterScale} ms`;
  if (readoutThresholdTag) readoutThresholdTag.textContent = `${th} ms`;

  const ditPct = ((unitT / maxMeterScale) * 100).toFixed(1);
  const thPct = ((th / maxMeterScale) * 100).toFixed(1);
  const dahPct = Math.min(100, (dahTarget / maxMeterScale) * 100).toFixed(1);

  if (meterMarkers) {
    meterMarkers.innerHTML = `
      <div class="marker" style="left: ${ditPct}%;"></div>
      <div class="marker-label" style="left: ${ditPct}%;">1T (${unitT}ms)</div>

      <div class="marker marker-threshold" style="left: ${thPct}%;"></div>
      <div class="marker-label" style="left: ${thPct}%; color: #ff5252;">門檻 ${th}ms</div>

      <div class="marker" style="left: ${dahPct}%;"></div>
      <div class="marker-label" style="left: ${dahPct}%;">3T (${dahTarget}ms)</div>
    `;
  }

  // Dual Markers for Gap Timeline (3T Letter Gap & 7T Word Gap)
  const letterGap = engine.config.letterGap;
  const wordGap = engine.config.wordGap;
  maxGapScale = Math.round(wordGap * 1.18);
  if (gapMaxReadout) gapMaxReadout.textContent = `${maxGapScale} ms`;

  const letterPct = ((letterGap / maxGapScale) * 100).toFixed(1);
  const wordPct = ((wordGap / maxGapScale) * 100).toFixed(1);

  if (gapMarkers) {
    gapMarkers.innerHTML = `
      <div class="marker" style="left: ${letterPct}%; background: #ffd700; width: 2.5px; box-shadow: 0 0 8px rgba(255, 215, 0, 0.8);"></div>
      <div class="marker-label" style="left: ${letterPct}%; color: #ffd700;">字元結算 3T (${letterGap}ms)</div>

      <div class="marker" style="left: ${wordPct}%; background: #00e5ff; width: 2.5px; box-shadow: 0 0 8px rgba(0, 229, 255, 0.8);"></div>
      <div class="marker-label" style="left: ${wordPct}%; color: #00e5ff;">單字空格 7T (${wordGap}ms)</div>
    `;
  }

  // Update Baseline WPM readouts
  const meterWpmBadge = document.getElementById('meter-wpm-badge');
  const readoutWpm = document.getElementById('readout-wpm');
  const stateWpm = document.getElementById('state-wpm');
  const baselineWpm = typeof engine.getBaselineWpm === 'function' ? engine.getBaselineWpm() : Math.round(1200 / unitT);
  if (meterWpmBadge) meterWpmBadge.textContent = `即時 ${baselineWpm} WPM`;
  if (readoutWpm) readoutWpm.textContent = `(${baselineWpm} WPM)`;
  if (stateWpm) stateWpm.textContent = `(${baselineWpm} WPM)`;
}

function startMeterAnimation() {
  const engine = window.engine;
  if (!engine) return;
  const startTime = engine.pressStartTime;
  const th = engine.getEffectiveThreshold();
  const meterBar = document.getElementById('meter-bar');
  const readoutTime = document.getElementById('readout-time');
  const readoutSymbol = document.getElementById('readout-symbol');
  const readoutWpm = document.getElementById('readout-wpm');
  const meterWpmBadge = document.getElementById('meter-wpm-badge');
  const stateWpm = document.getElementById('state-wpm');

  function frame() {
    if (!engine.isKeyDown) return;
    const now = performance.now();
    const elapsed = Math.round(now - startTime);
    const pct = Math.min(100, (elapsed / maxMeterScale) * 100);

    if (meterBar) meterBar.style.width = pct + '%';
    if (readoutTime) readoutTime.textContent = `${elapsed} ms`;

    if (typeof engine.calculateStrokeWpm === 'function') {
      const liveWpm = engine.calculateStrokeWpm(elapsed);
      if (readoutWpm) readoutWpm.textContent = `(${liveWpm} WPM)`;
      if (meterWpmBadge) meterWpmBadge.textContent = `即時 ${liveWpm} WPM`;
      if (stateWpm) stateWpm.textContent = `(${liveWpm} WPM)`;
    }

    if (elapsed < th) {
      if (meterBar) meterBar.classList.remove('dah-active');
      if (readoutSymbol) {
        readoutSymbol.textContent = '點 Dit (·)';
        readoutSymbol.style.color = '#00e5ff';
      }
    } else {
      if (meterBar) meterBar.classList.add('dah-active');
      if (readoutSymbol) {
        readoutSymbol.textContent = '劃 Dah (—)';
        readoutSymbol.style.color = '#ffb703';
      }
    }

    animFrame = requestAnimationFrame(frame);
  }
  animFrame = requestAnimationFrame(frame);
}

function stopMeterAnimation(finalDuration) {
  if (animFrame) cancelAnimationFrame(animFrame);
  const meterBar = document.getElementById('meter-bar');
  const readoutTime = document.getElementById('readout-time');
  const meterGhost = document.getElementById('meter-ghost');
  const readoutWpm = document.getElementById('readout-wpm');
  const meterWpmBadge = document.getElementById('meter-wpm-badge');
  const stateWpm = document.getElementById('state-wpm');
  const engine = window.engine;

  const pct = Math.min(100, (finalDuration / maxMeterScale) * 100);
  if (meterBar) meterBar.style.width = pct + '%';
  if (readoutTime) readoutTime.textContent = `${finalDuration} ms`;

  if (engine && typeof engine.calculateStrokeWpm === 'function') {
    const strokeWpm = engine.calculateStrokeWpm(finalDuration);
    const rollingWpm = typeof engine.getRollingWpm === 'function' ? engine.getRollingWpm() : strokeWpm;
    if (readoutWpm) readoutWpm.textContent = `(${strokeWpm} WPM)`;
    if (stateWpm) stateWpm.textContent = `(${strokeWpm} WPM)`;
    if (meterWpmBadge) {
      meterWpmBadge.textContent = `即時 ${rollingWpm} WPM`;
      meterWpmBadge.classList.add('pulse');
      setTimeout(() => meterWpmBadge.classList.remove('pulse'), 300);
    }
  }

  // Ghost marker
  if (meterGhost) {
    meterGhost.style.left = pct + '%';
    meterGhost.style.opacity = '1';
    setTimeout(() => { meterGhost.style.opacity = '0'; }, 1200);
  }
}

function stopGapCountdown() {
  if (gapAnimFrame) {
    cancelAnimationFrame(gapAnimFrame);
    gapAnimFrame = null;
  }
  if (typeof window !== 'undefined') {
    window.gapAnimFrame = null;
  }
}

function startGapCountdown() {
  stopGapCountdown();
  letterSettled = false;
  wordSettled = false;

  const engine = window.engine;
  if (!engine) return;

  const letterGap = engine.config.letterGap;
  const wordGap = engine.config.wordGap;
  const startTime = performance.now();

  const gapBar = document.getElementById('gap-bar');
  const gapStatusBadge = document.getElementById('gap-status-badge');
  const gapCountdownReadout = document.getElementById('gap-countdown-readout');
  const gapTimeReadout = document.getElementById('gap-time-readout');

  if (gapBar) gapBar.style.background = 'linear-gradient(90deg, #ffb703, #ffd700)';
  if (gapStatusBadge) {
    gapStatusBadge.textContent = `點劃接續中 · 剩 ${letterGap}ms`;
    gapStatusBadge.style.color = '#ffd700';
  }
  if (gapCountdownReadout) {
    gapCountdownReadout.textContent = `距字元: ${letterGap} ms`;
    gapCountdownReadout.style.color = '#ffd700';
  }

  function tick() {
    const engine = window.engine;
    // Defensive check: If user is actively pressing a key down, halt countdown immediately!
    if (engine && engine.isKeyDown) {
      stopGapCountdown();
      return;
    }

    const elapsed = performance.now() - startTime;
    const pct = Math.min(100, (elapsed / maxGapScale) * 100);

    if (gapBar) gapBar.style.width = pct + '%';
    if (gapTimeReadout) gapTimeReadout.textContent = `${Math.round(elapsed)} ms`;

    // Stage 1: Before letter settlement (0 ~ 3T)
    if (elapsed < letterGap) {
      const remLetter = Math.max(0, Math.round(letterGap - elapsed));
      if (gapBar) gapBar.style.background = 'linear-gradient(90deg, #ffb703, #ffd700)';
      if (gapStatusBadge) {
        gapStatusBadge.textContent = `點劃接續中 · 剩 ${remLetter}ms`;
        gapStatusBadge.style.color = '#ffd700';
      }
      if (gapCountdownReadout) {
        gapCountdownReadout.textContent = `距字元: ${remLetter} ms`;
        gapCountdownReadout.style.color = '#ffd700';
      }
    }
    // Stage 2: Trigger letter settlement at exact 3T!
    else if (!letterSettled) {
      letterSettled = true;
      if (typeof window.finalizeLetter === 'function') {
        window.finalizeLetter();
      }
    }

    // Stage 3: Between letter settlement and word settlement (3T ~ 7T)
    if (elapsed >= letterGap && elapsed < wordGap) {
      const remWord = Math.max(0, Math.round(wordGap - elapsed));
      if (gapBar) gapBar.style.background = 'linear-gradient(90deg, #ffd700, #00e5ff)';
      if (gapStatusBadge) {
        gapStatusBadge.textContent = `字元已結算 · 距空格 ${remWord}ms`;
        gapStatusBadge.style.color = '#00e5ff';
      }
      if (gapCountdownReadout) {
        gapCountdownReadout.textContent = `距單字: ${remWord} ms`;
        gapCountdownReadout.style.color = '#00e5ff';
      }
    }
    // Stage 4: Trigger word space settlement at exact 7T!
    else if (elapsed >= wordGap && !wordSettled) {
      wordSettled = true;
      commitWordSpace();
      if (gapBar) gapBar.style.background = 'linear-gradient(90deg, #00e5ff, #00e676)';
      if (gapStatusBadge) {
        gapStatusBadge.textContent = '單字結算 (已插入空格)';
        gapStatusBadge.style.color = '#00e676';
      }
      if (gapCountdownReadout) {
        gapCountdownReadout.textContent = '單字已結算';
        gapCountdownReadout.style.color = '#00e676';
      }
    }

    if (elapsed < maxGapScale) {
      gapAnimFrame = requestAnimationFrame(tick);
      if (typeof window !== 'undefined') {
        window.gapAnimFrame = gapAnimFrame;
      }
    } else {
      gapAnimFrame = null;
      if (typeof window !== 'undefined') {
        window.gapAnimFrame = null;
      }
    }
  }

  gapAnimFrame = requestAnimationFrame(tick);
  if (typeof window !== 'undefined') {
    window.gapAnimFrame = gapAnimFrame;
    window.stopGapCountdown = stopGapCountdown;
  }
}

function commitWordSpace() {
  const engine = window.engine;
  const currentMode = window.currentMode || 'free';
  const stateCommitted = document.getElementById('state-committed');

  if (currentMode === 'free') {
    if (engine && engine.committedLetters.length > 0 && engine.committedLetters[engine.committedLetters.length - 1] !== ' ') {
      engine.committedLetters.push(' ');
      if (typeof window.updateCommittedView === 'function') {
        window.updateCommittedView();
      } else if (stateCommitted && typeof window.renderCommittedText === 'function') {
        stateCommitted.textContent = window.renderCommittedText();
        stateCommitted.title = (stateCommitted.textContent !== '—') ? stateCommitted.textContent : '';
        stateCommitted.scrollLeft = stateCommitted.scrollWidth;
      }
    }
  } else if (currentMode === 'text' && window.textState && !window.textState.isFinished) {
    const textState = window.textState;
    if (textState.currentIndex < textState.targetChars.length && textState.targetChars[textState.currentIndex] === ' ') {
      if (typeof window.setCharResult === 'function') {
        window.setCharResult(textState.currentIndex, true, ' ', ' ');
      }
      textState.currentIndex++;
      if (textState.currentIndex >= textState.targetChars.length) {
        if (typeof window.finishTextModePassage === 'function') {
          window.finishTextModePassage();
        }
      } else {
        if (typeof window.updateCharCursor === 'function') {
          window.updateCharCursor();
        }
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.updateMeterMarkers = updateMeterMarkers;
  window.startMeterAnimation = startMeterAnimation;
  window.stopMeterAnimation = stopMeterAnimation;
  window.startGapCountdown = startGapCountdown;
  window.stopGapCountdown = stopGapCountdown;
  window.commitWordSpace = commitWordSpace;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    updateMeterMarkers,
    startMeterAnimation,
    stopMeterAnimation,
    startGapCountdown,
    stopGapCountdown,
    commitWordSpace
  };
}
