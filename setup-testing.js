#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up WOD Wiki testing environment...\n');

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Install Playwright browsers
console.log('🎭 Installing Playwright browsers...');
try {
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  console.log('✅ Playwright browsers installed\n');
} catch (error) {
  console.error('❌ Failed to install Playwright browsers:', error.message);
  process.exit(1);
}

// Verify configuration files exist
const configFiles = [
  'vitest.config.js',
  '.storybook/main.js',
  '.storybook/vitest.setup.js'
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
console.log('  npm test              # Run all tests');
console.log('  npm run test:unit     # Run unit tests only');
console.log('  npm run test:storybook # Run Storybook tests only');
console.log('  npm run storybook     # Start Storybook dev server');
