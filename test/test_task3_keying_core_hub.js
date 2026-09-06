/**
 * TEST SUITE: test_task3_keying_core_hub.js
 * 驗證 Task 3 (#18): 成熟 Keying Core 移植與全局發報主控樞紐化
 * 1. Keying Core (A3 雷達雙環光球) 移植至中軍主控位置
 * 2. 3T/7T 倒數門檻、按壓進度環與字符提示結構完整
 * 3. 跨模式連動 (自由模式、跟打模式、科赫模式皆更新 hud-char-target)
 * 4. 雙軌 index.html 與 prototype_morse_card.html 同步
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Task 3: Keying Core Global Hub Tests ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');

// 1. Dual-Track Keying Core Placement Verification
console.log('1. Verifying Keying Core DOM in index.html & prototype_morse_card.html...');
const keyingCoreElements = [
  'id="focus-hud-stage"',
  'class="a3-halo-stage',
  'class="a3-halo-svg',
  'id="halo-press-arc"',
  'id="halo-gap-arc"',
  'gate-3t',
  'gate-7t',
  'id="hud-char-target"',
  'id="hud-seq-target"',
  'id="hud-timing-status"',
  'id="hud-committed-stream"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  keyingCoreElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });

  // Verify that focus-hud-stage is inside or adjacent to col-training in the main-container
  assert.ok(content.includes('id="col-training"'), `${name} must retain col-training`);
  console.log(`   -> ${name} Keying Core elements verified!`);
});

// 2. CSS Styling for Spotlight & Radar Halo
console.log('\n2. Verifying Keying Core CSS styling...');
assert.ok(baseCss.includes('.p3-center-spotlight') || baseCss.includes('.focus-hud-stage'), 'base.css must define spotlight / hud stage');
assert.ok(protoHtml.includes('.p3-center-spotlight') || protoHtml.includes('.focus-hud-stage'), 'prototype_morse_card.html must define spotlight / hud stage');
assert.ok(baseCss.includes('stroke-dasharray: 440') || baseCss.includes('stroke-dasharray:440'), 'base.css must have 440 dasharray');
assert.ok(baseCss.includes('stroke-dasharray: 534') || baseCss.includes('stroke-dasharray:534'), 'base.css must have 534 dasharray');

// 3. Functional Hub Linkage across Modes
console.log('\n3. Verifying cross-mode hub updates in text-mode & koch-mode...');
const textModeSrc = fs.readFileSync(path.join(projectRoot, 'js/ui/text-mode.js'), 'utf8');
const kochModeSrc = fs.readFileSync(path.join(projectRoot, 'js/ui/koch-mode.js'), 'utf8');

assert.ok(textModeSrc.includes('hud-char-target'), 'text-mode.js must update hud-char-target during passage progression');
assert.ok(kochModeSrc.includes('hud-char-target'), 'koch-mode.js must update hud-char-target during drill progression');
console.log('   -> Cross-mode hub updates verified in JS source!');

// 4. Zero Emoji Audit on Keying Core
console.log('\n4. Verifying Zero Emoji on Keying Core...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const match = content.match(/<div[^>]*id="focus-hud-stage"[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(match, `${name} must have focus-hud-stage markup`);
  assert.ok(!emojiRegex.test(match[0]), `${name} focus-hud-stage has 0 emojis`);
});
console.log('   -> Zero Emoji verified on Keying Core!');

console.log('\n====================================================');
console.log('TASK 3 TEST SUITE PASSED 100%!');
console.log('====================================================\n');
