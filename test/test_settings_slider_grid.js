/**
 * TEST SUITE: test_settings_slider_grid.js
 * 驗證參數設定面板 4 組調整桿左側與右側網格垂直對齊 (Issue #27)
 * 驗證 CSS Grid 3 欄精密網格排版、雙軌 100% 同步與版本號標記
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Settings Slider Grid Alignment Tests (Issue #27) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const controlsCss = fs.readFileSync(path.join(projectRoot, 'css/controls.css'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

// 1. Package version check
console.log('1. Verifying Package & HTML Version tags...');
assert.strictEqual(packageJson.version, '1.3.3', 'package.json version must be 1.3.3');
assert.ok(indexHtml.includes('css/controls.css?v=1.3.3'), 'index.html must reference css/controls.css?v=1.3.3');
assert.ok(indexHtml.includes('js/app.js?v=1.3.3'), 'index.html must reference js/app.js?v=1.3.3');
console.log('   -> Version tags verified (v1.3.3)!');

// 2. Dual-Track CSS Grid Definition in controls.css and prototype_morse_card.html
console.log('\n2. Verifying .settings-row CSS Grid layout in both tracks...');
const gridRules = [
  'display: grid;',
  'grid-template-columns: minmax(0, 1fr) 125px 48px;',
  'gap: 10px;',
  'align-items: center;'
];

[
  { name: 'css/controls.css', content: controlsCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const rowStart = content.indexOf('.settings-row {');
  assert.ok(rowStart !== -1, `${name} must define .settings-row`);
  const rowEnd = content.indexOf('}', rowStart);
  const rowBlock = content.substring(rowStart, rowEnd + 1);

  gridRules.forEach(rule => {
    assert.ok(rowBlock.includes(rule), `${name} .settings-row must contain "${rule}"`);
  });

  // Verify slider full width inside grid cell
  assert.ok(content.includes('.settings-row input[type="range"]'), `${name} must target .settings-row input[type="range"]`);
  assert.ok(content.includes('.settings-row .val-tag'), `${name} must target .settings-row .val-tag`);

  console.log(`   -> ${name} verified with precision 3-column CSS Grid!`);
});

// 3. Verify All 4 Main Slider Rows exist and have .settings-row
console.log('\n3. Verifying All 4 Main Parameter Sliders in DOM...');
const mainSliderIds = [
  'param-unit-t',
  'param-threshold',
  'param-gap',
  'param-word-gap'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  mainSliderIds.forEach(id => {
    assert.ok(content.includes(`id="${id}"`), `${name} must contain slider id="${id}"`);
  });
  console.log(`   -> ${name} verified with all 4 primary parameter sliders!`);
});

console.log('\n====================================================');
console.log('ALL SETTINGS SLIDER GRID ALIGNMENT TESTS PASSED!');
console.log('====================================================\n');
