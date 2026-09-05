const fs = require('fs');

const html = fs.readFileSync('prototype_morse_card.html', 'utf8');

// 1. Verify tree entries for all digits
const expectedDigits = {
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '0': '-----'
};

for (const [digit, seq] of Object.entries(expectedDigits)) {
  if (!html.includes(`'${seq}': { letter: '${digit}'`)) {
    throw new Error(`Tree missing mapping for digit ${digit} (${seq})`);
  }
}

// 2. Verify intermediate nodes
const intermediate = ['..--', '---.', '----'];
for (const seq of intermediate) {
  if (!html.includes(`'${seq}': { letter: null`)) {
    throw new Error(`Tree missing intermediate node ${seq}`);
  }
}

// 3. Verify Number Bus Bar in SVG
if (!html.includes('id="numbers-bus-layer"')) {
  throw new Error('numbers-bus-layer missing in SVG');
}
if (!html.includes('renderNumberBusBar()')) {
  throw new Error('renderNumberBusBar() missing');
}

// 4. Verify text input cleaning regex preserves 0-9
if (!html.includes('[^A-Z0-9\\s]')) {
  throw new Error('Text cleaning regex does not preserve digits 0-9');
}

console.log('All digits 0-9 tests passed successfully!');

