const path = require('path');
const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Koch Header Layout & Wrap Prevention ---');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

// 1. Verify Koch stage badge has nowrap and flex-shrink: 0
assert(html.includes('id="koch-stage-badge"'), 'koch-stage-badge must exist in index.html');
assert(html.includes('white-space: nowrap; flex-shrink: 0;'), 'koch-stage-badge must have white-space: nowrap and flex-shrink: 0');

// 2. Verify Koch title has nowrap and no redundant (Koch Method)
assert(html.includes('<span style="white-space: nowrap;"><i class="mdi mdi-bullseye-arrow"></i> 國際科赫闖關</span>'), 'Koch title must use MDI icon and have white-space: nowrap');
assert(!html.includes('🎯 國際科赫闖關 (Koch Method)'), 'Redundant Koch Method text must be removed to save horizontal space');

// 3. Verify flex-wrap and gap on panel-title
assert(html.includes('flex-wrap: wrap; gap: 8px 12px;'), 'Koch panel-title must support graceful wrapping with gap');

// 4. Verify reset button
assert(html.includes('id="btn-reset-koch"'), 'btn-reset-koch must exist');

console.log('All Koch header layout verifications passed cleanly (Exit 0)!');

