/**
 * TEST SUITE: test_koch_stage1_dual.js
 * 驗證科赫第 1 關入門雙星（K 與 M）展示、試聽與字元池晶片互動
 */
const assert = require('assert');
const path = require('path');

// Mock DOM
class MockClassList {
  constructor() { this.classes = new Set(); }
  add(...cls) { cls.forEach(c => this.classes.add(c)); }
  remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
  toggle(cls, force) {
    if (force === undefined) {
      if (this.classes.has(cls)) this.classes.delete(cls);
      else this.classes.add(cls);
    } else if (force) {
      this.classes.add(cls);
    } else {
      this.classes.delete(cls);
    }
  }
  contains(cls) { return this.classes.has(cls); }
}

class MockElement {
  constructor(id = '', tag = 'div') {
    this.id = id;
    this.tagName = tag;
    this.classList = new MockClassList();
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.textContent = '';
    this.innerHTML = '';
    this.eventListeners = {};
  }
  appendChild(c) { this.children.push(c); }
  addEventListener(event, fn) {
    this.eventListeners[event] = this.eventListeners[event] || [];
    this.eventListeners[event].push(fn);
  }
  click() {
    if (this.eventListeners['click']) {
      this.eventListeners['click'].forEach(fn => fn({ stopPropagation: () => {} }));
    }
  }
}

const elements = new Map();
function getEl(id) {
  if (!elements.has(id)) {
    elements.set(id, new MockElement(id));
  }
  return elements.get(id);
}

const allNodes = [];
const allChips = [];

global.document = {
  getElementById: (id) => getEl(id),
  createElement: (tag) => new MockElement('', tag),
  querySelectorAll: (sel) => {
    if (sel === '.node-group') return allNodes;
    if (sel === '.number-chip') return allChips;
    return [];
  }
};

global.window = {
  currentMode: 'koch',
  replayLetter: null
};

// Setup PCB nodes for K and M
const nodeK = new MockElement('node-dahditdah', 'g');
nodeK.dataset.letter = 'K';
const nodeM = new MockElement('node-dahdah', 'g');
nodeM.dataset.letter = 'M';
const nodeR = new MockElement('node-ditdahdit', 'g');
nodeR.dataset.letter = 'R';
allNodes.push(nodeK, nodeM, nodeR);

// Load domain modules
const morseData = require(path.resolve(process.cwd(), 'js/core/morse-data.js'));
Object.assign(global, morseData);

const { MorseEngine } = require(path.resolve(process.cwd(), 'js/core/morse-engine.js'));
const engine = new MorseEngine();
global.engine = engine;
global.window.engine = engine;

const { KochManager } = require(path.resolve(process.cwd(), 'js/core/koch-manager.js'));
const kochManager = new KochManager();
global.kochManager = kochManager;
global.window.kochManager = kochManager;

const kochMode = require(path.resolve(process.cwd(), 'js/ui/koch-mode.js'));

let replayed = [];
global.window.replayLetter = (letter, seq) => {
  replayed.push({ letter, seq });
};

console.log('--- Testing Koch Stage 1 Dual Intro (K & M) ---');

// Set level 1
kochManager.currentLevel = 1;
kochMode.updateKochUI();
kochMode.updatePcbKochVisuals();

// 1. Verify Stage 1 Card is displayed and Standard Card is hidden
const stage1Card = getEl('koch-stage1-card');
const standardCard = getEl('koch-standard-card');
assert.strictEqual(stage1Card.style.display, 'flex', 'Stage 1 dual card must be visible');
assert.strictEqual(standardCard.style.display, 'none', 'Standard single target card must be hidden');

// 2. Verify both K and M have target node styling on PCB
assert.ok(nodeK.classList.contains('koch-target-node'), 'Node K must be marked as target node in stage 1');
assert.ok(nodeM.classList.contains('koch-target-node'), 'Node M must be marked as target node in stage 1');
assert.ok(!nodeR.classList.contains('koch-target-node'), 'Node R must NOT be target in stage 1');
assert.ok(nodeR.classList.contains('koch-locked'), 'Node R must be locked in stage 1');
console.log('   -> PCB visuals properly set target on BOTH K and M in stage 1');

// 3. Verify Pool chips rendered in Stage 1
const poolStage1 = getEl('koch-pool-stage1');
assert.strictEqual(poolStage1.children.length, 2, 'Pool chips should contain 2 chips (K and M)');
poolStage1.children[0].click(); // click K
assert.deepStrictEqual(replayed[0], { letter: 'K', seq: '-.-' }, 'Clicking K pool chip replays K (-.-)');
poolStage1.children[1].click(); // click M
assert.deepStrictEqual(replayed[1], { letter: 'M', seq: '--' }, 'Clicking M pool chip replays M (--)');
console.log('   -> Pool chips interactive audition verified');

// 4. Test Switching to Stage 2
console.log('\n--- Testing Koch Stage 2 (New Letter R) ---');
kochManager.currentLevel = 2;
kochMode.updateKochUI();
kochMode.updatePcbKochVisuals();

assert.strictEqual(stage1Card.style.display, 'none', 'Stage 1 card hidden in stage 2');
assert.strictEqual(standardCard.style.display, 'flex', 'Standard card visible in stage 2');
assert.strictEqual(getEl('koch-target-char').textContent, 'R', 'Target char in stage 2 is R');
assert.strictEqual(getEl('koch-target-seq').textContent, '.-.', 'Target seq in stage 2 is .-.');

assert.ok(!nodeK.classList.contains('koch-target-node'), 'Node K is not target in stage 2');
assert.ok(!nodeM.classList.contains('koch-target-node'), 'Node M is not target in stage 2');
assert.ok(nodeR.classList.contains('koch-target-node'), 'Node R is active target in stage 2');
console.log('   -> Stage 2 properly switches to standard target card with R');

console.log('\n========================================');
console.log('All Koch Stage 1 Dual Intro Tests Passed 100% (Exit 0)!');
console.log('========================================');

