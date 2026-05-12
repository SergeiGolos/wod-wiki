#!/usr/bin/env node
/**
 * Fix CodeMirror Multiple Instance Issue
 *
 * This script resolves the "multiple instances of @codemirror/state are loaded" error
 * by replacing nested @codemirror packages with symlinks to the top-level packages.
 *
 * The issue occurs because several CodeMirror packages bundle their own dependencies,
 * causing instanceof check failures when different instances are loaded simultaneously.
 *
 * Run this script after any `bun install` that might affect CodeMirror dependencies.
 */

const fs = require('fs');
const path = require('path');

const CODEMIRROR_DIRS = [
  'node_modules/@codemirror/lang-markdown/node_modules/@codemirror',
  'node_modules/@codemirror/theme-one-dark/node_modules/@codemirror',
  'node_modules/@codemirror/lang-css/node_modules/@codemirror',
  'node_modules/@codemirror/lang-html/node_modules/@codemirror',
  'node_modules/@codemirror/lang-javascript/node_modules/@codemirror'
];

function fixCodeMirrorDependencies() {
  let fixedCount = 0;

  CODEMIRROR_DIRS.forEach((dir, index) => {
    const fullPath = path.join(process.cwd(), dir);

    if (fs.existsSync(fullPath)) {
      try {
        // Remove the nested directory
        fs.rmSync(fullPath, { recursive: true, force: true });

        // Create symlink to top-level @codemirror
        const targetPath = path.join(process.cwd(), 'node_modules/@codemirror');
        fs.symlinkSync(targetPath, fullPath, 'dir');

        console.log(`✓ Fixed: ${dir}`);
        fixedCount++;
      } catch (error) {
        console.error(`✗ Failed to fix ${dir}:`, error.message);
      }
    } else {
      // Check if symlink already exists
      try {
        const targetPath = fs.readlinkSync(fullPath);
        if (targetPath.includes('node_modules/@codemirror')) {
          console.log(`○ Already symlinked: ${dir}`);
          fixedCount++;
        }
      } catch (error) {
        // Doesn't exist or not a symlink
        console.log(`- Not found: ${dir}`);
      }
    }
  });

  console.log(`\nFixed ${fixedCount}/${CODEMIRROR_DIRS.length} CodeMirror dependency issues`);
  return fixedCount === CODEMIRROR_DIRS.length;
}

// Run the fix
const success = fixCodeMirrorDependencies();
process.exit(success ? 0 : 1);