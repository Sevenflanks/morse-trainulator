const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running MDI Icon Infrastructure Tests (Issue #1) ===\n');

const projectRoot = path.resolve(__dirname, '..');

// 1. Verify Architecture & Domain Documentation
console.log('1. Verifying Architecture & Domain Docs...');
const contextPath = path.join(projectRoot, 'CONTEXT.md');
assert.ok(fs.existsSync(contextPath), 'CONTEXT.md must exist');
const contextContent = fs.readFileSync(contextPath, 'utf8');
assert.ok(contextContent.includes('Iconography Standard'), 'CONTEXT.md must include Iconography Standard definition');
assert.ok(contextContent.includes('Material Design Icons'), 'CONTEXT.md must mention Material Design Icons');

const adrPath = path.join(projectRoot, 'docs/adr/0001-use-material-design-icons.md');
assert.ok(fs.existsSync(adrPath), 'ADR 0001 must exist');
const adrContent = fs.readFileSync(adrPath, 'utf8');
assert.ok(adrContent.includes('Material Design Icons (MDI)'), 'ADR 0001 must document MDI decision');

const agentsPath = path.join(projectRoot, 'AGENTS.md');
assert.ok(fs.existsSync(agentsPath), 'AGENTS.md must exist');
const agentsContent = fs.readFileSync(agentsPath, 'utf8');
assert.ok(agentsContent.includes('Strictly No Emoji / 顏文字 in Production UI'), 'AGENTS.md must mandate MDI standard');
console.log('  ✓ Domain documentation and ADR 0001 verified!');

// 2. Verify Stylesheets
console.log('\n2. Verifying CSS rules in css/base.css...');
const baseCssPath = path.join(projectRoot, 'css/base.css');
assert.ok(fs.existsSync(baseCssPath), 'css/base.css must exist');
const baseCss = fs.readFileSync(baseCssPath, 'utf8');
assert.ok(baseCss.includes('.mdi'), 'css/base.css must define .mdi base class');
assert.ok(baseCss.includes('inline-flex') || baseCss.includes('inline-block'), 'css/base.css must specify display for .mdi');
console.log('  ✓ Base CSS verified!');

// 3. Verify HTML files
console.log('\n3. Verifying index.html and prototype_morse_card.html...');
const indexHtmlPath = path.join(projectRoot, 'index.html');
assert.ok(fs.existsSync(indexHtmlPath), 'index.html must exist');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
assert.ok(indexHtml.includes('materialdesignicons.min.css'), 'index.html must link materialdesignicons.min.css');

const protoHtmlPath = path.join(projectRoot, 'prototype_morse_card.html');
assert.ok(fs.existsSync(protoHtmlPath), 'prototype_morse_card.html must exist');
const protoHtml = fs.readFileSync(protoHtmlPath, 'utf8');
assert.ok(protoHtml.includes('materialdesignicons.min.css'), 'prototype_morse_card.html must link materialdesignicons.min.css');
assert.ok(protoHtml.includes('.mdi'), 'prototype_morse_card.html must contain .mdi CSS rules');
console.log('  ✓ HTML files verified!');

console.log('\n====================================================');
console.log('ALL MDI INFRASTRUCTURE TESTS PASSED!');
console.log('====================================================\n');
