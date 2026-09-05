/**
 * AUTOMATED TEST RUNNER
 * Executes all unit test suites in test/ directory.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const testDir = __dirname;
const testFiles = fs.readdirSync(testDir).filter(f => f.startsWith('test_') && f.endsWith('.js'));

console.log('====================================================');
console.log(`Running Morse Code Card Test Suites (${testFiles.length} suites)`);
console.log('====================================================\n');

let passed = 0;
let failed = 0;
const failures = [];

testFiles.forEach((file, index) => {
  const filePath = path.join(testDir, file);
  process.stdout.write(`[${index + 1}/${testFiles.length}] Running ${file}... `);
  try {
    execFileSync(process.execPath, [filePath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log('PASSED');
    passed++;
  } catch (err) {
    console.log('FAILED');
    failed++;
    failures.push({ file, output: err.stdout || err.stderr || err.message });
  }
});

console.log('\n====================================================');
console.log(`Results: ${passed} passed, ${failed} failed (Total: ${testFiles.length})`);
console.log('====================================================');

if (failed > 0) {
  console.error('\nFailures Details:');
  failures.forEach(f => {
    console.error(`\n--- ${f.file} ---`);
    console.error(f.output);
  });
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED WITH 100% SUCCESS RATE!\n');
  process.exit(0);
}
