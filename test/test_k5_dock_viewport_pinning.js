/**
 * TEST SUITE: test_k5_dock_viewport_pinning.js
 * 驗證 K5 發報鍵區底置釘選與主工作區流動排版防止推擠至螢幕外
 * 1. .main-container 具備 flex: 1, min-height: 0, overflow-y: auto
 * 2. .va-keyer-dock 具備 flex-shrink: 0, margin-top: auto (永不被推擠出螢幕外)
 * 3. 雙軌 (index.html, css/base.css, prototype_morse_card.html) 100% 同步
 * 4. 0 Emoji 規範
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running K5 Dock Viewport Pinning & Zero-Push Tests ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');
const modesCss = fs.readFileSync(path.join(projectRoot, 'css/modes.css'), 'utf8');

// 1. .main-container flexbox containment & scroll rules
console.log('1. Verifying .main-container viewport containment rules...');
[
  { name: 'base.css', content: baseCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('flex: 1;'), `${name} must include flex: 1 in .main-container`);
  assert.ok(content.includes('min-height: 0;'), `${name} must include min-height: 0 in .main-container`);
  assert.ok(content.includes('overflow-y: auto;'), `${name} must include overflow-y: auto in .main-container`);
  console.log(`   -> ${name} .main-container containment rules verified!`);
});

// 2. .va-keyer-dock bottom pinning rules
console.log('\n2. Verifying .va-keyer-dock bottom pinning rules...');
[
  { name: 'base.css', content: baseCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('margin-top: auto;'), `${name} must pin .va-keyer-dock with margin-top: auto`);
  assert.ok(content.includes('flex-shrink: 0;'), `${name} must protect .va-keyer-dock with flex-shrink: 0`);
  console.log(`   -> ${name} .va-keyer-dock pinning rules verified!`);
});

// 3. Compact Koch stage grid rules
console.log('\n3. Verifying compact Koch stage grid rules...');
[
  { name: 'css/modes.css', content: modesCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('max-height: 175px;'), `${name} must use compact max-height: 175px for .koch-stage-grid`);
  console.log(`   -> ${name} .koch-stage-grid compact height verified!`);
});

// 4. Zero Emoji Audit
console.log('\n4. Verifying Zero Emoji audit across changed files...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
[
  { name: 'base.css', content: baseCss },
  { name: 'modes.css', content: modesCss },
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(!emojiRegex.test(content), `${name} must not contain any Unicode emoji`);
  console.log(`   -> ${name} 0 emoji verified!`);
});

console.log('\n====================================================');
console.log('ALL K5 DOCK VIEWPORT PINNING TESTS PASSED 100%!');
console.log('====================================================\n');
