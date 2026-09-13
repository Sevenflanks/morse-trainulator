/**
 * TEST SUITE: test_qso_macro_callsign_sync.js
 * 驗證 Issue #65 核心規格與全域呼號動態同步一致性：
 * 1. 呼號智能提取演算法 (extractCallsignFromText) 與 CW 雜訊關鍵字過濾
 * 2. 有效對方呼號解析優先級 (getEffectiveDxCall & getEffectiveDxStation)
 * 3. 宏按鈕動態呼號生成 (generateMacroText: RST, 73)
 * 4. 通聯對象切換排除機制 (pickRandomRemoteStation(excludeCall))
 * 5. 電傳歷史紀錄完整度 (sessionHistory push on bot responses)
 * 6. 雙軌架構與 TDZ (Temporal Dead Zone) 防護驗證
 * 7. ADR 0001 (Zero Unicode Emoji) 嚴格合規檢查
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { QsoManager } = require('../js/core/qso-manager.js');
const { QSO_REMOTE_STATIONS } = require('../js/core/morse-data.js');

const qsoManagerSrc = fs.readFileSync(path.join(__dirname, '../js/core/qso-manager.js'), 'utf8');
const qsoModeSrc = fs.readFileSync(path.join(__dirname, '../js/ui/qso-mode.js'), 'utf8');
const protoHtml = fs.readFileSync(path.join(__dirname, '../prototype_morse_card.html'), 'utf8');

console.log('=== Running Issue #65 Comprehensive Test Suite ===\n');

// ----------------------------------------------------
// 1. 呼號提取演算法 (extractCallsignFromText) 驗證
// ----------------------------------------------------
console.log('1. 驗證呼號提取演算法 (extractCallsignFromText) 與 CW 術語過濾...');

const manager = new QsoManager({
  operatorCallsign: 'BV2TT',
  operatorName: 'EDDIE',
  operatorQth: 'TAIPEI',
  operatorGrid: 'PL05',
  submode: 'guided'
});

// A. 標準 DE 格式
assert.strictEqual(manager.extractCallsignFromText('CQ CQ DE W6XYZ K'), 'W6XYZ');
assert.strictEqual(manager.extractCallsignFromText('BV2TT DE JA1ABC 599 BK'), 'JA1ABC');
assert.strictEqual(manager.extractCallsignFromText('QRZ? DE DL3HEX/P K'), 'DL3HEX/P');
assert.strictEqual(manager.extractCallsignFromText('CQ TEST DE VK2AA VK2AA K'), 'VK2AA');

// B. 目標對象位於首位格式
assert.strictEqual(manager.extractCallsignFromText('G4XYZ DE BV2TT UR 599 5NN BK'), 'G4XYZ');
assert.strictEqual(manager.extractCallsignFromText('HL1VA DE BV2TT 73 GL TU EE SK'), 'HL1VA');

// C. CW 常用非呼號術語過濾
assert.strictEqual(manager.extractCallsignFromText('CQ CQ CQ K'), null);
assert.strictEqual(manager.extractCallsignFromText('599 5NN BK'), null);
assert.strictEqual(manager.extractCallsignFromText('UR RST 599 TU EE SK'), null);
assert.strictEqual(manager.extractCallsignFromText('AGN?'), null);
assert.strictEqual(manager.extractCallsignFromText(''), null);
assert.strictEqual(manager.extractCallsignFromText(null), null);

console.log('   -> extractCallsignFromText 測試全部通過！');

// ----------------------------------------------------
// 2. 有效呼號解析優先級 (getEffectiveDxCall & Station)
// ----------------------------------------------------
console.log('2. 驗證有效呼號解析優先級機制...');

// 測試優先級 1: lastRemoteMessage
manager.lastRemoteMessage = 'BV2TT DE G4XYZ 599 BK';
manager.remoteStation = { call: 'JA1ABC', name: 'KEN' };
assert.strictEqual(manager.getEffectiveDxCall(), 'G4XYZ', '若 lastRemoteMessage 含有呼號，必須優先提取該呼號');

// 測試優先級 2: remoteStation (當 lastRemoteMessage 無呼號時)
manager.lastRemoteMessage = 'UR 599 BK';
assert.strictEqual(manager.getEffectiveDxCall(), 'JA1ABC', '若 lastRemoteMessage 無呼號，應退回使用 remoteStation.call');

// 測試優先級 3: sessionHistory (當 remoteStation 不存在時)
manager.remoteStation = null;
manager.lastRemoteMessage = '';
manager.sessionHistory = [
  { sender: 'TX', text: 'CQ CQ DE BV2TT K' },
  { sender: 'RX', text: 'BV2TT DE DL3HEX 599 BK' },
  { sender: 'TX', text: 'DL3HEX DE BV2TT 599 BK' }
];
assert.strictEqual(manager.getEffectiveDxCall(), 'DL3HEX', '應能自最近的 RX 歷史訊息中解析出呼號');

// 測試 getEffectiveDxStation 動態建構未知電台
const adHocStation = manager.getEffectiveDxStation();
assert.ok(adHocStation, '必須取得電台物件');
assert.strictEqual(adHocStation.call, 'DL3HEX');
assert.strictEqual(adHocStation.qth, 'BERLIN', '預設庫中存在的電台應正確取回預設元資訊');

// 測試全新非預設電台
manager.remoteStation = null;
manager.lastRemoteMessage = '';
manager.sessionHistory = [{ sender: 'RX', text: 'DE K3LR 599 BK' }];
const dynamicStation = manager.getEffectiveDxStation();
assert.strictEqual(dynamicStation.call, 'K3LR');
assert.strictEqual(dynamicStation.country, 'DX');
assert.strictEqual(dynamicStation.rstSent, '599');

console.log('   -> 有效呼號解析優先級測試通過！');

// ----------------------------------------------------
// 3. 宏按鈕動態呼號生成 (generateMacroText)
// ----------------------------------------------------
console.log('3. 驗證宏按鈕動態呼號生成 (RST 與 73)...');

manager.lastRemoteMessage = 'BV2TT DE W6XYZ 599 BK';
const rstMacro = manager.generateMacroText('RST');
assert.ok(rstMacro.startsWith('W6XYZ DE BV2TT'), `RST 宏必須以當前對方呼號開頭: ${rstMacro}`);
assert.ok(rstMacro.includes('UR RST 599 BK'), `RST 宏必須包含信號報告: ${rstMacro}`);

const farewellMacro = manager.generateMacroText('73');
assert.ok(farewellMacro.startsWith('W6XYZ DE BV2TT'), `73 宏必須帶入對方呼號: ${farewellMacro}`);
assert.ok(farewellMacro.includes('73 GL TU EE SK'), `73 宏必須包含標準結束結語: ${farewellMacro}`);

// 當完全無法識別呼號時的優雅退避
manager.lastRemoteMessage = '';
manager.remoteStation = null;
manager.sessionHistory = [];
manager.submode = 'free';
const fallback73 = manager.generateMacroText('73');
assert.strictEqual(fallback73, 'TNX FER QSO 73 GL TU EE SK', '無對方呼號時 73 應退回為通用格式');

console.log('   -> 宏按鈕動態呼號生成測試通過！');

// ----------------------------------------------------
// 4. 換台排除機制 (pickRandomRemoteStation)
// ----------------------------------------------------
console.log('4. 驗證換台排除當前呼號機制 (pickRandomRemoteStation)...');

const stationA = QSO_REMOTE_STATIONS[0].call;
for (let i = 0; i < 20; i++) {
  const next = manager.pickRandomRemoteStation(stationA);
  assert.notStrictEqual(next.call, stationA, `排除 ${stationA} 時不應再選出同一個電台`);
}

console.log('   -> 換台排除機制測試通過！');

// ----------------------------------------------------
// 5. sessionHistory RX 訊息記錄驗證
// ----------------------------------------------------
console.log('5. 驗證 botResponseReady 時 RX 歷史紀錄寫入...');

manager.resetQso();
const initialRxCount = manager.sessionHistory.filter(e => e.sender === 'RX').length;
// 觸發 AGN? 重複電文
manager.lastRemoteMessage = 'TEST MSG';
manager.handleUserTransmit('AGN?');
const newRxCount = manager.sessionHistory.filter(e => e.sender === 'RX').length;
assert.strictEqual(newRxCount, initialRxCount + 1, '重複電文應寫入 sessionHistory');
assert.strictEqual(manager.sessionHistory[manager.sessionHistory.length - 1].text, 'TEST MSG');

console.log('   -> sessionHistory 記錄測試通過！');

// ----------------------------------------------------
// 6. 雙軌架構同步與 TDZ 防護檢驗
// ----------------------------------------------------
console.log('6. 驗證雙軌架構與 prototype_morse_card.html 結構...');

// A. 驗證 js/core/qso-manager.js 與 prototype_morse_card.html 具備相同方法
const requiredMethods = [
  'extractCallsignFromText',
  'getEffectiveDxCall',
  'getEffectiveDxStation'
];

requiredMethods.forEach(method => {
  assert.ok(qsoManagerSrc.includes(method), `js/core/qso-manager.js 必須包含 ${method}`);
  assert.ok(protoHtml.includes(method), `prototype_morse_card.html 必須包含 ${method}`);
  console.log(`   -> 雙軌皆具備方法 ${method}`);
});

// B. 驗證 QsoMode 內部的更新事件監聽與元資訊刷新
assert.ok(qsoModeSrc.includes("this.qsoManager.on('stationUpdated'"), 'qso-mode.js 必須監聽 stationUpdated');
assert.ok(protoHtml.includes("this.qsoManager.on('stationUpdated'"), 'prototype_morse_card.html 必須監聽 stationUpdated');

// C. 驗證 prototype_morse_card.html 中常數宣告順序先於初始化 (TDZ 防護)
const dataBlockPos = protoHtml.indexOf('const KOCH_SEQUENCE = [');
const initPos = protoHtml.indexOf('// Initialize Managers, Engine, Synth, Keyer & Ribbon');
assert.ok(dataBlockPos > 0, 'prototype_morse_card.html 必須包含 KOCH_SEQUENCE 定義');
assert.ok(initPos > 0, 'prototype_morse_card.html 必須包含初始化註解');
assert.ok(dataBlockPos < initPos, `KOCH_SEQUENCE 定義 (index: ${dataBlockPos}) 必須位於初始化 (index: ${initPos}) 之前以避免 TDZ ReferenceError`);
console.log('   -> prototype_morse_card.html 常量載入順序 TDZ 防護驗證通過！');

// ----------------------------------------------------
// 7. ADR 0001 (Zero Unicode Emoji) 嚴格合規檢查
// ----------------------------------------------------
console.log('7. 驗證 ADR 0001 (Zero Unicode Emoji)...');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

[
  { name: 'js/core/qso-manager.js', content: qsoManagerSrc },
  { name: 'js/ui/qso-mode.js', content: qsoModeSrc },
  { name: 'prototype_morse_card.html (新更動段落)', content: protoHtml.slice(protoHtml.indexOf('class QsoManager'), protoHtml.indexOf('class QsoMode') + 4000) }
].forEach(({ name, content }) => {
  const match = content.match(emojiRegex);
  assert.strictEqual(match, null, `${name} 不得包含 Unicode Emoji 字符！發現: ${match ? match[0] : ''}`);
  console.log(`   -> ${name} ADR 0001 零 Emoji 檢查通過！`);
});

console.log('\n=== All Issue #65 Test Assertions Passed! (100%) ===\n');
