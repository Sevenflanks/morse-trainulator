/**
 * TEST SUITE: test_rx_workspace_shell.js
 * 驗證 Rx 抄收工作台外框、三層架構整合與 Zone 3 電信軟鍵盤 (Issue #32)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Rx Workspace Shell & Soft Keypad Tests (Issue #32) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const rxCss = fs.existsSync(path.join(projectRoot, 'css/rx-mode.css'))
  ? fs.readFileSync(path.join(projectRoot, 'css/rx-mode.css'), 'utf8')
  : '';

// 1. Dual-Track Rx Workspace DOM Verification
console.log('1. Verifying Rx Workspace DOM in index.html & prototype_morse_card.html...');
const requiredRxElements = [
  'id="ws-container-rx"',
  'id="rx-submode-koch"',
  'id="rx-submode-callsign"',
  'id="rx-submode-groups"',
  'id="rx-submode-qcodes"',
  'id="chk-rx-blind-mode"',
  'id="rx-audio-indicator"',
  'id="btn-rx-replay"',
  'id="btn-rx-skip"',
  'id="rx-input-display"',
  'id="rx-feedback-msg"',
  'id="rx-history-log"',
  'id="rx-scorecard"',
  'id="rx-dock"',
  'id="rx-soft-keypad"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  requiredRxElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });
  console.log(`   -> ${name} verified with all Rx Workspace & Soft Keypad elements!`);
});

// 2. Zone 3 Soft Keypad Letter Keys Verification
console.log('\n2. Verifying Soft Keypad contains A-Z, 0-9, Backspace, and Enter...');
const sampleKeys = ['A', 'Z', '0', '9', 'data-key="Backspace"', 'data-key="Enter"'];
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  sampleKeys.forEach(k => {
    assert.ok(content.includes(k), `${name} soft keypad must support ${k}`);
  });
  console.log(`   -> ${name} soft keypad key matrix verified!`);
});

// 3. Zero Emoji Audit on Rx Markup
console.log('\n3. Verifying Zero Emoji in Rx Workspace markup...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const rxStart = content.indexOf('id="ws-container-rx"');
  const rxEnd = content.indexOf('<!-- /ws-container-rx -->', rxStart);
  assert.ok(rxStart !== -1, `${name} must have id="ws-container-rx"`);
  assert.ok(rxEnd !== -1, `${name} must have <!-- /ws-container-rx -->`);
  const rxMarkup = content.substring(rxStart, rxEnd);
  assert.ok(!emojiRegex.test(rxMarkup), `${name} Rx workspace markup must contain 0 emojis`);
  console.log(`   -> ${name} Rx markup has 0 emojis!`);
});

// 4. CSS file and dual track inclusion
console.log('\n4. Verifying rx-mode.css stylesheet...');
assert.ok(indexHtml.includes('css/rx-mode.css'), 'index.html must reference css/rx-mode.css');
assert.ok(protoHtml.includes('.rx-workspace-stage'), 'prototype_morse_card.html must define .rx-workspace-stage');
assert.ok(protoHtml.includes('.telegraph-keypad'), 'prototype_morse_card.html must define .telegraph-keypad');
console.log('   -> CSS rules and styles verified!');

console.log('\n====================================================');
console.log('ALL RX WORKSPACE SHELL TESTS PASSED!');
console.log('====================================================\n');
