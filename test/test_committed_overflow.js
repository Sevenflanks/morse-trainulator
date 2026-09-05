const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('--- Testing Committed Output Layout & Anti-Overflow Protection ---');

// 1. Verify CSS styles in css/controls.css
console.log('1. Checking css/controls.css...');
const controlsCss = fs.readFileSync(path.resolve(process.cwd(), 'css/controls.css'), 'utf8');

assert(controlsCss.includes('min-width: 0;'), 'controls.css .state-item must include min-width: 0;');
assert(controlsCss.includes('white-space: nowrap;'), 'controls.css .state-val must include white-space: nowrap;');
assert(controlsCss.includes('overflow-x: auto;'), 'controls.css .state-val must include overflow-x: auto;');
assert(controlsCss.includes('scrollbar-width: none;'), 'controls.css must hide scrollbar via scrollbar-width: none;');
assert(controlsCss.includes('.state-val::-webkit-scrollbar'), 'controls.css must hide webkit scrollbar;');
console.log('   -> controls.css anti-overflow styles verified!');

// 2. Verify CSS styles in prototype_morse_card.html
console.log('2. Checking prototype_morse_card.html CSS...');
const protoHtml = fs.readFileSync(path.resolve(process.cwd(), 'prototype_morse_card.html'), 'utf8');

assert(protoHtml.includes('min-width: 0;'), 'prototype .state-item must include min-width: 0;');
assert(protoHtml.includes('white-space: nowrap;'), 'prototype .state-val must include white-space: nowrap;');
assert(protoHtml.includes('overflow-x: auto;'), 'prototype .state-val must include overflow-x: auto;');
assert(protoHtml.includes('scrollbar-width: none;'), 'prototype must hide scrollbar via scrollbar-width: none;');
console.log('   -> prototype_morse_card.html anti-overflow styles verified!');

// 3. Verify HTML structure for clear button and initial placeholder
console.log('3. Checking index.html and prototype_morse_card.html DOM structure...');
const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

assert(indexHtml.includes('id="btn-clear-committed"'), 'index.html must have #btn-clear-committed');
assert(indexHtml.includes('id="state-committed" style="color: var(--gold-light);">—</div>'), 'index.html #state-committed must initialize with —');
assert(protoHtml.includes('id="btn-clear-committed"'), 'prototype must have #btn-clear-committed');
assert(protoHtml.includes('id="state-committed" style="color: var(--gold-light);">—</div>'), 'prototype #state-committed must initialize with —');
console.log('   -> DOM structure verified!');

// 4. Test renderCommittedText and updateCommittedView in free-mode.js
console.log('4. Testing free-mode.js logic...');
const { renderCommittedText, updateCommittedView, setupCommittedClear } = require(path.resolve(process.cwd(), 'js/ui/free-mode.js'));

// Mock DOM & global engine
global.window = global;
global.engine = {
  committedLetters: []
};

const mockCommittedEl = {
  textContent: '',
  title: '',
  scrollWidth: 800,
  scrollLeft: 0
};
const mockClearBtn = {
  style: { display: 'none' }
};
let _evalHtml = '';
let _evalText = '';
const mockEvalStatus = {
  get innerHTML() { return _evalHtml || _evalText; },
  set innerHTML(v) { _evalHtml = v; _evalText = String(v).replace(/<[^>]+>/g, ''); },
  get textContent() { return _evalText; },
  set textContent(v) { _evalText = String(v); },
  style: {}
};

let clearHandler = null;
global.document = {
  getElementById(id) {
    if (id === 'state-committed') return mockCommittedEl;
    if (id === 'btn-clear-committed') return mockClearBtn;
    if (id === 'eval-status') return mockEvalStatus;
    return null;
  }
};
mockClearBtn.addEventListener = (evt, fn) => {
  if (evt === 'click') clearHandler = fn;
};

// A. Empty state
assert.strictEqual(renderCommittedText(), '—');
updateCommittedView();
assert.strictEqual(mockCommittedEl.textContent, '—');
assert.strictEqual(mockClearBtn.style.display, 'none');

// B. Long text (simulating user screenshot: R K E I I I I I III XRRSRRRIIIIIIIIISIIIISIIII5)
global.engine.committedLetters = 'R K E I I I I I III XRRSRRRIIIIIIIIISIIIISIIII5'.split('');
const text = renderCommittedText();
assert.strictEqual(text, 'R K E I I I I I III XRRSRRRIIIIIIIIISIIIISIIII5');
assert(!text.includes('\n'), 'Text must not contain line breaks');

updateCommittedView();
assert.strictEqual(mockCommittedEl.textContent, text);
assert.strictEqual(mockCommittedEl.title, text);
assert.strictEqual(mockCommittedEl.scrollLeft, 800, 'Must auto-scroll to end (scrollLeft === scrollWidth)');
assert.strictEqual(mockClearBtn.style.display, 'inline-block', 'Clear button must be visible when text exists');

// C. Test Clear button click
setupCommittedClear(global.engine);
assert(clearHandler, 'Clear click handler must be registered');
clearHandler({ stopPropagation() {} });

assert.deepStrictEqual(global.engine.committedLetters, []);
assert.strictEqual(mockCommittedEl.textContent, '—');
assert(mockEvalStatus.textContent.includes('已清除送出文字'), 'Must report cleared text');
assert(mockEvalStatus.innerHTML.includes('mdi-delete-sweep'), 'Must use mdi-delete-sweep icon');
console.log('   -> free-mode.js logic passed all checks!');

console.log('========================================');
console.log('All Committed Output Anti-Overflow Tests Passed 100% (Exit 0)!');
console.log('========================================');

