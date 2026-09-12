/**
 * TEST SUITE: test_crt_theme_filters_and_persistence.js
 * 經典電台 CRT 螢光主題濾鏡與設定持久化測試 (Issue #46)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running CRT Theme Filters & Persistence Tests (Issue #46) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');
const { SettingsManager, DEFAULT_SETTINGS } = require('../js/core/settings-manager.js');
const { CWRibbon } = require('../js/core/cw-ribbon.js');

// 1. Dual-Track CSS Theme Definitions
console.log('1. Verifying CRT Theme CSS rules & Custom Variables in Dual Tracks...');
const requiredThemes = [
  '[data-theme="cyber-brass"]',
  '[data-theme="classic-amber"]',
  '[data-theme="green-phosphor"]'
];

requiredThemes.forEach(themeSelector => {
  assert.ok(baseCss.includes(themeSelector), `base.css must define ${themeSelector}`);
  assert.ok(protoHtml.includes(themeSelector), `prototype_morse_card.html must define ${themeSelector}`);
});

// Verify amber & phosphor custom variables
const themeVarChecks = [
  { file: 'base.css', content: baseCss },
  { file: 'prototype_morse_card.html', content: protoHtml }
];

themeVarChecks.forEach(({ file, content }) => {
  assert.ok(content.includes('--gold: #ffb000'), `${file} must define warm amber gold`);
  assert.ok(content.includes('--neon-blue: #ff9800'), `${file} must define amber dit accent`);
  assert.ok(content.includes('--gold: #00e676'), `${file} must define phosphor green gold`);
  assert.ok(content.includes('--neon-blue: #00ff66'), `${file} must define phosphor bright dit accent`);
  assert.ok(content.includes('.theme-preset-grid'), `${file} must define .theme-preset-grid`);
  assert.ok(content.includes('.theme-preset-btn'), `${file} must define .theme-preset-btn`);
  assert.ok(content.includes('.dot-cyber-brass'), `${file} must define .dot-cyber-brass`);
  assert.ok(content.includes('.dot-classic-amber'), `${file} must define .dot-classic-amber`);
  assert.ok(content.includes('.dot-green-phosphor'), `${file} must define .dot-green-phosphor`);
});
console.log('   -> CRT Theme CSS rules and variable palettes verified in dual tracks!');

// 2. Dual-Track Settings Drawer Theme DOM Elements
console.log('\n2. Verifying Settings Drawer Theme Controls in Dual Tracks...');
const requiredThemeElements = [
  'id="theme-settings-box"',
  'id="tag-current-theme"',
  'id="btn-theme-cyber-brass"',
  'id="btn-theme-classic-amber"',
  'id="btn-theme-green-phosphor"',
  'data-theme="cyber-brass"',
  'data-theme="classic-amber"',
  'data-theme="green-phosphor"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  requiredThemeElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must include ${elem}`);
  });
  // Check that controls are housed within settings-drawer
  const drawerStart = content.indexOf('id="settings-drawer"');
  const drawerEnd = content.indexOf('<!-- /settings-drawer -->', drawerStart);
  assert.ok(drawerStart !== -1 && drawerEnd !== -1, `${name} must contain settings drawer block`);
  const drawerContent = content.substring(drawerStart, drawerEnd);
  assert.ok(drawerContent.includes('id="theme-settings-box"'), `${name} drawer must house theme-settings-box`);
  console.log(`   -> ${name} theme controls in drawer verified!`);
});

// 3. SettingsManager Theme Persistence
console.log('\n3. Verifying SettingsManager Theme Persistence & Defaults...');
assert.strictEqual(DEFAULT_SETTINGS.themePreset, 'cyber-brass', 'DEFAULT_SETTINGS must have themePreset: cyber-brass');

// Mock localStorage
const mockStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const sm = new SettingsManager(null, mockStorage);
assert.strictEqual(sm.settings.themePreset, 'cyber-brass', 'Default sm.settings.themePreset must be cyber-brass');

// Change theme and save
sm.settings.themePreset = 'classic-amber';
sm.save();
assert.strictEqual(mockStorage.getItem('morse_theme_preset'), 'classic-amber', 'save() must store morse_theme_preset');
const storedJson = JSON.parse(mockStorage.getItem('morse_card_settings_v1'));
assert.strictEqual(storedJson.themePreset, 'classic-amber', 'save() must store themePreset in settings JSON');

// New manager loading from storage
const smLoaded = new SettingsManager(null, mockStorage);
assert.strictEqual(smLoaded.settings.themePreset, 'classic-amber', 'load() must restore themePreset');

// Direct key precedence
mockStorage.setItem('morse_theme_preset', 'green-phosphor');
const smPhosphor = new SettingsManager(null, mockStorage);
assert.strictEqual(smPhosphor.settings.themePreset, 'green-phosphor', 'load() must sync direct morse_theme_preset');

// Factory reset
smPhosphor.reset();
assert.strictEqual(smPhosphor.settings.themePreset, 'cyber-brass', 'reset() must revert themePreset to cyber-brass');
assert.strictEqual(mockStorage.getItem('morse_theme_preset'), null, 'reset() must clear morse_theme_preset');
console.log('   -> SettingsManager theme persistence & reset verified!');

// 4. CWRibbon Dynamic Theme Colors
console.log('\n4. Verifying CWRibbon Theme Adaptation Palette...');
const ribbon = new CWRibbon('cw-ribbon');
assert.ok(typeof ribbon.getThemeColors === 'function', 'CWRibbon must have getThemeColors()');

// Simulated environment
global.document = {
  documentElement: {
    attr: 'cyber-brass',
    getAttribute(k) { return this.attr; },
    setAttribute(k, v) { this.attr = v; }
  }
};

let colors = ribbon.getThemeColors();
assert.strictEqual(colors.dit, '#00e5ff', 'Default dit color must be #00e5ff');
assert.strictEqual(colors.dah, '#ffd700', 'Default dah color must be #ffd700');

document.documentElement.setAttribute('data-theme', 'classic-amber');
colors = ribbon.getThemeColors();
assert.strictEqual(colors.dit, '#ff9800', 'Classic amber dit must be #ff9800');
assert.strictEqual(colors.dah, '#ffb000', 'Classic amber dah must be #ffb000');

document.documentElement.setAttribute('data-theme', 'green-phosphor');
colors = ribbon.getThemeColors();
assert.strictEqual(colors.dit, '#00ff66', 'Green phosphor dit must be #00ff66');
assert.strictEqual(colors.dah, '#00e676', 'Green phosphor dah must be #00e676');
console.log('   -> CWRibbon dynamic theme color adaptation verified!');

// 5. Zero-Emoji Audit (ADR 0001)
console.log('\n5. Verifying ADR 0001 Zero-Emoji Compliance on Theme Markup & Logic...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const checkedSources = [
  { name: 'base.css', content: baseCss },
  { name: 'index.html (theme block)', content: indexHtml.substring(indexHtml.indexOf('id="theme-settings-box"'), indexHtml.indexOf('id="param-freq"')) },
  { name: 'prototype_morse_card.html (theme block)', content: protoHtml.substring(protoHtml.indexOf('id="theme-settings-box"'), protoHtml.indexOf('id="param-freq"')) }
];

checkedSources.forEach(({ name, content }) => {
  assert.ok(!emojiRegex.test(content), `${name} must contain 0 unicode emojis`);
  console.log(`   -> ${name} has 0 emojis!`);
});

console.log('\n====================================================');
console.log('ALL CRT THEME FILTERS & PERSISTENCE TESTS PASSED!');
console.log('====================================================\n');
