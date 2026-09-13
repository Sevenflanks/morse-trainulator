/**
 * UI CONTROLLER: QsoMode
 * Workspace 3: 擬真電台 CW QSO 通聯工作台控制器
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Architecture)
 */

class QsoMode {
  constructor(options = {}) {
    this.qsoManager = options.qsoManager || (typeof window !== 'undefined' ? window.qsoManager : null);
    this.qsoLogManager = options.qsoLogManager || (typeof window !== 'undefined' ? window.qsoLogManager : null);
    this.qslRenderer = options.qslRenderer || (typeof window !== 'undefined' ? (window.qslCardRenderer || (window.QslCardRenderer ? new window.QslCardRenderer() : null)) : null);
    this.cwPlayer = options.cwPlayer || (typeof window !== 'undefined' ? window.cwPlayer : null);
    this.synth = options.synth || (typeof window !== 'undefined' ? window.synth : null);
    this.engine = options.engine || (typeof window !== 'undefined' ? window.engine : null);

    this.qrnEnabled = false;
    this.qsbEnabled = true;
    this.bfoPitch = 660;

    this.currentQslTheme = 'cyber-brass';
    this.activeQslData = null;
    this.blindEnabled = false;

    this._liveLineEl = null;
    this._liveContentEl = null;
    this._liveTxText = '';
    this._autoFinalizeTimer = null;
    this._isDemoPlaying = false;
    this._txBlipTimer = null;
    this._originalSidetoneFreq = null;

    this._boundCwPulseStart = null;
    this._boundCwPulseEnd = null;
    this._boundCwPlaybackComplete = null;
    this._isRemotePlaying = false;
    this._qsbTimer = null;
    this._initialized = false;
  }

  isWorkspaceActive() {
    if (typeof document === 'undefined') return false;
    const ws = document.getElementById('ws-container-qso');
    return !!(ws && (ws.classList.contains('active') || ws.style.display === 'flex' || ws.style.display === 'block'));
  }

  init() {
    if (typeof document === 'undefined') return;

    // Cache elements
    this.el = {
      wsContainer: document.getElementById('ws-container-qso'),
      submodePills: document.querySelectorAll('.qso-mode-pill'),
      cockpitStage: document.getElementById('qso-cockpit-stage'),
      logbookStage: document.getElementById('qso-logbook-stage'),

      // VFO & SDR Bar
      bandButtons: document.querySelectorAll('.qso-band-btn'),
      vfoFreq: document.getElementById('qso-vfo-freq'),

      // S-Meter & Carrier
      smeterNeedle: document.getElementById('qso-smeter-needle-group'),
      smeterReadout: document.getElementById('qso-smeter-readout'),
      smeterLevel: document.getElementById('qso-smeter-level'),
      smeterDb: document.getElementById('qso-smeter-db'),
      smeterLadder: document.getElementById('qso-smeter-ladder'),
      carrierDot: document.getElementById('qso-carrier-dot'),
      carrierText: document.getElementById('qso-carrier-text'),

      // RF Controls
      chkQrn: document.getElementById('chk-qso-qrn'),
      chkQsb: document.getElementById('chk-qso-qsb'),
      chkBlind: document.getElementById('chk-qso-blind'),
      selBfo: document.getElementById('sel-qso-bfo'),

      // Guided Step Info
      stageGuide: document.getElementById('qso-stage-guide'),
      stepBadges: document.querySelectorAll('.qso-step-badge'),
      guidePrompt: document.getElementById('qso-guide-prompt'),
      guideHint: document.getElementById('qso-guide-hint'),
      btnPlayDemo: document.getElementById('btn-qso-play-demo'),

      // Terminal
      terminalFeed: document.getElementById('qso-terminal-feed'),
      remoteCall: document.getElementById('qso-remote-call'),
      remoteDetails: document.getElementById('qso-remote-details'),
      myCall: document.getElementById('qso-my-call'),
      myDetails: document.getElementById('qso-my-details'),
      btnEditMyCall: document.getElementById('btn-qso-edit-my-call'),
      btnReplayRx: document.getElementById('btn-qso-replay-rx'),
      btnNewStation: document.getElementById('btn-qso-new-station'),

      // Live Keying Telemetry Deck
      telemSeq: document.getElementById('qso-telem-seq'),
      telemChar: document.getElementById('qso-telem-char'),
      telemWpm: document.getElementById('qso-telem-wpm'),
      gapBar: document.getElementById('qso-gap-bar'),
      btnTxOver: document.getElementById('btn-qso-tx-over'),
      btnClearFeed: document.getElementById('btn-qso-clear-feed'),

      // Macros
      macroButtons: document.querySelectorAll('.qso-macro-btn'),

      // Status Bar
      lastAck: document.getElementById('qso-last-ack'),

      // Logbook
      logbookTbody: document.getElementById('qso-logbook-tbody'),
      logbookEmpty: document.getElementById('qso-logbook-empty'),
      btnExportAdif: document.getElementById('btn-qso-export-adif'),
      btnExportCsv: document.getElementById('btn-qso-export-csv'),
      btnClearLogs: document.getElementById('btn-qso-clear-logs'),
      btnBackCockpit: document.getElementById('btn-qso-back-cockpit'),

      // QSL Modal
      qslModal: document.getElementById('qsl-modal'),
      qslModalBackdrop: document.getElementById('qsl-modal-backdrop'),
      btnCloseQsl: document.getElementById('btn-close-qsl'),
      qslCanvas: document.getElementById('qsl-card-canvas'),
      qslThemePills: document.querySelectorAll('.qsl-theme-pill'),
      btnQslDownload: document.getElementById('btn-qsl-download'),
      btnQslCopy: document.getElementById('btn-qsl-copy'),
      qslMetaHint: document.getElementById('qsl-modal-meta-hint')
    };

    this.bindEvents();
    this.bindManagerEvents();
    this.syncOperatorSettings();
    this.updateStationMeta();
    this.updateGuidedUI();
    this.setSmeterLevel(1, false);

    // Initial system print
    this.printFeed('SYS', 'SDR 接收機就緒 · VFO 鎖定於 14.025.00 MHz (20M)');
    if (this.qsoManager && this.qsoManager.remoteStation) {
      this.printFeed('SYS', `偵測到遠端電台呼叫訊號 [${this.qsoManager.remoteStation.call}]，等待建立通聯...`);
    }

    this._initialized = true;
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  bindEvents() {
    // 1. Submode Navigation
    if (this.el.submodePills) {
      this.el.submodePills.forEach(pill => {
        pill.addEventListener('click', () => {
          const submode = pill.getAttribute('data-submode');
          this.switchSubmode(submode);
        });
      });
    }

    // 2. Band Switcher
    if (this.el.bandButtons) {
      this.el.bandButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const band = btn.getAttribute('data-band');
          this.setBand(band);
        });
      });
    }

    // 3. RF Atmosphere Controls
    if (this.el.chkQrn) {
      this.el.chkQrn.addEventListener('change', (e) => {
        this.qrnEnabled = e.target.checked;
        if (this.isWorkspaceActive()) {
          if (this.qrnEnabled) {
            if (this.synth && typeof this.synth.startNoise === 'function') this.synth.startNoise();
          } else {
            if (this.synth && typeof this.synth.stopNoise === 'function') this.synth.stopNoise();
          }
        }
      });
    }

    if (this.el.chkQsb) {
      this.el.chkQsb.addEventListener('change', (e) => {
        this.qsbEnabled = e.target.checked;
      });
    }

    if (this.el.chkBlind) {
      this.el.chkBlind.addEventListener('change', (e) => {
        this.blindEnabled = e.target.checked;
        if (!this.blindEnabled) {
          this.revealAllBlindMessages();
        }
      });
    }

    if (this.el.selBfo) {
      this.el.selBfo.addEventListener('change', (e) => {
        this.bfoPitch = parseInt(e.target.value, 10) || 660;
        if (this.synth) this.synth.frequency = this.bfoPitch;
      });
    }

    // 4. Guided Hint Demo Playback (示範播放)
    if (this.el.btnPlayDemo) {
      this.el.btnPlayDemo.addEventListener('click', () => {
        const step = this.qsoManager ? this.qsoManager.getGuidedStepInfo() : null;
        const text = (step && step.hint) ? step.hint : 'CQ CQ CQ DE BV2TT BV2TT K';
        this.playDemoTransmission(text);
      });
    }

    // 5. Terminal Actions
    if (this.el.btnReplayRx) {
      this.el.btnReplayRx.addEventListener('click', () => {
        if (this.qsoManager && this.qsoManager.lastRemoteMessage) {
          this.playRemoteCw(this.qsoManager.lastRemoteMessage, 200);
        }
      });
    }

    if (this.el.btnNewStation) {
      this.el.btnNewStation.addEventListener('click', () => {
        if (this.qsoManager) {
          this.qsoManager.resetQso();
          this.updateStationMeta();
          this.updateGuidedUI();
          this.printFeed('SYS', `已切換至新遠端電台呼號: ${this.qsoManager.remoteStation ? this.qsoManager.remoteStation.call : 'DX'}`);
        }
      });
    }

    // 6. Macro Buttons Deck (點擊自動示範發報)
    if (this.el.macroButtons) {
      this.el.macroButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const macro = btn.getAttribute('data-macro');
          if (this.qsoManager) {
            const text = this.qsoManager.generateMacroText(macro);
            if (text) {
              this.playDemoTransmission(text);
            }
          }
        });
      });
    }

    // 7. Live Telemetry Deck Actions
    if (this.el.btnTxOver) {
      this.el.btnTxOver.addEventListener('click', () => {
        this.finalizeLiveTx();
      });
    }

    if (this.el.btnClearFeed) {
      this.el.btnClearFeed.addEventListener('click', () => {
        if (this.el.terminalFeed) {
          this.el.terminalFeed.innerHTML = '';
          this._liveLineEl = null;
          this._liveContentEl = null;
          this._liveTxText = '';
          this.printFeed('SYS', '電傳記錄已清空。');
        }
      });
    }

    // 8. Logbook Action Buttons
    if (this.el.btnBackCockpit) {
      this.el.btnBackCockpit.addEventListener('click', () => {
        this.switchSubmode('guided');
      });
    }

    if (this.el.btnExportAdif) {
      this.el.btnExportAdif.addEventListener('click', () => {
        this.exportADIF();
      });
    }

    if (this.el.btnExportCsv) {
      this.el.btnExportCsv.addEventListener('click', () => {
        this.exportCSV();
      });
    }

    if (this.el.btnClearLogs) {
      this.el.btnClearLogs.addEventListener('click', () => {
        if (confirm('確定要清空所有電台通聯日誌嗎？此動作無法復原。')) {
          if (this.qsoLogManager) {
            this.qsoLogManager.clearLogs();
            this.renderLogbook();
          }
        }
      });
    }

    // 9. QSL Confirmation Modal Controls
    if (this.el.btnCloseQsl) {
      this.el.btnCloseQsl.addEventListener('click', () => {
        this.closeQslModal();
      });
    }

    if (this.el.qslModalBackdrop) {
      this.el.qslModalBackdrop.addEventListener('click', () => {
        this.closeQslModal();
      });
    }

    if (this.el.qslThemePills) {
      this.el.qslThemePills.forEach(pill => {
        pill.addEventListener('click', () => {
          const theme = pill.getAttribute('data-qsl-theme');
          this.setQslTheme(theme);
        });
      });
    }

    if (this.el.btnQslDownload) {
      this.el.btnQslDownload.addEventListener('click', () => {
        this.downloadQslCard();
      });
    }

    if (this.el.btnQslCopy) {
      this.el.btnQslCopy.addEventListener('click', () => {
        this.copyQslCard();
      });
    }
  }

  bindManagerEvents() {
    if (!this.qsoManager) return;

    this.qsoManager.on('phaseChanged', () => {
      this.updateGuidedUI();
    });

    this.qsoManager.on('botResponseReady', (data) => {
      if (data && data.text) {
        this.playRemoteCw(data.text, data.delay || 800);
      }
    });

    this.qsoManager.on('qsoComplete', (logEntry) => {
      let savedLog = logEntry;
      if (this.qsoLogManager && logEntry) {
        savedLog = this.qsoLogManager.addLog(logEntry);
      }
      this.printFeed('SYS', `73! 通聯圓滿完成！日誌已記錄 [${logEntry ? logEntry.dxCall : 'DX'}]`);
      if (this.el.lastAck) {
        this.el.lastAck.innerHTML = `通聯完成！已自動記錄至電台日誌 · <button type="button" class="btn-xs-util" id="btn-quick-qsl" style="margin-left:6px; cursor:pointer;"><i class="mdi mdi-card-account-details"></i> 簽發 QSL 卡</button>`;
        const btnQuick = document.getElementById('btn-quick-qsl');
        if (btnQuick) {
          btnQuick.addEventListener('click', () => {
            this.openQslModal(savedLog || logEntry);
          });
        }
      }
    });

    this.qsoManager.on('validationWarning', (data) => {
      if (data && data.feedback) {
        this.printFeed('SYS', `[發報提示] ${data.feedback}`);
      }
    });

    this.qsoManager.on('bandChanged', (data) => {
      if (this.el.vfoFreq && data) {
        this.el.vfoFreq.textContent = `${data.freq}.00`;
      }
      this.printFeed('SYS', `VFO 已切換至 ${data.band} 頻段 (${data.freq}.00 MHz)`);
    });
  }

  syncOperatorSettings() {
    const settings = (typeof window !== 'undefined' && window.settingsManager) ? window.settingsManager.settings : null;
    if (settings && this.qsoManager) {
      this.qsoManager.setMyStation({
        call: settings.operatorCallsign || 'BV2TT',
        name: settings.operatorName || 'EDDIE',
        qth: settings.operatorQth || 'TAIPEI',
        grid: settings.operatorGrid || 'PL05',
        rig: settings.operatorRig || '100W',
        ant: settings.operatorAnt || 'DIPOLE'
      });
      this.updateStationMeta();
    }
  }

  syncWpmFromSettings() {
    if (!this.cwPlayer) return;
    const eng = this.engine || (typeof window !== 'undefined' ? window.engine : null);
    if (eng) {
      this.cwPlayer.setUnitT(eng.getEffectiveUnitT());
      this.cwPlayer.setFarnsworth(
        !!(eng.config && eng.config.farnsworthEnabled),
        (eng.config && eng.config.charWpm) ? eng.config.charWpm : 20
      );
    } else if (typeof window !== 'undefined' && window.settingsManager && window.settingsManager.settings) {
      const s = window.settingsManager.settings;
      const unitT = s.unitT || 80;
      this.cwPlayer.setUnitT(unitT);
      this.cwPlayer.setFarnsworth(!!s.farnsworthEnabled, s.farnsworthWpm || 20);
    }
  }

  revealAllBlindMessages() {
    if (!this.el || !this.el.terminalFeed) return;
    const reveals = this.el.terminalFeed.querySelectorAll('.btn-qso-reveal');
    reveals.forEach(btn => {
      try { btn.click(); } catch (e) {}
    });
  }

  // ==========================================
  // WORKSPACE LIFECYCLE & K5 DOCK REPARENTING
  // ==========================================
  onEnterQso() {
    this.syncOperatorSettings();
    this.syncWpmFromSettings();
    this.updateStationMeta();
    this.updateGuidedUI();

    // Cache user's original sidetone frequency for safe restoration
    if (typeof window !== 'undefined' && window.settingsManager && window.settingsManager.settings) {
      this._originalSidetoneFreq = window.settingsManager.settings.sidetoneFreq;
    } else if (this.synth) {
      this._originalSidetoneFreq = this.synth.frequency;
    }

    // Dynamically reparent K5 Dock into ws-container-qso so keyer is immediately available
    if (typeof document !== 'undefined') {
      const k5Dock = document.getElementById('k5-dock');
      const wsQso = document.getElementById('ws-container-qso');
      if (k5Dock && wsQso && k5Dock.parentElement !== wsQso) {
        wsQso.appendChild(k5Dock);
      }
    }

    // Start QRN noise if enabled
    if (this.qrnEnabled && this.synth && typeof this.synth.startNoise === 'function') {
      this.synth.startNoise();
    }

    // Scroll terminal to latest
    if (this.el && this.el.terminalFeed) {
      this.el.terminalFeed.scrollTop = this.el.terminalFeed.scrollHeight;
    }
  }

  onLeaveQso() {
    // Reparent K5 Dock back into ws-container-tx
    if (typeof document !== 'undefined') {
      const k5Dock = document.getElementById('k5-dock');
      const wsTx = document.getElementById('ws-container-tx');
      if (k5Dock && wsTx && k5Dock.parentElement !== wsTx) {
        wsTx.appendChild(k5Dock);
      }
    }

    // Stop demo playback if running
    if (this._isDemoPlaying) {
      this.stopDemoTransmission();
    }

    // Stop remote audio playback if in progress
    if (this.cwPlayer && this.cwPlayer.isPlaying) {
      this.cwPlayer.stop();
    }

    // Clear timers
    if (this._autoFinalizeTimer) {
      clearTimeout(this._autoFinalizeTimer);
      this._autoFinalizeTimer = null;
    }

    // Stop QRN noise
    if (this.synth && typeof this.synth.stopNoise === 'function') {
      this.synth.stopNoise();
    }

    // Restore user's original sidetone frequency
    if (this.synth && this._originalSidetoneFreq) {
      this.synth.frequency = this._originalSidetoneFreq;
    }

    // Reset S-meter
    this.setSmeterLevel(0, false);
    this.setCarrierState('IDLE');
  }

  // ==========================================
  // SUBMODE & BAND SWITCHING
  // ==========================================
  switchSubmode(submode) {
    if (!submode) return;

    if (this.el.submodePills) {
      this.el.submodePills.forEach(pill => {
        const pSub = pill.getAttribute('data-submode');
        pill.classList.toggle('active', pSub === submode);
      });
    }

    if (submode === 'logbook') {
      if (this.el.cockpitStage) this.el.cockpitStage.style.display = 'none';
      if (this.el.logbookStage) this.el.logbookStage.style.display = 'flex';
      this.renderLogbook();
    } else {
      if (this.el.cockpitStage) this.el.cockpitStage.style.display = 'flex';
      if (this.el.logbookStage) this.el.logbookStage.style.display = 'none';

      if (this.el.stageGuide) {
        this.el.stageGuide.style.display = (submode === 'guided') ? 'flex' : 'none';
      }

      if (this.qsoManager) {
        this.qsoManager.setSubmode(submode);
        this.updateStationMeta();
        this.updateGuidedUI();
      }

      const labelMap = { guided: '標準引導模式 (Guided)', free: '空中自由頻段 (Free)', contest: '競賽連珠模式 (Contest)' };
      this.printFeed('SYS', `工作台子模式切換為: ${labelMap[submode] || submode}`);
    }
  }

  setBand(bandId) {
    if (!bandId) return;

    if (this.el.bandButtons) {
      this.el.bandButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-band') === bandId);
      });
    }

    if (this.qsoManager) {
      this.qsoManager.setBand(bandId);
    }
  }

  // ==========================================
  // TRANSMISSION, TELEMETRY & STREAMING TERMINAL
  // ==========================================
  updateKeyingTelemetry(symbol, durationMs, currentSeq) {
    if (this.el.telemSeq) {
      this.el.telemSeq.textContent = currentSeq || symbol || '—';
    }
    if (this.el.telemChar) {
      const char = (this.engine && currentSeq) ? this.engine.getLetterForSequence(currentSeq) : '—';
      this.el.telemChar.textContent = char || '—';
    }
    if (this.el.telemWpm && durationMs) {
      const wpm = Math.round(1200 / durationMs);
      this.el.telemWpm.textContent = `${Math.round(durationMs)} ms (${wpm} WPM)`;
    }
  }

  _createLiveLine() {
    if (typeof document === 'undefined') return;
    if (!this.el.terminalFeed) return;

    const line = document.createElement('div');
    line.className = 'qso-feed-line live';

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'qso-feed-time';
    timeSpan.textContent = timeStr;
    line.appendChild(timeSpan);

    const myCall = (this.qsoManager && this.qsoManager.myStation && this.qsoManager.myStation.call) ? this.qsoManager.myStation.call : 'BV2TT';
    const tagSpan = document.createElement('span');
    tagSpan.className = 'qso-feed-tag tx';
    tagSpan.textContent = `TX ${myCall}`;
    line.appendChild(tagSpan);

    const textSpan = document.createElement('span');
    textSpan.className = 'qso-feed-text tx';

    const contentSpan = document.createElement('span');
    contentSpan.className = 'qso-live-content';
    textSpan.appendChild(contentSpan);

    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'qso-cursor';
    textSpan.appendChild(cursorSpan);

    line.appendChild(textSpan);
    this.el.terminalFeed.appendChild(line);
    this.el.terminalFeed.scrollTop = this.el.terminalFeed.scrollHeight;

    this._liveLineEl = line;
    this._liveContentEl = contentSpan;
    this._liveTxText = '';
  }

  _appendLiveTxChar(char) {
    if (!this._liveLineEl && typeof document !== 'undefined') {
      this._createLiveLine();
    }
    this._liveTxText += char;
    if (this._liveContentEl) {
      this._liveContentEl.textContent = this._liveTxText;
    }
    if (this.el.terminalFeed) {
      this.el.terminalFeed.scrollTop = this.el.terminalFeed.scrollHeight;
    }
  }

  handleLetterDecoded(char) {
    if (!this.isWorkspaceActive()) return;

    if (char === '<HH>') {
      // Erase last word (prosign 8 dots)
      if (this._liveTxText) {
        const trimmed = this._liveTxText.trimEnd();
        const lastSpace = trimmed.lastIndexOf(' ');
        this._liveTxText = (lastSpace !== -1) ? trimmed.slice(0, lastSpace + 1) : '';
        if (this._liveContentEl) {
          this._liveContentEl.textContent = this._liveTxText;
        }
      }
      if (this.el.telemSeq) this.el.telemSeq.textContent = '—';
      if (this.el.telemChar) this.el.telemChar.textContent = '<HH>';
      return;
    }

    this._appendLiveTxChar(char);

    if (this.el.telemChar) this.el.telemChar.textContent = char;
    if (this.el.telemSeq) this.el.telemSeq.textContent = '—';

    // Carrier TX blip
    this.setCarrierState('TX');
    clearTimeout(this._txBlipTimer);
    this._txBlipTimer = setTimeout(() => {
      if (!this._isRemotePlaying && !this._isDemoPlaying) this.setCarrierState('IDLE');
    }, 300);

    // Auto-finalize countdown timer
    clearTimeout(this._autoFinalizeTimer);
    const trimmed = this._liveTxText.trim();
    if (trimmed.endsWith(' K') || trimmed === 'K' || trimmed.endsWith(' AR') || trimmed.endsWith(' SK')) {
      this._autoFinalizeTimer = setTimeout(() => {
        this.finalizeLiveTx();
      }, 1800);
    } else {
      this._autoFinalizeTimer = setTimeout(() => {
        this.finalizeLiveTx();
      }, 6000);
    }
  }

  finalizeLiveTx() {
    clearTimeout(this._autoFinalizeTimer);
    if (!this._liveTxText || !this._liveTxText.trim()) {
      if (this._liveLineEl && this._liveLineEl.parentElement) {
        this._liveLineEl.parentElement.removeChild(this._liveLineEl);
      }
      this._liveLineEl = null;
      this._liveContentEl = null;
      this._liveTxText = '';
      return;
    }

    const text = this._liveTxText.trim();

    // Remove live class and cursor
    if (this._liveLineEl) {
      this._liveLineEl.classList.remove('live');
      const cursor = this._liveLineEl.querySelector('.qso-cursor');
      if (cursor) cursor.remove();
    }

    this._liveLineEl = null;
    this._liveContentEl = null;
    this._liveTxText = '';

    if (this.qsoManager) {
      const res = this.qsoManager.handleUserTransmit(text);
      if (this.el.lastAck) {
        this.el.lastAck.textContent = (res && res.feedback) ? res.feedback : '電文已發射';
      }
    }
  }

  stopDemoTransmission() {
    if (this.cwPlayer && this.cwPlayer.isPlaying) {
      this.cwPlayer.stop();
    }
    this._isDemoPlaying = false;
    if (this.el.btnPlayDemo) {
      this.el.btnPlayDemo.innerHTML = '<i class="mdi mdi-play"></i> 示範播放';
    }
  }

  async playDemoTransmission(text) {
    if (!text) {
      const step = this.qsoManager ? this.qsoManager.getGuidedStepInfo() : null;
      text = (step && step.hint) ? step.hint : 'CQ CQ CQ DE BV2TT BV2TT K';
    }

    if (this._isDemoPlaying) {
      this.stopDemoTransmission();
      return;
    }

    if (!this.isWorkspaceActive()) return;

    this.syncWpmFromSettings();

    // Finalize any previous live transmission first
    if (this._liveTxText && this._liveTxText.trim()) {
      this.finalizeLiveTx();
    }

    this._isDemoPlaying = true;
    if (this.el.btnPlayDemo) {
      this.el.btnPlayDemo.innerHTML = '<i class="mdi mdi-stop"></i> 停止播放';
    }

    // Create live line for demo stream
    this._createLiveLine();

    const keyBtn = document.getElementById('key-button');
    const k2Straight = document.querySelector('.k2-thumb-wing.mode-straight');

    const onPulseStart = (sym, dur) => {
      this.setCarrierState('TX');
      if (window.ribbon && typeof window.ribbon.startPulse === 'function') {
        window.ribbon.startPulse();
      }
      if (keyBtn) keyBtn.classList.add('active');
      if (k2Straight) k2Straight.classList.add('active');
    };

    const onPulseEnd = () => {
      if (window.ribbon && typeof window.ribbon.endPulse === 'function') {
        window.ribbon.endPulse();
      }
      if (keyBtn) keyBtn.classList.remove('active');
      if (k2Straight) k2Straight.classList.remove('active');
    };

    const onCharStart = (char, seq) => {
      if (this.el.telemChar) this.el.telemChar.textContent = char;
      if (this.el.telemSeq) this.el.telemSeq.textContent = seq || '—';
      if (this.el.telemWpm) {
        const wpm = this.cwPlayer
          ? (this.cwPlayer.farnsworthEnabled ? this.cwPlayer.charWpm : Math.round(1200 / this.cwPlayer.getUnitT()))
          : 20;
        this.el.telemWpm.textContent = `示範 (${wpm} WPM)`;
      }
    };

    const onCharComplete = (char) => {
      this._appendLiveTxChar(char);
    };

    const onWordGapStart = () => {
      this._appendLiveTxChar(' ');
    };

    if (this.cwPlayer) {
      this.cwPlayer.on('pulseStart', onPulseStart);
      this.cwPlayer.on('pulseEnd', onPulseEnd);
      this.cwPlayer.on('charStart', onCharStart);
      this.cwPlayer.on('charComplete', onCharComplete);
      this.cwPlayer.on('wordGapStart', onWordGapStart);
    }

    try {
      if (this.synth) {
        this.synth.frequency = this.bfoPitch;
      }
      if (this.cwPlayer) {
        await this.cwPlayer.playText(text);
      }
    } catch (e) {
      console.error('[QsoMode] Demo transmission error:', e);
    } finally {
      if (this.cwPlayer) {
        this.cwPlayer.off('pulseStart', onPulseStart);
        this.cwPlayer.off('pulseEnd', onPulseEnd);
        this.cwPlayer.off('charStart', onCharStart);
        this.cwPlayer.off('charComplete', onCharComplete);
        this.cwPlayer.off('wordGapStart', onWordGapStart);
      }
      if (keyBtn) keyBtn.classList.remove('active');
      if (k2Straight) k2Straight.classList.remove('active');
      this._isDemoPlaying = false;
      this.setCarrierState('IDLE');
      if (this.el.btnPlayDemo) {
        this.el.btnPlayDemo.innerHTML = '<i class="mdi mdi-play"></i> 示範播放';
      }
      this.finalizeLiveTx();
    }
  }

  printFeed(sender, text, callsign = '') {
    if (typeof document === 'undefined') return;
    if (!this.el.terminalFeed || !text) return;

    const line = document.createElement('div');
    line.className = 'qso-feed-line';

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'qso-feed-time';
    timeSpan.textContent = timeStr;
    line.appendChild(timeSpan);

    const tagSpan = document.createElement('span');
    tagSpan.className = `qso-feed-tag ${sender.toLowerCase()}`;
    tagSpan.textContent = callsign ? `${sender} ${callsign}` : sender;
    line.appendChild(tagSpan);

    const textSpan = document.createElement('span');
    textSpan.className = `qso-feed-text ${sender.toLowerCase()}`;
    textSpan.textContent = text;
    line.appendChild(textSpan);

    this.el.terminalFeed.appendChild(line);
    this.el.terminalFeed.scrollTop = this.el.terminalFeed.scrollHeight;
  }

  _createRxLiveLine(remoteCall = 'DX') {
    if (typeof document === 'undefined' || !this.el || !this.el.terminalFeed) return null;

    const line = document.createElement('div');
    line.className = 'qso-feed-line live rx-live';

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'qso-feed-time';
    timeSpan.textContent = timeStr;
    line.appendChild(timeSpan);

    const tagSpan = document.createElement('span');
    tagSpan.className = 'qso-feed-tag rx';
    tagSpan.textContent = `RX ${remoteCall}`;
    line.appendChild(tagSpan);

    const textSpan = document.createElement('span');
    textSpan.className = 'qso-feed-text rx';

    const contentSpan = document.createElement('span');
    contentSpan.className = 'qso-rx-content';
    if (this.blindEnabled) {
      contentSpan.classList.add('qso-blind-masked');
    }
    textSpan.appendChild(contentSpan);

    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'qso-cursor rx-cursor';
    textSpan.appendChild(cursorSpan);

    line.appendChild(textSpan);
    this.el.terminalFeed.appendChild(line);
    this.el.terminalFeed.scrollTop = this.el.terminalFeed.scrollHeight;

    return { line, contentSpan, cursorSpan };
  }

  // ==========================================
  // REMOTE CW PLAYBACK & S-METER
  // ==========================================
  async playRemoteCw(text, delayMs = 600) {
    if (!text) return;

    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }

    if (!this.isWorkspaceActive()) return;

    this.syncWpmFromSettings();

    this._isRemotePlaying = true;
    this.setCarrierState('RX');

    // Calculate target S-meter level (S7 to S9+20dB with QSB)
    let targetS = 9;
    if (this.qsbEnabled) {
      targetS = Math.floor(Math.random() * 5) + 6; // S6 ~ S10 (S9+10dB)
    }

    const remoteCall = (this.qsoManager && this.qsoManager.remoteStation) ? this.qsoManager.remoteStation.call : 'DX';
    const rxLineObj = this._createRxLiveLine(remoteCall);
    const isBlind = !!this.blindEnabled;
    let streamedDisplay = '';

    // Attach transient CWPlayer pulse listeners to drive S-Meter
    const onPulseStart = () => {
      const flutter = this.qsbEnabled ? (Math.random() * 2 - 1) : 0;
      this.setSmeterLevel(targetS + flutter, true);
    };

    const onPulseEnd = () => {
      this.setSmeterLevel(1, false);
    };

    const onCharComplete = (char) => {
      if (rxLineObj && rxLineObj.contentSpan) {
        if (isBlind) {
          streamedDisplay += '*';
        } else {
          streamedDisplay += char;
        }
        rxLineObj.contentSpan.textContent = streamedDisplay;
        if (this.el.terminalFeed) {
          this.el.terminalFeed.scrollTop = this.el.terminalFeed.scrollHeight;
        }
      }
    };

    const onWordGapStart = () => {
      if (rxLineObj && rxLineObj.contentSpan) {
        streamedDisplay += ' ';
        rxLineObj.contentSpan.textContent = streamedDisplay;
        if (this.el.terminalFeed) {
          this.el.terminalFeed.scrollTop = this.el.terminalFeed.scrollHeight;
        }
      }
    };

    if (this.cwPlayer) {
      this.cwPlayer.on('pulseStart', onPulseStart);
      this.cwPlayer.on('pulseEnd', onPulseEnd);
      this.cwPlayer.on('charComplete', onCharComplete);
      this.cwPlayer.on('wordGapStart', onWordGapStart);
    }

    try {
      if (this.cwPlayer) {
        // Adjust tone to remote station pitch if available
        const originalFreq = this.synth ? this.synth.frequency : 650;
        if (this.synth && this.qsoManager && this.qsoManager.remoteStation && this.qsoManager.remoteStation.pitchHz) {
          this.synth.frequency = this.qsoManager.remoteStation.pitchHz;
        }

        await this.cwPlayer.playText(text);

        // Restore BFO pitch
        if (this.synth) this.synth.frequency = this.bfoPitch;
      }
    } catch (e) {
      console.error('[QsoMode] Audio playback error:', e);
    } finally {
      if (this.cwPlayer) {
        this.cwPlayer.off('pulseStart', onPulseStart);
        this.cwPlayer.off('pulseEnd', onPulseEnd);
        this.cwPlayer.off('charComplete', onCharComplete);
        this.cwPlayer.off('wordGapStart', onWordGapStart);
      }

      this._isRemotePlaying = false;
      this.setCarrierState('IDLE');
      this.setSmeterLevel(1, false);

      if (rxLineObj) {
        if (rxLineObj.line) {
          rxLineObj.line.classList.remove('live', 'rx-live');
        }
        if (rxLineObj.cursorSpan) {
          rxLineObj.cursorSpan.remove();
        }

        if (!isBlind) {
          if (rxLineObj.contentSpan) {
            rxLineObj.contentSpan.textContent = text;
          }
        } else {
          if (rxLineObj.line) {
            const btnReveal = document.createElement('button');
            btnReveal.type = 'button';
            btnReveal.className = 'btn-xs-util btn-qso-reveal';
            btnReveal.title = '揭曉此電文內容 (Reveal)';
            btnReveal.innerHTML = '<i class="mdi mdi-eye-outline"></i> 揭曉';
            btnReveal.addEventListener('click', () => {
              if (rxLineObj.contentSpan) {
                rxLineObj.contentSpan.textContent = text;
                rxLineObj.contentSpan.classList.remove('qso-blind-masked');
              }
              const tag = document.createElement('span');
              tag.className = 'qso-revealed-tag';
              tag.innerHTML = '<i class="mdi mdi-check"></i> 已揭曉';
              btnReveal.replaceWith(tag);
            });
            rxLineObj.line.appendChild(btnReveal);
          }
        }
      } else {
        // Non-DOM / mock environment fallback
        this.printFeed('RX', text, remoteCall);
      }
    }
  }

  setCarrierState(state) {
    if (!this.el || !this.el.carrierDot || !this.el.carrierText) return;

    this.el.carrierDot.className = 'qso-carrier-dot';
    if (state === 'RX') {
      this.el.carrierDot.classList.add('active-rx');
      this.el.carrierText.textContent = 'CARRIER ACTIVE (RX)';
      this.el.carrierText.style.color = '#00e676';
    } else if (state === 'TX') {
      this.el.carrierDot.classList.add('active-tx');
      this.el.carrierText.textContent = 'CARRIER ACTIVE (TX)';
      this.el.carrierText.style.color = 'var(--gold)';
    } else {
      this.el.carrierText.textContent = 'CARRIER IDLE';
      this.el.carrierText.style.color = '#6e7d94';
    }
  }

  setSmeterLevel(level, active = true) {
    if (!this.el) return;
    const clampedLevel = Math.max(0, Math.min(11, level));

    // Map level 0~11 to rotation angle: -45deg (S0) to +45deg (S9+30dB)
    // S0: -45deg, S5: -10deg, S9: +18deg, S9+30dB: +45deg
    const angle = -45 + (clampedLevel / 11) * 90;

    if (this.el.smeterNeedle) {
      this.el.smeterNeedle.style.transform = `rotate(${angle.toFixed(1)}deg)`;
    }

    const lvlEl = this.el.smeterLevel || (this.el.smeterReadout && typeof this.el.smeterReadout.querySelector === 'function' ? this.el.smeterReadout.querySelector('.smeter-s-tag') : null);
    const dbEl = this.el.smeterDb || (this.el.smeterReadout && typeof this.el.smeterReadout.querySelector === 'function' ? this.el.smeterReadout.querySelector('.smeter-s-db') : null);

    if (lvlEl && dbEl) {
      if (!active || clampedLevel <= 1) {
        lvlEl.textContent = 'S1';
        dbEl.textContent = '(NOISE)';
        lvlEl.style.color = '#6e7d94';
        dbEl.style.color = '#6e7d94';
      } else if (clampedLevel <= 9) {
        lvlEl.textContent = `S${Math.round(clampedLevel)}`;
        dbEl.textContent = '';
        lvlEl.style.color = '#00e676';
        dbEl.style.color = '#00e676';
      } else if (clampedLevel <= 10) {
        lvlEl.textContent = 'S9';
        dbEl.textContent = '+10dB';
        lvlEl.style.color = 'var(--gold)';
        dbEl.style.color = 'var(--gold)';
      } else {
        lvlEl.textContent = 'S9';
        dbEl.textContent = '+30dB';
        lvlEl.style.color = '#ff3d00';
        dbEl.style.color = '#ff3d00';
      }
    } else if (this.el.smeterReadout) {
      if (!active || clampedLevel <= 1) {
        this.el.smeterReadout.textContent = 'S1 (NOISE)';
        this.el.smeterReadout.style.color = '#6e7d94';
      } else if (clampedLevel <= 9) {
        this.el.smeterReadout.textContent = `S${Math.round(clampedLevel)}`;
        this.el.smeterReadout.style.color = '#00e676';
      } else if (clampedLevel <= 10) {
        this.el.smeterReadout.textContent = 'S9 +10dB';
        this.el.smeterReadout.style.color = 'var(--gold)';
      } else {
        this.el.smeterReadout.textContent = 'S9 +30dB';
        this.el.smeterReadout.style.color = '#ff3d00';
      }
    }

    // LED ladder segments
    if (this.el.smeterLadder && typeof this.el.smeterLadder.querySelectorAll === 'function') {
      const leds = this.el.smeterLadder.querySelectorAll('.smeter-led');
      leds.forEach(led => {
        const segLevel = parseInt(led.getAttribute('data-level'), 10);
        led.classList.toggle('active', active && segLevel <= clampedLevel);
      });
    }
  }

  // ==========================================
  // METADATA & GUIDED UI UPDATES
  // ==========================================
  updateStationMeta() {
    if (!this.qsoManager || !this.el) return;

    const my = this.qsoManager.myStation;
    if (this.el.myCall) this.el.myCall.textContent = my.call;
    if (this.el.myDetails) this.el.myDetails.textContent = `(${my.name} · ${my.qth} · ${my.rig})`;

    const dx = this.qsoManager.remoteStation;
    if (dx) {
      if (this.el.remoteCall) this.el.remoteCall.textContent = dx.call;
      if (this.el.remoteDetails) this.el.remoteDetails.textContent = `(${dx.name} · ${dx.qth}, ${dx.country} · RST ${dx.rstRcvd} · ${dx.speedWpm} WPM)`;
    } else {
      if (this.el.remoteCall) this.el.remoteCall.textContent = 'FREE AIRWAVES';
      if (this.el.remoteDetails) this.el.remoteDetails.textContent = '(尚未建立呼叫)';
    }
  }

  updateGuidedUI() {
    if (!this.qsoManager || !this.el) return;
    const stepInfo = this.qsoManager.getGuidedStepInfo();
    if (!stepInfo) return;

    if (this.el.guidePrompt) this.el.guidePrompt.textContent = stepInfo.prompt;
    if (this.el.guideHint) this.el.guideHint.textContent = stepInfo.hint;

    if (this.el.stepBadges) {
      this.el.stepBadges.forEach(badge => {
        const bStep = parseInt(badge.getAttribute('data-step'), 10);
        badge.classList.toggle('active', bStep === stepInfo.step);
        badge.classList.toggle('completed', bStep < stepInfo.step || this.qsoManager.guidedCompleted);
      });
    }
  }

  // ==========================================
  // LOGBOOK VIEW & EXPORTS
  // ==========================================
  renderLogbook() {
    if (!this.qsoLogManager || !this.el.logbookTbody) return;

    const logs = this.qsoLogManager.getLogs();
    this.el.logbookTbody.innerHTML = '';

    if (logs.length === 0) {
      if (this.el.logbookEmpty) this.el.logbookEmpty.style.display = 'flex';
      return;
    }

    if (this.el.logbookEmpty) this.el.logbookEmpty.style.display = 'none';

    logs.forEach(log => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${log.dateDisplay} ${log.timeDisplay}</td>
        <td style="color:var(--gold); font-weight:700;">${log.dxCall}</td>
        <td>${log.band}</td>
        <td>${log.freq}</td>
        <td>${log.mode}</td>
        <td>${log.rstSent} / ${log.rstRcvd}</td>
        <td>${log.name || '—'}</td>
        <td>${log.qth || '—'}</td>
        <td>${log.grid || '—'}</td>
        <td style="color:#00e676;"><i class="mdi mdi-check-circle-outline"></i> 確認</td>
        <td>
          <div style="display:flex; gap:4px; align-items:center;">
            <button type="button" class="btn-xs-util btn-view-qsl" data-id="${log.id}" title="檢視與下載 QSL 卡片">
              <i class="mdi mdi-card-account-details"></i> QSL
            </button>
            <button type="button" class="btn-xs-util btn-del-log" data-id="${log.id}" title="刪除通聯記錄" style="color:#ff5252;">
              <i class="mdi mdi-delete-outline"></i>
            </button>
          </div>
        </td>
      `;
      this.el.logbookTbody.appendChild(tr);
    });

    // Bind row action buttons
    const qslBtns = this.el.logbookTbody.querySelectorAll('.btn-view-qsl');
    qslBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const targetLog = logs.find(l => String(l.id) === String(id));
        if (targetLog) {
          this.openQslModal(targetLog);
        }
      });
    });

    const delBtns = this.el.logbookTbody.querySelectorAll('.btn-del-log');
    delBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('確定要刪除這筆通聯記錄嗎？')) {
          this.qsoLogManager.deleteLog(id);
          this.renderLogbook();
        }
      });
    });
  }

  exportADIF() {
    if (!this.qsoLogManager) return;
    const adif = this.qsoLogManager.exportADIF();
    this._downloadFile(adif, `morse_qso_log_${new Date().toISOString().slice(0, 10)}.adi`, 'text/plain');
  }

  exportCSV() {
    if (!this.qsoLogManager) return;
    const csv = this.qsoLogManager.exportCSV();
    this._downloadFile(csv, `morse_qso_log_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  }

  _downloadFile(content, fileName, mimeType) {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // ==========================================
  // QSL CONFIRMATION CARD MODAL & EXPORT
  // ==========================================
  _buildCurrentQsoData() {
    const my = (this.qsoManager && this.qsoManager.myStation) ? this.qsoManager.myStation : {};
    const dx = (this.qsoManager && this.qsoManager.remoteStation) ? this.qsoManager.remoteStation : {};
    const now = new Date();
    return {
      myCall: my.call || 'BV2TT',
      dxCall: dx.call || 'JA1ABC',
      dateDisplay: now.toISOString().slice(0, 10),
      timeDisplay: now.toISOString().slice(11, 16) + ' UTC',
      band: (this.qsoManager && this.qsoManager.band) || '20M',
      freq: (this.qsoManager && this.qsoManager.freq) || '14.025',
      mode: 'CW',
      rstSent: dx.rstSent || '599',
      rstRcvd: dx.rstRcvd || '599',
      myName: my.name || 'EDDIE',
      dxName: dx.name || 'KEN',
      myQth: my.qth || 'TAIPEI, TAIWAN',
      dxQth: dx.qth ? `${dx.qth}, ${dx.country || ''}`.trim() : 'TOKYO, JAPAN',
      myGrid: my.grid || 'PL05',
      dxGrid: dx.grid || 'PM95',
      rig: my.rig || '100W',
      ant: my.ant || 'DIPOLE',
      notes: 'TNX FER FB CW QSO! 73 ES GL'
    };
  }

  openQslModal(qsoData = null) {
    this.activeQslData = qsoData || this._buildCurrentQsoData();

    if (this.el.qslModal) this.el.qslModal.style.display = 'flex';
    if (this.el.qslModalBackdrop) this.el.qslModalBackdrop.style.display = 'block';

    this.renderCurrentQslCard();
  }

  closeQslModal() {
    if (this.el.qslModal) this.el.qslModal.style.display = 'none';
    if (this.el.qslModalBackdrop) this.el.qslModalBackdrop.style.display = 'none';
  }

  setQslTheme(theme) {
    if (!theme) return;
    this.currentQslTheme = theme;

    if (this.el.qslThemePills) {
      this.el.qslThemePills.forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-qsl-theme') === theme);
      });
    }

    this.renderCurrentQslCard();
  }

  renderCurrentQslCard() {
    if (!this.qslRenderer) {
      if (typeof window !== 'undefined' && window.QslCardRenderer) {
        this.qslRenderer = new window.QslCardRenderer();
      } else if (typeof QslCardRenderer !== 'undefined') {
        this.qslRenderer = new QslCardRenderer();
      }
    }

    if (!this.qslRenderer || !this.el.qslCanvas) return;

    const data = this.activeQslData || this._buildCurrentQsoData();
    this.qslRenderer.render(this.el.qslCanvas, data, this.currentQslTheme);
  }

  downloadQslCard() {
    if (!this.qslRenderer || !this.el.qslCanvas) return;
    const data = this.activeQslData || this._buildCurrentQsoData();
    const dateStr = (data.dateDisplay || '').replace(/[^0-9]/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `QSL_${data.myCall || 'BV2TT'}_${data.dxCall || 'STATION'}_${dateStr}.png`;
    this.qslRenderer.downloadCard(this.el.qslCanvas, filename);
  }

  async copyQslCard() {
    if (!this.qslRenderer || !this.el.qslCanvas) return;
    const ok = await this.qslRenderer.copyToClipboard(this.el.qslCanvas);
    if (this.el.btnQslCopy) {
      const originalHTML = this.el.btnQslCopy.innerHTML;
      if (ok) {
        this.el.btnQslCopy.innerHTML = '<i class="mdi mdi-check"></i> 已複製卡片圖片';
        this.el.btnQslCopy.style.color = '#00e676';
        this.el.btnQslCopy.style.borderColor = '#00e676';
      } else {
        this.el.btnQslCopy.innerHTML = '<i class="mdi mdi-alert-circle-outline"></i> 請直接點擊下載';
      }
      setTimeout(() => {
        if (this.el.btnQslCopy) {
          this.el.btnQslCopy.innerHTML = originalHTML;
          this.el.btnQslCopy.style.color = '';
          this.el.btnQslCopy.style.borderColor = '';
        }
      }, 2000);
    }
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  window.QsoMode = QsoMode;
}

// Export for Node.js test environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QsoMode };
}
