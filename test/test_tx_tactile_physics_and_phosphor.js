/**
 * TEST SUITE: test_tx_tactile_physics_and_phosphor.js
 * 驗證發報工作台 (TX) 實體電鍵物理反饋與示波紙帶磷光衰減
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Synchronization)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');
const controlsCss = fs.readFileSync(path.join(projectRoot, 'css/controls.css'), 'utf8');
const appJs = fs.readFileSync(path.join(projectRoot, 'js/app.js'), 'utf8');
const ribbonJs = fs.readFileSync(path.join(projectRoot, 'js/core/cw-ribbon.js'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');

console.log('=== Running TX Tactile Physics & Oscilloscope Phosphor Tests ===\n');

// 1. 直鍵物理下壓位移與接點微電弧閃光 (Straight Key Tactile Physics & Contact Spark)
console.log('1. Verifying Straight Key Tactile Physics & Contact Spark in Dual Tracks...');
assert.ok(controlsCss.includes('.key-button:active, .key-button.active'), 'controls.css must define .key-button active state');
assert.ok(controlsCss.includes('transform: translateY(2px) scale(0.98);'), 'controls.css must have 2px translateY + 0.98 scale');
assert.ok(controlsCss.includes('animation: contact-spark 0.08s infinite alternate;'), 'controls.css must have contact-spark animation');
assert.ok(baseCss.includes('@keyframes contact-spark'), 'base.css must define @keyframes contact-spark');

assert.ok(protoHtml.includes('transform: translateY(2px) scale(0.98);'), 'prototype must have key-button 2px translateY + 0.98 scale');
assert.ok(protoHtml.includes('animation: contact-spark 0.08s infinite alternate;'), 'prototype must have contact-spark animation');
assert.ok(protoHtml.includes('@keyframes contact-spark'), 'prototype must define @keyframes contact-spark');
console.log('   -> Straight key physical displacement & contact spark verified across dual tracks!');

// 2. 雙槳撥片微角度側向偏轉 (Dual Paddle Angular Deflection Physics)
console.log('\n2. Verifying Dual Paddle Angular Deflection Physics in Dual Tracks...');
assert.ok(controlsCss.includes('#paddle-left:active, #paddle-left.active'), 'controls.css must define #paddle-left active');
assert.ok(controlsCss.includes('rotate(-1.5deg)'), 'controls.css must have rotate(-1.5deg) for left paddle');
assert.ok(controlsCss.includes('#paddle-right:active, #paddle-right.active'), 'controls.css must define #paddle-right active');
assert.ok(controlsCss.includes('rotate(1.5deg)'), 'controls.css must have rotate(1.5deg) for right paddle');

assert.ok(baseCss.includes('.k2-thumb-wing.left:not(.mode-straight).active'), 'base.css must define wing left paddle active');
assert.ok(baseCss.includes('rotate(-1.5deg)'), 'base.css must have rotate(-1.5deg) for left wing');
assert.ok(baseCss.includes('.k2-thumb-wing.right:not(.mode-straight).active'), 'base.css must define wing right paddle active');
assert.ok(baseCss.includes('rotate(1.5deg)'), 'base.css must have rotate(1.5deg) for right wing');

assert.ok(protoHtml.includes('#paddle-left:active, #paddle-left.active'), 'prototype must define #paddle-left active');
assert.ok(protoHtml.includes('.k2-thumb-wing.left:not(.mode-straight).active'), 'prototype must define wing left paddle active');
assert.ok(protoHtml.includes('rotate(-1.5deg)'), 'prototype must have rotate(-1.5deg)');
assert.ok(protoHtml.includes('rotate(1.5deg)'), 'prototype must have rotate(1.5deg)');
console.log('   -> Dual paddle +/- 1.5deg angular deflection verified across dual tracks!');

// 3. K5 直鍵模式類別切換 (K5 Straight Key Mode Class Toggling)
console.log('\n3. Verifying K5 Straight Key Mode Class Toggling in Dual Tracks...');
assert.ok(appJs.includes("wingLeft.classList.toggle('mode-straight', currentKeyerDevice === 'straight');"), 'app.js must toggle mode-straight on wingLeft');
assert.ok(appJs.includes("wingRight.classList.toggle('mode-straight', currentKeyerDevice === 'straight');"), 'app.js must toggle mode-straight on wingRight');
assert.ok(protoHtml.includes("wingLeft.classList.toggle('mode-straight', currentKeyerDevice === 'straight');"), 'prototype must toggle mode-straight on wingLeft');
assert.ok(protoHtml.includes("wingRight.classList.toggle('mode-straight', currentKeyerDevice === 'straight');"), 'prototype must toggle mode-straight on wingRight');
console.log('   -> K5 Straight Key mode-straight toggling verified across dual tracks!');

// 4. CW 示波紙帶類比 CRT 磷光衰減 (CW Ribbon Canvas CRT Phosphor Decay Trail)
console.log('\n4. Verifying CW Ribbon Canvas CRT Phosphor Decay Trail in Dual Tracks...');
assert.ok(ribbonJs.includes('trailWidth = 14;'), 'cw-ribbon.js must define trailWidth');
assert.ok(ribbonJs.includes('phosphorGrad = ctx.createLinearGradient(x2, 0, x2 + trailWidth, 0);'), 'cw-ribbon.js must create gradient at falling edge x2');
assert.ok(ribbonJs.includes("p.isDit ? 'rgba(0, 229, 255, 0.32)' : 'rgba(255, 215, 0, 0.32)'"), 'cw-ribbon.js must use dit/dah phosphor color');

assert.ok(protoHtml.includes('trailWidth = 14;'), 'prototype must define trailWidth in CWRibbon');
assert.ok(protoHtml.includes('phosphorGrad = ctx.createLinearGradient(x2, 0, x2 + trailWidth, 0);'), 'prototype must create gradient at falling edge x2');
assert.ok(protoHtml.includes("p.isDit ? 'rgba(0, 229, 255, 0.32)' : 'rgba(255, 215, 0, 0.32)'"), 'prototype must use dit/dah phosphor color in CWRibbon');
console.log('   -> CW Ribbon Canvas CRT phosphor decay trail verified across dual tracks!');

// 5. ADR 0001 零 Unicode Emoji 檢查 (Zero-Emoji Standard Compliance)
console.log('\n5. Verifying ADR 0001 Zero-Emoji Compliance...');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
const checkedFiles = [
  { name: 'css/base.css', content: baseCss },
  { name: 'css/controls.css', content: controlsCss },
  { name: 'js/core/cw-ribbon.js', content: ribbonJs },
  { name: 'js/app.js', content: appJs },
  { name: 'prototype_morse_card.html', content: protoHtml }
];

checkedFiles.forEach(file => {
  assert.strictEqual(emojiRegex.test(file.content), false, `${file.name} must not contain any Unicode emoji characters`);
});
console.log('   -> ADR 0001 Strictly 0 Unicode Emoji verified across all modified files!');

console.log('\nAll TX Tactile Physics & Oscilloscope Phosphor Tests Passed Successfully!');
