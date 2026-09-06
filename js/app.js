/**
 * APPLICATION ORCHESTRATOR: app.js
 * 整合核心領域模組、UI 控制器、事件總線與初始化啟動
 */

// Global App Instances
const engine = new MorseEngine();
const synth = new MorseAudio();
const keyer = new IambicKeyer(engine, synth);
const settingsManager = new SettingsManager();
const keybindingManager = new KeybindingManager(KEY_PROFILES, settingsManager);
const kochManager = new KochManager();
let ribbon = null;

// Expose on window for cross-module coordination
window.engine = engine;
window.synth = synth;
window.keyer = keyer;
window.settingsManager = settingsManager;
window.keybindingManager = keybindingManager;
window.kochManager = kochManager;

// App State Variables
let currentKeyerDevice = 'straight'; // 'straight' | 'paddle' | 'bug'
let currentMode = 'free'; // 'free' | 'text' | 'koch'
let currentPresetKey = 'intermediate';
let bugManualStartTime = 0;
let wordTimer = null;

window.currentKeyerDevice = currentKeyerDevice;
window.currentMode = currentMode;
window.currentPresetKey = currentPresetKey;
window.wordTimer = wordTimer;

// DOM Element References Cache
let dom = {};

function initDomReferences() {
  dom = {
    // PCB SVG
    wiresLayer: document.getElementById('wires-layer'),
    nodesLayer: document.getElementById('nodes-layer'),
    antennaShape: document.getElementById('antenna-shape'),
    numberChipsGroup: document.getElementById('number-chips-group'),

    // State Display
    stateSeq: document.getElementById('state-seq'),
    stateLetter: document.getElementById('state-letter'),
    stateDuration: document.getElementById('state-duration'),
    stateWpm: document.getElementById('state-wpm'),
    stateCommitted: document.getElementById('state-committed'),
    evalStatus: document.getElementById('eval-status'),

    // Meters & Timeline
    meterBar: document.getElementById('meter-bar'),
    meterGhost: document.getElementById('meter-ghost'),
    meterStatus: document.getElementById('meter-status'),
    meterWpmBadge: document.getElementById('meter-wpm-badge'),
    meterMarkers: document.getElementById('meter-markers'),
    readoutTime: document.getElementById('readout-time'),
    readoutWpm: document.getElementById('readout-wpm'),
    readoutSymbol: document.getElementById('readout-symbol'),
    readoutMax: document.getElementById('readout-max'),
    readoutThresholdTag: document.getElementById('readout-threshold-tag'),

    gapBar: document.getElementById('gap-bar'),
    gapMarkers: document.getElementById('gap-markers'),
    gapTimeReadout: document.getElementById('gap-time-readout'),
    gapTotalReadout: document.getElementById('gap-total-readout'),
    wordTotalReadout: document.getElementById('word-total-readout'),
    gapCountdownReadout: document.getElementById('gap-countdown-readout'),
    gapMaxReadout: document.getElementById('gap-max-readout'),
    gapStatusBadge: document.getElementById('gap-status-badge'),

    // Telegraph Keys & Paddles
    keyTrigger: document.getElementById('key-trigger'),
    paddleContainer: document.getElementById('paddle-container'),
    paddleLeft: document.getElementById('paddle-left'),
    paddleRight: document.getElementById('paddle-right'),
    paddleLeftName: document.getElementById('paddle-left-name'),
    paddleRightName: document.getElementById('paddle-right-name'),
    ledDitMem: document.getElementById('led-dit-mem'),
    ledDahMem: document.getElementById('led-dah-mem'),
    squeezeBanner: document.getElementById('squeeze-banner'),
    squeezeStatus: document.getElementById('squeeze-status'),

    // Device Switcher
    devStraight: document.getElementById('dev-straight'),
    devPaddle: document.getElementById('dev-paddle'),
    devBug: document.getElementById('dev-bug'),

    // Mode Tabs & Containers
    tabModeFree: document.getElementById('tab-mode-free'),
    tabModeText: document.getElementById('tab-mode-text'),
    tabModeKoch: document.getElementById('tab-mode-koch'),
    freeModeContainer: document.getElementById('free-mode-container'),
    freeModeScenarios: document.getElementById('free-mode-scenarios'),
    textModeContainer: document.getElementById('text-mode-container'),
    kochModeContainer: document.getElementById('koch-mode-container'),

    // Text Mode Elements
    textInput: document.getElementById('text-input'),
    btnApplyText: document.getElementById('btn-apply-text'),
    passageContainer: document.getElementById('passage-container'),
    textProgressBadge: document.getElementById('text-progress-badge'),
    textModeStatus: document.getElementById('text-mode-status'),
    fbTarget: document.getElementById('fb-target'),
    fbInput: document.getElementById('fb-input'),
    fbResult: document.getElementById('fb-result'),
    btnPlayAuto: document.getElementById('btn-play-auto'),
    btnPauseAuto: document.getElementById('btn-pause-auto'),
    btnStopAuto: document.getElementById('btn-stop-auto'),
    btnRestartText: document.getElementById('btn-restart-text'),
    chkShowHints: document.getElementById('chk-show-hints'),
    chkStrictMode: document.getElementById('chk-strict-mode'),

    // Scorecard Elements
    textScorecard: document.getElementById('text-scorecard'),
    scTotal: document.getElementById('sc-total'),
    scCorrect: document.getElementById('sc-correct'),
    scErrors: document.getElementById('sc-errors'),
    scAccuracy: document.getElementById('sc-accuracy'),
    scorecardSpeedTag: document.getElementById('scorecard-speed-tag'),
    btnScorecardRetry: document.getElementById('btn-scorecard-retry'),
    btnRetryErrors: document.getElementById('btn-retry-errors'),

    // Koch Mode Elements
    kochStageBadge: document.getElementById('koch-stage-badge'),
    kochMasteryText: document.getElementById('koch-mastery-text'),
    kochMasteryBar: document.getElementById('koch-mastery-bar'),
    kochTargetChar: document.getElementById('koch-target-char'),
    kochTargetSeq: document.getElementById('koch-target-seq'),
    kochPoolText: document.getElementById('koch-pool-text'),
    btnStartKochDrill: document.getElementById('btn-start-koch-drill'),
    btnStopKochDrill: document.getElementById('btn-stop-koch-drill'),
    btnStopKochPanel: document.getElementById('btn-stop-koch-panel'),
    btnStopKochHud: document.getElementById('btn-stop-koch-hud'),
    btnLayout2col: document.getElementById('btn-layout-2col'),
    btnLayout3col: document.getElementById('btn-layout-3col'),
    mainContainer: document.getElementById('main-container'),
    btnKochTargetListen: document.getElementById('btn-koch-target-listen'),
    btnKochListenK: document.getElementById('btn-koch-listen-k'),
    btnKochListenM: document.getElementById('btn-koch-listen-m'),
    kochStage1Card: document.getElementById('koch-stage1-card'),
    kochStandardCard: document.getElementById('koch-standard-card'),
    kochStageSelect: document.getElementById('koch-stage-select'),
    btnResetKoch: document.getElementById('btn-reset-koch'),
    kochDrillPanel: document.getElementById('koch-drill-panel'),
    kochPassageContainer: document.getElementById('koch-passage-container'),
    kochProgressBadge: document.getElementById('koch-progress-badge'),
    chkKochHints: document.getElementById('chk-koch-hints'),
    btnKochRetry: document.getElementById('btn-koch-retry'),
    kochFbTarget: document.getElementById('koch-fb-target'),
    kochFbInput: document.getElementById('koch-fb-input'),
    kochFbResult: document.getElementById('koch-fb-result'),

    kochScorecard: document.getElementById('koch-scorecard'),
    kochScTitle: document.getElementById('koch-sc-title'),
    kochScDesc: document.getElementById('koch-sc-desc'),
    kochScTotal: document.getElementById('koch-sc-total'),
    kochScCorrect: document.getElementById('koch-sc-correct'),
    kochScErrors: document.getElementById('koch-sc-errors'),
    kochScAccuracy: document.getElementById('koch-sc-accuracy'),
    btnKochNextStage: document.getElementById('btn-koch-next-stage'),

    // Settings Sliders & Checkboxes
    paramUnitT: document.getElementById('param-unit-t'),
    tagUnitT: document.getElementById('tag-unit-t'),
    paramThreshold: document.getElementById('param-threshold'),
    tagThreshold: document.getElementById('tag-threshold'),
    paramGap: document.getElementById('param-gap'),
    tagGap: document.getElementById('tag-gap'),
    paramWordGap: document.getElementById('param-word-gap'),
    tagWordGap: document.getElementById('tag-word-gap'),
    paramFreq: document.getElementById('param-freq'),
    tagFreq: document.getElementById('tag-freq'),

    chkFarnsworth: document.getElementById('chk-farnsworth'),
    farnsworthControls: document.getElementById('farnsworth-controls'),
    paramFarnsworthWpm: document.getElementById('param-farnsworth-wpm'),
    tagFarnsworthWpm: document.getElementById('tag-farnsworth-wpm'),
    tagFarnsworthStatus: document.getElementById('tag-farnsworth-status'),

    chkQrn: document.getElementById('chk-qrn'),
    qrnControls: document.getElementById('qrn-controls'),
    paramQrnVol: document.getElementById('param-qrn-vol'),
    tagQrnVol: document.getElementById('tag-qrn-vol'),
    tagQrnStatus: document.getElementById('tag-qrn-status'),

    chkPaddleReverse: document.getElementById('chk-paddle-reverse'),
    radioModeA: document.getElementById('radio-mode-a') || document.getElementById('mode-a'),
    radioModeB: document.getElementById('radio-mode-b') || document.getElementById('mode-b')
  };
}

// ----------------------------------------------------
// Keyer Callbacks & Event Wiring
// ----------------------------------------------------
function setupKeyerCallbacks() {
  keyer.onSymbolStart = (sym, duration) => {
    if (currentMode === 'text' && textState.autoPlayRunning) {
      stopAutoPlay();
    }

    if (currentMode === 'koch') {
      if (!kochState.running || kochState.isFinished) {
        if (dom.evalStatus) {
          dom.evalStatus.textContent = '請先點擊「▶ 開始闖關」';
          dom.evalStatus.style.color = '#ffb703';
        }
        return;
      }
    }

    if (currentMode === 'text') {
      if (textState.currentIndex < textState.targetChars.length && textState.targetChars[textState.currentIndex] === ' ') {
        setCharResult(textState.currentIndex, true, ' ', ' ');
        textState.currentIndex++;
        if (textState.currentIndex >= textState.targetChars.length) {
          finishTextModePassage();
          return;
        }
        updateCharCursor();
      }
    }

    if (currentMode === 'koch') {
      if (typeof startKochSessionTiming === 'function') startKochSessionTiming();
      if (typeof kochModePauseReflex === 'function') kochModePauseReflex();
    }

    const res = engine.appendSymbol(sym, duration);
    if (ribbon) ribbon.startPulse(performance.now(), sym);

    if (typeof stopGapCountdown === 'function') {
      stopGapCountdown();
    } else if (typeof window.stopGapCountdown === 'function') {
      window.stopGapCountdown();
    }
    if (dom.gapBar) dom.gapBar.style.width = '0%';
    if (dom.gapCountdownReadout) {
      dom.gapCountdownReadout.textContent = '-- ms';
      dom.gapCountdownReadout.style.color = '#fff';
    }
    if (dom.gapStatusBadge) {
      dom.gapStatusBadge.textContent = '發報中...';
      dom.gapStatusBadge.style.color = '#00e5ff';
    }

    if (dom.meterStatus) {
      dom.meterStatus.textContent = `電子 Keyer: ${sym === '.' ? '短音 Dit (·)' : '長音 Dah (—)'}`;
      dom.meterStatus.style.color = sym === '.' ? '#00e5ff' : '#ffb703';
    }

    const pct = Math.min(100, (duration / maxMeterScale) * 100);
    if (dom.meterBar) {
      dom.meterBar.style.width = pct + '%';
      if (sym === '.') {
        dom.meterBar.classList.remove('dah-active');
        if (dom.readoutSymbol) {
          dom.readoutSymbol.textContent = '短音 Dit (·)';
          dom.readoutSymbol.style.color = '#00e5ff';
        }
      } else {
        dom.meterBar.classList.add('dah-active');
        if (dom.readoutSymbol) {
          dom.readoutSymbol.textContent = '長音 Dah (—)';
          dom.readoutSymbol.style.color = '#ffb703';
        }
      }
    }
    if (dom.readoutTime) dom.readoutTime.textContent = `${duration} ms`;

    if (dom.stateSeq) dom.stateSeq.textContent = res.sequence;
    if (dom.stateLetter) dom.stateLetter.textContent = res.letter || (res.isValid ? '定位中...' : '(非英文字母)');
    if (dom.stateDuration) dom.stateDuration.textContent = `${duration} ms`;

    if (res.letter === '<HH>') {
      if (dom.evalStatus) {
        dom.evalStatus.innerHTML = '<i class="mdi mdi-alert"></i> 檢測到更正訊號 (Error: 8 Dits)';
        dom.evalStatus.style.color = '#ff9100';
      }
      highlightPath('.....', false, engine, dom.antennaShape);
    } else if (res.isValid) {
      if (dom.evalStatus) {
        dom.evalStatus.textContent = '節點定位中...等待結束';
        dom.evalStatus.style.color = '#00e5ff';
      }
      highlightPath(res.sequence, false, engine, dom.antennaShape);
    } else {
      if (dom.evalStatus) {
        dom.evalStatus.textContent = '無效路徑，即將重置';
        dom.evalStatus.style.color = '#ff5252';
      }
    }
  };

  keyer.onSymbolEnd = (sym, duration) => {
    stopMeterAnimation(duration);
    if (ribbon) ribbon.endPulse(performance.now(), sym);
  };

  keyer.onIdle = () => {
    startGapCountdown();
  };

  keyer.onMemoryChange = (ditMem, dahMem, isSqueezing) => {
    if (dom.ledDitMem) dom.ledDitMem.classList.toggle('latch-active', ditMem);
    if (dom.ledDahMem) dom.ledDahMem.classList.toggle('latch-active', dahMem);
    if (dom.squeezeBanner) dom.squeezeBanner.classList.toggle('squeezing', isSqueezing);
    if (dom.squeezeStatus) {
      if (isSqueezing) {
        dom.squeezeStatus.innerHTML = '<strong style="color:var(--gold);"><i class="mdi mdi-flash"></i> 雙片夾壓中 (Squeezing)</strong> · 自動點劃交替中 (Iambic)';
      } else if (ditMem || dahMem) {
        dom.squeezeStatus.innerHTML = `預先排程記憶: ${ditMem ? '· Dit 鎖存' : ''} ${dahMem ? '— Dah 鎖存' : ''}`;
      } else {
        dom.squeezeStatus.textContent = '雙撥片待命 · 單邊連發 · 夾片交替 (Squeeze Iambic)';
      }
    }
  };

  keyer.onManualDah = (isDown) => {
    handleBugManualDah(isDown);
  };
}

function handleBugManualDah(isDown) {
  if (isDown) {
    if (typeof stopGapCountdown === 'function') {
      stopGapCountdown();
    } else if (typeof window.stopGapCountdown === 'function') {
      window.stopGapCountdown();
    }
    if (dom.gapBar) dom.gapBar.style.width = '0%';
    if (dom.gapCountdownReadout) {
      dom.gapCountdownReadout.textContent = '-- ms';
      dom.gapCountdownReadout.style.color = '#fff';
    }
    if (dom.gapStatusBadge) {
      dom.gapStatusBadge.textContent = 'Bug 發報中...';
      dom.gapStatusBadge.style.color = '#ffd700';
    }

    synth.start();
    if (currentMode === 'koch') {
      if (typeof startKochSessionTiming === 'function') startKochSessionTiming();
      if (typeof kochModePauseReflex === 'function') kochModePauseReflex();
    }
    bugManualStartTime = performance.now();
    if (ribbon) ribbon.startPulse(bugManualStartTime, '-');
    engine.pressStart();
    if (dom.paddleRight) dom.paddleRight.classList.add('active-dah');

    if (dom.meterStatus) {
      dom.meterStatus.textContent = 'Bug: 手動長音中...';
      dom.meterStatus.style.color = '#ffb703';
    }
    if (dom.meterBar) dom.meterBar.classList.add('dah-active');
    if (dom.readoutSymbol) {
      dom.readoutSymbol.textContent = '長音 Dah (—)';
      dom.readoutSymbol.style.color = '#ffb703';
    }
    startMeterAnimation();
  } else {
    if (!engine.isKeyDown) return;
    synth.stop();
    if (dom.paddleRight) dom.paddleRight.classList.remove('active', 'active-dah');
    const now = performance.now();
    const duration = Math.round(now - bugManualStartTime);
    if (ribbon) ribbon.endPulse(now, '-');
    stopMeterAnimation(duration);

    const res = engine.appendSymbol('-', duration);
    if (dom.stateSeq) dom.stateSeq.textContent = res.sequence;
    if (dom.stateLetter) dom.stateLetter.textContent = res.letter || '(非英文字母)';
    if (dom.stateDuration) dom.stateDuration.textContent = `${duration} ms`;

    if (res.isValid) {
      if (dom.evalStatus) {
        dom.evalStatus.textContent = '節點定位中...等待結束';
        dom.evalStatus.style.color = '#00e5ff';
      }
      highlightPath(res.sequence, false, engine, dom.antennaShape);
    } else {
      if (dom.evalStatus) {
        dom.evalStatus.textContent = '無效路徑，即將重置';
        dom.evalStatus.style.color = '#ff5252';
      }
    }

    startGapCountdown();
  }
}

function updatePaddleLabels() {
  if (currentKeyerDevice === 'bug') {
    if (dom.paddleLeftName) dom.paddleLeftName.innerHTML = '<span style="font-size:1.3rem;">·</span> 點 Dit (自動連發)';
    if (dom.paddleRightName) dom.paddleRightName.innerHTML = '<span style="font-size:1.3rem;">—</span> 劃 Dah (手動長音)';
    if (dom.squeezeBanner) dom.squeezeBanner.classList.remove('squeezing');
    if (dom.squeezeStatus) dom.squeezeStatus.innerHTML = '<i class="mdi mdi-radio-handheld"></i> <strong>半自動機械震報鍵 (Bug Key)</strong>：左撥片自動連發點 · 右撥片純手動長劃';
    return;
  }
  const isRev = keyer.reversed;
  if (dom.paddleLeftName) dom.paddleLeftName.innerHTML = isRev ? '<span style="font-size:1.3rem;">—</span> 劃 Dah (長音)' : '<span style="font-size:1.3rem;">·</span> 點 Dit (短音)';
  if (dom.paddleRightName) dom.paddleRightName.innerHTML = isRev ? '<span style="font-size:1.3rem;">·</span> 點 Dit (短音)' : '<span style="font-size:1.3rem;">—</span> 劃 Dah (長音)';
  if (dom.squeezeStatus) dom.squeezeStatus.textContent = '雙撥片待命 · 單邊連發 · 夾發交替 (Squeeze Iambic)';
}

function switchKeyerDevice(device, saveToSettings = true) {
  currentKeyerDevice = device;
  window.currentKeyerDevice = device;
  keyer.reset();
  if (engine.isKeyDown) {
    handleKeyUp();
  }

  if (dom.devStraight) dom.devStraight.classList.toggle('active', device === 'straight');
  if (dom.devPaddle) dom.devPaddle.classList.toggle('active', device === 'paddle');
  if (dom.devBug) dom.devBug.classList.toggle('active', device === 'bug');

  if (device === 'straight') {
    if (dom.keyTrigger) dom.keyTrigger.style.display = 'flex';
    if (dom.paddleContainer) dom.paddleContainer.style.display = 'none';
    keyer.isBugMode = false;
    if (dom.evalStatus) {
      dom.evalStatus.textContent = '已切換至直鍵模式 (Straight Key)';
      dom.evalStatus.style.color = '#00e5ff';
    }
  } else if (device === 'paddle') {
    if (dom.keyTrigger) dom.keyTrigger.style.display = 'none';
    if (dom.paddleContainer) dom.paddleContainer.style.display = 'flex';
    keyer.isBugMode = false;
    updatePaddleLabels();
    if (dom.evalStatus) {
      dom.evalStatus.textContent = '已切換至雙撥片模式 (Iambic Paddle)';
      dom.evalStatus.style.color = '#00e5ff';
    }
  } else if (device === 'bug') {
    if (dom.keyTrigger) dom.keyTrigger.style.display = 'none';
    if (dom.paddleContainer) dom.paddleContainer.style.display = 'flex';
    keyer.isBugMode = true;
    updatePaddleLabels();
    if (dom.evalStatus) {
      dom.evalStatus.innerHTML = '<i class="mdi mdi-radio-handheld"></i> 已切換至半自動機械震報鍵 (Bug Key) 模式';
      dom.evalStatus.style.color = '#ffb703';
    }
  }

  if (saveToSettings) {
    settingsManager.settings.keyerDevice = device;
    settingsManager.save();
  }
}

// ----------------------------------------------------
// Input Handlers (Straight Key & Logic)
// ----------------------------------------------------
function handleKeyDown() {
  if (typeof stopGapCountdown === 'function') {
    stopGapCountdown();
  } else if (typeof window.stopGapCountdown === 'function') {
    window.stopGapCountdown();
  }
  if (window.wordTimer) {
    clearTimeout(window.wordTimer);
    window.wordTimer = null;
  }

  if (dom.gapBar) dom.gapBar.style.width = '0%';
  if (dom.gapCountdownReadout) {
    dom.gapCountdownReadout.textContent = '-- ms';
    dom.gapCountdownReadout.style.color = '#fff';
  }
  if (dom.gapStatusBadge) {
    dom.gapStatusBadge.textContent = '發報中...';
    dom.gapStatusBadge.style.color = '#00e5ff';
  }

  if (currentMode === 'text') {
    if (textState.autoPlayRunning) {
      stopAutoPlay();
    }
    if (textState.isFinished) return;
    if (textState.currentIndex < textState.targetChars.length && textState.targetChars[textState.currentIndex] === ' ') {
      setCharResult(textState.currentIndex, true, ' ', ' ');
      textState.currentIndex++;
      if (textState.currentIndex >= textState.targetChars.length) {
        finishTextModePassage();
        return;
      }
      updateCharCursor();
    }
  }

  if (currentMode === 'koch') {
    if (!kochState.running || kochState.isFinished) {
      if (dom.evalStatus) {
        dom.evalStatus.textContent = '請先點擊「▶ 開始闖關」';
        dom.evalStatus.style.color = '#ffb703';
      }
      return;
    }
    if (typeof startKochSessionTiming === 'function') {
      startKochSessionTiming();
    }
    if (typeof kochModePauseReflex === 'function') {
      kochModePauseReflex();
    }
  }

  if (engine.pressStart()) {
    synth.start();
    if (ribbon) ribbon.startPulse(performance.now(), '?');
    if (dom.keyTrigger) dom.keyTrigger.classList.add('active');
    if (dom.meterStatus) {
      dom.meterStatus.textContent = '按壓中...';
      dom.meterStatus.style.color = '#00e5ff';
    }
    startMeterAnimation();
  }
}

function handleKeyUp() {
  if (!engine.isKeyDown) return;
  const res = engine.pressEnd();
  synth.stop();
  if (ribbon) ribbon.endPulse(performance.now(), res ? res.symbol : null);
  if (dom.keyTrigger) dom.keyTrigger.classList.remove('active');

  if (!res) return;

  stopMeterAnimation(res.duration);
  if (dom.meterStatus) {
    dom.meterStatus.textContent = `輸入 ${res.symbol === '.' ? '短音 Dit (·)' : '長音 Dah (—)'}`;
    dom.meterStatus.style.color = res.symbol === '.' ? '#00e5ff' : '#ffb703';
  }

  if (dom.stateSeq) dom.stateSeq.textContent = res.sequence;
  if (dom.stateLetter) dom.stateLetter.textContent = res.letter || (res.isValid ? '定位中...' : '(非英文字母)');
  if (dom.stateDuration) dom.stateDuration.textContent = `${res.duration} ms`;

  if (res.letter === '<HH>') {
    if (dom.evalStatus) {
      dom.evalStatus.innerHTML = '<i class="mdi mdi-alert"></i> 檢測到更正訊號 (Error: 8 Dits)';
      dom.evalStatus.style.color = '#ff9100';
    }
    highlightPath('.....', false, engine, dom.antennaShape);
  } else if (res.isValid) {
    if (dom.evalStatus) {
      dom.evalStatus.textContent = '節點定位中...等待結束';
      dom.evalStatus.style.color = '#00e5ff';
    }
    highlightPath(res.sequence, false, engine, dom.antennaShape);
  } else {
    if (dom.evalStatus) {
      dom.evalStatus.textContent = '無效路徑，即將重置';
      dom.evalStatus.style.color = '#ff5252';
    }
  }

  startGapCountdown();
}

function finalizeLetter() {
  if (engine.isKeyDown) return;
  const res = engine.commitCurrentSequence();
  if (!res) return;

  if (currentMode === 'text') {
    finalizeLetterTextMode(res);
    return;
  }
  if (currentMode === 'koch') {
    finalizeLetterKochMode(res);
    return;
  }

  // Free Practice Mode logic
  if (res.isErrorSignal || res.letter === '<HH>') {
    const erasedStr = (res.erased && res.erased.length > 0) ? `「${res.erased.join('')}」` : '';
    if (dom.evalStatus) {
      dom.evalStatus.innerHTML = `<i class="mdi mdi-alert"></i> 筆誤更正 &lt;HH&gt;：已作廢刪除上一單字 ${erasedStr}`.trim();
      dom.evalStatus.style.color = '#ff9100';
    }
    highlightPath('', false, engine, dom.antennaShape);
    if (dom.stateCommitted) {
      if (typeof window.updateCommittedView === 'function') {
        window.updateCommittedView();
      } else {
        dom.stateCommitted.textContent = renderCommittedText();
        dom.stateCommitted.title = (dom.stateCommitted.textContent !== '—') ? dom.stateCommitted.textContent : '';
        dom.stateCommitted.scrollLeft = dom.stateCommitted.scrollWidth;
      }
      dom.stateCommitted.style.transition = 'color 0.15s ease';
      dom.stateCommitted.style.color = '#ff5252';
      setTimeout(() => {
        if (dom.stateCommitted) dom.stateCommitted.style.color = 'var(--gold-light)';
      }, 400);
    }
  } else if (res.isValid) {
    if (dom.evalStatus) {
      dom.evalStatus.textContent = `成功結算字母: ${res.letter}`;
      dom.evalStatus.style.color = '#ffd700';
    }
    highlightPath(res.sequence, true, engine, dom.antennaShape);
    if (dom.stateCommitted) {
      if (typeof window.updateCommittedView === 'function') {
        window.updateCommittedView();
      } else {
        dom.stateCommitted.textContent = renderCommittedText();
        dom.stateCommitted.title = (dom.stateCommitted.textContent !== '—') ? dom.stateCommitted.textContent : '';
        dom.stateCommitted.scrollLeft = dom.stateCommitted.scrollWidth;
      }
    }
  } else {
    if (dom.evalStatus) {
      dom.evalStatus.textContent = '無效摩斯碼已清除';
      dom.evalStatus.style.color = '#888';
    }
    highlightPath('', false, engine, dom.antennaShape);
  }

  setTimeout(() => {
    highlightPath('', false, engine, dom.antennaShape);
    if (dom.evalStatus) {
      dom.evalStatus.textContent = '等待輸入';
      dom.evalStatus.style.color = '#888';
    }
    if (dom.stateSeq) dom.stateSeq.textContent = '—';
    if (dom.stateLetter) dom.stateLetter.textContent = '—';
    if (dom.meterBar) dom.meterBar.style.width = '0%';
    if (dom.readoutTime) dom.readoutTime.textContent = '0 ms';
    if (dom.readoutSymbol) dom.readoutSymbol.textContent = '無';
  }, 1400);
}
window.finalizeLetter = finalizeLetter;
window.handleKeyDown = handleKeyDown;
window.handleKeyUp = handleKeyUp;

function restartKeying() {
  if (currentMode === 'text') {
    initTextModePassage(dom.textInput.value || textState.rawText);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (dom.evalStatus) {
      dom.evalStatus.innerHTML = '<i class="mdi mdi-restore"></i> 已重新開始發報挑戰！';
      dom.evalStatus.style.color = '#00e5ff';
    }
  } else if (currentMode === 'koch') {
    startKochDrill();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (dom.evalStatus) {
      dom.evalStatus.innerHTML = '<i class="mdi mdi-restore"></i> 已重新開始本關闖關考驗！';
      dom.evalStatus.style.color = '#00e5ff';
    }
  } else {
    engine.reset();
    engine.committedLetters = [];
    if (typeof window.updateCommittedView === 'function') {
      window.updateCommittedView();
    } else if (dom.stateCommitted) {
      dom.stateCommitted.textContent = '—';
      dom.stateCommitted.title = '';
      dom.stateCommitted.scrollLeft = 0;
    }
    if (dom.stateSeq) dom.stateSeq.textContent = '—';
    if (dom.stateLetter) dom.stateLetter.textContent = '—';
    if (dom.evalStatus) {
      dom.evalStatus.innerHTML = '<i class="mdi mdi-restore"></i> 已重設並清除送出文字！';
      dom.evalStatus.style.color = 'var(--gold)';
    }
    highlightPath('', false, engine, dom.antennaShape);
    const clearBtn = document.getElementById('btn-clear-committed');
    if (clearBtn) clearBtn.style.display = 'none';
  }
}

// ----------------------------------------------------
// Mode Switcher
// ----------------------------------------------------
function switchMode(mode) {
  if (currentMode === mode) return;
  currentMode = mode;
  window.currentMode = mode;

  stopAutoPlay();
  if (typeof clearKochTimers === 'function') {
    clearKochTimers();
  }

  // Reset all tabs
  dom.tabModeFree.classList.remove('active');
  dom.tabModeText.classList.remove('active');
  dom.tabModeKoch.classList.remove('active', 'active-koch');

  dom.tabModeFree.style.borderColor = '#363a46';
  dom.tabModeFree.style.background = '#15171d';
  dom.tabModeFree.style.color = '#aaa';

  dom.tabModeText.style.borderColor = '#363a46';
  dom.tabModeText.style.background = '#15171d';
  dom.tabModeText.style.color = '#aaa';

  dom.tabModeKoch.style.borderColor = '#363a46';
  dom.tabModeKoch.style.background = '#15171d';
  dom.tabModeKoch.style.color = '#aaa';

  dom.freeModeContainer.style.display = 'none';
  dom.textModeContainer.style.display = 'none';
  dom.kochModeContainer.style.display = 'none';
  dom.freeModeScenarios.style.display = 'none';

  if (mode === 'free') {
    dom.tabModeFree.classList.add('active');
    dom.tabModeFree.style.borderColor = 'var(--gold)';
    dom.tabModeFree.style.background = '#2a2512';
    dom.tabModeFree.style.color = 'var(--gold-light)';

    dom.freeModeContainer.style.display = 'flex';
    dom.freeModeScenarios.style.display = 'block';

    if (dom.evalStatus) {
      dom.evalStatus.textContent = '自由練習模式 (隨意發報)';
      dom.evalStatus.style.color = '#ffd700';
    }
  } else if (mode === 'text') {
    dom.tabModeText.classList.add('active');
    dom.tabModeText.style.borderColor = 'var(--gold)';
    dom.tabModeText.style.background = '#2a2512';
    dom.tabModeText.style.color = 'var(--gold-light)';

    dom.textModeContainer.style.display = 'flex';
    initTextModePassage(dom.textInput.value || 'SOS CQ');

    if (dom.evalStatus) {
      dom.evalStatus.textContent = '文章挑戰模式 (請依序發報)';
      dom.evalStatus.style.color = '#00e5ff';
    }
  } else if (mode === 'koch') {
    dom.tabModeKoch.classList.add('active', 'active-koch');
    dom.kochModeContainer.style.display = 'flex';

    updateKochUI();
    if (dom.evalStatus) {
      dom.evalStatus.textContent = '科赫闖關模式 (請點擊開始考驗)';
      dom.evalStatus.style.color = '#00e5ff';
    }
  }

  updatePcbKochVisuals();
}

function applySpeedPreset(key, saveToSettings = true) {
  const p = speedPresets[key];
  if (!p) return;

  currentPresetKey = key;
  window.currentPresetKey = key;

  engine.updateConfig({
    unitT: p.unitT,
    threshold: p.threshold,
    letterGap: p.letterGap,
    wordGap: p.wordGap
  });

  synth.setFrequency(p.freq);

  if (dom.paramUnitT) dom.paramUnitT.value = p.unitT;
  if (dom.tagUnitT) dom.tagUnitT.textContent = `${p.unitT}ms`;

  if (dom.paramThreshold) dom.paramThreshold.value = p.threshold;
  if (dom.tagThreshold) dom.tagThreshold.textContent = `${p.threshold}ms`;

  if (dom.paramGap) dom.paramGap.value = p.letterGap;
  if (dom.tagGap) dom.tagGap.textContent = `${p.letterGap}ms`;
  if (dom.gapTotalReadout) dom.gapTotalReadout.textContent = `${p.letterGap} ms`;

  if (dom.paramWordGap) dom.paramWordGap.value = p.wordGap;
  if (dom.tagWordGap) dom.tagWordGap.textContent = `${p.wordGap}ms`;
  if (dom.wordTotalReadout) dom.wordTotalReadout.textContent = `${p.wordGap} ms`;

  if (dom.paramFreq) dom.paramFreq.value = p.freq;
  if (dom.tagFreq) dom.tagFreq.textContent = `${p.freq}Hz`;

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active-preset', btn.dataset.preset === key);
  });

  updateMeterMarkers();

  if (saveToSettings) {
    settingsManager.settings.speedPreset = key;
    settingsManager.settings.unitT = p.unitT;
    settingsManager.settings.threshold = p.threshold;
    settingsManager.settings.letterGap = p.letterGap;
    settingsManager.settings.wordGap = p.wordGap;
    settingsManager.settings.freq = p.freq;
    settingsManager.save();
  }
}

// ----------------------------------------------------
// Settings Application & Initialization
// ----------------------------------------------------
function applyLoadedSettings() {
  const s = settingsManager.load();

  // 1. Timing & Speed
  if (s.speedPreset && speedPresets[s.speedPreset]) {
    applySpeedPreset(s.speedPreset, false);
  } else {
    engine.updateConfig({
      unitT: s.unitT,
      threshold: s.threshold,
      letterGap: s.letterGap,
      wordGap: s.wordGap
    });
    if (dom.paramUnitT) dom.paramUnitT.value = s.unitT;
    if (dom.tagUnitT) dom.tagUnitT.textContent = `${s.unitT}ms`;
    if (dom.paramThreshold) dom.paramThreshold.value = s.threshold;
    if (dom.tagThreshold) dom.tagThreshold.textContent = `${s.threshold}ms`;
    if (dom.paramGap) dom.paramGap.value = s.letterGap;
    if (dom.tagGap) dom.tagGap.textContent = `${s.letterGap}ms`;
    if (dom.paramWordGap) dom.paramWordGap.value = s.wordGap;
    if (dom.tagWordGap) dom.tagWordGap.textContent = `${s.wordGap}ms`;
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.remove('active-preset');
    });
    updateMeterMarkers();
  }

  // 2. CW Frequency
  if (s.freq && dom.paramFreq) {
    dom.paramFreq.value = s.freq;
    synth.setFrequency(s.freq);
    if (dom.tagFreq) dom.tagFreq.textContent = `${s.freq}Hz`;
  }

  // 3. Farnsworth Timing
  const farnsworthWpm = s.farnsworthWpm || 18;
  if (dom.paramFarnsworthWpm) {
    dom.paramFarnsworthWpm.value = farnsworthWpm;
    const t = Math.round(1200 / farnsworthWpm);
    if (dom.tagFarnsworthWpm) dom.tagFarnsworthWpm.textContent = `${farnsworthWpm} WPM (${t}ms)`;
  }
  if (s.farnsworthEnabled !== undefined && dom.chkFarnsworth) {
    dom.chkFarnsworth.checked = s.farnsworthEnabled;
    engine.updateConfig({
      farnsworthEnabled: s.farnsworthEnabled,
      charWpm: farnsworthWpm
    });
    if (dom.farnsworthControls) dom.farnsworthControls.style.display = s.farnsworthEnabled ? 'block' : 'none';
    if (dom.tagFarnsworthStatus) {
      dom.tagFarnsworthStatus.textContent = s.farnsworthEnabled ? '已啟用' : '已關閉';
      dom.tagFarnsworthStatus.style.color = s.farnsworthEnabled ? 'var(--neon-blue)' : '#888';
    }
    updateMeterMarkers();
  }

  // 4. QRN Static Noise
  const qrnVol = (s.qrnVolume !== undefined) ? s.qrnVolume : 0.04;
  if (dom.paramQrnVol) {
    dom.paramQrnVol.value = qrnVol;
    synth.setNoiseVolume(qrnVol);
    const pct = Math.round((qrnVol / 0.10) * 100);
    if (dom.tagQrnVol) dom.tagQrnVol.textContent = `${pct}%`;
  }
  if (s.qrnEnabled !== undefined && dom.chkQrn) {
    dom.chkQrn.checked = s.qrnEnabled;
    synth.setNoiseEnabled(s.qrnEnabled);
    if (dom.qrnControls) dom.qrnControls.style.display = s.qrnEnabled ? 'block' : 'none';
    if (dom.tagQrnStatus) {
      dom.tagQrnStatus.textContent = s.qrnEnabled ? '微底噪運作中' : '已靜音';
      dom.tagQrnStatus.style.color = s.qrnEnabled ? '#ffb703' : '#888';
    }
  }

  // 5. Paddle settings
  if (s.paddleReverse !== undefined && dom.chkPaddleReverse) {
    dom.chkPaddleReverse.checked = s.paddleReverse;
    keyer.setReversed(s.paddleReverse);
    updatePaddleLabels();
  }
  if (s.iambicMode) {
    keyer.setMode(s.iambicMode);
    if (dom.radioModeA && dom.radioModeB) {
      dom.radioModeA.checked = (s.iambicMode === 'A');
      dom.radioModeB.checked = (s.iambicMode === 'B');
    }
  }

  // 6. Keybindings
  if (s.customBindings) {
    keybindingManager.customBindings = s.customBindings;
  }
  if (s.keyProfile) {
    keybindingManager.activeProfile = s.keyProfile;
  }
  keybindingManager.updateUI();

  // 7. Device mode
  if (s.keyerDevice) {
    switchKeyerDevice(s.keyerDevice, false);
  }

  // 8. Hints
  if (s.textShowHints !== undefined && dom.chkShowHints) {
    dom.chkShowHints.checked = s.textShowHints;
    textState.showHints = s.textShowHints;
    document.querySelectorAll('.char-chip .hint-text').forEach(el => {
      el.style.display = s.textShowHints ? '' : 'none';
    });
  }
  if (s.textStrictMode !== undefined && dom.chkStrictMode) {
    dom.chkStrictMode.checked = s.textStrictMode;
    textState.strictMode = s.textStrictMode;
  }
  if (s.kochShowHints !== undefined && dom.chkKochHints) {
    dom.chkKochHints.checked = s.kochShowHints;
    kochState.showHints = s.kochShowHints;
  }

  // 9. Layout Mode (2-Column Focus vs 3-Column Cockpit)
  if (s.layoutMode) {
    setLayoutMode(s.layoutMode);
  }
}

function setLayoutMode(mode) {
  const mainContainer = dom.mainContainer || document.getElementById('main-container');
  const btnLayout2col = dom.btnLayout2col || document.getElementById('btn-layout-2col');
  const btnLayout3col = dom.btnLayout3col || document.getElementById('btn-layout-3col');
  if (!mainContainer) return;

  if (mode === '3col') {
    mainContainer.classList.remove('layout-2col');
    mainContainer.classList.add('layout-3col');
    if (btnLayout3col) btnLayout3col.classList.add('active');
    if (btnLayout2col) btnLayout2col.classList.remove('active');
  } else {
    mainContainer.classList.remove('layout-3col');
    mainContainer.classList.add('layout-2col');
    if (btnLayout2col) btnLayout2col.classList.add('active');
    if (btnLayout3col) btnLayout3col.classList.remove('active');
  }

  if (settingsManager && settingsManager.settings) {
    settingsManager.settings.layoutMode = mode;
    settingsManager.save();
  }

  // Dynamically update CW ribbon canvas resolution
  setTimeout(() => {
    const ribbonCanvas = document.getElementById('cw-ribbon');
    if (ribbonCanvas && ribbonCanvas.parentElement) {
      ribbonCanvas.width = ribbonCanvas.parentElement.clientWidth || 500;
    }
  }, 50);
}

// ----------------------------------------------------
// DOM Events Setup & Bootstrap
// ----------------------------------------------------
function setupEventListeners() {
  // Device Switcher Tabs
  if (dom.devStraight) dom.devStraight.addEventListener('click', () => switchKeyerDevice('straight'));
  if (dom.devPaddle) dom.devPaddle.addEventListener('click', () => switchKeyerDevice('paddle'));
  if (dom.devBug) dom.devBug.addEventListener('click', () => switchKeyerDevice('bug'));

  // Paddle Reverse & Iambic Modes
  if (dom.chkPaddleReverse) {
    dom.chkPaddleReverse.addEventListener('change', (e) => {
      keyer.setReversed(e.target.checked);
      updatePaddleLabels();
      settingsManager.settings.paddleReverse = e.target.checked;
      settingsManager.save();
    });
  }

  document.querySelectorAll('input[name="iambic-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        keyer.setMode(e.target.value);
        settingsManager.settings.iambicMode = e.target.value;
        settingsManager.save();
      }
    });
  });

  // Key Profile Buttons
  document.querySelectorAll('.key-profile-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prof = btn.dataset.profile;
      if (prof) keybindingManager.setProfile(prof);
    });
  });

  // Custom Key Binding Buttons
  const btnBindStraight = document.getElementById('btn-bind-straight');
  const btnBindDit = document.getElementById('btn-bind-dit');
  const btnBindDah = document.getElementById('btn-bind-dah');
  const btnFactoryReset = document.getElementById('btn-factory-reset');

  if (btnBindStraight) btnBindStraight.addEventListener('click', () => keybindingManager.startRecording('straight'));
  if (btnBindDit) btnBindDit.addEventListener('click', () => keybindingManager.startRecording('dit'));
  if (btnBindDah) btnBindDah.addEventListener('click', () => keybindingManager.startRecording('dah'));
  if (btnFactoryReset) {
    btnFactoryReset.addEventListener('click', () => {
      if (confirm('確定要將所有自訂設定（速度、音訊、鍵位、電鍵模式）恢復為出廠預設值嗎？')) {
        settingsManager.reset();
        window.location.reload();
      }
    });
  }

  // Pointer Events on Dual Paddles
  if (dom.paddleLeft) {
    dom.paddleLeft.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { dom.paddleLeft.setPointerCapture(e.pointerId); } catch(_) {}
      dom.paddleLeft.classList.add('active');
      keyer.setPhysicalContact('left', true);
    });
    dom.paddleLeft.addEventListener('pointerup', (e) => {
      e.preventDefault();
      dom.paddleLeft.classList.remove('active');
      keyer.setPhysicalContact('left', false);
    });
    dom.paddleLeft.addEventListener('pointercancel', () => {
      dom.paddleLeft.classList.remove('active');
      keyer.setPhysicalContact('left', false);
    });
  }

  if (dom.paddleRight) {
    dom.paddleRight.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { dom.paddleRight.setPointerCapture(e.pointerId); } catch(_) {}
      dom.paddleRight.classList.add((keyer.reversed && currentKeyerDevice !== 'bug') ? 'active' : 'active-dah');
      keyer.setPhysicalContact('right', true);
    });
    dom.paddleRight.addEventListener('pointerup', (e) => {
      e.preventDefault();
      dom.paddleRight.classList.remove('active', 'active-dah');
      keyer.setPhysicalContact('right', false);
    });
    dom.paddleRight.addEventListener('pointercancel', () => {
      dom.paddleRight.classList.remove('active', 'active-dah');
      keyer.setPhysicalContact('right', false);
    });
  }

  // Pointer Events on Virtual Straight Key
  if (dom.keyTrigger) {
    dom.keyTrigger.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handleKeyDown();
    });
  }
  window.addEventListener('pointerup', () => {
    if (currentKeyerDevice === 'straight') {
      handleKeyUp();
    }
  });
  window.addEventListener('pointercancel', () => {
    if (currentKeyerDevice === 'straight') {
      handleKeyUp();
    }
  });

  // Global Keyboard Routing
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (keybindingManager.recordingTarget) {
      e.preventDefault();
      e.stopPropagation();
      keybindingManager.recordKey(e.code);
      return;
    }

    // Shortcut 'Escape': Stop drill if running
    if (e.key === 'Escape') {
      if (currentMode === 'koch' && kochState && kochState.running && typeof stopKochDrill === 'function') {
        e.preventDefault();
        stopKochDrill();
        return;
      }
    }

    // Shortcut 'R': Restart drill / challenge
    if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
      e.preventDefault();
      restartKeying();
      return;
    }

    // Koch Mode Pure-Keyboard Flow (Enter to start/next)
    if (currentMode === 'koch') {
      if (kochState.isFinished && dom.btnKochNextStage && dom.btnKochNextStage.style.display !== 'none') {
        if (e.key === 'Enter' || e.key === 'n' || e.key === 'N' || e.code === 'KeyN') {
          e.preventDefault();
          dom.btnKochNextStage.click();
          return;
        }
      } else if (!kochState.running && e.key === 'Enter') {
        e.preventDefault();
        startKochDrill();
        return;
      }
    }

    if (currentKeyerDevice === 'straight') {
      if (keybindingManager.isStraight(e)) {
        e.preventDefault();
        handleKeyDown();
      }
    } else if (currentKeyerDevice === 'paddle' || currentKeyerDevice === 'bug') {
      if (keybindingManager.isDit(e)) {
        e.preventDefault();
        if (dom.paddleLeft) dom.paddleLeft.classList.add('active');
        keyer.setPhysicalContact('left', true);
      } else if (keybindingManager.isDah(e)) {
        e.preventDefault();
        if (dom.paddleRight) dom.paddleRight.classList.add((keyer.reversed && currentKeyerDevice !== 'bug') ? 'active' : 'active-dah');
        keyer.setPhysicalContact('right', true);
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (currentKeyerDevice === 'straight') {
      if (keybindingManager.isStraight(e)) {
        e.preventDefault();
        handleKeyUp();
      }
    } else if (currentKeyerDevice === 'paddle' || currentKeyerDevice === 'bug') {
      if (keybindingManager.isDit(e)) {
        e.preventDefault();
        if (dom.paddleLeft) dom.paddleLeft.classList.remove('active');
        keyer.setPhysicalContact('left', false);
      } else if (keybindingManager.isDah(e)) {
        e.preventDefault();
        if (dom.paddleRight) dom.paddleRight.classList.remove('active', 'active-dah');
        keyer.setPhysicalContact('right', false);
      }
    }
  });

  // Settings Sliders
  if (dom.paramUnitT) {
    dom.paramUnitT.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      engine.updateConfig({ unitT: val });
      if (dom.tagUnitT) dom.tagUnitT.textContent = `${val}ms`;
      updateMeterMarkers();
      settingsManager.settings.unitT = val;
      settingsManager.settings.speedPreset = null;
      settingsManager.save();
    });
  }

  if (dom.paramThreshold) {
    dom.paramThreshold.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      engine.updateConfig({ threshold: val });
      if (dom.tagThreshold) dom.tagThreshold.textContent = `${val}ms`;
      updateMeterMarkers();
      settingsManager.settings.threshold = val;
      settingsManager.settings.speedPreset = null;
      settingsManager.save();
    });
  }

  if (dom.paramGap) {
    dom.paramGap.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      engine.updateConfig({ letterGap: val });
      if (dom.tagGap) dom.tagGap.textContent = `${val}ms`;
      if (dom.gapTotalReadout) dom.gapTotalReadout.textContent = `${val} ms`;
      settingsManager.settings.letterGap = val;
      settingsManager.settings.speedPreset = null;
      settingsManager.save();
    });
  }

  if (dom.paramWordGap) {
    dom.paramWordGap.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      engine.updateConfig({ wordGap: val });
      if (dom.tagWordGap) dom.tagWordGap.textContent = `${val}ms`;
      if (dom.wordTotalReadout) dom.wordTotalReadout.textContent = `${val} ms`;
      settingsManager.settings.wordGap = val;
      settingsManager.settings.speedPreset = null;
      settingsManager.save();
    });
  }

  if (dom.paramFreq) {
    dom.paramFreq.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      synth.setFrequency(val);
      if (dom.tagFreq) dom.tagFreq.textContent = `${val}Hz`;
      settingsManager.settings.freq = val;
      settingsManager.save();
    });
  }

  // Farnsworth Listeners
  if (dom.chkFarnsworth) {
    dom.chkFarnsworth.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      engine.updateConfig({ farnsworthEnabled: enabled });
      if (dom.farnsworthControls) dom.farnsworthControls.style.display = enabled ? 'block' : 'none';
      if (dom.tagFarnsworthStatus) {
        dom.tagFarnsworthStatus.textContent = enabled ? '已啟用' : '已關閉';
        dom.tagFarnsworthStatus.style.color = enabled ? 'var(--neon-blue)' : '#888';
      }
      updateMeterMarkers();
      settingsManager.settings.farnsworthEnabled = enabled;
      settingsManager.save();
    });
  }

  if (dom.paramFarnsworthWpm) {
    dom.paramFarnsworthWpm.addEventListener('input', (e) => {
      const wpm = parseInt(e.target.value);
      engine.updateConfig({ charWpm: wpm });
      const t = Math.round(1200 / wpm);
      if (dom.tagFarnsworthWpm) dom.tagFarnsworthWpm.textContent = `${wpm} WPM (${t}ms)`;
      updateMeterMarkers();
      settingsManager.settings.farnsworthWpm = wpm;
      settingsManager.save();
    });
  }

  // QRN Listeners
  if (dom.chkQrn) {
    dom.chkQrn.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      synth.setNoiseEnabled(enabled);
      if (dom.qrnControls) dom.qrnControls.style.display = enabled ? 'block' : 'none';
      if (dom.tagQrnStatus) {
        dom.tagQrnStatus.textContent = enabled ? '微底噪運作中' : '已靜音';
        dom.tagQrnStatus.style.color = enabled ? '#ffb703' : '#888';
      }
      settingsManager.settings.qrnEnabled = enabled;
      settingsManager.save();
    });
  }

  if (dom.paramQrnVol) {
    dom.paramQrnVol.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      synth.setNoiseVolume(vol);
      const pct = Math.round((vol / 0.10) * 100);
      if (dom.tagQrnVol) dom.tagQrnVol.textContent = `${pct}%`;
      settingsManager.settings.qrnVolume = vol;
      settingsManager.save();
    });
  }

  // Speed Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.preset;
      if (key) applySpeedPreset(key);
    });
  });

  const btnResetSettings = document.getElementById('reset-settings-btn');
  if (btnResetSettings) {
    btnResetSettings.addEventListener('click', () => applySpeedPreset('intermediate'));
  }

  // Mode Tabs
  if (dom.tabModeFree) dom.tabModeFree.addEventListener('click', () => switchMode('free'));
  if (dom.tabModeText) dom.tabModeText.addEventListener('click', () => switchMode('text'));
  if (dom.tabModeKoch) dom.tabModeKoch.addEventListener('click', () => switchMode('koch'));

  // Koch Mode Controls
  document.querySelectorAll('.koch-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const m = tab.dataset.mode || 'quick';
      if (typeof setKochAssessmentMode === 'function') {
        setKochAssessmentMode(m);
      }
    });
  });

  if (dom.btnStartKochDrill) dom.btnStartKochDrill.addEventListener('click', () => startKochDrill());
  if (dom.btnStopKochDrill) dom.btnStopKochDrill.addEventListener('click', () => stopKochDrill());
  if (dom.btnStopKochPanel) dom.btnStopKochPanel.addEventListener('click', () => stopKochDrill());
  if (dom.btnStopKochHud) dom.btnStopKochHud.addEventListener('click', () => stopKochDrill());
  if (dom.btnKochRetry) dom.btnKochRetry.addEventListener('click', () => startKochDrill());

  if (dom.btnLayout2col) dom.btnLayout2col.addEventListener('click', () => setLayoutMode('2col'));
  if (dom.btnLayout3col) dom.btnLayout3col.addEventListener('click', () => setLayoutMode('3col'));

  if (dom.btnKochNextStage) {
    dom.btnKochNextStage.addEventListener('click', () => {
      if (kochManager.currentLevel < kochManager.maxUnlockedLevel) {
        kochManager.currentLevel++;
      } else if (kochManager.currentLevel < 35) {
        kochManager.currentLevel = kochManager.maxUnlockedLevel;
      }
      updateKochUI();
      updatePcbKochVisuals();
      startKochDrill();
    });
  }

  if (dom.btnResetKoch) {
    dom.btnResetKoch.addEventListener('click', () => {
      if (confirm('確定要將科赫進度重設至第 1 關 (K & M) 嗎？')) {
        kochManager.resetProgress();
        updateKochUI();
        updatePcbKochVisuals();
        if (dom.kochScorecard) dom.kochScorecard.style.display = 'none';
        if (dom.kochDrillPanel) dom.kochDrillPanel.style.display = 'none';
        if (dom.evalStatus) {
          dom.evalStatus.textContent = '科赫進度已重設至第 1 關';
          dom.evalStatus.style.color = '#ffd700';
        }
      }
    });
  }

  if (dom.kochStageSelect) {
    dom.kochStageSelect.addEventListener('change', (e) => {
      kochManager.currentLevel = parseInt(e.target.value, 10);
      updateKochUI();
      updatePcbKochVisuals();
      if (dom.kochScorecard) dom.kochScorecard.style.display = 'none';
      if (dom.kochDrillPanel) dom.kochDrillPanel.style.display = 'none';
    });
  }

  if (dom.btnKochTargetListen) {
    dom.btnKochTargetListen.addEventListener('click', () => {
      const char = kochManager.getTargetChar();
      const seq = engine.getSequenceForLetter(char);
      if (char && seq) {
        replayLetter(char, seq);
      }
    });
  }

  if (dom.btnKochListenK) {
    dom.btnKochListenK.addEventListener('click', () => {
      replayLetter('K', '-.-');
    });
  }

  if (dom.btnKochListenM) {
    dom.btnKochListenM.addEventListener('click', () => {
      replayLetter('M', '--');
    });
  }

  if (dom.chkKochHints) {
    dom.chkKochHints.addEventListener('change', (e) => {
      kochState.showHints = e.target.checked;
      document.querySelectorAll('#koch-passage-container .char-chip .hint-text').forEach(el => {
        el.style.display = kochState.showHints ? '' : 'none';
      });
      if (kochState.currentIndex < kochState.targetChars.length) {
        const target = kochState.targetChars[kochState.currentIndex];
        if (dom.kochFbTarget) {
          dom.kochFbTarget.textContent = kochState.showHints
            ? `${target} (${engine.getSequenceForLetter(target) || ''})`
            : target;
        }
      }
      settingsManager.settings.kochShowHints = e.target.checked;
      settingsManager.save();
    });
  }

  // Text Mode Controls
  if (dom.btnApplyText) {
    dom.btnApplyText.addEventListener('click', () => {
      initTextModePassage(dom.textInput.value);
    });
  }
  if (dom.textInput) {
    dom.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        initTextModePassage(dom.textInput.value);
      }
    });
  }

  document.querySelectorAll('.sample-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      if (dom.textInput) dom.textInput.value = pill.dataset.text;
      initTextModePassage(pill.dataset.text);
    });
  });

  if (dom.btnPlayAuto) dom.btnPlayAuto.addEventListener('click', () => startAutoPlay());
  if (dom.btnPauseAuto) dom.btnPauseAuto.addEventListener('click', () => pauseAutoPlay());
  if (dom.btnStopAuto) dom.btnStopAuto.addEventListener('click', () => stopAutoPlay());
  if (dom.btnRestartText) dom.btnRestartText.addEventListener('click', () => restartKeying());

  if (dom.chkShowHints) {
    dom.chkShowHints.addEventListener('change', (e) => {
      textState.showHints = e.target.checked;
      document.querySelectorAll('.char-chip .hint-text').forEach(el => {
        el.style.display = textState.showHints ? '' : 'none';
      });
      settingsManager.settings.textShowHints = e.target.checked;
      settingsManager.save();
    });
  }

  if (dom.chkStrictMode) {
    dom.chkStrictMode.addEventListener('change', (e) => {
      textState.strictMode = e.target.checked;
      settingsManager.settings.textStrictMode = e.target.checked;
      settingsManager.save();
    });
  }

  if (dom.btnScorecardRetry) {
    dom.btnScorecardRetry.addEventListener('click', () => {
      initTextModePassage(textState.rawText);
    });
  }

  if (dom.btnRetryErrors) {
    dom.btnRetryErrors.addEventListener('click', () => {
      const wrongChars = textState.charResults
        .filter(r => r && !r.isCorrect && r.char !== ' ')
        .map(r => r.char);
      if (wrongChars.length > 0 && dom.textInput) {
        dom.textInput.value = wrongChars.join(' ');
        initTextModePassage(dom.textInput.value);
      }
    });
  }

  // Auto-fit CW ribbon canvas resolution on window resize
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const ribbonCanvas = document.getElementById('cw-ribbon');
      if (ribbonCanvas && ribbonCanvas.parentElement) {
        ribbonCanvas.width = ribbonCanvas.parentElement.clientWidth || 500;
      }
    }, 100);
  });
}

// ----------------------------------------------------
// Startup / Bootstrap
// ----------------------------------------------------
function initApp() {
  initDomReferences();
  setupWorkspaceNavigation();
  setupK5Dock();
  ribbon = new CWRibbon('cw-ribbon', engine);
  window.ribbon = ribbon;

  setupKeyerCallbacks();
  setupEventListeners();

  renderCardSvg(dom.wiresLayer, dom.nodesLayer, engine, replayLetter);
  applyLoadedSettings();
  setupScenarios(engine, replayLetter);
  initTextModePassage(dom.textInput ? dom.textInput.value : 'SOS CQ');
  updateKochUI();
  if (typeof setupCommittedClear === 'function') setupCommittedClear(engine);
  if (typeof updateCommittedView === 'function') updateCommittedView();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    engine,
    synth,
    keyer,
    keybindingManager,
    settingsManager,
    kochManager,
    initApp
  };
}


// ----------------------------------------------------
// Three-Zone Shell & Workspace Navigation (Tx / Rx / QSO)
// ----------------------------------------------------

// ----------------------------------------------------
// K5 Ergonomic Morphing Dock Controller
// ----------------------------------------------------
function setupK5Dock() {
  const wingLeft = document.getElementById('k5-wing-left');
  const wingRight = document.getElementById('k5-wing-right');
  const pillPaddle = document.getElementById('k5-pill-paddle');
  const pillStraight = document.getElementById('k5-pill-straight');
  const pillBug = document.getElementById('k5-pill-bug');
  const wpmMinus = document.getElementById('k5-wpm-minus');
  const wpmPlus = document.getElementById('k5-wpm-plus');
  const wpmVal = document.getElementById('k5-wpm-val');
  const revToggle = document.getElementById('k5-reverse-toggle');

  if (!wingLeft || !wingRight) return;

  const pills = [
    { el: pillPaddle, mode: 'paddle' },
    { el: pillStraight, mode: 'straight' },
    { el: pillBug, mode: 'bug' }
  ];

  pills.forEach(p => {
    if (!p.el) return;
    p.el.addEventListener('click', () => {
      switchKeyerDevice(p.mode);
    });
  });

  if (wpmMinus) {
    wpmMinus.addEventListener('click', () => {
      const current = (engine && typeof engine.getBaselineWpm === 'function') ? engine.getBaselineWpm() : 20;
      setWpmFromStepper(current - 1);
    });
  }

  if (wpmPlus) {
    wpmPlus.addEventListener('click', () => {
      const current = (engine && typeof engine.getBaselineWpm === 'function') ? engine.getBaselineWpm() : 20;
      setWpmFromStepper(current + 1);
    });
  }

  if (revToggle) {
    revToggle.addEventListener('click', () => {
      const nextRev = !keyer.reversed;
      keyer.setReversed(nextRev);
      revToggle.classList.toggle('active', nextRev);
      const chkReverse = document.getElementById('chk-paddle-reverse');
      if (chkReverse) chkReverse.checked = nextRev;
      if (settingsManager && settingsManager.settings) {
        settingsManager.settings.paddleReverse = nextRev;
        settingsManager.save();
      }
      updatePaddleLabels();
      updateK5MorphingUI();
    });
  }

  function bindWing(wingEl, side) {
    let isPressed = false;

    function onDown(e) {
      e.preventDefault();
      if (isPressed) return;
      isPressed = true;
      wingEl.classList.add('active');

      if (currentKeyerDevice === 'straight') {
        handleKeyDown();
      } else if (currentKeyerDevice === 'paddle' || currentKeyerDevice === 'bug') {
        keyer.setPhysicalContact(side, true);
      }
    }

    function onUp(e) {
      if (!isPressed) return;
      isPressed = false;
      wingEl.classList.remove('active');

      if (currentKeyerDevice === 'straight') {
        handleKeyUp();
      } else if (currentKeyerDevice === 'paddle' || currentKeyerDevice === 'bug') {
        keyer.setPhysicalContact(side, false);
      }
    }

    wingEl.addEventListener('pointerdown', onDown);
    wingEl.addEventListener('pointerup', onUp);
    wingEl.addEventListener('pointerleave', onUp);
    wingEl.addEventListener('pointercancel', onUp);
  }

  bindWing(wingLeft, 'left');
  bindWing(wingRight, 'right');

  updateK5MorphingUI();
}

function setWpmFromStepper(wpm) {
  const clamped = Math.max(10, Math.min(40, wpm));
  const t = Math.round(1200 / clamped);
  engine.updateConfig({
    unitT: t,
    threshold: Math.round(t * 2),
    letterGap: Math.round(t * 3),
    wordGap: Math.round(t * 7)
  });
  if (dom.paramUnitT) dom.paramUnitT.value = t;
  if (dom.tagUnitT) dom.tagUnitT.textContent = `${t}ms`;
  if (dom.paramThreshold) dom.paramThreshold.value = Math.round(t * 2);
  if (dom.tagThreshold) dom.tagThreshold.textContent = `${Math.round(t * 2)}ms`;
  if (dom.paramGap) dom.paramGap.value = Math.round(t * 3);
  if (dom.tagGap) dom.tagGap.textContent = `${Math.round(t * 3)}ms`;
  if (dom.paramWordGap) dom.paramWordGap.value = Math.round(t * 7);
  if (dom.tagWordGap) dom.tagWordGap.textContent = `${Math.round(t * 7)}ms`;
  if (typeof updateMeterMarkers === 'function') updateMeterMarkers();

  const k5WpmVal = document.getElementById('k5-wpm-val');
  if (k5WpmVal) k5WpmVal.textContent = `${clamped} WPM`;
  const topbarWpmVal = document.getElementById('topbar-wpm-val');
  if (topbarWpmVal) topbarWpmVal.textContent = clamped;
  const stateWpm = document.getElementById('state-wpm');
  if (stateWpm) stateWpm.textContent = `(${clamped} WPM)`;
  const readoutWpm = document.getElementById('readout-wpm');
  if (readoutWpm) readoutWpm.textContent = `(${clamped} WPM)`;
  const meterBadge = document.getElementById('meter-wpm-badge');
  if (meterBadge) meterBadge.textContent = `即時 ${clamped} WPM`;

  if (settingsManager && settingsManager.settings) {
    settingsManager.settings.unitT = t;
    settingsManager.settings.threshold = Math.round(t * 2);
    settingsManager.settings.letterGap = Math.round(t * 3);
    settingsManager.settings.wordGap = Math.round(t * 7);
    settingsManager.save();
  }
}

function updateK5MorphingUI() {
  const wingLeft = document.getElementById('k5-wing-left');
  const wingRight = document.getElementById('k5-wing-right');
  const leftSym = document.getElementById('k5-left-sym');
  const leftTitle = document.getElementById('k5-left-title');
  const leftHint = document.getElementById('k5-left-hint');
  const rightSym = document.getElementById('k5-right-sym');
  const rightTitle = document.getElementById('k5-right-title');
  const rightHint = document.getElementById('k5-right-hint');
  const modeBadge = document.getElementById('k5-mode-badge');
  const revToggle = document.getElementById('k5-reverse-toggle');
  const k5WpmVal = document.getElementById('k5-wpm-val');

  const pillPaddle = document.getElementById('k5-pill-paddle');
  const pillStraight = document.getElementById('k5-pill-straight');
  const pillBug = document.getElementById('k5-pill-bug');

  if (!wingLeft || !wingRight) return;

  if (pillPaddle) pillPaddle.classList.toggle('active', currentKeyerDevice === 'paddle');
  if (pillStraight) pillStraight.classList.toggle('active', currentKeyerDevice === 'straight');
  if (pillBug) pillBug.classList.toggle('active', currentKeyerDevice === 'bug');

  if (revToggle) {
    revToggle.classList.toggle('active', !!keyer.reversed);
  }

  if (k5WpmVal && engine && typeof engine.getBaselineWpm === 'function') {
    k5WpmVal.textContent = `${engine.getBaselineWpm()} WPM`;
  }

  if (currentKeyerDevice === 'straight') {
    wingLeft.style.borderLeft = '3px solid var(--gold)';
    wingLeft.style.borderBottom = '3px solid var(--gold)';
    if (leftSym) {
      leftSym.innerHTML = '<i class="mdi mdi-ray-vertex"></i>';
      leftSym.style.color = 'var(--gold)';
    }
    if (leftTitle) leftTitle.textContent = '直鍵 (左手)';
    if (leftHint) leftHint.textContent = '空白鍵 / 點擊長短音';

    wingRight.style.borderRight = '3px solid var(--gold)';
    wingRight.style.borderBottom = '3px solid var(--gold)';
    if (rightSym) {
      rightSym.innerHTML = '<i class="mdi mdi-ray-vertex"></i>';
      rightSym.style.color = 'var(--gold)';
    }
    if (rightTitle) rightTitle.textContent = '直鍵 (右手)';
    if (rightHint) rightHint.textContent = '空白鍵 / 點擊長短音';

    if (modeBadge) modeBadge.textContent = '直鍵手電鍵';
  } else if (currentKeyerDevice === 'bug') {
    wingLeft.style.borderLeft = '3px solid var(--neon-blue)';
    wingLeft.style.borderBottom = '3px solid var(--neon-blue)';
    if (leftSym) {
      leftSym.innerHTML = '<i class="mdi mdi-sine-wave"></i>';
      leftSym.style.color = 'var(--neon-blue)';
    }
    if (leftTitle) leftTitle.textContent = '機械連點';
    if (leftHint) leftHint.textContent = '彈簧震動 Dit (F)';

    wingRight.style.borderRight = '3px solid var(--gold)';
    wingRight.style.borderBottom = '3px solid var(--gold)';
    if (rightSym) {
      rightSym.innerHTML = '<i class="mdi mdi-hand-pointing-right"></i>';
      rightSym.style.color = 'var(--gold)';
    }
    if (rightTitle) rightTitle.textContent = '手動長音';
    if (rightHint) rightHint.textContent = '手動長劃 Dah (J)';

    if (modeBadge) modeBadge.textContent = '震報鍵 Bug';
  } else {
    const isRev = !!keyer.reversed;
    if (isRev) {
      wingLeft.style.borderLeft = '3px solid var(--gold)';
      wingLeft.style.borderBottom = '3px solid var(--gold)';
      if (leftSym) {
        leftSym.textContent = '—';
        leftSym.style.color = 'var(--gold)';
      }
      if (leftTitle) leftTitle.textContent = '劃 Dah';
      if (leftHint) leftHint.textContent = '鍵盤 J / 點擊';

      wingRight.style.borderRight = '3px solid var(--neon-blue)';
      wingRight.style.borderBottom = '3px solid var(--neon-blue)';
      if (rightSym) {
        rightSym.textContent = '·';
        rightSym.style.color = 'var(--neon-blue)';
      }
      if (rightTitle) rightTitle.textContent = '點 Dit';
      if (rightHint) rightHint.textContent = '鍵盤 F / 點擊';
    } else {
      wingLeft.style.borderLeft = '3px solid var(--neon-blue)';
      wingLeft.style.borderBottom = '3px solid var(--neon-blue)';
      if (leftSym) {
        leftSym.textContent = '·';
        leftSym.style.color = 'var(--neon-blue)';
      }
      if (leftTitle) leftTitle.textContent = '點 Dit';
      if (leftHint) leftHint.textContent = '鍵盤 F / 點擊';

      wingRight.style.borderRight = '3px solid var(--gold)';
      wingRight.style.borderBottom = '3px solid var(--gold)';
      if (rightSym) {
        rightSym.textContent = '—';
        rightSym.style.color = 'var(--gold)';
      }
      if (rightTitle) rightTitle.textContent = '劃 Dah';
      if (rightHint) rightHint.textContent = '鍵盤 J / 點擊';
    }
    if (modeBadge) modeBadge.textContent = '雙撥片 Mode ' + (keyer.mode || 'B');
  }
}

function setupWorkspaceNavigation() {
  const wsTabs = [
    { btnId: 'ws-tab-tx', viewId: 'ws-container-tx' },
    { btnId: 'ws-tab-rx', viewId: 'ws-container-rx' },
    { btnId: 'ws-tab-qso', viewId: 'ws-container-qso' }
  ];

  wsTabs.forEach(item => {
    const btn = document.getElementById(item.btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      wsTabs.forEach(t => {
        const b = document.getElementById(t.btnId);
        const v = document.getElementById(t.viewId);
        if (b) b.classList.remove('active');
        if (v) {
          v.style.display = 'none';
          v.classList.remove('active');
        }
      });
      btn.classList.add('active');
      const targetView = document.getElementById(item.viewId);
      if (targetView) {
        targetView.style.display = 'flex';
        targetView.classList.add('active');
      }
    });
  });

  // Settings Drawer Toggle
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const drawer = document.getElementById('settings-drawer');
  const backdrop = document.getElementById('settings-drawer-backdrop');

  function openDrawer() {
    if (drawer) drawer.style.display = 'flex';
    if (backdrop) backdrop.style.display = 'block';
  }
  function closeDrawer() {
    if (drawer) drawer.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';
  }

  if (btnOpenSettings) btnOpenSettings.addEventListener('click', openDrawer);
  if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // Sync WPM in Top Bar
  window.updateTopbarWpm = function(wpm) {
    const valEl = document.getElementById('topbar-wpm-val');
    if (valEl) valEl.textContent = wpm;
  };
}
