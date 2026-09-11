/**
 * TEST SUITE: test_cw_player_and_volume.js
 * 驗證獨立 CWPlayer 音頻調度器與側音主音量控制 (Issue #30)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running CWPlayer & Sidetone Volume Tests (Issue #30) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');

// Mock Synth for Node.js testing
class MockAudioSynth {
  constructor() {
    this.isPlaying = false;
    this.masterVolume = 0.7;
    this.events = [];
  }
  start() {
    this.isPlaying = true;
    this.events.push({ type: 'start', time: Date.now() });
  }
  stop() {
    this.isPlaying = false;
    this.events.push({ type: 'stop', time: Date.now() });
  }
  setMasterVolume(vol) {
    this.masterVolume = vol;
  }
}

// 1. Verify CWPlayer Module exists and functions
console.log('1. Verifying CWPlayer core module...');
const { CWPlayer } = require('../js/core/cw-player.js');
assert.strictEqual(typeof CWPlayer, 'function', 'CWPlayer class must be exported');

const mockSynth = new MockAudioSynth();
const player = new CWPlayer({
  synth: mockSynth,
  unitT: 60, // 20 WPM
  farnsworthEnabled: false,
  charWpm: 20
});

assert.strictEqual(player.getUnitT(), 60, 'getUnitT should return 60ms');
assert.strictEqual(player.isPlaying, false, 'Initial isPlaying should be false');

// Timing calculation assertions
const timingsStandard = player.calculateTimings('S');
assert.strictEqual(timingsStandard.charUnitT, 60);
assert.strictEqual(timingsStandard.interElementGap, 60);
assert.strictEqual(timingsStandard.interCharGap, 180); // 3T
assert.strictEqual(timingsStandard.wordGap, 420); // 7T

// Farnsworth timing assertions (18 WPM char, 10 WPM overall)
const farnsworthPlayer = new CWPlayer({
  synth: mockSynth,
  unitT: 120, // 10 WPM overall
  farnsworthEnabled: true,
  charWpm: 18 // 66.6ms charUnitT
});
const timingsFarnsworth = farnsworthPlayer.calculateTimings('K');
assert.strictEqual(timingsFarnsworth.charUnitT, Math.round(1200 / 18)); // 67ms
assert.strictEqual(timingsFarnsworth.interElementGap, Math.round(1200 / 18));
assert.strictEqual(timingsFarnsworth.interCharGap, 120 * 3); // 360ms
assert.strictEqual(timingsFarnsworth.wordGap, 120 * 7); // 840ms

console.log('   -> CWPlayer timing calculations verified!');

// 2. Verify CWPlayer Event Lifecycle during playback
console.log('\n2. Verifying CWPlayer playback and event lifecycle...');
(async () => {
  const lifecycleEvents = [];
  const testPlayer = new CWPlayer({
    synth: mockSynth,
    unitT: 10, // Fast test speed
    charWpm: 120,
    getSequence: (char) => (char === 'E' ? '.' : (char === 'T' ? '-' : ''))
  });

  testPlayer.on('pulseStart', (sym) => lifecycleEvents.push(`pulseStart:${sym}`));
  testPlayer.on('pulseEnd', (sym) => lifecycleEvents.push(`pulseEnd:${sym}`));
  testPlayer.on('charComplete', (char, seq) => lifecycleEvents.push(`charComplete:${char}:${seq}`));
  testPlayer.on('playbackComplete', () => lifecycleEvents.push('playbackComplete'));

  await testPlayer.playText('E T');
  assert.ok(lifecycleEvents.includes('pulseStart:.'), 'Must emit pulseStart:.');
  assert.ok(lifecycleEvents.includes('pulseEnd:.'), 'Must emit pulseEnd:.');
  assert.ok(lifecycleEvents.includes('charComplete:E:.'), 'Must emit charComplete:E:.');
  assert.ok(lifecycleEvents.includes('pulseStart:-'), 'Must emit pulseStart:-');
  assert.ok(lifecycleEvents.includes('charComplete:T:-'), 'Must emit charComplete:T:-');
  assert.ok(lifecycleEvents.includes('playbackComplete'), 'Must emit playbackComplete');
  console.log('   -> CWPlayer lifecycle events verified!');

  // 3. Verify MorseAudio setMasterVolume and gain node
  console.log('\n3. Verifying MorseAudio master volume API...');
  const { MorseAudio } = require('../js/core/morse-audio.js');
  const audio = new MorseAudio();
  assert.strictEqual(typeof audio.setMasterVolume, 'function', 'MorseAudio must have setMasterVolume');
  audio.setMasterVolume(0.85);
  assert.strictEqual(audio.masterVolume, 0.85, 'masterVolume property must be updated');
  console.log('   -> MorseAudio master volume verified!');

  // 4. Dual-Track Settings Drawer Sidetone Volume slider
  console.log('\n4. Verifying Settings Drawer Sidetone Volume in index.html & prototype_morse_card.html...');
  const requiredElements = [
    'id="param-sidetone-vol"',
    'id="tag-sidetone-vol"'
  ];

  [
    { name: 'index.html', content: indexHtml },
    { name: 'prototype_morse_card.html', content: protoHtml }
  ].forEach(({ name, content }) => {
    requiredElements.forEach(elem => {
      assert.ok(content.includes(elem), `${name} must contain ${elem}`);
    });
    console.log(`   -> ${name} verified with Sidetone Volume slider elements!`);
  });

  // 5. SettingsManager Persistence for sidetoneVolume
  console.log('\n5. Verifying SettingsManager persistence of sidetoneVolume...');
  const { SettingsManager } = require('../js/core/settings-manager.js');
  const sm = new SettingsManager();
  assert.ok('sidetoneVolume' in sm.defaults, 'SettingsManager defaults must include sidetoneVolume');
  assert.strictEqual(sm.defaults.sidetoneVolume, 70, 'Default sidetoneVolume should be 70%');
  console.log('   -> SettingsManager sidetoneVolume defaults verified!');

  console.log('\n====================================================');
  console.log('ALL CWPLAYER & VOLUME TESTS PASSED!');
  console.log('====================================================\n');
})().catch(err => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
