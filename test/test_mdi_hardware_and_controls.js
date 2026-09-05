const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Hardware Controls & Settings MDI Icons Tests (Issue #3) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');

const targets = [
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
];

targets.forEach(({ name, content }) => {
  console.log(`Checking ${name}...`);

  // 1. Hardware switcher tabs
  assert.ok(content.includes('mdi-radiobox-marked'), `${name} must include mdi-radiobox-marked for straight key`);
  assert.ok(content.includes('mdi-tune-vertical') || content.includes('mdi-swap-horizontal'), `${name} must include MDI icon for iambic paddle`);
  assert.ok(content.includes('mdi-metronome') || content.includes('mdi-vibrate'), `${name} must include MDI icon for bug key`);
  assert.ok(!content.includes('🔘 直鍵'), `${name} must not contain emoji in straight key tab`);
  assert.ok(!content.includes('🎛️ 雙撥片'), `${name} must not contain emoji in iambic paddle tab`);
  assert.ok(!content.includes('📻 機械震報鍵'), `${name} must not contain emoji in bug key tab`);

  // 2. Straight key button
  assert.ok(content.includes('mdi-flash'), `${name} must include mdi-flash in key-trigger`);
  assert.ok(!content.includes('⚡ 按住發報'), `${name} must not contain emoji in key-trigger`);

  // 3. Text mode playback buttons
  assert.ok(content.includes('mdi-play'), `${name} must include mdi-play for play-auto`);
  assert.ok(content.includes('mdi-pause'), `${name} must include mdi-pause for pause-auto`);
  assert.ok(content.includes('mdi-stop'), `${name} must include mdi-stop for stop-auto`);
  assert.ok(content.includes('mdi-restore'), `${name} must include mdi-restore for restart-text`);
  assert.ok(!content.includes('▶ 示範播放'), `${name} must not contain emoji in play-auto`);
  assert.ok(!content.includes('⏸ 暫停'), `${name} must not contain emoji in pause-auto`);
  assert.ok(!content.includes('⏹ 停止'), `${name} must not contain emoji in stop-auto`);
  assert.ok(!content.includes('🔄 重新發報'), `${name} must not contain emoji in restart-text`);

  // 4. Settings & Storage footer
  assert.ok(content.includes('mdi-content-save'), `${name} must include mdi-content-save in settings footer`);
  assert.ok(!content.includes('💾 設定將自動保存'), `${name} must not contain emoji in storage hint`);
  assert.ok(!content.includes('🔄 重設為預設值'), `${name} must not contain emoji in factory reset button`);
});

// 5. Verify js/ui/text-mode.js
console.log('\nChecking js/ui/text-mode.js...');
const textModeJs = fs.readFileSync(path.join(projectRoot, 'js/ui/text-mode.js'), 'utf8');
assert.ok(textModeJs.includes('mdi-check-bold') || textModeJs.includes('mdi-check'), 'text-mode.js must use MDI icon for correct');
assert.ok(textModeJs.includes('mdi-close-thick') || textModeJs.includes('mdi-close'), 'text-mode.js must use MDI icon for error');
assert.ok(textModeJs.includes('mdi-pause'), 'text-mode.js must use MDI pause icon');
assert.ok(textModeJs.includes('mdi-play'), 'text-mode.js must use MDI play icon');
assert.ok(!textModeJs.includes('✅ 正確'), 'text-mode.js must not contain ✅ emoji');
assert.ok(!textModeJs.includes('❌ 錯誤'), 'text-mode.js must not contain ❌ emoji');

console.log('\n====================================================');
console.log('ALL HARDWARE & CONTROLS MDI ICON TESTS PASSED!');
console.log('====================================================\n');
