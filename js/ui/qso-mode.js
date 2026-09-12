/**
 * UI CONTROLLER: QsoMode
 * Workspace 3: 擬真電台 CW QSO 通聯工作台控制器
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Architecture)
 */

class QsoMode {
  constructor(options = {}) {
    this.qsoManager = options.qsoManager || (typeof window !== 'undefined' ? window.qsoManager : null);
    this.qsoLogManager = options.qsoLogManager || (typeof window !== 'undefined' ? window.qsoLogManager : null);
    this.cwPlayer = options.cwPlayer || (typeof window !== 'undefined' ? window.cwPlayer : null);
    this.synth = options.synth || (typeof window !== 'undefined' ? window.synth : null);
    this.engine = options.engine || (typeof window !== 'undefined' ? window.engine : null);

    this.qrnEnabled = false;
    this.qsbEnabled = true;
    this.bfoPitch = 660;

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
      smeterLadder: document.getElementById('qso-smeter-ladder'),
      carrierDot: document.getElementById('qso-carrier-dot'),
      carrierText: document.getElementById('qso-carrier-text'),

      // RF Controls
      chkQrn: document.getElementById('chk-qso-qrn'),
      chkQsb: document.getElementById('chk-qso-qsb'),
      selBfo: document.getElementById('sel-qso-bfo'),

      // Guided Step Info
      stageGuide: document.getElementById('qso-stage-guide'),
      stepBadges: document.querySelectorAll('.qso-step-badge'),
      guidePrompt: document.getElementById('qso-guide-prompt'),
      guideHint: document.getElementById('qso-guide-hint'),
      btnUseHint: document.getElementById('btn-qso-use-hint'),

      // Terminal
      terminalFeed: document.getElementById('qso-terminal-feed'),
      remoteCall: document.getElementById('qso-remote-call'),
      remoteDetails: document.getElementById('qso-remote-details'),
      myCall: document.getElementById('qso-my-call'),
      myDetails: document.getElementById('qso-my-details'),
      btnReplayRx: document.getElementById('btn-qso-replay-rx'),
      btnNewStation: document.getElementById('btn-qso-new-station'),

      // Macros
      macroButtons: document.querySelectorAll('.qso-macro-btn'),

      // TX Cockpit
      txBuffer: document.getElementById('qso-tx-buffer'),
      btnClearTx: document.getElementById('btn-qso-tx-clear'),
      btnSendTx: document.getElementById('btn-qso-tx-send'),
      lastAck: document.getElementById('qso-last-ack'),

      // Logbook
      logbookTbody: document.getElementById('qso-logbook-tbody'),
      logbookEmpty: document.getElementById('qso-logbook-empty'),
      btnExportAdif: document.getElementById('btn-qso-export-adif'),
      btnExportCsv: document.getElementById('btn-qso-export-csv'),
      btnClearLogs: document.getElementById('btn-qso-clear-logs'),
      btnBackCockpit: document.getElementById('btn-qso-back-cockpit')
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

    if (this.el.selBfo) {
      this.el.selBfo.addEventListener('change', (e) => {
        this.bfoPitch = parseInt(e.target.value, 10) || 660;
        if (this.synth) this.synth.frequency = this.bfoPitch;
      });
    }

    // 4. Guided Hint Button
    if (this.el.btnUseHint) {
      this.el.btnUseHint.addEventListener('click', () => {
        if (!this.qsoManager) return;
        const step = this.qsoManager.getGuidedStepInfo();
        if (step && step.hint && this.el.txBuffer) {
          this.el.txBuffer.value = step.hint;
          this.el.txBuffer.focus();
        }
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

    // 6. Macro Buttons Deck
    if (this.el.macroButtons) {
      this.el.macroButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const macro = btn.getAttribute('data-macro');
          if (this.qsoManager) {
            const text = this.qsoManager.generateMacroText(macro);
            if (text && this.el.txBuffer) {
              this.el.txBuffer.value = text;
              this.el.txBuffer.focus();
            }
          }
        });
      });
    }

    // 7. TX Input & Send
    if (this.el.btnSendTx) {
      this.el.btnSendTx.addEventListener('click', () => {
        this.transmitCurrentBuffer();
      });
    }

    if (this.el.btnClearTx) {
      this.el.btnClearTx.addEventListener('click', () => {
        if (this.el.txBuffer) {
          this.el.txBuffer.value = '';
          this.el.txBuffer.focus();
        }
      });
    }

    if (this.el.txBuffer) {
      this.el.txBuffer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.transmitCurrentBuffer();
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
      if (this.qsoLogManager && logEntry) {
        this.qsoLogManager.addLog(logEntry);
      }
      this.printFeed('SYS', `73! 通聯圓滿完成！日誌已記錄 [${logEntry ? logEntry.dxCall : 'DX'}]`);
      if (this.el.lastAck) {
        this.el.lastAck.textContent = '通聯完成！已自動記錄至電台日誌 (可切換至日誌頁檢視)';
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
    }
  }

  // ==========================================
  // WORKSPACE LIFECYCLE & K5 DOCK REPARENTING
  // ==========================================
  onEnterQso() {
    this.syncOperatorSettings();
    this.updateStationMeta();
    this.updateGuidedUI();

    // Dynamically reparent K5 Dock into ws-container-qso so keyer is immediately available
    const k5Dock = document.getElementById('k5-dock');
    const wsQso = document.getElementById('ws-container-qso');
    if (k5Dock && wsQso && k5Dock.parentElement !== wsQso) {
      wsQso.appendChild(k5Dock);
    }

    // Start QRN noise if enabled
    if (this.qrnEnabled && this.synth && typeof this.synth.startNoise === 'function') {
      this.synth.startNoise();
    }

    // Scroll terminal to latest
    if (this.el.terminalFeed) {
      this.el.terminalFeed.scrollTop = this.el.terminalFeed.scrollHeight;
    }
  }

  onLeaveQso() {
    // Reparent K5 Dock back into ws-container-tx
    const k5Dock = document.getElementById('k5-dock');
    const wsTx = document.getElementById('ws-container-tx');
    if (k5Dock && wsTx && k5Dock.parentElement !== wsTx) {
      wsTx.appendChild(k5Dock);
    }

    // Stop remote audio playback if in progress
    if (this.cwPlayer && this.cwPlayer.isPlaying) {
      this.cwPlayer.stop();
    }

    // Stop QRN noise
    if (this.synth && typeof this.synth.stopNoise === 'function') {
      this.synth.stopNoise();
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
  // TRANSMISSION & TELETYPE TERMINAL
  // ==========================================
  handleLetterDecoded(char) {
    if (!this.isWorkspaceActive()) return;
    if (!this.el.txBuffer) return;

    if (char === '<HH>') {
      // Erase last word
      const val = this.el.txBuffer.value.trimEnd();
      const lastSpace = val.lastIndexOf(' ');
      this.el.txBuffer.value = (lastSpace !== -1) ? val.slice(0, lastSpace + 1) : '';
      return;
    }

    this.el.txBuffer.value += char;
    this.el.txBuffer.scrollLeft = this.el.txBuffer.scrollWidth;

    // Carrier TX blip
    this.setCarrierState('TX');
    clearTimeout(this._txBlipTimer);
    this._txBlipTimer = setTimeout(() => {
      if (!this._isRemotePlaying) this.setCarrierState('IDLE');
    }, 300);
  }

  transmitCurrentBuffer() {
    if (!this.el.txBuffer) return;
    const text = this.el.txBuffer.value.trim();
    if (!text) return;

    if (!this.qsoManager) return;

    // Send to domain state machine
    const res = this.qsoManager.handleUserTransmit(text);

    // Print to terminal feed
    const myCall = (this.qsoManager.myStation && this.qsoManager.myStation.call) ? this.qsoManager.myStation.call : 'BV2TT';
    this.printFeed('TX', text, myCall);

    // Clear input buffer
    this.el.txBuffer.value = '';

    if (this.el.lastAck) {
      this.el.lastAck.textContent = res.feedback || '電文已發射';
    }
  }

  printFeed(sender, text, callsign = '') {
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

  // ==========================================
  // REMOTE CW PLAYBACK & S-METER
  // ==========================================
  async playRemoteCw(text, delayMs = 600) {
    if (!text) return;

    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }

    if (!this.isWorkspaceActive()) return;

    this._isRemotePlaying = true;
    this.setCarrierState('RX');

    // Calculate target S-meter level (S7 to S9+20dB with QSB)
    let targetS = 9;
    if (this.qsbEnabled) {
      targetS = Math.floor(Math.random() * 5) + 6; // S6 ~ S10 (S9+10dB)
    }

    // Attach transient CWPlayer pulse listeners to drive S-Meter
    const onPulseStart = () => {
      const flutter = this.qsbEnabled ? (Math.random() * 2 - 1) : 0;
      this.setSmeterLevel(targetS + flutter, true);
    };

    const onPulseEnd = () => {
      this.setSmeterLevel(1, false);
    };

    if (this.cwPlayer) {
      this.cwPlayer.on('pulseStart', onPulseStart);
      this.cwPlayer.on('pulseEnd', onPulseEnd);
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
      }

      this._isRemotePlaying = false;
      this.setCarrierState('IDLE');
      this.setSmeterLevel(1, false);

      // Print received message into terminal feed
      const remoteCall = (this.qsoManager && this.qsoManager.remoteStation) ? this.qsoManager.remoteStation.call : 'DX';
      this.printFeed('RX', text, remoteCall);
    }
  }

  setCarrierState(state) {
    if (!this.el.carrierDot || !this.el.carrierText) return;

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
    const clampedLevel = Math.max(0, Math.min(11, level));

    // Map level 0~11 to rotation angle: -45deg (S0) to +45deg (S9+30dB)
    // S0: -45deg, S5: -10deg, S9: +18deg, S9+30dB: +45deg
    const angle = -45 + (clampedLevel / 11) * 90;

    if (this.el.smeterNeedle) {
      this.el.smeterNeedle.setAttribute('transform', `rotate(${angle.toFixed(1)}, 100, 80)`);
    }

    // Readout badge text
    if (this.el.smeterReadout) {
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
    if (this.el.smeterLadder) {
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
    if (!this.qsoManager) return;

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
    if (!this.qsoManager) return;
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
      `;
      this.el.logbookTbody.appendChild(tr);
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
}

// Global window registration
if (typeof window !== 'undefined') {
  window.QsoMode = QsoMode;
}

// Export for Node.js test environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QsoMode };
}
