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
  const text = renderCommittedText();
  if (el) {
    el.textContent = text;
    el.title = (text !== '—') ? text : '';
    el.scrollLeft = el.scrollWidth;
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
      evalStatus.textContent = '🔄 已清空輸出文字！';
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
    evalStatus.textContent = `示範播放 [${letter}] (${seq})`;
    evalStatus.style.color = '#ffd700';
  }
  if (stateLetter) stateLetter.textContent = letter;
  if (stateSeq) stateSeq.textContent = seq;

  let sub = '';
  for (const char of seq) {
    sub += char;
    const unitT = engine.getEffectiveUnitT();
    const dur = (char === '.') ? unitT : (unitT * 3);
    if (meterBar) {
      meterBar.style.width = (char === '.') ? '25%' : '75%';
      meterBar.className = (char === '.') ? 'meter-bar' : 'meter-bar dah-active';
    }
    if (readoutSymbol) readoutSymbol.textContent = (char === '.') ? '短音 Dit (·)' : '長音 Dah (—)';

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
  }, 1200);
}

function setupScenarios(engine, replayFn = replayLetter, keyActions = null) {
  const scenarios = [
    {
      title: "1. 單字 E (短音 Dit)",
      desc: "測試單次短按。持續時間低於門檻 (<200ms)，判定為短音 (·)，導線流向右側圓形節點 E 並成功結算。",
      actions: [
        { label: "模擬按壓 100ms (Dit)", dur: 100, char: "E", seq: "." }
      ]
    },
    {
      title: "2. 單字 T (長音 Dah)",
      desc: "測試長按。持續時間大於門檻 (>200ms)，判定為長音 (—)，導線流向左側方形節點 T 並成功結算。",
      actions: [
        { label: "模擬按壓 300ms (Dah)", dur: 300, char: "T", seq: "-" }
      ]
    },
    {
      title: "3. 輸入 SOS (· · · — — — · · ·)",
      desc: "國際求救信號。依序輸入 3 個短音 (S)、等待結算，再輸入 3 個長音 (O)，最後輸入 3 個短音 (S)。",
      actions: [
        { label: "發報 'S' (...)", pattern: '...', char: "S", seq: "..." },
        { label: "發報 'O' (---)", pattern: '---', char: "O", seq: "---" },
        { label: "發報 'S' (...)", pattern: '...', char: "S", seq: "..." },
        { label: "完整發送 SOS (... --- ...)", pattern: '... --- ...' }
      ]
    },
    {
      title: "4. 門檻邊界測試 (Boundary)",
      desc: "測試臨界點手感：190ms (判定為 Dit) vs 210ms (判定為 Dah)。可在設定中調整門檻以驗證靈敏度。",
      actions: [
        { label: "測試 190ms (近門檻短音)", dur: 190 },
        { label: "測試 210ms (剛過門檻長音)", dur: 210 }
      ]
    },
    {
      title: "5. 筆誤更正 (<HH> / 8短音)",
      desc: "國際電報更正訊號 (Error / Correction Prosign: <HH>)。連發 8 個短音 (........) 即可作廢並刪除已確認的最後一個單字。",
      actions: [
        { label: "先發報單字 SOS", pattern: '... --- ...' },
        { label: "發報更正碼 <HH> (8短音)", pattern: '........', char: "<HH>", seq: "........" }
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
