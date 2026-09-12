/**
 * TEST SUITE: test_rx_analytics_sparkline_and_morse_diff.js
 * 驗證弱點戰情原生 SVG 走勢微線圖 (Sparkline) 與混淆對摩斯點劃音形對比徽章
 * (100% Zero-Emoji, Material Design Icons, Dual-Track Synchronization)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const rxCss = fs.readFileSync(path.join(projectRoot, 'css/rx-mode.css'), 'utf8');
const rxModeJs = fs.readFileSync(path.join(projectRoot, 'js/ui/rx-mode.js'), 'utf8');

const { RxMode } = require('../js/ui/rx-mode.js');

console.log('=== Running RX Weakness Analytics Sparkline & Morse Diff Tests ===\n');

// 1. CSS 樣式定義驗證 (CSS Classes in rx-mode.css & prototype_morse_card.html)
console.log('1. Verifying CSS styling in css/rx-mode.css & prototype_morse_card.html...');
[
  { name: 'css/rx-mode.css', content: rxCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  // Morse diff badge classes
  assert.ok(content.includes('.rx-morse-diff-badge'), `${name} must define .rx-morse-diff-badge`);
  assert.ok(content.includes('.diff-token'), `${name} must define .diff-token`);
  assert.ok(content.includes('.rhythm-sym.match'), `${name} must define .rhythm-sym.match`);
  assert.ok(content.includes('.rhythm-sym.diff.exp'), `${name} must define .rhythm-sym.diff.exp`);
  assert.ok(content.includes('.rhythm-sym.diff.act'), `${name} must define .rhythm-sym.diff.act`);

  // Sparkline classes
  assert.ok(content.includes('.rx-sparkline-container'), `${name} must define .rx-sparkline-container`);
  assert.ok(content.includes('.rx-sparkline-svg'), `${name} must define .rx-sparkline-svg`);
  assert.ok(content.includes('.rx-sparkline-path'), `${name} must define .rx-sparkline-path`);
  assert.ok(content.includes('.rx-sparkline-area'), `${name} must define .rx-sparkline-area`);
  assert.ok(content.includes('.rx-sparkline-point'), `${name} must define .rx-sparkline-point`);
});
console.log('   -> CSS classes strictly defined across dual tracks!');

// 2. 摩斯點劃音形對比徽章邏輯驗證 (renderMorseDiffBadge)
console.log('\n2. Verifying Morse Diff Rhythm Comparison Logic...');
const rxMode = new RxMode({});

// Verify getMorseSequence
assert.strictEqual(rxMode.getMorseSequence('B'), '-...', 'B must be -...');
assert.strictEqual(rxMode.getMorseSequence('D'), '-..', 'D must be -..');
assert.strictEqual(rxMode.getMorseSequence('M'), '--', 'M must be --');
assert.strictEqual(rxMode.getMorseSequence('N'), '-.', 'N must be -.');

// Verify renderMorseDiffBadge for B vs D
const badgeBD = rxMode.renderMorseDiffBadge('B', 'D');
assert.ok(badgeBD.includes('rx-morse-diff-badge'), 'Badge must have class rx-morse-diff-badge');
assert.ok(badgeBD.includes('B:'), 'Badge must include expected character label B:');
assert.ok(badgeBD.includes('D:'), 'Badge must include actual character label D:');
assert.ok(badgeBD.includes('diff exp'), 'Badge must highlight differing 4th dot of B with diff exp');
assert.ok(badgeBD.includes('rhythm-sym match'), 'Badge must highlight first 3 matching symbols with match');

// Verify renderMorseDiffBadge for M vs N
const badgeMN = rxMode.renderMorseDiffBadge('M', 'N');
assert.ok(badgeMN.includes('diff exp'), 'Badge must highlight differing 2nd dah in M');
assert.ok(badgeMN.includes('diff act'), 'Badge must highlight differing 2nd dit in N');

console.log('   -> Morse Diff Badge rhythm comparison logic verified with accurate match/diff classes!');

// 3. 原生 SVG 走勢微線圖邏輯與邊界驗證 (renderLatencySparkline)
console.log('\n3. Verifying Native SVG Reflex Latency Sparkline Logic & Boundary Cases...');

// Case A: 0 Sessions
const emptySpark = rxMode.renderLatencySparkline([], { recentAvgLatency: 0 });
assert.ok(emptySpark.includes('rx-sparkline-empty'), '0 sessions must return rx-sparkline-empty');
assert.ok(emptySpark.includes('尚無反射數據'), '0 sessions must display 尚無反射數據');

// Case B: 1 Session (boundary case: < 2 sessions)
const singleSpark = rxMode.renderLatencySparkline([{ avgLatency: 350, accuracy: 90 }], { recentAvgLatency: 350 });
assert.ok(singleSpark.includes('需至少 2 場測驗以繪製趨勢微線圖'), '< 2 sessions must display at least 2 sessions required hint');
assert.ok(singleSpark.includes('350 ms'), '< 2 sessions must display single record latency');

// Case C: Multi Sessions (>= 2 sessions)
const testSessions = [
  { avgLatency: 320, accuracy: 100, charWpm: 20 },
  { avgLatency: 410, accuracy: 80, charWpm: 20 },
  { avgLatency: 290, accuracy: 100, charWpm: 20 },
  { avgLatency: 360, accuracy: 90, charWpm: 20 }
];
const multiSpark = rxMode.renderLatencySparkline(testSessions, { recentAvgLatency: 345 });
assert.ok(multiSpark.includes('<svg class="rx-sparkline-svg"'), 'Multi sessions must render SVG sparkline');
assert.ok(multiSpark.includes('rx-sparkline-path'), 'Must render sparkline line path');
assert.ok(multiSpark.includes('rx-sparkline-area'), 'Must render translucent gradient area fill');
assert.ok(multiSpark.includes('linearGradient id="rx-spark-grad"'), 'Must define linearGradient in defs');
assert.ok(multiSpark.includes('rx-sparkline-point latest'), 'Must highlight latest data point');
assert.ok(multiSpark.includes('345 ms'), 'Must display recent avg latency in header');

console.log('   -> SVG Sparkline boundary cases (0, 1, and N sessions) and SVG path rendering verified!');

// 4. 雙軌 JavaScript 同步驗證 (Dual-Track JS Synchronization)
console.log('\n4. Verifying Dual-Track JavaScript Synchronization...');
assert.ok(protoHtml.includes('renderMorseDiffBadge(expected, actual)'), 'prototype must implement renderMorseDiffBadge');
assert.ok(protoHtml.includes('renderLatencySparkline(recentSessions, summary)'), 'prototype must implement renderLatencySparkline');
assert.ok(protoHtml.includes('getMorseSequence(char)'), 'prototype must implement getMorseSequence');
assert.ok(protoHtml.includes('this.renderMorseDiffBadge(item.expected, item.actual)'), 'prototype must call renderMorseDiffBadge in top confusions');
assert.ok(protoHtml.includes('this.renderLatencySparkline(recentSessions, summary)'), 'prototype must call renderLatencySparkline in latency trend');
console.log('   -> Dual-track JavaScript logic strictly synchronized!');

// 5. ADR 0001 零 Unicode Emoji 檢查 (Zero-Emoji Compliance)
console.log('\n5. Verifying ADR 0001 Zero-Emoji Compliance...');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
const checkedFiles = [
  { name: 'css/rx-mode.css', content: rxCss },
  { name: 'js/ui/rx-mode.js', content: rxModeJs },
  { name: 'prototype_morse_card.html', content: protoHtml }
];

checkedFiles.forEach(file => {
  assert.strictEqual(emojiRegex.test(file.content), false, `${file.name} must not contain any Unicode emoji characters`);
});
console.log('   -> ADR 0001 Strictly 0 Unicode Emoji verified across all modified files!');

console.log('\nAll RX Weakness Analytics Sparkline & Morse Diff Tests Passed Successfully!');
