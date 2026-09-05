const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { KochManager } = require(path.join(__dirname, '../js/core/koch-manager.js'));

console.log('--- Testing Koch Drill Length 12 & 24 ---');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

// 1. Verify radio options
assert(html.includes('value="12"'), 'Must have 12 characters option');
assert(html.includes('12 字 (1排)'), 'Must have 12 字 (1排) label');
assert(html.includes('value="24" checked'), 'Must have 24 characters option checked by default');
assert(html.includes('24 字 (2排)'), 'Must have 24 字 (2排) label');

// 2. Verify progress badge
assert(html.includes('id="koch-progress-badge" style="font-size:0.75rem; color:var(--neon-blue); font-weight: bold;">進度: 0/24 · 正確率: 100%</span>'), 'Initial progress badge must be 0/24');

// 3. Verify KochManager default drillLen
const km = new KochManager();
assert.strictEqual(km.drillLen, 24, 'Default drillLen must be 24');

const drill = km.generateDrill();
assert.strictEqual(drill.length, 24, 'Generated drill must have 24 characters');

console.log('All Koch Drill 12/24 tests passed cleanly (Exit 0)!');

