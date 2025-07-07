// scripts/inject-ga-id.js
// Replaces __GA_ID__ in .storybook/preview-head.html with process.env.GA_ID

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../.storybook/preview-head.html');
const gaId = process.env.GA_ID;

if (!gaId) {
  console.error('GA_ID environment variable is not set.');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/__GA_ID__/g, gaId);
fs.writeFileSync(filePath, content, 'utf8');
console.log(`Injected GA_ID (${gaId}) into preview-head.html`);
