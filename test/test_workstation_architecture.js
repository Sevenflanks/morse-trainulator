/**
 * TEST SUITE: test_workstation_architecture.js
 * 驗證三層工作台架構 (Top Bar + Main Stage + Bottom Dock + Settings Drawer)
 * 驗證工作台切換器 (Tx / Rx / QSO)、響應式佈局規範與雙軌對等性
 * Task 6 (Issue #13)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Workstation Architecture & Parity Tests (Issue #13) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');

// 1. Dual-Track Shell Structure Verification (Zone 1, Zone 2, Zone 3, Drawer)
console.log('1. Verifying Three-Zone Shell DOM Elements in index.html & prototype_morse_card.html...');
const shellRequiredElements = [
  // Zone 1: Top Bar
  'class="va-topbar"',
  'class="brand-mark"',
  'class="va-workspace-nav"',
  'id="ws-tab-tx"',
  'id="ws-tab-rx"',
  'id="ws-tab-qso"',
  'id="topbar-wpm-pill"',
  'id="topbar-wpm-val"',
  'id="btn-open-settings"',

  // Workspaces
  'id="ws-container-tx"',
  'id="ws-container-rx"',
  'id="ws-container-qso"',

  // Zone 2: Main Stage & View Switcher
  'id="stage-view-switcher"',
  'id="view-tab-tree"',
  'id="view-tab-focus"',
  'id="view-tab-telemetry"',
  'id="focus-hud-stage"',
  'class="a3-halo-svg"',
  'id="col-hardware"',
  'id="col-training"',
  'id="col-telemetry"',

  // Zone 3: Bottom Dock (K5)
  'id="k5-dock"',
  'id="k5-wing-left"',
  'id="k5-wing-right"',
  'id="k5-center-island"',
  'id="k5-pill-paddle"',
  'id="k5-pill-straight"',
  'id="k5-pill-bug"',
  'id="k5-wpm-minus"',
  'id="k5-wpm-plus"',
  'id="k5-reverse-toggle"',

  // Settings Drawer
  'id="settings-drawer-backdrop"',
  'id="settings-drawer"',
  'id="btn-close-settings"',
  'id="drawer-settings-content"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  shellRequiredElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });
  console.log(`   -> ${name} verified with all Three-Zone Shell elements!`);
});

// 2. CSS Workstation & Responsive Architecture Verification
console.log('\n2. Verifying Workstation CSS & Responsive Rules...');
const requiredCssSelectors = [
  '.va-topbar',
  '.va-workspace-nav',
  '.va-ws-btn',
  '.topbar-wpm-pill',
  '.stage-view-switcher',
  '.stage-view-btn',
  '.focus-hud-stage',
  '.a3-halo-svg',
  '.va-keyer-dock',
  '.k5-dock-container',
  '.k2-thumb-wing',
  '.settings-drawer',
  '.drawer-backdrop'
];

requiredCssSelectors.forEach(sel => {
  assert.ok(baseCss.includes(sel), `base.css must define ${sel}`);
  assert.ok(protoHtml.includes(sel), `prototype_morse_card.html must define ${sel}`);
});
console.log('   -> Workstation CSS selectors verified in base.css and prototype_morse_card.html!');

// 3. Responsive Breakpoints Verification
console.log('\n3. Verifying Responsive Breakpoints in CSS...');
assert.ok(baseCss.includes('@media (max-width: 768px)') || baseCss.includes('@media (max-width: 900px)'), 'base.css must include mobile responsive query');
assert.ok(protoHtml.includes('@media (max-width: 768px)') || protoHtml.includes('@media (max-width: 900px)'), 'prototype_morse_card.html must include mobile responsive query');
console.log('   -> Mobile responsive queries verified!');

// 4. Verification of Standard Professional Terminology (Tx, Rx, QSO, Dit, Dah)
console.log('\n4. Verifying Professional Telegraphic Terminology...');
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('Tx (發報)'), `${name} must contain 'Tx (發報)'`);
  assert.ok(content.includes('Rx (抄收)'), `${name} must contain 'Rx (抄收)'`);
  assert.ok(content.includes('QSO (通聯)'), `${name} must contain 'QSO (通聯)'`);
  console.log(`   -> ${name} verified with professional telegraphic terminology!`);
});

console.log('\n====================================================');
console.log('ALL WORKSTATION ARCHITECTURE TESTS PASSED!');
console.log('====================================================\n');
