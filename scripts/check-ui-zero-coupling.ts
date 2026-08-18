#!/usr/bin/env bun
/**
 * CI Lint Check: Zero backend coupling in packages/ui/src
 *
 * Verifies that packages/ui/src contains zero imports or references to:
 * - `@/services` (backend persistence/services)
 * - `indexedDB` (direct database access)
 * - `localStorage` (direct browser storage access)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const UI_SRC_DIR = join(import.meta.dir, '..', 'packages', 'ui', 'src');

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

const FORBIDDEN_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: '@/services import', regex: /from\s+['"]@\/services/ },
  { name: '@/services dynamic import', regex: /import\s*\(\s*['"]@\/services/ },
  { name: 'indexedDB reference', regex: /\bindexedDB\b/ },
  { name: 'localStorage reference', regex: /\blocalStorage\b/ },
];

let hasViolations = false;
const files = getAllSourceFiles(UI_SRC_DIR);

console.log(`Checking ${files.length} files in packages/ui/src for zero backend coupling...`);

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  const relativePath = file.replace(join(import.meta.dir, '..') + '/', '');

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.regex.test(content)) {
      console.error(`❌ VIOLATION in ${relativePath}: matches ${pattern.name}`);
      hasViolations = true;
    }
  }
}

if (hasViolations) {
  console.error('\nCI Lint Check Failed: Forbidden backend coupling found in packages/ui/src.');
  process.exit(1);
} else {
  console.log('✅ CI Lint Check Passed: packages/ui/src is 100% state-free and decoupled.');
  process.exit(0);
}
