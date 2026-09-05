const fs = require('fs');
const html = fs.readFileSync('prototype_morse_card.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

if (!scriptMatch) {
  throw new Error('Script tag not found');
}

// Check key function names
const requiredFunctions = [
  'switchMode',
  'initTextModePassage',
  'updateCharCursor',
  'setCharResult',
  'finalizeLetterTextMode',
  'finishTextModePassage',
  'startAutoPlay',
  'pauseAutoPlay',
  'stopAutoPlay'
];

requiredFunctions.forEach(fn => {
  if (!scriptMatch[1].includes(`function ${fn}`)) {
    throw new Error(`Missing function: ${fn}`);
  }
});

console.log('All required Text Mode functions verified in JS!');

