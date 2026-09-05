const path = require('path');
const assert = require('assert');
const { KochManager } = require(path.join(__dirname, '../js/core/koch-manager.js'));

console.log('--- Testing Koch Drill Option C Distribution & Anti-Streak ---');

const km = new KochManager();

// 1. Test Level 1 (K and M)
km.currentLevel = 1;
let totalK = 0, totalM = 0;
for (let r = 0; r < 200; r++) {
  const drill = km.generateDrill(24);
  assert.strictEqual(drill.length, 24);

  // Check anti-streak: never 3 identical in a row
  for (let i = 2; i < drill.length; i++) {
    assert(!(drill[i] === drill[i-1] && drill[i-1] === drill[i-2]), `Level 1 streak violation at index ${i}: ${drill.slice(i-2, i+1).join('')}`);
  }
  for (const c of drill) {
    if (c === 'K') totalK++;
    if (c === 'M') totalM++;
  }
}
const kPct = totalK / (200 * 24);
const mPct = totalM / (200 * 24);
console.log(`Level 1 (K vs M) over 4800 picks: K=${(kPct*100).toFixed(1)}%, M=${(mPct*100).toFixed(1)}%`);
assert(kPct > 0.40 && kPct < 0.60, 'Level 1 K should be balanced around 50%');
assert(mPct > 0.40 && mPct < 0.60, 'Level 1 M should be balanced around 50%');

// 2. Test Level 3 (K, M, R, S; target is S)
km.currentLevel = 3;
const counts = { K: 0, M: 0, R: 0, S: 0 };
for (let r = 0; r < 500; r++) {
  const drill = km.generateDrill(24);
  assert.strictEqual(drill.length, 24);

  // Anti-streak verification
  for (let i = 2; i < drill.length; i++) {
    assert(!(drill[i] === drill[i-1] && drill[i-1] === drill[i-2]), `Level 3 streak violation at index ${i}: ${drill.slice(i-2, i+1).join('')}`);
  }
  for (const c of drill) {
    counts[c]++;
  }
}
const total3 = 500 * 24;
const sPct = counts.S / total3;
console.log(`Level 3 (K, M, R, S) over 12000 picks:`);
for (const k in counts) {
  console.log(`  ${k}: ${(counts[k] / total3 * 100).toFixed(1)}%`);
}
// S has weight 2, others weight 1. Theoretical: S is 2/5 = 40% (plus boundary effect ~37-40%)
assert(sPct >= 0.32 && sPct <= 0.45, `S percentage should be ~35-40% gentle boost (got ${(sPct*100).toFixed(1)}%)`);
assert(counts.K > 0 && counts.M > 0 && counts.R > 0, 'Older letters must be present');

console.log('All Koch Drill Distribution & Anti-Streak tests passed cleanly (Exit 0)!');

