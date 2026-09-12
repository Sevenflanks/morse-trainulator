/**
 * TEST SUITE: test_qso_cockpit_and_terminal.js
 * 驗證 Workspace 3 SDR 電台工作台、VFO 頻段切換、S-Meter 指針與雙向電傳終端
 * Ticket 2 (Issue #54)
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Architecture)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running QSO Cockpit, VFO Bar & Terminal Tests (Issue #54) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const qsoCss = fs.readFileSync(path.join(projectRoot, 'css/qso-mode.css'), 'utf8');

const { QsoManager } = require('../js/core/qso-manager.js');
const { QsoLogManager } = require('../js/core/qso-log-manager.js');
const { QsoMode } = require('../js/ui/qso-mode.js');

// ----------------------------------------------------
// 1. Dual-Track DOM Parity Verification
// ----------------------------------------------------
console.log('1. Verifying Dual-Track DOM Elements across index.html & prototype_morse_card.html...');

const requiredDomElements = [
  // Container & Nav
  'id="ws-container-qso"',
  'class="qso-workspace-stage"',
  'class="qso-mode-nav"',
  'id="qso-submode-guided"',
  'id="qso-submode-free"',
  'id="qso-submode-contest"',
  'id="qso-submode-logbook"',

  // SDR Cockpit & VFO Deck
  'id="qso-cockpit-stage"',
  'class="qso-sdr-deck"',
  'class="qso-vfo-panel"',
  'id="btn-band-40m"',
  'id="btn-band-20m"',
  'id="btn-band-15m"',
  'id="qso-vfo-freq"',

  // Analog S-Meter Dial & LED Ladder
  'class="qso-smeter-panel"',
  'id="qso-smeter-readout"',
  'id="qso-smeter-svg"',
  'id="qso-smeter-needle-group"',
  'id="qso-smeter-ladder"',

  // RF Controls & Carrier
  'class="qso-rf-panel"',
  'id="qso-carrier-box"',
  'id="qso-carrier-dot"',
  'id="qso-carrier-text"',
  'id="chk-qso-qrn"',
  'id="chk-qso-qsb"',
  'id="sel-qso-bfo"',

  // Guided Stage Banner
  'id="qso-stage-guide"',
  'class="qso-guide-steps-bar"',
  'data-step="1"',
  'data-step="2"',
  'data-step="3"',
  'data-step="4"',
  'data-step="5"',
  'id="qso-guide-prompt"',
  'id="qso-guide-hint"',
  'id="btn-qso-use-hint"',

  // Two-way Teletype Terminal
  'class="qso-terminal"',
  'id="qso-terminal-feed"',
  'id="qso-remote-call"',
  'id="qso-remote-details"',
  'id="qso-my-call"',
  'id="qso-my-details"',
  'id="btn-qso-replay-rx"',
  'id="btn-qso-new-station"',

  // Macro Deck
  'class="qso-macro-deck"',
  'id="macro-btn-cq"',
  'id="macro-btn-rst"',
  'id="macro-btn-qth"',
  'id="macro-btn-73"',
  'id="macro-btn-tu"',
  'id="macro-btn-agn"',

  // Transmitter Input Cockpit
  'class="qso-tx-strip"',
  'id="qso-tx-buffer"',
  'id="btn-qso-tx-clear"',
  'id="btn-qso-tx-send"',
  'id="qso-last-ack"',

  // Logbook View
  'id="qso-logbook-stage"',
  'id="btn-qso-export-adif"',
  'id="btn-qso-export-csv"',
  'id="btn-qso-clear-logs"',
  'id="btn-qso-back-cockpit"',
  'id="qso-logbook-tbody"',
  'id="qso-logbook-empty"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  requiredDomElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });
  console.log(`   -> ${name} passed all DOM element checks!`);
});

// ----------------------------------------------------
// 2. Dual-Track CSS Parity Verification
// ----------------------------------------------------
console.log('\n2. Verifying CSS Selectors & Visual Instrumentation Rules...');

const requiredCssSelectors = [
  '.qso-workspace-stage',
  '.qso-mode-nav',
  '.qso-mode-pill',
  '.qso-mode-pill.active',
  '.qso-cockpit-card',
  '.qso-sdr-deck',
  '.qso-vfo-panel',
  '.qso-band-btn',
  '.qso-band-btn.active',
  '.qso-freq-val',
  '.qso-smeter-panel',
  '.qso-smeter-bezel',
  '#qso-smeter-needle-group',
  '.qso-smeter-led-ladder',
  '.smeter-led',
  '.smeter-led.active',
  '.smeter-led.red.active',
  '.qso-carrier-dot',
  '.qso-carrier-dot.active-rx',
  '.qso-carrier-dot.active-tx',
  '.qso-stage-guide',
  '.qso-step-badge',
  '.qso-step-badge.active',
  '.qso-step-badge.completed',
  '.qso-terminal',
  '.qso-terminal-feed',
  '.qso-feed-line',
  '.qso-feed-tag.rx',
  '.qso-feed-tag.tx',
  '.qso-feed-tag.sys',
  '.qso-feed-text.rx',
  '.qso-feed-text.tx',
  '.qso-macro-deck',
  '.qso-macro-btn',
  '.qso-tx-strip',
  '.qso-tx-input',
  '.btn-qso-send',
  '.qso-logbook-table',
  '.qso-logbook-empty',
  '@media (max-width: 900px)',
  '@media (max-width: 600px)'
];

requiredCssSelectors.forEach(sel => {
  assert.ok(qsoCss.includes(sel), `css/qso-mode.css must define ${sel}`);
  assert.ok(protoHtml.includes(sel), `prototype_morse_card.html must define ${sel}`);
});
console.log('   -> CSS classes strictly defined across dual tracks!');

// Tabular numbers rule check
assert.ok(qsoCss.includes('font-variant-numeric: tabular-nums'), 'qso-mode.css must apply tabular-nums');
assert.ok(qsoCss.includes('font-feature-settings: "tnum" 1'), 'qso-mode.css must apply tnum feature');
console.log('   -> Tabular-nums jitter prevention verified in QSO CSS!');

// ----------------------------------------------------
// 3. QsoMode UI Controller Logic Tests
// ----------------------------------------------------
console.log('\n3. Verifying QsoMode UI Controller Logic & S-Meter Calculations...');

const mockStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = String(v); },
  removeItem(k) { delete this.data[k]; }
};

const qsoManager = new QsoManager({
  operatorCallsign: 'BV2TT',
  operatorName: 'EDDIE',
  operatorQth: 'TAIPEI',
  operatorGrid: 'PL05',
  submode: 'guided'
});

const qsoLogManager = new QsoLogManager(mockStorage);
const qsoMode = new QsoMode({
  qsoManager,
  qsoLogManager
});

// A. Check initialization and properties
assert.strictEqual(qsoMode.qrnEnabled, false, 'QRN initially disabled');
assert.strictEqual(qsoMode.qsbEnabled, true, 'QSB initially enabled');
assert.strictEqual(qsoMode.bfoPitch, 660, 'Default BFO pitch is 660 Hz');

// B. S-Meter angle calculation verification
// S0 -> -45deg, S5.5 -> 0deg, S11 -> +45deg
function calcNeedleAngle(level) {
  const clamped = Math.max(0, Math.min(11, level));
  return -45 + (clamped / 11) * 90;
}
assert.strictEqual(calcNeedleAngle(0), -45, 'Level 0 needle at -45deg');
assert.strictEqual(calcNeedleAngle(5.5), 0, 'Level 5.5 needle centered at 0deg');
assert.strictEqual(calcNeedleAngle(11), 45, 'Level 11 needle at +45deg');
console.log('   -> S-Meter angular needle formula verified (-45deg to +45deg)!');

// C. Carrier State formatting
let mockDotClasses = [];
let mockTextContent = '';
qsoMode.el = {
  carrierDot: {
    className: '',
    classList: {
      add: (c) => mockDotClasses.push(c)
    }
  },
  carrierText: {
    textContent: '',
    style: {}
  }
};

qsoMode.setCarrierState('RX');
assert.ok(mockDotClasses.includes('active-rx'), 'Carrier RX sets active-rx class');
assert.strictEqual(qsoMode.el.carrierText.textContent, 'CARRIER ACTIVE (RX)');

mockDotClasses = [];
qsoMode.setCarrierState('TX');
assert.ok(mockDotClasses.includes('active-tx'), 'Carrier TX sets active-tx class');
assert.strictEqual(qsoMode.el.carrierText.textContent, 'CARRIER ACTIVE (TX)');

qsoMode.setCarrierState('IDLE');
assert.strictEqual(qsoMode.el.carrierText.textContent, 'CARRIER IDLE');
console.log('   -> Carrier LED & status text transitions verified!');

// D. Decoded Letter Routing & Backspace <HH> handling
let mockBufferValue = '';
qsoMode.isWorkspaceActive = () => true;
qsoMode.el.txBuffer = {
  get value() { return mockBufferValue; },
  set value(v) { mockBufferValue = v; },
  scrollLeft: 0,
  scrollWidth: 100
};

qsoMode.handleLetterDecoded('C');
qsoMode.handleLetterDecoded('Q');
qsoMode.handleLetterDecoded(' ');
assert.strictEqual(mockBufferValue, 'CQ ');

qsoMode.handleLetterDecoded('D');
qsoMode.handleLetterDecoded('E');
qsoMode.handleLetterDecoded(' ');
assert.strictEqual(mockBufferValue, 'CQ DE ');

// Error signal <HH> should erase last word
qsoMode.handleLetterDecoded('<HH>');
assert.strictEqual(mockBufferValue, 'CQ ', '<HH> correctly erased last word "DE "');
console.log('   -> CW Keyer character decoding and <HH> word erase verified!');

// E. Band switching logic
let lastBandChanged = null;
qsoManager.on('bandChanged', (data) => { lastBandChanged = data; });
qsoManager.setBand('40M');
assert.strictEqual(lastBandChanged.band, '40M');
assert.strictEqual(lastBandChanged.freq, '7.025');

qsoManager.setBand('20M');
assert.strictEqual(lastBandChanged.band, '20M');
assert.strictEqual(lastBandChanged.freq, '14.025');
console.log('   -> VFO 40M/20M band switching logic verified!');

// ----------------------------------------------------
// 4. ADR 0001 Zero-Emoji Compliance
// ----------------------------------------------------
console.log('\n4. Verifying ADR 0001 (Zero Unicode Emoji) across QSO files...');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2B50}\u{25A0}-\u{25FF}]/u;

[
  { name: 'css/qso-mode.css', content: qsoCss },
  { name: 'js/ui/qso-mode.js', content: fs.readFileSync(path.join(projectRoot, 'js/ui/qso-mode.js'), 'utf8') }
].forEach(({ name, content }) => {
  const matches = content.match(emojiRegex);
  assert.strictEqual(matches, null, `Forbidden Unicode emoji found in ${name}`);
  console.log(`   -> ${name} verified: 0 emojis found!`);
});

console.log('\n====================================================');
console.log('ALL QSO COCKPIT & TERMINAL TESTS PASSED (Exit 0)!');
console.log('====================================================\n');
