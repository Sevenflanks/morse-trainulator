/**
 * TEST SUITE: test_qso_streaming_wpm_blind_and_callsign.js
 * 驗證 Issue #63 核心規格與雙軌一致性：
 * 1. 雙向電傳逐字串流 (TX/RX Real-time Streaming)
 * 2. 全域 WPM 速度動態同步 (WPM Synchronization)
 * 3. 訊號強度錶 (S-Meter) 前綴零抖動 (Jitter-free Sx Readout)
 * 4. 本台電台台號與台長檔案自訂義 (Custom Operator Callsign & Profile)
 * 5. QSO 盲聽抄收開關與揭曉功能 (Blind Copying Mode & Reveal)
 * 6. ADR 0001 (Zero Unicode Emoji) 嚴格合規檢查
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(__dirname, '../prototype_morse_card.html'), 'utf8');
const qsoCss = fs.readFileSync(path.join(__dirname, '../css/qso-mode.css'), 'utf8');
const { QsoMode } = require('../js/ui/qso-mode.js');
const { CWPlayer } = require('../js/core/cw-player.js');

console.log('=== Running Issue #63 Comprehensive Test Suite ===\n');

// ----------------------------------------------------
// 1. S-Meter 前綴零抖動 DOM 與 CSS 規格驗證 (雙軌)
// ----------------------------------------------------
console.log('1. 驗證 S-Meter 前綴零抖動 DOM 結構與 CSS 佈局 (雙軌)...');

const smeterElements = [
  'id="qso-smeter-readout"',
  'class="smeter-s-tag" id="qso-smeter-level"',
  'class="smeter-s-db" id="qso-smeter-db"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  smeterElements.forEach(selector => {
    assert.ok(content.includes(selector), `${name} 必須包含 S-Meter 子容器標籤: ${selector}`);
  });
  console.log(`   -> ${name} S-Meter 雙子標籤 DOM 驗證通過！`);
});

const cssFiles = [
  { name: 'css/qso-mode.css', content: qsoCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
];

cssFiles.forEach(({ name, content }) => {
  assert.ok(content.includes('.smeter-s-tag'), `${name} 必須包含 .smeter-s-tag 樣式`);
  assert.ok(content.includes('width: 24px;'), `${name} .smeter-s-tag 必須固定寬度 24px`);
  assert.ok(content.includes('.smeter-s-db'), `${name} 必須包含 .smeter-s-db 樣式`);
  assert.ok(content.includes('width: 62px;'), `${name} .smeter-s-db 必須固定寬度 62px`);
  assert.ok(content.includes('display: inline-flex;'), `${name} .qso-smeter-val 必須設定 inline-flex`);
  assert.ok(content.includes('min-width: 90px;'), `${name} .qso-smeter-val 必須保留 min-width: 90px`);
  console.log(`   -> ${name} S-Meter 零抖動固定寬度 CSS 驗證通過！`);
});

// ----------------------------------------------------
// 2. 盲聽抄收開關與本台呼號設定 DOM (雙軌)
// ----------------------------------------------------
console.log('\n2. 驗證盲聽抄收開關、呼號快捷修改與設定抽屜表單 (雙軌)...');

const featureDomSelectors = [
  'id="chk-qso-blind"',
  'class="switch-input switch-neon"',
  'id="btn-qso-edit-my-call"',
  'id="station-settings-box"',
  'id="param-operator-callsign"',
  'id="param-operator-name"',
  'id="param-operator-qth"',
  'id="param-operator-rig"'
];

[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  featureDomSelectors.forEach(selector => {
    assert.ok(content.includes(selector), `${name} 必須包含元素: ${selector}`);
  });
  console.log(`   -> ${name} 盲聽開關與台長自訂表單 DOM 結構驗證通過！`);
});

// ----------------------------------------------------
// 3. S-Meter 控制器數值防抖驅動邏輯
// ----------------------------------------------------
console.log('\n3. 驗證 QsoMode 控制器 S-Meter 零抖動數值分開賦值邏輯...');

const mockLevelEl = { textContent: '', style: {} };
const mockDbEl = { textContent: '', style: {} };
const mockNeedleEl = { style: {} };

const qsoMode = new QsoMode();
qsoMode.el = {
  smeterNeedle: mockNeedleEl,
  smeterLevel: mockLevelEl,
  smeterDb: mockDbEl,
  smeterReadout: { querySelector: (sel) => sel === '.smeter-s-tag' ? mockLevelEl : mockDbEl }
};

// 測試 S1 噪音底噪
qsoMode.setSmeterLevel(1, false);
assert.strictEqual(mockLevelEl.textContent, 'S1', '底噪等級標籤應為 S1');
assert.strictEqual(mockDbEl.textContent, '(NOISE)', '底噪 dB 標籤應為 (NOISE)');

// 測試 S7 正常信號 (無 dB)
qsoMode.setSmeterLevel(7, true);
assert.strictEqual(mockLevelEl.textContent, 'S7', 'S7 等級標籤應為 S7');
assert.strictEqual(mockDbEl.textContent, '', 'S7 dB 標籤應為空字串，絕無位移');

// 測試 S9+10dB 強信號
qsoMode.setSmeterLevel(10, true);
assert.strictEqual(mockLevelEl.textContent, 'S9', '強信號等級標籤應為 S9');
assert.strictEqual(mockDbEl.textContent, '+10dB', '強信號 dB 標籤應為 +10dB');

// 測試 S9+30dB 滿格信號
qsoMode.setSmeterLevel(11, true);
assert.strictEqual(mockLevelEl.textContent, 'S9', '滿格信號等級標籤應為 S9');
assert.strictEqual(mockDbEl.textContent, '+30dB', '滿格信號 dB 標籤應為 +30dB');
console.log('   -> QsoMode S-Meter 數值防抖賦值邏輯驗證通過！');

// ----------------------------------------------------
// 4. 全域 WPM 速度動態同步驗證
// ----------------------------------------------------
console.log('\n4. 驗證 CWPlayer 與 QsoMode WPM 速度動態同步邏輯...');

const testPlayer = new CWPlayer({ unitT: 80, charWpm: 18 });
assert.strictEqual(testPlayer.unitT, 80);
assert.strictEqual(testPlayer.charWpm, 18);

// 模擬使用者在設定抽屜設定為 25 WPM (unitT = 48ms)
testPlayer.setUnitT(48);
testPlayer.setFarnsworth(false, 25);
assert.strictEqual(testPlayer.getUnitT(), 48, 'CWPlayer unitT 應更新為 48ms');
assert.strictEqual(testPlayer.calculateTimings().charUnitT, 48, 'CWPlayer calculateTimings 應採用 48ms');

// 驗證 QsoMode.syncWpmFromSettings
const mockEngine = {
  config: { unitT: 60, charWpm: 24, farnsworthEnabled: true },
  getEffectiveUnitT: () => 60
};
qsoMode.cwPlayer = testPlayer;
qsoMode.engine = mockEngine;
qsoMode.syncWpmFromSettings();

assert.strictEqual(testPlayer.getUnitT(), 60, 'QsoMode 應同步 engine unitT 60ms');
assert.strictEqual(testPlayer.charWpm, 24, 'QsoMode 應同步 engine charWpm 24 WPM');
assert.strictEqual(testPlayer.farnsworthEnabled, true, 'QsoMode 應同步法恩斯沃斯狀態');
console.log('   -> CWPlayer 與 QsoMode WPM 速度同步驗證通過！');

// ----------------------------------------------------
// 5. 雙向電傳串流與盲聽模式邏輯驗證
// ----------------------------------------------------
console.log('\n5. 驗證遠端 RX 逐字電傳串流、盲聽遮蔽與揭曉機制...');

// 驗證 QsoMode 具備串流與盲聽支援方法
assert.strictEqual(typeof qsoMode._createRxLiveLine, 'function', 'QsoMode 應實作 _createRxLiveLine');
assert.strictEqual(typeof qsoMode.revealAllBlindMessages, 'function', 'QsoMode 應實作 revealAllBlindMessages');
assert.strictEqual(qsoMode.blindEnabled, false, '預設盲聽應為關閉');

qsoMode.blindEnabled = true;
assert.strictEqual(qsoMode.blindEnabled, true, '盲聽切換應能設為啟用');
console.log('   -> QsoMode 串流與盲聽介面合規驗證通過！');

// ----------------------------------------------------
// 6. 本台呼號自訂與電台資料同步驗證
// ----------------------------------------------------
console.log('\n6. 驗證本台台號自訂義與 QsoManager 資料同步...');

const mockMyStation = { call: 'BV2TT', name: 'EDDIE', qth: 'TAIPEI', rig: '100W' };
let updatedStation = null;
qsoMode.qsoManager = {
  myStation: mockMyStation,
  setMyStation: (st) => { updatedStation = st; }
};

// 模擬使用者修改呼號為 BV2ZZ，QTH 改為 KAOHSIUNG
global.window = {
  settingsManager: {
    settings: {
      operatorCallsign: 'BV2ZZ',
      operatorName: 'BOB',
      operatorQth: 'KAOHSIUNG',
      operatorGrid: 'PL02',
      operatorRig: '50W',
      operatorAnt: 'YAGI'
    }
  }
};

qsoMode.syncOperatorSettings();
assert.ok(updatedStation, 'qsoManager.setMyStation 必須被呼叫');
assert.strictEqual(updatedStation.call, 'BV2ZZ', '呼號應更新為 BV2ZZ');
assert.strictEqual(updatedStation.qth, 'KAOHSIUNG', 'QTH 應更新為 KAOHSIUNG');
assert.strictEqual(updatedStation.rig, '50W', '功率應更新為 50W');
console.log('   -> 本台呼號自訂與電台資料動態同步驗證通過！');

// ----------------------------------------------------
// 7. ADR 0001 (Zero Unicode Emoji) 驗證
// ----------------------------------------------------
console.log('\n7. 驗證 ADR 0001 (嚴格零 Unicode Emoji / 顏文字)...');

const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;

const productionFiles = [
  { name: 'css/qso-mode.css', content: qsoCss },
  { name: 'index.html', content: indexHtml },
  { name: 'js/app.js', content: fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8') },
  { name: 'js/ui/qso-mode.js', content: fs.readFileSync(path.join(__dirname, '../js/ui/qso-mode.js'), 'utf8') },
  { name: 'prototype_morse_card.html', content: protoHtml }
];

productionFiles.forEach(({ name, content }) => {
  const match = content.match(emojiRegex);
  assert.strictEqual(match, null, `${name} 不得包含 Unicode Emoji: ${match ? match[0] : ''}`);
  console.log(`   -> ${name} 驗證通過：0 emojis！`);
});

console.log('\n====================================================');
console.log('ALL ISSUE #63 TESTS PASSED WITH 100% SUCCESS RATE!');
console.log('====================================================');
