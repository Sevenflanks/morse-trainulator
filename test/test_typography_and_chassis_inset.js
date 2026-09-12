/**
 * TEST SUITE: test_typography_and_chassis_inset.js
 * 驗證排版精密化、動態數值等寬防抖 (Tabular Numbers) 與 Eurorack 模組機箱微質感
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Synchronization)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');
const rxCss = fs.readFileSync(path.join(projectRoot, 'css/rx-mode.css'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');

console.log('=== Running Typography & Eurorack Chassis Inset Tests ===\n');

// 1. 動態數值等寬表格數字 (Tabular Numbers & font-feature-settings: "tnum")
console.log('1. Verifying Tabular Numbers (tnum) in CSS and Dual-Track HTML...');
assert.ok(baseCss.includes('font-variant-numeric: tabular-nums;'), 'css/base.css must define tabular-nums');
assert.ok(baseCss.includes('font-feature-settings: "tnum" 1;'), 'css/base.css must define tnum feature setting');
assert.ok(protoHtml.includes('font-variant-numeric: tabular-nums;'), 'prototype_morse_card.html must define tabular-nums');
assert.ok(protoHtml.includes('font-feature-settings: "tnum" 1;'), 'prototype_morse_card.html must define tnum feature setting');

// Check key dynamic number selectors are covered by tabular numbers
const criticalNumberSelectors = [
  '#topbar-wpm-val',
  '.wpm-badge',
  '.state-val',
  '.telem-value',
  '.rx-score-val',
  '#rx-sc-latency',
  '#rx-sc-median-latency',
  '#rx-sc-low25-latency',
  '#readout-time',
  '#gap-time-readout',
  '#telem-ratio-text'
];

criticalNumberSelectors.forEach(sel => {
  assert.ok(baseCss.includes(sel), `css/base.css must include ${sel} in tabular-nums rule`);
  assert.ok(protoHtml.includes(sel), `prototype_morse_card.html must include ${sel} in tabular-nums rule`);
});
console.log('   -> Tabular numbers rule strictly defined across dual tracks!');

// 2. 軍規電信銘刻微標籤風格 (Radio Nomenclature Micro-labels)
console.log('\n2. Verifying Radio Nomenclature Micro-labels...');
assert.ok(baseCss.includes('text-transform: uppercase;'), 'base.css must define uppercase for micro-labels');
assert.ok(baseCss.includes('letter-spacing: 1.5px;'), 'base.css must define expanded 1.5px letter spacing');
assert.ok(protoHtml.includes('text-transform: uppercase;'), 'prototype_morse_card.html must define uppercase for micro-labels');
assert.ok(protoHtml.includes('letter-spacing: 1.5px;'), 'prototype_morse_card.html must define expanded 1.5px letter spacing');

const microLabelClasses = ['.radio-label', '.telem-label', '.state-label', '.meter-track-header'];
microLabelClasses.forEach(cls => {
  assert.ok(baseCss.includes(cls), `base.css must define radio nomenclature style for ${cls}`);
  assert.ok(protoHtml.includes(cls), `prototype_morse_card.html must define radio nomenclature style for ${cls}`);
});
console.log('   -> Radio nomenclature micro-label typography verified!');

// 3. Eurorack 機架凹槽與雙層倒角微立體陰影 (Eurorack Chassis Inset & Beveling)
console.log('\n3. Verifying Eurorack Chassis Inset & Beveling...');
assert.ok(baseCss.includes('border-top-color: #3d4660;'), 'base.css .panel must have subtle top highlight border');
assert.ok(baseCss.includes('inset 0 1px 1px rgba(255, 255, 255, 0.06)'), 'base.css .panel must have top inset bevel highlight');
assert.ok(protoHtml.includes('border-top-color: #3d4660;'), 'prototype_morse_card.html .panel must have top highlight border');
assert.ok(protoHtml.includes('inset 0 1px 1px rgba(255, 255, 255, 0.06)'), 'prototype_morse_card.html .panel must have top inset bevel highlight');

// Check RX cards chassis inset
assert.ok(rxCss.includes('.rx-cockpit-card'), 'rx-mode.css must contain .rx-cockpit-card');
assert.ok(rxCss.includes('inset 0 1px 1px rgba(255, 255, 255, 0.07)'), 'rx-cockpit-card must have top inset bevel');
assert.ok(rxCss.includes('.rx-scorecard'), 'rx-mode.css must contain .rx-scorecard');
assert.ok(rxCss.includes('inset 0 1px 1px rgba(255, 255, 255, 0.1)'), 'rx-scorecard must have inset bevel');
assert.ok(protoHtml.includes('inset 0 1px 1px rgba(255, 255, 255, 0.07)'), 'prototype_morse_card.html rx-cockpit-card must have inset bevel');
assert.ok(protoHtml.includes('inset 0 1px 1px rgba(255, 255, 255, 0.1)'), 'prototype_morse_card.html rx-scorecard must have inset bevel');
console.log('   -> Chassis inset and beveling verified!');

// 4. Eurorack 沉頭螺絲與轉角微裝飾 (Corner Rivets / Hex Screws)
console.log('\n4. Verifying Eurorack Corner Rivets...');
assert.ok(baseCss.includes('.panel::before'), 'base.css must define .panel::before rivet');
assert.ok(baseCss.includes('.panel::after'), 'base.css must define .panel::after rivet');
assert.ok(rxCss.includes('.rx-cockpit-card::before'), 'rx-mode.css must define .rx-cockpit-card::before rivet');
assert.ok(rxCss.includes('.rx-scorecard::before'), 'rx-mode.css must define .rx-scorecard::before rivet');
assert.ok(rxCss.includes('.rx-analytics-panel::before'), 'rx-mode.css must define .rx-analytics-panel::before rivet');

assert.ok(protoHtml.includes('.panel::before'), 'prototype_morse_card.html must define .panel::before rivet');
assert.ok(protoHtml.includes('.rx-cockpit-card::before'), 'prototype_morse_card.html must define .rx-cockpit-card::before rivet');
assert.ok(protoHtml.includes('.rx-scorecard::before'), 'prototype_morse_card.html must define .rx-scorecard::before rivet');
assert.ok(protoHtml.includes('.rx-analytics-panel::before'), 'prototype_morse_card.html must define .rx-analytics-panel::before rivet');
console.log('   -> Eurorack corner rivets verified across both tracks!');

// 5. ADR 0001: 嚴格零 Emoji 檢查
console.log('\n5. Verifying ADR 0001 (Zero Unicode Emoji)...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
assert.ok(!emojiRegex.test(baseCss), 'css/base.css must contain 0 Unicode emojis');
assert.ok(!emojiRegex.test(rxCss), 'css/rx-mode.css must contain 0 Unicode emojis');
console.log('   -> ADR 0001 Zero-Emoji verified!');

console.log('\n====================================================');
console.log('ALL TYPOGRAPHY & CHASSIS INSET TESTS PASSED!');
console.log('====================================================');
