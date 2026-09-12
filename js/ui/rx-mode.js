/**
 * RX COPYING WORKSPACE CONTROLLER: rx-mode.js
 * 聽力抄收工作台控制器、狀態機、評測模型與傳輸調度控制項
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Architecture)
 */

class RxMode {
  constructor(options = {}) {
    this.cwPlayer = options.cwPlayer || (typeof window !== 'undefined' ? window.cwPlayer : null);
    this.submode = options.submode || 'koch'; // 'koch' | 'callsign' | 'groups' | 'qcodes'
    this.state = 'IDLE'; // 'IDLE' | 'READY' | 'PLAYING' | 'WAITING_INPUT' | 'EVALUATED' | 'COMPLETED'
    this.blindMode = (options.blindMode !== undefined) ? !!options.blindMode : true;
    this.autoAdvance = (options.autoAdvance !== undefined) ? !!options.autoAdvance : false;
    this.totalTrials = options.totalTrials || 10;
    this.currentTrialIndex = 0;
    this.trials = [];
    this.currentTrial = null;
    this.inputBuffer = '';
    this.confusionMatrix = {}; // { 'B->D': 2 }
    this.customQueue = null;

    this._boundKeyDown = null;
    this._initialized = false;
  }

  now() {
    return (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now();
  }

  init() {
    if (typeof document === 'undefined') return;

    // Cache elements
    this.el = {
      wsContainer: document.getElementById('ws-container-rx'),
      navPills: document.querySelectorAll('.rx-mode-pill'),
      progressBadge: document.getElementById('rx-progress-badge'),
      wpmBadge: document.getElementById('rx-wpm-badge'),
      chkAutoAdvance: document.getElementById('chk-rx-auto-advance'),
      chkBlindMode: document.getElementById('chk-rx-blind-mode'),
      visualCue: document.getElementById('rx-visual-cue'),
      audioIndicator: document.getElementById('rx-audio-indicator'),
      audioStatusText: document.getElementById('rx-audio-status-text'),
      btnStart: document.getElementById('btn-rx-start'),
      btnStop: document.getElementById('btn-rx-stop'),
      btnReplay: document.getElementById('btn-rx-replay'),
      btnSkip: document.getElementById('btn-rx-skip'),
      btnNext: document.getElementById('btn-rx-next'),
      btnRestart: document.getElementById('btn-rx-restart'),
      inputDisplay: document.getElementById('rx-input-display'),
      inputBuffer: document.getElementById('rx-input-buffer'),
      feedbackMsg: document.getElementById('rx-feedback-msg'),
      historyLog: document.getElementById('rx-history-log'),
      scorecard: document.getElementById('rx-scorecard'),
      scModeTag: document.getElementById('rx-sc-mode-tag'),
      scAccuracy: document.getElementById('rx-sc-accuracy'),
      scWpm: document.getElementById('rx-sc-wpm'),
      scLatency: document.getElementById('rx-sc-latency'),
      scTotal: document.getElementById('rx-sc-total'),
      scConfusionBox: document.getElementById('rx-sc-confusion-box'),
      scConfusionList: document.getElementById('rx-sc-confusion-list'),
      btnRetryErrors: document.getElementById('btn-rx-retry-errors'),
      btnNextRound: document.getElementById('btn-rx-next-round'),
      softKeypad: document.getElementById('rx-soft-keypad')
    };

    // 1. Submode Navigation Pills
    if (this.el.navPills) {
      this.el.navPills.forEach(pill => {
        pill.addEventListener('click', () => {
          const submode = pill.dataset.submode || 'koch';
          this.setSubmode(submode);
          this.startSession(submode);
        });
      });
    }

    // 2. Transport Control Buttons
    if (this.el.btnStart) {
      this.el.btnStart.addEventListener('click', () => this.startAudio());
    }
    if (this.el.btnStop) {
      this.el.btnStop.addEventListener('click', () => this.stopAudio());
    }
    if (this.el.btnReplay) {
      this.el.btnReplay.addEventListener('click', () => this.replayAudio());
    }
    if (this.el.btnSkip) {
      this.el.btnSkip.addEventListener('click', () => this.skipTrial());
    }
    if (this.el.btnNext) {
      this.el.btnNext.addEventListener('click', () => this.advanceToNextTrial());
    }
    if (this.el.btnRestart) {
      this.el.btnRestart.addEventListener('click', () => this.restartSession());
    }
    if (this.el.btnRetryErrors) {
      this.el.btnRetryErrors.addEventListener('click', () => this.retryErrors());
    }
    if (this.el.btnNextRound) {
      this.el.btnNextRound.addEventListener('click', () => this.startSession(this.submode));
    }

    // 3. Option Switches
    if (this.el.chkAutoAdvance) {
      this.el.chkAutoAdvance.addEventListener('change', (e) => {
        this.autoAdvance = e.target.checked;
      });
      this.autoAdvance = this.el.chkAutoAdvance.checked;
    }
    if (this.el.chkBlindMode) {
      this.el.chkBlindMode.addEventListener('change', (e) => {
        this.updateBlindMode(e.target.checked);
      });
      this.updateBlindMode(this.el.chkBlindMode.checked);
    }

    // 4. Zone 3 Soft Keypad (Touch / Click)
    if (this.el.softKeypad) {
      this.el.softKeypad.addEventListener('click', (e) => {
        const btn = e.target.closest('.keypad-key');
        if (!btn) return;
        const key = btn.dataset.key;
        if (key) {
          this.handleKey(key);
        }
      });
    }

    // 5. Desktop Physical Keyboard Global Capture
    if (!this._keyboardListenerAttached && typeof window !== 'undefined') {
      this._boundKeyDown = (e) => {
        if (!this.isWorkspaceActive()) return;

        // Space -> Play / Replay
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          if (this.state === 'READY') {
            this.startAudio();
          } else if (this.state === 'PLAYING' || this.state === 'WAITING_INPUT' || this.state === 'EVALUATED') {
            this.replayAudio();
          }
          return;
        }

        // Escape -> Stop / Skip
        if (e.key === 'Escape') {
          e.preventDefault();
          if (this.state === 'PLAYING') {
            this.stopAudio();
          } else if (this.state === 'WAITING_INPUT') {
            this.skipTrial();
          }
          return;
        }

        // Backspace -> Delete
        if (e.key === 'Backspace') {
          e.preventDefault();
          this.handleKey('Backspace');
          return;
        }

        // Enter -> Submit Answer or Advance to Next Trial
        if (e.key === 'Enter') {
          e.preventDefault();
          if (this.state === 'EVALUATED') {
            this.advanceToNextTrial();
          } else if (this.state === 'WAITING_INPUT' || this.state === 'PLAYING') {
            this.submitAnswer();
          }
          return;
        }

        // Alphanumeric keys
        if (/^[a-zA-Z0-9]$/.test(e.key)) {
          e.preventDefault();
          this.handleKey(e.key.toUpperCase());
        }
      };

      window.addEventListener('keydown', this._boundKeyDown);
      this._keyboardListenerAttached = true;
    }

    // 6. Hook CWPlayer pulse events to CWRibbon oscilloscope
    if (this.cwPlayer) {
      this.attachPlayerHooks(this.cwPlayer);
    }

    this._initialized = true;
    this.updateButtonsState();
  }

  attachPlayerHooks(player) {
    if (!player || typeof player.on !== 'function') return;
    player.on('pulseStart', (sym) => {
      if (typeof window !== 'undefined' && window.ribbon) {
        window.ribbon.startPulse(performance.now(), sym);
      }
    });
    player.on('pulseEnd', (sym) => {
      if (typeof window !== 'undefined' && window.ribbon) {
        window.ribbon.endPulse(performance.now(), sym);
      }
    });
  }

  isWorkspaceActive() {
    if (!this.el || !this.el.wsContainer) return false;
    return this.el.wsContainer.classList.contains('active') ||
      this.el.wsContainer.style.display === 'flex' ||
      this.el.wsContainer.style.display === 'block';
  }

  setSubmode(submode) {
    this.submode = submode;
    if (this.el && this.el.navPills) {
      this.el.navPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.submode === submode);
      });
    }
  }

  updateBlindMode(enabled) {
    this.blindMode = !!enabled;
    if (this.el && this.el.wsContainer) {
      this.el.wsContainer.classList.toggle('rx-blind-active', this.blindMode);
    }

    // Absolute Safety: Ensure TX Mode PCB Card is NEVER masked
    if (typeof document !== 'undefined') {
      const pcbCard = document.querySelector('.pcb-card');
      if (pcbCard) {
        pcbCard.classList.remove('pcb-blind-mode');
      }
    }

    this.updateVisualCue();
  }

  onLeaveRx() {
    if (this.cwPlayer && this.cwPlayer.isPlaying) {
      this.cwPlayer.stop();
    }
    if (typeof document !== 'undefined') {
      const pcbCard = document.querySelector('.pcb-card');
      if (pcbCard) {
        pcbCard.classList.remove('pcb-blind-mode');
      }
    }
  }

  updateVisualCue() {
    if (!this.el || !this.el.visualCue) return;
    if (this.blindMode || !this.currentTrial) {
      this.el.visualCue.innerHTML = '';
      return;
    }

    const seqs = this.currentTrial.target.split('').map(c => {
      if (typeof window !== 'undefined' && window.engine) {
        return window.engine.getSequenceForLetter(c) || '';
      }
      return '';
    }).filter(Boolean);

    if (seqs.length > 0) {
      this.el.visualCue.innerHTML = `<span style="color:#888; font-size:0.75rem;"><i class="mdi mdi-eye"></i> 視覺提示：</span> ${seqs.join('  ')}`;
    } else {
      this.el.visualCue.innerHTML = '';
    }
  }

  generateTargetForSubmode(submode) {
    if (this.customQueue && this.customQueue.length > 0) {
      return this.customQueue.shift();
    }

    switch (submode) {
      case 'koch': {
        const lvl = (typeof window !== 'undefined' && window.kochManager)
          ? (window.kochManager.maxUnlockedLevel || window.kochManager.currentLevel || 1)
          : 1;
        if (typeof generateKochRxTargets === 'function') {
          const arr = generateKochRxTargets(lvl, 1);
          return arr[0] || 'K';
        }
        return 'K';
      }
      case 'callsign': {
        if (typeof generateCallsign === 'function') {
          return generateCallsign();
        }
        return 'BV2A';
      }
      case 'groups': {
        if (typeof generateCodeGroup === 'function') {
          return generateCodeGroup(5);
        }
        return '5X9KM';
      }
      case 'qcodes': {
        if (typeof generateQSignalOrAbbreviation === 'function') {
          const item = generateQSignalOrAbbreviation();
          return (item && item.text) ? item.text : (typeof item === 'string' ? item : 'QTH');
        }
        return 'QTH';
      }
      default:
        return 'CQ';
    }
  }

  startSession(submode = this.submode, customTargets = null) {
    if (this.cwPlayer && this.cwPlayer.isPlaying) {
      this.cwPlayer.stop();
    }

    this.setSubmode(submode);
    this.trials = [];
    this.currentTrialIndex = 0;
    this.confusionMatrix = {};

    if (Array.isArray(customTargets) && customTargets.length > 0) {
      this.customQueue = [...customTargets];
      this.totalTrials = customTargets.length;
    } else {
      this.customQueue = null;
      this.totalTrials = 10;
    }

    // Reset UI
    if (this.el) {
      if (this.el.scorecard) this.el.scorecard.style.display = 'none';
      if (this.el.historyLog) this.el.historyLog.innerHTML = '';
      if (this.el.inputBuffer) this.el.inputBuffer.textContent = '';
      if (this.el.wpmBadge && this.cwPlayer) {
        this.el.wpmBadge.textContent = `速度: ${this.cwPlayer.charWpm || 20} WPM`;
      }
    }

    // Prepare first trial (DO NOT AUTO PLAY!)
    this.prepareTrial();
  }

  restartSession() {
    this.startSession(this.submode);
  }

  prepareTrial() {
    if (this.currentTrialIndex >= this.totalTrials) {
      this.completeSession();
      return;
    }

    const target = this.generateTargetForSubmode(this.submode);
    this.currentTrial = {
      index: this.currentTrialIndex + 1,
      target: target.toUpperCase().trim(),
      userInput: '',
      isCorrect: false,
      audioStartTime: 0,
      audioEndTime: 0,
      firstKeyTime: 0,
      reflexLatency: 0,
      confusions: []
    };

    this.state = 'READY';
    this.inputBuffer = '';
    this.updateProgressBadge();
    this.updateVisualCue();

    if (this.el) {
      if (this.el.inputBuffer) this.el.inputBuffer.textContent = '';
      if (this.el.audioIndicator) this.el.audioIndicator.classList.remove('playing');
      if (this.el.audioStatusText) {
        this.el.audioStatusText.innerHTML = '<i class="mdi mdi-headphones"></i> 準備就緒 · 請點擊【開始播報】或按 [Space]';
      }
      if (this.el.feedbackMsg) {
        this.el.feedbackMsg.innerHTML = '<span style="color:#aaa;">題目已準備，請點擊【開始】或按空白鍵聆聽電碼</span>';
      }
    }

    this.updateButtonsState();
  }

  updateProgressBadge() {
    if (!this.el || !this.el.progressBadge) return;
    const answeredCount = this.trials.length;
    const correctCount = this.trials.filter(t => t.isCorrect).length;
    const acc = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 100;
    this.el.progressBadge.textContent = `進度: ${this.currentTrialIndex + 1}/${this.totalTrials} · 正確率: ${acc}%`;
  }

  startAudio() {
    if (this.state !== 'READY' && this.state !== 'WAITING_INPUT') return;
    this.playCurrentAudio();
  }

  playCurrentAudio() {
    if (!this.cwPlayer || !this.currentTrial) return;

    this.state = 'PLAYING';
    if (this.el) {
      if (this.el.audioIndicator) this.el.audioIndicator.classList.add('playing');
      if (this.el.audioStatusText) {
        this.el.audioStatusText.innerHTML = '<i class="mdi mdi-volume-high"></i> 正在播放電報信號...';
      }
      if (this.el.feedbackMsg) {
        this.el.feedbackMsg.innerHTML = '<span style="color:#aaa;">正在播放電報音訊，請專注聆聽...</span>';
      }
    }
    this.updateButtonsState();

    this.currentTrial.audioStartTime = this.now();

    // Ensure audio synth context is unlocked
    if (this.cwPlayer.synth && typeof this.cwPlayer.synth.initAudio === 'function') {
      try { this.cwPlayer.synth.initAudio(); } catch (e) {}
    }

    const onComplete = () => {
      this.cwPlayer.off('playbackComplete', onComplete);
      if (this.state !== 'PLAYING') return; // Cancelled or stopped

      this.state = 'WAITING_INPUT';
      this.currentTrial.audioEndTime = this.now();

      if (this.el) {
        if (this.el.audioIndicator) this.el.audioIndicator.classList.remove('playing');
        if (this.el.audioStatusText) {
          this.el.audioStatusText.innerHTML = '<i class="mdi mdi-keyboard-outline"></i> 播放完畢，請鍵入抄收電文';
        }
        if (this.el.feedbackMsg) {
          this.el.feedbackMsg.innerHTML = '<span style="color:#ccc;">請使用鍵盤或下方電信按鈕輸入，按 [Enter] 送出</span>';
        }
      }
      this.updateButtonsState();
    };

    this.cwPlayer.on('playbackComplete', onComplete);
    this.cwPlayer.playText(this.currentTrial.target);
  }

  stopAudio() {
    if (this.cwPlayer && this.cwPlayer.isPlaying) {
      this.cwPlayer.stop();
    }
    if (this.state === 'PLAYING') {
      this.state = 'WAITING_INPUT';
      if (this.el) {
        if (this.el.audioIndicator) this.el.audioIndicator.classList.remove('playing');
        if (this.el.audioStatusText) {
          this.el.audioStatusText.innerHTML = '<i class="mdi mdi-pause-circle-outline"></i> 播報已停止，可按 [Space] 重播或鍵入電文';
        }
      }
      this.updateButtonsState();
    }
  }

  replayAudio() {
    if (this.state === 'PLAYING' || this.state === 'COMPLETED' || !this.currentTrial) return;
    this.playCurrentAudio();
  }

  handleKey(key) {
    if (this.state === 'COMPLETED') return;

    // Visual soft key press animation
    if (typeof document !== 'undefined') {
      const softBtn = document.querySelector(`.keypad-key[data-key="${key}"]`);
      if (softBtn) {
        softBtn.classList.add('active-press');
        setTimeout(() => softBtn.classList.remove('active-press'), 120);
      }
    }

    if (key === 'Backspace') {
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        if (this.el && this.el.inputBuffer) {
          this.el.inputBuffer.textContent = this.inputBuffer;
        }
      }
      return;
    }

    if (key === 'Enter') {
      if (this.state === 'EVALUATED') {
        this.advanceToNextTrial();
      } else {
        this.submitAnswer();
      }
      return;
    }

    // Alphanumeric character input
    if (this.currentTrial && !this.currentTrial.firstKeyTime) {
      this.currentTrial.firstKeyTime = this.now();
    }

    const maxLen = this.currentTrial ? (this.currentTrial.target.length + 3) : 10;
    if (this.inputBuffer.length < maxLen) {
      this.inputBuffer += key.toUpperCase();
      if (this.el && this.el.inputBuffer) {
        this.el.inputBuffer.textContent = this.inputBuffer;
      }
    }
  }

  submitAnswer() {
    if (this.state !== 'PLAYING' && this.state !== 'WAITING_INPUT' && this.state !== 'READY') return;
    if (!this.currentTrial) return;

    if (this.cwPlayer && this.cwPlayer.isPlaying) {
      this.cwPlayer.stop();
    }

    this.state = 'EVALUATED';
    const target = this.currentTrial.target;
    const input = this.inputBuffer.toUpperCase().trim();
    this.currentTrial.userInput = input;

    // Reflex Latency calculation
    if (this.currentTrial.firstKeyTime && this.currentTrial.audioEndTime) {
      this.currentTrial.reflexLatency = Math.max(0, Math.round(this.currentTrial.firstKeyTime - this.currentTrial.audioEndTime));
    } else {
      this.currentTrial.reflexLatency = 0;
    }

    const isCorrect = (target === input);
    this.currentTrial.isCorrect = isCorrect;

    // Confusion Matrix Analysis
    if (!isCorrect) {
      const maxLen = Math.max(target.length, input.length);
      for (let i = 0; i < maxLen; i++) {
        const exp = target[i] || 'Ø';
        const act = input[i] || 'Ø';
        if (exp !== act) {
          const pairKey = `${exp}->${act}`;
          this.confusionMatrix[pairKey] = (this.confusionMatrix[pairKey] || 0) + 1;
          this.currentTrial.confusions.push({ expected: exp, actual: act });
        }
      }
    }

    this.trials.push({ ...this.currentTrial });
    this.updateButtonsState();

    // Render Immediate Live Feedback
    if (this.el) {
      if (this.el.audioIndicator) this.el.audioIndicator.classList.remove('playing');
      if (this.el.audioStatusText) {
        this.el.audioStatusText.innerHTML = isCorrect
          ? '<i class="mdi mdi-check-circle" style="color:#00e676;"></i> 抄收正確！'
          : '<i class="mdi mdi-close-circle" style="color:#ff5252;"></i> 抄收不合';
      }

      if (this.el.feedbackMsg) {
        if (isCorrect) {
          this.el.feedbackMsg.innerHTML = `<span style="color:#00e676;"><i class="mdi mdi-check-circle"></i> 正確！答案為 ${target} (反射: ${this.currentTrial.reflexLatency} ms)</span>`;
        } else {
          this.el.feedbackMsg.innerHTML = `<span style="color:#ff5252;"><i class="mdi mdi-close-circle"></i> 錯誤：目標為 ${target}，抄收為 ${input || '(空白)'}</span>`;
        }
      }

      // Add to History Log
      if (this.el.historyLog) {
        const chip = document.createElement('span');
        chip.className = `rx-history-chip ${isCorrect ? 'correct' : 'wrong'}`;
        chip.innerHTML = `<i class="mdi ${isCorrect ? 'mdi-check' : 'mdi-close'}"></i> ${target}${isCorrect ? '' : ' (' + (input || '—') + ')'}`;
        this.el.historyLog.appendChild(chip);
        this.el.historyLog.scrollLeft = this.el.historyLog.scrollWidth;
      }
    }

    // Auto-advance or wait for user to click Next
    if (this.autoAdvance) {
      setTimeout(() => {
        this.advanceToNextTrial();
      }, 1200);
    }
  }

  advanceToNextTrial() {
    if (this.state !== 'EVALUATED') return;

    this.currentTrialIndex++;
    if (this.currentTrialIndex >= this.totalTrials) {
      this.completeSession();
    } else {
      this.prepareTrial();
      // User explicitly advanced -> start audio for the new trial
      this.playCurrentAudio();
    }
  }

  nextTrial() {
    return this.advanceToNextTrial();
  }

  skipTrial() {
    if (this.state !== 'PLAYING' && this.state !== 'WAITING_INPUT' && this.state !== 'READY') return;
    if (this.cwPlayer && this.cwPlayer.isPlaying) {
      this.cwPlayer.stop();
    }
    this.inputBuffer = '';
    this.submitAnswer();
  }

  updateButtonsState() {
    if (!this.el) return;
    const { btnStart, btnStop, btnReplay, btnSkip, btnNext, btnRestart } = this.el;

    switch (this.state) {
      case 'READY':
        if (btnStart) btnStart.disabled = false;
        if (btnStop) btnStop.disabled = true;
        if (btnReplay) btnReplay.disabled = true;
        if (btnSkip) btnSkip.disabled = false;
        if (btnNext) {
          btnNext.disabled = true;
          btnNext.classList.remove('highlight-next');
        }
        if (btnRestart) btnRestart.disabled = false;
        break;
      case 'PLAYING':
        if (btnStart) btnStart.disabled = true;
        if (btnStop) btnStop.disabled = false;
        if (btnReplay) btnReplay.disabled = true;
        if (btnSkip) btnSkip.disabled = false;
        if (btnNext) {
          btnNext.disabled = true;
          btnNext.classList.remove('highlight-next');
        }
        if (btnRestart) btnRestart.disabled = false;
        break;
      case 'WAITING_INPUT':
        if (btnStart) btnStart.disabled = true;
        if (btnStop) btnStop.disabled = true;
        if (btnReplay) btnReplay.disabled = false;
        if (btnSkip) btnSkip.disabled = false;
        if (btnNext) {
          btnNext.disabled = true;
          btnNext.classList.remove('highlight-next');
        }
        if (btnRestart) btnRestart.disabled = false;
        break;
      case 'EVALUATED':
        if (btnStart) btnStart.disabled = true;
        if (btnStop) btnStop.disabled = true;
        if (btnReplay) btnReplay.disabled = false;
        if (btnSkip) btnSkip.disabled = true;
        if (btnNext) {
          btnNext.disabled = false;
          btnNext.classList.add('highlight-next');
        }
        if (btnRestart) btnRestart.disabled = false;
        break;
      case 'COMPLETED':
        if (btnStart) btnStart.disabled = true;
        if (btnStop) btnStop.disabled = true;
        if (btnReplay) btnReplay.disabled = true;
        if (btnSkip) btnSkip.disabled = true;
        if (btnNext) {
          btnNext.disabled = true;
          btnNext.classList.remove('highlight-next');
        }
        if (btnRestart) btnRestart.disabled = false;
        break;
      default:
        break;
    }
  }

  completeSession() {
    this.state = 'COMPLETED';
    this.updateButtonsState();

    const total = this.trials.length;
    const correctCount = this.trials.filter(t => t.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const answeredTrials = this.trials.filter(t => t.reflexLatency > 0);
    const avgLatency = answeredTrials.length > 0
      ? Math.round(answeredTrials.reduce((acc, t) => acc + t.reflexLatency, 0) / answeredTrials.length)
      : 0;

    const wpm = this.cwPlayer ? (this.cwPlayer.charWpm || 20) : 20;

    if (this.el) {
      if (this.el.scorecard) this.el.scorecard.style.display = 'block';
      if (this.el.scModeTag) this.el.scModeTag.textContent = this.getSubmodeDisplayName(this.submode);
      if (this.el.scAccuracy) {
        this.el.scAccuracy.textContent = `${accuracy}%`;
        this.el.scAccuracy.style.color = accuracy >= 90 ? '#00e676' : (accuracy >= 70 ? 'var(--gold)' : '#ff5252');
      }
      if (this.el.scWpm) this.el.scWpm.textContent = `${wpm} WPM`;
      if (this.el.scLatency) this.el.scLatency.textContent = `${avgLatency} ms`;
      if (this.el.scTotal) this.el.scTotal.textContent = `${correctCount} / ${total} (正確率 ${accuracy}%)`;

      // Confusion List
      if (this.el.scConfusionBox && this.el.scConfusionList) {
        const confusions = Object.entries(this.confusionMatrix).sort((a, b) => b[1] - a[1]);
        if (confusions.length > 0) {
          this.el.scConfusionBox.style.display = 'block';
          this.el.scConfusionList.innerHTML = confusions.map(([pair, count]) => {
            const [exp, act] = pair.split('->');
            return `<div class="rx-confusion-item"><span class="confusion-exp">${exp}</span> <i class="mdi mdi-arrow-right"></i> <span class="confusion-act">${act}</span> (${count} 次)</div>`;
          }).join('');
        } else {
          this.el.scConfusionBox.style.display = 'none';
        }
      }

      // Retry Errors button visibility
      if (this.el.btnRetryErrors) {
        this.el.btnRetryErrors.style.display = (correctCount < total) ? 'inline-flex' : 'none';
      }

      if (this.el.feedbackMsg) {
        this.el.feedbackMsg.innerHTML = '<span style="color:var(--gold);"><i class="mdi mdi-trophy"></i> 測驗結束！請檢視成績看板</span>';
      }
    }
  }

  retryErrors() {
    const errorTargets = this.trials.filter(t => !t.isCorrect).map(t => t.target);
    if (errorTargets.length === 0) return;
    this.startSession(this.submode, errorTargets);
  }

  getSubmodeDisplayName(submode) {
    switch (submode) {
      case 'koch': return '科赫盲聽';
      case 'callsign': return '呼號抄收';
      case 'groups': return '五字電碼群';
      case 'qcodes': return 'Q簡語與常用';
      default: return '聽力抄收';
    }
  }
}

if (typeof window !== 'undefined') {
  window.RxMode = RxMode;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RxMode };
}
