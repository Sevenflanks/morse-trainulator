/**
 * TEST SUITE: test_stage_view_switcher.js
 * 驗證主舞台三段式視圖切換器 (Tree / Focus HUD / Telemetry) 與零功能遺漏
 * Task 4 (Issue #11)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Main Stage View Switcher & Zero Feature Loss Tests (Issue #11) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');

// 1. Dual-Track View Switcher DOM Verification
console.log('1. Verifying View Switcher DOM elements in index.html & prototype_morse_card.html...');
const requiredViewElements = [
  'id="stage-view-switcher"',
  'id="view-tab-tree"',
  'id="view-tab-focus"',
  'id="view-tab-telemetry"',
  'id="tab-mode-free"',
  'id="tab-mode-text"',
  'id="tab-mode-koch"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  requiredViewElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });
  console.log(`   -> ${name} verified with all View Switcher elements!`);
});

// 2. Zero Feature Loss: Tree View (PCB Card & 10-pin Number Bus)
console.log('\n2. Verifying Tree View features (PCB Card & Number Bus)...');
const treeFeatures = [
  'id="pcb-svg"',
  'id="wires-layer"',
  'id="nodes-layer"',
  'id="numbers-bus-layer"',
  'id="number-chips-group"',
  'id="antenna-shape"',
  'id="speaker-wave"'
];
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  treeFeatures.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain Tree feature ${elem}`);
  });
  console.log(`   -> ${name} Tree View features 100% verified!`);
});

// 3. Zero Feature Loss: Telemetry View (CW Ribbon & 3-Axis Meters)
console.log('\n3. Verifying Telemetry View features (CW Ribbon & Meters)...');
const telemetryFeatures = [
  'id="cw-ribbon"',
  'id="meter-panel"',
  'id="meter-bar"',
  'id="meter-ghost"',
  'id="meter-markers"',
  'id="gap-bar"',
  'id="gap-markers"'
];
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  telemetryFeatures.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain Telemetry feature ${elem}`);
  });
  console.log(`   -> ${name} Telemetry View features 100% verified!`);
});

// 4. Zero Feature Loss: Text Mode & Koch Mode Controls
console.log('\n4. Verifying Text Mode and Koch Mode features...');
const modeFeatures = [
  'id="text-mode-container"',
  'id="btn-play-auto"',
  'id="btn-pause-auto"',
  'id="btn-stop-auto"',
  'id="btn-restart-text"',
  'id="passage-container"',
  'id="koch-drill-panel"',
  'id="koch-hud-header"',
  'id="koch-scorecard"'
];
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  modeFeatures.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain Mode feature ${elem}`);
  });
  console.log(`   -> ${name} Text/Koch features 100% verified!`);
});

// 5. CSS & Zero Emoji Verification
console.log('\n5. Verifying CSS styling and Zero Emoji on View Switcher...');
assert.ok(baseCss.includes('.stage-view-switcher'), 'base.css must define .stage-view-switcher');
assert.ok(baseCss.includes('.stage-view-btn'), 'base.css must define .stage-view-btn');
assert.ok(protoHtml.includes('.stage-view-switcher'), 'prototype_morse_card.html must define .stage-view-switcher');

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const match = content.match(/<div[^>]*id="stage-view-switcher"[\s\S]*?<\/div>/);
  assert.ok(match, `${name} must contain stage-view-switcher`);
  assert.ok(!emojiRegex.test(match[0]), `${name} stage-view-switcher must not contain any emoji`);
  console.log(`   -> ${name} stage-view-switcher has 0 emojis!`);
});

console.log('\n====================================================');
console.log('ALL MAIN STAGE VIEW SWITCHER TESTS PASSED!');
console.log('====================================================\n');
