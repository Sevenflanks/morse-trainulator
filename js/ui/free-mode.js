/**
 * FREE PRACTICE MODE CONTROLLER: free-mode.js
 * 自由練習模式、文字串接、點擊字母示範與導引情境腳本 (Walkthrough Scenarios)
 */

function renderCommittedText() {
  const engine = window.engine;
  if (!engine || !engine.committedLetters) return '—';
  if (engine.committedLetters.length === 0) return '—';
  return engine.committedLetters.join('');
}

function updateCommittedView() {
  const el = document.getElementById('state-committed');
  const clearBtn = document.getElementById('btn-clear-committed');
  const hudStream = document.getElementById('hud-committed-stream');
  const text = renderCommittedText();
  if (el) {
    el.textContent = text;
    el.title = (text !== '—') ? text : '';
    el.scrollLeft = el.scrollWidth;
  }
  if (hudStream) {
    hudStream.textContent = text;
    hudStream.title = (text !== '—') ? text : '';
    hudStream.scrollLeft = hudStream.scrollWidth;
  }
  if (clearBtn) {
    const hasText = window.engine && window.engine.committedLetters && window.engine.committedLetters.length > 0;
    clearBtn.style.display = hasText ? 'inline-block' : 'none';
  }
}

function setupCommittedClear(engine) {
  const clearBtn = document.getElementById('btn-clear-committed');
  if (!clearBtn) return;
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (engine) engine.committedLetters = [];
    updateCommittedView();
    const evalStatus = document.getElementById('eval-status');
    if (evalStatus) {
      evalStatus.innerHTML = '<i class="mdi mdi-delete-sweep"></i> 已清除送出文字！';
      evalStatus.style.color = 'var(--gold)';
    }
  });
}

// Key Actuator Visual Simulation
function simulateKeyVisualPress(sym) {
  const currentKeyerDevice = window.currentKeyerDevice || 'straight';
  const keyer = window.keyer;
  const keyTrigger = document.getElementById('key-trigger');
  const paddleLeft = document.getElementById('paddle-left');
  const paddleRight = document.getElementById('paddle-right');

  if (currentKeyerDevice === 'straight') {
    if (keyTrigger) keyTrigger.classList.add('active');
  } else if (keyer) {
    if (sym === '.') {
      const ditEl = keyer.reversed ? paddleRight : paddleLeft;
      if (ditEl) ditEl.classList.add('active');
    } else {
      const dahEl = keyer.reversed ? paddleLeft : paddleRight;
      if (dahEl) dahEl.classList.add(keyer.reversed ? 'active' : 'active-dah');
    }
  }
}

function simulateKeyVisualRelease() {
  const keyTrigger = document.getElementById('key-trigger');
  const paddleLeft = document.getElementById('paddle-left');
  const paddleRight = document.getElementById('paddle-right');

  if (keyTrigger) keyTrigger.classList.remove('active');
  if (paddleLeft) paddleLeft.classList.remove('active', 'active-dah');
  if (paddleRight) paddleRight.classList.remove('active', 'active-dah');
}

// Click on Letter node to demo / replay
async function replayLetter(letter, seq) {
  const engine = window.engine;
  const synth = window.synth;
  const ribbon = window.ribbon;
  const meterBar = document.getElementById('meter-bar');
  const readoutSymbol = document.getElementById('readout-symbol');
  const evalStatus = document.getElementById('eval-status');
  const stateLetter = document.getElementById('state-letter');
  const stateSeq = document.getElementById('state-seq');

  if (!engine || !synth || !ribbon) return;

  if (evalStatus) {
    evalStatus.textContent = `示範發報 [${letter}] (${seq})`;
    evalStatus.style.color = '#ffd700';
  }
  if (stateLetter) stateLetter.textContent = letter;
  if (stateSeq) stateSeq.textContent = seq;

  const hudTarget = document.getElementById('hud-char-target');
  const hudSeq = document.getElementById('hud-seq-target');
  if (hudTarget) hudTarget.textContent = letter;
  if (hudSeq) hudSeq.textContent = seq;

  let sub = '';
  for (const char of seq) {
    sub += char;
    const unitT = engine.getEffectiveUnitT();
    const dur = (char === '.') ? unitT : (unitT * 3);
    if (meterBar) {
      meterBar.style.width = (char === '.') ? '25%' : '75%';
      meterBar.className = (char === '.') ? 'meter-bar' : 'meter-bar dah-active';
    }
    if (readoutSymbol) readoutSymbol.textContent = (char === '.') ? '點 Dit (·)' : '劃 Dah (—)';

    synth.start();
    ribbon.startPulse(performance.now(), char);
    if (typeof highlightPath === 'function') highlightPath(sub, false, engine);
    simulateKeyVisualPress(char);
    await new Promise(r => setTimeout(r, dur));
    synth.stop();
    ribbon.endPulse(performance.now(), char);
    simulateKeyVisualRelease();
    if (meterBar) meterBar.style.width = '0%';
    await new Promise(r => setTimeout(r, unitT));
  }

  if (typeof highlightPath === 'function') highlightPath(seq, true, engine);
  setTimeout(() => {
    if (typeof highlightPath === 'function') highlightPath('', false, engine);
    if (evalStatus) evalStatus.textContent = '等待輸入';
    if (stateSeq) stateSeq.textContent = '—';
    if (stateLetter) stateLetter.textContent = '—';
    if (hudTarget && (window.currentMode === 'free' || !window.currentMode)) hudTarget.textContent = '—';
    if (hudSeq && (window.currentMode === 'free' || !window.currentMode)) hudSeq.textContent = '—';
  }, 1200);
}

function setupScenarios(engine, replayFn = replayLetter, keyActions = null) {
  const scenarios = [
    {
      title: "1. 字母 E (點 Dit)",
      desc: "短按測試：按鍵時間低於門檻 (<200ms) 判定為點 Dit (·)，電路流向右側節點 E 並結算。",
      actions: [
        { label: "模擬按壓 100ms (點 Dit)", dur: 100, char: "E", seq: "." }
      ]
    },
    {
      title: "2. 字母 T (劃 Dah)",
      desc: "長按測試：按鍵時間大於門檻 (>200ms) 判定為劃 Dah (—)，電路流向左側節點 T 並結算。",
      actions: [
        { label: "模擬按壓 300ms (劃 Dah)", dur: 300, char: "T", seq: "-" }
      ]
    },
    {
      title: "3. 求救 SOS (· · · — — — · · ·)",
      desc: "依序發送 3 個點 (S)、等待結算，再發送 3 個劃 (O)，最後發送 3 個點 (S)。",
      actions: [
        { label: "發報字母 'S' (...)", pattern: '...', char: "S", seq: "..." },
        { label: "發報字母 'O' (---)", pattern: '---', char: "O", seq: "---" },
        { label: "發報字母 'S' (...)", pattern: '...', char: "S", seq: "..." },
        { label: "發送 SOS (... --- ...)", pattern: '... --- ...' }
      ]
    },
    {
      title: "4. 門檻測試 (Boundary)",
      desc: "長短音臨界手感：190ms (點 Dit) 與 210ms (劃 Dah)。可於右側面板調整門檻。",
      actions: [
        { label: "測試 190ms (點 Dit)", dur: 190 },
        { label: "測試 210ms (劃 Dah)", dur: 210 }
      ]
    },
    {
      title: "5. 筆誤更正 (<HH> / 8 點)",
      desc: "連發 8 個點 (........) 觸發更正碼 <HH>，自動退格刪除剛送出的最後一個單字。",
      actions: [
        { label: "先發報單字 SOS", pattern: '... --- ...' },
        { label: "發報更正碼 <HH> (8 點)", pattern: '........', char: "<HH>", seq: "........" }
      ]
    }
  ];

  const bodyEl = document.getElementById('scenario-desc') || document.getElementById('scenario-body');
  const stepsEl = document.getElementById('scenario-actions') || document.getElementById('scenario-steps');

  function renderScenario(key) {
    let sc = null;
    if (typeof key === 'number' || (!isNaN(parseInt(key, 10)) && typeof key === 'string' && !key.startsWith('s'))) {
      const idx = parseInt(key, 10);
      sc = scenarios[idx];
    } else if (typeof key === 'string' && key.startsWith('s')) {
      const idx = parseInt(key.substring(1), 10) - 1;
      sc = scenarios[idx];
    }
    if (!sc || !bodyEl || !stepsEl) return;
    bodyEl.textContent = sc.desc;
    stepsEl.innerHTML = '';

    const doKeyDown = (keyActions && keyActions.keyDown) || (typeof window !== 'undefined' && window.handleKeyDown);
    const doKeyUp = (keyActions && keyActions.keyUp) || (typeof window !== 'undefined' && window.handleKeyUp);

    sc.actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = 'step-btn';
      btn.textContent = act.label;
      btn.onclick = async () => {
        if (act.dur && doKeyDown && doKeyUp) {
          doKeyDown();
          await new Promise(r => setTimeout(r, act.dur));
          doKeyUp();
        } else if (act.pattern && doKeyDown && doKeyUp) {
          for (const c of act.pattern) {
            if (c === ' ') {
              const gapMs = (engine && engine.getEffectiveUnitT) ? (engine.getEffectiveUnitT() * 4) : 400;
              await new Promise(r => setTimeout(r, Math.max(350, gapMs)));
              continue;
            }
            const unitT = (engine && engine.getEffectiveUnitT) ? engine.getEffectiveUnitT() : 80;
            const dur = (c === '.') ? unitT : (unitT * 3);
            doKeyDown();
            await new Promise(r => setTimeout(r, dur));
            doKeyUp();
            await new Promise(r => setTimeout(r, unitT));
          }
        } else if (act.char && act.seq && typeof replayFn === 'function') {
          replayFn(act.char, act.seq);
        }
      };
      stepsEl.appendChild(btn);
    });
  }

  document.querySelectorAll('#scenario-tabs .tab-btn, .tabs .tab-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#scenario-tabs .tab-btn, .tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabVal = btn.dataset.tab !== undefined ? btn.dataset.tab : idx;
      renderScenario(tabVal);
    });
  });

  renderScenario(0);
}

if (typeof window !== 'undefined') {
  window.renderCommittedText = renderCommittedText;
  window.updateCommittedView = updateCommittedView;
  window.setupCommittedClear = setupCommittedClear;
  window.replayLetter = replayLetter;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderCommittedText,
    updateCommittedView,
    setupCommittedClear,
    simulateKeyVisualPress,
    simulateKeyVisualRelease,
    replayLetter,
    setupScenarios
  };
}
