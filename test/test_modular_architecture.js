const assert = require('assert');
const path = require('path');

console.log('--- Testing Modular Architecture & Core Domain Modules ---');

// 1. Test morse-data.js
console.log('1. Testing js/core/morse-data.js...');
const {
  seqToId,
  nodeCoords,
  wireLinks,
  digitsData,
  KOCH_SEQUENCE,
  KEY_PROFILES,
  DEFAULT_SETTINGS,
  speedPresets
} = require(path.resolve(process.cwd(), 'js/core/morse-data.js'));

assert.strictEqual(seqToId('...'), 'ditditdit');
assert.strictEqual(seqToId('---'), 'dahdahdah');
assert.strictEqual(seqToId('.--.'), 'ditdahdahdit');
assert.strictEqual(seqToId(''), 'root');
assert.strictEqual(digitsData.length, 10, 'Digits data should contain 10 elements (1-5 dit, 6-0 dah)');
assert.strictEqual(digitsData[0].digit, '1');
assert.strictEqual(digitsData[0].seq, '.----');
assert.strictEqual(KOCH_SEQUENCE.length, 36, 'Koch sequence should have 36 characters');
assert.strictEqual(KEY_PROFILES.standard.straight[0], 'KeyK', 'Standard straight key must be KeyK');
assert.strictEqual(speedPresets.intermediate.unitT, 80);
console.log('   -> morse-data.js passed all tests!');

// 2. Test morse-engine.js
console.log('2. Testing js/core/morse-engine.js...');
const { MorseEngine } = require(path.resolve(process.cwd(), 'js/core/morse-engine.js'));
const engine = new MorseEngine();

// Test classification
assert.strictEqual(engine.classifyDuration(60), '.');
assert.strictEqual(engine.classifyDuration(180), '-');

// Test appendSymbol and sequence
let r = engine.appendSymbol('.', 80);
assert.strictEqual(r.sequence, '.');
assert.strictEqual(r.letter, 'E');
assert.strictEqual(r.isValid, true);

r = engine.appendSymbol('-', 240);
assert.strictEqual(r.sequence, '.-');
assert.strictEqual(r.letter, 'A');
assert.strictEqual(r.isValid, true);

let committed = engine.commitCurrentSequence();
assert.strictEqual(committed.letter, 'A');
assert.strictEqual(engine.committedLetters[0], 'A');
assert.strictEqual(engine.currentSequence, '');

// Test Farnsworth
engine.updateConfig({ farnsworthEnabled: true, charWpm: 20 });
assert.strictEqual(engine.getEffectiveUnitT(), 60);
assert.strictEqual(engine.getEffectiveThreshold(), 120);
assert.strictEqual(engine.classifyDuration(50), '.');
assert.strictEqual(engine.classifyDuration(130), '-');
assert.strictEqual(engine.getBaselineWpm(), 20);
assert.strictEqual(engine.calculateStrokeWpm(60), 20);
console.log('   -> morse-engine.js passed all tests!');

// 3. Test koch-manager.js
console.log('3. Testing js/core/koch-manager.js...');
const { KochManager } = require(path.resolve(process.cwd(), 'js/core/koch-manager.js'));
const mockStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v; },
  removeItem(k) { delete this.store[k]; }
};
const kochMgr = new KochManager(mockStorage);
assert.strictEqual(kochMgr.currentLevel, 1);
assert.deepStrictEqual(kochMgr.getUnlockedPool(1), ['K', 'M']);
assert.strictEqual(kochMgr.getTargetChar(1), 'M');

const drill = kochMgr.generateDrill(10);
assert.strictEqual(drill.length, 10);
drill.forEach(c => assert(['K', 'M'].includes(c)));

kochMgr.maxUnlockedLevel = 5;
kochMgr.saveProgress();
assert.strictEqual(mockStorage.getItem('morse_koch_stage'), '5');

const kochMgr2 = new KochManager(mockStorage);
assert.strictEqual(kochMgr2.maxUnlockedLevel, 5);
console.log('   -> koch-manager.js passed all tests!');

// 4. Test keybinding-manager.js
console.log('4. Testing js/core/keybinding-manager.js...');
const { KeybindingManager } = require(path.resolve(process.cwd(), 'js/core/keybinding-manager.js'));
const keybindingMgr = new KeybindingManager(KEY_PROFILES);

assert(keybindingMgr.isStraight({ code: 'KeyK' }));
assert(!keybindingMgr.isStraight({ code: 'Slash' }));
assert(!keybindingMgr.isStraight({ code: 'Space' }));
assert(keybindingMgr.isDit({ code: 'BracketLeft' }));
assert(keybindingMgr.isDah({ code: 'BracketRight' }));

// Homerow profile
keybindingMgr.setProfile('homerow');
assert(keybindingMgr.isDit({ code: 'KeyF' }));
assert(keybindingMgr.isDah({ code: 'KeyJ' }));
console.log('   -> keybinding-manager.js passed all tests!');

// 5. Test settings-manager.js
console.log('5. Testing js/core/settings-manager.js...');
const { SettingsManager } = require(path.resolve(process.cwd(), 'js/core/settings-manager.js'));
const settingsStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v; },
  removeItem(k) { delete this.store[k]; }
};
const settingsMgr = new SettingsManager(DEFAULT_SETTINGS, settingsStorage);
settingsMgr.settings.unitT = 120;
settingsMgr.save();
assert(settingsStorage.getItem('morse_card_settings_v1').includes('"unitT":120'));

// Test legacy migration: if customBindings has Slash or Space, migrate to KeyK
settingsStorage.setItem('morse_card_settings_v1', JSON.stringify({
  customBindings: { straight: ['Slash'], dit: ['KeyF'], dah: ['KeyJ'] }
}));
const loaded = settingsMgr.load();
assert.deepStrictEqual(loaded.customBindings.straight, ['KeyK'], 'Must auto-migrate legacy Slash to KeyK');
console.log('   -> settings-manager.js passed all tests!');

// 6. Test iambic-keyer.js (Curtis Mode A/B & Bug key)
console.log('6. Testing js/core/iambic-keyer.js...');
const { IambicKeyer } = require(path.resolve(process.cwd(), 'js/core/iambic-keyer.js'));
const mockSynth = {
  start() {},
  stop() {}
};
const keyerInstance = new IambicKeyer(engine, mockSynth);
assert.strictEqual(keyerInstance.mode, 'B');
assert.strictEqual(keyerInstance.state, 'IDLE');

// Test Bug Key Mode
keyerInstance.isBugMode = true;
let manualDahCalled = null;
keyerInstance.onManualDah = (isDown) => {
  manualDahCalled = isDown;
};

// Press Dah side on Bug key -> triggers manual handler
keyerInstance.setPhysicalContact('right', true);
assert.strictEqual(manualDahCalled, true);
keyerInstance.setPhysicalContact('right', false);
assert.strictEqual(manualDahCalled, false);

// Press Dit side on Bug key -> triggers auto dit clock
let ditStarted = null;
keyerInstance.onSymbolStart = (sym) => {
  ditStarted = sym;
};
keyerInstance.setPhysicalContact('left', true);
assert.strictEqual(ditStarted, '.');
keyerInstance.reset();
console.log('   -> iambic-keyer.js passed all tests!');

console.log('\n========================================');
console.log('All Core Architecture Unit Tests Passed 100% (Exit 0)!');
console.log('========================================');

