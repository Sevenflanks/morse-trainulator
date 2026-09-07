/**
 * TEST SUITE: test_task5_pcb_1080p_bus.js
 * 驗證 Task 5 (#20): 左翼高解析 PCB 銅箔電路與 10-pin 數字匯流排適配
 * 1. 雙軌 PCB SVG、26 字母二元樹、音波天線、10-pin 數字匯流排結構
 * 2. 1080p 流動排版、銅箔電脈衝流水動效與節點爆破輝光 (Burst Glow)
 * 3. 點擊節點/數字觸發示範發報與全域樞紐聯動
 * 4. Zero Emoji 檢查
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Task 5: PCB Topology & 10-Pin Bus Tests ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const pcbCss = fs.readFileSync(path.join(projectRoot, 'css/pcb-card.css'), 'utf8');

// 1. Dual-Track PCB Elements Verification
console.log('1. Verifying PCB structure and 10-pin bus elements in HTML...');
const pcbElements = [
  'class="pcb-card"',
  'id="pcb-svg"',
  'id="antenna-shape"',
  'id="wires-layer"',
  'id="nodes-layer"',
  'id="numbers-bus-layer"',
  'id="number-chips-group"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  pcbElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} must contain ${elem}`);
  });
  console.log(`   -> ${name} PCB elements verified!`);
});

// 2. Fluid Scaling & Electro-Pulse CSS Verification
console.log('\n2. Verifying Fluid Scaling & Electro-Pulse CSS rules...');
const requiredCssInPcb = [
  '.pcb-card',
  '#pcb-svg',
  '.wire.active-wire',
  '.node-group.active-node',
  '.node-group.committed-node',
  'node-burst',
  'pulse-wire',
  'transform-box: fill-box'
];

requiredCssInPcb.forEach(rule => {
  assert.ok(pcbCss.includes(rule), `pcb-card.css must define ${rule}`);
  assert.ok(protoHtml.includes(rule), `prototype_morse_card.html must define ${rule}`);
});
console.log('   -> Fluid Scaling & Electro-Pulse CSS rules verified!');

// 3. Functional PCB Renderer & Highlight Path Verification
console.log('\n3. Verifying PCB Renderer & Highlight Path functionality...');
const {
  renderCardSvg,
  renderNumberBusBar,
  highlightPath,
  clearPathHighlights,
  wireElementsMap,
  nodeElementsMap,
  chipElementsMap,
  activeWiresCache,
  activeNodesCache,
  committedNodesCache,
  activeChipsCache
} = require(path.join(projectRoot, 'js/ui/pcb-renderer'));

class MockSvgElement {
  constructor(tag, id = '') {
    this.tagName = tag;
    this.id = id;
    this.className = '';
    this.classList = {
      _classes: new Set(),
      add: (cls) => this.classList._classes.add(cls),
      remove: (cls) => this.classList._classes.delete(cls),
      contains: (cls) => this.classList._classes.has(cls)
    };
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.innerHTML = '';
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  appendChild(child) { this.children.push(child); }
  addEventListener(evt, fn) { this.listeners[evt] = fn; }
  dispatchEvent(evt) { if (this.listeners[evt]) this.listeners[evt]({ stopPropagation: () => {} }); }
}

global.document = {
  createElementNS: (ns, tag) => new MockSvgElement(tag),
  getElementById: (id) => {
    if (id === 'number-chips-group') return mockChipsGroup;
    if (id === 'antenna-shape') return mockAntenna;
    return null;
  }
};

const mockWiresLayer = new MockSvgElement('g', 'wires-layer');
const mockNodesLayer = new MockSvgElement('g', 'nodes-layer');
const mockChipsGroup = new MockSvgElement('g', 'number-chips-group');
const mockAntenna = new MockSvgElement('path', 'antenna-shape');

const fakeMorseData = require(path.join(projectRoot, 'js/core/morse-data'));
global.wireLinks = fakeMorseData.wireLinks || [];
global.nodeCoords = fakeMorseData.nodeCoords || {};
global.digitsData = fakeMorseData.digitsData || [];
global.seqToId = fakeMorseData.seqToId || ((s) => s.replace(/\./g, 'dit').replace(/-/g, 'dah'));

const fakeEngine = {
  tree: {
    '.': { letter: 'E', shape: 'circle' },
    '-': { letter: 'T', shape: 'square' },
    '.-': { letter: 'A', shape: 'square' },
    '.....': { letter: '5', shape: 'square' }
  },
  getPathForSequence: (seq) => {
    const steps = [];
    for (let i = 1; i <= seq.length; i++) steps.push(seq.slice(0, i));
    return steps;
  }
};

let clickedItem = null;
const onLetterClick = (letter, seq) => {
  clickedItem = { letter, seq };
};

renderCardSvg(mockWiresLayer, mockNodesLayer, fakeEngine, onLetterClick);

assert.ok(mockNodesLayer.children.length > 0, 'Nodes must be rendered');
assert.strictEqual(mockChipsGroup.children.length, 10, '10-pin number chips must be rendered');

// Click test on node A
const nodeA = mockNodesLayer.children.find(c => c.attributes['data-letter'] === 'A');
assert.ok(nodeA, 'Node A must exist');
nodeA.dispatchEvent('click');
assert.deepStrictEqual(clickedItem, { letter: 'A', seq: '.-' }, 'Clicking node A must trigger callback with A and .-');

// Click test on number chip 5
const chip5 = mockChipsGroup.children.find(c => c.attributes['data-digit'] === '5');
assert.ok(chip5, 'Chip 5 must exist');
chip5.dispatchEvent('click');
assert.deepStrictEqual(clickedItem, { letter: '5', seq: '.....' }, 'Clicking chip 5 must trigger callback with 5 and .....');

// Highlight Path verification
highlightPath('.-', false, fakeEngine, mockAntenna);
assert.ok(mockAntenna.classList.contains('active'), 'Antenna must be active during keying');
assert.strictEqual(activeWiresCache.length, 2, '2 wires active for A');
assert.strictEqual(activeNodesCache.length, 2, '2 nodes active for A');

// Committed Node verification
highlightPath('.-', true, fakeEngine, mockAntenna);
assert.strictEqual(committedNodesCache.length, 1, '1 committed node for A');
assert.ok(committedNodesCache[0].classList.contains('committed-node'), 'Committed node must have committed-node class');

console.log('   -> PCB Renderer & Highlight Path functionality passed 100%!');

// 4. Zero Emoji Audit on col-hardware
console.log('\n4. Verifying Zero Emoji in col-hardware...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  const start = content.indexOf('id="col-hardware"');
  const end = content.indexOf('id="col-training"');
  assert.ok(start !== -1 && end > start, `${name} must contain col-hardware before col-training`);
  const colHardwareHtml = content.slice(start, end);
  assert.ok(!emojiRegex.test(colHardwareHtml), `${name} col-hardware has 0 emojis`);
});
console.log('   -> Zero Emoji verified on col-hardware!');

console.log('\n====================================================');
console.log('TASK 5 TEST SUITE PASSED 100%!');
console.log('====================================================\n');
