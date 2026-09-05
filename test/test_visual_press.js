const fs = require('fs');
const html = fs.readFileSync('prototype_morse_card.html', 'utf8');

// Check that simulateKeyVisualPress and simulateKeyVisualRelease exist and are called in startAutoPlay and replayLetter
if (!html.includes('simulateKeyVisualPress(sym)')) {
  throw new Error('simulateKeyVisualPress(sym) not called in startAutoPlay');
}
if (!html.includes('simulateKeyVisualPress(char)')) {
  throw new Error('simulateKeyVisualPress(char) not called in replayLetter');
}
if (!html.includes('simulateKeyVisualRelease()')) {
  throw new Error('simulateKeyVisualRelease() not called');
}

console.log('simulateKeyVisualPress verified in auto-play and letter replay!');

