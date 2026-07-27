#!/usr/bin/env bun
/**
 * Per-file isolated test runner.
 *
 * Bun runs every test file in a single shared process, and `mock.module(...)`
 * registers a *process-global* override that cannot be un-registered (neither
 * `mock.restore()` nor re-mocking in `afterAll` undoes it in Bun 1.3.x). Several
 * playground test files globally replace shared modules (react-router-dom,
 * playgroundDB, IndexedDBService) with partial stubs, which then leak into every
 * later file and cause order-dependent failures.
 *
 * Running each test file in its own process eliminates that entire class of
 * cross-file pollution: every file gets a clean module registry and its own
 * mocks. See docs/playground-failing-tests-analysis.md for the full analysis.
 *
 * Usage: bun tests/run-isolated.ts <dir> [--preload <file>]
 */
import { Glob } from 'bun';
import { resolve } from 'path';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--')) ?? './playground/src';
const preloadIdx = args.indexOf('--preload');
const preload = preloadIdx >= 0 ? args[preloadIdx + 1] : './tests/unit-setup.ts';

const glob = new Glob('**/*.{test,spec}.{ts,tsx}');
const files: string[] = [];
for await (const f of glob.scan({ cwd: dir, absolute: true })) files.push(f);
files.sort();

if (files.length === 0) {
  console.error(`No test files found under ${dir}`);
  process.exit(1);
}

console.log(`Running ${files.length} test file(s) in isolated processes (preload: ${preload})\n`);

let totalPass = 0;
let totalFail = 0;
let totalSkip = 0;
const failedFiles: string[] = [];

const countRe = /^\s*(\d+)\s+(pass|fail|skip)\s*$/;

for (const file of files) {
  const rel = file.replace(resolve(process.cwd()) + '/', '');
  const proc = Bun.spawnSync(['bun', 'test', file, '--preload', preload], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });

  // Strip ANSI so the `N pass` / `N fail` summary lines parse reliably.
  const raw = proc.stdout.toString() + proc.stderr.toString();
  const out = raw.replace(/\x1b\[[0-9;]*m/g, '');
  let pass = 0;
  let fail = 0;
  let skip = 0;
  for (const line of out.split('\n')) {
    const m = line.match(countRe);
    if (!m) continue;
    const n = Number(m[1]);
    if (m[2] === 'pass') pass = n;
    else if (m[2] === 'fail') fail = n;
    else if (m[2] === 'skip') skip = n;
  }

  totalPass += pass;
  totalFail += fail;
  totalSkip += skip;

  const ok = proc.exitCode === 0 && fail === 0;
  const status = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`${status}  ${rel}  (${pass} pass, ${fail} fail${skip ? `, ${skip} skip` : ''})`);

  if (!ok) {
    failedFiles.push(rel);
    // Surface the failing file's output so failures are debuggable in CI.
    process.stdout.write(out.endsWith('\n') ? out : out + '\n');
  }
}

console.log('\n' + '─'.repeat(60));
console.log(`Totals: ${totalPass} pass, ${totalFail} fail, ${totalSkip} skip across ${files.length} files`);
if (failedFiles.length > 0) {
  console.log(`\nFailed files (${failedFiles.length}):`);
  for (const f of failedFiles) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('All files passed.');
