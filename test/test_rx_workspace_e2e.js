/**
 * TEST SUITE: test_rx_workspace_e2e.js
 * 驗證 Rx 抄收全系統端到端整合、零 Emoji 審查與雙軌 100% 同步 (Issue #34, Parent #29)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Rx Workspace Full E2E & Zero-Emoji Audit (Issue #34) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const rxCss = fs.readFileSync(path.join(projectRoot, 'css/rx-mode.css'), 'utf8');
const rxJs = fs.readFileSync(path.join(projectRoot, 'js/ui/rx-mode.js'), 'utf8');

// 1. Dual-Track DOM Structure Verification
console.log('1. Verifying Dual-Track Rx Workspace DOM in index.html & prototype_morse_card.html...');
const requiredElements = [
  'id="ws-container-rx"',
  'class="rx-workspace-stage"',
  'class="rx-mode-nav"',
  'id="rx-submode-koch"',
  'id="rx-submode-callsign"',
  'id="rx-submode-groups"',
  'id="rx-submode-qcodes"',
  'class="rx-cockpit-card"',
  'id="rx-progress-badge"',
  'id="rx-wpm-badge"',
  'id="chk-rx-auto-advance"',
  'id="chk-rx-blind-mode"',
  'id="rx-visual-cue"',
  'id="rx-audio-indicator"',
  'id="rx-audio-status-text"',
  'id="btn-rx-start"',
  'id="btn-rx-stop"',
  'id="btn-rx-replay"',
  'id="btn-rx-skip"',
  'id="btn-rx-next"',
  'id="btn-rx-restart"',
  'id="rx-koch-stage-bar"',
  'id="rx-koch-stage-badge"',
  'id="rx-koch-stage-select"',
  'id="rx-koch-target-info"',
  'id="rx-koch-target-char"',
  'id="rx-koch-pool-chips"',
  'id="btn-rx-toggle-matrix"',
  'id="rx-koch-matrix-panel"',
  'id="rx-koch-matrix-grid"',
  'id="btn-rx-stage-advance"',
  'id="rx-input-display"',
  'id="rx-input-buffer"',
  'class="rx-cursor"',
  'id="rx-feedback-msg"',
  'id="rx-history-log"',
  'id="rx-scorecard"',
  'id="rx-sc-mode-tag"',
  'id="rx-sc-accuracy"',
  'id="rx-sc-wpm"',
  'id="rx-sc-latency"',
  'id="rx-sc-total"',
  'id="rx-sc-confusion-box"',
  'id="rx-sc-confusion-list"',
  'id="btn-rx-retry-errors"',
  'id="btn-rx-next-round"',
  'id="rx-dock"',
  'id="rx-soft-keypad"',
  'id="ribbon-blind-shield"',
  'class="blind-shield-badge"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  requiredElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });
  assert.ok(content.includes('id="chk-rx-auto-advance" class="switch-input switch-gold" checked'), `${name} must have #chk-rx-auto-advance checked by default`);
  console.log(`   -> ${name} verified with all ${requiredElements.length} Rx DOM elements & auto-advance default!`);
});

// 2. Zone 3 Soft Keypad Complete 36-Key Alphanumeric Verification
console.log('\n2. Verifying Soft Keypad contains full 0-9, A-Z, Backspace, Enter matrix...');
const expectedKeypadKeys = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
  'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
  'Z', 'X', 'C', 'V', 'B', 'N', 'M',
  'Backspace', 'Enter'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  expectedKeypadKeys.forEach(k => {
    assert.ok(content.includes(`data-key="${k}"`), `${name} soft keypad must contain data-key="${k}"`);
  });
  console.log(`   -> ${name} verified with all 38 keypad keys (0-9, A-Z, Backspace, Enter)!`);
});

// 3. CSS Stylesheet & Visual Token Verification
console.log('\n3. Verifying Rx Workspace CSS Rules across modular and standalone tracks...');
const requiredCssTokens = [
  '.rx-workspace-stage',
  '.rx-mode-nav',
  '.rx-mode-pill',
  '.rx-cockpit-card',
  '.rx-toolbar',
  '.rx-badge',
  '.rx-audio-box',
  '.rx-audio-indicator',
  '.rx-control-btn',
  '.rx-input-display',
  '.rx-history-chip',
  '.rx-scorecard',
  '.rx-dock',
  '.telegraph-keypad',
  '.keypad-key',
  '.pcb-blind-mode',
  '.keypad-key.active-press',
  '.rx-confusion-item',
  '.rx-koch-stage-bar',
  '.rx-pool-chip',
  '.rx-btn-advance',
  '.ribbon-blind-mode',
  '.rx-pool-preview-row',
  '#rx-koch-target-info',
  '.ribbon-blind-shield',
  '.blind-shield-badge',
  'blindShieldPulse'
];

requiredCssTokens.forEach(token => {
  assert.ok(rxCss.includes(token), `css/rx-mode.css must contain ${token}`);
  assert.ok(protoHtml.includes(token), `prototype_morse_card.html must contain ${token}`);
});
console.log(`   -> All ${requiredCssTokens.length} CSS rules verified in both css/rx-mode.css and prototype_morse_card.html!`);

// 4. Data Layer & Telegraph Generators Verification
console.log('\n4. Verifying Telegraphy Rx Dictionaries & Generators in js/core/morse-data.js...');
const morseData = require(path.join(projectRoot, 'js/core/morse-data.js'));
assert.ok(Array.isArray(morseData.CALLSIGN_PREFIXES) && morseData.CALLSIGN_PREFIXES.length >= 10, 'CALLSIGN_PREFIXES must be defined');
assert.ok(Array.isArray(morseData.CW_Q_CODES) && morseData.CW_Q_CODES.length >= 5, 'CW_Q_CODES must be defined');
assert.ok(Array.isArray(morseData.CW_ABBREVIATIONS) && morseData.CW_ABBREVIATIONS.length >= 10, 'CW_ABBREVIATIONS must be defined');

// Verify generator functions
const kochTargets = morseData.generateKochRxTargets(3, 5);
assert.strictEqual(kochTargets.length, 5, 'generateKochRxTargets should produce requested count');

for (let i = 0; i < 5; i++) {
  const cs = morseData.generateCallsign();
  assert.ok(/^[A-Z0-9]{3,7}$/.test(cs), `Generated callsign ${cs} must match international callsign pattern`);
}

for (let i = 0; i < 5; i++) {
  const grp = morseData.generateCodeGroup(5);
  assert.strictEqual(grp.length, 5, 'generateCodeGroup must return length 5');
  assert.ok(/^[A-Z0-9]{5}$/.test(grp), 'generateCodeGroup must be alphanumeric');
}

const qSig = morseData.generateQSignalOrAbbreviation();
assert.ok(qSig && qSig.text, 'generateQSignalOrAbbreviation must return object with text');
console.log('   -> Data dictionaries and generators verified!');

// 5. Zero Emoji Audit Across All Rx Artifacts
console.log('\n5. Performing Strict Zero-Emoji Audit across all Rx files and markup...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

// A. Modular files
assert.ok(!emojiRegex.test(rxCss), 'css/rx-mode.css must contain 0 Unicode emojis');
assert.ok(!emojiRegex.test(rxJs), 'js/ui/rx-mode.js must contain 0 Unicode emojis');

// B. index.html Rx markup
const indexRxStart = indexHtml.indexOf('id="ws-container-rx"');
const indexRxEnd = indexHtml.indexOf('<!-- /ws-container-rx -->', indexRxStart);
const indexRxMarkup = indexHtml.substring(indexRxStart, indexRxEnd);
assert.ok(!emojiRegex.test(indexRxMarkup), 'index.html Rx markup must contain 0 Unicode emojis');

// C. prototype_morse_card.html Rx markup and script
const protoRxStart = protoHtml.indexOf('id="ws-container-rx"');
const protoRxEnd = protoHtml.indexOf('<!-- /ws-container-rx -->', protoRxStart);
const protoRxMarkup = protoHtml.substring(protoRxStart, protoRxEnd);
assert.ok(!emojiRegex.test(protoRxMarkup), 'prototype_morse_card.html Rx markup must contain 0 Unicode emojis');

// D. Check MDI icons are used instead
const mdiCheckPatterns = [
  'mdi-school',
  'mdi-card-account-details-outline',
  'mdi-numeric',
  'mdi-radio-tower',
  'mdi-headphones',
  'mdi-play',
  'mdi-stop',
  'mdi-repeat',
  'mdi-skip-next',
  'mdi-arrow-right',
  'mdi-restart',
  'mdi-fast-forward',
  'mdi-map-marker-path',
  'mdi-chevron-down',
  'mdi-format-list-checks',
  'mdi-arrow-up-bold-circle',
  'mdi-backspace-outline',
  'mdi-check-bold',
  'mdi-trophy-outline',
  'mdi-eye-off'
];

mdiCheckPatterns.forEach(mdi => {
  assert.ok(indexRxMarkup.includes(mdi), `index.html Rx markup must use MDI icon: ${mdi}`);
  assert.ok(protoRxMarkup.includes(mdi), `prototype_morse_card.html Rx markup must use MDI icon: ${mdi}`);
});
console.log('   -> 100% Zero-Emoji verified! Professional Material Design Icons (MDI) strictly employed!');

// E. TX Mode PCB Binary Tree Protection Audit
console.log('\n   Verifying TX Mode PCB Card & Binary Tree Protection against blind mode pollution...');
assert.ok(!indexHtml.includes('class="pcb-card pcb-blind-mode"'), 'index.html PCB card must never have pcb-blind-mode statically');
assert.ok(!protoHtml.includes('class="pcb-card pcb-blind-mode"'), 'prototype_morse_card.html PCB card must never have pcb-blind-mode statically');
assert.ok(rxCss.includes('.pcb-blind-mode {') && rxCss.includes('filter: none !important;'), 'css/rx-mode.css must explicitly protect against filter pollution');
assert.ok(protoHtml.includes('.pcb-blind-mode {') && protoHtml.includes('filter: none !important;'), 'prototype_morse_card.html must explicitly protect against filter pollution');
assert.ok(rxJs.includes('onLeaveRx') && rxJs.includes('pcbCard.classList.remove(\'pcb-blind-mode\')'), 'rx-mode.js must explicitly clear pcb-blind-mode onLeaveRx');
console.log('   -> TX Mode PCB Binary Tree fully protected from blind mode style pollution!');

// 6. Top Ribbon Layout Architecture Verification
console.log('\n6. Verifying Top Ribbon layout position (Shared across workspaces)...');
assert.ok(indexHtml.indexOf('id="cockpit-top-ribbon"') < indexHtml.indexOf('id="ws-container-tx"'), 'cockpit-top-ribbon must be above ws-container-tx in index.html');
assert.ok(protoHtml.indexOf('id="cockpit-top-ribbon"') < protoHtml.indexOf('id="ws-container-tx"'), 'cockpit-top-ribbon must be above ws-container-tx in prototype_morse_card.html');
console.log('   -> Top Ribbon layout architecture verified!');

// 7. Dual-Track Bootstrapping Verification
console.log('\n7. Verifying RxMode runtime bootstrapping...');
assert.ok(indexHtml.includes('js/ui/rx-mode.js'), 'index.html must include js/ui/rx-mode.js');
assert.ok(protoHtml.includes('class RxMode'), 'prototype_morse_card.html must define class RxMode');
assert.ok(protoHtml.includes('window.rxMode = rxMode'), 'prototype_morse_card.html must instantiate rxMode');
console.log('   -> Dual-track runtime bootstrapping verified!');

console.log('\n====================================================');
console.log('ALL RX WORKSPACE E2E & ZERO-EMOJI TESTS PASSED!');
console.log('====================================================\n');
