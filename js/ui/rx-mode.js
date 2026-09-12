/**
 * RX COPYING WORKSPACE CONTROLLER: rx-mode.js
 * 聽力抄收工作台控制器、狀態機、評測模型與傳輸調度控制項
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Architecture)
 */

class RxMode {
  constructor(options = {}) {
    this.cwPlayer = options.cwPlayer || (typeof window !== 'undefined' ? window.cwPlayer : null);
    this.kochManager = options.kochManager || (typeof window !== 'undefined' ? window.kochManager : null);
    this.submode = options.submode || 'koch'; // 'koch' | 'callsign' | 'groups' | 'qcodes'
    this.state = 'IDLE'; // 'IDLE' | 'READY' | 'PLAYING' | 'WAITING_INPUT' | 'EVALUATED' | 'COMPLETED'
    this.blindMode = (options.blindMode !== undefined) ? !!options.blindMode : true;
    this.autoAdvance = (options.autoAdvance !== undefined) ? !!options.autoAdvance : true;
    this.statsManager = options.statsManager || (typeof window !== 'undefined' && window.rxStatsManager ? window.rxStatsManager : (typeof RxStatsManager !== 'undefined' ? new RxStatsManager() : null));
    this.totalTrials = options.totalTrials || 10;
    this.currentTrialIndex = 0;
    this.trials = [];
    this.currentTrial = null;
    this.inputBuffer = '';
    this.confusionMatrix = {}; // { 'B->D': 2 }
    this.customQueue = null;
    this._matrixOpen = false;

    this._boundKeyDown = null;
    this._initialized = false;
  }

  now() {
    return (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now();
  }

  getKochManager() {
    return this.kochManager || (typeof window !== 'undefined' ? window.kochManager : null);
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
      scHistoryBar: document.getElementById('rx-sc-history-bar'),
      scHistCount: document.getElementById('rx-sc-hist-count'),
      scHistAvgAcc: document.getElementById('rx-sc-hist-avg-acc'),
      scHistAvgLat: document.getElementById('rx-sc-hist-avg-lat'),
      btnClearHistory: document.getElementById('btn-rx-clear-history'),
      btnRetryErrors: document.getElementById('btn-rx-retry-errors'),
      btnNextRound: document.getElementById('btn-rx-next-round'),
      btnToggleAnalytics: document.getElementById('btn-rx-toggle-analytics'),
      analyticsChevron: document.getElementById('rx-analytics-chevron'),
      analyticsPanel: document.getElementById('rx-analytics-panel'),
      topConfusionsGrid: document.getElementById('rx-top-confusions-grid'),
      weakCharsList: document.getElementById('rx-weak-chars-list'),
      latencyTrend: document.getElementById('rx-latency-trend'),
      scBreakthroughBox: document.getElementById('rx-sc-breakthrough-box'),
      softKeypad: document.getElementById('rx-soft-keypad'),
      kochStageBar: document.getElementById('rx-koch-stage-bar'),
      kochStageBadge: document.getElementById('rx-koch-stage-badge'),
      kochStageSelect: document.getElementById('rx-koch-stage-select'),
      kochTargetInfo: document.getElementById('rx-koch-target-info'),
      kochTargetChar: document.getElementById('rx-koch-target-char'),
      kochPoolChips: document.getElementById('rx-koch-pool-chips'),
      btnToggleMatrix: document.getElementById('btn-rx-toggle-matrix'),
      matrixChevron: document.getElementById('rx-matrix-chevron'),
      kochMatrixPanel: document.getElementById('rx-koch-matrix-panel'),
      kochMatrixGrid: document.getElementById('rx-koch-matrix-grid'),
      btnStageAdvance: document.getElementById('btn-rx-stage-advance')
    };

    if (this.el.wsContainer) {
      this.el.wsContainer.addEventListener('click', (e) => {
        const drillBtn = e.target.closest('.rx-btn-drill-pair');
        if (drillBtn) {
          const pair = drillBtn.dataset.pair;
          if (pair) {
            const [exp, act] = pair.split('->');
            this.startTargetedDrill(exp, act);
          }
        }
      });
    }

    if (this.el.btnToggleAnalytics) {
      this.el.btnToggleAnalytics.addEventListener('click', () => {
        this.toggleAnalyticsPanel();
      });
    }

    if (this.el.btnClearHistory) {
      this.el.btnClearHistory.addEventListener('click', () => {
        if (this.statsManager) {
          this.statsManager.clearHistory();
          this.updateHistoryBarUI();
          this.renderAnalyticsPanel();
        }
      });
    }

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

    // 2.1 Koch Stage Controls
    if (this.el.btnToggleMatrix) {
      this.el.btnToggleMatrix.addEventListener('click', () => {
        this.toggleMatrixPanel();
      });
    }
    if (this.el.kochStageSelect) {
      this.el.kochStageSelect.addEventListener('change', (e) => {
        const lvl = parseInt(e.target.value, 10);
        if (!isNaN(lvl)) {
          this.setKochLevel(lvl);
        }
      });
    }
    if (this.el.btnStageAdvance) {
      this.el.btnStageAdvance.addEventListener('click', () => {
        this.advanceToNextStage();
      });
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
      if (this.isWorkspaceActive() && this.blindMode) return;
      if (typeof window !== 'undefined' && window.ribbon) {
        window.ribbon.startPulse(performance.now(), sym);
      }
    });
    player.on('pulseEnd', (sym) => {
      if (this.isWorkspaceActive() && this.blindMode) return;
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
    if (submode !== 'drill') {
      this.drillTarget = null;
      if (this.el && this.el.scBreakthroughBox) {
        this.el.scBreakthroughBox.style.display = 'none';
        this.el.scBreakthroughBox.innerHTML = '';
      }
    }
    if (this.el && this.el.navPills) {
      this.el.navPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.submode === submode);
      });
    }

    // Toggle Koch stage bar display
    if (this.el && this.el.kochStageBar) {
      if (submode === 'koch') {
        this.el.kochStageBar.style.display = 'flex';
        this.updateKochStageUI();
      } else {
        this.el.kochStageBar.style.display = 'none';
        if (this.el.kochMatrixPanel) {
          this.el.kochMatrixPanel.style.display = 'none';
          this._matrixOpen = false;
          if (this.el.matrixChevron) {
            this.el.matrixChevron.className = 'mdi mdi-chevron-down';
          }
        }
      }
    }
  }

  toggleMatrixPanel(forceState = null) {
    this._matrixOpen = (forceState !== null) ? !!forceState : !this._matrixOpen;
    if (this.el && this.el.kochMatrixPanel) {
      this.el.kochMatrixPanel.style.display = this._matrixOpen ? 'block' : 'none';
    }
    if (this.el && this.el.matrixChevron) {
      this.el.matrixChevron.className = this._matrixOpen ? 'mdi mdi-chevron-up' : 'mdi mdi-chevron-down';
    }
    if (this._matrixOpen) {
      this.renderStageMatrix();
    }
  }

  setKochLevel(lvl) {
    const km = this.getKochManager();
    if (!km) return;
    lvl = Math.max(1, Math.min(km.maxUnlockedLevel || 1, lvl));
    km.currentLevel = lvl;

    // Synchronize TX mode UI if present
    if (typeof window !== 'undefined') {
      if (typeof window.updateKochUI === 'function') {
        try { window.updateKochUI(); } catch (_) {}
      }
      if (typeof window.updatePcbKochVisuals === 'function') {
        try { window.updatePcbKochVisuals(); } catch (_) {}
      }
    }

    this.updateKochStageUI();
    this.startSession('koch');
  }

  advanceToNextStage() {
    const km = this.getKochManager();
    if (!km) return;
    const curLvl = km.currentLevel || 1;
    if (curLvl < 35) {
      const nextLvl = curLvl + 1;
      if (nextLvl > (km.maxUnlockedLevel || 1)) {
        km.maxUnlockedLevel = nextLvl;
        if (typeof km.saveProgress === 'function') {
          km.saveProgress();
        }
      }
      this.setKochLevel(nextLvl);
    }
  }

  updateKochStageUI() {
    if (!this.el || !this.el.kochStageBar) return;
    const km = this.getKochManager();
    const curLvl = km ? (km.currentLevel || 1) : 1;
    const maxLvl = km ? (km.maxUnlockedLevel || 1) : 1;

    // 1. Stage Badge
    if (this.el.kochStageBadge) {
      this.el.kochStageBadge.innerHTML = `<i class="mdi mdi-school"></i> 第 ${curLvl} 關 / 共 35 關`;
    }

    // 2. Stage Select Dropdown
    if (this.el.kochStageSelect) {
      this.el.kochStageSelect.innerHTML = '';
      const seqList = (typeof KOCH_SEQUENCE !== 'undefined') ? KOCH_SEQUENCE : [
        'K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O',
        'W', 'I', 'N', 'J', 'E', 'F', '0', 'Y', 'V', 'G',
        '5', 'Q', '9', 'Z', 'H', '3', '8', 'B', '4', '2',
        '7', 'C', '1', 'D', '6', 'X'
      ];
      for (let i = 1; i <= maxLvl; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        const charLabel = (i === 1) ? 'K, M' : (seqList[i] || (km && typeof km.getTargetChar === 'function' ? km.getTargetChar(i) : i));
        opt.textContent = `第 ${i} 關 (${charLabel})`;
        if (i === curLvl) opt.selected = true;
        this.el.kochStageSelect.appendChild(opt);
      }
    }

    // 3. Target Char Display
    if (this.el.kochTargetChar) {
      if (curLvl === 1) {
        this.el.kochTargetChar.textContent = 'K, M';
      } else {
        const targetChar = (km && typeof km.getTargetChar === 'function') ? km.getTargetChar(curLvl) : 'K';
        this.el.kochTargetChar.textContent = targetChar;
      }
    }

    // 4. Pool Chips with Sound Preview
    if (this.el.kochPoolChips) {
      this.el.kochPoolChips.innerHTML = '';
      const pool = (km && typeof km.getUnlockedPool === 'function') ? km.getUnlockedPool(curLvl) : ['K', 'M'];
      const targetChars = (curLvl === 1) ? ['K', 'M'] : [(km && typeof km.getTargetChar === 'function') ? km.getTargetChar(curLvl) : 'K'];
      const engine = (typeof window !== 'undefined') ? window.engine : null;

      pool.forEach(c => {
        const chip = document.createElement('span');
        chip.className = 'rx-pool-chip' + (targetChars.includes(c) ? ' is-target' : '');
        const seq = (engine && typeof engine.getSequenceForLetter === 'function')
          ? (engine.getSequenceForLetter(c) || '')
          : '';
        chip.innerHTML = `${c}${seq ? ` <span style="font-family:monospace; color:var(--gold); font-size:0.7rem; margin-left:3px;">${seq}</span>` : ''}`;
        chip.title = `點擊試聽 ${c} (${seq})`;

        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.cwPlayer && typeof this.cwPlayer.playText === 'function') {
            this.cwPlayer.playText(c);
          }
        });

        this.el.kochPoolChips.appendChild(chip);
      });
    }

    // 5. If matrix is open, re-render
    if (this._matrixOpen) {
      this.renderStageMatrix();
    }
  }

  renderStageMatrix() {
    if (!this.el || !this.el.kochMatrixGrid) return;
    const km = this.getKochManager();
    const curLvl = km ? (km.currentLevel || 1) : 1;
    const maxLvl = km ? (km.maxUnlockedLevel || 1) : 1;
    const seqList = (typeof KOCH_SEQUENCE !== 'undefined') ? KOCH_SEQUENCE : [
      'K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O',
      'W', 'I', 'N', 'J', 'E', 'F', '0', 'Y', 'V', 'G',
      '5', 'Q', '9', 'Z', 'H', '3', '8', 'B', '4', '2',
      '7', 'C', '1', 'D', '6', 'X'
    ];

    this.el.kochMatrixGrid.innerHTML = '';

    for (let i = 1; i <= 35; i++) {
      const isUnlocked = (i <= maxLvl);
      const clearInfo = (km && typeof km.getStageClear === 'function') ? km.getStageClear(i) : null;
      const charLabel = (i === 1) ? 'K,M' : (seqList[i] || i);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-cell';
      btn.dataset.level = i;

      let medalIcon = '';
      if (!isUnlocked) {
        btn.classList.add('cell-locked');
        btn.disabled = true;
        btn.title = `第 ${i} 關 (${charLabel}) - 尚未解鎖`;
        medalIcon = '<i class="mdi mdi-lock"></i>';
      } else {
        if (i === curLvl) {
          btn.classList.add('active-stage');
        }
        if (clearInfo && clearInfo.highest) {
          if (clearInfo.highest === 'challenge') {
            btn.classList.add('cell-cleared-challenge');
            btn.title = `第 ${i} 關 (${charLabel}) · 極限挑戰征服`;
            medalIcon = '<i class="mdi mdi-crown"></i>';
          } else if (clearInfo.highest === 'standard') {
            btn.classList.add('cell-cleared-standard');
            btn.title = `第 ${i} 關 (${charLabel}) · 正規考核合格`;
            medalIcon = '<i class="mdi mdi-trophy"></i>';
          } else if (clearInfo.highest === 'quick') {
            btn.classList.add('cell-cleared-quick');
            btn.title = `第 ${i} 關 (${charLabel}) · 基礎練習通過`;
            medalIcon = '<i class="mdi mdi-check-circle"></i>';
          }
        } else {
          btn.classList.add('cell-unlocked');
          btn.title = `第 ${i} 關 (${charLabel}) · 已解鎖 (未通關)`;
        }

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setKochLevel(i);
        });
      }

      btn.innerHTML = `
        <div class="stage-cell-top">
          <span class="stage-num">${i}</span>
          <span class="stage-medal">${medalIcon}</span>
        </div>
        <span class="stage-char">${charLabel}</span>
      `;

      this.el.kochMatrixGrid.appendChild(btn);
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

      // Hide/Show top oscilloscope ribbon in blind mode
      const topRibbon = document.getElementById('cockpit-top-ribbon');
      if (topRibbon) {
        if (this.isWorkspaceActive() && this.blindMode) {
          topRibbon.classList.add('ribbon-blind-mode');
        } else {
          topRibbon.classList.remove('ribbon-blind-mode');
        }
      }
    }

    this.updateVisualCue();
    if (this.submode === 'koch') {
      this.updateKochStageUI();
    }
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
      const topRibbon = document.getElementById('cockpit-top-ribbon');
      if (topRibbon) {
        topRibbon.classList.remove('ribbon-blind-mode');
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
        const km = this.getKochManager();
        const lvl = km ? (km.currentLevel || 1) : 1;
        if (typeof generateKochRxTargets === 'function') {
          const arr = generateKochRxTargets(lvl, 1);
          return arr[0] || 'K';
        }
        const pool = (km && typeof km.getUnlockedPool === 'function') ? km.getUnlockedPool(lvl) : ['K', 'M'];
        return pool[Math.floor(Math.random() * pool.length)] || 'K';
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
      case 'drill': {
        if (this.drillTarget) {
          if (typeof generateWeaknessTargets === 'function') {
            const arr = generateWeaknessTargets([this.drillTarget.expected, this.drillTarget.actual], 1);
            return arr[0] || this.drillTarget.expected;
          }
          return Math.random() < 0.5 ? this.drillTarget.expected : this.drillTarget.actual;
        }
        return 'B';
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
      if (this.el.btnStageAdvance) this.el.btnStageAdvance.style.display = 'none';
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
    if (this.submode === 'drill' && this.drillTarget) {
      this.el.progressBadge.innerHTML = `<i class="mdi mdi-sword-cross"></i> 弱點專攻: ${this.drillTarget.expected} <i class="mdi mdi-sword-cross"></i> ${this.drillTarget.actual} (${this.currentTrialIndex + 1}/${this.totalTrials})`;
    } else {
      this.el.progressBadge.textContent = `進度: ${this.currentTrialIndex + 1}/${this.totalTrials} · 正確率: ${acc}%`;
    }
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
      if (this.el.scModeTag) {
        if (this.submode === 'drill' && this.drillTarget) {
          this.el.scModeTag.innerHTML = `<i class="mdi mdi-sword-cross"></i> 弱點專攻 (${this.drillTarget.expected} <i class="mdi mdi-sword-cross"></i> ${this.drillTarget.actual})`;
        } else {
          this.el.scModeTag.textContent = this.getSubmodeDisplayName(this.submode);
        }
      }
      if (this.el.scAccuracy) {
        this.el.scAccuracy.textContent = `${accuracy}%`;
        this.el.scAccuracy.style.color = accuracy >= 90 ? '#00e676' : (accuracy >= 70 ? 'var(--gold)' : '#ff5252');
      }
      if (this.el.scWpm) this.el.scWpm.textContent = `${wpm} WPM`;
      if (this.el.scLatency) this.el.scLatency.textContent = `${avgLatency} ms`;
      if (this.el.scTotal) this.el.scTotal.textContent = `${correctCount} / ${total} (正確率 ${accuracy}%)`;

      // Breakthrough Box in Drill Mode
      if (this.submode === 'drill' && this.drillTarget) {
        if (this.el.scBreakthroughBox) {
          this.el.scBreakthroughBox.style.display = 'block';
          if (accuracy >= 90) {
            if (this.statsManager && typeof this.statsManager.demoteConfusion === 'function') {
              this.statsManager.demoteConfusion(this.drillTarget.pairKey);
            }
            this.el.scBreakthroughBox.innerHTML = `
              <div class="rx-sc-breakthrough success">
                <i class="mdi mdi-trophy-variant"></i> 突破成功！已成功調降 ${this.drillTarget.expected} <i class="mdi mdi-sword-cross"></i> ${this.drillTarget.actual} 混淆權重
              </div>
            `;
            if (this.el.feedbackMsg) {
              this.el.feedbackMsg.innerHTML = '<span style="color:#00e676;"><i class="mdi mdi-check-decagram"></i> 特訓合格！混淆對已成功降權</span>';
            }
          } else {
            this.el.scBreakthroughBox.innerHTML = `
              <div class="rx-sc-breakthrough warning">
                <i class="mdi mdi-shield-alert"></i> 特訓未達 90% 門檻，建議再次特訓以鞏固節奏反射
              </div>
            `;
            if (this.el.feedbackMsg) {
              this.el.feedbackMsg.innerHTML = '<span style="color:var(--gold);"><i class="mdi mdi-alert-circle"></i> 正確率未達 90%，請再接再厲</span>';
            }
          }
        }
      } else {
        if (this.el.scBreakthroughBox) {
          this.el.scBreakthroughBox.style.display = 'none';
          this.el.scBreakthroughBox.innerHTML = '';
        }
      }

      // Confusion List
      if (this.el.scConfusionBox && this.el.scConfusionList) {
        const confusions = Object.entries(this.confusionMatrix).sort((a, b) => b[1] - a[1]);
        if (confusions.length > 0) {
          this.el.scConfusionBox.style.display = 'block';
          this.el.scConfusionList.innerHTML = confusions.map(([pair, count]) => {
            const [exp, act] = pair.split('->');
            let severity = 'notice';
            let severityText = '輕度';
            if (count >= 5) {
              severity = 'critical';
              severityText = '高頻';
            } else if (count >= 3) {
              severity = 'warning';
              severityText = '中度';
            }
            return `<div class="rx-confusion-item">
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="confusion-exp">${exp}</span>
                <i class="mdi mdi-arrow-right"></i>
                <span class="confusion-act">${act}</span>
                <span class="rx-severity-badge ${severity}">${severityText} (${count} 次)</span>
              </div>
              <button type="button" class="rx-btn-drill-pair rx-btn-ghost" data-pair="${pair}" title="特訓此配對">
                <i class="mdi mdi-sword-cross"></i> 特訓
              </button>
            </div>`;
          }).join('');
        } else {
          this.el.scConfusionBox.style.display = 'none';
        }
      }

      // Retry Errors button visibility
      if (this.el.btnRetryErrors) {
        this.el.btnRetryErrors.style.display = (correctCount < total) ? 'inline-flex' : 'none';
      }

      // Koch Stage Advance handling
      if (this.submode === 'koch') {
        const km = this.getKochManager();
        if (km && accuracy >= 90) {
          if (typeof km.recordClear === 'function') {
            try { km.recordClear(km.currentLevel || 1, 'quick', accuracy); } catch (_) {}
          }
          const curLvl = km.currentLevel || 1;
          if (curLvl < 35 && this.el && this.el.btnStageAdvance) {
            this.el.btnStageAdvance.style.display = 'inline-flex';
            this.el.btnStageAdvance.innerHTML = `<span><i class="mdi mdi-arrow-up-bold-circle"></i> 晉級第 ${curLvl + 1} 關 <i class="mdi mdi-arrow-right"></i></span>`;
          }
        } else {
          if (this.el && this.el.btnStageAdvance) {
            this.el.btnStageAdvance.style.display = 'none';
          }
        }
      } else {
        if (this.el && this.el.btnStageAdvance) {
          this.el.btnStageAdvance.style.display = 'none';
        }
      }

      if (this.el.feedbackMsg) {
        this.el.feedbackMsg.innerHTML = '<span style="color:var(--gold);"><i class="mdi mdi-trophy"></i> 測驗結束！請檢視成績看板</span>';
      }
    }

    // Record to statsManager and update history bar
    if (this.statsManager) {
      try {
        this.statsManager.recordSession({
          submode: this.submode,
          charWpm: wpm,
          totalTrials: total,
          correctCount: correctCount,
          accuracy: accuracy,
          avgLatency: avgLatency,
          confusions: Object.entries(this.confusionMatrix).map(([pair, count]) => {
            const [exp, act] = pair.split('->');
            return { expected: exp, actual: act, count };
          }),
          trials: this.trials.map(t => ({
            target: t.target,
            userInput: t.userInput,
            isCorrect: t.isCorrect,
            reflexLatency: t.reflexLatency
          }))
        });
      } catch (err) {
        console.warn('[RxMode] Failed to record session to statsManager:', err);
      }
    }
    this.updateHistoryBarUI();
    if (this._analyticsOpen) {
      this.renderAnalyticsPanel();
    }
  }

  updateHistoryBarUI() {
    if (!this.el) return;
    if (!this.statsManager) {
      if (this.el.scHistoryBar) this.el.scHistoryBar.style.display = 'none';
      return;
    }
    const summary = this.statsManager.getSummaryStats();
    if (this.el.scHistoryBar) this.el.scHistoryBar.style.display = 'flex';
    if (this.el.scHistCount) {
      this.el.scHistCount.innerHTML = `<i class="mdi mdi-history"></i> 累計: ${summary.totalSessions} 場`;
    }
    if (this.el.scHistAvgAcc) {
      const accText = summary.totalSessions > 0 ? `${summary.recentAccuracy}%` : '--%';
      this.el.scHistAvgAcc.innerHTML = `<i class="mdi mdi-chart-line"></i> 近期均準: ${accText}`;
    }
    if (this.el.scHistAvgLat) {
      const latText = (summary.totalSessions > 0 && summary.recentAvgLatency > 0) ? `${summary.recentAvgLatency} ms` : '-- ms';
      this.el.scHistAvgLat.innerHTML = `<i class="mdi mdi-timer-outline"></i> 近期反射: ${latText}`;
    }
  }

  toggleAnalyticsPanel(forceOpen = null) {
    if (!this.el || !this.el.analyticsPanel) return;
    this._analyticsOpen = (forceOpen !== null) ? forceOpen : !this._analyticsOpen;
    this.el.analyticsPanel.style.display = this._analyticsOpen ? 'block' : 'none';
    if (this.el.analyticsChevron) {
      this.el.analyticsChevron.className = this._analyticsOpen ? 'mdi mdi-chevron-up' : 'mdi mdi-chevron-down';
    }
    if (this._analyticsOpen) {
      this.renderAnalyticsPanel();
    }
  }

  renderAnalyticsPanel() {
    if (!this.el || !this.statsManager) return;

    // 1. Top 3 Confusions
    if (this.el.topConfusionsGrid) {
      const topPairs = this.statsManager.getTopConfusions(3);
      if (topPairs.length === 0) {
        this.el.topConfusionsGrid.innerHTML = '<span style="color:#778; font-size:0.75rem;">尚無混淆數據</span>';
      } else {
        this.el.topConfusionsGrid.innerHTML = topPairs.map(item => {
          const badgeText = item.severity === 'critical' ? '高頻混淆' : (item.severity === 'warning' ? '中度混淆' : '輕度混淆');
          return `
            <div class="rx-confusion-card">
              <div class="rx-confusion-pair-text">
                <span style="color:#00e676;">${item.expected}</span>
                <i class="mdi mdi-arrow-right" style="font-size:0.75rem; color:#778; margin:0 4px;"></i>
                <span style="color:#ff5252;">${item.actual}</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="rx-severity-badge ${item.severity}">${badgeText}</span>
                <span style="color:#889; font-size:0.72rem;">${item.count} 次</span>
                <button type="button" class="rx-btn-drill-pair rx-btn-ghost" data-pair="${item.pair}" title="特訓此配對">
                  <i class="mdi mdi-sword-cross"></i> 特訓
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Weakest 5 Characters
    if (this.el.weakCharsList) {
      const weakest = this.statsManager.getWeakestCharacters(5);
      if (weakest.length === 0) {
        this.el.weakCharsList.innerHTML = '<span style="color:#778; font-size:0.75rem;">尚無統計數據</span>';
      } else {
        this.el.weakCharsList.innerHTML = weakest.map(item => {
          const accColor = item.accuracy >= 90 ? '#00e676' : (item.accuracy >= 70 ? 'var(--gold)' : '#ff5252');
          return `
            <div class="rx-weak-char-chip">
              <span class="rx-weak-char-letter">${item.char}</span>
              <span style="color:${accColor}; font-weight:bold;">${item.accuracy}%</span>
              <span style="color:#667; font-size:0.68rem;">(${item.attempts}題)</span>
            </div>
          `;
        }).join('');
      }
    }

    // 3. Latency & Speed Trend
    if (this.el.latencyTrend) {
      const summary = this.statsManager.getSummaryStats();
      const recentSessions = this.statsManager.getHistory(5);
      if (summary.totalSessions === 0) {
        this.el.latencyTrend.innerHTML = '<span style="color:#778; font-size:0.75rem;">尚無反射數據</span>';
      } else {
        const trendHtml = recentSessions.map(s => {
          const latText = s.avgLatency > 0 ? `${s.avgLatency}ms` : '--';
          return `<span class="rx-trend-chip"><i class="mdi mdi-ray-vertex"></i> ${latText} (${s.accuracy}%)</span>`;
        }).join('');
        this.el.latencyTrend.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#cde;">
              <span>近期均值: <b style="color:var(--gold);">${summary.recentAvgLatency} ms</b></span>
              <span>均速: <b style="color:var(--neon-blue);">${recentSessions[0]?.charWpm || 20} WPM</b></span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:2px;">
              ${trendHtml}
            </div>
          </div>
        `;
      }
    }
  }

  startTargetedDrill(expected, actual) {
    const exp = (expected || 'B').toUpperCase().trim();
    const act = (actual || 'D').toUpperCase().trim();
    this.drillTarget = { expected: exp, actual: act, pairKey: `${exp}->${act}` };
    this.submode = 'drill';

    if (this.el && this.el.scorecard) {
      this.el.scorecard.style.display = 'none';
    }
    if (this.el && this.el.kochStageBar) {
      this.el.kochStageBar.style.display = 'none';
    }

    let drillTargets = [];
    if (typeof generateWeaknessTargets === 'function') {
      drillTargets = generateWeaknessTargets([exp, act], 10);
    } else if (typeof window !== 'undefined' && typeof window.generateWeaknessTargets === 'function') {
      drillTargets = window.generateWeaknessTargets([exp, act], 10);
    } else {
      drillTargets = [exp, act, exp, act, exp, act, 'E', 'T', 'A', 'N'];
    }

    this.startSession('drill', drillTargets);
    if (this.el && this.el.feedbackMsg) {
      this.el.feedbackMsg.innerHTML = `<span style="color:var(--gold);"><i class="mdi mdi-sword-cross"></i> 弱點專攻：${exp} <i class="mdi mdi-sword-cross"></i> ${act}（60% 針對混淆出題）</span>`;
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
      case 'drill': return this.drillTarget ? `弱點專攻 (${this.drillTarget.expected} vs ${this.drillTarget.actual})` : '弱點專攻';
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
