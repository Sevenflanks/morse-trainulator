/**
 * TEST SUITE: test_qso_refinements_and_rx_scorecard.js
 * 驗證 Issue #61：RX 結算版面優化與 QSO 通聯電傳流式發報與全域質感一致化
 *
 * 測試面向：
 * 1. RX 模式測驗結算第 6 格題數顯示優化與等寬防抖 (雙軌)
 * 2. QSO SDR 氛圍控制開關 (QRN/QSB) 滑動 Switch 統一 (雙軌)
 * 3. QSO S-Meter 類比指針純 CSS 旋轉與右上角數值切換防抖 (雙軌)
 * 4. QSO 發報輔助儀表板 (點劃序列、即時解析、按鍵時長/速度、3T/7T 間隔進度條) (雙軌)
 * 5. QSO 示範播放按鈕 (雙軌) 與控制器 demo 串流發報邏輯
 * 6. QSO 零輸入框電傳即時串流終端與 <HH> 退格刪詞邏輯
 * 7. 側音頻率還原保護與全域細捲軸質感統一 (.drawer-body, .passage-box, .qso-terminal-feed, .qso-logbook-table-wrapper)
 * 8. 100% ADR 0001 (Zero Unicode Emoji)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const baseCss = fs.readFileSync(path.join(projectRoot, 'css/base.css'), 'utf8');
const modesCss = fs.readFileSync(path.join(projectRoot, 'css/modes.css'), 'utf8');
const rxCss = fs.readFileSync(path.join(projectRoot, 'css/rx-mode.css'), 'utf8');
const qsoCss = fs.readFileSync(path.join(projectRoot, 'css/qso-mode.css'), 'utf8');

const { QsoMode } = require(path.join(projectRoot, 'js/ui/qso-mode.js'));
const { QsoManager } = require(path.join(projectRoot, 'js/core/qso-manager.js'));
const { QsoLogManager } = require(path.join(projectRoot, 'js/core/qso-log-manager.js'));

console.log('=== Running Issue #61 Refinements Test Suite ===\n');

// ----------------------------------------------------
// 1. RX 測驗結算題數顯示優化與等寬防抖 (雙軌驗證)
// ----------------------------------------------------
console.log('1. 驗證 RX 結算題數欄位結構與防換行等寬樣式 (雙軌)...');

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('class="rx-sc-grid"'), `${name} 必須包含 class="rx-sc-grid"`);
  assert.ok(content.includes('id="rx-sc-total"'), `${name} 必須包含 id="rx-sc-total"`);
  assert.ok(content.includes('id="rx-sc-total-sub"'), `${name} 必須包含 id="rx-sc-total-sub"`);
  console.log(`   -> ${name} RX 結算卡片 DOM 結構驗證通過！`);
});

[
  { name: 'css/rx-mode.css', content: rxCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('.rx-sc-card-val'), `${name} 必須定義 .rx-sc-card-val`);
  assert.ok(content.includes('.rx-sc-card-sub'), `${name} 必須定義 .rx-sc-card-sub`);
  assert.ok(content.includes('white-space: nowrap;'), `${name} 必須設定 white-space: nowrap 防換行`);
  console.log(`   -> ${name} RX 結算卡片 CSS 樣式驗證通過！`);
});

// ----------------------------------------------------
// 2. QSO SDR 氛圍控制項開關 (QRN/QSB) 滑動 Switch 統一 (雙軌驗證)
// ----------------------------------------------------
console.log('\n2. 驗證 QSO SDR 雜音與衰落開關改為 switch-neon 統一規格 (雙軌)...');

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('id="chk-qso-qrn" class="switch-input switch-neon"'), `${name} QRN 開關必須具備 switch-neon 樣式`);
  assert.ok(content.includes('id="chk-qso-qsb" class="switch-input switch-neon"'), `${name} QSB 開關必須具備 switch-neon 樣式`);
  console.log(`   -> ${name} QRN/QSB switch-neon 滑動開關驗證通過！`);
});

// ----------------------------------------------------
// 3. QSO S-Meter 類比指針與數值防抖 (雙軌驗證)
// ----------------------------------------------------
console.log('\n3. 驗證 QSO S-Meter 指針 viewBox 旋轉軸心與數值等寬防抖 (雙軌)...');

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  // SVG 標籤不應寫死靜態 rotate(-40, 100, 80)
  assert.ok(!content.includes('<g id="qso-smeter-needle-group" transform="rotate'), `${name} S-Meter 指針群組不可含有靜態 SVG transform 旋轉屬性`);
  console.log(`   -> ${name} S-Meter 指針標籤純淨化驗證通過！`);
});

[
  { name: 'css/qso-mode.css', content: qsoCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('transform-box: view-box;'), `${name} 指針群組必須設定 transform-box: view-box`);
  assert.ok(content.includes('transform-origin: 50% 100%;'), `${name} 指針群組必須以 50% 100% 為旋轉原點`);
  assert.ok(content.includes('min-width: 90px;'), `${name} .qso-smeter-val 必須設定 min-width: 90px 防抖`);
  console.log(`   -> ${name} S-Meter CSS 純旋轉與防抖樣式驗證通過！`);
});

// ----------------------------------------------------
// 4. QSO 發報輔助儀表板 (點劃、解析、速度、3T/7T 間隔進度條)
// ----------------------------------------------------
console.log('\n4. 驗證 QSO 發報輔助儀表板結構與控制器邏輯 (雙軌)...');

const requiredTelemElements = [
  'id="qso-telemetry-deck"',
  'id="qso-telem-seq"',
  'id="qso-telem-char"',
  'id="qso-telem-wpm"',
  'id="qso-gap-bar"',
  'id="btn-qso-tx-over"',
  'id="btn-qso-clear-feed"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  requiredTelemElements.forEach(elem => {
    assert.ok(content.includes(elem), `${name} 必須包含發報輔助元件 ${elem}`);
  });
  console.log(`   -> ${name} 發報輔助儀表板 DOM 元件驗證通過！`);
});

// ----------------------------------------------------
// 5. QSO 示範播放按鈕與流式發報控制器邏輯 (QsoMode)
// ----------------------------------------------------
console.log('\n5. 驗證 QsoMode 控制器：示範播放、即時串流電傳與 <HH> 退格刪詞...');

const mockStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = String(v); },
  removeItem(k) { delete this.data[k]; }
};

const qsoManager = new QsoManager({ operatorCallsign: 'BV2TT' });
const qsoLogManager = new QsoLogManager(mockStorage);
const qsoMode = new QsoMode({ qsoManager, qsoLogManager });

// A. 驗證示範播放按鈕存在
assert.ok(indexHtml.includes('id="btn-qso-play-demo"'), 'index.html 必須包含 id="btn-qso-play-demo"');
assert.ok(protoHtml.includes('id="btn-qso-play-demo"'), 'prototype_morse_card.html 必須包含 id="btn-qso-play-demo"');
assert.strictEqual(typeof qsoMode.playDemoTransmission, 'function', 'qsoMode 必須提供 playDemoTransmission 函式');

// B. 驗證 S-Meter 透過 style.transform 操作旋轉
let mockNeedleStyle = {};
qsoMode.el = {
  smeterNeedle: { style: mockNeedleStyle },
  smeterReadout: { textContent: '', style: {} },
  smeterLadder: null,
  terminalFeed: { appendChild() {}, scrollTop: 0, scrollHeight: 100 }
};

qsoMode.setSmeterLevel(5.5, true);
assert.strictEqual(mockNeedleStyle.transform, 'rotate(0.0deg)', 'S5.5 指針角度應為 rotate(0.0deg)');

qsoMode.setSmeterLevel(0, true);
assert.strictEqual(mockNeedleStyle.transform, 'rotate(-45.0deg)', 'S0 指針角度應為 rotate(-45.0deg)');

qsoMode.setSmeterLevel(11, true);
assert.strictEqual(mockNeedleStyle.transform, 'rotate(45.0deg)', 'S11 指針角度應為 rotate(45.0deg)');
console.log('   -> S-Meter style.transform 純 CSS 旋轉運算驗證通過！');

// C. 驗證即時電傳流式發報與 <HH> 刪詞
qsoMode.isWorkspaceActive = () => true;

// 鍵入 "CQ CQ DE "
'CQ CQ DE '.split('').forEach(c => qsoMode.handleLetterDecoded(c));
assert.strictEqual(qsoMode._liveTxText, 'CQ CQ DE ');

// 輸入更正信號 <HH>：應刪除最後一個詞 "DE "
qsoMode.handleLetterDecoded('<HH>');
assert.strictEqual(qsoMode._liveTxText, 'CQ CQ ', '<HH> 應刪除上一詞 "DE "');

// 續鍵 "BV2TT K"
'BV2TT K'.split('').forEach(c => qsoMode.handleLetterDecoded(c));
assert.strictEqual(qsoMode._liveTxText, 'CQ CQ BV2TT K');

// 結算當前發報
let transmitHandledText = null;
qsoManager.handleUserTransmit = (text) => { transmitHandledText = text; return { feedback: 'TX OK' }; };

qsoMode.finalizeLiveTx();
assert.strictEqual(transmitHandledText, 'CQ CQ BV2TT K', 'finalizeLiveTx 應將整段電文遞交狀態機');
assert.strictEqual(qsoMode._liveTxText, '', 'finalizeLiveTx 應重置 _liveTxText 為空');
console.log('   -> QSO 零輸入框串流發報與 <HH> 退格刪詞邏輯驗證通過！');

// ----------------------------------------------------
// 6. 側音頻率還原保護與全域細捲軸質感統一
// ----------------------------------------------------
console.log('\n6. 驗證離台側音頻率還原保護與全域自訂細捲軸 (雙軌)...');

// 側音保護
const mockSynth = { frequency: 750, startNoise() {}, stopNoise() {} };
const qsoModeWithSynth = new QsoMode({ synth: mockSynth, qsoManager });
qsoModeWithSynth.onEnterQso();
assert.strictEqual(qsoModeWithSynth._originalSidetoneFreq, 750, 'onEnterQso 應快取原側音頻率');

mockSynth.frequency = 400; // 在 QSO 期間變更頻率
qsoModeWithSynth.onLeaveQso();
assert.strictEqual(mockSynth.frequency, 750, 'onLeaveQso 必須精準還原側音頻率');
console.log('   -> 側音頻率進出 QSO 工作台之還原保護驗證通過！');

// 全域捲軸樣式
[
  { name: 'css/base.css', content: baseCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('.drawer-body::-webkit-scrollbar'), `${name} 必須定義 .drawer-body 細捲軸`);
});

[
  { name: 'css/modes.css', content: modesCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('.passage-box::-webkit-scrollbar'), `${name} 必須定義 .passage-box 細捲軸`);
});

[
  { name: 'css/qso-mode.css', content: qsoCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('.qso-terminal-feed::-webkit-scrollbar'), `${name} 必須定義 .qso-terminal-feed 細捲軸`);
  assert.ok(content.includes('.qso-logbook-table-wrapper::-webkit-scrollbar'), `${name} 必須定義 .qso-logbook-table-wrapper 細捲軸`);
});
console.log('   -> 全域設定抽屜、文章練習、電傳終端與日誌細捲軸驗證通過！');

// ----------------------------------------------------
// 7. 嚴格 ADR 0001 (Zero Unicode Emoji) 驗證
// ----------------------------------------------------
console.log('\n7. 驗證 ADR 0001 (Zero Unicode Emoji)...');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2B50}\u{25A0}-\u{25FF}]/u;

[
  { name: 'css/base.css', content: baseCss },
  { name: 'css/modes.css', content: modesCss },
  { name: 'css/rx-mode.css', content: rxCss },
  { name: 'css/qso-mode.css', content: qsoCss },
  { name: 'js/ui/qso-mode.js', content: fs.readFileSync(path.join(projectRoot, 'js/ui/qso-mode.js'), 'utf8') }
].forEach(({ name, content }) => {
  const matches = content.match(emojiRegex);
  assert.strictEqual(matches, null, `Forbidden Unicode emoji found in ${name}`);
  console.log(`   -> ${name} 驗證：0 emojis！`);
});

console.log('\n====================================================');
console.log('ALL ISSUE #61 REFINEMENTS TESTS PASSED (Exit 0)!');
console.log('====================================================\n');
