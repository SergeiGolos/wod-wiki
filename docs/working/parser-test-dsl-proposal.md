# Proposal: Parser-Level Test DSL for Whiteboard Language

> Extends the existing runtime compliance test pattern to support **parser-only** testing:
> parse Whiteboard Script → apply dialects → assert on CodeStatement trees and metrics.
> No runtime, no clock, no JIT — just the language layer.

---

## 0. Current State

### Runtime Compliance Tests (existing)

```
Script text → parse → dialects → JIT compile → ScriptRuntime → clock → assertions
```

Uses `SessionTestContext` from `tests/jit-compilation/helpers/session-test-utils.ts`:
- `createSessionContext(scriptText)` — parses, creates runtime with full compiler + mock clock
- `startSession(ctx)` — pushes SessionRootBlock
- `userNext(ctx)` — simulates user clicking Next
- `advanceClock(ctx, ms)` — advances mock clock
- Assert on: stack depth, blockType, output statements, metric types

### Parser Tests (existing, fragmented)

Scattered across several files with **no shared harness**:

| File | What it tests | Pattern |
|------|--------------|---------|
| `tests/language-compilation/syntax_features.test.ts` | Raw parser output | `new MdTimerRuntime().read(code)` → check `statements[0].metrics` |
| `tests/language-compilation/parser-integration.test.ts` | Parser edge cases | Same `MdTimerRuntime` |
| `src/dialects/*.test.ts` | Each dialect in isolation | Parse → `dialect.analyze(statement)` → check hints |
| `tests/parser/lezer-whiteboardscript.test.ts` | Lezer grammar tokens | Low-level tree inspection |
| `tests/parser/unit-flexibility.test.ts` | Unit fusion | Parse + UnitsDialect |

**Problem:** No unified harness that chains parse → dialect stack → assertions in one place. Each dialect test re-implements its own `parseStatement` helper. No way to assert on the *full* statement tree (parent/child relationships, metric collections, hints from all dialects combined).

---

## 1. Proposed Interfaces

### 1.1 `ParserTestContext` — the parse-level equivalent of `SessionTestContext`

```typescript
/**
 * Parser-level test context: holds the result of parsing Whiteboard Script
 * text through the full dialect stack, providing structured access to the
 * CodeStatement tree for assertions.
 *
 * This is the parse-only counterpart to SessionTestContext — no runtime,
 * no clock, no JIT compilation.
 */
export interface ParserTestContext {
    /** The original script text */
    readonly source: string;

    /** The parsed WhiteboardScript */
    readonly script: WhiteboardScript;

    /** All statements after parsing + dialect processing, topologically ordered */
    readonly statements: readonly ICodeStatement[];

    /** The DialectRegistry used (for inspection) */
    readonly dialects: DialectRegistry;

    /** Parse errors, if any */
    readonly errors: readonly ParseError[];
}
```

### 1.2 `createParserContext()` — the builder entry point

```typescript
/**
 * Creates a parser test context by parsing script text through the
 * full dialect stack. This is the parse-only equivalent of
 * createSessionContext().
 *
 * @param scriptText - Whiteboard Script source (the body of a wod block)
 * @param options    - Optional dialect configuration
 */
export function createParserContext(
    scriptText: string,
    options?: ParserTestOptions
): ParserTestContext;

export interface ParserTestOptions {
    /**
     * Dialects to register. Defaults to the full production stack:
     * UnitsDialect → CrossFitDialect → WodDialect → CardioDialect →
     * YogaDialect → HabitsDialect → ClimbDialect
     *
     * Pass [] to skip dialects entirely (pure parser output).
     * Pass a subset to test specific dialect interactions.
     */
    dialects?: IDialect[];

    /**
     * Fence dialect hint — simulates which fence the block came from.
     * Some dialects may behave differently for 'wod' vs 'log' vs 'plan'.
     * Default: 'wod'
     */
    fenceDialect?: FenceDialect;
}
```

### 1.3 `StatementAssertion` — structured assertion helpers

These are the parse-level equivalents of `currentBlockType()`,
`blockHasDisplayMetric()`, etc. from the runtime tests.

```typescript
/**
 * Fluent assertion API for a single CodeStatement.
 * Obtained via `expectStatement(ctx, index)` or `statementAt(ctx, 0)`.
 */
export interface StatementAssertions {
    // ── Identity ────────────────────────────────────────────────

    /** Assert the statement at this index has the given number of children */
    hasChildren(count: number): this;

    /** Assert this statement is a leaf (no children) */
    isLeaf(): this;

    /** Assert this statement has the given parent ID */
    hasParent(parentId: number): this;

    /** Assert this statement has no parent (it's a root statement) */
    isRoot(): this;

    // ── Metrics ─────────────────────────────────────────────────

    /** Assert the statement has a metric of the given type */
    hasMetric(type: MetricType): this;

    /** Assert the statement does NOT have a metric of the given type */
    lacksMetric(type: MetricType): this;

    /** Assert a specific metric's value */
    hasMetricValue(type: MetricType, value: unknown): this;

    /** Assert a specific metric's numeric value (with optional tolerance) */
    hasMetricNear(type: MetricType, value: number, tolerance?: number): this;

    /** Assert the total number of metrics on this statement */
    hasMetricCount(count: number): this;

    /** Get all metric types present (for custom assertions) */
    metricTypes(): MetricType[];

    /** Get a specific metric (for custom assertions) */
    getMetric<T = unknown>(type: MetricType): IMetric<T> | undefined;

    /** Get the raw MetricContainer for advanced queries */
    metrics(): MetricContainer;

    // ── Hints (dialect-emitted) ─────────────────────────────────

    /** Assert the statement has the given dot-namespaced hint */
    hasHint(hint: string): this;

    /** Assert the statement does NOT have the given hint */
    lacksHint(hint: string): this;

    /** Assert the exact set of hints (order-insensitive) */
    hasExactHints(hints: string[]): this;

    /** Get all hints as a string array */
    hints(): string[];

    // ── Structure ───────────────────────────────────────────────

    /** Get the child statements (resolved from IDs to ICodeStatement) */
    children(): StatementAssertions[];

    /** Access the raw ICodeStatement for custom assertions */
    raw(): ICodeStatement;

    /** Get the statement's source line (from meta) */
    sourceLine(): string;

    /** Assert the statement's raw source text matches */
    hasSource(text: string): this;
}

// ── Tree-level assertions ────────────────────────────────────────

/**
 * Assertions on the full parsed statement tree.
 */
export interface TreeAssertions {
    /** Assert total number of statements in the tree */
    hasStatementCount(count: number): this;

    /** Assert number of root-level statements */
    hasRootCount(count: number): this;

    /** Get root-level statements */
    roots(): StatementAssertions[];

    /** Find statements matching a predicate */
    where(predicate: (s: StatementAssertions) => boolean): StatementAssertions[];

    /** Find the first statement containing a specific metric type */
    findByMetric(type: MetricType): StatementAssertions | undefined;

    /** Find the first statement with a specific hint */
    findByHint(hint: string): StatementAssertions | undefined;

    /** Get all statements as a flat array */
    all(): StatementAssertions[];

    /** Assert parse errors are present */
    hasErrors(): this;

    /** Assert no parse errors */
    hasNoErrors(): this;

    /** Assert error count */
    hasErrorCount(count: number): this;
}
```

### 1.4 Convenience entry functions

```typescript
// Primary entry: parse + assert in one line
export function parse(
    scriptText: string,
    options?: ParserTestOptions
): TreeAssertions;

// Get a specific statement by index
export function statementAt(
    ctx: ParserTestContext,
    index: number
): StatementAssertions;

// Get the tree assertion API from a context
export function tree(ctx: ParserTestContext): TreeAssertions;
```

---

## 2. Usage Examples

### 2.1 Basic: Parse a single effort, check metrics

```typescript
import { describe, it, expect } from 'bun:test';
import { parse } from '../helpers/parser-test-utils';
import { MetricType } from '@/core/models/Metric';

describe('Parser: Single Effort', () => {
    it('parses "10 Pullups" into Rep + Effort metrics', () => {
        const result = parse('10 Pullups');

        result
            .hasStatementCount(1)
            .roots()[0]
                .isLeaf()
                .hasMetric(MetricType.Rep)
                .hasMetricValue(MetricType.Rep, 10)
                .hasMetric(MetricType.Effort)
                .hasMetricValue(MetricType.Effort, 'Pullups');
    });
});
```

### 2.2 Nested: Rounds with children

```typescript
describe('Parser: Rounds with children', () => {
    it('parses "(3)\\n  10 Air Squats\\n  10 Push Ups"', () => {
        const result = parse('(3)\n  10 Air Squats\n  10 Push Ups');

        const parent = result.roots()[0];
        parent
            .hasChildren(2)
            .hasMetric(MetricType.Rounds)
            .hasMetricValue(MetricType.Rounds, 3);

        // Children inherit structure from parent
        const children = parent.children();
        expect(children).toHaveLength(2);

        children[0]
            .hasParent(parent.raw().id)
            .hasMetric(MetricType.Rep)
            .hasMetricValue(MetricType.Rep, 10)
            .hasMetricValue(MetricType.Effort, 'Air Squats');

        children[1]
            .hasMetric(MetricType.Rep)
            .hasMetricValue(MetricType.Rep, 10)
            .hasMetricValue(MetricType.Effort, 'Push Ups');
    });
});
```

### 2.3 Dialect: Hints from the full stack

```typescript
describe('Parser: Dialect hints', () => {
    it('CrossFitDialect detects AMRAP and WodDialect detects Metcon', () => {
        const result = parse('10:00 Metcon\n  5 Pullups\n  10 Pushups');

        const parent = result.roots()[0];
        parent
            .hasHint('workout.metcon')   // from WodDialect
            .hasHint('behavior.time_bound');  // might come from CrossFitDialect
    });

    it('CardioDialect detects distance patterns', () => {
        const result = parse('400m Run');

        result.roots()[0]
            .hasHint('domain.cardio')
            .hasHint('workout.run')
            .hasHint('behavior.distance_based');
    });

    it('no-dialect mode: pure parser output, no hints', () => {
        const result = parse('400m Run', { dialects: [] });

        result.roots()[0]
            .lacksHint('domain.cardio')
            .hasMetric(MetricType.Distance);  // parser still emits distance
    });
});
```

### 2.4 Metric types: Weight, distance, resistance

```typescript
describe('Parser: Weight and distance metrics', () => {
    it('parses "10 Clean & Jerk @ 135 lb"', () => {
        parse('10 Clean & Jerk @ 135 lb')
            .roots()[0]
            .hasMetric(MetricType.Rep)
            .hasMetricValue(MetricType.Rep, 10)
            .hasMetric(MetricType.Resistance)
            .hasMetricNear(MetricType.Resistance, 135)
            .hasMetricValue(MetricType.Effort, 'Clean & Jerk');
    });

    it('parses "400m Run"', () => {
        parse('400m Run')
            .roots()[0]
            .hasMetric(MetricType.Distance)
            .hasMetricNear(MetricType.Distance, 400);
    });

    it('parses "Run 1/4 mile" (fraction)', () => {
        parse('Run 1/4 mile')
            .roots()[0]
            .hasMetric(MetricType.Distance)
            .hasMetricNear(MetricType.Distance, 0.25, 0.001);
    });
});
```

### 2.5 Error handling

```typescript
describe('Parser: Error handling', () => {
    it('empty input produces zero statements and no errors', () => {
        parse('')
            .hasStatementCount(0)
            .hasNoErrors();
    });

    it('gracefully handles malformed input', () => {
        parse('invalid {{{ syntax')
            .hasErrors();
    });
});
```

### 2.6 Cross-dialect interaction

```typescript
describe('Parser: Cross-dialect interaction', () => {
    it('UnitsDialect + CardioDialect: "5km Run" fuses distance then hints', () => {
        const result = parse('5km Run');

        result.roots()[0]
            .hasMetric(MetricType.Distance)
            .hasMetricNear(MetricType.Distance, 5)
            .hasHint('domain.cardio')
            .hasHint('behavior.distance_based')
            .hasHint('behavior.pace_based');
    });

    it('selective dialect: only UnitsDialect (no hint emission)', () => {
        const result = parse('5km Run', {
            dialects: [new UnitsDialect()]
        });

        result.roots()[0]
            .hasMetric(MetricType.Distance)
            .hasMetricNear(MetricType.Distance, 5)
            .lacksHint('domain.cardio');
    });
});
```

### 2.7 Shared with runtime tests: parser validation before engine

```typescript
/**
 * This pattern lets you validate parsing AND runtime in the same describe block.
 * Parse first, assert the statement tree is correct, THEN pass to the runtime.
 */
describe('EMOM: parse then run', () => {
    const SCRIPT = '(3) :60 EMOM\n  + 5 Pullups\n  + 10 Pushups';

    it('parser produces correct statement tree', () => {
        const result = parse(SCRIPT);

        result
            .hasStatementCount(3); // parent + 2 children

        const parent = result.roots()[0];
        parent
            .hasChildren(2)
            .hasMetric(MetricType.Rounds)
            .hasMetricValue(MetricType.Rounds, 3)
            .hasMetric(MetricType.Duration);

        // Children are composed (+ prefix)
        const children = parent.children();
        children[0].hasMetricValue(MetricType.Effort, 'Pullups');
        children[1].hasMetricValue(MetricType.Effort, 'Pushups');
    });

    it('runtime executes the EMOM correctly', () => {
        // Existing runtime test pattern
        let ctx = createSessionContext(SCRIPT);
        startSession(ctx, { label: 'EMOM' });
        // ... runtime assertions ...
        disposeSession(ctx);
    });
});
```

---

## 3. File Structure

```
tests/
  helpers/
    parser-test-utils.ts          ← NEW: parse(), ParserTestContext, assertion classes
    session-test-utils.ts         ← EXISTING: runtime test harness
  parser-compliance/              ← NEW: parser-level compliance tests
    effort.parser.test.ts
    timer.parser.test.ts
    rounds.parser.test.ts
    metrics.parser.test.ts
    dialect-hints.parser.test.ts
    tree-structure.parser.test.ts
  runtime-compliance/             ← EXISTING: runtime compliance tests (unchanged)
```

---

## 4. Implementation Plan

### Phase 1: `parser-test-utils.ts` core

Create the file with:
1. `ParserTestContext` interface
2. `createParserContext()` function (parse + dialect application)
3. `StatementAssertions` class (fluent API)
4. `TreeAssertions` class
5. `parse()` convenience function

### Phase 2: Migrate existing parser tests

Move the assertion patterns from:
- `tests/language-compilation/syntax_features.test.ts`
- `src/dialects/*.test.ts`

Into the new `tests/parser-compliance/` structure using `parse()`.

### Phase 3: New parser compliance tests

Write new compliance tests that cover:
- Full statement tree structure (parent/child resolution)
- Combined dialect output (all dialects in sequence)
- Metric origin tracking (parser vs dialect)
- Edge cases in the grammar

---

## 5. Key Design Decisions

### Why fluent API instead of raw assertions?

The runtime tests use raw `expect()` calls against session context. But parser assertions are more structural (tree shape, metric collections, hint sets) and compose better fluently:

```typescript
// Fluent: reads like a spec
result.roots()[0].hasChildren(2).hasMetric(MetricType.Rounds).hasHint('workout.amrap');

// Raw: equivalent but noisier
const root = ctx.script.statements[0];
expect(root.children).toHaveLength(2);
expect(root.metrics.hasMetric(MetricType.Rounds)).toBe(true);
expect(getHints(root.metrics)).toContain('workout.amrap');
```

Both are valid. The fluent API is sugar — `StatementAssertions` delegates to the same underlying `MetricContainer` and `ICodeStatement` methods. Users can drop down to `raw()` at any point.

### Why `parse()` returns `TreeAssertions` not `ParserTestContext`?

Convenience. For 90% of tests, `parse()` is all you need. For the 10% that need the context (dialect registry inspection, error details), `createParserContext()` gives full access.

### Why support `{ dialects: [] }`?

Pure parser testing — validate what the Lezer grammar produces before any dialect touches it. Critical for testing that the grammar itself is correct independently of semantic analysis.

### Why share the `tests/helpers/` directory?

`parser-test-utils.ts` and `session-test-utils.ts` are siblings. The runtime harness can import from the parser harness to validate parse output before running it through the engine (the "parse then run" pattern in §2.7).

---

## 6. Open Questions

1. **Fence tag simulation:** The parser currently takes raw text (the body inside a `wod` block). Should the harness wrap it in a fence, or keep taking raw text? Current `MdTimerRuntime.read()` takes raw body text — I'd keep that.

2. **Metric origin tracking:** `MetricType` values don't currently carry an `origin` field in the parsed output. For parser tests, origin is always `'parser'` or `'dialect'`. Should the assertion API expose origin, or is type+value sufficient? Suggesting: type+value for now, origin as a future extension.

3. **Statement ID stability:** Parsed statement IDs are sequential integers starting at 0. Tests should NOT assert on specific IDs (fragile). The `hasParent()` assertion should accept a `StatementAssertions` object, not a raw ID:

   ```typescript
   // Good:
   children[0].hasParent(parent);
   // Avoid:
   children[0].hasParent(0);  // fragile if tree shape changes
   ```

4. **Lap marker assertions:** `+` / `-` prefix markers are parsed as lap markers. Should the API have `hasLapMarker('+')` / `hasLapMarker('-')` or just check the metric type? Suggesting: add `hasLap(marker: '+' | '-')` for readability.
