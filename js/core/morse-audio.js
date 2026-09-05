/**
 * AUDIO SYNTHESIZER MODULE: MorseAudio
 * 純 Web Audio API 650Hz 正弦波 + 5ms 平滑封套 + 類比短波微底噪 (QRN Atmospheric Static)
 */
class MorseAudio {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.frequency = 650;

    // QRN Atmospheric Noise components
    this.noiseNode = null;
    this.noiseFilter = null;
    this.noiseGain = null;
    this.noiseEnabled = false;
    this.noiseVolume = 0.04;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0;
        this.gain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.noiseEnabled && !this.noiseNode) {
      this.startNoise();
    }
  }

  setFrequency(f) {
    this.frequency = f;
    if (this.osc && this.ctx) {
      this.osc.frequency.setValueAtTime(f, this.ctx.currentTime);
    }
    if (this.noiseFilter && this.ctx) {
      this.noiseFilter.frequency.setValueAtTime(f, this.ctx.currentTime);
    }
  }

  ensureOscillator() {
    if (!this.ctx || !this.gain) return;
    if (!this.osc) {
      this.osc = this.ctx.createOscillator();
      this.osc.type = 'sine';
      this.osc.frequency.setValueAtTime(this.frequency, this.ctx.currentTime);
      this.osc.connect(this.gain);
      try {
        this.osc.start();
      } catch (e) {
        // Safe catch if already running
      }
    }
  }

  start() {
    this.init();
    if (!this.ctx || !this.gain) return;
    this.ensureOscillator();
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0.22, now + 0.005); // 5ms attack
  }

  stop() {
    if (!this.ctx || !this.gain) return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0.0001, now + 0.005); // 5ms release
    this.gain.gain.setValueAtTime(0, now + 0.006); // Zero silence floor without destroying node
  }

  destroy() {
    if (this.osc) {
      try {
        this.osc.stop();
      } catch (e) {}
      this.osc.disconnect();
      this.osc = null;
    }
    this.stopNoise();
  }

  setNoiseEnabled(enabled) {
    this.noiseEnabled = enabled;
    if (enabled) {
      this.init();
      this.startNoise();
    } else {
      this.stopNoise();
    }
  }

  setNoiseVolume(vol) {
    this.noiseVolume = vol;
    if (this.noiseGain && this.ctx) {
      this.noiseGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  startNoise() {
    if (!this.ctx) return;
    if (this.noiseNode) return;

    // 3 seconds pink/atmospheric noise buffer loop
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      let pink = b0 + b1 + b2 + white * 0.5362;
      pink *= 0.11;
      if (Math.random() < 0.0008) {
        pink += (Math.random() * 0.5 - 0.25);
      }
      data[i] = pink;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.setValueAtTime(this.frequency, this.ctx.currentTime);
    this.noiseFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(this.noiseVolume, this.ctx.currentTime);

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.ctx.destination);

    this.noiseNode.start();
  }

  stopNoise() {
    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      } catch(_) {}
      this.noiseNode = null;
    }
    if (this.noiseFilter) {
      try { this.noiseFilter.disconnect(); } catch(_) {}
      this.noiseFilter = null;
    }
    if (this.noiseGain) {
      try { this.noiseGain.disconnect(); } catch(_) {}
      this.noiseGain = null;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MorseAudio };
}
