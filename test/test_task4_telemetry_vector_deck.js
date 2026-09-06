/**
 * TEST SUITE: test_task4_telemetry_vector_deck.js
 * 驗證 Task 4 (#19): 右翼任務情報甲板降噪與電信遙測向量儀整合
 * 1. 遙測向量儀 (Timing Vector Telemetry) DOM 結構
 * 2. 1:3.00 點劃比率尺、時差抖動 ±ms、Unit T 刻度儀
 * 3. 雙軌 index.html 與 prototype_morse_card.html 同步
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Task 4: Telemetry Vector Deck Tests ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');

// 1. Dual-Track Telemetry Vector Deck Elements Verification
console.log('1. Verifying Telemetry Vector Deck elements in HTML...');
const vectorElements = [
  'id="timing-vector-deck"',
  'id="telem-unit-t"',
  'id="telem-jitter"',
  'id="telem-ratio-text"',
  'id="telem-ratio-bar"',
  'class="ratio-meter-track"',
  'class="ratio-target-mark"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  vectorElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });
  console.log(`   -> ${name} Telemetry Vector Deck elements verified!`);
});

// 2. CSS Rules Verification
console.log('\n2. Verifying Telemetry Vector CSS rules...');
const requiredCss = [
  '.telemetry-grid',
  '.telem-card',
  '.telem-label',
  '.telem-value',
  '.ratio-bar-wrap',
  '.ratio-meter-track',
  '.ratio-meter-fill',
  '.ratio-target-mark'
];

requiredCss.forEach(cls => {
  assert.ok(baseCss.includes(cls), `base.css must define ${cls}`);
  assert.ok(protoHtml.includes(cls), `prototype_morse_card.html must define ${cls}`);
});
console.log('   -> Telemetry Vector CSS rules verified!');

// 3. Functional Ratio & Jitter Telemetry Math
console.log('\n3. Verifying telemetry calculation logic in meter-controller...');
const { updateTelemetryGauges } = require(path.join(projectRoot, 'js/ui/meter-controller'));
assert.strictEqual(typeof updateTelemetryGauges, 'function', 'updateTelemetryGauges must be exported');

// Mock DOM elements
const mockElements = {
  'telem-unit-t': { innerHTML: '', textContent: '' },
  'telem-jitter': { innerHTML: '', textContent: '' },
  'telem-ratio-text': { textContent: '' },
  'telem-ratio-bar': { style: {} }
};

global.document = {
  getElementById: (id) => mockElements[id] || null
};

const fakeEngine = {
  getEffectiveUnitT: () => 60,
  recentStrokes: [
    { duration: 60, units: 1, time: Date.now() },
    { duration: 180, units: 3, time: Date.now() },
    { duration: 62, units: 1, time: Date.now() },
    { duration: 178, units: 3, time: Date.now() }
  ]
};

updateTelemetryGauges(fakeEngine);
assert.ok(mockElements['telem-unit-t'].innerHTML.includes('60'), 'Unit T must be 60');
assert.strictEqual(mockElements['telem-ratio-text'].textContent, '1 : 2.93');
assert.ok(mockElements['telem-ratio-bar'].style.width, 'Ratio bar style width must be set');
console.log('   -> Telemetry calculation passed with accuracy!');

// 4. Zero Emoji Audit
console.log('\n4. Verifying Zero Emoji on Telemetry Vector Deck...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const match = content.match(/<div[^>]*id="timing-vector-deck"[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(match, `${name} must contain timing-vector-deck`);
  assert.ok(!emojiRegex.test(match[0]), `${name} timing-vector-deck has 0 emojis`);
});
console.log('   -> Zero Emoji verified on Telemetry Vector Deck!');

console.log('\n====================================================');
console.log('TASK 4 TEST SUITE PASSED 100%!');
console.log('====================================================\n');
