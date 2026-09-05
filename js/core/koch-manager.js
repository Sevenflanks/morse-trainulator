/**
 * KOCH METHOD PROGRESSION MANAGER: KochManager
 * 國際科赫法 35 關漸進解鎖演算法與闖關題目生成器
 */

// If KOCH_SEQUENCE is already loaded globally via morse-data.js, reuse it; otherwise fallback
const _KOCH_SEQUENCE = (typeof KOCH_SEQUENCE !== 'undefined') ? KOCH_SEQUENCE : [
  'K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O',
  'W', 'I', 'N', 'J', 'E', 'F', '0', 'Y', 'V', 'G',
  '5', 'Q', '9', 'Z', 'H', '3', '8', 'B', '4', '2',
  '7', 'C', '1', 'D', '6', 'X'
];

class KochManager {
  constructor(storage = null) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    let saved = 1;
    try {
      if (this.storage) {
        const val = this.storage.getItem('morse_koch_stage');
        if (val) saved = parseInt(val, 10);
      }
    } catch(_) {}
    this.maxUnlockedLevel = Math.max(1, Math.min(35, isNaN(saved) ? 1 : saved));
    this.currentLevel = this.maxUnlockedLevel;
    this.drillLen = 24;
    this.mode = 'quick'; // 'quick' | 'standard' | 'challenge'
    this.duration = 180; // Assessment duration in seconds (60, 180, 300)
    this.reflexTimeout = 2000; // Reflex timeout in ms for standard & challenge
  }

  getUnlockedPool(lvl = this.currentLevel) {
    return _KOCH_SEQUENCE.slice(0, lvl + 1);
  }

  getTargetChar(lvl = this.currentLevel) {
    return _KOCH_SEQUENCE[lvl];
  }

  saveProgress() {
    try {
      if (this.storage) {
        this.storage.setItem('morse_koch_stage', this.maxUnlockedLevel.toString());
      }
    } catch(_) {}
  }

  resetProgress() {
    this.maxUnlockedLevel = 1;
    this.currentLevel = 1;
    this.saveProgress();
  }

  generateNextChar(history = []) {
    const pool = this.getUnlockedPool(this.currentLevel);
    const target = this.getTargetChar(this.currentLevel);
    const isLevel1 = (this.currentLevel === 1);
    const hLen = history.length;
    const forbidden = (hLen >= 2 && history[hLen - 1] === history[hLen - 2]) ? history[hLen - 1] : null;
    const candidates = [];
    for (const char of pool) {
      if (char === forbidden && pool.length > 1) continue;
      // In Level 1, K and M have equal 1:1 weight; in Level >= 2, target gets 2:1 boost
      const weight = (!isLevel1 && char === target) ? 2 : 1;
      for (let w = 0; w < weight; w++) {
        candidates.push(char);
      }
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  generateDrill(len = this.drillLen) {
    const seq = [];
    for (let i = 0; i < len; i++) {
      seq.push(this.generateNextChar(seq));
    }
    return seq;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KochManager, KOCH_SEQUENCE: _KOCH_SEQUENCE };
}
