/**
 * Test Suite: Dual Switchable Layout System & Focus HUD
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

const { SettingsManager } = require(path.join(projectRoot, 'js/core/settings-manager'));
const {
  kochState,
  setKochAssessmentMode,
  startKochDrill,
  stopKochDrill,
  finishKochDrillSession,
  updateKochProgressBadge
} = require(path.join(projectRoot, 'js/ui/koch-mode'));

console.log('==============================================');
console.log('Running Test Suite: Dual Layout System & Focus HUD');
console.log('==============================================');

// 1. Test SettingsManager persistence for layoutMode
console.log('--- 1. Testing SettingsManager layoutMode ---');
const fakeStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; }
};

const sm = new SettingsManager(null, fakeStorage);
assert.strictEqual(sm.settings.layoutMode, '2col', 'Default layout mode must be 2col');
sm.settings.layoutMode = '3col';
sm.save();

const smLoaded = new SettingsManager(null, fakeStorage);
smLoaded.load();
assert.strictEqual(smLoaded.settings.layoutMode, '3col', 'Persisted layout mode must load 3col');
console.log('  -> SettingsManager layoutMode persistence passed!');

// 2. Test DOM structure in index.html & prototype_morse_card.html
console.log('--- 2. Verifying DOM Architecture in HTML Files ---');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(target => {
  console.log(`Checking ${target.name}...`);
  // Layout switcher buttons
  assert(target.content.includes('id="btn-layout-2col"'), `${target.name} must have btn-layout-2col`);
  assert(target.content.includes('id="btn-layout-3col"'), `${target.name} must have btn-layout-3col`);
  assert(target.content.includes('layout-switch-container'), `${target.name} must have layout-switch-container`);

  // Three semantic column containers
  assert(target.content.includes('id="col-hardware"'), `${target.name} must have col-hardware`);
  assert(target.content.includes('id="col-training"'), `${target.name} must have col-training`);
  assert(target.content.includes('id="col-telemetry"'), `${target.name} must have col-telemetry`);

  // Koch Focus HUD
  assert(target.content.includes('id="koch-setup-card"'), `${target.name} must have koch-setup-card`);
  assert(target.content.includes('id="koch-hud-header"'), `${target.name} must have koch-hud-header`);
  assert(target.content.includes('id="btn-stop-koch-hud"'), `${target.name} must have btn-stop-koch-hud`);
  assert(target.content.includes('id="koch-hud-stats"'), `${target.name} must have koch-hud-stats`);

  // Dual Grid Keying Meters
  assert(target.content.includes('meter-dual-grid'), `${target.name} must have meter-dual-grid`);
  assert(target.content.includes('id="meter-container"'), `${target.name} must have meter-container`);
  assert(target.content.includes('id="gap-meter-container"'), `${target.name} must have gap-meter-container`);
  assert(target.content.includes('id="cw-ribbon"'), `${target.name} must have cw-ribbon`);

  // Verify meter-panel is in center col-training for 3-col visual balance
  const trainingCol = target.content.substring(
    target.content.indexOf('id="col-training"'),
    target.content.indexOf('id="col-telemetry"')
  );
  assert(trainingCol.includes('id="meter-panel"'), `${target.name} must place meter-panel in col-training for balance`);
  console.log(`  -> ${target.name} DOM structure passed!`);
});

// 3. Test Koch Focus HUD lifecycle (Drill Start -> HUD Open; Drill Stop -> HUD Close)
console.log('--- 3. Testing Koch Focus HUD lifecycle ---');
const elements = {};
function makeEl(initialId) {
  let _id = initialId;
  const el = {
    get id() { return _id; },
    set id(v) { _id = v; if (v) elements[v] = this; },
    style: {},
    classList: {
      classes: new Set(),
      add(...c) { c.forEach(x => this.classes.add(x)); },
      remove(...c) { c.forEach(x => this.classes.delete(x)); },
      contains(c) { return this.classes.has(c); },
      toggle(c, force) { if (force) this.classes.add(c); else this.classes.delete(c); }
    },
    textContent: '',
    children: [],
    appendChild(c) { this.children.push(c); },
    addEventListener() {},
    removeEventListener() {},
    remove() {}
  };
  if (initialId) elements[initialId] = el;
  return el;
}

[
  'koch-setup-card', 'koch-hud-header', 'koch-hud-stats', 'koch-hud-stage-tag',
  'koch-hud-mode-tag', 'btn-stop-koch-hud', 'koch-scorecard', 'koch-passage-container',
  'koch-drill-panel', 'eval-status', 'koch-reflex-container', 'koch-reflex-bar',
  'btn-start-koch-drill', 'btn-stop-koch-drill', 'btn-stop-koch-panel', 'koch-progress-badge',
  'koch-sc-total', 'koch-sc-correct', 'koch-sc-errors', 'koch-sc-accuracy', 'koch-sc-title',
  'koch-sc-mode-tag', 'koch-sc-threshold-tag', 'koch-sc-desc', 'koch-fb-target',
  'koch-fb-input', 'koch-fb-result'
].forEach(id => { makeEl(id); });

global.document = {
  createElement(tag) {
    return makeEl();
  },
  getElementById(id) {
    if (!elements[id]) makeEl(id);
    return elements[id];
  },
  querySelectorAll(sel) {
    if (sel === '.koch-mode-tab') {
      return [
        { dataset: { mode: 'quick' }, classList: makeEl().classList },
        { dataset: { mode: 'standard' }, classList: makeEl().classList },
        { dataset: { mode: 'challenge' }, classList: makeEl().classList }
      ];
    }
    return [];
  },
  querySelector(sel) {
    if (sel.includes('koch-duration')) return { value: '180' };
    if (sel.includes('koch-len')) return { value: '24' };
    return null;
  }
};

const { KochManager } = require(path.join(projectRoot, 'js/core/koch-manager'));
const km = new KochManager();
km.currentLevel = 2;
km.maxUnlockedLevel = 2;
global.window = {
  kochManager: km,
  engine: {
    getSequenceForLetter() { return '-.-'; }
  },
  scrollTo() {}
};

// Initial state
const setupCard = document.getElementById('koch-setup-card');
const hudHeader = document.getElementById('koch-hud-header');
setupCard.style.display = 'block';
hudHeader.style.display = 'none';

// Test Drill Start
setKochAssessmentMode('challenge');
startKochDrill();

assert.strictEqual(setupCard.style.display, 'none', 'Setup card must be hidden during drill');
assert.strictEqual(hudHeader.style.display, 'flex', 'Focus HUD must be visible during drill');
assert(document.getElementById('koch-hud-stage-tag').textContent.includes('第 2 關'), 'HUD stage tag must display current stage');
assert(document.getElementById('koch-hud-mode-tag').textContent.includes('挑戰模式'), 'HUD mode tag must display challenge mode');
console.log('  -> Drill start successfully activated Focus HUD and collapsed setup card!');

// Test Drill Stop
stopKochDrill();
assert.strictEqual(setupCard.style.display, 'block', 'Setup card must be restored upon drill stop');
assert.strictEqual(hudHeader.style.display, 'none', 'Focus HUD must be hidden upon drill stop');
assert.strictEqual(document.getElementById('koch-scorecard').style.display, 'block', 'Scorecard must display');
console.log('  -> Drill stop successfully restored setup card and scorecard!');

console.log('==============================================');
console.log('ALL DUAL LAYOUT & FOCUS HUD TESTS PASSED (Exit 0)!');
console.log('==============================================');

