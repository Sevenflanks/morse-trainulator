/**
 * RX COPYING WORKSPACE CONTROLLER: rx-mode.js
 * 聽力抄收工作台控制器、狀態機、評測模型與軟鍵盤交互
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Architecture)
 */

class RxMode {
  constructor(options = {}) {
    this.cwPlayer = options.cwPlayer || (typeof window !== 'undefined' ? window.cwPlayer : null);
    this.submode = options.submode || 'koch'; // 'koch' | 'callsign' | 'groups' | 'qcodes'
    this.state = 'IDLE'; // 'IDLE' | 'PLAYING' | 'WAITING_INPUT' | 'EVALUATED' | 'COMPLETED'
    this.blindMode = (options.blindMode !== undefined) ? !!options.blindMode : true;
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
      chkBlindMode: document.getElementById('chk-rx-blind-mode'),
      audioIndicator: document.getElementById('rx-audio-indicator'),
      audioStatusText: document.getElementById('rx-audio-status-text'),
      btnReplay: document.getElementById('btn-rx-replay'),
      btnSkip: document.getElementById('btn-rx-skip'),
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
        pill.addEventListener('click', (e) => {
          const submode = pill.dataset.submode || 'koch';
          this.setSubmode(submode);
          this.startSession(submode);
        });
      });
    }

    // 2. Control Buttons
    if (this.el.btnReplay) {
      this.el.btnReplay.addEventListener('click', () => this.replayAudio());
    }
    if (this.el.btnSkip) {
      this.el.btnSkip.addEventListener('click', () => this.skipTrial());
    }
    if (this.el.btnRetryErrors) {
      this.el.btnRetryErrors.addEventListener('click', () => this.retryErrors());
    }
    if (this.el.btnNextRound) {
      this.el.btnNextRound.addEventListener('click', () => this.startSession(this.submode));
    }

    // 3. Blind Mode Switch
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

        // Space -> Replay
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          this.replayAudio();
          return;
        }

        // Escape -> Skip
        if (e.key === 'Escape') {
          e.preventDefault();
          this.skipTrial();
          return;
        }

        // Backspace -> Delete
        if (e.key === 'Backspace') {
          e.preventDefault();
          this.handleKey('Backspace');
          return;
        }

        // Enter -> Submit
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleKey('Enter');
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
    return this.el.wsContainer.classList.contains('active') || this.el.wsContainer.style.display === 'flex' || this.el.wsContainer.style.display === 'block';
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
    if (typeof document !== 'undefined') {
      const pcbCard = document.querySelector('.pcb-card');
      if (pcbCard) {
        pcbCard.classList.toggle('pcb-blind-mode', this.blindMode);
      }
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

    this.nextTrial();
  }

  nextTrial() {
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

    this.inputBuffer = '';
    this.updateProgressBadge();

    if (this.el) {
      if (this.el.inputBuffer) this.el.inputBuffer.textContent = '';
      if (this.el.feedbackMsg) {
        this.el.feedbackMsg.innerHTML = '<span style="color:#aaa;">請仔細聆聽電報音訊...</span>';
      }
    }

    this.playCurrentAudio();
  }

  updateProgressBadge() {
    if (!this.el || !this.el.progressBadge) return;
    const answeredCount = this.trials.length;
    const correctCount = this.trials.filter(t => t.isCorrect).length;
    const acc = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 100;
    this.el.progressBadge.textContent = `進度: ${this.currentTrialIndex + 1}/${this.totalTrials} · 正確率: ${acc}%`;
  }

  playCurrentAudio() {
    if (!this.cwPlayer || !this.currentTrial) return;

    this.state = 'PLAYING';
    if (this.el) {
      if (this.el.audioIndicator) this.el.audioIndicator.classList.add('playing');
      if (this.el.audioStatusText) {
        this.el.audioStatusText.innerHTML = '<i class="mdi mdi-volume-high"></i> 正在播放電報信號...';
      }
      if (this.el.btnReplay) this.el.btnReplay.disabled = true;
      if (this.el.btnSkip) this.el.btnSkip.disabled = true;
    }

    this.currentTrial.audioStartTime = this.now();

    // Ensure audio synth context is unlocked
    if (this.cwPlayer.synth && typeof this.cwPlayer.synth.initAudio === 'function') {
      try { this.cwPlayer.synth.initAudio(); } catch (e) {}
    }

    const onComplete = () => {
      this.cwPlayer.off('playbackComplete', onComplete);
      this.state = 'WAITING_INPUT';
      this.currentTrial.audioEndTime = this.now();

      if (this.el) {
        if (this.el.audioIndicator) this.el.audioIndicator.classList.remove('playing');
        if (this.el.audioStatusText) {
          this.el.audioStatusText.innerHTML = '<i class="mdi mdi-headphones"></i> 播放完畢，請鍵入抄收電文';
        }
        if (this.el.feedbackMsg) {
          this.el.feedbackMsg.innerHTML = '<span style="color:#ccc;">請使用鍵盤或下方電信按鈕輸入，按 [Enter] 送出</span>';
        }
        if (this.el.btnReplay) this.el.btnReplay.disabled = false;
        if (this.el.btnSkip) this.el.btnSkip.disabled = false;
      }
    };

    this.cwPlayer.on('playbackComplete', onComplete);
    this.cwPlayer.playText(this.currentTrial.target);
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
      this.submitAnswer();
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
    if (this.state !== 'PLAYING' && this.state !== 'WAITING_INPUT') return;
    if (!this.currentTrial) return;

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
    this.currentTrialIndex++;

    // Render Immediate Live Feedback
    if (this.el) {
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

    // Schedule next trial or scorecard
    setTimeout(() => {
      if (this.currentTrialIndex >= this.totalTrials) {
        this.completeSession();
      } else {
        this.nextTrial();
      }
    }, 700);
  }

  skipTrial() {
    if (this.state !== 'PLAYING' && this.state !== 'WAITING_INPUT') return;
    if (this.cwPlayer && this.cwPlayer.isPlaying) {
      this.cwPlayer.stop();
    }
    this.inputBuffer = '';
    this.submitAnswer();
  }

  completeSession() {
    this.state = 'COMPLETED';

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
