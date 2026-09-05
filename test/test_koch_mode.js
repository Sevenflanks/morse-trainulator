const fs = require('fs');

const html = fs.readFileSync('prototype_morse_card.html', 'utf8');

// 1. Verify HTML DOM elements existence
const requiredElements = [
  'id="tab-mode-koch"',
  'id="koch-mode-container"',
  'id="koch-stage-badge"',
  'id="koch-stage-select"',
  'id="btn-reset-koch"',
  'id="koch-mastery-text"',
  'id="koch-mastery-bar"',
  'id="koch-target-char"',
  'id="koch-target-seq"',
  'id="btn-koch-target-listen"',
  'id="koch-pool-text"',
  'id="btn-start-koch-drill"',
  'id="koch-drill-panel"',
  'id="koch-progress-badge"',
  'id="koch-passage-container"',
  'id="koch-scorecard"',
  'id="koch-sc-title"',
  'id="koch-sc-total"',
  'id="koch-sc-correct"',
  'id="koch-sc-errors"',
  'id="koch-sc-accuracy"',
  'id="koch-sc-desc"',
  'id="btn-koch-retry"',
  'id="btn-koch-next-stage"'
];

for (const el of requiredElements) {
  if (!html.includes(el)) {
    throw new Error(`Missing required element: ${el}`);
  }
}

// 2. Verify CSS classes
const requiredCss = [
  '.node-group.koch-locked',
  '.node-group.koch-unlocked',
  '.node-group.koch-target-node',
  '.number-chip.koch-locked',
  '.number-chip.koch-unlocked',
  '.number-chip.koch-target-node',
  '.mode-tab-btn.active-koch'
];

for (const css of requiredCss) {
  if (!html.includes(css)) {
    throw new Error(`Missing required CSS rule: ${css}`);
  }
}

// 3. Extract script and test Koch sequence & manager logic
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('No script found');

const code = scriptMatch[1];

// Mock environment
const localStorageMock = {
  _store: {},
  getItem: function(key) { return this._store[key] || null; },
  setItem: function(key, val) { this._store[key] = val.toString(); },
  clear: function() { this._store = {}; }
};

const mockScope = `
  const localStorage = ${JSON.stringify(localStorageMock)};
  localStorage.getItem = ${localStorageMock.getItem.toString()};
  localStorage.setItem = ${localStorageMock.setItem.toString()};
  localStorage.clear = ${localStorageMock.clear.toString()};

  // Extract KOCH_SEQUENCE and KochManager
  ${code.substring(
    code.indexOf('const KOCH_SEQUENCE = ['),
    code.indexOf('const kochManager = new KochManager();')
  )}

  // Test 1: Sequence completeness
  if (KOCH_SEQUENCE.length !== 36) {
    throw new Error('KOCH_SEQUENCE length must be 36, got: ' + KOCH_SEQUENCE.length);
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (const letter of alphabet) {
    if (!KOCH_SEQUENCE.includes(letter)) {
      throw new Error('Missing alphabet letter in KOCH_SEQUENCE: ' + letter);
    }
  }

  const digits = '0123456789'.split('');
  for (const digit of digits) {
    if (!KOCH_SEQUENCE.includes(digit)) {
      throw new Error('Missing digit in KOCH_SEQUENCE: ' + digit);
    }
  }

  // Test 2: KochManager initial state
  const km = new KochManager();
  if (km.currentLevel !== 1) throw new Error('Initial level must be 1');
  const pool1 = km.getUnlockedPool(1);
  if (pool1.length !== 2 || pool1[0] !== 'K' || pool1[1] !== 'M') {
    throw new Error('Level 1 pool must be [K, M], got: ' + JSON.stringify(pool1));
  }
  if (km.getTargetChar(1) !== 'M') {
    throw new Error('Level 1 target char must be M');
  }

  // Test 3: Drill generation
  const drill = km.generateDrill(10);
  if (drill.length !== 10) throw new Error('Drill length must be 10');
  for (const c of drill) {
    if (!pool1.includes(c)) throw new Error('Drill produced character outside pool: ' + c);
  }

  // Test 4: Level 35 (max)
  const pool35 = km.getUnlockedPool(35);
  if (pool35.length !== 36) throw new Error('Level 35 pool must have all 36 characters');
  if (km.getTargetChar(35) !== 'X') throw new Error('Level 35 target must be X');

  // Test 5: Progress persistence
  km.maxUnlockedLevel = 5;
  km.saveProgress();
  if (localStorage.getItem('morse_koch_stage') !== '5') {
    throw new Error('Persistence save failed');
  }

  const km2 = new KochManager();
  if (km2.maxUnlockedLevel !== 5) {
    throw new Error('Persistence load failed, got: ' + km2.maxUnlockedLevel);
  }

  km2.resetProgress();
  if (km2.maxUnlockedLevel !== 1 || localStorage.getItem('morse_koch_stage') !== '1') {
    throw new Error('Reset progress failed');
  }

  console.log('All Koch logic and sequence unit tests passed successfully!');
`;

eval(mockScope);
console.log('All Koch Method DOM, CSS, and Logic verifications passed!');

