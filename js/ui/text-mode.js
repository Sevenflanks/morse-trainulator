/**
 * TEXT PRACTICE MODE CONTROLLER: text-mode.js
 * 文章練習模式、即時文字光標、自動示範播放 (Auto Performance) 與結算記分板
 */

const textState = {
  rawText: 'SOS CQ',
  targetChars: ['S', 'O', 'S', ' ', 'C', 'Q'],
  currentIndex: 0,
  charResults: [],
  showHints: true,
  strictMode: false,
  isFinished: false,
  startTime: null,
  endTime: null,
  autoPlayRunning: false,
  autoPlayPaused: false,
  autoPlayAbort: false
};

function initTextModePassage(text) {
  const engine = window.engine;
  if (typeof stopAutoPlay === 'function') stopAutoPlay();
  if (window.wordTimer) clearTimeout(window.wordTimer);

  let clean = (text || '').toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) clean = 'SOS CQ';

  textState.rawText = clean;
  textState.targetChars = clean.split('');
  textState.currentIndex = 0;
  textState.charResults = new Array(textState.targetChars.length).fill(null);
  textState.isFinished = false;
  textState.startTime = performance.now();

  const passageContainer = document.getElementById('passage-container');
  const textScorecard = document.getElementById('text-scorecard');
  const textModeStatus = document.getElementById('text-mode-status');
  const fbTarget = document.getElementById('fb-target');
  const fbInput = document.getElementById('fb-input');
  const fbResult = document.getElementById('fb-result');

  if (passageContainer) {
    passageContainer.innerHTML = '';
    textState.targetChars.forEach((char, idx) => {
      const chip = document.createElement('div');
      chip.id = 'char-chip-' + idx;
      chip.dataset.index = idx;

      if (char === ' ') {
        chip.className = 'char-chip char-space';
        chip.innerHTML = '<span class="letter-text">&nbsp;</span>';
      } else {
        chip.className = 'char-chip';
        const seq = engine ? (engine.getSequenceForLetter(char) || '') : '';
        chip.innerHTML = `
          <span class="letter-text">${char}</span>
          <span class="hint-text" style="${textState.showHints ? '' : 'display:none;'}">${seq}</span>
        `;
      }

      chip.addEventListener('click', () => {
        if (char !== ' ' && typeof replayLetter === 'function' && engine) {
          replayLetter(char, engine.getSequenceForLetter(char));
        }
      });

      passageContainer.appendChild(chip);
    });
  }

  if (textScorecard) textScorecard.style.display = 'none';
  if (textModeStatus) {
    textModeStatus.textContent = '準備就緒';
    textModeStatus.style.color = '#00e5ff';
  }
  if (fbTarget) fbTarget.textContent = '—';
  if (fbInput) fbInput.textContent = '—';
  if (fbResult) {
    fbResult.textContent = '等待發報 (直鍵或雙撥片)';
    fbResult.style.color = '#00e676';
  }

  updateCharCursor();
}

function updateCharCursor() {
  const engine = window.engine;
  const fbTarget = document.getElementById('fb-target');
  const textProgressBadge = document.getElementById('text-progress-badge');

  document.querySelectorAll('.char-chip').forEach(c => c.classList.remove('state-current'));

  if (textState.currentIndex < textState.targetChars.length) {
    const activeChip = document.getElementById('char-chip-' + textState.currentIndex);
    if (activeChip) {
      activeChip.classList.add('state-current');
      activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    const char = textState.targetChars[textState.currentIndex];
    const hudChar = document.getElementById('hud-char-target');
    const hudSeq = document.getElementById('hud-seq-target');
    if (hudChar && char) {
      hudChar.textContent = (char === ' ') ? '␣' : char;
    }
    if (hudSeq && char) {
      const seq = (char === ' ') ? '7T' : (engine ? (engine.getSequenceForLetter(char) || '') : '');
      hudSeq.textContent = seq;
    }

    if (fbTarget) {
      if (char === ' ') {
        fbTarget.textContent = '單字空格 (Word Gap)';
      } else {
        const seq = engine ? (engine.getSequenceForLetter(char) || '') : '';
        fbTarget.textContent = `${char} (${seq})`;
      }
    }
  }

  // Update progress badge
  const totalLetters = textState.targetChars.filter(c => c !== ' ').length;
  const evaluatedLetters = textState.charResults.filter(r => r && r.char !== ' ').length;
  const correctLetters = textState.charResults.filter(r => r && r.char !== ' ' && r.isCorrect).length;
  const acc = evaluatedLetters > 0 ? Math.round((correctLetters / evaluatedLetters) * 100) : 100;
  if (textProgressBadge) {
    textProgressBadge.textContent = `進度: ${evaluatedLetters}/${totalLetters} · 正確率: ${acc}%`;
  }
}

function setCharResult(index, isCorrect, inputLetter, seq) {
  const chip = document.getElementById('char-chip-' + index);
  if (chip) {
    chip.classList.remove('state-current', 'state-playing');
    chip.classList.add(isCorrect ? 'state-correct' : 'state-wrong');
  }
  textState.charResults[index] = {
    char: textState.targetChars[index],
    isCorrect,
    input: inputLetter,
    seq
  };
}

function finalizeLetterTextMode(res) {
  const engine = window.engine;
  const fbInput = document.getElementById('fb-input');
  const fbResult = document.getElementById('fb-result');
  const evalStatus = document.getElementById('eval-status');

  if (textState.isFinished) return;

  let idx = textState.currentIndex;
  if (idx >= textState.targetChars.length) return;

  let target = textState.targetChars[idx];

  // If pointing at a space, auto-settle space leniently
  if (target === ' ') {
    setCharResult(idx, true, ' ', ' ');
    textState.currentIndex++;
    idx = textState.currentIndex;
    if (idx >= textState.targetChars.length) {
      finishTextModePassage();
      return;
    }
    target = textState.targetChars[idx];
  }

  if (fbInput) fbInput.textContent = `${res.letter || '?'} (${res.sequence})`;
  const isMatch = res.isValid && (res.letter === target);

  if (isMatch) {
    setCharResult(idx, true, res.letter, res.sequence);
    if (fbResult) {
      fbResult.innerHTML = '<i class="mdi mdi-check-bold"></i> 正確！';
      fbResult.style.color = '#00e676';
    }
    if (evalStatus) {
      evalStatus.textContent = `字元 [${res.letter}] 正確！`;
      evalStatus.style.color = '#00e676';
    }
    if (typeof highlightPath === 'function') highlightPath(res.sequence, true, engine);

    textState.currentIndex++;

    if (textState.currentIndex >= textState.targetChars.length) {
      finishTextModePassage();
    } else {
      updateCharCursor();
    }
  } else {
    // Wrong letter
    if (textState.strictMode) {
      if (fbResult) {
        fbResult.innerHTML = `<i class="mdi mdi-close-thick"></i> 錯誤！目標為 ${target}，請重試`;
        fbResult.style.color = '#ff5252';
      }
      if (evalStatus) {
        const tSeq = engine ? (engine.getSequenceForLetter(target) || '') : '';
        evalStatus.textContent = `發報未吻合，目標為 ${target} (${tSeq})，請重試`;
        evalStatus.style.color = '#ff5252';
      }

      const chip = document.getElementById('char-chip-' + idx);
      if (chip) {
        chip.classList.add('state-wrong');
        setTimeout(() => {
          if (textState.currentIndex === idx) {
            chip.classList.remove('state-wrong');
            chip.classList.add('state-current');
          }
        }, 500);
      }

      // Show correct target path on card as hint
      const targetSeq = engine ? engine.getSequenceForLetter(target) : null;
      if (targetSeq && typeof highlightPath === 'function') {
        highlightPath(targetSeq, false, engine);
        setTimeout(() => { highlightPath('', false, engine); }, 900);
      }
    } else {
      // Flow through: mark error and advance
      setCharResult(idx, false, res.letter || '?', res.sequence);
      if (fbResult) {
        fbResult.innerHTML = `<i class="mdi mdi-close-thick"></i> 錯誤 (目標: ${target})`;
        fbResult.style.color = '#ff5252';
      }
      if (evalStatus) {
        evalStatus.textContent = `發報失誤：輸入 [${res.letter || '?'}]，目標為 [${target}]`;
        evalStatus.style.color = '#ff5252';
      }

      textState.currentIndex++;

      if (textState.currentIndex >= textState.targetChars.length) {
        finishTextModePassage();
      } else {
        updateCharCursor();
      }
    }
  }

  setTimeout(() => {
    if (!isMatch && textState.strictMode) return;
    if (typeof highlightPath === 'function') highlightPath('', false, engine);
  }, 900);
}

function finishTextModePassage() {
  textState.isFinished = true;
  textState.endTime = performance.now();

  const scTotal = document.getElementById('sc-total');
  const scCorrect = document.getElementById('sc-correct');
  const scErrors = document.getElementById('sc-errors');
  const scAccuracy = document.getElementById('sc-accuracy');
  const scorecardSpeedTag = document.getElementById('scorecard-speed-tag');
  const btnRetryErrors = document.getElementById('btn-retry-errors');
  const textScorecard = document.getElementById('text-scorecard');
  const evalStatus = document.getElementById('eval-status');
  const textModeStatus = document.getElementById('text-mode-status');

  const totalLetters = textState.targetChars.filter(c => c !== ' ').length;
  const correctLetters = textState.charResults.filter(r => r && r.char !== ' ' && r.isCorrect).length;
  const errorLetters = totalLetters - correctLetters;
  const accuracy = totalLetters > 0 ? Math.round((correctLetters / totalLetters) * 100) : 100;

  if (scTotal) scTotal.textContent = totalLetters;
  if (scCorrect) scCorrect.textContent = correctLetters;
  if (scErrors) scErrors.textContent = errorLetters;
  if (scAccuracy) scAccuracy.textContent = accuracy + '%';

  const currentPresetKey = window.currentPresetKey || 'intermediate';
  if (scorecardSpeedTag && typeof speedPresets !== 'undefined' && speedPresets[currentPresetKey]) {
    scorecardSpeedTag.textContent = `${speedPresets[currentPresetKey].name} · ${speedPresets[currentPresetKey].wpm}`;
  }

  if (btnRetryErrors) btnRetryErrors.style.display = errorLetters > 0 ? 'inline-block' : 'none';
  if (textScorecard) {
    textScorecard.style.display = 'block';
    textScorecard.scrollIntoView({ behavior: 'smooth' });
  }

  if (evalStatus) {
    evalStatus.innerHTML = `<i class="mdi mdi-party-popper"></i> 文章練習完成！正確率 ${accuracy}%`;
    evalStatus.style.color = accuracy >= 80 ? '#00e676' : '#ffb703';
  }
  if (textModeStatus) {
    textModeStatus.textContent = '練習完成';
    textModeStatus.style.color = '#00e676';
  }
}

// Auto Performance Execution
async function startAutoPlay() {
  const engine = window.engine;
  const synth = window.synth;
  const ribbon = window.ribbon;
  const meterBar = document.getElementById('meter-bar');
  const readoutSymbol = document.getElementById('readout-symbol');
  const evalStatus = document.getElementById('eval-status');
  const textModeStatus = document.getElementById('text-mode-status');
  const btnPlayAuto = document.getElementById('btn-play-auto');
  const btnPauseAuto = document.getElementById('btn-pause-auto');
  const btnStopAuto = document.getElementById('btn-stop-auto');

  if (textState.autoPlayRunning && textState.autoPlayPaused) {
    textState.autoPlayPaused = false;
    if (btnPlayAuto) btnPlayAuto.disabled = true;
    if (btnPauseAuto) {
      btnPauseAuto.disabled = false;
      btnPauseAuto.style.cursor = 'pointer';
      btnPauseAuto.style.color = '#fff';
      btnPauseAuto.innerHTML = '<span><i class="mdi mdi-pause"></i> 暫停</span>';
    }
    if (textModeStatus) {
      textModeStatus.textContent = '示範播放中...';
      textModeStatus.style.color = 'var(--gold)';
    }
    return;
  }

  if (textState.autoPlayRunning) return;

  initTextModePassage(textState.rawText);

  textState.autoPlayRunning = true;
  textState.autoPlayPaused = false;
  textState.autoPlayAbort = false;

  if (btnPlayAuto) btnPlayAuto.disabled = true;
  if (btnPauseAuto) {
    btnPauseAuto.disabled = false;
    btnPauseAuto.style.cursor = 'pointer';
    btnPauseAuto.style.color = '#fff';
  }
  if (btnStopAuto) {
    btnStopAuto.disabled = false;
    btnStopAuto.style.cursor = 'pointer';
    btnStopAuto.style.color = '#fff';
  }
  if (textModeStatus) {
    textModeStatus.textContent = '示範播放中...';
    textModeStatus.style.color = 'var(--gold)';
  }

  const target = textState.targetChars;

  for (let i = 0; i < target.length; i++) {
    if (textState.autoPlayAbort) break;

    while (textState.autoPlayPaused) {
      if (textState.autoPlayAbort) break;
      await new Promise(r => setTimeout(r, 80));
    }
    if (textState.autoPlayAbort) break;

    textState.currentIndex = i;
    updateCharCursor();
    const char = target[i];
    const chip = document.getElementById('char-chip-' + i);

    if (char === ' ') {
      if (chip) chip.classList.add('state-playing');
      if (evalStatus) {
        evalStatus.textContent = `示範播放：單字間隔 (${engine.config.wordGap}ms)`;
        evalStatus.style.color = 'var(--gold)';
      }
      await new Promise(r => setTimeout(r, engine.config.wordGap));
      if (chip) {
        chip.classList.remove('state-playing');
        chip.classList.add('state-correct');
      }
      continue;
    }

    const seq = engine.getSequenceForLetter(char);
    if (!seq) {
      if (chip) chip.classList.add('state-wrong');
      continue;
    }

    if (chip) chip.classList.add('state-playing');
    if (evalStatus) {
      evalStatus.textContent = `示範播放：[${char}] (${seq})`;
      evalStatus.style.color = '#ffd700';
    }

    // Play each dit/dah element
    let accSeq = '';
    for (const sym of seq) {
      if (textState.autoPlayAbort) break;
      while (textState.autoPlayPaused) {
        if (textState.autoPlayAbort) break;
        await new Promise(r => setTimeout(r, 80));
      }
      if (textState.autoPlayAbort) break;

      accSeq += sym;
      const unitT = engine.getEffectiveUnitT();
      const dur = (sym === '.') ? unitT : (unitT * 3);
      if (meterBar) {
        meterBar.style.width = (sym === '.') ? '25%' : '75%';
        meterBar.className = (sym === '.') ? 'meter-bar' : 'meter-bar dah-active';
      }
      if (readoutSymbol) readoutSymbol.textContent = (sym === '.') ? '點 Dit (·)' : '劃 Dah (—)';

      synth.start();
      ribbon.startPulse(performance.now(), sym);
      if (typeof highlightPath === 'function') highlightPath(accSeq, false, engine);
      if (typeof simulateKeyVisualPress === 'function') simulateKeyVisualPress(sym);
      await new Promise(r => setTimeout(r, dur));
      synth.stop();
      ribbon.endPulse(performance.now(), sym);
      if (typeof simulateKeyVisualRelease === 'function') simulateKeyVisualRelease();
      if (meterBar) meterBar.style.width = '0%';
      await new Promise(r => setTimeout(r, unitT)); // intra-char gap (1T)
    }

    if (textState.autoPlayAbort) break;

    if (typeof highlightPath === 'function') highlightPath(seq, true, engine);
    if (chip) {
      chip.classList.remove('state-playing');
      chip.classList.add('state-correct');
    }
    await new Promise(r => setTimeout(r, engine.config.letterGap)); // letter gap (3T)
    if (typeof highlightPath === 'function') highlightPath('', false, engine);
  }

  if (typeof simulateKeyVisualRelease === 'function') simulateKeyVisualRelease();
  resetAutoPlayButtons();
  if (evalStatus) {
    evalStatus.textContent = textState.autoPlayAbort ? '示範已停止' : '示範播放完成！';
    evalStatus.style.color = textState.autoPlayAbort ? '#aaa' : '#00e676';
  }
  if (textModeStatus) {
    textModeStatus.textContent = textState.autoPlayAbort ? '已停止' : '播放完畢';
    textModeStatus.style.color = textState.autoPlayAbort ? '#aaa' : '#00e676';
  }
  if (meterBar) meterBar.style.width = '0%';
  if (readoutSymbol) readoutSymbol.textContent = '無';
  if (typeof highlightPath === 'function') highlightPath('', false, engine);
}

function pauseAutoPlay() {
  if (!textState.autoPlayRunning) return;
  textState.autoPlayPaused = !textState.autoPlayPaused;
  const synth = window.synth;
  const btnPauseAuto = document.getElementById('btn-pause-auto');
  const textModeStatus = document.getElementById('text-mode-status');

  if (textState.autoPlayPaused) {
    if (synth) synth.stop();
    if (typeof simulateKeyVisualRelease === 'function') simulateKeyVisualRelease();
    if (btnPauseAuto) btnPauseAuto.innerHTML = '<span><i class="mdi mdi-play"></i> 繼續</span>';
    if (textModeStatus) {
      textModeStatus.textContent = '示範已暫停';
      textModeStatus.style.color = '#ff9100';
    }
  } else {
    if (btnPauseAuto) btnPauseAuto.innerHTML = '<span><i class="mdi mdi-pause"></i> 暫停</span>';
    if (textModeStatus) {
      textModeStatus.textContent = '自動示範中...';
      textModeStatus.style.color = 'var(--gold)';
    }
  }
}

function stopAutoPlay() {
  textState.autoPlayAbort = true;
  textState.autoPlayRunning = false;
  textState.autoPlayPaused = false;
  const synth = window.synth;
  const meterBar = document.getElementById('meter-bar');

  if (synth) synth.stop();
  if (typeof simulateKeyVisualRelease === 'function') simulateKeyVisualRelease();
  if (meterBar) meterBar.style.width = '0%';
  if (typeof highlightPath === 'function') highlightPath('', false, window.engine);
  resetAutoPlayButtons();
}

function resetAutoPlayButtons() {
  textState.autoPlayRunning = false;
  textState.autoPlayPaused = false;
  textState.autoPlayAbort = false;

  const btnPlayAuto = document.getElementById('btn-play-auto');
  const btnPauseAuto = document.getElementById('btn-pause-auto');
  const btnStopAuto = document.getElementById('btn-stop-auto');

  if (btnPlayAuto) btnPlayAuto.disabled = false;
  if (btnPauseAuto) {
    btnPauseAuto.disabled = true;
    btnPauseAuto.style.cursor = 'not-allowed';
    btnPauseAuto.style.color = '#666';
    btnPauseAuto.innerHTML = '<span><i class="mdi mdi-pause"></i> 暫停</span>';
  }
  if (btnStopAuto) {
    btnStopAuto.disabled = true;
    btnStopAuto.style.cursor = 'not-allowed';
    btnStopAuto.style.color = '#666';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    textState,
    initTextModePassage,
    updateCharCursor,
    setCharResult,
    finalizeLetterTextMode,
    finishTextModePassage,
    startAutoPlay,
    pauseAutoPlay,
    stopAutoPlay,
    resetAutoPlayButtons
  };
}
