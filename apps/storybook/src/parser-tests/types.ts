/**
 * JSON schema for side-loaded parser test files (`ParserTests/*` stories).
 *
 * A file holds many cases; each case pins a script plus the expected metric
 * DSL lines (same grammar as the vitest fixture catalog in
 * `packages/lang/tests/fixtures/parser/*.md`, see `parseMetricLine`) so both
 * harnesses share one comparison semantic via
 * `@bitcobblers/wod-wiki-lang`'s `diffStatement`.
 */

/** One metric expectation in DSL form, e.g. `Rep 10 @parser`. */
export type MetricDsl = string;

/** Expected metrics for one source line (one entry per parsed statement). */
export interface ExpectedLine {
  line: number;
  metrics: MetricDsl[];
}

export interface ExpectedError {
  line: number;
  message: string;
}

export interface ParserTestCase {
  name: string;
  script: string;
  /** `:sport` fence suffix — selects the dialect stack slice. */
  sport?: string;
  withoutDialects?: boolean;
  /** `closed` (default) = exact multiset; `subset` = extras pass. */
  matchMode?: 'closed' | 'subset';
  expected: ExpectedLine[];
  /** When either side has parse errors, errors replace statement comparison. */
  errors?: ExpectedError[];
}

export interface ParserTestFile {
  version: 1;
  title: string;
  cases: ParserTestCase[];
}

/** Sentinel data-testid prefix for the parser-test surfaces. */
export const PARSER_TEST_NS = 'parser-tests';
