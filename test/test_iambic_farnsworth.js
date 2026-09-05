const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('--- Testing Farnsworth Timing in Iambic Keyer (Dual Paddle) ---');

// 1. Test modular IambicKeyer in js/core/iambic-keyer.js
const { MorseEngine } = require(path.resolve(process.cwd(), 'js/core/morse-engine.js'));
const { IambicKeyer } = require(path.resolve(process.cwd(), 'js/core/iambic-keyer.js'));

const mockSynth = {
  started: false,
  start() { this.started = true; },
  stop() { this.started = false; }
};

const engine = new MorseEngine({
  unitT: 120,       // 10 WPM base speed
  threshold: 240,
  letterGap: 360,
  wordGap: 840,
  farnsworthEnabled: false,
  charWpm: 18
});

const keyer = new IambicKeyer(engine, mockSynth);

console.log('1. Testing IambicKeyer with Farnsworth DISABLED...');
assert.strictEqual(keyer.getUnitT(), 120, 'With Farnsworth disabled, unitT should match config.unitT (120ms)');

let sentSym = null;
let sentDur = null;
keyer.onSymbolStart = (sym, dur) => {
  sentSym = sym;
  sentDur = dur;
};

// Test Dit
keyer.startSymbol('.');
assert.strictEqual(sentSym, '.');
assert.strictEqual(sentDur, 120, 'Normal Dit duration must be 120ms');
keyer.reset();

// Test Dah
keyer.startSymbol('-');
assert.strictEqual(sentSym, '-');
assert.strictEqual(sentDur, 360, 'Normal Dah duration must be 360ms');
keyer.reset();
console.log('   -> Farnsworth disabled behavior passed!');

console.log('2. Testing IambicKeyer with Farnsworth ENABLED (20 WPM)...');
engine.updateConfig({ farnsworthEnabled: true, charWpm: 20 });
// 1200 / 20 = 60ms
assert.strictEqual(engine.getEffectiveUnitT(), 60);
assert.strictEqual(keyer.getUnitT(), 60, 'With Farnsworth enabled at 20 WPM, keyer.getUnitT() must be 60ms');

// Test Dit under Farnsworth
keyer.startSymbol('.');
assert.strictEqual(sentSym, '.');
assert.strictEqual(sentDur, 60, 'Farnsworth Dit duration must be 60ms (20 WPM)');
keyer.reset();

// Test Dah under Farnsworth
keyer.startSymbol('-');
assert.strictEqual(sentSym, '-');
assert.strictEqual(sentDur, 180, 'Farnsworth Dah duration must be 180ms (20 WPM)');
keyer.reset();
console.log('   -> Farnsworth 20 WPM dual-paddle timing passed!');

console.log('3. Testing dynamic Farnsworth WPM update (25 WPM)...');
engine.updateConfig({ charWpm: 25 });
// 1200 / 25 = 48ms
assert.strictEqual(keyer.getUnitT(), 48, 'With Farnsworth updated to 25 WPM, keyer.getUnitT() must be 48ms');

keyer.startSymbol('.');
assert.strictEqual(sentDur, 48, 'Farnsworth Dit must dynamically update to 48ms');
keyer.reset();

keyer.startSymbol('-');
assert.strictEqual(sentDur, 144, 'Farnsworth Dah must dynamically update to 144ms');
keyer.reset();
console.log('   -> Dynamic Farnsworth slider update passed!');

console.log('4. Testing Bug Key automatic Dit under Farnsworth...');
keyer.isBugMode = true;
engine.updateConfig({ charWpm: 20 });
assert.strictEqual(keyer.getUnitT(), 60);

keyer.setPhysicalContact('left', true); // Dit side
assert.strictEqual(keyer.state, 'SENDING');
assert.strictEqual(sentSym, '.');
assert.strictEqual(sentDur, 60, 'Bug key automatic dit vibrator must follow Farnsworth timing (60ms)');
keyer.reset();
console.log('   -> Bug Key automatic Dit under Farnsworth passed!');

console.log('5. Verifying prototype_morse_card.html includes getUnitT()...');
const protoHtml = fs.readFileSync(path.resolve(process.cwd(), 'prototype_morse_card.html'), 'utf8');
assert(protoHtml.includes('getUnitT()'), 'prototype_morse_card.html must include getUnitT() in IambicKeyer');
assert(protoHtml.includes('const unitT = this.getUnitT();'), 'prototype_morse_card.html must call this.getUnitT()');

console.log('========================================');
console.log('All Iambic Keyer Farnsworth Timing Tests Passed 100% (Exit 0)!');
console.log('========================================');

