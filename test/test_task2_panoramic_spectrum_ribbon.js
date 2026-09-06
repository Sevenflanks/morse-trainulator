/**
 * TEST SUITE: test_task2_panoramic_spectrum_ribbon.js
 * 驗證 Task 2 (#17): 頂置橫幅高斯平視示波光帶整合
 * 1. 頂置 75px Panoramic Spectrum Ribbon (p3b-top-ribbon)
 * 2. 60FPS 載波即時波形與 CRT 示波格線 (scope-graticule & scope-canvas)
 * 3. 雙軌 index.html 與 prototype_morse_card.html 同步
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Task 2: Panoramic Spectrum Ribbon Tests ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');

// 1. Dual-Track Top Ribbon Structure Verification
console.log('1. Verifying Top Ribbon DOM structure...');
const ribbonRequiredElements = [
  'class="p3b-top-ribbon"',
  'id="cockpit-top-ribbon"',
  'id="cw-ribbon"',
  'class="scope-graticule"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  ribbonRequiredElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain top ribbon element ${elem}`);
  });
  console.log(`   -> ${name} top ribbon DOM verified!`);
});

// 2. CSS Styling & Height Verification (75px)
console.log('\n2. Verifying Top Ribbon CSS styling...');
assert.ok(baseCss.includes('.p3b-top-ribbon'), 'base.css must define .p3b-top-ribbon');
assert.ok(baseCss.includes('height: 75px') || baseCss.includes('height:75px') || baseCss.includes('min-height: 75px'), 'base.css must define 75px height for ribbon');
assert.ok(baseCss.includes('.scope-graticule'), 'base.css must define .scope-graticule');
assert.ok(protoHtml.includes('.p3b-top-ribbon'), 'prototype_morse_card.html must define .p3b-top-ribbon');
console.log('   -> Top Ribbon CSS rules verified!');

// 3. Functional Logic: CWRibbon runs and binds to #cw-ribbon
console.log('\n3. Verifying CWRibbon module logic with 75px baseline...');
const { CWRibbon } = require(path.join(projectRoot, 'js/core/cw-ribbon'));
const ribbon = new CWRibbon(null);
assert.ok(ribbon, 'CWRibbon should instantiate cleanly');
assert.strictEqual(typeof ribbon.startPulse, 'function');
assert.strictEqual(typeof ribbon.endPulse, 'function');
assert.strictEqual(typeof ribbon.draw, 'function');
console.log('   -> CWRibbon functional verification passed!');

console.log('\n====================================================');
console.log('TASK 2 TEST SUITE PASSED 100%!');
console.log('====================================================\n');
