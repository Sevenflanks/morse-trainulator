/**
 * TEST SUITE: test_k5_morphing_dock.js
 * 驗證 K5 雙翼變形工學座 (Ergonomic Morphing Dock) 與電鍵狀態機適配
 * Task 2 (Issue #9)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running K5 Ergonomic Morphing Dock Tests (Issue #9) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');

// 1. Dual-Track HTML Element Verification
console.log('1. Verifying K5 Dock DOM elements in index.html & prototype_morse_card.html...');
const requiredElements = [
  'id="k5-dock"',
  'class="k5-dock-container"',
  'id="k5-wing-left"',
  'id="k5-wing-right"',
  'id="k5-center-island"',
  'id="k5-pill-paddle"',
  'id="k5-pill-straight"',
  'id="k5-pill-bug"',
  'id="k5-wpm-minus"',
  'id="k5-wpm-val"',
  'id="k5-wpm-plus"',
  'id="k5-reverse-toggle"',
  'id="k5-mode-badge"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  requiredElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });
  console.log(`   -> ${name} verified with all K5 DOM elements!`);
});

// 2. CSS 96px Height & Thumb Wings Layout
console.log('\n2. Verifying K5 96px dock height and styling rules...');
assert.ok(baseCss.includes('height: 96px') || baseCss.includes('height:96px'), 'base.css must define 96px height for K5 dock');
assert.ok(baseCss.includes('.k5-dock-container'), 'base.css must define .k5-dock-container');
assert.ok(baseCss.includes('.k2-thumb-wing'), 'base.css must define .k2-thumb-wing');
assert.ok(protoHtml.includes('.k5-dock-container'), 'prototype_morse_card.html must define .k5-dock-container');
assert.ok(protoHtml.includes('.k2-thumb-wing'), 'prototype_morse_card.html must define .k2-thumb-wing');
console.log('   -> CSS rules verified for 96px zero-height-penalty dock!');

// 3. Zero Emoji Audit on K5 Dock Markup
console.log('\n3. Verifying Zero Emoji in K5 Dock markup...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const dockMatch = content.match(/<footer[^>]*id="k5-dock"[\s\S]*?<\/footer>/);
  assert.ok(dockMatch, `${name} must contain <footer id="k5-dock">...</footer>`);
  const dockHtml = dockMatch[0];
  assert.ok(!emojiRegex.test(dockHtml), `${name} K5 dock must not contain any emoji`);
  console.log(`   -> ${name} K5 dock has 0 emojis!`);
});

// 4. Keyboard Binding Integration
console.log('\n4. Verifying F/J, Space/K keyboard bindings in KeybindingManager and profiles...');
const { KEY_PROFILES } = require(path.join(projectRoot, 'js/core/morse-data.js'));
const { KeybindingManager } = require(path.join(projectRoot, 'js/core/keybinding-manager.js'));
const km = new KeybindingManager(KEY_PROFILES);
assert.ok(km.isStraight({ code: 'KeyK' }), 'KeyK must trigger Straight Key in standard profile');

km.setProfile('homerow');
assert.ok(km.isDit({ code: 'KeyF' }), 'KeyF must trigger Dit in homerow profile');
assert.ok(km.isDah({ code: 'KeyJ' }), 'KeyJ must trigger Dah in homerow profile');
assert.ok(km.isStraight({ code: 'KeyK' }), 'KeyK must trigger Straight Key in homerow profile');
console.log('   -> KeybindingManager keyboard mappings verified!');

// 5. IambicKeyer Device and Reverse Logic
console.log('\n5. Verifying IambicKeyer device and reverse state machine...');
const { IambicKeyer } = require(path.join(projectRoot, 'js/core/iambic-keyer.js'));
const { MorseEngine } = require(path.join(projectRoot, 'js/core/morse-engine.js'));
const engine = new MorseEngine({ unitT: 80 });
const synth = { start: () => {}, stop: () => {}, setFrequency: () => {} };
const keyer = new IambicKeyer(engine, synth);

// Paddle normal
keyer.setReversed(false);
keyer.leftPressed = true;
keyer.updateLogicalContacts();
assert.strictEqual(keyer.ditPressed, true, 'Normal: left is Dit');
assert.strictEqual(keyer.dahPressed, false, 'Normal: left is not Dah');

// Paddle reversed
keyer.setReversed(true);
assert.strictEqual(keyer.ditPressed, false, 'Reversed: left is not Dit');
assert.strictEqual(keyer.dahPressed, true, 'Reversed: left is Dah');

console.log('   -> IambicKeyer state machine verified!');

console.log('\n====================================================');
console.log('ALL K5 ERGONOMIC MORPHING DOCK TESTS PASSED!');
console.log('====================================================\n');
