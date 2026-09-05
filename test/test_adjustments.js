const fs = require('fs');
const html = fs.readFileSync('prototype_morse_card.html', 'utf8');

// 1. Verify that keyer-device-tabs is inside card-column under pcb-card
const cardColMatch = html.match(/<div class="card-column"[^>]*>([\s\S]*?)<\/div>\s*<!-- (?:Right|Center)/);
if (!cardColMatch) {
  throw new Error('Could not find card-column');
}
if (!cardColMatch[1].includes('id="dev-straight"') || !cardColMatch[1].includes('id="dev-paddle"')) {
  throw new Error('dev-straight or dev-paddle not found inside card-column');
}

// 2. Verify KeyR / restartKeying shortcut
if (!html.includes("code === 'KeyR'") && !html.includes("key === 'r'")) {
  throw new Error('KeyR shortcut not found in keydown listener');
}

// 3. Verify btn-restart-text has (R)
if (!html.includes('重新發報 (R)')) {
  throw new Error('重新發報 (R) label missing');
}

console.log('All minor adjustments verified successfully!');

