const fs = require('fs');

const html = fs.readFileSync('prototype_morse_card.html', 'utf8');

// 1. Verify HTML elements existence
const requiredElements = [
  'id="cw-ribbon"',
  'id="chk-farnsworth"',
  'id="param-farnsworth-wpm"',
  'id="tag-farnsworth-status"',
  'id="chk-qrn"',
  'id="param-qrn-vol"',
  'id="tag-qrn-status"'
];

for (const el of requiredElements) {
  if (!html.includes(el)) {
    throw new Error(`Missing required element: ${el}`);
  }
}

// 2. Extract and test MorseEngine Farnsworth logic in isolated JS context
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('No script found');

// Run simulated test
const code = scriptMatch[1];
// Mock browser globals
const mockWindow = {
  AudioContext: class {
    constructor() {
      this.sampleRate = 44100;
      this.currentTime = 0;
      this.destination = {};
    }
    createGain() { return { gain: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, cancelScheduledValues: () => {} }, connect: () => {}, disconnect: () => {} }; }
    createOscillator() { return { frequency: { setValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {}, disconnect: () => {} }; }
    createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
    createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {}, disconnect: () => {} }; }
    createBiquadFilter() { return { frequency: { setValueAtTime: () => {} }, Q: { setValueAtTime: () => {} }, connect: () => {}, disconnect: () => {} }; }
  }
};

// Test Farnsworth engine logic
const engineTest = `
  const engine = new MorseEngine({ unitT: 120, threshold: 240, letterGap: 360, wordGap: 840 });
  if (engine.getEffectiveUnitT() !== 120) throw new Error('Default unitT mismatch');
  if (engine.getEffectiveThreshold() !== 240) throw new Error('Default threshold mismatch');

  engine.updateConfig({ farnsworthEnabled: true, charWpm: 20 });
  // 1200 / 20 = 60ms
  if (engine.getEffectiveUnitT() !== 60) throw new Error('Farnsworth unitT mismatch: got ' + engine.getEffectiveUnitT());
  if (engine.getEffectiveThreshold() !== 120) throw new Error('Farnsworth threshold mismatch: got ' + engine.getEffectiveThreshold());
  if (engine.classifyDuration(70) !== '.') throw new Error('Farnsworth classify dit failed');
  if (engine.classifyDuration(150) !== '-') throw new Error('Farnsworth classify dah failed');

  // Verify ribbon logic
  const ribbon = new CWRibbon('cw-ribbon');
  ribbon.startPulse(1000, '.');
  if (!ribbon.activePulse) throw new Error('Active pulse not started');
  ribbon.endPulse(1060, '.');
  if (ribbon.pulses.length !== 1) throw new Error('Pulse not recorded');
  if (ribbon.pulses[0].dur !== 60) throw new Error('Pulse duration incorrect');
  if (!ribbon.pulses[0].isDit) throw new Error('Pulse isDit incorrect');

  console.log('Farnsworth & CWRibbon logic tests passed cleanly!');
`;

const testScope = `
  const window = ${JSON.stringify(mockWindow)};
  window.AudioContext = ${mockWindow.AudioContext.toString()};
  const requestAnimationFrame = () => {};
  const document = {
    getElementById: (id) => ({
      getContext: () => ({
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        stroke: () => {},
        fill: () => {},
        fillText: () => {},
        setLineDash: () => {}
      }),
      width: 500,
      height: 58
    })
  };
  ${code.substring(0, code.indexOf('const engine = new MorseEngine();'))}
  ${engineTest}
`;

eval(testScope);
console.log('All Ribbon, Farnsworth, and QRN verification tests passed!');

