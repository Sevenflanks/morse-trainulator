const fs = require('fs');
const html = fs.readFileSync('prototype_morse_card.html', 'utf8');

const checks = [
  'gap-meter-container',
  'gap-bar',
  'gap-markers',
  'gap-time-readout',
  'gap-countdown-readout',
  'gap-max-readout',
  'gap-status-badge',
  'commitWordSpace'
];

checks.forEach(item => {
  if (!html.includes(item)) {
    throw new Error('Missing: ' + item);
  }
});

console.log('All Gap Timeline elements and methods verified!');

