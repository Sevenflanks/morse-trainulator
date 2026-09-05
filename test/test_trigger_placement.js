const fs = require('fs');
const html = fs.readFileSync('prototype_morse_card.html', 'utf8');

// 1. Verify card-column contains key-trigger and paddle-container
const cardColMatch = html.match(/<div class="card-column"[^>]*>([\s\S]*?)<\/div>\s*<!-- (?:Center|Right)/);
if (!cardColMatch) throw new Error('card-column not found');

const leftContent = cardColMatch[1];
if (!leftContent.includes('id="key-trigger"')) {
  throw new Error('key-trigger not found in card-column');
}
if (!leftContent.includes('id="paddle-container"')) {
  throw new Error('paddle-container not found in card-column');
}

// 2. Verify subsequent columns do NOT contain duplicate key-trigger or paddle-container
const otherColsContent = html.substring(html.indexOf('id="col-training"'));
if (otherColsContent.includes('id="key-trigger"')) {
  throw new Error('Duplicate key-trigger found in training or telemetry column');
}
if (otherColsContent.includes('id="paddle-container"')) {
  throw new Error('Duplicate paddle-container found in training or telemetry column');
}

console.log('Trigger controls placement verified perfectly in left column!');

