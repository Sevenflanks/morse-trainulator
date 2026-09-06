/**
 * TEST SUITE: test_settings_drawer.js
 * 驗證滑出式設定抽屜 (Slide-up Settings Drawer) 與二級參數漸進式揭露
 * Task 5 (Issue #12)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Slide-up Settings Drawer Tests (Issue #12) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');

// 1. Dual-Track Drawer DOM Verification
console.log('1. Verifying Settings Drawer DOM elements in index.html & prototype_morse_card.html...');
const requiredDrawerElements = [
  'id="settings-drawer"',
  'id="settings-drawer-backdrop"',
  'id="btn-open-settings"',
  'id="btn-close-settings"',
  'id="drawer-settings-content"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  requiredDrawerElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });
  console.log(`   -> ${name} verified with all Drawer shell elements!`);
});

// 2. Verify Secondary Settings Reside Inside Settings Drawer
console.log('\n2. Verifying Secondary Parameters housed in Settings Drawer...');
const drawerParameters = [
  'id="param-freq"',
  'id="chk-farnsworth"',
  'id="param-farnsworth-wpm"',
  'id="chk-qrn"',
  'id="param-qrn-vol"',
  'id="radio-mode-a"',
  'id="radio-mode-b"',
  'id="btn-bind-straight"',
  'id="btn-bind-dit"',
  'id="btn-bind-dah"',
  'id="btn-factory-reset"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const startIdx = content.indexOf('id="settings-drawer"');
  assert.ok(startIdx !== -1, `${name} must contain id="settings-drawer"`);
  const endIdx = content.indexOf('<!-- /settings-drawer -->', startIdx);
  assert.ok(endIdx !== -1, `${name} must contain <!-- /settings-drawer -->`);
  const drawerContent = content.substring(startIdx, endIdx);

  drawerParameters.forEach(param => {
    assert.ok(drawerContent.includes(param), `${name} settings drawer must contain ${param}`);
  });
  console.log(`   -> ${name} settings drawer verified with all secondary parameters!`);
});

// 3. CSS Slide-up Animation & Backdrop
console.log('\n3. Verifying Drawer CSS slide-up styles & backdrop...');
assert.ok(baseCss.includes('.settings-drawer'), 'base.css must define .settings-drawer');
assert.ok(baseCss.includes('.drawer-backdrop'), 'base.css must define .drawer-backdrop');
assert.ok(protoHtml.includes('.settings-drawer'), 'prototype_morse_card.html must define .settings-drawer');
assert.ok(protoHtml.includes('.drawer-backdrop'), 'prototype_morse_card.html must define .drawer-backdrop');
console.log('   -> Drawer CSS rules verified!');

// 4. Zero Emoji Audit on Settings Drawer
console.log('\n4. Verifying Zero Emoji in Settings Drawer markup...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const startIdx = content.indexOf('id="settings-drawer"');
  const endIdx = content.indexOf('<!-- /settings-drawer -->', startIdx);
  const drawerContent = content.substring(startIdx, endIdx);
  assert.ok(!emojiRegex.test(drawerContent), `${name} settings drawer must not contain any emoji`);
  console.log(`   -> ${name} settings drawer has 0 emojis!`);
});

console.log('\n====================================================');
console.log('ALL SLIDE-UP SETTINGS DRAWER TESTS PASSED!');
console.log('====================================================\n');
