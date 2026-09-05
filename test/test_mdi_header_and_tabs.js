const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Header & Tabs MDI Icons Tests (Issue #2) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');

const targets = [
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
];

targets.forEach(({ name, content }) => {
  console.log(`Checking ${name}...`);

  // 1. Header Title: mdi-radio-handheld or mdi-radio
  assert.ok(content.includes('mdi-radio-handheld') || content.includes('mdi-radio'), `${name} must include mdi-radio in title`);
  assert.ok(!content.includes('<h1>📻'), `${name} must not contain emoji in h1`);

  // 2. Layout Switcher: mdi-view-column & mdi-view-dashboard-variant
  assert.ok(content.includes('mdi-view-column'), `${name} must include mdi-view-column for 2col`);
  assert.ok(content.includes('mdi-view-dashboard-variant'), `${name} must include mdi-view-dashboard-variant for 3col`);
  assert.ok(!content.includes('🎛️ 雙欄專注'), `${name} must not contain emoji in 2col button`);
  assert.ok(!content.includes('🖥️ 三欄工作台'), `${name} must not contain emoji in 3col button`);

  // 3. Mode Tabs: mdi-flash, mdi-book-open-page-variant, mdi-bullseye-arrow
  assert.ok(content.includes('mdi-flash'), `${name} must include mdi-flash for free mode`);
  assert.ok(content.includes('mdi-book-open-page-variant'), `${name} must include mdi-book-open-page-variant for text mode`);
  assert.ok(content.includes('mdi-bullseye-arrow'), `${name} must include mdi-bullseye-arrow for koch mode`);
  assert.ok(!content.includes('⚡ 自由發報'), `${name} must not contain emoji in free mode tab`);
  assert.ok(!content.includes('📖 文章模式'), `${name} must not contain emoji in text mode tab`);

  // 4. Lightbulb hint: mdi-lightbulb-outline
  assert.ok(content.includes('mdi-lightbulb-outline'), `${name} must include mdi-lightbulb-outline for hint`);
  assert.ok(!content.includes('💡 點選字母或數字'), `${name} must not contain emoji in letter hint`);
});

console.log('\n====================================================');
console.log('ALL HEADER & TABS MDI ICON TESTS PASSED!');
console.log('====================================================\n');
