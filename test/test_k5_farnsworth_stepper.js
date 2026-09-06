/**
 * TEST SUITE: test_k5_farnsworth_stepper.js
 * 驗證 K5 智慧島 WPM 顯示與步進器在法恩斯沃斯 (Farnsworth) 模式下的接管與色彩聯動
 * 1. 啟動法恩斯沃斯時，#k5-wpm-val 顯示為青藍色 (var(--neon-blue)) 並顯示 charWpm (如 20 WPM)
 * 2. 步進按鈕 (+/-) 點擊直接調節法恩斯沃斯節奏 (charWpm)
 * 3. 關閉法恩斯沃斯時，自動切回琥珀金 (var(--gold)) 並調節基準傳輸速度 (unitT)
 * 4. 0 Emoji 規範
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('=== Running K5 Farnsworth WPM Stepper & Color Linkage Tests ===\n');

// Set up mock DOM elements
const mockElements = {};
function createMockEl(id) {
  return {
    id,
    textContent: '',
    value: '',
    title: '',
    style: {
      color: '',
      textShadow: '',
      borderColor: ''
    },
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      toggle(c, force) { if (force !== undefined) { force ? this.classes.add(c) : this.classes.delete(c); } else { this.classes.has(c) ? this.classes.delete(c) : this.classes.add(c); } },
      contains(c) { return this.classes.has(c); }
    },
    addEventListener() {}
  };
}

[
  'k5-wpm-val', 'topbar-wpm-val', 'topbar-wpm-pill',
  'k5-wpm-minus', 'k5-wpm-plus', 'k5-wing-left', 'k5-wing-right',
  'k5-pill-paddle', 'k5-pill-straight', 'k5-pill-bug', 'k5-reverse-toggle',
  'k5-mode-badge', 'param-farnsworth-wpm', 'tag-farnsworth-wpm', 'chk-farnsworth',
  'farnsworth-controls', 'tag-farnsworth-status', 'param-unit-t', 'tag-unit-t',
  'param-threshold', 'tag-threshold', 'param-gap', 'tag-gap', 'param-word-gap', 'tag-word-gap',
  'state-wpm', 'readout-wpm', 'meter-wpm-badge'
].forEach(id => {
  mockElements[id] = createMockEl(id);
});

global.document = {
  readyState: 'loading',
  addEventListener: () => {},
  getElementById: (id) => mockElements[id] || null,
  querySelectorAll: () => []
};

global.window = {
  document: global.document
};

const projectRoot = path.resolve(__dirname, '..');
global.MorseData = require(path.join(projectRoot, 'js/core/morse-data'));
global.KEY_PROFILES = global.MorseData.KEY_PROFILES;
global.MorseEngine = require(path.join(projectRoot, 'js/core/morse-engine')).MorseEngine;
global.MorseAudio = require(path.join(projectRoot, 'js/core/morse-audio')).MorseAudio;
global.IambicKeyer = require(path.join(projectRoot, 'js/core/iambic-keyer')).IambicKeyer;
global.SettingsManager = require(path.join(projectRoot, 'js/core/settings-manager')).SettingsManager;
global.KeybindingManager = require(path.join(projectRoot, 'js/core/keybinding-manager')).KeybindingManager;
global.KochManager = require(path.join(projectRoot, 'js/core/koch-manager')).KochManager;

const app = require(path.join(projectRoot, 'js/app'));
const { engine, settingsManager, updateWpmDisplays, setFarnsworthWpmFromStepper, setWpmFromStepper } = app;

// 1. Test Farnsworth Disabled (Default / Classic Gold)
console.log('1. Testing Standard Mode (Farnsworth Disabled)...');
engine.updateConfig({ farnsworthEnabled: false, unitT: 80, charWpm: 20 });
updateWpmDisplays();

assert.strictEqual(mockElements['k5-wpm-val'].textContent, '15 WPM', 'Should display base WPM 15 when Farnsworth disabled');
assert.strictEqual(mockElements['k5-wpm-val'].style.color, 'var(--gold)', 'Color must be gold when Farnsworth disabled');
assert.strictEqual(mockElements['topbar-wpm-val'].textContent, 15, 'Topbar should display base 15 WPM');
console.log('   -> Standard Mode displays 15 WPM in classic gold!');

// 2. Test Farnsworth Enabled (Cyan / charWpm)
console.log('\n2. Testing Farnsworth Enabled Mode...');
engine.updateConfig({ farnsworthEnabled: true, charWpm: 20, unitT: 80 });
updateWpmDisplays();

assert.strictEqual(mockElements['k5-wpm-val'].textContent, '20 WPM', 'Should display Farnsworth charWpm 20');
assert.strictEqual(mockElements['k5-wpm-val'].style.color, 'var(--neon-blue)', 'Color must switch to neon-blue in Farnsworth mode');
assert.ok(mockElements['k5-wpm-val'].title.includes('法恩斯沃斯'), 'Tooltip must indicate Farnsworth mode');
assert.strictEqual(mockElements['topbar-wpm-val'].textContent, 20, 'Topbar must reflect Farnsworth charWpm 20');
assert.strictEqual(mockElements['topbar-wpm-pill'].style.color, 'var(--neon-blue)', 'Topbar pill color must switch to neon-blue');
console.log('   -> Farnsworth Mode displays 20 WPM in electric cyan with tooltip!');

// 3. Test Farnsworth Stepper Takeover (+/-)
console.log('\n3. Testing Farnsworth Stepper Takeover (+/-)...');
setFarnsworthWpmFromStepper(21);
assert.strictEqual(engine.config.charWpm, 21, 'engine.config.charWpm must be updated to 21');
assert.strictEqual(mockElements['k5-wpm-val'].textContent, '21 WPM', 'k5-wpm-val text must be 21 WPM');
assert.strictEqual(mockElements['topbar-wpm-val'].textContent, 21, 'topbar-wpm-val must be 21');
assert.strictEqual(settingsManager.settings.farnsworthWpm, 21, 'settingsManager must persist 21 WPM');

setFarnsworthWpmFromStepper(19);
assert.strictEqual(engine.config.charWpm, 19, 'engine.config.charWpm must be updated to 19');
assert.strictEqual(mockElements['k5-wpm-val'].textContent, '19 WPM');
assert.strictEqual(settingsManager.settings.farnsworthWpm, 19);
console.log('   -> Stepper directly adjusts Farnsworth speed and synchronizes persistence!');

// 4. Test Switching back to Farnsworth Disabled
console.log('\n4. Testing Dynamic Switching Back to Disabled...');
engine.updateConfig({ farnsworthEnabled: false });
updateWpmDisplays();

assert.strictEqual(mockElements['k5-wpm-val'].textContent, '15 WPM');
assert.strictEqual(mockElements['k5-wpm-val'].style.color, 'var(--gold)');
assert.strictEqual(mockElements['topbar-wpm-val'].textContent, 15);
console.log('   -> Clean dynamic fallback to gold standard WPM verified!');

// 5. Zero Emoji Audit
console.log('\n5. Verifying Zero Emoji audit...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const appJsContent = fs.readFileSync(path.join(projectRoot, 'js/app.js'), 'utf8');
assert.ok(!emojiRegex.test(appJsContent), 'js/app.js must not contain any Unicode emoji');
console.log('   -> 0 emoji verified in js/app.js!');

console.log('\n====================================================');
console.log('ALL K5 FARNSWORTH STEPPER TESTS PASSED 100%!');
console.log('====================================================\n');
