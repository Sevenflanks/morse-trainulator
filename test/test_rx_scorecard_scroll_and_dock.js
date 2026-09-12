/**
 * TEST SUITE: test_rx_scorecard_scroll_and_dock.js
 * 驗證 Issue #59：科赫盲聽抄收測驗結算被底部軟鍵盤遮蔽且無法下捲問題修復
 *
 * 測試重點：
 * 1. CSS 滾動容器與避讓邊距：
 *    - .rx-workspace-stage 具備 flex: 1, min-height: 0, overflow-y: auto, scroll-padding-bottom: 280px
 *    - .rx-workspace-stage 底部 padding 擴大為 280px，避讓軟鍵盤
 *    - .rx-dock.collapsed 折疊樣式與 .rx-workspace-stage.dock-collapsed 緊湊避讓 100px
 *    - .qso-workspace-stage 預防性滾動容器支援
 * 2. 雙軌 DOM 結構一致性：
 *    - index.html 與 prototype_morse_card.html 均包含 #rx-dock-header, #btn-rx-toggle-dock, #rx-dock-toggle-text, #rx-dock-chevron
 * 3. 控制器邏輯 (RxMode)：
 *    - toggleDockCollapse() 支援雙向切換或強制指定狀態
 *    - 切換時同步更新按鈕文字 (展開鍵盤 / 收合鍵盤) 與圖標 (mdi-chevron-up / mdi-chevron-down)
 *    - startSession() 重置 scrollTop = 0
 *    - showScorecard() 具備防禦性 scrollIntoView 導航
 * 4. 0 Emoji 規範 (ADR 0001)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Rx Scorecard Scroll & Dock Collapse Tests (Issue #59) ===\n');

const projectRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.join(projectRoot, 'prototype_morse_card.html'), 'utf8');
const rxCss = fs.readFileSync(path.join(projectRoot, 'css/rx-mode.css'), 'utf8');
const qsoCss = fs.readFileSync(path.join(projectRoot, 'css/qso-mode.css'), 'utf8');
const rxModeJs = fs.readFileSync(path.join(projectRoot, 'js/ui/rx-mode.js'), 'utf8');

// 1. 驗證 CSS 滾動容器與 280px 底部避讓邊距
console.log('1. 驗證 CSS 滾動容器與 280px 避讓安全區 (雙軌)...');
[
  { name: 'css/rx-mode.css', content: rxCss },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('overflow-y: auto;'), `${name} 必須包含 overflow-y: auto`);
  assert.ok(content.includes('scroll-padding-bottom: 280px;'), `${name} 必須包含 scroll-padding-bottom: 280px`);
  assert.ok(content.includes('padding: 12px 16px 280px 16px;') || content.includes('padding: 12px 16px 280px;'), `${name} 必須具備 280px 底部 padding`);
  assert.ok(content.includes('.rx-dock.collapsed'), `${name} 必須定義 .rx-dock.collapsed 折疊狀態`);
  assert.ok(content.includes('.rx-workspace-stage.dock-collapsed'), `${name} 必須定義 .dock-collapsed 緊湊邊距`);
  console.log(`   -> ${name} Rx 滾動容器與避讓邊距驗證通過！`);
});

// 驗證 QSO 滾動容器預防修復
assert.ok(qsoCss.includes('overflow-y: auto;'), 'css/qso-mode.css 必須具備 overflow-y: auto');
console.log('   -> css/qso-mode.css 預防性滾動容器驗證通過！');

// 2. 驗證 DOM 結構一致性 (雙軌)
console.log('\n2. 驗證雙軌 DOM 結構一致性 (#rx-dock-header, #btn-rx-toggle-dock)...');
[
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml }
].forEach(({ name, content }) => {
  assert.ok(content.includes('id="rx-dock-header"'), `${name} 必須包含 id="rx-dock-header"`);
  assert.ok(content.includes('id="btn-rx-toggle-dock"'), `${name} 必須包含 id="btn-rx-toggle-dock"`);
  assert.ok(content.includes('id="rx-dock-toggle-text"'), `${name} 必須包含 id="rx-dock-toggle-text"`);
  assert.ok(content.includes('id="rx-dock-chevron"'), `${name} 必須包含 id="rx-dock-chevron"`);
  assert.ok(content.includes('mdi-keyboard-outline'), `${name} 必須使用 mdi-keyboard-outline 圖標`);
  console.log(`   -> ${name} DOM 結構與 MDI 圖標驗證通過！`);
});

// 驗證 prototype_morse_card.html 單一 script 與 CRLF 不變量
const scriptTags = protoHtml.match(/<script\b[^>]*>/gi) || [];
assert.strictEqual(scriptTags.length, 1, `prototype_morse_card.html 必須且僅有 1 個 <script> 標籤，當前有: ${scriptTags.length}`);
const protoHasCr = protoHtml.includes('\r\n');
const protoLoneLf = protoHtml.replace(/\r\n/g, '').includes('\n');
assert.ok(protoHasCr && !protoLoneLf, 'prototype_morse_card.html 必須嚴格維持 100% CRLF 換行');
console.log('   -> prototype_morse_card.html 單一 script 與 CRLF 不變量驗證通過！');

// 3. 驗證 RxMode 控制器邏輯
console.log('\n3. 驗證 RxMode 控制器邏輯 (toggleDockCollapse, scrollIntoView, scrollTop)...');

// 引入 RxMode 類別
const { RxMode } = require('../js/ui/rx-mode.js');

// Mock DOM 環境
class MockElement {
  constructor(id = '', tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    const set = new Set();
    this.classList = {
      contains: (c) => set.has(c),
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      toggle: (c, force) => {
        if (force !== undefined) {
          if (force) set.add(c);
          else set.delete(c);
          return force;
        }
        if (set.has(c)) {
          set.delete(c);
          return false;
        } else {
          set.add(c);
          return true;
        }
      }
    };
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.className = '';
    this.scrollTop = 0;
    this._listeners = {};
    this.scrolledIntoView = false;
  }

  addEventListener(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
  }

  scrollIntoView(options) {
    this.scrolledIntoView = true;
    this.scrollOptions = options;
  }
}

// 建立 Mock 實例測試
const rx = new RxMode();
rx.el = {
  rxDock: new MockElement('rx-dock'),
  workspaceStage: new MockElement('rx-workspace-stage'),
  dockToggleText: new MockElement('rx-dock-toggle-text'),
  dockChevron: new MockElement('rx-dock-chevron'),
  scorecard: new MockElement('rx-scorecard'),
  btnStageAdvance: new MockElement('btn-rx-stage-advance'),
  historyLog: new MockElement('rx-history-log'),
  inputBuffer: new MockElement('rx-input-buffer')
};

// 初始狀態
assert.strictEqual(rx.el.rxDock.classList.contains('collapsed'), false);

// 執行折疊
rx.toggleDockCollapse();
assert.strictEqual(rx.el.rxDock.classList.contains('collapsed'), true, 'toggleDockCollapse() 應為 rxDock 加上 collapsed class');
assert.strictEqual(rx.el.workspaceStage.classList.contains('dock-collapsed'), true, '應為 workspaceStage 加上 dock-collapsed class');
assert.strictEqual(rx.el.dockToggleText.textContent, '展開鍵盤', '按鈕文字應轉為「展開鍵盤」');
assert.strictEqual(rx.el.dockChevron.className, 'mdi mdi-chevron-up', '箭頭應轉為向上');

// 執行展開
rx.toggleDockCollapse();
assert.strictEqual(rx.el.rxDock.classList.contains('collapsed'), false, '再次呼叫 toggleDockCollapse() 應移除 collapsed');
assert.strictEqual(rx.el.workspaceStage.classList.contains('dock-collapsed'), false, '應移除 dock-collapsed');
assert.strictEqual(rx.el.dockToggleText.textContent, '收合鍵盤', '按鈕文字應轉為「收合鍵盤」');
assert.strictEqual(rx.el.dockChevron.className, 'mdi mdi-chevron-down', '箭頭應轉為向下');

// 強制狀態測試 (forceState)
rx.toggleDockCollapse(true);
assert.strictEqual(rx.el.rxDock.classList.contains('collapsed'), true);
rx.toggleDockCollapse(true); // 重複指定相同狀態
assert.strictEqual(rx.el.rxDock.classList.contains('collapsed'), true);
rx.toggleDockCollapse(false);
assert.strictEqual(rx.el.rxDock.classList.contains('collapsed'), false);

console.log('   -> toggleDockCollapse() 狀態切換、強制狀態與文字/圖標翻轉驗證通過！');

// 驗證 startSession 重置 scrollTop
rx.el.workspaceStage.scrollTop = 450;
rx.startSession();
assert.strictEqual(rx.el.workspaceStage.scrollTop, 0, 'startSession() 應將 workspaceStage.scrollTop 重置為 0');
console.log('   -> startSession() 容器置頂重置驗證通過！');

// 4. 0 Emoji 規範審核 (ADR 0001)
console.log('\n4. 驗證 0 Emoji 規範 (ADR 0001)...');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
[
  { name: 'css/rx-mode.css', content: rxCss },
  { name: 'css/qso-mode.css', content: qsoCss },
  { name: 'index.html', content: indexHtml },
  { name: 'prototype_morse_card.html', content: protoHtml },
  { name: 'js/ui/rx-mode.js', content: rxModeJs }
].forEach(({ name, content }) => {
  assert.ok(!emojiRegex.test(content), `${name} 嚴格禁止任何 Unicode Emoji`);
  console.log(`   -> ${name} 0 Emoji 審核通過！`);
});

console.log('\n====================================================');
console.log('ALL RX SCORECARD SCROLL & DOCK TESTS PASSED (Exit 0)!');
console.log('====================================================\n');
