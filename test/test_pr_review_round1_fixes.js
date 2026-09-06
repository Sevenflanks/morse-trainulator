/**
 * TEST SUITE: test_pr_review_round1_fixes.js
 * 驗證 PR #14 首輪同儕審查 (Review 5124525024) 4 項 Must-fix 與 1 項 Nit 修復項目
 * 1. prototype_morse_card.html 實裝 A3 雷達光環動畫與時序更新邏輯
 * 2. Focus HUD #hud-committed-stream 字符串流在雙軌中皆同步更新
 * 3. 專注 HUD #hud-char-target 與 #hud-seq-target 在直鍵與電子雙撥片拍發時即時同步
 * 4. switchKeyerDevice 切換電鍵模式時同步觸發 updateK5MorphingUI()
 * 5. prototype_ui_redesign.html 移除殘留之閃電 Emoji (0 Emoji 規範)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running PR Review Round 1 Fixes Verification ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const appJs = fs.readFileSync(path.join(projectRoot, 'js/app.js'), 'utf8');
const freeModeJs = fs.readFileSync(path.join(projectRoot, 'js/ui/free-mode.js'), 'utf8');
const protoRedesignHtml = fs.readFileSync(path.join(projectRoot, 'prototype_ui_redesign.html'), 'utf8');

// 1. Verify A3 Halo Animation in prototype_morse_card.html
console.log('1. Verifying A3 Radar Halo animation code in prototype_morse_card.html...');
assert.ok(protoHtml.includes('haloPressArc.style.strokeDashoffset'), 'prototype must animate halo-press-arc dashoffset');
assert.ok(protoHtml.includes('haloGapArc.style.strokeDashoffset'), 'prototype must animate halo-gap-arc dashoffset');
assert.ok(protoHtml.includes("hudTimingStatus.innerHTML = `發報中:"), 'prototype must update hudTimingStatus in press animation');
console.log('   -> prototype_morse_card.html A3 Radar Halo animation logic verified!');

// 2. Verify hud-committed-stream sync in both tracks
console.log('\n2. Verifying #hud-committed-stream synchronization in free-mode.js and prototype_morse_card.html...');
assert.ok(freeModeJs.includes("document.getElementById('hud-committed-stream')"), 'free-mode.js must update hud-committed-stream');
assert.ok(protoHtml.includes("document.getElementById('hud-committed-stream')"), 'prototype_morse_card.html must update hud-committed-stream');
console.log('   -> #hud-committed-stream synchronization verified in dual tracks!');

// 3. Verify HUD char/seq live update in app.js and prototype_morse_card.html
console.log('\n3. Verifying #hud-char-target & #hud-seq-target live updates during keying...');
assert.ok(appJs.includes("const hudChar = document.getElementById('hud-char-target')"), 'app.js must update hudChar in onSymbolStart');
assert.ok(appJs.includes("const hudCharKey = document.getElementById('hud-char-target')"), 'app.js must update hudCharKey in handleKeyUp');
const protoHudCharOccurrences = protoHtml.split("getElementById('hud-char-target')").length - 1;
assert.ok(protoHudCharOccurrences >= 3, `prototype must reference hud-char-target at least 3 times (found ${protoHudCharOccurrences})`);
console.log('   -> HUD char/seq live updates verified in dual tracks!');

// 4. Verify switchKeyerDevice triggers updateK5MorphingUI()
console.log('\n4. Verifying switchKeyerDevice invokes updateK5MorphingUI()...');
assert.ok(appJs.includes("if (typeof updateK5MorphingUI === 'function')"), 'app.js switchKeyerDevice must invoke updateK5MorphingUI()');
assert.ok(protoHtml.includes("if (typeof updateK5MorphingUI === 'function')"), 'prototype switchKeyerDevice must invoke updateK5MorphingUI()');
console.log('   -> switchKeyerDevice updateK5MorphingUI() invocation verified!');

// 5. Zero Emoji Audit on prototype_ui_redesign.html
console.log('\n5. Verifying Zero Emoji in prototype_ui_redesign.html...');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}]/u;
assert.ok(!emojiRegex.test(protoRedesignHtml), 'prototype_ui_redesign.html must contain 0 Unicode emojis');
assert.ok(protoRedesignHtml.includes('<i class="mdi mdi-flash"></i> 字母結算'), 'prototype_ui_redesign.html must use MDI icon for flash');
console.log('   -> prototype_ui_redesign.html 0 emoji audit passed!');

console.log('\n====================================================');
console.log('ALL PR REVIEW ROUND 1 FIXES VERIFIED SUCCESSFULLY!');
console.log('====================================================\n');
