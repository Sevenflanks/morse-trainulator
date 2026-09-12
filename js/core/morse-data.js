/**
 * MORSE CODE DATA & CONSTANTS
 * 摩斯密碼樹狀圖定義、坐標、線路與預設配置
 */

function seqToId(seq) {
  if (!seq) return 'root';
  return seq.replace(/\./g, 'dit').replace(/-/g, 'dah');
}

const nodeCoords = {
  // Top Row (Y = 68)
  'O': { x: 50,  y: 68 },
  'M': { x: 105, y: 68 },
  'T': { x: 160, y: 68 },
  'root': { x: 200, y: 38 },
  'E': { x: 240, y: 68 },
  'I': { x: 295, y: 68 },
  'S': { x: 345, y: 68 },
  'H': { x: 382, y: 68 },

  // Right side sub-branches
  'U': { x: 295, y: 160 },
  'F': { x: 295, y: 235 },
  'V': { x: 345, y: 160 },

  'A': { x: 240, y: 275 },
  'R': { x: 295, y: 275 },
  'L': { x: 350, y: 275 },
  'W': { x: 240, y: 390 },
  'P': { x: 295, y: 390 },
  'J': { x: 240, y: 475 },

  // Left side sub-branches
  'G': { x: 105, y: 160 },
  'Q': { x: 50,  y: 160 },
  'Z': { x: 105, y: 235 },

  'N': { x: 160, y: 275 },
  'K': { x: 105, y: 275 },
  'Y': { x: 50,  y: 275 },
  'C': { x: 105, y: 355 },

  'D': { x: 160, y: 390 },
  'X': { x: 105, y: 390 },
  'B': { x: 160, y: 475 },
};

const wireLinks = [
  // Antenna drops vertically to junction, then branches left to T and right to E
  { seq: '-', path: 'M 200,38 L 200,68 L 160,68' },
  { seq: '.', path: 'M 200,38 L 200,68 L 240,68' },

  // Top horizontal branch: T -> M -> O
  { seq: '--', path: 'M 160,68 L 105,68' },
  { seq: '---', path: 'M 105,68 L 50,68' },

  // Top horizontal branch: E -> I -> S -> H
  { seq: '..', path: 'M 240,68 L 295,68' },
  { seq: '...', path: 'M 295,68 L 345,68' },
  { seq: '....', path: 'M 345,68 L 382,68' },

  // S -> V
  { seq: '...-', path: 'M 345,68 L 345,160' },

  // I -> U -> F
  { seq: '..-', path: 'M 295,68 L 295,160' },
  { seq: '..-.', path: 'M 295,160 L 295,235' },

  // E down to A
  { seq: '.-', path: 'M 240,68 L 240,275' },
  // A right to R -> L
  { seq: '.-.', path: 'M 240,275 L 295,275' },
  { seq: '.-..', path: 'M 295,275 L 350,275' },
  // A down to W
  { seq: '.--', path: 'M 240,275 L 240,390' },
  // W right to P, down to J
  { seq: '.--.', path: 'M 240,390 L 295,390' },
  { seq: '.---', path: 'M 240,390 L 240,475' },

  // M down to G
  { seq: '--.', path: 'M 105,68 L 105,160' },
  // G left to Q, down to Z
  { seq: '--.-', path: 'M 105,160 L 50,160' },
  { seq: '--..', path: 'M 105,160 L 105,235' },

  // T down to N
  { seq: '-.', path: 'M 160,68 L 160,275' },
  // N left to K -> Y
  { seq: '-.-', path: 'M 160,275 L 105,275' },
  { seq: '-.--', path: 'M 105,275 L 50,275' },
  // K down to C
  { seq: '-.-.', path: 'M 105,275 L 105,355' },
  // N down to D
  { seq: '-..', path: 'M 160,275 L 160,390' },
  // D left to X, down to B
  { seq: '-..-', path: 'M 160,390 L 105,390' },
  { seq: '-...', path: 'M 160,390 L 160,475' },
];

const digitsData = [
  { digit: '1', seq: '.----', x: 20, isDit: true },
  { digit: '2', seq: '..---', x: 55, isDit: true },
  { digit: '3', seq: '...--', x: 90, isDit: true },
  { digit: '4', seq: '....-', x: 125, isDit: true },
  { digit: '5', seq: '.....', x: 160, isDit: true },
  { digit: '6', seq: '-....', x: 210, isDit: false },
  { digit: '7', seq: '--...', x: 245, isDit: false },
  { digit: '8', seq: '---..', x: 280, isDit: false },
  { digit: '9', seq: '----.', x: 315, isDit: false },
  { digit: '0', seq: '-----', x: 350, isDit: false }
];

const KOCH_SEQUENCE = [
  'K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O',
  'W', 'I', 'N', 'J', 'E', 'F', '0', 'Y', 'V', 'G',
  '5', 'Q', '9', 'Z', 'H', '3', '8', 'B', '4', '2',
  '7', 'C', '1', 'D', '6', 'X'
];

const KEY_PROFILES = {
  standard: {
    name: '標準鍵位',
    desc: '直鍵: K · 雙撥片: [ (點) / ] (劃) 或 , / .',
    straight: ['KeyK'],
    dit: ['BracketLeft', 'Comma'],
    dah: ['BracketRight', 'Period']
  },
  homerow: {
    name: '雙手基準 (F/J)',
    desc: '直鍵: K · 雙撥片: F (點) / J (劃)',
    straight: ['KeyK'],
    dit: ['KeyF'],
    dah: ['KeyJ']
  },
  left_hand: {
    name: '單手左手 (Z/X)',
    desc: '直鍵: C · 雙撥片: Z (點) / X (劃)',
    straight: ['KeyC'],
    dit: ['KeyZ'],
    dah: ['KeyX']
  },
  arrows: {
    name: '方向鍵模式',
    desc: '直鍵: ↓ · 雙撥片: ← (點) / → (劃)',
    straight: ['ArrowDown'],
    dit: ['ArrowLeft'],
    dah: ['ArrowRight']
  },
  custom: {
    name: '自訂鍵位',
    desc: '自選按鍵對應',
    straight: ['KeyK'],
    dit: ['KeyF'],
    dah: ['KeyJ']
  }
};

const DEFAULT_SETTINGS = {
  keyerDevice: 'paddle', // 'straight' | 'paddle' | 'bug'
  speedPreset: 'intermediate',
  unitT: 80,
  threshold: 160,
  letterGap: 240,
  wordGap: 560,
  freq: 680,
  sidetoneVolume: 70,
  farnsworthEnabled: false,
  farnsworthWpm: 18,
  qrnEnabled: false,
  qrnVolume: 0.04,
  iambicMode: 'B',
  paddleReverse: false,
  keyProfile: 'standard',
  customBindings: {
    straight: ['KeyK'],
    dit: ['BracketLeft', 'Comma'],
    dah: ['BracketRight', 'Period']
  },
  textShowHints: true,
  textStrictMode: false,
  kochShowHints: false,
  layoutMode: '2col', // '2col' | '3col'
  themePreset: 'cyber-brass', // 'cyber-brass' | 'classic-amber' | 'green-phosphor'
  operatorCallsign: 'BV2TT',
  operatorName: 'EDDIE',
  operatorQth: 'TAIPEI',
  operatorGrid: 'PL05',
  operatorRig: '100W',
  operatorAnt: 'DIPOLE'
};

const speedPresets = {
  novice: {
    name: '入門',
    wpm: '5 WPM',
    unitT: 240,
    threshold: 480,
    letterGap: 720,
    wordGap: 1680,
    freq: 600,
    desc: '入門 (5 WPM)：點 240ms · 劃 720ms · 字元間隔 720ms · 單字間隔 1680ms'
  },
  beginner: {
    name: '基礎',
    wpm: '10 WPM',
    unitT: 120,
    threshold: 240,
    letterGap: 360,
    wordGap: 840,
    freq: 640,
    desc: '基礎 (10 WPM)：點 120ms · 劃 360ms · 字元間隔 360ms · 單字間隔 840ms'
  },
  intermediate: {
    name: '熟練',
    wpm: '15 WPM',
    unitT: 80,
    threshold: 160,
    letterGap: 240,
    wordGap: 560,
    freq: 680,
    desc: '熟練 (15 WPM)：點 80ms · 劃 240ms · 字元間隔 240ms · 單字間隔 560ms'
  },
  proficient: {
    name: '精通',
    wpm: '20 WPM',
    unitT: 60,
    threshold: 120,
    letterGap: 180,
    wordGap: 420,
    freq: 720,
    desc: '精通 (20 WPM)：點 60ms · 劃 180ms · 字元間隔 180ms · 單字間隔 420ms'
  },
  advanced: {
    name: '神速',
    wpm: '35 WPM',
    unitT: 35,
    threshold: 70,
    letterGap: 105,
    wordGap: 245,
    freq: 760,
    desc: '神速 (35 WPM)：點 35ms · 劃 105ms · 字元間隔 105ms · 單字間隔 245ms'
  },
  competition: {
    name: '極限',
    wpm: '50+ WPM',
    unitT: 24,
    threshold: 48,
    letterGap: 72,
    wordGap: 168,
    freq: 800,
    desc: '極限 (50+ WPM)：點 24ms · 劃 72ms · 字元間隔 72ms · 單字間隔 168ms'
  }
};

// ==========================================
// TELEGRAPHY RX DICTIONARIES & GENERATORS (Issue #31)
// ==========================================
const CALLSIGN_PREFIXES = [
  'BV', 'BX', 'BM', 'BN', 'BO', 'BP', // Taiwan
  'JA', 'JH', 'JR', 'JE', 'JF', 'JG', '7N', '7M', // Japan
  'W', 'K', 'N', 'AA', 'AB', 'AC', 'WA', 'WB', // USA
  'DL', 'G', 'F', 'I', 'EA', 'VE', 'VK', 'ZL', 'VR2' // Global
];

const CW_Q_CODES = [
  { code: 'QTH', desc: '你的位置 / 所在地' },
  { code: 'QSL', desc: '確認收悉 / 收據' },
  { code: 'QRM', desc: '人為干擾' },
  { code: 'QRN', desc: '天候底噪 / 大氣干擾' },
  { code: 'QSO', desc: '通聯 / 互相通報' },
  { code: 'QSY', desc: '轉變頻率' },
  { code: 'QRZ', desc: '誰在呼叫我？' },
  { code: 'QRS', desc: '請發慢一點' },
  { code: 'QRQ', desc: '請發快一點' },
  { code: 'QRT', desc: '停止發報 / 關機' }
];

const CW_ABBREVIATIONS = [
  { word: 'CQ', desc: '普遍呼叫所有電台' },
  { word: 'DE', desc: '這裡是 (This is)' },
  { word: 'RST', desc: '信號報告 (可辨度/強度/音質)' },
  { word: '73', desc: '祝美好安好 (Best regards)' },
  { word: '88', desc: '熱愛問候 (Love and kisses)' },
  { word: 'SK', desc: '結束通聯 (End of contact)' },
  { word: 'BK', desc: '插話 / 中斷 (Break)' },
  { word: 'UR', desc: '你的 (Your / You are)' },
  { word: 'NAME', desc: '姓名 / 台長名字' },
  { word: 'RIG', desc: '電台發射器材' },
  { word: 'ANT', desc: '天線 (Antenna)' },
  { word: 'WX', desc: '天氣 (Weather)' },
  { word: 'HW', desc: '如何？(How copy?)' }
];

// ==========================================
// VIRTUAL CW QSO STATIONS & BANDS (Issue #53)
// ==========================================
const QSO_REMOTE_STATIONS = [
  { call: 'JA1ABC', name: 'KEN', qth: 'TOKYO', country: 'JAPAN', grid: 'PM95', rstSent: '599', rstRcvd: '579', speedWpm: 20, pitchHz: 660 },
  { call: 'W6XYZ', name: 'BOB', qth: 'LOS ANGELES', country: 'USA', grid: 'DM04', rstSent: '599', rstRcvd: '589', speedWpm: 18, pitchHz: 600 },
  { call: 'DL3HEX', name: 'HANS', qth: 'BERLIN', country: 'GERMANY', grid: 'JO62', rstSent: '599', rstRcvd: '599', speedWpm: 22, pitchHz: 720 },
  { call: 'G4XYZ', name: 'JOHN', qth: 'LONDON', country: 'ENGLAND', grid: 'IO91', rstSent: '599', rstRcvd: '569', speedWpm: 19, pitchHz: 640 },
  { call: 'VK2AA', name: 'DAVE', qth: 'SYDNEY', country: 'AUSTRALIA', grid: 'QF56', rstSent: '599', rstRcvd: '579', speedWpm: 21, pitchHz: 680 },
  { call: 'HL1VA', name: 'MIN', qth: 'SEOUL', country: 'KOREA', grid: 'PM37', rstSent: '599', rstRcvd: '599', speedWpm: 20, pitchHz: 700 },
  { call: 'BY1AA', name: 'CHEN', qth: 'BEIJING', country: 'CHINA', grid: 'OM89', rstSent: '599', rstRcvd: '589', speedWpm: 18, pitchHz: 620 },
  { call: 'F6KOP', name: 'LUC', qth: 'PARIS', country: 'FRANCE', grid: 'JN18', rstSent: '599', rstRcvd: '579', speedWpm: 22, pitchHz: 650 },
  { call: 'I2BBB', name: 'MARCO', qth: 'MILAN', country: 'ITALY', grid: 'JN45', rstSent: '599', rstRcvd: '599', speedWpm: 20, pitchHz: 690 },
  { call: 'BV2AB', name: 'LIN', qth: 'TAIPEI', country: 'TAIWAN', grid: 'PL05', rstSent: '599', rstRcvd: '599', speedWpm: 20, pitchHz: 670 }
];

const QSO_BANDS = [
  { id: '40M', freq: '7.025', band: '40M', name: '40M CW', minFreq: 7.000, maxFreq: 7.040 },
  { id: '20M', freq: '14.025', band: '20M', name: '20M CW', minFreq: 14.000, maxFreq: 14.070 },
  { id: '15M', freq: '21.025', band: '15M', name: '15M CW', minFreq: 21.000, maxFreq: 21.070 }
];

const QSO_GUIDED_STEPS = [
  {
    step: 1,
    key: 'CQ',
    title: '發送 CQ 呼叫 (Call CQ)',
    prompt: '請發送通用呼叫 CQ，邀請空中電台建立通聯。',
    expectedKeywords: ['CQ'],
    hintTemplate: 'CQ CQ CQ DE {MY_CALL} {MY_CALL} K'
  },
  {
    step: 2,
    key: 'RST',
    title: '交換訊號報告 (Signal Report)',
    prompt: '抄收對方呼叫，並回覆 RST 訊號報告 (如 599)。',
    expectedKeywords: ['RST', '599', '5NN'],
    hintTemplate: '{DX_CALL} DE {MY_CALL} UR RST 599 BK'
  },
  {
    step: 3,
    key: 'QTH_NAME',
    title: '交換地點與姓名 (QTH & Name)',
    prompt: '通報你的所在地 QTH 與台長姓名 OP。',
    expectedKeywords: ['QTH', 'OP', 'NAME'],
    hintTemplate: 'QTH {MY_QTH} OP {MY_NAME} BK'
  },
  {
    step: 4,
    key: 'SIGNOFF',
    title: '致謝並發送 73 告別 (Sign-off & 73)',
    prompt: '感謝本次美好通聯，祝願 73 並發送結束符號 SK。',
    expectedKeywords: ['73', 'SK', 'TU'],
    hintTemplate: 'TNX FER QSO 73 GL TU EE SK'
  },
  {
    step: 5,
    key: 'COMPLETE',
    title: '通聯成功！(QSO Confirmed)',
    prompt: '恭喜！已成功建立雙向通聯，可簽發專屬 QSL 確認卡！',
    expectedKeywords: [],
    hintTemplate: 'QSL READY'
  }
];

function generateKochRxTargets(maxLevel, count = 10) {
  const maxIdx = Math.max(2, Math.min(36, maxLevel + 1));
  const pool = KOCH_SEQUENCE.slice(0, maxIdx);
  const result = [];
  for (let i = 0; i < count; i++) {
    const rIdx = Math.floor(Math.random() * pool.length);
    result.push(pool[rIdx]);
  }
  return result;
}

function generateCallsign() {
  const prefix = CALLSIGN_PREFIXES[Math.floor(Math.random() * CALLSIGN_PREFIXES.length)];
  const digit = Math.floor(Math.random() * 10);
  const suffixLen = Math.floor(Math.random() * 3) + 1; // 1 to 3 letters
  let suffix = '';
  for (let i = 0; i < suffixLen; i++) {
    suffix += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  return `${prefix}${digit}${suffix}`;
}

function generateCodeGroup(length = 5, charSet = null) {
  const defaultChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const pool = charSet || defaultChars;
  let res = '';
  for (let i = 0; i < length; i++) {
    res += pool[Math.floor(Math.random() * pool.length)];
  }
  return res;
}

function generateQSignalOrAbbreviation() {
  const isQ = Math.random() < 0.5;
  if (isQ) {
    const item = CW_Q_CODES[Math.floor(Math.random() * CW_Q_CODES.length)];
    return { text: item.code, desc: item.desc, type: 'qcode' };
  } else {
    const item = CW_ABBREVIATIONS[Math.floor(Math.random() * CW_ABBREVIATIONS.length)];
    return { text: item.word, desc: item.desc, type: 'abbreviation' };
  }
}

function generateWeaknessTargets(pairOrChars, totalTrials = 10, distractorPool = null) {
  let targets = [];
  if (typeof pairOrChars === 'string') {
    if (pairOrChars.includes('->')) {
      targets = pairOrChars.split('->').map(s => s.trim().toUpperCase());
    } else if (pairOrChars.includes(',')) {
      targets = pairOrChars.split(',').map(s => s.trim().toUpperCase());
    } else {
      targets = pairOrChars.trim().toUpperCase().split('');
    }
  } else if (Array.isArray(pairOrChars)) {
    targets = pairOrChars.map(s => String(s).trim().toUpperCase());
  }

  targets = targets.filter(c => c && c.length === 1);
  if (targets.length === 0) {
    targets = ['B', 'D'];
  }

  const defaultDistractors = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    .split('')
    .filter(c => !targets.includes(c));
  const pool = distractorPool || defaultDistractors;

  const targetCount = Math.max(Math.ceil(totalTrials * 0.6), targets.length);
  const distractorCount = Math.max(0, totalTrials - targetCount);

  const result = [];
  for (let i = 0; i < targetCount; i++) {
    const char = targets[i % targets.length];
    result.push(char);
  }

  for (let i = 0; i < distractorCount; i++) {
    const randChar = pool[Math.floor(Math.random() * pool.length)];
    result.push(randChar);
  }

  // Fisher-Yates Shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// Global window registration
if (typeof window !== 'undefined') {
  window.CALLSIGN_PREFIXES = CALLSIGN_PREFIXES;
  window.CW_Q_CODES = CW_Q_CODES;
  window.CW_ABBREVIATIONS = CW_ABBREVIATIONS;
  window.QSO_REMOTE_STATIONS = QSO_REMOTE_STATIONS;
  window.QSO_BANDS = QSO_BANDS;
  window.QSO_GUIDED_STEPS = QSO_GUIDED_STEPS;
  window.generateKochRxTargets = generateKochRxTargets;
  window.generateCallsign = generateCallsign;
  window.generateCodeGroup = generateCodeGroup;
  window.generateQSignalOrAbbreviation = generateQSignalOrAbbreviation;
  window.generateWeaknessTargets = generateWeaknessTargets;
}

// Export for Node.js test environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    seqToId,
    nodeCoords,
    wireLinks,
    digitsData,
    KOCH_SEQUENCE,
    KEY_PROFILES,
    DEFAULT_SETTINGS,
    speedPresets,
    CALLSIGN_PREFIXES,
    CW_Q_CODES,
    CW_ABBREVIATIONS,
    QSO_REMOTE_STATIONS,
    QSO_BANDS,
    QSO_GUIDED_STEPS,
    generateKochRxTargets,
    generateCallsign,
    generateCodeGroup,
    generateQSignalOrAbbreviation,
    generateWeaknessTargets
  };
}
