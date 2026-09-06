/**
 * TEST SUITE: test_a3_radar_halo.js
 * 驗證 A3 中央雷達光環 (Center Radar Halo) 與專注 HUD 視圖
 * Task 3 (Issue #10)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running A3 Center Radar Halo Tests (Issue #10) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');

// 1. Dual-Track HTML Element Verification
console.log('1. Verifying Focus HUD & A3 Radar Halo DOM elements in index.html & prototype_morse_card.html...');
const requiredElements = [
  'id="focus-hud-stage"',
  'class="a3-halo-stage"',
  'class="a3-halo-svg"',
  'id="halo-press-arc"',
  'id="halo-gap-arc"',
  'cx="25.5"',
  'cy="140.9"',
  'cx="180.8"',
  'cy="73.7"',
  'id="hud-char-target"',
  'id="hud-seq-target"',
  'id="hud-timing-status"',
  'id="hud-committed-stream"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  requiredElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });
  console.log(`   -> ${name} verified with all A3 Radar Halo DOM elements!`);
});

// 2. CSS Styling & SVG Dasharray Verification
console.log('\n2. Verifying CSS styling and dasharray constants...');
assert.ok(baseCss.includes('.a3-halo-stage'), 'base.css must define .a3-halo-stage');
assert.ok(baseCss.includes('stroke-dasharray: 440') || baseCss.includes('stroke-dasharray:440'), 'base.css must define 440 dasharray for inner arc');
assert.ok(baseCss.includes('stroke-dasharray: 534') || baseCss.includes('stroke-dasharray:534'), 'base.css must define 534 dasharray for outer arc');
assert.ok(protoHtml.includes('.a3-halo-stage'), 'prototype_morse_card.html must define .a3-halo-stage');
assert.ok(protoHtml.includes('stroke-dasharray: 440') || protoHtml.includes('stroke-dasharray:440'), 'prototype_morse_card.html must define 440 dasharray');
console.log('   -> CSS rules & dasharray constants verified!');

// 3. Mathematical Geometry Verification of Halo Gate Dots
console.log('\n3. Verifying mathematical geometry of 3T/7T gate dots...');
// Center is (100, 100), radius is 85
const dist3T = Math.hypot(25.5 - 100, 140.9 - 100);
assert.ok(Math.abs(dist3T - 85) < 0.2, `3T dot distance (${dist3T}) must match radius 85`);

const dist7T = Math.hypot(180.8 - 100, 73.7 - 100);
assert.ok(Math.abs(dist7T - 85) < 0.2, `7T dot distance (${dist7T}) must match radius 85`);

// Circumferences:
const cInner = 2 * Math.PI * 70;
assert.ok(Math.abs(cInner - 440) < 1.0, `Inner arc circumference (${cInner.toFixed(1)}) matches 440`);

const cOuter = 2 * Math.PI * 85;
assert.ok(Math.abs(cOuter - 534) < 1.0, `Outer arc circumference (${cOuter.toFixed(1)}) matches 534`);
console.log('   -> Halo geometry mathematically verified!');

// 4. Zero Emoji Audit on Focus HUD markup
console.log('\n4. Verifying Zero Emoji in Focus HUD markup...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const hudMatch = content.match(/<div[^>]*id="focus-hud-stage"[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(hudMatch, `${name} must contain <div id="focus-hud-stage">...</div>`);
  assert.ok(!emojiRegex.test(hudMatch[0]), `${name} Focus HUD must not contain any emoji`);
  console.log(`   -> ${name} Focus HUD has 0 emojis!`);
});

console.log('\n====================================================');
console.log('ALL A3 CENTER RADAR HALO TESTS PASSED!');
console.log('====================================================\n');
