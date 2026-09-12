/**
 * TEST SUITE: test_rx_sonar_led_ladder_and_teletype.js
 * 驗證聽力抄收 (RX) 盲聽聲納同心擴散光環、5 段式訊號 LED 電平階與電傳印字微震動效果
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Synchronization)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const rxCss = fs.readFileSync(path.join(projectRoot, 'css/rx-mode.css'), 'utf8');
const rxModeJs = fs.readFileSync(path.join(projectRoot, 'js/ui/rx-mode.js'), 'utf8');

console.log('=== Running RX Sonar, LED Ladder & Teletype Tests ===\n');

// 1. DOM 結構驗證 (Dual-Track HTML DOM Synchronization)
console.log('1. Verifying DOM structure in index.html & prototype_morse_card.html...');

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  // Signal Level Ladder (S-Meter)
  assert.ok(content.includes('id="rx-signal-ladder"'), `${name} must contain #rx-signal-ladder`);
  assert.ok(content.includes('class="signal-ladder-bars"'), `${name} must contain .signal-ladder-bars`);
  assert.ok(content.includes('class="signal-bar bar-1"'), `${name} must contain bar-1`);
  assert.ok(content.includes('class="signal-bar bar-5"'), `${name} must contain bar-5`);

  // Sonar Radar Wave
  assert.ok(content.includes('id="rx-sonar-pulse"'), `${name} must contain #rx-sonar-pulse`);
  assert.ok(content.includes('class="sonar-ring ring-1"'), `${name} must contain ring-1`);
  assert.ok(content.includes('class="sonar-ring ring-2"'), `${name} must contain ring-2`);
  assert.ok(content.includes('class="sonar-ring ring-3"'), `${name} must contain ring-3`);
  assert.ok(content.includes('class="sonar-core"'), `${name} must contain .sonar-core`);
  assert.ok(content.includes('mdi-access-point'), `${name} must use mdi-access-point icon`);
});
console.log('   -> Dual-track DOM structure strictly synchronized!');

// 2. 5 段式訊號 LED 電平階 CSS 樣式 (5-Stage LED Ladder S-Meter)
console.log('\n2. Verifying 5-Stage LED Signal Ladder in CSS & Prototype...');
[
  { name: 'css/rx-mode.css', content: rxCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('.rx-signal-ladder'), `${name} must define .rx-signal-ladder`);
  assert.ok(content.includes('.signal-bar.bar-1.active'), `${name} must define bar-1 active state`);
  assert.ok(content.includes('.signal-bar.bar-3.active'), `${name} must define bar-3 active state`);
  assert.ok(content.includes('.signal-bar.bar-4.active'), `${name} must define bar-4 active state`);
  assert.ok(content.includes('.signal-bar.bar-5.active'), `${name} must define bar-5 active state`);

  // Color gradient verification: Green -> Green -> Yellow -> Orange -> Red
  assert.ok(content.includes('#00e676'), `${name} must use Green for bars 1 & 2`);
  assert.ok(content.includes('#ffd700'), `${name} must use Yellow for bar 3`);
  assert.ok(content.includes('#ff9100'), `${name} must use Orange for bar 4`);
  assert.ok(content.includes('#ff3d00'), `${name} must use Red for bar 5`);
});
console.log('   -> 5-Stage LED Signal Ladder green-yellow-orange-red styling verified!');

// 3. 盲聽同心擴散聲納光環 CSS 樣式 (Acoustic Sonar Pulse Wave)
console.log('\n3. Verifying Acoustic Sonar Pulse Wave in CSS & Prototype...');
[
  { name: 'css/rx-mode.css', content: rxCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('.rx-sonar-pulse'), `${name} must define .rx-sonar-pulse`);
  assert.ok(content.includes('.rx-blind-active .rx-sonar-pulse'), `${name} must display sonar in blind mode`);
  assert.ok(content.includes('.rx-sonar-pulse.active'), `${name} must define active sonar visibility`);
  assert.ok(content.includes('@keyframes sonar-expand'), `${name} must define @keyframes sonar-expand`);
  assert.ok(content.includes('@keyframes sonar-core-pulse'), `${name} must define @keyframes sonar-core-pulse`);
  assert.ok(content.includes('border-radius: 50%'), `${name} must use concentric circular rings`);
});
console.log('   -> Acoustic Sonar Pulse concentric ripple animations verified!');

// 4. 電傳打字機鉛字烙印微震動 (Teletype Impression & Afterglow)
console.log('\n4. Verifying Teletype Impression & Afterglow in CSS & Prototype...');
[
  { name: 'css/rx-mode.css', content: rxCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('.rx-input-display.teletype-strike'), `${name} must define .teletype-strike`);
  assert.ok(content.includes('@keyframes teletype-impression'), `${name} must define @keyframes teletype-impression`);
  assert.ok(content.includes('@keyframes teletype-afterglow'), `${name} must define @keyframes teletype-afterglow`);
  assert.ok(content.includes('0.12s'), `${name} must define 120ms animation duration`);
});
console.log('   -> Teletype Impression 120ms mechanical strike & afterglow verified!');

// 5. JavaScript 控制邏輯驗證 (RxMode Logic & Event Wiring)
console.log('\n5. Verifying RxMode JavaScript Logic & Event Hooks...');
[
  { name: 'js/ui/rx-mode.js', content: rxModeJs },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  // Elements cached
  assert.ok(content.includes("signalLadder: document.getElementById('rx-signal-ladder')"), `${name} must cache signalLadder`);
  assert.ok(content.includes("sonarPulse: document.getElementById('rx-sonar-pulse')"), `${name} must cache sonarPulse`);

  // setSignalLevel method
  assert.ok(content.includes('setSignalLevel(level)'), `${name} must have setSignalLevel method`);

  // Player pulse hooks driving ladder
  assert.ok(content.includes('this.setSignalLevel(level);'), `${name} must jump signal level on pulseStart`);
  assert.ok(content.includes('this.setSignalLevel(0);'), `${name} must reset signal level on pulseEnd/stop`);

  // Sonar pulse activation in playCurrentAudio
  assert.ok(content.includes("this.el.sonarPulse.classList.add('active');"), `${name} must activate sonarPulse on audio start`);
  assert.ok(content.includes("this.el.sonarPulse.classList.remove('active');"), `${name} must deactivate sonarPulse on audio end`);

  // Teletype strike trigger in submitAnswer
  assert.ok(content.includes("this.el.inputDisplay.classList.add('teletype-strike');"), `${name} must trigger teletype-strike on submit`);
  assert.ok(content.includes("this.el.inputDisplay.classList.remove('teletype-strike');"), `${name} must clean up teletype-strike`);
});
console.log('   -> RxMode JavaScript event wiring verified across dual tracks!');

// 6. ADR 0001 零 Unicode Emoji 檢查 (Zero-Emoji Compliance)
console.log('\n6. Verifying ADR 0001 Zero-Emoji Compliance...');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
const checkedFiles = [
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml },
  { name: 'css/rx-mode.css', content: rxCss },
  { name: 'js/ui/rx-mode.js', content: rxModeJs }
];

checkedFiles.forEach(file => {
  assert.strictEqual(emojiRegex.test(file.content), false, `${file.name} must not contain any Unicode emoji characters`);
});
console.log('   -> ADR 0001 Strictly 0 Unicode Emoji verified across all modified files!');

console.log('\nAll RX Sonar, LED Ladder & Teletype Tests Passed Successfully!');
