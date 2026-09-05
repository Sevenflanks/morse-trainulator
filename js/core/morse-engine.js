/**
 * PURE LOGIC MODULE: MorseEngine
 * 獨立可移植狀態機，不依賴 DOM。
 */
class MorseEngine {
  constructor(config = {}) {
    this.config = Object.assign({
      unitT: 80,          // ms for 1 Dit (預設 15 WPM 熟練)
      threshold: 160,     // ms split between Dit and Dah (2T)
      letterGap: 240,     // ms pause to finalize letter (3T)
      wordGap: 560,       // ms pause to finalize word (7T)
      farnsworthEnabled: false,
      charWpm: 18,        // Character WPM when Farnsworth is active (18 WPM -> ~67ms)
    }, config);

    // Morse Tree Graph definitions based strictly on PCB image:
    // root = antenna
    // Left branch = Dah (-), Right branch = Dit (.)
    this.tree = {
      '': { letter: '', type: 'root', shape: 'root' },
      // Level 1
      '-': { letter: 'T', parent: '', type: 'dah', shape: 'square' },
      '.': { letter: 'E', parent: '', type: 'dit', shape: 'circle' },
      // Level 2 (under T)
      '--': { letter: 'M', parent: '-', type: 'dah', shape: 'square' },
      '-.': { letter: 'N', parent: '-', type: 'dit', shape: 'circle' },
      // Level 2 (under E)
      '.-': { letter: 'A', parent: '.', type: 'dah', shape: 'square' },
      '..': { letter: 'I', parent: '.', type: 'dit', shape: 'circle' },
      // Level 3 (under M)
      '---': { letter: 'O', parent: '--', type: 'dah', shape: 'square' },
      '--.': { letter: 'G', parent: '--', type: 'dit', shape: 'circle' },
      // Level 3 (under N)
      '-.-': { letter: 'K', parent: '-.', type: 'dah', shape: 'square' },
      '-..': { letter: 'D', parent: '-.', type: 'dit', shape: 'circle' },
      // Level 3 (under A)
      '.--': { letter: 'W', parent: '.-', type: 'dah', shape: 'square' },
      '.-.': { letter: 'R', parent: '.-', type: 'dit', shape: 'circle' },
      // Level 3 (under I)
      '..-': { letter: 'U', parent: '..', type: 'dah', shape: 'square' },
      '...': { letter: 'S', parent: '..', type: 'dit', shape: 'circle' },
      // Level 4 (under G)
      '--.-': { letter: 'Q', parent: '--.', type: 'dah', shape: 'square' },
      '--..': { letter: 'Z', parent: '--.', type: 'dit', shape: 'circle' },
      // Level 4 (under K)
      '-.--': { letter: 'Y', parent: '-.-', type: 'dah', shape: 'square' },
      '-.-.': { letter: 'C', parent: '-.-', type: 'dit', shape: 'circle' },
      // Level 4 (under D)
      '-..-': { letter: 'X', parent: '-..', type: 'dah', shape: 'square' },
      '-...': { letter: 'B', parent: '-..', type: 'dit', shape: 'circle' },
      // Level 4 (under W)
      '.---': { letter: 'J', parent: '.--', type: 'dah', shape: 'square' },
      '.--.': { letter: 'P', parent: '.--', type: 'dit', shape: 'circle' },
      // Level 4 (under R)
      '.-..': { letter: 'L', parent: '.-.', type: 'dit', shape: 'circle' },
      // Level 4 (under U)
      '..-.': { letter: 'F', parent: '..-', type: 'dit', shape: 'circle' },
      // Level 4 (under S)
      '...-': { letter: 'V', parent: '...', type: 'dah', shape: 'square' },
      '....': { letter: 'H', parent: '...', type: 'dit', shape: 'circle' },

      // Level 4 Intermediate nodes (connecting to digits)
      '..--': { letter: null, parent: '..-', type: 'dah', shape: 'square' },
      '---.': { letter: null, parent: '---', type: 'dit', shape: 'circle' },
      '----': { letter: null, parent: '---', type: 'dah', shape: 'square' },

      // Level 5 (Digits 0–9: Standard 5-element codes)
      '.----': { letter: '1', parent: '.---', type: 'dah', shape: 'square' },
      '..---': { letter: '2', parent: '..--', type: 'dah', shape: 'square' },
      '...--': { letter: '3', parent: '...-', type: 'dah', shape: 'square' },
      '....-': { letter: '4', parent: '....', type: 'dah', shape: 'square' },
      '.....': { letter: '5', parent: '....', type: 'dit', shape: 'circle' },
      '-....': { letter: '6', parent: '-...', type: 'dit', shape: 'circle' },
      '--...': { letter: '7', parent: '--..', type: 'dit', shape: 'circle' },
      '---..': { letter: '8', parent: '---.', type: 'dit', shape: 'circle' },
      '----.': { letter: '9', parent: '----', type: 'dit', shape: 'circle' },
      '-----': { letter: '0', parent: '----', type: 'dah', shape: 'square' },

      // Level 6–8 (Error signal / Correction prosign: 8 Dits)
      '......': { letter: null, parent: '.....', type: 'dit', shape: 'circle' },
      '.......': { letter: null, parent: '......', type: 'dit', shape: 'circle' },
      '........': { letter: '<HH>', name: 'Error / Correction', parent: '.......', type: 'dit', shape: 'circle' },
    };

    // Build inverse letter -> sequence lookup
    this.letterMap = {};
    for (const [seq, node] of Object.entries(this.tree)) {
      if (node.letter) {
        this.letterMap[node.letter] = seq;
      }
    }

    this.currentSequence = '';
    this.lastPressDuration = 0;
    this.pressStartTime = 0;
    this.isKeyDown = false;
    this.committedLetters = [];
  }

  updateConfig(newConfig) {
    this.config = Object.assign(this.config, newConfig);
  }

  getEffectiveUnitT() {
    if (this.config.farnsworthEnabled) {
      return Math.round(1200 / (this.config.charWpm || 18));
    }
    return this.config.unitT;
  }

  getEffectiveThreshold() {
    if (this.config.farnsworthEnabled) {
      return Math.round((1200 / (this.config.charWpm || 18)) * 2);
    }
    return this.config.threshold;
  }

  classifyDuration(durationMs) {
    return durationMs < this.getEffectiveThreshold() ? '.' : '-';
  }

  pressStart(timestamp = performance.now()) {
    if (this.isKeyDown) return false;
    this.isKeyDown = true;
    this.pressStartTime = timestamp;
    return true;
  }

  pressEnd(timestamp = performance.now()) {
    if (!this.isKeyDown) return null;
    this.isKeyDown = false;
    const duration = Math.max(10, Math.round(timestamp - this.pressStartTime));
    this.lastPressDuration = duration;
    const symbol = this.classifyDuration(duration);
    const nextSequence = this.currentSequence + symbol;

    const node = this.tree[nextSequence];
    const isValid = !!node;
    this.currentSequence = nextSequence;

    return {
      duration,
      symbol,
      sequence: this.currentSequence,
      letter: node ? node.letter : null,
      isValid,
      path: this.getPathForSequence(this.currentSequence)
    };
  }

  appendSymbol(symbol, duration) {
    this.lastPressDuration = duration;
    const nextSequence = this.currentSequence + symbol;
    const node = this.tree[nextSequence];
    const isValid = !!node;
    this.currentSequence = nextSequence;

    return {
      duration,
      symbol,
      sequence: this.currentSequence,
      letter: node ? node.letter : null,
      isValid,
      path: this.getPathForSequence(this.currentSequence)
    };
  }

  eraseLastWord() {
    if (!this.committedLetters || this.committedLetters.length === 0) return [];
    // 1. Pop trailing spaces
    while (this.committedLetters.length > 0 && this.committedLetters[this.committedLetters.length - 1] === ' ') {
      this.committedLetters.pop();
    }
    // 2. Pop all characters of the last word until space or empty
    const erased = [];
    while (this.committedLetters.length > 0 && this.committedLetters[this.committedLetters.length - 1] !== ' ') {
      erased.push(this.committedLetters.pop());
    }
    return erased.reverse();
  }

  commitCurrentSequence() {
    if (!this.currentSequence) return null;
    if (this.isKeyDown) return null; // Never commit while a key is actively held down
    const node = this.tree[this.currentSequence];
    const isErrorSignal = (this.currentSequence === '........');
    const result = {
      sequence: this.currentSequence,
      letter: isErrorSignal ? '<HH>' : (node ? node.letter : '?'),
      isValid: isErrorSignal || !!node,
      isErrorSignal
    };
    if (result.isValid && result.letter) {
      if (isErrorSignal) {
        result.erased = this.eraseLastWord();
      } else {
        this.committedLetters.push(result.letter);
      }
    }
    this.currentSequence = '';
    return result;
  }

  reset() {
    this.currentSequence = '';
    this.isKeyDown = false;
    this.lastPressDuration = 0;
  }

  getPathForSequence(seq) {
    const path = [];
    let acc = '';
    for (const char of seq) {
      acc += char;
      path.push(acc);
    }
    return path;
  }

  getSequenceForLetter(letter) {
    return this.letterMap[letter.toUpperCase()] || null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MorseEngine };
}
