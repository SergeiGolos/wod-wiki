// scripts/inject-ga-id.js
// Replaces __GA_ID__ in .storybook/preview-head.html with process.env.GA_ID
// Also ensures the public directory exists for Storybook builds

const fs = require('fs');
const path = require('path');

// Ensure public directory exists for Storybook static files
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('[inject-ga-id] Created public directory for Storybook static files.');
}

const filePath = path.join(__dirname, '../.storybook/preview-head.html');
const gaId = process.env.GA_ID;

// If GA_ID is not provided, do not fail the build. Simply skip injection.
if (!gaId) {
  console.log('[inject-ga-id] GA_ID is not set; skipping GA injection.');
  process.exit(0);
}

try {
  if (!fs.existsSync(filePath)) {
    console.log(`[inject-ga-id] File not found: ${filePath}. Skipping.`);
    process.exit(0);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('__GA_ID__')) {
    console.log('[inject-ga-id] No __GA_ID__ placeholder found; nothing to replace.');
    process.exit(0);
  }

  const updated = content.replace(/__GA_ID__/g, gaId);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`[inject-ga-id] Injected GA_ID (${gaId}) into preview-head.html`);
} catch (err) {
  console.error('[inject-ga-id] Failed to inject GA_ID:', err);
  process.exit(1);
}
