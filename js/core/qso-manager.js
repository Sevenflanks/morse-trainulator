/**
 * DOMAIN MODULE: QsoManager
 * 業餘無線電 CW QSO 通聯狀態機、電台生成與對話腳本引擎 (Zero DOM Dependencies)
 * (100% Zero-Emoji, Material Design Icons, Decoupled Domain Model)
 */

class QsoManager {
  constructor(options = {}) {
    this.submode = options.submode || 'guided'; // 'guided' | 'free' | 'contest' | 'logbook'
    this.activeBand = options.activeBand || '20M';
    this.currentFreq = options.currentFreq || '14.025';

    // Operator's own station profile
    this.myStation = {
      call: options.operatorCallsign || 'BV2TT',
      name: options.operatorName || 'EDDIE',
      qth: options.operatorQth || 'TAIPEI',
      grid: options.operatorGrid || 'PL05',
      rig: options.operatorRig || '100W',
      ant: options.operatorAnt || 'DIPOLE',
      rstSent: '599'
    };

    // Active remote DX station
    this.remoteStation = null;

    // Guided Mode State (1: CQ -> 2: RST -> 3: QTH/NAME -> 4: SIGNOFF -> 5: COMPLETE)
    this.guidedPhase = 1;
    this.guidedCompleted = false;

    // Free & Contest mode states
    this.contestSerial = 1;
    this.freeStations = [];

    // Session log and transmission tracking
    this.sessionHistory = []; // [{ sender: 'TX'|'RX', text: string, timestamp: number }]
    this.lastRemoteMessage = '';
    this.isRemoteTransmitting = false;

    this._listeners = {};
    this.init();
  }

  init() {
    this.resetQso();
  }

  // ==========================================
  // EVENT EMITTER
  // ==========================================
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return this;
  }

  off(event, callback) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    return this;
  }

  emit(event, ...args) {
    const cbs = this._listeners[event];
    if (cbs) {
      cbs.forEach(cb => {
        try { cb(...args); } catch (e) { console.error('[QsoManager]', e); }
      });
    }
  }

  // ==========================================
  // OPERATOR CONFIGURATION
  // ==========================================
  setMyStation(profile = {}) {
    if (profile.call) this.myStation.call = profile.call.trim().toUpperCase();
    if (profile.name) this.myStation.name = profile.name.trim().toUpperCase();
    if (profile.qth) this.myStation.qth = profile.qth.trim().toUpperCase();
    if (profile.grid) this.myStation.grid = profile.grid.trim().toUpperCase();
    if (profile.rig) this.myStation.rig = profile.rig.trim().toUpperCase();
    if (profile.ant) this.myStation.ant = profile.ant.trim().toUpperCase();
    this.emit('stationUpdated', this.myStation);
  }

  setSubmode(submode) {
    const valid = ['guided', 'free', 'contest', 'logbook'];
    if (!valid.includes(submode)) submode = 'guided';
    this.submode = submode;
    this.resetQso();
    this.emit('submodeChanged', this.submode);
  }

  setBand(bandId) {
    const bands = (typeof QSO_BANDS !== 'undefined') ? QSO_BANDS : [
      { id: '40M', freq: '7.025', band: '40M', name: '40M CW' },
      { id: '20M', freq: '14.025', band: '20M', name: '20M CW' },
      { id: '15M', freq: '21.025', band: '15M', name: '15M CW' }
    ];
    const found = bands.find(b => b.id === bandId || b.band === bandId);
    if (found) {
      this.activeBand = found.band;
      this.currentFreq = found.freq;
      this.emit('bandChanged', { band: this.activeBand, freq: this.currentFreq });
    }
  }

  setFrequency(freqStr) {
    this.currentFreq = String(freqStr).trim();
    this.emit('frequencyChanged', this.currentFreq);
  }

  // ==========================================
  // REMOTE STATION GENERATION
  // ==========================================
  pickRandomRemoteStation() {
    const stations = (typeof QSO_REMOTE_STATIONS !== 'undefined') ? QSO_REMOTE_STATIONS : [
      { call: 'JA1ABC', name: 'KEN', qth: 'TOKYO', country: 'JAPAN', grid: 'PM95', rstSent: '599', rstRcvd: '579', speedWpm: 20, pitchHz: 660 },
      { call: 'W6XYZ', name: 'BOB', qth: 'LOS ANGELES', country: 'USA', grid: 'DM04', rstSent: '599', rstRcvd: '589', speedWpm: 18, pitchHz: 600 },
      { call: 'DL3HEX', name: 'HANS', qth: 'BERLIN', country: 'GERMANY', grid: 'JO62', rstSent: '599', rstRcvd: '599', speedWpm: 22, pitchHz: 720 },
      { call: 'G4XYZ', name: 'JOHN', qth: 'LONDON', country: 'ENGLAND', grid: 'IO91', rstSent: '599', rstRcvd: '569', speedWpm: 19, pitchHz: 640 },
      { call: 'VK2AA', name: 'DAVE', qth: 'SYDNEY', country: 'AUSTRALIA', grid: 'QF56', rstSent: '599', rstRcvd: '579', speedWpm: 21, pitchHz: 680 }
    ];
    const idx = Math.floor(Math.random() * stations.length);
    const chosen = Object.assign({}, stations[idx]);
    chosen.rstSent = chosen.rstSent || '599';
    chosen.rstRcvd = chosen.rstRcvd || '599';
    return chosen;
  }

  // ==========================================
  // QSO WORKFLOW & PHASES
  // ==========================================
  resetQso(remoteStation = null) {
    this.guidedPhase = 1;
    this.guidedCompleted = false;
    this.sessionHistory = [];
    this.lastRemoteMessage = '';
    this.isRemoteTransmitting = false;

    if (this.submode === 'guided') {
      this.remoteStation = remoteStation || this.pickRandomRemoteStation();
    } else if (this.submode === 'contest') {
      this.remoteStation = this.pickRandomRemoteStation();
    } else {
      this.remoteStation = null;
    }

    this.emit('qsoReset', {
      submode: this.submode,
      phase: this.guidedPhase,
      remoteStation: this.remoteStation
    });
  }

  getGuidedStepInfo() {
    const steps = (typeof QSO_GUIDED_STEPS !== 'undefined') ? QSO_GUIDED_STEPS : [
      { step: 1, key: 'CQ', title: '發送 CQ 呼叫 (Call CQ)', prompt: '請發送通用呼叫 CQ，邀請空中電台建立通聯。', expectedKeywords: ['CQ'], hintTemplate: 'CQ CQ CQ DE {MY_CALL} {MY_CALL} K' },
      { step: 2, key: 'RST', title: '交換訊號報告 (Signal Report)', prompt: '抄收對方呼叫，並回覆 RST 訊號報告 (如 599)。', expectedKeywords: ['RST', '599', '5NN'], hintTemplate: '{DX_CALL} DE {MY_CALL} UR RST 599 BK' },
      { step: 3, key: 'QTH_NAME', title: '交換地點與姓名 (QTH & Name)', prompt: '通報你的所在地 QTH 與台長姓名 OP。', expectedKeywords: ['QTH', 'OP', 'NAME'], hintTemplate: 'QTH {MY_QTH} OP {MY_NAME} BK' },
      { step: 4, key: 'SIGNOFF', title: '致謝並發送 73 告別 (Sign-off & 73)', prompt: '感謝本次美好通聯，祝願 73 並發送結束符號 SK。', expectedKeywords: ['73', 'SK', 'TU'], hintTemplate: 'TNX FER QSO 73 GL TU EE SK' },
      { step: 5, key: 'COMPLETE', title: '通聯成功！(QSO Confirmed)', prompt: '恭喜！已成功建立雙向通聯，可簽發專屬 QSL 確認卡！', expectedKeywords: [], hintTemplate: 'QSL READY' }
    ];

    const current = steps.find(s => s.step === this.guidedPhase) || steps[0];
    const dxCall = this.remoteStation ? this.remoteStation.call : 'DX';
    const hint = current.hintTemplate
      .replace(/{MY_CALL}/g, this.myStation.call)
      .replace(/{DX_CALL}/g, dxCall)
      .replace(/{MY_QTH}/g, this.myStation.qth)
      .replace(/{MY_NAME}/g, this.myStation.name);

    return {
      step: current.step,
      key: current.key,
      title: current.title,
      prompt: current.prompt,
      hint,
      expectedKeywords: current.expectedKeywords
    };
  }

  // ==========================================
  // INPUT VALIDATION & DISPATCH
  // ==========================================
  normalizeMessage(text) {
    if (!text) return '';
    return String(text)
      .toUpperCase()
      .replace(/[^A-Z0-9\/\?\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  handleUserTransmit(rawText) {
    const text = this.normalizeMessage(rawText);
    if (!text) return { valid: false, message: '請輸入有效的摩斯電報字元' };

    // Record local transmission
    const txEntry = {
      sender: 'TX',
      text,
      timestamp: Date.now()
    };
    this.sessionHistory.push(txEntry);
    this.emit('localTransmit', txEntry);

    // Handle Repeat request (AGN? / ?)
    if (text === '?' || text === 'AGN' || text === 'AGN?' || text.endsWith('AGN?')) {
      if (this.lastRemoteMessage) {
        this.emit('botResponseReady', {
          sender: 'RX',
          text: this.lastRemoteMessage,
          delay: 800,
          isRepeat: true
        });
        return { valid: true, repeat: true };
      }
    }

    if (this.submode === 'guided') {
      return this._handleGuidedTransmit(text);
    } else if (this.submode === 'contest') {
      return this._handleContestTransmit(text);
    } else {
      return this._handleFreeTransmit(text);
    }
  }

  _handleGuidedTransmit(text) {
    const stepInfo = this.getGuidedStepInfo();
    const tokens = text.split(' ');

    let valid = false;
    let feedback = '';

    switch (this.guidedPhase) {
      case 1: // CQ Calling
        valid = tokens.includes('CQ') || text.includes('CQ');
        if (!valid) {
          feedback = '未偵測到 CQ 關鍵字。建議格式：CQ CQ CQ DE ' + this.myStation.call + ' K';
        }
        break;

      case 2: // RST Exchange
        valid = tokens.includes('599') || tokens.includes('5NN') || tokens.includes('RST') || text.includes('599') || text.includes('5NN');
        if (!valid) {
          feedback = '未偵測到 RST 報告 (如 599)。建議格式：' + (this.remoteStation ? this.remoteStation.call : 'DX') + ' DE ' + this.myStation.call + ' UR RST 599 BK';
        }
        break;

      case 3: // QTH & Name Exchange
        valid = tokens.includes('QTH') || tokens.includes('NAME') || tokens.includes('OP') || text.includes('QTH') || text.includes('OP');
        if (!valid) {
          feedback = '未偵測到 QTH 或 OP/NAME 標記。建議格式：QTH ' + this.myStation.qth + ' OP ' + this.myStation.name + ' BK';
        }
        break;

      case 4: // Sign-off & 73
        valid = tokens.includes('73') || tokens.includes('SK') || tokens.includes('TU') || text.includes('73') || text.includes('SK');
        if (!valid) {
          feedback = '未偵測到 73、SK 或 TU 告別信號。建議格式：TNX FER QSO 73 GL TU EE SK';
        }
        break;

      case 5: // Already complete
        valid = true;
        break;
    }

    if (valid) {
      const currentPhase = this.guidedPhase;
      const botResponse = this.generateBotResponse(currentPhase, text);

      // Advance guided phase
      if (this.guidedPhase < 5) {
        this.guidedPhase++;
      }

      if (botResponse) {
        this.lastRemoteMessage = botResponse;
        this.emit('botResponseReady', {
          sender: 'RX',
          text: botResponse,
          delay: 1000,
          nextPhase: this.guidedPhase
        });
      }

      // Check for completion
      if (currentPhase === 4) {
        this.guidedCompleted = true;
        const logEntry = this.buildLogEntry();
        this.emit('qsoComplete', logEntry);
      }

      this.emit('phaseChanged', {
        phase: this.guidedPhase,
        completed: this.guidedCompleted
      });

      return { valid: true, feedback: '信號收悉，對方正在回覆...' };
    } else {
      this.emit('validationWarning', {
        expected: stepInfo.hint,
        received: text,
        feedback
      });
      return { valid: false, feedback };
    }
  }

  _handleContestTransmit(text) {
    // In contest mode, check for 5NN/599 and serial number
    const valid = text.includes('5NN') || text.includes('599');
    if (valid) {
      const mySerial = String(this.contestSerial).padStart(3, '0');
      const dxSerial = String(Math.floor(Math.random() * 80) + 1).padStart(3, '0');
      const botResponse = `TU 5NN ${dxSerial}`;
      this.contestSerial++;

      this.lastRemoteMessage = botResponse;
      this.emit('botResponseReady', {
        sender: 'RX',
        text: botResponse,
        delay: 600
      });

      const logEntry = this.buildLogEntry({
        notes: `Contest QSO #${mySerial} (DX #${dxSerial})`
      });
      this.emit('qsoComplete', logEntry);

      return { valid: true, feedback: '競賽通聯完成！' };
    } else {
      return { valid: false, feedback: '競賽格式需包含 5NN 或 599。' };
    }
  }

  _handleFreeTransmit(text) {
    // In free airwaves mode, respond based on CQ or callsign
    if (!this.remoteStation) {
      this.remoteStation = this.pickRandomRemoteStation();
    }
    const dxCall = this.remoteStation.call;
    let botResponse = '';

    if (text.includes('CQ')) {
      botResponse = `${this.myStation.call} DE ${dxCall} ${dxCall} K`;
    } else if (text.includes('RST') || text.includes('599') || text.includes('5NN')) {
      botResponse = `${this.myStation.call} DE ${dxCall} UR RST 599 BK`;
    } else if (text.includes('73') || text.includes('SK')) {
      botResponse = `${this.myStation.call} DE ${dxCall} 73 TU EE SK`;
      const logEntry = this.buildLogEntry({ notes: 'Free Airwaves QSO' });
      this.emit('qsoComplete', logEntry);
    } else {
      botResponse = `${this.myStation.call} DE ${dxCall} R FB OM K`;
    }

    this.lastRemoteMessage = botResponse;
    this.emit('botResponseReady', {
      sender: 'RX',
      text: botResponse,
      delay: 1000
    });

    return { valid: true, feedback: '正在發送...' };
  }

  // ==========================================
  // BOT RESPONSE GENERATOR
  // ==========================================
  generateBotResponse(phase, userText) {
    if (!this.remoteStation) {
      this.remoteStation = this.pickRandomRemoteStation();
    }
    const myCall = this.myStation.call;
    const dxCall = this.remoteStation.call;
    const dxQth = this.remoteStation.qth;
    const dxName = this.remoteStation.name;

    switch (phase) {
      case 1:
        // Response to User's CQ
        return `${myCall} DE ${dxCall} ${dxCall} K`;

      case 2:
        // Response to User's RST report
        return `${myCall} DE ${dxCall} TNX FER RPRT UR RST 599 5NN BK`;

      case 3:
        // Response to User's QTH & Name
        return `${myCall} DE ${dxCall} QTH ${dxQth} ${dxQth} OP ${dxName} ${dxName} BK`;

      case 4:
        // Final 73 handshake and sign-off
        return `${myCall} DE ${dxCall} TNX FER FB QSO 73 GL TU EE SK`;

      default:
        return `${myCall} DE ${dxCall} R TU EE`;
    }
  }

  // ==========================================
  // MACRO & LOG BUILDER
  // ==========================================
  generateMacroText(key) {
    const dxCall = this.remoteStation ? this.remoteStation.call : 'DX';
    switch (key) {
      case 'CQ':
        return `CQ CQ CQ DE ${this.myStation.call} ${this.myStation.call} K`;
      case 'RST':
        return `${dxCall} DE ${this.myStation.call} UR RST 599 BK`;
      case 'QTH':
        return `QTH ${this.myStation.qth} OP ${this.myStation.name} BK`;
      case '73':
        return `TNX FER QSO 73 GL TU EE SK`;
      case 'TU':
        return `TU EE`;
      case 'AGN':
        return `AGN?`;
      default:
        return '';
    }
  }

  buildLogEntry(customFields = {}) {
    const now = new Date();
    const dateUtc = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeUtc = now.toISOString().slice(11, 19).replace(/:/g, '');
    const dx = this.remoteStation || {
      call: 'DX1CALL',
      name: 'OPERATOR',
      qth: 'UNKNOWN',
      grid: 'PL00'
    };

    return Object.assign({
      id: `qso_${now.getTime()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.getTime(),
      dateUtc,
      timeUtc,
      dateDisplay: now.toISOString().slice(0, 10),
      timeDisplay: now.toISOString().slice(11, 16) + ' UTC',
      myCall: this.myStation.call,
      dxCall: dx.call,
      band: this.activeBand,
      freq: this.currentFreq,
      mode: 'CW',
      rstSent: this.myStation.rstSent || '599',
      rstRcvd: dx.rstRcvd || '599',
      name: dx.name || 'OM',
      qth: dx.qth || 'GLOBAL',
      grid: dx.grid || '',
      country: dx.country || 'DX',
      operator: this.myStation.call,
      notes: `Guided CW QSO completed on ${this.activeBand}`,
      confirmed: true
    }, customFields);
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  window.QsoManager = QsoManager;
}

// Export for Node.js test environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QsoManager };
}
