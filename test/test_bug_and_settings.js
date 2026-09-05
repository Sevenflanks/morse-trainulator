const assert = require('assert');
const fs = require('fs');

console.log('--- Testing Bug Key, KeybindingManager, and SettingsManager ---');

// Mock localStorage
const localStorageStore = {};
global.localStorage = {
  getItem(k) { return localStorageStore[k] || null; },
  setItem(k, v) { localStorageStore[k] = v.toString(); },
  removeItem(k) { delete localStorageStore[k]; },
  clear() { for (const k in localStorageStore) delete localStorageStore[k]; }
};

// Mock DOM
global.document = {
  getElementById(id) {
    return {
      textContent: '',
      innerHTML: '',
      value: '',
      style: {},
      appendChild() {},
      getContext() {
        return {
          clearRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          fillRect() {},
          fillText() {},
          measureText() { return { width: 10 }; },
          createLinearGradient() { return { addColorStop() {} }; }
        };
      },
      classList: {
        add() {},
        remove() {},
        toggle() {}
      },
      addEventListener() {}
    };
  },
  querySelectorAll() {
    return [];
  },
  querySelector() {
    return {
      querySelector() { return { textContent: '' }; }
    };
  },
  createElement() {
    return {
      appendChild() {},
      classList: { add() {}, remove() {}, toggle() {} },
      style: {}
    };
  },
  createElementNS() {
    return {
      setAttribute() {},
      appendChild() {}
    };
  }
};
global.window = {
  addEventListener() {},
  scrollTo() {}
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Read prototype_morse_card.html to extract classes
const html = fs.readFileSync('prototype_morse_card.html', 'utf8');

// 1. Test KeybindingManager
console.log('1. Testing KeybindingManager...');
assert(html.includes('class KeybindingManager'), 'KeybindingManager class must exist');
assert(html.includes('class SettingsManager'), 'SettingsManager class must exist');
assert(html.includes('isBugMode'), 'isBugMode must be in IambicKeyer');

// Extract isolated class and constant definitions
const scriptContent = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const keyProfilesMatch = scriptContent.match(/const KEY_PROFILES = \{[\s\S]*?\n    \};/)[0];
const keybindingMgrMatch = scriptContent.match(/class KeybindingManager \{[\s\S]*?\n    \}/)[0];
const defaultSettingsMatch = scriptContent.match(/const DEFAULT_SETTINGS = \{[\s\S]*?\n    \};/)[0];
const settingsMgrMatch = scriptContent.match(/class SettingsManager \{[\s\S]*?\n    \}/)[0];
const iambicKeyerMatch = scriptContent.match(/class IambicKeyer \{[\s\S]*?\n    \}/)[0];

const sandbox = {};
const testFn = new Function('sandbox', `
  ${keyProfilesMatch}
  ${keybindingMgrMatch}
  ${defaultSettingsMatch}
  ${settingsMgrMatch}
  ${iambicKeyerMatch}
  sandbox.KEY_PROFILES = KEY_PROFILES;
  sandbox.KeybindingManager = KeybindingManager;
  sandbox.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  sandbox.SettingsManager = SettingsManager;
  sandbox.IambicKeyer = IambicKeyer;
`);

testFn(sandbox);
console.log('Classes compiled and initialized in sandbox successfully!');

// Instantiate and test KeybindingManager directly
const keyMgr = new sandbox.KeybindingManager();
assert.strictEqual(keyMgr.activeProfile, 'standard');
assert(keyMgr.isStraight({ code: 'KeyK' }), 'Default straight key should be KeyK (not Slash or Space)');
assert(!keyMgr.isStraight({ code: 'Slash' }), 'Slash should NOT be default straight key');
assert(!keyMgr.isStraight({ code: 'Space' }), 'Space should NOT be default straight key');
assert(keyMgr.isDit({ code: 'BracketLeft' }));
assert(keyMgr.isDah({ code: 'BracketRight' }));

// Switch to Homerow
keyMgr.setProfile('homerow');
assert.strictEqual(keyMgr.activeProfile, 'homerow');
assert(keyMgr.isDit({ code: 'KeyF' }), 'Dit should be F in Homerow');
assert(keyMgr.isDah({ code: 'KeyJ' }), 'Dah should be J in Homerow');
assert(keyMgr.isStraight({ code: 'KeyK' }), 'Straight should be K in Homerow');

// Switch to Left Hand
keyMgr.setProfile('left_hand');
assert(keyMgr.isDit({ code: 'KeyZ' }), 'Dit should be Z in left hand');
assert(keyMgr.isDah({ code: 'KeyX' }), 'Dah should be X in left hand');
assert(keyMgr.isStraight({ code: 'KeyC' }), 'Straight should be C in left hand');

// Custom key recording
keyMgr.startRecording('dit');
assert.strictEqual(keyMgr.recordingTarget, 'dit');
keyMgr.recordKey('KeyQ');
assert.strictEqual(keyMgr.activeProfile, 'custom');
assert(keyMgr.isDit({ code: 'KeyQ' }), 'Dit should now be recorded as KeyQ');
console.log('KeybindingManager passed all tests!');

// 2. Test SettingsManager
console.log('2. Testing SettingsManager...');
const settingsMgr = new sandbox.SettingsManager();
const loaded = settingsMgr.load();
assert.strictEqual(loaded.keyerDevice, 'paddle');
assert.strictEqual(loaded.unitT, 80);
assert.deepStrictEqual(loaded.customBindings.straight, ['KeyK']);

// Test migration of legacy localStorage with Slash/Space
localStorage.setItem('morse_card_settings_v1', JSON.stringify({
  customBindings: { straight: ['Slash', 'Space'], dit: ['KeyF'], dah: ['KeyJ'] }
}));
const migratedLoaded = settingsMgr.load();
assert.deepStrictEqual(migratedLoaded.customBindings.straight, ['KeyK'], 'Legacy Slash/Space bindings should migrate to KeyK');

// Save custom setting
settingsMgr.settings.keyerDevice = 'bug';
settingsMgr.settings.keyProfile = 'homerow';
settingsMgr.settings.unitT = 75;
settingsMgr.save();

// Create another instance and verify load
const settingsMgr2 = new sandbox.SettingsManager();
const loaded2 = settingsMgr2.load();
assert.strictEqual(loaded2.keyerDevice, 'bug', 'keyerDevice should be persisted as bug');
assert.strictEqual(loaded2.keyProfile, 'homerow', 'keyProfile should be persisted as homerow');
assert.strictEqual(loaded2.unitT, 75, 'unitT should be persisted as 75');

// Test reset
settingsMgr2.reset();
assert.strictEqual(settingsMgr2.settings.keyerDevice, 'paddle');
console.log('SettingsManager passed all tests!');

// 3. Test Bug Key state machine logic
console.log('3. Testing Bug Key logic in IambicKeyer...');
const mockEngine = {
  config: { unitT: 80 },
  appendSymbol(sym, dur) { return { sequence: sym, duration: dur }; }
};
const mockSynth = {
  start() {},
  stop() {}
};

const bugKeyer = new sandbox.IambicKeyer(mockEngine, mockSynth);
bugKeyer.isBugMode = true;

let manualDahCalled = null;
bugKeyer.onManualDah = (isDown) => {
  manualDahCalled = isDown;
};

// Press Dah side (right) -> should trigger onManualDah(true)
bugKeyer.setPhysicalContact('right', true);
assert.strictEqual(manualDahCalled, true, 'Bug key Dah down should trigger onManualDah(true)');
assert.strictEqual(bugKeyer.state, 'IDLE', 'Bug key Dah should NOT change keyer state machine to SENDING');

// Release Dah side -> should trigger onManualDah(false)
bugKeyer.setPhysicalContact('right', false);
assert.strictEqual(manualDahCalled, false, 'Bug key Dah up should trigger onManualDah(false)');

// Press Dit side (left) -> should trigger automatic Dit
bugKeyer.setPhysicalContact('left', true);
assert.strictEqual(bugKeyer.state, 'SENDING', 'Bug key Dit should enter SENDING');
assert.strictEqual(bugKeyer.currentSymbol, '.', 'Bug key Dit should send .');

console.log('Bug Key logic passed all tests!');
console.log('All tests passed successfully (Exit code 0)!');
process.exit(0);

