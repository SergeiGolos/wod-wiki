import { describe, expect, it } from 'vitest';
import { parseScript } from '@bitcobblers/wod-wiki-engine';

import {
  expectedFromStatements,
  pairExpectedToStatements,
  runCase,
  runFile,
} from '../src/parser-tests/runnerCore';
import type { ParserTestFile } from '../src/parser-tests/types';

const REST_SCRIPT = '10 Burpees\n*:30 Rest\n10 Burpees';

const seededCase = (script: string, overrides: Record<string, unknown> = {}) => {
  const expected = expectedFromStatements(parseScript(script).statements);
  return { name: 'seeded', script, expected, ...overrides };
};

describe('expectedFromStatements round-trip', () => {
  it('seeded expectations replay as a passing case', () => {
    const result = runCase(seededCase(REST_SCRIPT));
    expect(result.status).toBe('pass');
    expect(result.statements).toHaveLength(3);
    expect(result.missingStatements).toEqual([]);
    expect(result.extraStatements).toEqual([]);
  });

  it('seeded DSL lines carry pinned origins and survive re-parsing', () => {
    const result = runCase(seededCase(REST_SCRIPT));
    const line1 = result.statements[0]!.entries;
    expect(line1).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'match', dsl: 'Rep 10 @parser' }),
        expect.objectContaining({ kind: 'match', dsl: 'Effort Burpees @parser' }),
      ]),
    );
  });
});

describe('runCase failures', () => {
  it('wrong value yields missing-expected (green) and extra-actual (red) entries', () => {
    const testCase = seededCase(REST_SCRIPT);
    testCase.expected[0]!.metrics = ['Rep 9 @parser', 'Effort "Burpees" @parser'];
    const result = runCase(testCase);
    expect(result.status).toBe('fail');
    expect(result.statements[0]!.status).toBe('fail');
    const kinds = result.statements[0]!.entries.map((e) => e.kind);
    expect(kinds).toContain('missing-expected');
    expect(kinds).toContain('extra-actual');
    const missing = result.statements[0]!.entries.find((e) => e.kind === 'missing-expected');
    expect(missing!.dsl).toBe('Rep 9 @parser');
    const extra = result.statements[0]!.entries.find((e) => e.kind === 'extra-actual');
    expect(extra!.dsl).toBe('Rep 10 @parser');
  });

  it('statement missing for an expected line fails', () => {
    const testCase = seededCase(REST_SCRIPT);
    testCase.expected.push({ line: 9, metrics: ['Rep 99 @parser'] });
    const result = runCase(testCase);
    expect(result.status).toBe('fail');
    expect(result.missingStatements).toHaveLength(1);
    expect(result.missingStatements[0]!.line).toBe(9);
  });

  it('extra actual statement fails closed and passes in subset mode', () => {
    const testCase = seededCase(REST_SCRIPT);
    testCase.expected = testCase.expected.slice(0, 1);
    expect(runCase(testCase).status).toBe('fail');
    expect(runCase({ ...testCase, matchMode: 'subset' }).status).toBe('pass');
  });

  it('mismatched parse-error expectations fail through the error branch', () => {
    const result = runCase({
      name: 'errors',
      script: REST_SCRIPT,
      expected: [],
      errors: [{ line: 1, message: 'boom' }],
    });
    expect(result.parseFailed).toBe(false);
    expect(result.status).toBe('fail');
    expect(result.errors).toEqual([
      { kind: 'missing-expected', dsl: 'line 1: "boom"' },
    ]);
  });
});

describe('pairExpectedToStatements', () => {
  it('pairs per line in order and reports orphans', () => {
    const script = parseScript(REST_SCRIPT);
    const expected = [
      { line: 1, metrics: ['Rep 10 @parser'] },
      { line: 7, metrics: [] },
      { line: 3, metrics: ['Rep 10 @parser'] },
    ];
    const { pairs, orphanEntryIndexes } = pairExpectedToStatements(script.statements, expected);
    expect(pairs.map((p) => p.entryIndex)).toEqual([0, null, 2]);
    expect(orphanEntryIndexes).toEqual([1]);
  });
});

describe('runFile', () => {
  it('runs every case and isolates a case with invalid DSL into thrown', () => {
    const file: ParserTestFile = {
      version: 1,
      title: 'catalog',
      cases: [
        seededCase(REST_SCRIPT, { name: 'good' }),
        seededCase(REST_SCRIPT, { name: 'bad-dsl', expected: [{ line: 1, metrics: ['Effort hello world'] }] }),
      ],
    };
    const results = runFile(file);
    expect(results.map((r) => r.name)).toEqual(['good', 'bad-dsl']);
    expect(results[0]!.status).toBe('pass');
    expect(results[1]!.status).toBe('fail');
    expect(results[1]!.thrown).toMatch(/unquoted string value with spaces/i);
  });
});
