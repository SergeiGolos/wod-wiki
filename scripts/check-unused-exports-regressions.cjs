#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const TS_PRUNE_PROJECT = 'tsconfig.ts-prune.json';
const UNUSED_EXPORT_BASELINE = 1317;

const result = spawnSync('bun', ['x', 'ts-prune', '-p', TS_PRUNE_PROJECT], {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (result.error) {
  console.error(`Failed to execute ts-prune: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('ts-prune execution failed.');
  if (result.stderr) {
    console.error(result.stderr.trim());
  }
  process.exit(result.status || 1);
}

const unusedExports = result.stdout
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (unusedExports.length > UNUSED_EXPORT_BASELINE) {
  const added = unusedExports.length - UNUSED_EXPORT_BASELINE;
  console.error('Unused export regression check failed.');
  console.error(
    `- Current unused exports: ${unusedExports.length}`,
  );
  console.error(
    `- Allowed baseline: ${UNUSED_EXPORT_BASELINE}`,
  );
  console.error(`- New unused exports detected: ${added}`);
  console.error('- Sample findings:');
  for (const line of unusedExports.slice(0, 20)) {
    console.error(`  - ${line}`);
  }
  process.exit(1);
}

const improvement = UNUSED_EXPORT_BASELINE - unusedExports.length;
console.log('Unused export regression check passed.');
console.log(`- Current unused exports: ${unusedExports.length}`);
console.log(`- Allowed baseline: ${UNUSED_EXPORT_BASELINE}`);
if (improvement > 0) {
  console.log(`- Improvement over baseline: ${improvement}`);
}
