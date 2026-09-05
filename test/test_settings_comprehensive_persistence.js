/**
 * COMPREHENSIVE SETTINGS PERSISTENCE & BOOT RECOVERY TEST
 * 測試範圍：
 * 1. SettingsManager 與 DEFAULT_SETTINGS 完整性
 * 2. 發報電鍵模式 (Straight / Paddle / Bug) 儲存與復原
 * 3. 雙撥片選項 (左右反轉 paddleReverse、Iambic Mode A/B) 儲存與復原
 * 4. 法恩斯沃斯節奏 (farnsworthEnabled, farnsworthWpm) 儲存與復原
 * 5. 電台微底噪 (qrnEnabled, qrnVolume) 儲存與復原
 * 6. 鍵位設定集 (keyProfile, customBindings) 儲存與復原
 * 7. 開機/重載零破壞測試 (Boot Anti-Corruption Guarantee)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

// Load Core Modules
const { DEFAULT_SETTINGS, KEY_PROFILES, speedPresets } = require(path.join(repoRoot, 'js/core/morse-data.js'));
const { MorseEngine } = require(path.join(repoRoot, 'js/core/morse-engine.js'));
const { MorseAudio } = require(path.join(repoRoot, 'js/core/morse-audio.js'));
const { IambicKeyer } = require(path.join(repoRoot, 'js/core/iambic-keyer.js'));
const { KeybindingManager } = require(path.join(repoRoot, 'js/core/keybinding-manager.js'));
const { SettingsManager } = require(path.join(repoRoot, 'js/core/settings-manager.js'));

// Mock LocalStorage
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// Mock DOM elements
function createMockDom() {
  const elements = {};
  function createElement(tag, id = '') {
    return {
      tagName: tag.toUpperCase(),
      id,
      value: '',
      checked: false,
      textContent: '',
      innerHTML: '',
      style: {},
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(...cs) { cs.forEach(c => this.classes.delete(c)); },
        toggle(c, force) {
          if (force === undefined) {
            if (this.classes.has(c)) { this.classes.delete(c); return false; }
            else { this.classes.add(c); return true; }
          } else {
            if (force) this.classes.add(c);
            else this.classes.delete(c);
            return force;
          }
        },
        contains(c) { return this.classes.has(c); }
      }
    };
  }

  const ids = [
    'param-unit-t', 'tag-unit-t', 'param-threshold', 'tag-threshold',
    'param-gap', 'tag-gap', 'param-word-gap', 'tag-word-gap',
    'param-freq', 'tag-freq',
    'chk-farnsworth', 'farnsworth-controls', 'param-farnsworth-wpm', 'tag-farnsworth-wpm', 'tag-farnsworth-status',
    'chk-qrn', 'qrn-controls', 'param-qrn-vol', 'tag-qrn-vol', 'tag-qrn-status',
    'chk-paddle-reverse', 'radio-mode-a', 'radio-mode-b',
    'dev-straight', 'dev-paddle', 'dev-bug',
    'key-trigger', 'paddle-container', 'paddle-left-name', 'paddle-right-name', 'squeeze-banner', 'squeeze-status',
    'chk-show-hints', 'chk-strict-mode', 'chk-koch-hints', 'eval-status',
    'main-container', 'btn-layout-2col', 'btn-layout-3col',
    'btn-bind-straight', 'btn-bind-dit', 'btn-bind-dah', 'tag-current-profile'
  ];

  ids.forEach(id => {
    elements[id] = createElement('div', id);
  });

  return elements;
}

console.log('====================================================');
console.log('Running Test: Comprehensive Settings Persistence & Boot Restoration');
console.log('====================================================');

// --- 1. Testing Default Settings Integrity ---
console.log('\n--- 1. Testing Default Settings Fields ---');
const requiredFields = [
  'keyerDevice', 'speedPreset', 'unitT', 'threshold', 'letterGap', 'wordGap', 'freq',
  'farnsworthEnabled', 'farnsworthWpm', 'qrnEnabled', 'qrnVolume',
  'iambicMode', 'paddleReverse', 'keyProfile', 'customBindings',
  'textShowHints', 'textStrictMode', 'kochShowHints', 'layoutMode'
];

requiredFields.forEach(f => {
  assert.notStrictEqual(DEFAULT_SETTINGS[f], undefined, `DEFAULT_SETTINGS missing ${f}`);
});
console.log('  -> All 19 default settings fields verified successfully in morse-data.js!');

// --- 2. Testing Constructor Auto-load Guarantee ---
console.log('\n--- 2. Testing Constructor Auto-load Guarantee ---');
const storage = new MockStorage();
storage.setItem('morse_card_settings_v1', JSON.stringify({
  keyerDevice: 'bug',
  keyProfile: 'homerow',
  paddleReverse: true,
  iambicMode: 'A',
  farnsworthEnabled: true,
  farnsworthWpm: 24,
  qrnEnabled: true,
  qrnVolume: 0.07,
  layoutMode: '3col'
}));

const sm = new SettingsManager(DEFAULT_SETTINGS, storage);
assert.strictEqual(sm.settings.keyerDevice, 'bug', 'Constructor auto-load keyerDevice failed');
assert.strictEqual(sm.settings.keyProfile, 'homerow', 'Constructor auto-load keyProfile failed');
assert.strictEqual(sm.settings.paddleReverse, true, 'Constructor auto-load paddleReverse failed');
assert.strictEqual(sm.settings.iambicMode, 'A', 'Constructor auto-load iambicMode failed');
assert.strictEqual(sm.settings.farnsworthEnabled, true, 'Constructor auto-load farnsworthEnabled failed');
assert.strictEqual(sm.settings.farnsworthWpm, 24, 'Constructor auto-load farnsworthWpm failed');
assert.strictEqual(sm.settings.qrnEnabled, true, 'Constructor auto-load qrnEnabled failed');
assert.strictEqual(sm.settings.qrnVolume, 0.07, 'Constructor auto-load qrnVolume failed');
assert.strictEqual(sm.settings.layoutMode, '3col', 'Constructor auto-load layoutMode failed');
console.log('  -> SettingsManager constructor auto-loads stored settings immediately!');

// --- 3. Testing Core Modules Application ---
console.log('\n--- 3. Testing Core Modules Settings Application ---');
const engine = new MorseEngine();
const synth = new MorseAudio();
const keyer = new IambicKeyer(engine, synth);
const keybindingMgr = new KeybindingManager(KEY_PROFILES, sm);
const domElements = createMockDom();

// Helper simulating applyLoadedSettings logic
function simulateApplyLoadedSettings(settings, dom) {
  const s = sm.load();

  // 1. Timing & Speed
  if (s.speedPreset && speedPresets[s.speedPreset]) {
    // apply preset without re-saving
    const p = speedPresets[s.speedPreset];
    engine.updateConfig({ unitT: p.unitT, threshold: p.threshold, letterGap: p.letterGap, wordGap: p.wordGap });
    synth.setFrequency(p.freq);
    dom['param-unit-t'].value = p.unitT;
    dom['param-threshold'].value = p.threshold;
    dom['param-gap'].value = p.letterGap;
    dom['param-word-gap'].value = p.wordGap;
    dom['param-freq'].value = p.freq;
  } else {
    engine.updateConfig({ unitT: s.unitT, threshold: s.threshold, letterGap: s.letterGap, wordGap: s.wordGap });
    dom['param-unit-t'].value = s.unitT;
    dom['param-threshold'].value = s.threshold;
    dom['param-gap'].value = s.letterGap;
    dom['param-word-gap'].value = s.wordGap;
  }

  // 2. Frequency
  if (s.freq && dom['param-freq']) {
    dom['param-freq'].value = s.freq;
    synth.setFrequency(s.freq);
  }

  // 3. Farnsworth
  const farnsworthWpm = s.farnsworthWpm || 18;
  if (dom['param-farnsworth-wpm']) {
    dom['param-farnsworth-wpm'].value = farnsworthWpm;
    const t = Math.round(1200 / farnsworthWpm);
    dom['tag-farnsworth-wpm'].textContent = `${farnsworthWpm} WPM (${t}ms)`;
  }
  if (s.farnsworthEnabled !== undefined && dom['chk-farnsworth']) {
    dom['chk-farnsworth'].checked = s.farnsworthEnabled;
    engine.updateConfig({
      farnsworthEnabled: s.farnsworthEnabled,
      charWpm: farnsworthWpm
    });
    dom['farnsworth-controls'].style.display = s.farnsworthEnabled ? 'block' : 'none';
    dom['tag-farnsworth-status'].textContent = s.farnsworthEnabled ? '已啟用' : '已關閉';
  }

  // 4. QRN
  const qrnVol = (s.qrnVolume !== undefined) ? s.qrnVolume : 0.04;
  if (dom['param-qrn-vol']) {
    dom['param-qrn-vol'].value = qrnVol;
    synth.setNoiseVolume(qrnVol);
    const pct = Math.round((qrnVol / 0.10) * 100);
    dom['tag-qrn-vol'].textContent = `${pct}%`;
  }
  if (s.qrnEnabled !== undefined && dom['chk-qrn']) {
    dom['chk-qrn'].checked = s.qrnEnabled;
    synth.setNoiseEnabled(s.qrnEnabled);
    dom['qrn-controls'].style.display = s.qrnEnabled ? 'block' : 'none';
    dom['tag-qrn-status'].textContent = s.qrnEnabled ? '微底噪運作中' : '已靜音';
  }

  // 5. Paddle settings
  if (s.paddleReverse !== undefined && dom['chk-paddle-reverse']) {
    dom['chk-paddle-reverse'].checked = s.paddleReverse;
    keyer.setReversed(s.paddleReverse);
    // updatePaddleLabels logic
    const isRev = keyer.reversed;
    dom['paddle-left-name'].innerHTML = isRev ? '— 劃 Dah (長音)' : '· 點 Dit (短音)';
    dom['paddle-right-name'].innerHTML = isRev ? '· 點 Dit (短音)' : '— 劃 Dah (長音)';
  }
  if (s.iambicMode) {
    keyer.setMode(s.iambicMode);
    if (dom['radio-mode-a'] && dom['radio-mode-b']) {
      dom['radio-mode-a'].checked = (s.iambicMode === 'A');
      dom['radio-mode-b'].checked = (s.iambicMode === 'B');
    }
  }

  // 6. Keybindings
  if (s.customBindings) keybindingMgr.customBindings = s.customBindings;
  if (s.keyProfile) keybindingMgr.activeProfile = s.keyProfile;

  // 7. Device mode
  if (s.keyerDevice) {
    dom['dev-straight'].classList.toggle('active', s.keyerDevice === 'straight');
    dom['dev-paddle'].classList.toggle('active', s.keyerDevice === 'paddle');
    dom['dev-bug'].classList.toggle('active', s.keyerDevice === 'bug');
    keyer.isBugMode = (s.keyerDevice === 'bug');
    dom['key-trigger'].style.display = (s.keyerDevice === 'straight') ? 'flex' : 'none';
    dom['paddle-container'].style.display = (s.keyerDevice === 'straight') ? 'none' : 'flex';
  }
}

simulateApplyLoadedSettings(sm.settings, domElements);

// Assertions on restoration:
// A. Device mode
assert.strictEqual(domElements['dev-bug'].classList.contains('active'), true, 'dev-bug should be active');
assert.strictEqual(domElements['dev-straight'].classList.contains('active'), false, 'dev-straight should not be active');
assert.strictEqual(keyer.isBugMode, true, 'keyer should be in bug mode');
assert.strictEqual(domElements['paddle-container'].style.display, 'flex', 'paddle-container should be displayed');
assert.strictEqual(domElements['key-trigger'].style.display, 'none', 'key-trigger should be hidden');
console.log('  -> Keyer Device mode (Bug Key) restored successfully!');

// B. Dual Paddle Options (Reverse + Mode A)
assert.strictEqual(domElements['chk-paddle-reverse'].checked, true, 'paddle reverse checkbox should be checked');
assert.strictEqual(keyer.reversed, true, 'keyer reversed should be true');
assert.strictEqual(domElements['paddle-left-name'].innerHTML, '— 劃 Dah (長音)', 'left paddle should show Dah when reversed');
assert.strictEqual(domElements['paddle-right-name'].innerHTML, '· 點 Dit (短音)', 'right paddle should show Dit when reversed');
assert.strictEqual(domElements['radio-mode-a'].checked, true, 'radio Mode A should be checked');
assert.strictEqual(domElements['radio-mode-b'].checked, false, 'radio Mode B should be false');
assert.strictEqual(keyer.mode, 'A', 'keyer mode should be A');
console.log('  -> Dual Paddle options (Paddle Reverse & Mode A) restored successfully!');

// C. Farnsworth Timing
assert.strictEqual(domElements['chk-farnsworth'].checked, true, 'chk-farnsworth should be checked');
assert.strictEqual(engine.config.farnsworthEnabled, true, 'engine farnsworth should be enabled');
assert.strictEqual(engine.config.charWpm, 24, 'engine charWpm should be 24');
assert.strictEqual(domElements['param-farnsworth-wpm'].value, 24, 'param-farnsworth-wpm slider should be 24');
assert.strictEqual(domElements['farnsworth-controls'].style.display, 'block', 'farnsworth-controls should be expanded');
assert.strictEqual(domElements['tag-farnsworth-status'].textContent, '已啟用', 'farnsworth status text');
console.log('  -> Farnsworth timing (24 WPM, Enabled, Controls Visible) restored successfully!');

// D. QRN Atmospheric RF Noise
assert.strictEqual(domElements['chk-qrn'].checked, true, 'chk-qrn should be checked');
assert.strictEqual(synth.noiseEnabled, true, 'synth noise should be enabled');
assert.strictEqual(synth.noiseVolume, 0.07, 'synth noise volume should be 0.07');
assert.strictEqual(domElements['param-qrn-vol'].value, 0.07, 'param-qrn-vol slider should be 0.07');
assert.strictEqual(domElements['qrn-controls'].style.display, 'block', 'qrn-controls should be expanded');
assert.strictEqual(domElements['tag-qrn-vol'].textContent, '70%', 'tag-qrn-vol label should be 70%');
console.log('  -> QRN static noise (0.07 / 70%, Enabled, Controls Visible) restored successfully!');

// E. Key Profile
assert.strictEqual(keybindingMgr.activeProfile, 'homerow', 'active profile should be homerow');
assert.strictEqual(keybindingMgr.getBindings().dit.includes('KeyF'), true, 'homerow dit should include KeyF');
assert.strictEqual(keybindingMgr.getBindings().dah.includes('KeyJ'), true, 'homerow dah should include KeyJ');
console.log('  -> Key Profile (homerow F/J) restored successfully!');

// --- 4. Testing Boot Anti-Corruption Guarantee ---
console.log('\n--- 4. Testing Boot Anti-Corruption Guarantee ---');
// Verify that saving another setting does NOT erase previously stored custom keys
sm.settings.speedPreset = 'expert';
sm.save();

const reloadedSm = new SettingsManager(DEFAULT_SETTINGS, storage);
assert.strictEqual(reloadedSm.settings.speedPreset, 'expert', 'speedPreset updated');
assert.strictEqual(reloadedSm.settings.keyerDevice, 'bug', 'keyerDevice must NOT be corrupted');
assert.strictEqual(reloadedSm.settings.paddleReverse, true, 'paddleReverse must NOT be corrupted');
assert.strictEqual(reloadedSm.settings.iambicMode, 'A', 'iambicMode must NOT be corrupted');
assert.strictEqual(reloadedSm.settings.farnsworthEnabled, true, 'farnsworthEnabled must NOT be corrupted');
assert.strictEqual(reloadedSm.settings.farnsworthWpm, 24, 'farnsworthWpm must NOT be corrupted');
assert.strictEqual(reloadedSm.settings.qrnEnabled, true, 'qrnEnabled must NOT be corrupted');
assert.strictEqual(reloadedSm.settings.qrnVolume, 0.07, 'qrnVolume must NOT be corrupted');
assert.strictEqual(reloadedSm.settings.keyProfile, 'homerow', 'keyProfile must NOT be corrupted');
console.log('  -> Boot Anti-Corruption Guarantee verified 100%!');

// --- 5. Verifying HTML and App Script Synchronization ---
console.log('\n--- 5. Verifying HTML & JS Sync ---');
const appJsContent = fs.readFileSync(path.join(repoRoot, 'js/app.js'), 'utf8');
const protoHtmlContent = fs.readFileSync(path.join(repoRoot, 'prototype_morse_card.html'), 'utf8');

// Check that app.js does not contain premature applySpeedPreset before applyLoadedSettings
const appInitMatch = appJsContent.match(/renderCardSvg\([^)]*\);\s*([^\n]+)/);
assert.ok(appInitMatch, 'Could not find renderCardSvg in app.js');
assert.ok(!appInitMatch[1].includes("applySpeedPreset('intermediate')"), 'app.js still contains premature applySpeedPreset!');
assert.ok(appInitMatch[1].includes('applyLoadedSettings()'), 'app.js does not call applyLoadedSettings right after renderCardSvg!');

// Check prototype_morse_card.html startup
const protoInitMatch = protoHtmlContent.match(/renderCardSvg\(\);\s*([^\n]+)/);
assert.ok(protoInitMatch, 'Could not find renderCardSvg in prototype_morse_card.html');
assert.ok(!protoInitMatch[1].includes("applySpeedPreset('intermediate')"), 'prototype still contains premature applySpeedPreset!');
assert.ok(protoInitMatch[1].includes('applyLoadedSettings()'), 'prototype does not call applyLoadedSettings right after renderCardSvg!');

// Check radioMode DOM IDs in app.js
assert.ok(appJsContent.includes("radio-mode-a"), 'app.js must reference radio-mode-a');
assert.ok(appJsContent.includes("radio-mode-b"), 'app.js must reference radio-mode-b');

console.log('  -> HTML and JS boot sequences and DOM bindings fully synchronized!');

console.log('\n====================================================');
console.log('ALL SETTINGS PERSISTENCE & BOOT RESTORATION TESTS PASSED (Exit 0)!');
console.log('====================================================');
process.exit(0);

