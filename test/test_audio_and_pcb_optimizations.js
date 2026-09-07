/**
 * TEST SUITE: test_audio_and_pcb_optimizations.js
 * 驗證建議一（常駐振盪器）與建議二（PCB 高光快取）的效能與正確性
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

// 1. Mock Web Audio API for Node environment
class MockGainNode {
  constructor() {
    this.gain = {
      value: 0,
      cancelScheduledValues: () => {},
      setValueAtTime: (v) => { this.gain.value = v; },
      linearRampToValueAtTime: (v) => { this.gain.value = v; }
    };
  }
  connect() {}
  disconnect() {}
}

class MockOscillatorNode {
  constructor() {
    this.type = 'sine';
    this.frequency = {
      value: 650,
      setValueAtTime: (f) => { this.frequency.value = f; }
    };
    this.started = false;
    this.stopped = false;
    this.connected = false;
  }
  connect() { this.connected = true; }
  disconnect() { this.connected = false; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = {};
    this.state = 'running';
    this.oscCount = 0;
  }
  createGain() { return new MockGainNode(); }
  createOscillator() {
    this.oscCount++;
    return new MockOscillatorNode();
  }
  createBuffer() {
    return {
      getChannelData: () => new Float32Array(100)
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createBiquadFilter() {
    return {
      type: 'bandpass',
      frequency: { setValueAtTime: () => {} },
      Q: { setValueAtTime: () => {} },
      connect: () => {}
    };
  }
  resume() {}
}

global.AudioContext = MockAudioContext;
global.window = { AudioContext: MockAudioContext };

// Load MorseAudio
const { MorseAudio } = require(path.resolve(process.cwd(), 'js/core/morse-audio.js'));

console.log('--- 1. Testing MorseAudio Persistent Oscillator ---');
const audio = new MorseAudio();
audio.init();

assert.strictEqual(audio.osc, null, 'Oscillator should initially be null before first keying');

// First press
audio.start();
assert.ok(audio.osc !== null, 'Oscillator created on first start');
assert.strictEqual(audio.ctx.oscCount, 1, 'Only 1 oscillator created so far');
const firstOsc = audio.osc;
assert.ok(firstOsc.started, 'Oscillator started');

// First release
audio.stop();
assert.strictEqual(audio.osc, firstOsc, 'Oscillator MUST NOT be destroyed on stop');
assert.strictEqual(audio.gain.gain.value, 0, 'Gain must ramp down to zero floor');

// Rapid consecutive keyings (e.g. 5 dots in a row)
for (let i = 0; i < 5; i++) {
  audio.start();
  assert.strictEqual(audio.osc, firstOsc, `Oscillator reused on iteration ${i}`);
  audio.stop();
  assert.strictEqual(audio.osc, firstOsc, `Oscillator still alive on stop iteration ${i}`);
}
assert.strictEqual(audio.ctx.oscCount, 1, 'ZERO additional oscillators created during rapid keying (Zero GC)');

// Test frequency change
audio.setFrequency(750);
assert.strictEqual(firstOsc.frequency.value, 750, 'Frequency successfully updated on persistent oscillator');

// Test destroy
audio.destroy();
assert.strictEqual(audio.osc, null, 'Oscillator destroyed on explicit destroy()');
console.log('   -> MorseAudio persistent oscillator passed with 100% Zero-GC guarantee!');

// 2. Test PCB Renderer Cache
console.log('\n--- 2. Testing PCB Renderer O(1) Caches ---');

// Load morse-data and expose to global for pcb-renderer
const morseData = require(path.resolve(process.cwd(), 'js/core/morse-data.js'));
Object.assign(global, morseData);

// Mock DOM elements
class MockClassList {
  constructor() { this.classes = new Set(); }
  add(...cls) { cls.forEach(c => this.classes.add(c)); }
  remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
  contains(cls) { return this.classes.has(cls); }
}

class MockElement {
  constructor(id, tag = 'div') {
    this.id = id;
    this.tagName = tag;
    this.classList = new MockClassList();
    this.children = [];
    this.attributes = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  appendChild(child) { this.children.push(child); }
  addEventListener() {}
}

const domElements = new Map();
global.document = {
  createElementNS: (ns, tag) => new MockElement('', tag),
  getElementById: (id) => domElements.get(id) || null,
  querySelectorAll: () => {
    throw new Error('querySelectorAll should NOT be called in optimized highlightPath!');
  }
};

const { MorseEngine } = require(path.resolve(process.cwd(), 'js/core/morse-engine.js'));
const engine = new MorseEngine();
global.engine = engine;

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
} = require(path.resolve(process.cwd(), 'js/ui/pcb-renderer.js'));

// Setup mock containers
const wiresLayer = new MockElement('wires-layer');
const nodesLayer = new MockElement('nodes-layer');
const chipsLayer = new MockElement('number-chips-group');
const antennaShape = new MockElement('antenna-shape');

domElements.set('number-chips-group', chipsLayer);
domElements.set('antenna-shape', antennaShape);

renderCardSvg(wiresLayer, nodesLayer, engine);

assert.ok(wireElementsMap.size > 0, 'wireElementsMap must be populated');
assert.ok(nodeElementsMap.size > 0, 'nodeElementsMap must be populated');
assert.ok(chipElementsMap.size === 10, 'chipElementsMap must have 10 digits (0-9)');

console.log(`   -> Cached wires: ${wireElementsMap.size}, nodes: ${nodeElementsMap.size}, chips: ${chipElementsMap.size}`);

// Test highlighting '.-' (A)
highlightPath('.-', false, engine, antennaShape);
assert.ok(antennaShape.classList.contains('active'), 'Antenna must be active');
assert.strictEqual(activeWiresCache.length, 2, '2 wires should be active for A (.-)');
assert.strictEqual(activeNodesCache.length, 2, '2 nodes should be active for A (.-)');
assert.ok(activeWiresCache[0].classList.contains('active-wire'), 'Wire has active-wire class');
assert.ok(activeNodesCache[1].classList.contains('active-node'), 'Node A has active-node class');

// Test fast clear
highlightPath('', false, engine, antennaShape);
assert.ok(!antennaShape.classList.contains('active'), 'Antenna must be inactive');
assert.strictEqual(activeWiresCache.length, 0, 'activeWiresCache cleared');
assert.strictEqual(activeNodesCache.length, 0, 'activeNodesCache cleared');

// Test committed node
highlightPath('...', true, engine, antennaShape);
assert.strictEqual(committedNodesCache.length, 1, '1 committed node for S (...)');
assert.ok(committedNodesCache[0].classList.contains('committed-node'), 'Node S has committed-node class');

// Test digit chip highlight
highlightPath('.....', false, engine, antennaShape); // 5
assert.strictEqual(activeChipsCache.length, 1, '1 active chip for 5');
assert.ok(activeChipsCache[0].classList.contains('active-dit-chip'), 'Chip 5 has active-dit-chip');

console.log('   -> PCB Renderer O(1) zero-query cache passed all checks!');

// Test SVG transform-box for node-burst / kochUnlockFlash centering (Issue #25)
const pcbCss = fs.readFileSync(path.join(projectRoot, 'css/pcb-card.css'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');

[
  { name: 'pcb-card.css', content: pcbCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  // Check node-shape rule includes transform-box: fill-box
  const nodeShapeMatch = content.match(/\.node-shape\s*\{([^}]+)\}/);
  assert.ok(nodeShapeMatch, `${name} must define .node-shape`);
  assert.ok(nodeShapeMatch[1].includes('transform-box: fill-box'), `${name} .node-shape must include transform-box: fill-box`);
  assert.ok(nodeShapeMatch[1].includes('transform-origin: center'), `${name} .node-shape must include transform-origin: center`);

  // Check number-chip rect rule includes transform-box: fill-box
  const numberChipMatch = content.match(/\.number-chip\s+rect\s*\{([^}]+)\}/);
  assert.ok(numberChipMatch, `${name} must define .number-chip rect`);
  assert.ok(numberChipMatch[1].includes('transform-box: fill-box'), `${name} .number-chip rect must include transform-box: fill-box`);
  assert.ok(numberChipMatch[1].includes('transform-origin: center'), `${name} .number-chip rect must include transform-origin: center`);
});
console.log('   -> SVG transform-box: fill-box centering (Issue #25) verified in dual-track CSS!');

console.log('\n========================================');
console.log('All Optimization Tests Passed 100% (Exit 0)!');
console.log('========================================');


