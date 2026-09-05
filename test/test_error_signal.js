const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('--- Testing Error Signal <HH> (........) & Word Cancellation ---');

// 1. Test MorseEngine tree structure & 8 Dits
const { MorseEngine } = require(path.resolve(process.cwd(), 'js/core/morse-engine.js'));
const engine = new MorseEngine();

console.log('1. Checking MorseEngine tree nodes for 6~8 dits...');
assert(engine.tree['......'], 'Intermediate node ...... must exist in tree');
assert.strictEqual(engine.tree['......'].letter, null, '...... should not have a letter');
assert.strictEqual(engine.tree['......'].parent, '.....');

assert(engine.tree['.......'], 'Intermediate node ....... must exist in tree');
assert.strictEqual(engine.tree['.......'].letter, null, '....... should not have a letter');
assert.strictEqual(engine.tree['.......'].parent, '......');

assert(engine.tree['........'], 'Node ........ must exist in tree');
assert.strictEqual(engine.tree['........'].letter, '<HH>', '........ letter must be <HH>');
assert.strictEqual(engine.tree['........'].name, 'Error / Correction', '........ name must be Error / Correction');
assert.strictEqual(engine.tree['........'].parent, '.......');
console.log('   -> Tree node hierarchy passed!');

console.log('2. Testing sequential append of 8 Dits...');
engine.reset();
for (let i = 1; i <= 8; i++) {
  const r = engine.appendSymbol('.', 80);
  assert.strictEqual(r.isValid, true, `Dit ${i} should be valid`);
  if (i < 8) {
    if (i <= 5) {
      assert(r.letter !== null, `Dit ${i} has assigned character`);
    } else {
      assert.strictEqual(r.letter, null, `Dit ${i} is intermediate locator node`);
    }
  } else {
    assert.strictEqual(r.letter, '<HH>', 'Dit 8 resolves to <HH>');
  }
}
console.log('   -> 8 Dits appending test passed!');

console.log('3. Testing eraseLastWord() boundary behaviors...');
// Scenario A: Single word
engine.committedLetters = ['H', 'E', 'L', 'L', 'O'];
let erased = engine.eraseLastWord();
assert.deepStrictEqual(erased, ['H', 'E', 'L', 'L', 'O'], 'Should erase full single word HELLO');
assert.deepStrictEqual(engine.committedLetters, [], 'committedLetters should be empty');

// Scenario B: Multiple words
engine.committedLetters = ['C', 'Q', ' ', 'D', 'E'];
erased = engine.eraseLastWord();
assert.deepStrictEqual(erased, ['D', 'E'], 'Should erase only the last word DE');
assert.deepStrictEqual(engine.committedLetters, ['C', 'Q', ' '], 'Previous word CQ and space should be preserved');

// Scenario C: Multiple words with trailing space (e.g. 7T gap already pushed space)
engine.committedLetters = ['C', 'Q', ' ', 'D', 'E', ' '];
erased = engine.eraseLastWord();
assert.deepStrictEqual(erased, ['D', 'E'], 'Should strip trailing space and erase word DE');
assert.deepStrictEqual(engine.committedLetters, ['C', 'Q', ' '], 'Previous word CQ and space should be preserved');

// Scenario D: Empty committed
engine.committedLetters = [];
erased = engine.eraseLastWord();
assert.deepStrictEqual(erased, [], 'Erasing empty should return []');
assert.deepStrictEqual(engine.committedLetters, []);

// Scenario E: Only spaces
engine.committedLetters = [' ', ' '];
erased = engine.eraseLastWord();
assert.deepStrictEqual(erased, [], 'Erasing only spaces should return []');
assert.deepStrictEqual(engine.committedLetters, []);
console.log('   -> eraseLastWord() all edge cases passed!');

console.log('4. Testing full workflow with commitCurrentSequence()...');
engine.reset();
engine.committedLetters = [];

// Spell S-O-S
engine.appendSymbol('.', 80); engine.appendSymbol('.', 80); engine.appendSymbol('.', 80);
assert.strictEqual(engine.commitCurrentSequence().letter, 'S');

engine.appendSymbol('-', 240); engine.appendSymbol('-', 240); engine.appendSymbol('-', 240);
assert.strictEqual(engine.commitCurrentSequence().letter, 'O');

engine.appendSymbol('.', 80); engine.appendSymbol('.', 80); engine.appendSymbol('.', 80);
assert.strictEqual(engine.commitCurrentSequence().letter, 'S');

assert.deepStrictEqual(engine.committedLetters, ['S', 'O', 'S']);

// Send Error Signal: 8 Dits
for (let i = 0; i < 8; i++) {
  engine.appendSymbol('.', 80);
}
const errResult = engine.commitCurrentSequence();
assert.strictEqual(errResult.isValid, true);
assert.strictEqual(errResult.isErrorSignal, true);
assert.strictEqual(errResult.letter, '<HH>');
assert.deepStrictEqual(errResult.erased, ['S', 'O', 'S']);
assert.deepStrictEqual(engine.committedLetters, [], 'SOS was completely cancelled');

// Continue keying after cancellation: type CQ
engine.appendSymbol('-', 240); engine.appendSymbol('.', 80); engine.appendSymbol('-', 240); engine.appendSymbol('.', 80);
assert.strictEqual(engine.commitCurrentSequence().letter, 'C');
engine.appendSymbol('-', 240); engine.appendSymbol('-', 240); engine.appendSymbol('.', 80); engine.appendSymbol('-', 240);
assert.strictEqual(engine.commitCurrentSequence().letter, 'Q');
assert.deepStrictEqual(engine.committedLetters, ['C', 'Q']);

// Push space and word 'BAD'
engine.committedLetters.push(' ');
engine.appendSymbol('-', 240); engine.appendSymbol('.', 80); engine.appendSymbol('.', 80); engine.appendSymbol('.', 80);
assert.strictEqual(engine.commitCurrentSequence().letter, 'B');
engine.appendSymbol('.', 80); engine.appendSymbol('-', 240);
assert.strictEqual(engine.commitCurrentSequence().letter, 'A');
engine.appendSymbol('-', 240); engine.appendSymbol('.', 80); engine.appendSymbol('.', 80);
assert.strictEqual(engine.commitCurrentSequence().letter, 'D');

assert.deepStrictEqual(engine.committedLetters, ['C', 'Q', ' ', 'B', 'A', 'D']);

// Cancel BAD with Error Signal
for (let i = 0; i < 8; i++) {
  engine.appendSymbol('.', 80);
}
const cancelBad = engine.commitCurrentSequence();
assert.strictEqual(cancelBad.isErrorSignal, true);
assert.deepStrictEqual(cancelBad.erased, ['B', 'A', 'D']);
assert.deepStrictEqual(engine.committedLetters, ['C', 'Q', ' '], 'Preserves CQ and space intact');
console.log('   -> Full workflow commit test passed!');

console.log('5. Verifying HTML files & free-mode.js for Scenario 5...');
const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
const protoHtml = fs.readFileSync(path.resolve(process.cwd(), 'prototype_morse_card.html'), 'utf8');
const freeModeJs = fs.readFileSync(path.resolve(process.cwd(), 'js/ui/free-mode.js'), 'utf8');

assert(indexHtml.includes('5. 筆誤更正'), 'index.html must include 5. 筆誤更正');
assert(protoHtml.includes('5. 筆誤更正'), 'prototype_morse_card.html must include 5. 筆誤更正');
assert(freeModeJs.includes('5. 筆誤更正'), 'free-mode.js must define scenario 5');
assert(freeModeJs.includes('........'), 'free-mode.js must contain 8 dits pattern');
assert(protoHtml.includes('........'), 'prototype_morse_card.html must contain 8 dits pattern');

console.log('========================================');
console.log('All Error Signal & Cancellation Tests Passed 100% (Exit 0)!');
console.log('========================================');

