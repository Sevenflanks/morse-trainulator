/**
 * TEST SUITE: test_qsl_card_renderer.js
 * 驗證 QSL 通聯確認卡渲染引擎 (QslCardRenderer)、三款主題風格、雙軌同步與 ADR 0001 無 Emoji 規範
 * (100% Zero External Dependencies, file:/// Compatible)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('Testing QSL Card Renderer, Logbook Actions & Dual-Track Sync');
console.log('====================================================');

const { QslCardRenderer } = require('../js/ui/qsl-card-renderer.js');
const { QsoMode } = require('../js/ui/qso-mode.js');
const { QsoLogManager } = require('../js/core/qso-log-manager.js');

// ----------------------------------------------------
// Mock Canvas 2D Context for Zero-Dependency Testing
// ----------------------------------------------------
function createMockCanvas(width = 1200, height = 800) {
  const calls = [];
  const textCalls = [];

  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    shadowColor: '',
    shadowBlur: 0,
    letterSpacing: '0px',
    createLinearGradient: (x0, y0, x1, y1) => {
      calls.push({ method: 'createLinearGradient', args: [x0, y0, x1, y1] });
      return {
        addColorStop: (offset, color) => {
          calls.push({ method: 'addColorStop', offset, color });
        }
      };
    },
    fillRect: (x, y, w, h) => calls.push({ method: 'fillRect', x, y, w, h }),
    strokeRect: (x, y, w, h) => calls.push({ method: 'strokeRect', x, y, w, h }),
    beginPath: () => calls.push({ method: 'beginPath' }),
    closePath: () => calls.push({ method: 'closePath' }),
    moveTo: (x, y) => calls.push({ method: 'moveTo', x, y }),
    lineTo: (x, y) => calls.push({ method: 'lineTo', x, y }),
    arc: (x, y, r, sa, ea) => calls.push({ method: 'arc', x, y, r, sa, ea }),
    stroke: () => calls.push({ method: 'stroke' }),
    fill: () => calls.push({ method: 'fill' }),
    save: () => calls.push({ method: 'save' }),
    restore: () => calls.push({ method: 'restore' }),
    translate: (x, y) => calls.push({ method: 'translate', x, y }),
    rotate: (angle) => calls.push({ method: 'rotate', angle }),
    setLineDash: (segments) => calls.push({ method: 'setLineDash', segments }),
    fillText: (text, x, y) => {
      calls.push({ method: 'fillText', text, x, y });
      textCalls.push(text);
    }
  };

  const canvas = {
    width,
    height,
    getContext: (type) => (type === '2d' ? ctx : null),
    toDataURL: (type) => `data:${type};base64,mockCanvasData`,
    toBlob: (cb, type) => {
      cb({ type: type || 'image/png', size: 1024 });
    }
  };

  return { canvas, ctx, calls, textCalls };
}

// ----------------------------------------------------
// 1. QslCardRenderer Domain & Themes Unit Tests
// ----------------------------------------------------
console.log('\n1. Verifying QslCardRenderer Class & 3 Classic Themes...');

const renderer = new QslCardRenderer();
assert.strictEqual(renderer.width, 1200, 'Default width must be 1200px (3:2 postcard)');
assert.strictEqual(renderer.height, 800, 'Default height must be 800px (3:2 postcard)');

// Test normalize data
const sampleData = {
  myCall: 'bv2tt',
  dxCall: 'ja1abc',
  band: '40m',
  freq: '7.025',
  rstSent: '579',
  rstRcvd: '599',
  myName: 'eddie',
  dxName: 'ken',
  myQth: 'taipei',
  dxQth: 'tokyo'
};
const norm = renderer._normalizeData(sampleData);
assert.strictEqual(norm.myCall, 'BV2TT', 'myCall normalized to uppercase');
assert.strictEqual(norm.dxCall, 'JA1ABC', 'dxCall normalized to uppercase');
assert.strictEqual(norm.band, '40M', 'band normalized to uppercase');
assert.strictEqual(norm.mode, 'CW', 'default mode is CW');

// Test Theme 1: Cyber Brass
{
  const { canvas, textCalls } = createMockCanvas();
  renderer.render(canvas, sampleData, 'cyber-brass');
  assert.ok(textCalls.some(t => t.includes('BV2TT')), 'Cyber brass includes my callsign');
  assert.ok(textCalls.some(t => t.includes('JA1ABC')), 'Cyber brass includes dx callsign');
  assert.ok(textCalls.some(t => t.includes('MORSE TRAINULATOR')), 'Cyber brass includes branding');
  assert.ok(textCalls.some(t => t.includes('2-WAY CW')), 'Cyber brass includes 2-WAY CW');
}

// Test Theme 2: Vintage Telegraph
{
  const { canvas, textCalls } = createMockCanvas();
  renderer.render(canvas, sampleData, 'vintage-telegraph');
  assert.ok(textCalls.some(t => t.includes('BV2TT')), 'Vintage telegraph includes my callsign');
  assert.ok(textCalls.some(t => t.includes('JA1ABC')), 'Vintage telegraph includes dx callsign');
  assert.ok(textCalls.some(t => t.includes('INTERNATIONAL POSTAL & TELEGRAPH ADMINISTRATION')), 'Vintage telegraph includes header');
  assert.ok(textCalls.some(t => t.includes('CONFIRMED')), 'Vintage telegraph includes postal stamp');
}

// Test Theme 3: Classic ARRL
{
  const { canvas, textCalls } = createMockCanvas();
  renderer.render(canvas, sampleData, 'classic-arrl');
  assert.ok(textCalls.some(t => t.includes('BV2TT')), 'Classic ARRL includes my callsign');
  assert.ok(textCalls.some(t => t.includes('JA1ABC')), 'Classic ARRL includes dx callsign');
  assert.ok(textCalls.some(t => t.includes('AMATEUR RADIO STATION')), 'Classic ARRL includes header');
  assert.ok(textCalls.some(t => t.includes('CW (A1A)')), 'Classic ARRL includes emission mode');
}

// Test export utilities
{
  const { canvas } = createMockCanvas();
  const url = renderer.toDataURL(canvas);
  assert.ok(url.startsWith('data:image/png;base64,'), 'toDataURL returns valid data URI');

  renderer.toBlob(canvas).then(blob => {
    assert.ok(blob !== null, 'toBlob returns valid blob');
    assert.strictEqual(blob.type, 'image/png', 'blob type is image/png');
  });
}
console.log('-> QslCardRenderer domain & theme rendering passed!');

// ----------------------------------------------------
// 2. QsoMode Integration Tests with QSL Modal & Logbook
// ----------------------------------------------------
console.log('\n2. Verifying QsoMode QSL Card Modal & Logbook Actions...');

const mockStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const logManager = new QsoLogManager(mockStorage);
const logEntry = logManager.addLog({
  dxCall: 'VR2X',
  rstSent: '599',
  rstRcvd: '589',
  name: 'ALAN',
  qth: 'HONG KONG',
  band: '20M',
  freq: '14.025'
});

const qsoMode = new QsoMode({
  qsoLogManager: logManager,
  qslRenderer: renderer
});

// Setup mock DOM elements for QsoMode
global.document = {
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    innerHTML: '',
    style: {},
    addEventListener: () => {}
  })
};

const mockChildren = [];
const mockTbody = {
  innerHTML: '',
  appendChild: (child) => mockChildren.push(child),
  querySelectorAll: () => []
};

const mockModal = { style: { display: 'none' } };
const mockBackdrop = { style: { display: 'none' } };
const mockPillCyber = {
  getAttribute: () => 'cyber-brass',
  classList: { toggle: (cls, val) => {} }
};
const mockPillVintage = {
  getAttribute: () => 'vintage-telegraph',
  classList: { toggle: (cls, val) => {} }
};
const { canvas: mockCanvas } = createMockCanvas();

qsoMode.el = {
  logbookTbody: mockTbody,
  logbookEmpty: { style: { display: 'none' } },
  qslModal: mockModal,
  qslModalBackdrop: mockBackdrop,
  qslCanvas: mockCanvas,
  qslThemePills: [mockPillCyber, mockPillVintage],
  btnQslCopy: { innerHTML: '', style: {} },
  btnQslDownload: { innerHTML: '' }
};

// Test renderLogbook includes QSL and delete buttons in tr markup
qsoMode.renderLogbook();
assert.strictEqual(mockChildren.length, 1, 'One row in logbook table');
assert.ok(mockChildren[0].innerHTML.includes('btn-view-qsl'), 'Row HTML includes btn-view-qsl');
assert.ok(mockChildren[0].innerHTML.includes('btn-del-log'), 'Row HTML includes btn-del-log');
assert.ok(mockChildren[0].innerHTML.includes('VR2X'), 'Row HTML includes dxCall VR2X');

// Test opening QSL modal via method
qsoMode.openQslModal(logEntry);
assert.strictEqual(mockModal.style.display, 'flex', 'Modal displayed after openQslModal');
assert.strictEqual(mockBackdrop.style.display, 'block', 'Backdrop displayed after openQslModal');
assert.strictEqual(qsoMode.activeQslData.dxCall, 'VR2X', 'Active QSL data callsign matched');

// Test theme switching
qsoMode.setQslTheme('vintage-telegraph');
assert.strictEqual(qsoMode.currentQslTheme, 'vintage-telegraph', 'Theme changed to vintage-telegraph');

// Test closing QSL modal
qsoMode.closeQslModal();
assert.strictEqual(mockModal.style.display, 'none', 'Modal hidden after closeQslModal');
assert.strictEqual(mockBackdrop.style.display, 'none', 'Backdrop hidden after closeQslModal');

console.log('-> QsoMode QSL modal integration & logbook actions passed!');

// ----------------------------------------------------
// 3. Dual-Track HTML & CSS Synchronization Verification
// ----------------------------------------------------
console.log('\n3. Verifying Dual-Track Architecture Synchronization...');

const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.resolve(__dirname, '../prototype_morse_card.html'), 'utf8');
const qsoCss = fs.readFileSync(path.resolve(__dirname, '../css/qso-mode.css'), 'utf8');

// Check modal presence in both tracks
assert.ok(indexHtml.includes('id="qsl-modal"'), 'index.html contains #qsl-modal');
assert.ok(protoHtml.includes('id="qsl-modal"'), 'prototype_morse_card.html contains #qsl-modal');
assert.ok(indexHtml.includes('id="qsl-modal-backdrop"'), 'index.html contains #qsl-modal-backdrop');
assert.ok(protoHtml.includes('id="qsl-modal-backdrop"'), 'prototype_morse_card.html contains #qsl-modal-backdrop');

// Check canvas in both tracks
assert.ok(indexHtml.includes('id="qsl-card-canvas"'), 'index.html contains #qsl-card-canvas');
assert.ok(protoHtml.includes('id="qsl-card-canvas"'), 'prototype_morse_card.html contains #qsl-card-canvas');

// Check theme pills in both tracks
['cyber-brass', 'vintage-telegraph', 'classic-arrl'].forEach(theme => {
  assert.ok(indexHtml.includes(`data-qsl-theme="${theme}"`), `index.html contains ${theme} theme pill`);
  assert.ok(protoHtml.includes(`data-qsl-theme="${theme}"`), `prototype_morse_card.html contains ${theme} theme pill`);
});

// Check download and copy buttons
assert.ok(indexHtml.includes('id="btn-qsl-download"'), 'index.html contains #btn-qsl-download');
assert.ok(protoHtml.includes('id="btn-qsl-download"'), 'prototype_morse_card.html contains #btn-qsl-download');
assert.ok(indexHtml.includes('id="btn-qsl-copy"'), 'index.html contains #btn-qsl-copy');
assert.ok(protoHtml.includes('id="btn-qsl-copy"'), 'prototype_morse_card.html contains #btn-qsl-copy');

// Check CSS modal classes in both tracks
['.qsl-modal-backdrop', '.qsl-modal', '.qsl-theme-bar', '.qsl-canvas-wrapper', '#qsl-card-canvas'].forEach(cls => {
  assert.ok(qsoCss.includes(cls), `qso-mode.css contains ${cls}`);
  assert.ok(protoHtml.includes(cls), `prototype_morse_card.html contains ${cls}`);
});

// Check table header has 操作 in both tracks
assert.ok(indexHtml.includes('<th>操作</th>'), 'index.html logbook header contains <th>操作</th>');
assert.ok(protoHtml.includes('<th>操作</th>'), 'prototype_morse_card.html logbook header contains <th>操作</th>');

// Check prototype single-script invariant
const scriptTags = protoHtml.match(/<script\b[^>]*>/gi) || [];
assert.strictEqual(scriptTags.length, 1, `prototype_morse_card.html must have exactly 1 <script> tag, found: ${scriptTags.length}`);

// Check prototype CRLF invariant
const protoHasCr = protoHtml.includes('\r\n');
const protoLoneLf = protoHtml.replace(/\r\n/g, '').includes('\n');
assert.ok(protoHasCr && !protoLoneLf, 'prototype_morse_card.html strictly adheres to CRLF line endings');

console.log('-> Dual-Track synchronization verified!');

// ----------------------------------------------------
// 4. ADR 0001: Zero Unicode Emoji Standard
// ----------------------------------------------------
console.log('\n4. Verifying ADR 0001 Zero-Emoji Standards...');

// Common emoji / special symbol regex
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

const rendererCode = fs.readFileSync(path.resolve(__dirname, '../js/ui/qsl-card-renderer.js'), 'utf8');
const qsoModeCode = fs.readFileSync(path.resolve(__dirname, '../js/ui/qso-mode.js'), 'utf8');

assert.strictEqual(emojiRegex.test(rendererCode), false, 'js/ui/qsl-card-renderer.js must have ZERO emojis');
assert.strictEqual(emojiRegex.test(qsoModeCode), false, 'js/ui/qso-mode.js must have ZERO emojis');

// Verify MDI icons used in QSL modal DOM
assert.ok(indexHtml.includes('mdi mdi-card-account-details'), 'Modal uses mdi-card-account-details');
assert.ok(indexHtml.includes('mdi mdi-download'), 'Modal uses mdi-download');
assert.ok(indexHtml.includes('mdi mdi-content-copy'), 'Modal uses mdi-content-copy');

console.log('-> ADR 0001 Zero-Emoji verification passed 100%!');
console.log('\nALL 4 TEST SECTIONS PASSED SUCCESSFULLY!\n');
