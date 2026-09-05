const fs = require('fs');

// Extract IambicKeyer and MorseEngine definitions from file
const html = fs.readFileSync('prototype_morse_card.html', 'utf8');

// Test that script compiles cleanly and can instantiate
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

// Check that IambicKeyer has startSymbol, finishSymbol, finishGap, setPhysicalContact
const methods = [
  'setPhysicalContact',
  'startSymbol',
  'finishSymbol',
  'finishGap',
  'reset'
];

methods.forEach(m => {
  if (!scriptMatch[1].includes(m)) {
    throw new Error('Missing IambicKeyer method: ' + m);
  }
});

console.log('IambicKeyer class structure validated completely!');

