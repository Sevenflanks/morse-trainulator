/**
 * CW OSCILLOSCOPE RIBBON: CWRibbon
 * 60FPS 平滑連續捲動示波紙帶，視覺化點劃方波與時序比例
 */
class CWRibbon {
  constructor(canvasId, engineRef = null) {
    this.canvas = (typeof document !== 'undefined') ? document.getElementById(canvasId) : null;
    this.ctx = this.canvas && this.canvas.getContext ? this.canvas.getContext('2d') : null;
    this.engine = engineRef;
    this.pulses = []; // Array of completed pulses: { start, end, dur, sym, isDit }
    this.activePulse = null; // Currently sounding pulse: { start, sym, isDit }
    this.speed = 0.12; // pixels per ms (120px / second)
    this.baselineY = 44;
    this.highY = 14;

    this.running = false;
    if (this.canvas) {
      this.start();
    }
  }

  getThreshold() {
    if (this.engine && typeof this.engine.getEffectiveThreshold === 'function') {
      return this.engine.getEffectiveThreshold();
    }
    if (typeof window !== 'undefined' && window.engine && typeof window.engine.getEffectiveThreshold === 'function') {
      return window.engine.getEffectiveThreshold();
    }
    return 160;
  }

  startPulse(now = performance.now(), sym = '?') {
    if (this.activePulse) return;
    this.activePulse = {
      start: now,
      sym: sym,
      isDit: sym === '.'
    };
  }

  endPulse(now = performance.now(), finalSym = null) {
    if (!this.activePulse) return;
    const dur = Math.max(10, Math.round(now - this.activePulse.start));
    const isDit = finalSym ? (finalSym === '.') : (dur < this.getThreshold());
    const sym = finalSym || (isDit ? '.' : '-');

    this.pulses.push({
      start: this.activePulse.start,
      end: now,
      dur: dur,
      sym: sym,
      isDit: isDit
    });

    this.activePulse = null;

    // Prune old pulses beyond left edge
    if (this.canvas) {
      const oldestAllowed = now - (this.canvas.width / this.speed) - 2000;
      this.pulses = this.pulses.filter(p => p.end > oldestAllowed);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const render = () => {
      if (!this.running) return;
      this.draw();
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(render);
      }
    };
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(render);
    }
  }

  stop() {
    this.running = false;
  }

  getThemeColors() {
    if (typeof document !== 'undefined' && document.documentElement) {
      const theme = document.documentElement.getAttribute('data-theme') || 'cyber-brass';
      if (theme === 'classic-amber') {
        return {
          dit: '#ff9800',
          dah: '#ffb000',
          ditBg: 'rgba(255, 152, 0, 0.25)',
          dahBg: 'rgba(255, 176, 0, 0.25)',
          ditActiveBg: 'rgba(255, 152, 0, 0.35)',
          dahActiveBg: 'rgba(255, 176, 0, 0.35)',
          ditTrail: 'rgba(255, 152, 0, 0.32)',
          dahTrail: 'rgba(255, 176, 0, 0.32)'
        };
      } else if (theme === 'green-phosphor') {
        return {
          dit: '#00ff66',
          dah: '#00e676',
          ditBg: 'rgba(0, 255, 102, 0.25)',
          dahBg: 'rgba(0, 230, 118, 0.25)',
          ditActiveBg: 'rgba(0, 255, 102, 0.35)',
          dahActiveBg: 'rgba(0, 230, 118, 0.35)',
          ditTrail: 'rgba(0, 255, 102, 0.32)',
          dahTrail: 'rgba(0, 230, 118, 0.32)'
        };
      }
    }
    return {
      dit: '#00e5ff',
      dah: '#ffd700',
      ditBg: 'rgba(0, 229, 255, 0.25)',
      dahBg: 'rgba(255, 215, 0, 0.25)',
      ditActiveBg: 'rgba(0, 229, 255, 0.35)',
      dahActiveBg: 'rgba(255, 215, 0, 0.35)',
      ditTrail: 'rgba(0, 229, 255, 0.32)',
      dahTrail: 'rgba(255, 215, 0, 0.32)'
    };
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const c = this.canvas;
    const ctx = this.ctx;
    const W = c.width;
    const H = c.height;
    const now = performance.now();
    const themeColors = this.getThemeColors();

    this.baselineY = Math.round(H * 0.74);
    this.highY = Math.round(H * 0.28);

    // 1. Background
    ctx.fillStyle = '#08090d';
    ctx.fillRect(0, 0, W, H);

    // 2. Grid lines
    ctx.strokeStyle = '#181b24';
    ctx.lineWidth = 1;

    // Horizontal guides
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(0, this.highY);
    ctx.lineTo(W, this.highY);
    ctx.moveTo(0, this.baselineY);
    ctx.lineTo(W, this.baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertical scrolling ticks (every 250ms)
    const tickSpacingMs = 250;
    const tickOffset = (now % tickSpacingMs) * this.speed;
    ctx.strokeStyle = '#141720';
    for (let x = W - tickOffset; x >= 0; x -= tickSpacingMs * this.speed) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // 3. Draw Completed Pulses
    this.pulses.forEach(p => {
      const x1 = W - (now - p.start) * this.speed;
      const x2 = W - (now - p.end) * this.speed;
      if (x2 < 0 || x1 > W) return;

      const w = Math.max(2, x2 - x1);
      const color = p.isDit ? themeColors.dit : themeColors.dah;
      const fillBg = p.isDit ? themeColors.ditBg : themeColors.dahBg;

      ctx.fillStyle = fillBg;
      ctx.fillRect(x1, this.highY, w, this.baselineY - this.highY);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x1, this.highY);
      ctx.lineTo(x2, this.highY);
      ctx.stroke();

      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x1, this.baselineY);
      ctx.lineTo(x1, this.highY);
      ctx.moveTo(x2, this.highY);
      ctx.lineTo(x2, this.baselineY);
      ctx.stroke();

      // CRT Phosphor Decay Trail on Falling Edge (x2)
      if (x2 >= 0 && x2 <= W) {
        const trailWidth = 14;
        const phosphorGrad = ctx.createLinearGradient(x2, 0, x2 + trailWidth, 0);
        const defaultTrailColor = p.isDit ? 'rgba(0, 229, 255, 0.32)' : 'rgba(255, 215, 0, 0.32)';
        const trailColor = (themeColors && themeColors.ditTrail) ? (p.isDit ? themeColors.ditTrail : themeColors.dahTrail) : defaultTrailColor;
        phosphorGrad.addColorStop(0, trailColor);
        phosphorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = phosphorGrad;
        ctx.fillRect(x2, this.highY, trailWidth, this.baselineY - this.highY);
      }

      if (w > 18) {
        ctx.fillStyle = color;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.sym} ${p.dur}m`, x1 + w / 2, this.highY - 3);
      }
    });

    // 4. Draw Active Sounding Pulse
    if (this.activePulse) {
      const x1 = W - (now - this.activePulse.start) * this.speed;
      const x2 = W;
      const dur = Math.round(now - this.activePulse.start);
      const isDit = dur < this.getThreshold();
      const color = isDit ? themeColors.dit : themeColors.dah;
      const fillBg = isDit ? themeColors.ditActiveBg : themeColors.dahActiveBg;

      const w = Math.max(2, x2 - x1);
      ctx.fillStyle = fillBg;
      ctx.fillRect(x1, this.highY, w, this.baselineY - this.highY);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x1, this.highY);
      ctx.lineTo(x2, this.highY);
      ctx.stroke();

      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x1, this.baselineY);
      ctx.lineTo(x1, this.highY);
      ctx.moveTo(x2, this.highY);
      ctx.lineTo(x2, this.baselineY);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${dur}ms`, x1 + w / 2, this.highY - 3);
    }

    // 5. Draw Baseline
    ctx.strokeStyle = '#2e3444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, this.baselineY);
    ctx.lineTo(W, this.baselineY);
    ctx.stroke();

    // 6. Real-time Lead Edge Needle & Label
    ctx.strokeStyle = this.activePulse ? '#ff5252' : '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W - 1, 0);
    ctx.lineTo(W - 1, H);
    ctx.stroke();

    ctx.fillStyle = this.activePulse ? '#ff5252' : '#666';
    ctx.font = 'bold 7.5px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(this.activePulse ? 'TX' : 'IDLE', W - 4, H - 4);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CWRibbon };
}
