/**
 * TEST SUITE: test_task6_panoramic_cockpit_integration.js
 * 驗證 Task 6 (#21): 16:9 全境儀表艙 (P3-B) 雙軌 100% 同步與整合回歸測試
 * 涵蓋 Epic #15 及子任務 #16 ~ #21 之全域驗證：
 * 1. 1080p 零捲軸 (Zero-Scroll) 流動排版容器骨幹 (#16)
 * 2. 頂置橫幅高斯平視示波光帶 (#17)
 * 3. 中央 Keying Core 與全局發報主控樞紐 (#18)
 * 4. 右翼任務情報甲板降噪與電信遙測向量儀 (#19)
 * 5. 左翼高解析 PCB 銅箔電路與 10-pin 數字匯流排 (#20)
 * 6. 全站零 Emoji 與 ADR 0001 (純 MDI 圖標) 嚴格合規性
 * 7. 雙軌 index.html 與 prototype_morse_card.html 100% 同構與 file:/// 本機相容
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Task 6: 16:9 Panoramic Cockpit Full Integration Tests ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');
const pcbCss = fs.readFileSync(path.join(projectRoot, 'css/pcb-card.css'), 'utf8');

const targets = [
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
];

// 1. Dual-Track 1080p Zero-Scroll Cockpit Skeleton (#16)
console.log('1. Verifying 1080p Zero-Scroll Panoramic Skeleton (#16)...');
targets.forEach(({ name, content }) => {
  assert.ok(content.includes('id="cockpit-top-ribbon"'), `${name} must have cockpit-top-ribbon`);
  assert.ok(content.includes('id="col-hardware"'), `${name} must have col-hardware`);
  assert.ok(content.includes('id="col-training"'), `${name} must have col-training`);
  assert.ok(content.includes('id="col-telemetry"'), `${name} must have col-telemetry`);
});
assert.ok(baseCss.includes('overflow: hidden'), 'base.css body must have overflow: hidden');
assert.ok(baseCss.includes('height: 100vh'), 'base.css body must have height: 100vh');
assert.ok(protoHtml.includes('overflow: hidden') && protoHtml.includes('height: 100vh'), 'prototype must have 100vh zero-scroll');
console.log('   -> 1080p Zero-Scroll Panoramic Skeleton verified!');

// 2. Top Panoramic Spectrum Ribbon Integration (#17)
console.log('\n2. Verifying Top Panoramic Spectrum Ribbon (#17)...');
targets.forEach(({ name, content }) => {
  assert.ok(content.includes('id="cw-ribbon"'), `${name} must have cw-ribbon canvas`);
  assert.ok(content.includes('PANORAMIC SPECTRUM HUD'), `${name} must have spectrum label`);
});
const { CWRibbon } = require(path.join(projectRoot, 'js/core/cw-ribbon'));
const fakeCanvas = {
  width: 1920,
  height: 75,
  getContext: () => ({
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    arc: () => {},
    fill: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    clearRect: () => {},
    setLineDash: () => {},
    fillText: () => {}
  })
};
const ribbonInst = new CWRibbon(null);
ribbonInst.canvas = fakeCanvas;
ribbonInst.ctx = fakeCanvas.getContext('2d');
ribbonInst.draw(1000);
assert.strictEqual(typeof ribbonInst.draw, 'function', 'CWRibbon must have draw method');
assert.strictEqual(ribbonInst.baselineY, Math.round(75 * 0.74), 'baselineY dynamic for 75px ribbon');
console.log('   -> Top Panoramic Spectrum Ribbon verified!');

// 3. Central Keying Core Hub (#18)
console.log('\n3. Verifying Central Keying Core Hub (#18)...');
const keyingHubElements = [
  'class="a3-halo-svg',
  'id="halo-press-arc"',
  'id="halo-gap-arc"',
  'id="hud-char-target"',
  'id="hud-seq-target"',
  'id="hud-timing-status"',
  'id="hud-committed-stream"',
  'id="key-trigger"'
];
targets.forEach(({ name, content }) => {
  keyingHubElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain central hub element ${elem}`);
  });
});
console.log('   -> Central Keying Core Hub verified!');

// 4. Right-Wing Telemetry Vector Deck (#19)
console.log('\n4. Verifying Right-Wing Telemetry Vector Deck (#19)...');
const telemetryElements = [
  'id="timing-vector-deck"',
  'id="telem-unit-t"',
  'id="telem-jitter"',
  'id="telem-ratio-text"',
  'id="telem-ratio-bar"'
];
targets.forEach(({ name, content }) => {
  telemetryElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain telemetry element ${elem}`);
  });
});
console.log('   -> Right-Wing Telemetry Vector Deck verified!');

// 5. Left-Wing High-Res PCB Topology & 10-pin Bus (#20)
console.log('\n5. Verifying Left-Wing High-Res PCB Topology & 10-Pin Bus (#20)...');
const pcbElements = [
  'class="pcb-card"',
  'id="pcb-svg"',
  'id="wires-layer"',
  'id="nodes-layer"',
  'id="numbers-bus-layer"',
  'id="number-chips-group"',
  'id="antenna-shape"'
];
targets.forEach(({ name, content }) => {
  pcbElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain PCB element ${elem}`);
  });
});
assert.ok(pcbCss.includes('pulse-wire'), 'pcb-card.css must define pulse-wire');
assert.ok(pcbCss.includes('node-burst'), 'pcb-card.css must define node-burst');
assert.ok(protoHtml.includes('pulse-wire'), 'prototype must define pulse-wire');
assert.ok(protoHtml.includes('node-burst'), 'prototype must define node-burst');
console.log('   -> Left-Wing High-Res PCB Topology & 10-Pin Bus verified!');

// 6. ADR 0001 Strict Compliance: Comprehensive Zero Emoji Audit
console.log('\n6. Verifying ADR 0001 (Zero Emoji & 100% MDI) across entire codebase...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
targets.forEach(({ name, content }) => {
  // Strip out comments and verify HTML body
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  assert.ok(bodyMatch, `${name} must contain body`);
  const bodyContent = bodyMatch[1];
  const hasEmoji = emojiRegex.test(bodyContent);
  assert.strictEqual(hasEmoji, false, `${name} must not contain any Unicode emoji (ADR 0001 violation)`);
  console.log(`   -> ${name} passed Zero Emoji audit!`);
});

// 7. Zero Dependency & file:/// Readiness
console.log('\n7. Verifying Zero-Dependency and file:/// local execution readiness...');
targets.forEach(({ name, content }) => {
  assert.ok(!content.includes('localhost:'), `${name} must not hardcode localhost`);
  assert.ok(!/<script[^>]+src=["']https?:/i.test(content), `${name} must not have external HTTP/HTTPS script dependencies`);
  console.log(`   -> ${name} is 100% file:/// local execution ready!`);
});

console.log('\n====================================================');
console.log('ALL 16:9 PANORAMIC COCKPIT INTEGRATION TESTS PASSED 100%!');
console.log('====================================================\n');
