/**
 * DOMAIN MODULE: CWPlayer
 * 純邏輯 CW 音訊排程器與播放引擎 (Zero DOM Dependencies)
 * 支援 WPM、$T$、Farnsworth Timing 與音頻生命週期事件勾點
 */
class CWPlayer {
  constructor(options = {}) {
    this.synth = options.synth || null;
    this.unitT = options.unitT || 80;
    this.charWpm = options.charWpm || 20;
    this.farnsworthEnabled = !!options.farnsworthEnabled;
    this.getSequence = options.getSequence || (typeof window !== 'undefined' && window.engine ? (c) => window.engine.getSequenceForLetter(c) : null);

    this._listeners = {};
    this._abort = false;
    this._isPlaying = false;
    this._currentTimeout = null;
  }

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
        try { cb(...args); } catch (e) { console.error(e); }
      });
    }
  }

  get isPlaying() {
    return this._isPlaying;
  }

  getUnitT() {
    return this.unitT;
  }

  setUnitT(unitT) {
    this.unitT = unitT;
  }

  setFarnsworth(enabled, charWpm) {
    this.farnsworthEnabled = !!enabled;
    if (charWpm) this.charWpm = charWpm;
  }

  calculateTimings(char) {
    const charUnitT = (this.farnsworthEnabled && this.charWpm)
      ? Math.round(1200 / this.charWpm)
      : this.unitT;
    const interElementGap = charUnitT;
    const interCharGap = this.unitT * 3;
    const wordGap = this.unitT * 7;
    return {
      charUnitT,
      interElementGap,
      interCharGap,
      wordGap
    };
  }

  async sleep(ms) {
    if (ms <= 0) return;
    return new Promise((resolve) => {
      const tid = setTimeout(resolve, ms);
      this._currentTimeout = tid;
    });
  }

  stop() {
    this._abort = true;
    if (this._currentTimeout) {
      clearTimeout(this._currentTimeout);
      this._currentTimeout = null;
    }
    if (this.synth && typeof this.synth.stop === 'function') {
      try { this.synth.stop(); } catch (e) {}
    }
    if (this._isPlaying) {
      this._isPlaying = false;
      this.emit('playbackAbort');
    }
  }

  async playSequence(seq, timings) {
    if (!seq || this._abort) return;
    const t = timings || this.calculateTimings();
    for (let i = 0; i < seq.length; i++) {
      if (this._abort) break;
      const sym = seq[i];
      const dur = (sym === '.') ? t.charUnitT : (t.charUnitT * 3);

      this.emit('pulseStart', sym, dur);
      if (this.synth) this.synth.start();
      await this.sleep(dur);

      if (this.synth) this.synth.stop();
      this.emit('pulseEnd', sym);

      // Intra-character element gap (1T)
      if (i < seq.length - 1 && !this._abort) {
        await this.sleep(t.interElementGap);
      }
    }
  }

  async playText(text, options = {}) {
    if (!text) return;
    this.stop();
    this._abort = false;
    this._isPlaying = true;

    const getSeq = options.getSequence || this.getSequence || ((c) => '');
    const timings = options.timings || this.calculateTimings();

    const chars = text.toUpperCase().split('');
    for (let i = 0; i < chars.length; i++) {
      if (this._abort) break;
      const char = chars[i];

      if (char === ' ') {
        this.emit('wordGapStart', timings.wordGap);
        await this.sleep(timings.wordGap);
        this.emit('wordGapEnd');
        continue;
      }

      const seq = getSeq(char);
      this.emit('charStart', char, seq);
      if (seq) {
        await this.playSequence(seq, timings);
      }
      this.emit('charComplete', char, seq);

      // Inter-character gap (3T)
      const nextChar = chars[i + 1];
      if (nextChar && nextChar !== ' ' && !this._abort) {
        await this.sleep(timings.interCharGap);
      }
    }

    if (!this._abort) {
      this._isPlaying = false;
      this.emit('playbackComplete');
    }
  }
}

if (typeof window !== 'undefined') {
  window.CWPlayer = CWPlayer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CWPlayer };
}
