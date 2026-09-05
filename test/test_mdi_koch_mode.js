const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Koch Mode MDI Icons Tests (Issue #4) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const kochJs = fs.readFileSync(path.join(projectRoot, 'js/ui/koch-mode.js'), 'utf8');

const targets = [
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
];

targets.forEach(({ name, content }) => {
  console.log(`Checking HTML markup in ${name}...`);

  // 1. Stage Map Header & Legend
  assert.ok(content.includes('mdi-map-marker-path'), `${name} must include mdi-map-marker-path for stage map header`);
  assert.ok(!content.includes('🗺️'), `${name} must not contain 🗺️ emoji`);

  assert.ok(content.includes('mdi-crown'), `${name} must include mdi-crown`);
  assert.ok(content.includes('mdi-trophy'), `${name} must include mdi-trophy`);
  assert.ok(content.includes('mdi-check-circle'), `${name} must include mdi-check-circle`);
  assert.ok(content.includes('mdi-circle-outline'), `${name} must include mdi-circle-outline`);
  assert.ok(content.includes('mdi-lock'), `${name} must include mdi-lock`);
  assert.ok(content.includes('mdi-star-face'), `${name} must include mdi-star-face`);

  // Check legend doesn't contain emoji
  assert.ok(!content.includes('👑極限') && !content.includes('👑 極限'), `${name} must not contain 👑 emoji in HTML`);
  assert.ok(!content.includes('🏆正規') && !content.includes('🏆 正規'), `${name} must not contain 🏆 emoji in HTML`);
  assert.ok(!content.includes('🟢基礎') && !content.includes('🟢 基礎'), `${name} must not contain 🟢 emoji in HTML`);
  assert.ok(!content.includes('⚪未過') && !content.includes('⚪ 尚未通關'), `${name} must not contain ⚪ emoji in HTML`);
  assert.ok(!content.includes('🔒鎖定'), `${name} must not contain 🔒 emoji in HTML`);
  assert.ok(!content.includes('🌟 第 1 關') && !content.includes('🌟第 1 關'), `${name} must not contain 🌟 emoji in HTML`);

  // Check scorecard title
  assert.ok(!content.includes('🎉 關卡突破'), `${name} must not contain 🎉 in static scorecard`);
});

// 2. Checking js/ui/koch-mode.js logic and dynamic rendering
console.log('\nChecking js/ui/koch-mode.js...');
const kochMode = require('../js/ui/koch-mode.js');

// Verify getClearBadgeHtml returns MDI icons and no emoji
const badgeNone = kochMode.getClearBadgeHtml(null);
const badgeChallenge = kochMode.getClearBadgeHtml({ highest: 'challenge' });
const badgeStandard = kochMode.getClearBadgeHtml({ highest: 'standard' });
const badgeQuick = kochMode.getClearBadgeHtml({ highest: 'quick' });

assert.ok(badgeNone.includes('mdi-circle-outline'), 'badgeNone must include mdi-circle-outline');
assert.ok(!badgeNone.includes('⚪'), 'badgeNone must not contain ⚪');

assert.ok(badgeChallenge.includes('mdi-crown'), 'badgeChallenge must include mdi-crown');
assert.ok(!badgeChallenge.includes('👑'), 'badgeChallenge must not contain 👑');

assert.ok(badgeStandard.includes('mdi-trophy'), 'badgeStandard must include mdi-trophy');
assert.ok(!badgeStandard.includes('🏆'), 'badgeStandard must not contain 🏆');

assert.ok(badgeQuick.includes('mdi-check-circle'), 'badgeQuick must include mdi-check-circle');
assert.ok(!badgeQuick.includes('🟢'), 'badgeQuick must not contain 🟢');

// Verify no forbidden emojis in koch-mode.js
const forbiddenInKochJs = ['🗺️', '👑', '🏆', '🟢', '⚪', '🔒', '🌟', '⚠️', '🎉', '📋', '🎖️', '⏱️'];
forbiddenInKochJs.forEach(emoji => {
  assert.ok(!kochJs.includes(emoji), `koch-mode.js must not contain ${emoji} emoji`);
});

// Also check prototype_morse_card.html script section doesn't have these emojis in Koch functions
assert.ok(!protoHtml.includes('medalIcon = \'🔒\''), 'prototype_morse_card.html must not use 🔒 emoji for medalIcon');
assert.ok(!protoHtml.includes('medalIcon = \'👑\''), 'prototype_morse_card.html must not use 👑 emoji for medalIcon');
assert.ok(!protoHtml.includes('medalIcon = \'🏆\''), 'prototype_morse_card.html must not use 🏆 emoji for medalIcon');
assert.ok(!protoHtml.includes('medalIcon = \'🟢\''), 'prototype_morse_card.html must not use 🟢 emoji for medalIcon');

console.log('\n====================================================');
console.log('ALL KOCH MODE MDI ICON TESTS PASSED!');
console.log('====================================================\n');
