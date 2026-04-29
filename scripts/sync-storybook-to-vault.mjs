#!/usr/bin/env node

/**
 * sync-storybook-to-vault.mjs
 *
 * Strips Storybook boilerplate from stories/catalog/ and writes
 * pure .md files into the Obsidian vault for design-system documentation.
 *
 * The Storybook MDX header (4 lines) is:
 *   import { Meta } from '@storybook/addon-docs/blocks';
 *   import * as stories from './Component.stories';
 *   <blank>
 *   <Meta of={stories} />
 *
 * Everything after that is pure markdown that Obsidian can render.
 *
 * Usage:
 *   node scripts/sync-storybook-to-vault.mjs          # dry run (shows what would change)
 *   node scripts/sync-storybook-to-vault.mjs --write   # actually writes files
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

// ── Config ────────────────────────────────────────────────────────────────
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH
  || path.join(os.homedir(), 'Documents/captains-log/captains-log');

if (!fs.existsSync(VAULT_PATH)) {
  console.error(`❌ Vault path not found: ${VAULT_PATH}\n   Set OBSIDIAN_VAULT_PATH to override.`);
  process.exit(1);
}

const STORIES_DIR = path.resolve(process.cwd(), 'stories/catalog');
const VAULT_TARGET = path.join(VAULT_PATH, 'projects', 'wod-wiki', 'docs', 'design-system');

// Storybook boilerplate lines to strip (after removing, skip leading blanks)
const BOILERPLATE_RE = /^import\s+\{[^}]+\}\s+from\s+'[^']+';\s*\n/gm;
const IMPORT_STORIES_RE = /^import\s+\*\s+as\s+stories\s+from\s+'[^']+';\s*\n/gm;
const META_TAG_RE = /^<Meta\s+[^/]*\/>\s*\n/gm;

// ── Helpers ───────────────────────────────────────────────────────────────

function stripBoilerplate(content) {
  let stripped = content;
  stripped = stripped.replace(BOILERPLATE_RE, '');
  stripped = stripped.replace(IMPORT_STORIES_RE, '');
  stripped = stripped.replace(META_TAG_RE, '');
  // Remove leading blank lines
  stripped = stripped.trimStart();
  return stripped;
}

function getComponentName(filePath) {
  // Extract the component name from the MDX filename
  // e.g. MetricPill.mdx → MetricPill, Web.mdx → Web
  return path.basename(filePath, '.mdx');
}

function getVaultRelativePath(mdxPath, storiesDir) {
  // Map stories/catalog/atoms/MetricPill.mdx → atoms/MetricPill.md
  const rel = path.relative(storiesDir, mdxPath);
  return rel.replace(/\.mdx$/, '.md');
}

function getAtomicTier(relPath) {
  // Extract tier from path: atoms, molecules, organisms, templates, pages
  const tier = relPath.split(path.sep)[0];
  const validTiers = ['atoms', 'molecules', 'organisms', 'templates', 'pages'];
  return validTiers.includes(tier) ? tier : null;
}

// ── Main ──────────────────────────────────────────────────────────────────

function collectMdxFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdxFiles(full));
    } else if (entry.name.endsWith('.mdx')) {
      results.push(full);
    }
  }
  return results.sort();
}

function main() {
  const write = process.argv.includes('--write');

  if (!fs.existsSync(STORIES_DIR)) {
    console.error(`❌ Stories directory not found: ${STORIES_DIR}`);
    process.exit(1);
  }

  const mdxFiles = collectMdxFiles(STORIES_DIR);

  if (mdxFiles.length === 0) {
    console.log('No MDX files found in', STORIES_DIR);
    return;
  }

  console.log(`📂 Found ${mdxFiles.length} MDX files in ${STORIES_DIR}`);
  console.log(`📁 Vault target:      ${VAULT_TARGET}`);
  console.log(`📝 Mode:              ${write ? 'WRITE' : 'DRY RUN'}\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const mdxPath of mdxFiles) {
    const relPath = getVaultRelativePath(mdxPath, STORIES_DIR);
    const vaultPath = path.join(VAULT_TARGET, relPath);
    const tier = getAtomicTier(relPath);
    const componentName = getComponentName(mdxPath);

    const raw = fs.readFileSync(mdxPath, 'utf-8');
    const markdown = stripBoilerplate(raw);

    // Add a frontmatter section with metadata for Obsidian
    const frontmatter = [
      '---',
      `source: wod-wiki/storybook`,
      `component: ${componentName}`,
      ...(tier ? [`tier: ${tier}`] : []),
      `storybook: ${path.relative(process.cwd(), mdxPath)}`,
      '---',
      '',
    ].join('\n');

    const output = frontmatter + markdown;

    // Check if file exists and compare
    if (fs.existsSync(vaultPath)) {
      const existing = fs.readFileSync(vaultPath, 'utf-8');
      if (existing === output) {
        skipped++;
        continue;
      }
      if (write) {
        fs.writeFileSync(vaultPath, output, 'utf-8');
        updated++;
        console.log(`  ✏️  Updated: ${relPath}`);
      } else {
        updated++;
        console.log(`  ✏️  Would update: ${relPath}`);
      }
    } else {
      if (write) {
        fs.mkdirSync(path.dirname(vaultPath), { recursive: true });
        fs.writeFileSync(vaultPath, output, 'utf-8');
        created++;
        console.log(`  ✨ Created: ${relPath}`);
      } else {
        created++;
        console.log(`  ✨ Would create: ${relPath}`);
      }
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped} (unchanged)`);
  console.log(`  Total:   ${mdxFiles.length}`);

  if (!write) {
    console.log(`\n💡 Run with --write to apply changes.`);
  }
}

main();
