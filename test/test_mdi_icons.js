/**
 * TEST SUITE: test_mdi_icons.js (Issue #5)
 * 全專案 MDI 向量圖標防退化測試 (Regression Test)
 * 驗證生產 UI 檔案中完全不含 Unicode Emoji，且所有關鍵介面元素皆符合 Material Design Icons 規範
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Global MDI Icons Regression Test (Issue #5) ===\n');

const projectRoot = path.resolve(__dirname, '..');

// Unicode Emoji & Pictograph regex range
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}]/u;

function getAllFiles(dir, exts = ['.html', '.js', '.css']) {
  let res = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== 'node_modules' && ent.name !== '.git' && ent.name !== '.agents' && ent.name !== 'test') {
        res = res.concat(getAllFiles(full, exts));
      }
    } else if (exts.some(ext => ent.name.endsWith(ext))) {
      res.push(full);
    }
  }
  return res;
}

// 1. Verify Zero Unicode Emoji in Production Codebase
console.log('1. Verifying Zero Unicode Emoji across production UI files...');
const prodFiles = [
  path.join(projectRoot, 'index.html'),
  path.join(projectRoot, 'prototype_morse_card.html'),
  ...getAllFiles(path.join(projectRoot, 'js')),
  ...getAllFiles(path.join(projectRoot, 'css'))
];

let emojiViolations = [];
prodFiles.forEach(absPath => {
  const relPath = path.relative(projectRoot, absPath);
  const content = fs.readFileSync(absPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      emojiViolations.push({ file: relPath, line: idx + 1, text: line.trim() });
    }
  });
});

if (emojiViolations.length > 0) {
  console.error(`Found ${emojiViolations.length} forbidden emoji occurrences:`);
  emojiViolations.forEach(v => console.error(`  [${v.file}:${v.line}] ${v.text}`));
}
assert.strictEqual(emojiViolations.length, 0, 'Production UI files must contain zero Unicode Emojis');
console.log(`   -> All ${prodFiles.length} production files verified: 0 emojis found!\n`);

// 2. Verify MDI Stylesheet & Styling Integration
console.log('2. Verifying MDI stylesheet and styling rules...');
const baseCssPath = path.join(projectRoot, 'css/base.css');
assert.ok(fs.existsSync(baseCssPath), 'css/base.css must exist');
const baseCss = fs.readFileSync(baseCssPath, 'utf8');
assert.ok(baseCss.includes('.mdi'), 'css/base.css must define .mdi styling');

const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');

assert.ok(indexHtml.includes('materialdesignicons.min.css'), 'index.html must link materialdesignicons.min.css');
assert.ok(protoHtml.includes('materialdesignicons.min.css'), 'prototype_morse_card.html must link materialdesignicons.min.css');
assert.ok(protoHtml.includes('.mdi'), 'prototype_morse_card.html must include .mdi styling');

console.log('   -> MDI stylesheet and styling verification passed!\n');

// 3. Verify Key MDI Icon Classes Present in Both Tracks
console.log('3. Verifying essential MDI icon classes across index.html and prototype_morse_card.html...');
// 3. Verify Static MDI Icon Classes Present in Both HTML Tracks
console.log('3. Verifying essential static MDI icon classes across index.html and prototype_morse_card.html...');
const staticMdiClasses = [
  // Header & Layout (Issue #2)
  'mdi-radio-handheld',
  'mdi-view-column',
  'mdi-view-dashboard-variant',
  // Mode Tabs & Hints (Issue #2)
  'mdi-flash',
  'mdi-book-open-page-variant',
  'mdi-bullseye-arrow',
  'mdi-lightbulb-outline',
  // Hardware & Controls (Issue #3)
  'mdi-radiobox-marked',
  'mdi-tune-vertical',
  'mdi-metronome',
  'mdi-play',
  'mdi-stop',
  'mdi-pause',
  'mdi-restore',
  'mdi-content-save-outline',
  // Koch Mode Tiers & Map (Issue #4)
  'mdi-map-marker-path',
  'mdi-crown',
  'mdi-trophy',
  'mdi-check-circle',
  'mdi-lock',
  'mdi-circle-outline',
  'mdi-star-face',
  'mdi-fire',
  'mdi-arrow-right',
  'mdi-volume-high',
  'mdi-party-popper',
  'mdi-timer-sand'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  console.log(`Checking essential static MDI classes in ${name}...`);
  staticMdiClasses.forEach(cls => {
    assert.ok(
      content.includes(cls),
      `${name} must include ${cls} class for unified telegraphic vector UI`
    );
  });
  console.log(`   -> ${name} verified with all essential static MDI classes!`);
});

// 4. Verify Dynamic MDI Icons in JS UI Modules and Prototype
console.log('\n4. Verifying dynamic status & notification MDI icons in scripts...');
const dynamicMdiClasses = [
  'mdi-alert',
  'mdi-medal',
  'mdi-delete-sweep',
  'mdi-clipboard-text'
];

const jsCombined = getAllFiles(path.join(projectRoot, 'js')).map(f => fs.readFileSync(f, 'utf8')).join('\n');

dynamicMdiClasses.forEach(cls => {
  assert.ok(jsCombined.includes(cls), `js/ modules must include dynamic MDI icon ${cls}`);
  assert.ok(protoHtml.includes(cls), `prototype_morse_card.html must include dynamic MDI icon ${cls}`);
});
console.log('   -> All dynamic status MDI icons verified!');

console.log('\n====================================================');
console.log('ALL GLOBAL MDI REGRESSION TESTS PASSED (Exit 0)!');
console.log('====================================================\n');
