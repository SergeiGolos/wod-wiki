#!/usr/bin/env bun

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up WOD Wiki testing environment...\n');

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('bun install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Install Playwright browsers
console.log('🎭 Installing Playwright browsers...');
try {
  execSync('bun x playwright install chromium', { stdio: 'inherit' });
  console.log('✅ Playwright browsers installed\n');
} catch (error) {
  console.error('❌ Failed to install Playwright browsers:', error.message);
  process.exit(1);
}

// Verify configuration files exist
const configFiles = [
  'playwright.journal.config.ts',
  'playwright.smoke.config.ts',
  'vite.config.ts',
];

console.log('🔍 Verifying configuration files...');
for (const file of configFiles) {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
}

console.log('\n🎉 Setup complete! You can now run:');
console.log('  bun run test          # Run unit tests');
console.log('  bun run dev:app       # Start the playground dev server');
