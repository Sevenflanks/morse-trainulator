/**
 * KOCH DRILL MODE CONTROLLER: koch-mode.js
 * 科赫闖關模式、PCB 漸進解鎖遮罩、即時比對與晉級記分板
 */

const kochState = {
  running: false,
  mode: 'quick', // 'quick' | 'standard' | 'challenge'
  duration: 180, // Assessment duration in seconds (for standard & challenge)
  timeRemaining: 180,
  timerId: null,
  reflexTimeoutMs: 2000,
  reflexTimerId: null,
  reflexStartTime: 0,
  reflexDuration: 2000,
  reflexRafId: null,
  reflexPaused: false,
  warmupCount: 10,
  targetChars: [],
  currentIndex: 0,
  charResults: [],
  runStartIndex: 0,
  timeoutCount: 0,
  challengeResetCount: 0,
  hasStarted: false,
  isFinished: false,
  showHints: false
};

function updatePcbKochVisuals() {
  const currentMode = window.currentMode || 'free';
  const kochManager = window.kochManager;

  if (currentMode === 'koch' && kochManager) {
    const curLvl = kochManager.currentLevel;
    const unlockedPool = kochManager.getUnlockedPool(curLvl);
    const targetChars = (curLvl === 1) ? ['K', 'M'] : [kochManager.getTargetChar(curLvl)];

    // 1. Letters on binary tree
    document.querySelectorAll('.node-group').forEach(node => {
      const letter = node.dataset.letter;
      if (!letter) return;
      const isUnlocked = unlockedPool.includes(letter);
      const isTarget = targetChars.includes(letter);

      node.classList.toggle('koch-locked', !isUnlocked);
      node.classList.toggle('koch-unlocked', isUnlocked);
      node.classList.toggle('koch-target-node', isTarget);
    });

    // 2. Number bus chips
    document.querySelectorAll('.number-chip').forEach(chip => {
      const digit = chip.dataset.digit;
      if (!digit) return;
      const isUnlocked = unlockedPool.includes(digit);
      const isTarget = targetChars.includes(digit);

      chip.classList.toggle('koch-locked', !isUnlocked);
      chip.classList.toggle('koch-unlocked', isUnlocked);
      chip.classList.toggle('koch-target-node', isTarget);
    });
  } else {
    // Remove all koch states when outside Koch mode
    document.querySelectorAll('.node-group').forEach(node => {
      node.classList.remove('koch-locked', 'koch-unlocked', 'koch-target-node', 'koch-just-unlocked');
    });
    document.querySelectorAll('.number-chip').forEach(chip => {
      chip.classList.remove('koch-locked', 'koch-unlocked', 'koch-target-node', 'koch-just-unlocked');
    });
  }
}

function renderPoolChips(container, pool, engine) {
  if (!container) return;
  container.innerHTML = '';
  pool.forEach(c => {
    const chip = document.createElement('span');
    chip.className = 'koch-pool-chip';
    const seq = engine.getSequenceForLetter(c) || '';
    chip.innerHTML = `${c} <span style="font-family:monospace; color:var(--gold); font-size:0.75rem; margin-left:2px;">${seq}</span>`;
    chip.title = `點擊試聽 ${c} (${seq})`;
    chip.style.cssText = 'display:inline-flex; align-items:center; background:#182230; border:1px solid #2d3b4e; border-radius:4px; padding:1px 6px; font-size:0.75rem; font-weight:bold; cursor:pointer; user-select:none; transition:all 0.15s;';
    chip.addEventListener('mouseenter', () => { chip.style.borderColor = '#00e5ff'; chip.style.background = '#203045'; });
    chip.addEventListener('mouseleave', () => { chip.style.borderColor = '#2d3b4e'; chip.style.background = '#182230'; });
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof window.replayLetter === 'function') {
        window.replayLetter(c, seq);
      }
    });
    container.appendChild(chip);
  });
}

function getClearBadgeHtml(clearInfo) {
  if (!clearInfo || !clearInfo.highest) {
    return '<span class="badge-tier tier-none"><i class="mdi mdi-circle-outline"></i> 尚未通關</span>';
  }
  if (clearInfo.highest === 'challenge') {
    return '<span class="badge-tier tier-challenge"><i class="mdi mdi-crown"></i> 極限征服</span>';
  }
  if (clearInfo.highest === 'standard') {
    return '<span class="badge-tier tier-standard"><i class="mdi mdi-trophy"></i> 正規合格</span>';
  }
  if (clearInfo.highest === 'quick') {
    return '<span class="badge-tier tier-quick"><i class="mdi mdi-check-circle"></i> 基礎通過</span>';
  }
  return '<span class="badge-tier tier-none"><i class="mdi mdi-circle-outline"></i> 尚未通關</span>';
}

function selectKochStage(lvl) {
  const kochManager = window.kochManager;
  if (!kochManager) return;
  if (lvl < 1 || lvl > kochManager.maxUnlockedLevel) return;
  kochManager.currentLevel = lvl;
  updateKochUI();
  updatePcbKochVisuals();
}

function renderStageMatrix() {
  const kochManager = window.kochManager;
  if (!kochManager) return;
  const grid = document.getElementById('koch-stage-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const curLvl = kochManager.currentLevel;
  const maxLvl = kochManager.maxUnlockedLevel;
  const seqList = (typeof KOCH_SEQUENCE !== 'undefined') ? KOCH_SEQUENCE : [];

  for (let i = 1; i <= 35; i++) {
    const isUnlocked = (i <= maxLvl);
    const clearInfo = typeof kochManager.getStageClear === 'function' ? kochManager.getStageClear(i) : null;
    const charLabel = (i === 1) ? 'K,M' : (seqList[i] || i);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'stage-cell';
    if (!btn.dataset) btn.dataset = {};
    btn.dataset.level = i;
    if (typeof btn.setAttribute === 'function') {
      btn.setAttribute('data-level', i);
    }

    let medalIcon = '';
    if (!isUnlocked) {
      btn.classList.add('cell-locked');
      btn.disabled = true;
      btn.title = `第 ${i} 關 (${charLabel}) - 尚未解鎖`;
      medalIcon = '<i class="mdi mdi-lock"></i>';
    } else {
      if (i === curLvl) {
        btn.classList.add('active-stage');
      }
      if (clearInfo && clearInfo.highest) {
        if (clearInfo.highest === 'challenge') {
          btn.classList.add('cell-cleared-challenge');
          btn.title = `第 ${i} 關 (${charLabel}) · 極限挑戰征服 (最高含金量)`;
          medalIcon = '<i class="mdi mdi-crown"></i>';
        } else if (clearInfo.highest === 'standard') {
          btn.classList.add('cell-cleared-standard');
          btn.title = `第 ${i} 關 (${charLabel}) · 正規考核合格`;
          medalIcon = '<i class="mdi mdi-trophy"></i>';
        } else if (clearInfo.highest === 'quick') {
          btn.classList.add('cell-cleared-quick');
          btn.title = `第 ${i} 關 (${charLabel}) · 基礎練習通過`;
          medalIcon = '<i class="mdi mdi-check-circle"></i>';
        }
      } else {
        btn.classList.add('cell-unlocked');
        btn.title = `第 ${i} 關 (${charLabel}) · 已解鎖 (未通關)`;
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectKochStage(i);
      });
    }

    btn.innerHTML = `
      <div class="stage-cell-top">
        <span class="stage-num">${i}</span>
        <span class="stage-medal">${medalIcon}</span>
      </div>
      <span class="stage-char">${charLabel}</span>
    `;

    grid.appendChild(btn);
  }
}

function updateKochUI() {
  const kochManager = window.kochManager;
  const engine = window.engine;
  if (!kochManager || !engine) return;

  const curLvl = kochManager.currentLevel;
  const maxLvl = kochManager.maxUnlockedLevel;
  const targetChar = kochManager.getTargetChar(curLvl);
  const targetSeq = engine.getSequenceForLetter(targetChar) || '';
  const pool = kochManager.getUnlockedPool(curLvl);

  const kochStageBadge = document.getElementById('koch-stage-badge');
  const kochMasteryText = document.getElementById('koch-mastery-text');
  const kochMasteryBar = document.getElementById('koch-mastery-bar');
  const kochStage1Card = document.getElementById('koch-stage1-card');
  const kochStandardCard = document.getElementById('koch-standard-card');
  const kochTargetChar = document.getElementById('koch-target-char');
  const kochTargetSeq = document.getElementById('koch-target-seq');
  const kochPoolText = document.getElementById('koch-pool-text');
  const kochPoolStage1 = document.getElementById('koch-pool-stage1');
  const kochStageSelect = document.getElementById('koch-stage-select');
  const stage1ClearBadge = document.getElementById('koch-stage1-clear-badge');
  const targetClearBadge = document.getElementById('koch-target-clear-badge');

  if (kochStageBadge) kochStageBadge.textContent = `第 ${curLvl} 關 / 共 35 關`;
  const unlockedCount = maxLvl + 1;
  const masteryPct = Math.round((unlockedCount / 36) * 100);
  if (kochMasteryText) kochMasteryText.textContent = `已解鎖 ${unlockedCount} / 36 (${masteryPct}%)`;
  if (kochMasteryBar) kochMasteryBar.style.width = `${masteryPct}%`;

  // Update trophy summary counts
  if (typeof kochManager.getClearanceCounts === 'function') {
    const counts = kochManager.getClearanceCounts();
    const cntCh = document.getElementById('trophy-cnt-challenge');
    const cntStd = document.getElementById('trophy-cnt-standard');
    const cntQk = document.getElementById('trophy-cnt-quick');
    const cntTot = document.getElementById('trophy-cnt-total');
    if (cntCh) cntCh.textContent = counts.challenge;
    if (cntStd) cntStd.textContent = counts.standard;
    if (cntQk) cntQk.textContent = counts.quick;
    if (cntTot) cntTot.textContent = counts.totalCleared;
  }

  // Render 35 Stage Matrix
  renderStageMatrix();

  // Update active stage clear badges
  const curClear = typeof kochManager.getStageClear === 'function' ? kochManager.getStageClear(curLvl) : null;
  const badgeHtml = getClearBadgeHtml(curClear);
  if (stage1ClearBadge) stage1ClearBadge.innerHTML = badgeHtml;
  if (targetClearBadge) targetClearBadge.innerHTML = badgeHtml;

  if (curLvl === 1) {
    if (kochStage1Card) kochStage1Card.style.display = 'flex';
    if (kochStandardCard) kochStandardCard.style.display = 'none';
    if (kochPoolStage1) renderPoolChips(kochPoolStage1, pool, engine);
  } else {
    if (kochStage1Card) kochStage1Card.style.display = 'none';
    if (kochStandardCard) kochStandardCard.style.display = 'flex';
    if (kochTargetChar) kochTargetChar.textContent = targetChar;
    if (kochTargetSeq) kochTargetSeq.textContent = targetSeq;
    if (kochPoolText) renderPoolChips(kochPoolText, pool, engine);
  }

  // Re-populate stage selector with clear honors
  if (kochStageSelect) {
    kochStageSelect.innerHTML = '';
    const seqList = (typeof KOCH_SEQUENCE !== 'undefined') ? KOCH_SEQUENCE : [];
    for (let i = 1; i <= maxLvl; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      const clearInfo = typeof kochManager.getStageClear === 'function' ? kochManager.getStageClear(i) : null;
      let prefix = '';
      if (clearInfo && clearInfo.highest) {
        if (clearInfo.highest === 'challenge') prefix = '[極限] ';
        else if (clearInfo.highest === 'standard') prefix = '[正規] ';
        else if (clearInfo.highest === 'quick') prefix = '[基礎] ';
      }
      opt.textContent = (i === 1) ? `${prefix}第 1 關 (入門雙星 K, M)` : `${prefix}第 ${i} 關 (新字元 ${seqList[i] || i})`;
      if (i === curLvl) opt.selected = true;
      kochStageSelect.appendChild(opt);
    }
  }
}

function setKochAssessmentMode(mode) {
  kochState.mode = mode;
  const tabs = document.querySelectorAll('.koch-mode-tab');
  tabs.forEach(tab => {
    const isActive = (tab.dataset.mode === mode);
    tab.classList.toggle('active', isActive);
  });

  const cfgQuick = document.getElementById('koch-cfg-quick');
  const cfgStd = document.getElementById('koch-cfg-standard');
  const cfgCh = document.getElementById('koch-cfg-challenge');
  const descEl = document.getElementById('koch-mode-desc');

  if (cfgQuick) cfgQuick.style.display = (mode === 'quick') ? 'flex' : 'none';
  if (cfgStd) cfgStd.style.display = (mode === 'standard') ? 'flex' : 'none';
  if (cfgCh) cfgCh.style.display = (mode === 'challenge') ? 'flex' : 'none';

  if (descEl) {
    if (mode === 'quick') {
      descEl.innerHTML = '<i class="mdi mdi-check-circle"></i> 基礎練習：無超時限制，適合熟悉新字元音形與手感。';
      descEl.style.color = '#889';
    } else if (mode === 'standard') {
      descEl.innerHTML = '<i class="mdi mdi-trophy"></i> 正規考核：計時連續考核，啟用 2.0s 反射倒數，正確率 ≥90% 通關。';
      descEl.style.color = '#00e5ff';
    } else if (mode === 'challenge') {
      descEl.innerHTML = '<i class="mdi mdi-fire"></i> 極限挑戰：限時連續考核，啟用 2.0s 反射倒數，正確率跌破 90% 重置計時。';
      descEl.style.color = '#ff9100';
    }
  }

  if (kochState.running) {
    clearKochTimers();
    kochState.running = false;
    kochState.isFinished = true;
    const kochDrillPanel = document.getElementById('koch-drill-panel');
    if (kochDrillPanel) kochDrillPanel.style.display = 'none';
    const kochScorecard = document.getElementById('koch-scorecard');
    if (kochScorecard) kochScorecard.style.display = 'none';
  }
}

function formatTime(sec) {
  const mm = Math.floor(sec / 60).toString().padStart(2, '0');
  const ss = (sec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function flashTimerReset() {
  const badge = document.getElementById('koch-progress-badge');
  const reflexBar = document.getElementById('koch-reflex-bar');
  if (badge) {
    badge.classList.remove('timer-reset-flash');
    void badge.offsetWidth;
    badge.classList.add('timer-reset-flash');
  }
  if (reflexBar) {
    reflexBar.classList.add('danger');
    setTimeout(() => {
      if (reflexBar && !kochState.isFinished) reflexBar.classList.remove('danger');
    }, 400);
  }
}

function createCharChip(char, idx, engine) {
  const chip = document.createElement('div');
  chip.className = 'char-chip' + (idx === 0 ? ' state-current' : '');
  chip.id = 'koch-char-chip-' + idx;

  const main = document.createElement('div');
  main.className = 'char-main';
  main.textContent = char;

  const hint = document.createElement('div');
  hint.className = 'hint-text';
  hint.textContent = engine ? (engine.getSequenceForLetter(char) || '') : '';
  if (!kochState.showHints) {
    hint.style.display = 'none';
  }

  chip.appendChild(main);
  chip.appendChild(hint);
  return chip;
}

function startReflexTimer() {
  clearReflexTimer();
  if (kochState.mode === 'quick' || !kochState.running || kochState.isFinished) return;

  const reflexContainer = document.getElementById('koch-reflex-container');
  const reflexBar = document.getElementById('koch-reflex-bar');
  if (reflexContainer) reflexContainer.style.display = 'block';

  kochState.reflexDuration = kochState.reflexTimeoutMs || 2000;
  kochState.reflexStartTime = Date.now();
  kochState.reflexPaused = false;

  if (reflexBar) {
    reflexBar.style.width = '100%';
    reflexBar.classList.remove('warn', 'danger');
  }

  function tick() {
    if (!kochState.running || kochState.isFinished || kochState.reflexPaused) return;
    const elapsed = Date.now() - kochState.reflexStartTime;
    const remaining = Math.max(0, kochState.reflexDuration - elapsed);
    const pct = (remaining / kochState.reflexDuration) * 100;

    if (reflexBar) {
      reflexBar.style.width = `${pct}%`;
      if (pct <= 20) {
        reflexBar.classList.add('danger');
        reflexBar.classList.remove('warn');
      } else if (pct <= 50) {
        reflexBar.classList.add('warn');
        reflexBar.classList.remove('danger');
      } else {
        reflexBar.classList.remove('warn', 'danger');
      }
    }

    if (remaining > 0) {
      if (typeof requestAnimationFrame === 'function') {
        kochState.reflexRafId = requestAnimationFrame(tick);
      }
    }
  }

  if (typeof requestAnimationFrame === 'function') {
    kochState.reflexRafId = requestAnimationFrame(tick);
  }

  kochState.reflexTimerId = setTimeout(() => {
    handleReflexTimeout();
  }, kochState.reflexDuration);
}

function startKochSessionTiming() {
  if (kochState.hasStarted || !kochState.running || kochState.isFinished) return;
  kochState.hasStarted = true;

  if (kochState.mode !== 'quick') {
    if (kochState.timerId) clearInterval(kochState.timerId);
    kochState.timerId = setInterval(() => {
      if (!kochState.running || kochState.isFinished) return;
      kochState.timeRemaining--;
      updateKochProgressBadge();
      if (kochState.timeRemaining <= 0) {
        clearInterval(kochState.timerId);
        kochState.timerId = null;
        finishKochDrillSession();
      }
    }, 1000);

    const evalStatus = document.getElementById('eval-status');
    if (evalStatus) {
      if (kochState.mode === 'challenge') {
        evalStatus.innerHTML = '<i class="mdi mdi-fire"></i> 極限挑戰進行中...失誤直接重置計時！可按 Esc 隨時結束。';
        evalStatus.style.color = '#ff9100';
      } else if (kochState.mode === 'standard') {
        evalStatus.innerHTML = '<i class="mdi mdi-trophy"></i> 正規考核進行中...請在 2.0s 內反射發報！可按 Esc 結束。';
        evalStatus.style.color = '#00e5ff';
      }
    }
  }
}

function kochModePauseReflex() {
  if (!kochState.hasStarted && kochState.running && !kochState.isFinished) {
    startKochSessionTiming();
  }
  if (kochState.mode === 'quick' || !kochState.running || kochState.reflexPaused) return;
  kochState.reflexPaused = true;
  if (kochState.reflexTimerId) {
    clearTimeout(kochState.reflexTimerId);
    kochState.reflexTimerId = null;
  }
  if (kochState.reflexRafId && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(kochState.reflexRafId);
    kochState.reflexRafId = null;
  }
}

function clearReflexTimer() {
  if (kochState.reflexTimerId) {
    clearTimeout(kochState.reflexTimerId);
    kochState.reflexTimerId = null;
  }
  if (kochState.reflexRafId && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(kochState.reflexRafId);
    kochState.reflexRafId = null;
  }
  kochState.reflexPaused = false;
  const reflexBar = document.getElementById('koch-reflex-bar');
  if (reflexBar) {
    reflexBar.style.width = '100%';
    reflexBar.classList.remove('warn', 'danger');
  }
}

function clearKochTimers() {
  clearReflexTimer();
  if (kochState.timerId) {
    clearInterval(kochState.timerId);
    kochState.timerId = null;
  }
  kochState.hasStarted = false;
}

function rollKochRow(finishedIdx) {
  const ROW_SIZE = 12;
  const passageContainer = document.getElementById('koch-passage-container');
  const kochManager = window.kochManager;
  const engine = window.engine;
  if (!passageContainer || !kochManager || kochState.mode === 'quick') return;

  // Clean up any lingering sliding-out rows
  const oldSliding = passageContainer.querySelectorAll ? passageContainer.querySelectorAll('.row-sliding-out') : [];
  if (oldSliding && oldSliding.forEach) {
    oldSliding.forEach(el => el.remove());
  }

  const finishedRowIdx = Math.floor(finishedIdx / ROW_SIZE);
  const rowToRemove = document.getElementById('koch-row-' + finishedRowIdx);

  // Generate next row of 12 complete characters (Row finishedRowIdx + 2)
  const nextRowIdx = finishedRowIdx + 2;
  const newRowEl = document.createElement('div');
  newRowEl.className = 'passage-row';
  newRowEl.id = 'koch-row-' + nextRowIdx;

  for (let c = 0; c < ROW_SIZE; c++) {
    const nextChar = kochManager.generateNextChar(kochState.targetChars);
    const nextIdx = kochState.targetChars.length;
    kochState.targetChars.push(nextChar);
    kochState.charResults.push(null);
    const chip = createCharChip(nextChar, nextIdx, engine);
    newRowEl.appendChild(chip);
  }
  passageContainer.appendChild(newRowEl);

  if (rowToRemove) {
    rowToRemove.classList.remove('row-init-fade');
    rowToRemove.classList.add('row-sliding-out');
    const isBrowser = (typeof window !== 'undefined' && typeof document !== 'undefined' && document.body);
    if (isBrowser) {
      const rowHeight = rowToRemove.offsetHeight || 42;
      const gap = 8;
      if (rowToRemove.style && rowToRemove.style.setProperty) {
        rowToRemove.style.setProperty('--slide-offset', `-${rowHeight + gap}px`);
      }
      let cleaned = false;
      const cleanUp = (e) => {
        if (e && e.animationName && e.animationName !== 'slideOutUpRow') return;
        if (!cleaned) {
          cleaned = true;
          rowToRemove.remove();
        }
      };
      rowToRemove.addEventListener('animationend', cleanUp, { once: true });
      setTimeout(cleanUp, 320);
    } else {
      rowToRemove.remove();
    }
  }
}

function handleReflexTimeout() {
  if (!kochState.running || kochState.isFinished) return;
  const idx = kochState.currentIndex;
  if (idx >= kochState.targetChars.length) return;

  clearReflexTimer();

  const target = kochState.targetChars[idx];
  const kochFbInput = document.getElementById('koch-fb-input');
  const kochFbResult = document.getElementById('koch-fb-result');
  const evalStatus = document.getElementById('eval-status');

  if (kochFbInput) kochFbInput.textContent = '超時';
  const chip = document.getElementById('koch-char-chip-' + idx);
  if (chip) {
    chip.classList.remove('state-current');
    chip.classList.add('state-wrong', 'state-timeout');
  }

  kochState.charResults[idx] = {
    char: target,
    isCorrect: false,
    isTimeout: true,
    input: '超時',
    seq: ''
  };
  kochState.timeoutCount++;

  if (kochFbResult) {
    kochFbResult.innerHTML = `<i class="mdi mdi-timer-sand"></i> 反射超時 (目標: ${target})`;
    kochFbResult.style.color = '#ff9100';
  }

  // 挑戰模式：若正確率跌破 90% 防線，重置計時並從下一題重新起算正確率
  const runStart = (kochState.mode === 'challenge') ? (kochState.runStartIndex || 0) : 0;
  const runResults = kochState.charResults.slice(runStart, idx + 1);
  const runDone = runResults.length;
  const runCorrect = runResults.filter(r => r && r.isCorrect).length;
  const runAcc = Math.round((runCorrect / runDone) * 100);

  if (kochState.mode === 'challenge') {
    if (runAcc < 90) {
      kochState.timeRemaining = kochState.duration;
      kochState.challengeResetCount = (kochState.challengeResetCount || 0) + 1;
      kochState.runStartIndex = idx + 1; // 從下一點開始重新計算正確率！
      flashTimerReset();
      if (evalStatus) {
        evalStatus.innerHTML = `<i class="mdi mdi-timer-sand"></i> 反射超時！正確率跌破防線（${runAcc}% < 90%），挑戰計時重置為 ${formatTime(kochState.duration)}，由下一題重新起算！`;
        evalStatus.style.color = '#ff9100';
      }
    } else {
      if (evalStatus) {
        evalStatus.innerHTML = `<i class="mdi mdi-timer-sand"></i> 反射超時！當前正確率 ${runAcc}% 仍守住 90% 防線，請繼續發報！`;
        evalStatus.style.color = '#ffb703';
      }
    }
  } else {
    if (evalStatus) {
      evalStatus.innerHTML = `<i class="mdi mdi-timer-sand"></i> 反射超時！未在 2.0s 內發報 (目標: ${target})`;
      evalStatus.style.color = '#ff9100';
    }
  }

  const ROW_SIZE = 12;
  if (kochState.mode === 'quick') {
    kochState.currentIndex++;
    if (kochState.currentIndex >= kochState.targetChars.length) {
      finishKochDrillSession();
    } else {
      updateKochCursor();
    }
  } else {
    if ((idx + 1) % ROW_SIZE === 0) {
      rollKochRow(idx);
    }
    kochState.currentIndex++;
    updateKochCursor();
    startReflexTimer();
  }
}

function updateKochProgressBadge() {
  const kochProgressBadge = document.getElementById('koch-progress-badge');
  const hudStats = document.getElementById('koch-hud-stats');
  const hudStageTag = document.getElementById('koch-hud-stage-tag');
  const hudModeTag = document.getElementById('koch-hud-mode-tag');

  let done, acc;
  if (kochState.mode === 'challenge') {
    const runStart = kochState.runStartIndex || 0;
    const runResults = kochState.charResults.slice(runStart, kochState.currentIndex);
    done = runResults.length;
    const correct = runResults.filter(r => r && r.isCorrect).length;
    acc = done === 0 ? 100 : Math.round((correct / done) * 100);
  } else {
    done = kochState.currentIndex;
    const correct = kochState.charResults.filter(r => r && r.isCorrect).length;
    acc = done === 0 ? 100 : Math.round((correct / done) * 100);
  }
  const total = kochState.targetChars.length;

  if (hudStageTag && window.kochManager) {
    const curLvl = window.kochManager.currentLevel;
    const seqList = (typeof KOCH_SEQUENCE !== 'undefined') ? KOCH_SEQUENCE : [];
    const charName = (curLvl === 1) ? 'K, M' : (seqList[curLvl] || curLvl);
    hudStageTag.innerHTML = `<i class="mdi mdi-bullseye-arrow"></i> 第 ${curLvl} 關 (${charName})`;
  }

  if (hudModeTag) {
    if (kochState.mode === 'quick') {
      hudModeTag.innerHTML = '<i class="mdi mdi-check-circle"></i> 基礎練習模式';
      hudModeTag.style.color = '#00e676';
    } else if (kochState.mode === 'standard') {
      hudModeTag.innerHTML = '<i class="mdi mdi-trophy"></i> 正規考核模式';
      hudModeTag.style.color = 'var(--neon-blue)';
    } else if (kochState.mode === 'challenge') {
      hudModeTag.innerHTML = '<i class="mdi mdi-fire"></i> 極限挑戰模式';
      hudModeTag.style.color = '#ff9100';
    }
  }

  if (kochState.mode === 'quick') {
    const txt = `進度: ${done}/${total} · 正確率: ${acc}%`;
    if (kochProgressBadge) {
      kochProgressBadge.textContent = txt;
      kochProgressBadge.style.color = 'var(--neon-blue)';
    }
    if (hudStats) hudStats.textContent = txt;
  } else {
    const mm = Math.floor(kochState.timeRemaining / 60).toString().padStart(2, '0');
    const ss = (kochState.timeRemaining % 60).toString().padStart(2, '0');
    if (kochState.mode === 'challenge') {
      const resetInfo = kochState.challengeResetCount ? ` · 重置: ${kochState.challengeResetCount}次` : '';
      const txt = `剩餘: ${mm}:${ss} · 題數: ${done} · 正確率: ${acc}%${resetInfo}`;
      if (kochProgressBadge) {
        kochProgressBadge.textContent = txt;
        kochProgressBadge.style.color = '#ffb703';
      }
      if (hudStats) hudStats.textContent = txt;
    } else {
      const txt = `剩餘: ${mm}:${ss} · 題數: ${done} · 正確率: ${acc}%`;
      if (kochProgressBadge) {
        kochProgressBadge.textContent = txt;
        kochProgressBadge.style.color = 'var(--neon-blue)';
      }
      if (hudStats) hudStats.textContent = txt;
    }
  }
}

function stopKochDrill() {
  if (!kochState.running) return;
  finishKochDrillSession(true);
}

function startKochDrill() {
  const kochManager = window.kochManager;
  const engine = window.engine;
  if (!kochManager || !engine) return;

  clearKochTimers();

  const kochScorecard = document.getElementById('koch-scorecard');
  const kochPassageContainer = document.getElementById('koch-passage-container');
  const kochDrillPanel = document.getElementById('koch-drill-panel');
  const kochSetupCard = document.getElementById('koch-setup-card');
  const kochHudHeader = document.getElementById('koch-hud-header');
  const evalStatus = document.getElementById('eval-status');
  const reflexContainer = document.getElementById('koch-reflex-container');
  const btnStart = document.getElementById('btn-start-koch-drill');
  const btnStop = document.getElementById('btn-stop-koch-drill');
  const btnStopPanel = document.getElementById('btn-stop-koch-panel');

  if (kochScorecard) kochScorecard.style.display = 'none';
  if (kochSetupCard) kochSetupCard.style.display = 'none';
  if (kochHudHeader) kochHudHeader.style.display = 'flex';

  kochState.currentIndex = 0;
  kochState.timeoutCount = 0;
  kochState.challengeResetCount = 0;
  kochState.runStartIndex = 0;
  kochState.isFinished = false;
  kochState.running = true;
  kochState.hasStarted = false;

  if (btnStart) {
    btnStart.innerHTML = '<span><i class="mdi mdi-restore"></i> 重新開始 <span style="font-size:0.75rem; background:#00364d; color:#fff; padding:1px 5px; border-radius:3px; margin-left:4px;">R</span></span>';
  }
  if (btnStop) {
    btnStop.innerHTML = '<span><i class="mdi mdi-stop"></i> 結束 <span style="font-size:0.75rem; background:#4a1518; color:#fff; padding:1px 5px; border-radius:3px; margin-left:4px;">Esc</span></span>';
    btnStop.style.display = 'inline-flex';
  }
  if (btnStopPanel) btnStopPanel.style.display = 'inline-flex';

  const ROW_SIZE = 12;

  if (kochState.mode === 'quick') {
    const selectedLen = document.querySelector('input[name="koch-len"]:checked');
    const len = selectedLen ? parseInt(selectedLen.value, 10) : 24;
    kochManager.drillLen = len;
    kochState.duration = 0;
    kochState.targetChars = kochManager.generateDrill(len);
    kochState.charResults = new Array(len).fill(null);
    if (reflexContainer) reflexContainer.style.display = 'none';

    if (kochPassageContainer) {
      kochPassageContainer.innerHTML = '';
      const numRows = Math.ceil(len / ROW_SIZE);
      for (let r = 0; r < numRows; r++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'passage-row row-init-fade';
        rowEl.id = 'koch-row-' + r;
        const start = r * ROW_SIZE;
        const end = Math.min(len, start + ROW_SIZE);
        for (let i = start; i < end; i++) {
          const chip = createCharChip(kochState.targetChars[i], i, engine);
          rowEl.appendChild(chip);
        }
        kochPassageContainer.appendChild(rowEl);
      }
    }
  } else {
    // Standard & Challenge Modes: Continuous 2-row rolling
    const durInput = (kochState.mode === 'challenge')
      ? document.querySelector('input[name="koch-duration-ch"]:checked')
      : document.querySelector('input[name="koch-duration"]:checked');
    const dur = durInput ? parseInt(durInput.value, 10) : 180;
    kochState.duration = dur;
    kochState.timeRemaining = dur;

    // Initial 2 full rows = 24 chars (12 + 12, no blanks!)
    const initialCount = ROW_SIZE * 2;
    kochState.targetChars = kochManager.generateDrill(initialCount);
    kochState.charResults = new Array(initialCount).fill(null);

    if (reflexContainer) reflexContainer.style.display = 'block';

    if (kochPassageContainer) {
      kochPassageContainer.innerHTML = '';
      for (let r = 0; r < 2; r++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'passage-row row-init-fade';
        rowEl.id = 'koch-row-' + r;
        for (let c = 0; c < ROW_SIZE; c++) {
          const idx = r * ROW_SIZE + c;
          const chip = createCharChip(kochState.targetChars[idx], idx, engine);
          rowEl.appendChild(chip);
        }
        kochPassageContainer.appendChild(rowEl);
      }
    }

    // 倒數與反射限時均在發報第 1 個字母時才啟動，避免未就緒即超時
    kochState.timerId = null;
  }

  if (kochDrillPanel) kochDrillPanel.style.display = 'block';
  updateKochProgressBadge();
  updateKochCursor();
  clearReflexTimer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const mainContainer = document.getElementById('main-container');
  if (mainContainer) {
    if (typeof mainContainer.scrollTo === 'function') {
      mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      mainContainer.scrollTop = 0;
    }
  }

  if (evalStatus) {
    if (kochState.mode === 'challenge') {
      evalStatus.innerHTML = '<i class="mdi mdi-fire"></i> 準備就緒！發報第 1 個字母開始計時 · 失誤重置 · 按 Esc 結束';
      evalStatus.style.color = '#ff9100';
    } else if (kochState.mode === 'standard') {
      evalStatus.innerHTML = '<i class="mdi mdi-trophy"></i> 準備就緒！發報第 1 個字母開始計時 · 反射限時 2.0s · 按 Esc 結束';
      evalStatus.style.color = '#00e5ff';
    } else {
      evalStatus.innerHTML = '<i class="mdi mdi-check-circle"></i> 科赫闖關進行中...請依序發報！';
      evalStatus.style.color = '#00e676';
    }
  }
}

function updateKochCursor() {
  const engine = window.engine;
  const idx = kochState.currentIndex;
  const total = kochState.targetChars.length;

  const kochFbTarget = document.getElementById('koch-fb-target');
  const kochFbInput = document.getElementById('koch-fb-input');
  const kochFbResult = document.getElementById('koch-fb-result');

  document.querySelectorAll('#koch-passage-container .state-current').forEach(c => {
    c.classList.remove('state-current');
  });

  const curChip = document.getElementById('koch-char-chip-' + idx);
  if (curChip) {
    curChip.classList.add('state-current');
  }

  if (idx < total) {
    const target = kochState.targetChars[idx];
    const hudChar = document.getElementById('hud-char-target');
    const hudSeq = document.getElementById('hud-seq-target');
    if (hudChar && target) {
      hudChar.textContent = target;
    }
    if (hudSeq && target) {
      hudSeq.textContent = kochState.showHints ? (engine ? (engine.getSequenceForLetter(target) || '') : '') : '';
    }

    if (kochFbTarget) {
      kochFbTarget.textContent = kochState.showHints
        ? `${target} (${engine ? (engine.getSequenceForLetter(target) || '') : ''})`
        : target;
    }
    if (kochFbInput) kochFbInput.textContent = '—';
    if (kochFbResult) {
      kochFbResult.textContent = '等待發報...';
      kochFbResult.style.color = '#aaa';
    }

    updateKochProgressBadge();
  }
}

function finalizeLetterKochMode(res) {
  const engine = window.engine;
  if (!kochState.running || kochState.isFinished) return;
  if (!kochState.hasStarted) {
    startKochSessionTiming();
  }
  let idx = kochState.currentIndex;
  if (idx >= kochState.targetChars.length) return;

  clearReflexTimer();

  const target = kochState.targetChars[idx];
  const kochFbInput = document.getElementById('koch-fb-input');
  const kochFbResult = document.getElementById('koch-fb-result');
  const evalStatus = document.getElementById('eval-status');

  if (kochFbInput) kochFbInput.textContent = `${res.letter || '?'} (${res.sequence})`;
  const isMatch = res.isValid && (res.letter === target);

  const chip = document.getElementById('koch-char-chip-' + idx);
  if (chip) {
    chip.classList.remove('state-current');
    chip.classList.add(isMatch ? 'state-correct' : 'state-wrong');
  }

  kochState.charResults[idx] = {
    char: target,
    isCorrect: isMatch,
    input: res.letter,
    seq: res.sequence
  };

  const runStart = (kochState.mode === 'challenge') ? (kochState.runStartIndex || 0) : 0;
  const runResults = kochState.charResults.slice(runStart, idx + 1);
  const runDone = runResults.length;
  const runCorrect = runResults.filter(r => r && r.isCorrect).length;
  const runAcc = Math.round((runCorrect / runDone) * 100);

  if (isMatch) {
    if (kochFbResult) {
      kochFbResult.innerHTML = '<i class="mdi mdi-check-bold"></i> 正確！';
      kochFbResult.style.color = '#00e676';
    }
    if (evalStatus) {
      evalStatus.textContent = `字母 [${res.letter}] 正確！`;
      evalStatus.style.color = '#00e676';
    }
    if (typeof highlightPath === 'function') highlightPath(res.sequence, true, engine);
  } else {
    if (kochFbResult) {
      kochFbResult.innerHTML = `<i class="mdi mdi-close-thick"></i> 失誤 (目標: ${target})`;
      kochFbResult.style.color = '#ff5252';
    }
    const tSeq = engine ? (engine.getSequenceForLetter(target) || '') : '';
    if (kochState.mode === 'challenge') {
      if (runAcc < 90) {
        kochState.timeRemaining = kochState.duration;
        kochState.challengeResetCount = (kochState.challengeResetCount || 0) + 1;
        kochState.runStartIndex = idx + 1; // 從下一點開始重新計算正確率！
        flashTimerReset();
        if (evalStatus) {
          evalStatus.innerHTML = `<i class="mdi mdi-close-thick"></i> 正確率跌破防線（${runAcc}% < 90%）！挑戰計時重置為 ${formatTime(kochState.duration)}，由下一題重新起算！`;
          evalStatus.style.color = '#ff5252';
        }
      } else {
        if (evalStatus) {
          evalStatus.innerHTML = `<i class="mdi mdi-alert"></i> 失誤（目標是 ${target} ${tSeq}）：當前正確率 ${runAcc}% 仍守住 90% 防線，請繼續！`;
          evalStatus.style.color = '#ffb703';
        }
      }
    } else {
      if (evalStatus) {
        evalStatus.textContent = `失誤：目標是 ${target} (${tSeq})`;
        evalStatus.style.color = '#ff5252';
      }
    }
  }

  const ROW_SIZE = 12;
  if (kochState.mode === 'quick') {
    kochState.currentIndex++;
    if (kochState.currentIndex >= kochState.targetChars.length) {
      finishKochDrillSession();
    } else {
      updateKochCursor();
    }
  } else {
    if ((idx + 1) % ROW_SIZE === 0) {
      rollKochRow(idx);
    }
    kochState.currentIndex++;
    updateKochCursor();
    startReflexTimer();
  }
}

function finishKochDrillSession(isManualStop = false) {
  const kochManager = window.kochManager;
  const engine = window.engine;
  clearKochTimers();

  kochState.isFinished = true;
  kochState.running = false;
  kochState.hasStarted = false;

  const btnStart = document.getElementById('btn-start-koch-drill');
  const btnStop = document.getElementById('btn-stop-koch-drill');
  const btnStopPanel = document.getElementById('btn-stop-koch-panel');
  const kochSetupCard = document.getElementById('koch-setup-card');
  const kochHudHeader = document.getElementById('koch-hud-header');

  if (kochSetupCard) kochSetupCard.style.display = 'block';
  if (kochHudHeader) kochHudHeader.style.display = 'none';

  if (btnStart) {
    btnStart.innerHTML = '<span><i class="mdi mdi-play"></i> 開始闖關 <span style="font-size:0.75rem; background:#00364d; color:#fff; padding:1px 5px; border-radius:3px; margin-left:4px;">R</span></span>';
  }
  if (btnStop) btnStop.style.display = 'none';
  if (btnStopPanel) btnStopPanel.style.display = 'none';

  const allAnswered = kochState.charResults.filter(r => r !== null);
  const allTotal = allAnswered.length;
  const allCorrect = allAnswered.filter(r => r && r.isCorrect).length;

  let answered, total, correct, errors, accuracy;
  if (kochState.mode === 'challenge') {
    const runStart = kochState.runStartIndex || 0;
    answered = kochState.charResults.slice(runStart).filter(r => r !== null);
    total = answered.length;
    correct = answered.filter(r => r && r.isCorrect).length;
    errors = total - correct;
    accuracy = (total === 0) ? 0 : Math.round((correct / total) * 100);
  } else {
    answered = allAnswered;
    total = answered.length;
    correct = answered.filter(r => r && r.isCorrect).length;
    errors = total - correct;
    accuracy = (total === 0) ? 0 : Math.round((correct / total) * 100);
  }

  const kochScTotal = document.getElementById('koch-sc-total');
  const kochScCorrect = document.getElementById('koch-sc-correct');
  const kochScErrors = document.getElementById('koch-sc-errors');
  const kochScTimeouts = document.getElementById('koch-sc-timeouts');
  const kochScAccuracy = document.getElementById('koch-sc-accuracy');
  const kochScTitle = document.getElementById('koch-sc-title');
  const kochScModeTag = document.getElementById('koch-sc-mode-tag');
  const kochScThresholdTag = document.getElementById('koch-sc-threshold-tag');
  const kochScorecard = document.getElementById('koch-scorecard');
  const kochScDesc = document.getElementById('koch-sc-desc');
  const btnKochNextStage = document.getElementById('btn-koch-next-stage');
  const evalStatus = document.getElementById('eval-status');

  if (kochScTotal) kochScTotal.textContent = total;
  if (kochScCorrect) kochScCorrect.textContent = correct;
  if (kochScErrors) kochScErrors.textContent = errors;
  if (kochScTimeouts) {
    kochScTimeouts.style.display = kochState.timeoutCount > 0 ? 'block' : 'none';
    kochScTimeouts.textContent = `${kochState.timeoutCount} 次超時`;
  }
  if (kochScAccuracy) {
    kochScAccuracy.textContent = accuracy + '%';
    kochScAccuracy.style.color = accuracy >= 90 ? 'var(--neon-blue)' : '#ffb703';
  }

  // Pass evaluation:
  let isPassed = false;
  if (kochState.mode === 'quick') {
    isPassed = (total >= (kochManager.drillLen || 12)) && (accuracy >= 90);
  } else if (kochState.mode === 'standard') {
    isPassed = (!isManualStop ? total >= 5 : total >= 12) && (accuracy >= 90);
  } else if (kochState.mode === 'challenge') {
    isPassed = !isManualStop ? true : (total >= 12 && accuracy >= 90);
  }

  if (isPassed) {
    const currentLvl = kochManager.currentLevel;
    const maxLvl = kochManager.maxUnlockedLevel;

    if (kochScorecard) kochScorecard.style.borderColor = (kochState.mode === 'challenge') ? 'var(--gold)' : '#00e676';

    if (kochState.mode === 'challenge') {
      if (kochScTitle) {
        kochScTitle.innerHTML = !isManualStop ? '<i class="mdi mdi-crown"></i> 極限挑戰征服 (Challenge Conquered)!' : '<i class="mdi mdi-party-popper"></i> 挑戰考核合格 (Challenge Passed)!';
        kochScTitle.style.color = 'var(--gold)';
      }
      if (kochScModeTag) {
        kochScModeTag.innerHTML = '<i class="mdi mdi-fire"></i> 極限挑戰';
        kochScModeTag.style.background = '#3b1114';
        kochScModeTag.style.color = '#ffd700';
      }
      if (kochScThresholdTag) {
        kochScThresholdTag.textContent = '防線門檻: 守住 90% 直覺反射防線';
        kochScThresholdTag.style.color = '#ffd700';
      }
    } else if (kochState.mode === 'standard') {
      if (kochScTitle) {
        kochScTitle.innerHTML = '<i class="mdi mdi-trophy"></i> 正規考核合格 (Standard Passed)!';
        kochScTitle.style.color = '#00e676';
      }
      if (kochScModeTag) {
        kochScModeTag.innerHTML = '<i class="mdi mdi-trophy"></i> 正規考核';
        kochScModeTag.style.background = '#00364d';
        kochScModeTag.style.color = '#00e5ff';
      }
      if (kochScThresholdTag) {
        kochScThresholdTag.textContent = '通關門檻: 90%';
        kochScThresholdTag.style.color = '#00e676';
      }
    } else {
      if (kochScTitle) {
        kochScTitle.innerHTML = '<i class="mdi mdi-party-popper"></i> 關卡突破 (Stage Clear)!';
        kochScTitle.style.color = '#00e676';
      }
      if (kochScModeTag) {
        kochScModeTag.innerHTML = '<i class="mdi mdi-check-circle"></i> 基礎練習';
        kochScModeTag.style.background = '#102218';
        kochScModeTag.style.color = '#00e676';
      }
      if (kochScThresholdTag) {
        kochScThresholdTag.textContent = '通關門檻: 90%';
        kochScThresholdTag.style.color = '#00e676';
      }
    }

    const resetNotice = (kochState.mode === 'challenge' && kochState.challengeResetCount > 0)
      ? `<br><span style="color:#ffb703;"><i class="mdi mdi-alert"></i> 考核期間重置計時：<strong>${kochState.challengeResetCount}</strong> 次（累計發報 ${allTotal} 題）</span>`
      : '';

    const MODE_NAMES = {
      'quick': '基礎練習',
      'standard': '正規考核',
      'challenge': '極限挑戰'
    };
    const prevClear = typeof kochManager.getStageClear === 'function' ? kochManager.getStageClear(currentLvl) : null;
    const prevHighest = prevClear ? prevClear.highest : null;
    const prevRank = { 'quick': 1, 'standard': 2, 'challenge': 3 }[prevHighest] || 0;
    const newRank = { 'quick': 1, 'standard': 2, 'challenge': 3 }[kochState.mode] || 1;

    if (typeof kochManager.recordClear === 'function') {
      kochManager.recordClear(currentLvl, kochState.mode, accuracy);
    }

    let honorNotice = '';
    if (!prevHighest) {
      honorNotice = `<br><span style="color:#ffd700;"><i class="mdi mdi-medal"></i> 通關榮譽：獲得<strong>【${MODE_NAMES[kochState.mode]}】</strong>認證！</span>`;
    } else if (newRank > prevRank) {
      honorNotice = `<br><span style="color:#ffd700;"><i class="mdi mdi-party-popper"></i> 榮譽晉升！本關由【${MODE_NAMES[prevHighest]}】升級為<strong>【${MODE_NAMES[kochState.mode]}】</strong>最高榮譽！</span>`;
    } else if (kochState.mode === prevHighest) {
      honorNotice = `<br><span style="color:#00e5ff;"><i class="mdi mdi-medal"></i> 保持<strong>【${MODE_NAMES[prevHighest]}】</strong>榮譽紀錄！</span>`;
    } else {
      honorNotice = `<br><span style="color:#889;">本關曾以含金量更高的<strong>【${MODE_NAMES[prevHighest]}】</strong>通關，紀錄予以保留。</span>`;
    }

    if (currentLvl === maxLvl && maxLvl < 35) {
      kochManager.maxUnlockedLevel++;
      kochManager.saveProgress();
      const newChar = KOCH_SEQUENCE[kochManager.maxUnlockedLevel];

      if (kochScDesc) {
        kochScDesc.innerHTML = `太棒了！正確率達到 <strong>${accuracy}%</strong>（高於 90% 通關標準）！${resetNotice}${honorNotice}<br>
          已永久在 PCB 電路板上點亮並解鎖新字元：<strong style="color:var(--gold); font-size:1.1rem;">[ ${newChar} ]</strong> (${engine ? engine.getSequenceForLetter(newChar) : ''})！`;
      }

      if (btnKochNextStage) {
        btnKochNextStage.style.display = 'inline-block';
        btnKochNextStage.innerHTML = `<span>前往第 ${kochManager.maxUnlockedLevel} 關 (解鎖 ${newChar}) <i class="mdi mdi-arrow-right"></i> <span style="font-size:0.7rem; background:#332200; color:#ffd700; padding:1px 5px; border-radius:2px; margin-left:3px;">Enter</span></span>`;
      }

      setTimeout(() => {
        const seq = engine ? engine.getSequenceForLetter(newChar) : null;
        const newNode = seq ? document.getElementById('node-' + seqToId(seq)) : null;
        const newChip = document.getElementById('num-chip-' + newChar);
        const targetEl = newNode || newChip;
        if (targetEl) {
          targetEl.classList.add('koch-just-unlocked');
          setTimeout(() => targetEl.classList.remove('koch-just-unlocked'), 2500);
        }
      }, 300);
    } else if (currentLvl < maxLvl) {
      if (kochScDesc) {
        kochScDesc.innerHTML = `考核完成！正確率達 <strong>${accuracy}%</strong>！反射神經極佳！${resetNotice}${honorNotice}`;
      }
      if (btnKochNextStage) {
        btnKochNextStage.style.display = 'inline-block';
        btnKochNextStage.innerHTML = `<span>進入下一關 <i class="mdi mdi-arrow-right"></i> <span style="font-size:0.7rem; background:#332200; color:#ffd700; padding:1px 5px; border-radius:2px; margin-left:3px;">Enter</span></span>`;
      }
    } else {
      if (kochScDesc) {
        kochScDesc.innerHTML = `<i class="mdi mdi-trophy"></i> 傳奇誕生！您已全通 36 關！整張 PCB 電路板與數字匯流排已全面通電！${resetNotice}${honorNotice}`;
      }
      if (btnKochNextStage) {
        btnKochNextStage.style.display = 'none';
      }
    }

    updateKochUI();

    if (evalStatus) {
      evalStatus.innerHTML = `<i class="mdi mdi-party-popper"></i> 關卡突破！正確率 ${accuracy}%`;
      evalStatus.style.color = '#00e676';
    }
  } else {
    if (kochScTitle) {
      kochScTitle.innerHTML = isManualStop ? '<i class="mdi mdi-clipboard-text"></i> 考核手動結算 (Drill Settled)' : '<i class="mdi mdi-alert"></i> 未達通關門檻';
      kochScTitle.style.color = '#ffb703';
    }
    if (kochScorecard) kochScorecard.style.borderColor = '#ffb703';

    const resetNotice = (kochState.mode === 'challenge' && kochState.challengeResetCount > 0)
      ? `<br><span style="color:#ffb703;"><i class="mdi mdi-alert"></i> 考核期間重置計時：<strong>${kochState.challengeResetCount}</strong> 次（累計發報 ${allTotal} 題）</span>`
      : '';

    if (kochScDesc) {
      if (total < 5) {
        kochScDesc.innerHTML = `有效題目數過少（僅完成 ${total} 題），請重新發起考核並持續發報。${resetNotice}`;
      } else {
        const reason = isManualStop ? '手動結束考核。' : '';
        kochScDesc.innerHTML = `${reason}本次正確率為 <strong>${accuracy}%</strong>，未達科赫法 <strong>90%</strong> 直覺反射標準。${resetNotice}<br>
          請放鬆心情再試一次，讓耳朵與手指自然形成直覺反射！`;
      }
    }
    if (btnKochNextStage) btnKochNextStage.style.display = 'none';

    if (evalStatus) {
      evalStatus.textContent = `未達 90% 門檻 (目前 ${accuracy}%)，請按 R 重試！`;
      evalStatus.style.color = '#ffb703';
    }
  }

  if (kochScorecard) {
    kochScorecard.style.display = 'block';
  }
  updateKochUI();
  updatePcbKochVisuals();
}

if (typeof window !== 'undefined') {
  window.startKochSessionTiming = startKochSessionTiming;
  window.renderStageMatrix = renderStageMatrix;
  window.getClearBadgeHtml = getClearBadgeHtml;
  window.selectKochStage = selectKochStage;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    kochState,
    updatePcbKochVisuals,
    updateKochUI,
    renderStageMatrix,
    getClearBadgeHtml,
    selectKochStage,
    setKochAssessmentMode,
    startKochDrill,
    stopKochDrill,
    startKochSessionTiming,
    rollKochRow,
    formatTime,
    updateKochCursor,
    finalizeLetterKochMode,
    finishKochDrillSession,
    startReflexTimer,
    kochModePauseReflex,
    clearReflexTimer,
    clearKochTimers,
    handleReflexTimeout
  };
}
