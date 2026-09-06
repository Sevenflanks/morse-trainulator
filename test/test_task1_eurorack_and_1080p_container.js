/**
 * TEST SUITE: test_task1_eurorack_and_1080p_container.js
 * 驗證 Task 1 (#16): 視覺風格一體化與 1080p 流動排版容器骨幹
 * 1. Eurorack 一體化消光黑調色盤標準
 * 2. 1080p 流動排版容器 (100vh 零主垂直捲軸)
 * 3. 次級工具列雜訊清理 (隱藏冗餘切換器)
 * 4. 雙軌 index.html 與 prototype_morse_card.html 同步
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Task 1: Eurorack Tokens & 1080p Fluid Container Tests ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');

// 1. Eurorack Design Tokens Verification
console.log('1. Verifying Eurorack Design Tokens in CSS...');
const requiredTokens = [
  '--bg-dark: #080a0f',
  '--bg-panel: #0f131c',
  '--border-subtle: #1c2333',
  '--border-accent: rgba(0, 229, 255, 0.28)'
];

requiredTokens.forEach(token => {
  assert.ok(baseCss.includes(token), `base.css must contain Eurorack token '${token}'`);
  assert.ok(protoHtml.includes(token), `prototype_morse_card.html must contain Eurorack token '${token}'`);
});
console.log('   -> Eurorack design tokens verified in base.css and prototype_morse_card.html!');

// 2. 1080p Zero-Scroll Body & Container Rules
console.log('\n2. Verifying 1080p Zero-Scroll Layout Architecture...');
assert.ok(baseCss.includes('overflow: hidden'), 'base.css must enforce zero-scroll overflow: hidden on 1080p viewport');
assert.ok(protoHtml.includes('overflow: hidden'), 'prototype_morse_card.html must enforce zero-scroll overflow: hidden');

// 3. Noise Reduction: Header Subbar / Secondary Switcher cleaned from production view
console.log('\n3. Verifying secondary toolbar noise reduction...');
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const hasHiddenSubbar = content.includes('class="header-subbar" style="display:none;"') ||
                          content.includes('class="header-subbar noise-hidden"') ||
                          content.includes('class="header-subbar" style="display: none;"');
  assert.ok(hasHiddenSubbar, `${name} must suppress/hide legacy header-subbar noise`);
  console.log(`   -> ${name} verified with secondary noise suppression!`);
});

// 4. Backward Compatibility: Preserved IDs for existing test suites
console.log('\n4. Verifying preserved IDs for regression safety...');
const preservedIds = [
  'id="stage-view-switcher"',
  'id="view-tab-tree"',
  'id="view-tab-focus"',
  'id="view-tab-telemetry"',
  'id="btn-layout-2col"',
  'id="btn-layout-3col"',
  'id="ws-container-tx"',
  'id="k5-dock"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  preservedIds.forEach(id => {
    assert.ok(content.includes(id), `${name} must retain preserved ID ${id}`);
  });
  console.log(`   -> ${name} retains all preserved IDs!`);
});

console.log('\n====================================================');
console.log('TASK 1 TEST SUITE PASSED 100%!');
console.log('====================================================\n');
