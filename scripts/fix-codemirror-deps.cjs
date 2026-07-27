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

const LEZER_DIRS = [
  'node_modules/@codemirror/lang-css/node_modules/@lezer',
  'node_modules/@codemirror/lang-html/node_modules/@lezer',
  'node_modules/@codemirror/lang-markdown/node_modules/@lezer',
  'node_modules/@lezer/generator/node_modules/@lezer',
  'node_modules/@lezer/highlight/node_modules/@lezer',
  'node_modules/@lezer/html/node_modules/@lezer',
  'node_modules/@lezer/javascript/node_modules/@lezer',
  'node_modules/@lezer/markdown/node_modules/@lezer'
];

function fixDependencies(dirs, targetPath, label) {
  let handledCount = 0;
  let missingCount = 0;
  let failureCount = 0;

  dirs.forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir);

    if (fs.existsSync(fullPath)) {
      try {
        // Remove the nested directory
        fs.rmSync(fullPath, { recursive: true, force: true });

        // Create symlink to top-level
        fs.symlinkSync(targetPath, fullPath, 'dir');

        console.log(`✓ Fixed: ${dir}`);
        handledCount++;
      } catch (error) {
        console.error(`✗ Failed to fix ${dir}:`, error.message);
        failureCount++;
      }

      return;
    }

    // Check if symlink already exists
    try {
      const linkTarget = fs.readlinkSync(fullPath);
      if (linkTarget.includes(targetPath.replace(process.cwd() + '/', ''))) {
        console.log(`○ Already symlinked: ${dir}`);
        handledCount++;
        return;
      }
    } catch (error) {
      // Doesn't exist or not a symlink
    }

    console.log(`- Not present (skipped): ${dir}`);
    missingCount++;
  });

  console.log(`\n${label}: Handled ${handledCount} dirs; skipped ${missingCount} missing dirs; failures ${failureCount}.`);
  return failureCount === 0;
}

function clearViteDependencyCaches() {
  const cacheDirs = [
    'node_modules/.vite',
    'playground/node_modules/.vite',
  ];

  cacheDirs.forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      return;
    }

    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`✓ Cleared stale Vite dependency cache: ${dir}`);
  });
}

// Run the fix
const cmSuccess = fixDependencies(CODEMIRROR_DIRS, path.join(process.cwd(), 'node_modules/@codemirror'), 'CodeMirror');
const lezerSuccess = fixDependencies(LEZER_DIRS, path.join(process.cwd(), 'node_modules/@lezer'), 'Lezer');
clearViteDependencyCaches();
process.exit(cmSuccess && lezerSuccess ? 0 : 1);
