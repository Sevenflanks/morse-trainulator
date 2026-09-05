/**
 * IAMBIC KEYER MODULE: IambicKeyer (Curtis 8044 / Winkeyer Standard)
 * 支援雙撥片、長短音自動連發、全時點劃記憶 (Element Memory)、
 * 夾片交替 (Squeeze Iambic Mode B / Mode A)、半自動機械震報鍵 (Bug Key)、左右反轉 (Paddle Reverse)。
 */
class IambicKeyer {
  constructor(engine, synth) {
    this.engine = engine;
    this.synth = synth;

    this.mode = 'B'; // 'A' or 'B'
    this.reversed = false;

    // Physical contacts
    this.leftPressed = false;
    this.rightPressed = false;

    // Logical Dit / Dah contacts
    this.ditPressed = false;
    this.dahPressed = false;

    // Element Memory
    this.ditMemory = false;
    this.dahMemory = false;

    // Squeeze tracking for Mode B
    this.squeezedDuringElement = false;

    // State Machine
    this.state = 'IDLE'; // 'IDLE' | 'SENDING' | 'GAP'
    this.currentSymbol = null; // '.' or '-'
    this.elementTimer = null;
    this.isBugMode = false;

    // Callbacks
    this.onSymbolStart = null;
    this.onSymbolEnd = null;
    this.onIdle = null;
    this.onMemoryChange = null;
    this.onManualDah = null;
  }

  setMode(mode) {
    this.mode = mode;
  }

  setReversed(rev) {
    this.reversed = rev;
    this.updateLogicalContacts();
  }

  updateLogicalContacts() {
    this.ditPressed = this.reversed ? this.rightPressed : this.leftPressed;
    this.dahPressed = this.reversed ? this.leftPressed : this.rightPressed;
  }

  setPhysicalContact(side, isDown) {
    if (side === 'left') this.leftPressed = isDown;
    if (side === 'right') this.rightPressed = isDown;

    this.updateLogicalContacts();

    if (this.isBugMode) {
      const isDahSide = this.reversed ? (side === 'left') : (side === 'right');
      if (isDahSide) {
        if (this.onManualDah) {
          this.onManualDah(isDown);
        }
        return;
      }
      // Left side is automatic Dit
      if (isDown) {
        if (this.state === 'IDLE') {
          this.startSymbol('.');
        }
      }
      if (this.onMemoryChange) {
        this.onMemoryChange(false, false, false);
      }
      return;
    }

    const isSqueezing = this.ditPressed && this.dahPressed;
    if (isSqueezing) {
      this.squeezedDuringElement = true;
    }

    // Element Memory Latching:
    // While currently transmitting or in gap, a tap on the opposite paddle latches memory!
    if (isDown) {
      if (this.state === 'SENDING' || this.state === 'GAP') {
        if (this.currentSymbol === '-' && this.ditPressed) {
          this.ditMemory = true;
        } else if (this.currentSymbol === '.' && this.dahPressed) {
          this.dahMemory = true;
        }
      } else if (this.state === 'IDLE') {
        // Trigger immediately from IDLE
        if (this.ditPressed && this.dahPressed) {
          this.startSymbol(this.ditPressed ? '.' : '-');
        } else if (this.ditPressed) {
          this.startSymbol('.');
        } else if (this.dahPressed) {
          this.startSymbol('-');
        }
      }
    }

    if (this.onMemoryChange) {
      this.onMemoryChange(this.ditMemory, this.dahMemory, isSqueezing);
    }
  }

  getUnitT() {
    if (this.engine && typeof this.engine.getEffectiveUnitT === 'function') {
      return this.engine.getEffectiveUnitT();
    }
    return (this.engine && this.engine.config && this.engine.config.unitT) || 80;
  }

  startSymbol(sym) {
    this.state = 'SENDING';
    this.currentSymbol = sym;
    this.squeezedDuringElement = (this.ditPressed && this.dahPressed);

    if (sym === '.') this.ditMemory = false;
    if (sym === '-') this.dahMemory = false;

    if (this.onMemoryChange) {
      this.onMemoryChange(this.ditMemory, this.dahMemory, this.ditPressed && this.dahPressed);
    }

    const unitT = this.getUnitT();
    const duration = (sym === '.') ? unitT : (unitT * 3);

    this.synth.start();

    if (this.onSymbolStart) {
      this.onSymbolStart(sym, duration);
    }

    if (this.elementTimer) clearTimeout(this.elementTimer);
    this.elementTimer = setTimeout(() => {
      this.finishSymbol(sym, duration);
    }, duration);
  }

  finishSymbol(sym, duration) {
    this.synth.stop();

    if (this.onSymbolEnd) {
      this.onSymbolEnd(sym, duration);
    }

    if (this.ditPressed && this.dahPressed) {
      this.squeezedDuringElement = true;
    }

    // Enter 1T Intra-Element Space
    this.state = 'GAP';
    const unitT = this.getUnitT();

    if (this.elementTimer) clearTimeout(this.elementTimer);
    this.elementTimer = setTimeout(() => {
      this.finishGap();
    }, unitT);
  }

  finishGap() {
    if (this.isBugMode) {
      if (this.ditPressed) {
        this.startSymbol('.');
      } else {
        this.state = 'IDLE';
        this.currentSymbol = null;
        if (this.onMemoryChange) this.onMemoryChange(false, false, false);
        if (this.onIdle) this.onIdle();
      }
      return;
    }

    let next = null;

    if (this.currentSymbol === '.') {
      if (this.dahMemory) {
        next = '-';
        this.dahMemory = false;
      } else if (this.ditPressed && this.dahPressed) {
        next = '-'; // Iambic alternate
      } else if (this.dahPressed) {
        next = '-';
      } else if (this.ditPressed) {
        next = '.'; // Auto-repeat Dit
      } else if (this.mode === 'B' && this.squeezedDuringElement) {
        next = '-'; // Curtis Mode B extra element
      }
    } else {
      if (this.ditMemory) {
        next = '.';
        this.ditMemory = false;
      } else if (this.ditPressed && this.dahPressed) {
        next = '.'; // Iambic alternate
      } else if (this.ditPressed) {
        next = '.';
      } else if (this.dahPressed) {
        next = '-'; // Auto-repeat Dah
      } else if (this.mode === 'B' && this.squeezedDuringElement) {
        next = '.'; // Curtis Mode B extra element
      }
    }

    this.squeezedDuringElement = false;

    if (next) {
      this.startSymbol(next);
    } else {
      // Keyer goes IDLE
      this.state = 'IDLE';
      this.currentSymbol = null;
      if (this.onMemoryChange) {
        this.onMemoryChange(false, false, false);
      }
      if (this.onIdle) {
        this.onIdle();
      }
    }
  }

  reset() {
    if (this.elementTimer) clearTimeout(this.elementTimer);
    this.synth.stop();
    this.state = 'IDLE';
    this.currentSymbol = null;
    this.ditMemory = false;
    this.dahMemory = false;
    this.squeezedDuringElement = false;
    this.leftPressed = false;
    this.rightPressed = false;
    this.ditPressed = false;
    this.dahPressed = false;
    if (this.onMemoryChange) {
      this.onMemoryChange(false, false, false);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IambicKeyer };
}
