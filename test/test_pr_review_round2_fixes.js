/**
 * TEST SUITE: test_pr_review_round2_fixes.js
 * 驗證 PR #14 第二輪同儕審查 (Review 5124563133) 2 項 Must-fix 與 5 項優化項目
 * 1. 頂部 WPM 膠囊同步 (applySpeedPreset, paramUnitT input, applyLoadedSettings)
 * 2. A3 雷達光環外圈間隔動畫校準 (3T -> 42% gate-3t, 7T -> 95% gate-7t)
 * 3. 行動端 CSS 選擇器校準 (.k2-wing-title, .k5-center-smart-island, #k5-center-island)
 * 4. js/app.js module.exports 置於檔尾並匯出新控制器
 * 5. RAF 60FPS 動畫幀 DOM 元素快取優化 (haloPressArc, haloGapArc, hudTimingStatus)
 * 6. ADR 0002 澄清零外部依賴 Vanilla JS/CSS 與 file:/// 離線相容性
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running PR Review Round 2 Fixes Verification ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const appJs = fs.readFileSync(path.join(projectRoot, 'js/app.js'), 'utf8');
const meterJs = fs.readFileSync(path.join(projectRoot, 'js/ui/meter-controller.js'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');
const adr0002 = fs.readFileSync(path.join(projectRoot, 'docs/adr/0002-ui-architecture-redesign.md'), 'utf8');

// 1. Verify Top Bar WPM Sync across dual tracks
console.log('1. Verifying Top Bar WPM synchronization across speed change triggers...');
[
  { name: 'js/app.js', content: appJs },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  // In applySpeedPreset
  assert.ok(
    content.includes('const currentWpm = Math.round(1200 / p.unitT);') &&
    content.includes('updateTopbarWpm(currentWpm);'),
    `${name} must call updateTopbarWpm in applySpeedPreset`
  );
  // In paramUnitT input listener
  assert.ok(
    content.includes('const currentWpm = Math.round(1200 / val);') &&
    content.includes('updateTopbarWpm(currentWpm);'),
    `${name} must call updateTopbarWpm on paramUnitT input event`
  );
  // In applyLoadedSettings
  assert.ok(
    content.includes('updateTopbarWpm(Math.round(1200 / engine.config.unitT));') ||
    content.includes('const currentWpm = Math.round(1200 / s.unitT);'),
    `${name} must call updateTopbarWpm in applyLoadedSettings`
  );
  console.log(`   -> ${name} top bar WPM synchronization verified!`);
});

// 2. Verify A3 Radar Halo Outer Ring Gap Animation Calibration
console.log('\n2. Verifying A3 Radar Halo outer ring 3T/7T gate alignment calibration...');
[
  { name: 'js/ui/meter-controller.js', content: meterJs },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(
    content.includes('(elapsed / letterGap) * 42') &&
    content.includes('(elapsed - letterGap) / (wordGap - letterGap)'),
    `${name} must calibrate haloGapPct to 42% at letterGap (3T) and 95% at wordGap (7T)`
  );
  console.log(`   -> ${name} A3 halo outer gap calibration verified!`);
});

// 3. Verify CSS Selectors Alignment in Mobile Media Queries
console.log('\n3. Verifying responsive CSS selectors (.k2-wing-title, .k5-center-smart-island)...');
[
  { name: 'css/base.css', content: baseCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(!content.includes('.k2-wing-name'), `${name} must not use obsolete .k2-wing-name`);
  assert.ok(content.includes('.k2-wing-title'), `${name} must use .k2-wing-title`);
  assert.ok(
    content.includes('#k5-center-island') || content.includes('.k5-center-smart-island'),
    `${name} must select center smart island with #k5-center-island or .k5-center-smart-island`
  );
  console.log(`   -> ${name} responsive selectors verified!`);
});

// 4. Verify CommonJS Module Exports at end of js/app.js
console.log('\n4. Verifying js/app.js CommonJS exports organization...');
const appLines = appJs.trim().split('\n');
const lastLines = appLines.slice(-25).join('\n');
assert.ok(lastLines.includes('module.exports = {'), 'module.exports must be located at the end of js/app.js');
assert.ok(lastLines.includes('setWpmFromStepper'), 'module.exports must include setWpmFromStepper');
assert.ok(lastLines.includes('setStageView'), 'module.exports must include setStageView');
assert.ok(lastLines.includes('updateTopbarWpm'), 'module.exports must include updateTopbarWpm');
assert.ok(lastLines.includes('setupSettingsDrawer'), 'module.exports must include setupSettingsDrawer');
console.log('   -> js/app.js module.exports properly structured at end of file!');

// 5. Verify RAF 60FPS DOM Query Caching
console.log('\n5. Verifying RAF 60FPS DOM query caching in meter animations...');
[
  { name: 'js/ui/meter-controller.js', content: meterJs },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  // In startMeterAnimation, haloPressArc must be declared before function frame()
  const pressFnMatch = content.match(/function startMeterAnimation\(\)[\s\S]*?function frame\(\)/);
  assert.ok(pressFnMatch, `${name} must define startMeterAnimation and frame()`);
  assert.ok(
    pressFnMatch[0].includes("getElementById('halo-press-arc')"),
    `${name} must cache halo-press-arc before frame()`
  );
  assert.ok(
    pressFnMatch[0].includes("getElementById('hud-timing-status')"),
    `${name} must cache hud-timing-status before frame()`
  );

  // In startGapCountdown, haloGapArc must be declared before function tick()
  const gapFnMatch = content.match(/function startGapCountdown\(\)[\s\S]*?function tick\(\)/);
  assert.ok(gapFnMatch, `${name} must define startGapCountdown and tick()`);
  assert.ok(
    gapFnMatch[0].includes("getElementById('halo-gap-arc')"),
    `${name} must cache halo-gap-arc before tick()`
  );
  assert.ok(
    gapFnMatch[0].includes("getElementById('hud-timing-status')"),
    `${name} must cache hud-timing-status before tick()`
  );
  console.log(`   -> ${name} RAF DOM query caching verified!`);
});

// 6. Verify ADR 0002 Architectural Precision (Zero-Dependency Vanilla JS/CSS & file:///)
console.log('\n6. Verifying ADR 0002 zero-dependency and file:/// principles...');
assert.ok(adr0002.includes('100% 原生 Vanilla JS 與純 CSS'), 'ADR 0002 must state 100% Vanilla JS/CSS');
assert.ok(adr0002.includes('不引入任何外部運行時框架或第三方動畫庫'), 'ADR 0002 must confirm zero external animation runtime');
assert.ok(adr0002.includes('file:///'), 'ADR 0002 must guarantee file:/// offline support');
assert.ok(!adr0002.includes('引入輕量 CDN 版 GSAP'), 'ADR 0002 must not claim GSAP is introduced');
console.log('   -> ADR 0002 architectural record verified!');

console.log('\n====================================================');
console.log('ALL PR REVIEW ROUND 2 FIXES VERIFIED SUCCESSFULLY!');
console.log('====================================================\n');
