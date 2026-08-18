import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...getAllFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe('@bitcobblers/wod-wiki-ui zero backend coupling contract', () => {
  const srcDir = join(import.meta.dir, '..', 'src');
  const files = getAllFiles(srcDir);

  it('has source files to scan', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('contains zero imports from @/services', () => {
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/from\s+['"]@\/services/);
      expect(content).not.toMatch(/import\s*\(\s*['"]@\/services/);
    }
  });

  it('contains zero direct indexedDB references', () => {
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/\bindexedDB\b/);
    }
  });

  it('contains zero direct localStorage references', () => {
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/\blocalStorage\b/);
    }
  });
});
