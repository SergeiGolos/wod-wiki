#!/usr/bin/env node
// Summarize a Playwright JSON report into per-file pass/fail/flaky/skipped
// counts. CI: writes key=values to GITHUB_OUTPUT and the markdown table to
// E2E_SUMMARY_MD (for the job summary); always prints the table to stdout.
// Local: prints the table to stdout.
//
// Usage: bun scripts/e2e-report-summary.mjs <report.json>
//        bun scripts/e2e-report-summary.mjs --self-test

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

function summarize(report) {
  const files = new Map();
  const totals = { pass: 0, fail: 0, flaky: 0, skipped: 0 };
  const walk = (suite) => {
    for (const child of suite.suites ?? []) walk(child);
    for (const spec of suite.specs ?? []) {
      const entry = files.get(spec.file) ?? { pass: 0, fail: 0, flaky: 0, skipped: 0 };
      files.set(spec.file, entry);
      // test.status aggregates retries: expected | unexpected | flaky | skipped
      for (const test of spec.tests ?? []) {
        const bucket = test.status === 'expected' ? 'pass'
          : test.status === 'flaky' ? 'flaky'
          : test.status === 'skipped' ? 'skipped'
          : 'fail';
        entry[bucket] += 1;
        totals[bucket] += 1;
      }
    }
  };
  for (const suite of report.suites ?? []) walk(suite);
  return { files, totals, total: totals.pass + totals.fail + totals.flaky + totals.skipped };
}

function renderTable({ files, totals }) {
  const rows = [...files.entries()]
    .sort((a, b) => b[1].fail - a[1].fail || a[0].localeCompare(b[0]))
    .map(([file, c]) => `| ${file} | ${c.pass} | ${c.fail} | ${c.flaky} | ${c.skipped} |`);
  return [
    '### Live-app e2e — per-file results',
    '',
    '| File | Pass | Fail | Flaky | Skipped |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...rows,
    `| **Total** | ${totals.pass} | ${totals.fail} | ${totals.flaky} | ${totals.skipped} |`,
    '',
  ].join('\n');
}

const arg = process.argv[2];

if (arg === '--self-test') {
  const fixture = { suites: [{ title: 'chromium', suites: [
    { file: 'a.e2e.ts', specs: [
      { file: 'a.e2e.ts', tests: [{ status: 'expected' }, { status: 'unexpected' }] },
      { file: 'a.e2e.ts', tests: [{ status: 'skipped' }] },
    ] },
    { file: 'b.e2e.ts', specs: [
      { file: 'b.e2e.ts', tests: [{ status: 'flaky' }, { status: 'unexpected' }] },
    ] },
  ] }] };
  const r = summarize(fixture);
  assert.deepEqual(r.totals, { pass: 1, fail: 2, flaky: 1, skipped: 1 });
  assert.equal(r.total, 5);
  assert.deepEqual(r.files.get('a.e2e.ts'), { pass: 1, fail: 1, flaky: 0, skipped: 1 });
  assert.deepEqual(r.files.get('b.e2e.ts'), { pass: 0, fail: 1, flaky: 1, skipped: 0 });
  console.log('self-test ok');
  process.exit(0);
}

if (!arg) {
  console.error('usage: e2e-report-summary.mjs <playwright-report.json> | --self-test');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(arg, 'utf8'));
} catch (err) {
  console.error(`::error::cannot read Playwright JSON report at ${arg}: ${err.message}`);
  process.exit(1);
}

const summary = summarize(report);
if (summary.total === 0) {
  console.error('::error::report parsed but contains 0 tests — check reporter outputFile and config testMatch');
  process.exit(1);
}

const table = renderTable(summary);
const outputs = [
  `tests=${summary.total}`,
  `passed=${summary.totals.pass}`,
  `failures=${summary.totals.fail}`,
  `flaky=${summary.totals.flaky}`,
  `skipped=${summary.totals.skipped}`,
];

if (process.env.E2E_SUMMARY_MD) writeFileSync(process.env.E2E_SUMMARY_MD, table + '\n');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, outputs.join('\n') + '\n');
console.log(table);
console.log(outputs.join('\n'));
