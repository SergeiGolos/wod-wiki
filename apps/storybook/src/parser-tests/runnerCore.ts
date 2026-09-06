/**
 * Pure runner for {@link ParserTestCase} JSON: parse → pair expectations to
 * statements → structured per-line diff. Shared by the Runner story (render)
 * and the Builder story (live status + what it saves is what this runs).
 */

import {
  parseScript,
  parseMetricLine,
  diffStatement,
  renderMetric,
  type MetricLine,
  type StatementMetricDiff,
  type MatchMode,
  type ParseError,
  type ICodeStatement,
} from '@bitcobblers/wod-wiki-engine';
import type { ExpectedError, ExpectedLine, ParserTestCase, ParserTestFile } from './types';

export type DiffEntryKind = 'match' | 'missing-expected' | 'extra-actual';

export interface DiffEntry {
  kind: DiffEntryKind;
  dsl: string;
}

export interface StatementDiff {
  line: number;
  text?: string;
  status: 'pass' | 'fail';
  entries: DiffEntry[];
}

export interface CaseResult {
  name: string;
  status: 'pass' | 'fail';
  /** True when the script itself produced parse errors. */
  parseFailed: boolean;
  /** Diff for every actual statement that had an expected entry. */
  statements: StatementDiff[];
  /** Expected lines with no actual statement. */
  missingStatements: StatementDiff[];
  /** Actual statements with no expected entry (failures in closed mode). */
  extraStatements: StatementDiff[];
  /** Populated only when either side declares parse errors. */
  errors: DiffEntry[];
  /** Populated when the case itself could not run (bad DSL, bad shape). */
  thrown?: string;
}

/** Metric DSL as stored in JSON → harness MetricLine (parseMetricLine wants `- `). */
function toMetricLine(dsl: string): MetricLine {
  return parseMetricLine(dsl.startsWith('- ') ? dsl : `- ${dsl}`, 'parser-test', 0);
}

/** Validate one metric DSL line; returns the FixtureSyntaxError message, or null when parseable. */
export function validateMetricDsl(dsl: string): string | null {
  try {
    toMetricLine(dsl);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** Greedy pairing result: statements with their consumed expected entry (or null) plus never-consumed entries. */
export interface ExpectedPairing {
  pairs: Array<{ statement: ICodeStatement; entryIndex: number | null }>;
  orphanEntryIndexes: number[];
}

/**
 * Greedy pairing of expected entries to parsed statements: each statement
 * consumes the first unconsumed entry on its line (order-preserving), so a
 * line with several statements needs one entry per statement.
 */
export function pairExpectedToStatements(
  statements: readonly ICodeStatement[],
  expected: readonly ExpectedLine[],
): ExpectedPairing {
  const consumed: Record<number, true> = {};
  const pairs = statements.map((statement) => {
    const entryIndex = expected.findIndex(
      (entry, i) => !consumed[i] && entry.line === (statement.line ?? 0),
    );
    if (entryIndex === -1) return { statement, entryIndex: null };
    consumed[entryIndex] = true;
    return { statement, entryIndex };
  });
  const orphanEntryIndexes = expected.map((_, i) => i).filter((i) => !consumed[i]);
  return { pairs, orphanEntryIndexes };
}

function diffStatementEntries(diff: StatementMetricDiff): DiffEntry[] {
  return [
    ...diff.matched.map((m): DiffEntry => ({ kind: 'match', dsl: renderMetric(m.actual) })),
    ...diff.missingExpected.map((l): DiffEntry => ({
      kind: 'missing-expected',
      dsl: l.source.startsWith('- ') ? l.source.slice(2) : l.source,
    })),
    ...diff.extraActual.map((m): DiffEntry => ({ kind: 'extra-actual', dsl: renderMetric(m) })),
  ];
}

function errorKey(e: { line?: number; message: string }): string {
  return `line ${e.line ?? '?'}: "${e.message}"`;
}

function diffErrors(expected: ExpectedError[], actual: ParseError[]): DiffEntry[] {
  const remaining = [...actual];
  const entries: DiffEntry[] = [];
  for (const exp of expected) {
    const hit = remaining.findIndex((a) => a.line === exp.line && a.message === exp.message);
    if (hit === -1) {
      entries.push({ kind: 'missing-expected', dsl: errorKey(exp) });
    } else {
      entries.push({ kind: 'match', dsl: errorKey(remaining.splice(hit, 1)[0]!) });
    }
  }
  for (const a of remaining) {
    entries.push({ kind: 'extra-actual', dsl: errorKey(a) });
  }
  return entries;
}

/** Run one case: parse, compare, structured diff. Throws only on invalid case shape/DSL. */
export function runCase(testCase: ParserTestCase): CaseResult {
  const mode: MatchMode = testCase.matchMode ?? 'closed';
  const script = parseScript(testCase.script, {
    ...(testCase.sport ? { sport: testCase.sport } : {}),
    ...(testCase.withoutDialects ? { withoutDialects: true } : {}),
  });

  const result: CaseResult = {
    name: testCase.name,
    status: 'pass',
    parseFailed: false,
    statements: [],
    missingStatements: [],
    extraStatements: [],
    errors: [],
  };

  const expectedErrors = testCase.errors ?? [];
  const actualErrors = script.errors ?? [];
  if (expectedErrors.length > 0 || actualErrors.length > 0) {
    result.parseFailed = actualErrors.length > 0;
    result.errors = diffErrors(expectedErrors, actualErrors);
    const exact =
      expectedErrors.length === actualErrors.length &&
      result.errors.every((e) => e.kind === 'match');
    result.status = exact ? 'pass' : 'fail';
    return result;
  }

  const expectations = testCase.expected.map((entry) => entry.metrics.map(toMetricLine));
  const { pairs, orphanEntryIndexes } = pairExpectedToStatements(script.statements, testCase.expected);

  for (const { statement, entryIndex } of pairs) {
    if (entryIndex === null) {
      result.extraStatements.push({
        line: statement.line ?? 0,
        text: statement.text,
        status: mode === 'closed' ? 'fail' : 'pass',
        entries: statement.metrics.getAll().map((m): DiffEntry => ({ kind: 'extra-actual', dsl: renderMetric(m) })),
      });
      continue;
    }
    const diff = diffStatement(expectations[entryIndex]!, statement.metrics.getAll());
    const pass = diff.missingExpected.length === 0 && (mode === 'subset' || diff.extraActual.length === 0);
    result.statements.push({
      line: statement.line ?? 0,
      text: statement.text,
      status: pass ? 'pass' : 'fail',
      entries: diffStatementEntries(diff),
    });
  }

  for (const i of orphanEntryIndexes) {
    const entry = testCase.expected[i]!;
    result.missingStatements.push({
      line: entry.line,
      status: 'fail',
      entries: entry.metrics.map((dsl): DiffEntry => ({ kind: 'missing-expected', dsl })),
    });
  }

  const allPass =
    [...result.statements, ...result.missingStatements, ...result.extraStatements]
      .every((d) => d.status === 'pass');
  result.status = allPass ? 'pass' : 'fail';
  return result;
}

/** Run every case in a file; a broken case degrades to a `thrown` result instead of rejecting the batch. */
export function runFile(file: ParserTestFile): CaseResult[] {
  return file.cases.map((testCase) => {
    try {
      return runCase(testCase);
    } catch (e) {
      return {
        name: testCase.name,
        status: 'fail',
        parseFailed: false,
        statements: [],
        missingStatements: [],
        extraStatements: [],
        errors: [],
        thrown: e instanceof Error ? e.message : String(e),
      } satisfies CaseResult;
    }
  });
}

/**
 * Seed an `expected` array from what the parser produces today — the
 * builder's "accept current output" starting point (renderMetric output
 * round-trips through parseMetricLine).
 */
export function expectedFromStatements(statements: readonly ICodeStatement[]): ExpectedLine[] {
  return statements.map((statement) => ({
    line: statement.line ?? 0,
    metrics: statement.metrics.getAll().map((m) => renderMetric(m)),
  }));
}
