# How to Build Dialects

> **Audience**: Contributors adding new domain-specific behavior to WOD Wiki's workout parser.  
> **Context**: The dialect system sits between the parser and the JIT compiler. After a workout script is parsed into `CodeStatement` objects, each registered dialect inspects every statement and emits **semantic hints** — dot-namespaced string tags that downstream strategies and UI components use to decide how to compile and display the workout.

---

## 1. Architecture Overview

```
WOD Script Text
     │
     ▼
  MdTimerRuntime.read()
     │  ← produces ICodeStatement[]
     ▼
  DialectRegistry.processAll()
     │  ← calls IDialect.analyze() for each statement
     │  ← merges hints into statement.hints (Set<string>)
     ▼
  JitCompiler
     │  ← strategies query hints when selecting block types
     ▼
  RuntimeBlock[]
```

Key interfaces:

| File | What it defines |
|------|----------------|
| `src/core/models/Dialect.ts` | `IDialect`, `DialectAnalysis`, `InheritanceRule` |
| `src/core/models/CodeStatement.ts` | `ICodeStatement` — the unit a dialect analyzes |
| `src/core/models/Metric.ts` | `MetricType` enum — what the parser can produce |
| `src/services/DialectRegistry.ts` | Multi-dialect registration and `processAll()` |

---

## 2. The `IDialect` Interface

```typescript
// src/core/models/Dialect.ts
export interface IDialect {
  /** Unique identifier — used by DialectRegistry.get() */
  id: string;
  /** Human-readable display name */
  name: string;
  /**
   * Analyze a parsed statement and return semantic hints.
   * Called after parsing, before JIT compilation.
   */
  analyze(statement: ICodeStatement): DialectAnalysis;
}

export interface DialectAnalysis {
  /** Behavioral hints to add to the statement */
  hints: string[];
  /** Inheritance rules for child statements (future — unused by default) */
  inheritance?: InheritanceRule[];
}
```

Your dialect implements `IDialect`, overrides `analyze()`, and returns a `DialectAnalysis` with an array of hint strings.

---

## 3. Hint Naming Convention

Hints are **dot-namespaced strings**. Follow this taxonomy:

| Prefix | Meaning | Examples |
|--------|---------|---------|
| `domain.*` | Which fitness domain owns this statement | `domain.crossfit`, `domain.yoga`, `domain.cardio` |
| `workout.*` | Specific workout type or pattern | `workout.amrap`, `workout.run`, `workout.pose` |
| `behavior.*` | Abstract behavioral trait | `behavior.time_bound`, `behavior.distance_based`, `behavior.hold` |
| `feature.*` | Optional feature flag | `feature.auto_advance`, `feature.streak_tracking` |

Rules:
- Always use lowercase snake_case after the dot (`workout.for_time` not `workout.forTime`).
- Be as specific as needed — `workout.implicit_emom` is fine alongside `workout.emom`.
- Dialects **do not remove** existing hints; they only add.
- The hint `Set` deduplicates automatically — emitting the same hint twice is safe.

---

## 4. What the Parser Produces (`MetricType`)

Before writing dialect logic, understand which metric types the parser emits for typical input. Use the `describeMetrics()` helper in the test files to inspect live output.

| MetricType | When produced | Example input |
|------------|--------------|--------------|
| `Duration` | Time values | `5:00`, `20 mins`, `:30` |
| `Rep` | Integer counts | `10`, `5x` |
| `Rounds` | Parenthesized counts | `(3)`, `(20)` |
| `Effort` | Exercise names | `Pullups`, `Back Squat` |
| `Action` | Keyword-first lines | `AMRAP 20 mins`, `Run` |
| `Distance` | Distance values | `400m`, `5km`, `1 mile` |
| `Resistance` | Weight values | `225lb`, `32kg` |
| `Increment` | `^` modifier | `^` |
| `Text` | Markdown headings | `# Strength Day` |

---

## 5. Step-by-Step: Creating a New Dialect

### Step 1 — Create the dialect file

```
src/dialects/MyDialect.ts
```

```typescript
import { IDialect, DialectAnalysis } from '../core/models/Dialect';
import { ICodeStatement } from '../core/models/CodeStatement';
import { MetricType, IMetric } from '../core/models/Metric';

export class MyDialect implements IDialect {
  id = 'my-dialect';
  name = 'My Dialect';

  /** Case-insensitive check on Action/Effort metrics */
  private hasKeyword(metrics: IMetric[], keyword: string): boolean {
    return metrics.some(
      m =>
        (m.type === MetricType.Action || m.type === MetricType.Effort) &&
        typeof m.value === 'string' &&
        m.value.toUpperCase().includes(keyword.toUpperCase())
    );
  }

  analyze(statement: ICodeStatement): DialectAnalysis {
    const hints: string[] = [];
    const metrics = statement.metrics ?? [];

    if (this.hasKeyword(metrics, 'MY_KEYWORD')) {
      hints.push('domain.my-dialect');
      hints.push('workout.my-pattern');
    }

    return { hints };
  }
}
```

### Step 2 — Export from the barrel

```typescript
// src/dialects/index.ts
export { MyDialect } from './MyDialect';
```

### Step 3 — Create the test file

```
src/dialects/MyDialect.test.ts
```

Follow the pattern in the existing test files. The key scaffolding:

```typescript
import { describe, it, expect } from 'bun:test';
import { MyDialect } from './MyDialect';
import { MdTimerRuntime } from '../parser/md-timer';
import { ICodeStatement } from '../core/models/CodeStatement';

describe('MyDialect', () => {
  const dialect = new MyDialect();
  const runtime = new MdTimerRuntime();

  function parseStatement(text: string): ICodeStatement {
    const script = runtime.read(text);
    if (!script.statements.length) throw new Error(`No statements from: "${text}"`);
    return script.statements[0] as ICodeStatement;
  }

  /** Print metric payload — use to understand parser output */
  function describeMetrics(stmt: ICodeStatement): string {
    return (
      '[ ' +
      (stmt.metrics ?? [])
        .map(m => `${m.type}=${JSON.stringify(m.value)}${m.unit ?? ''}`)
        .join(', ') +
      ' ]'
    );
  }

  describe('dialect metadata', () => {
    it('should have id "my-dialect"', () => expect(dialect.id).toBe('my-dialect'));
  });

  describe('MY_KEYWORD detection', () => {
    it('should detect keyword and emit expected hints', () => {
      const stmt = parseStatement('MY_KEYWORD workout');
      console.log('metrics:', describeMetrics(stmt)); // inspect parser output
      const analysis = dialect.analyze(stmt);
      expect(analysis.hints).toContain('domain.my-dialect');
      expect(analysis.hints).toContain('workout.my-pattern');
    });
  });
});
```

Run with:
```bash
bun test src/dialects/MyDialect.test.ts --preload ./tests/unit-setup.ts
```

### Step 4 — Register in your runtime context

Dialects are registered with a `DialectRegistry` instance that gets passed to the `JitCompiler`. Register your dialect wherever the compiler is assembled:

```typescript
import { DialectRegistry } from '@/services/DialectRegistry';
import { MyDialect } from '@/dialects/MyDialect';

const registry = new DialectRegistry();
registry.register(new MyDialect());
// pass registry to JitCompiler / WorkoutTestHarness etc.
```

---

## 6. Understanding Metric Inspection in Tests

The dual-inspection pattern (metrics + hints) in the test files is intentional:

```typescript
it('should detect X and emit hints', () => {
  const stmt = parseStatement('X input text');

  // ① Print what the parser produced — this is your "input" to the dialect
  console.log('metrics:', describeMetrics(stmt));

  // ② Run the dialect
  const analysis = dialect.analyze(stmt);

  // ③ Assert the expected hints
  expect(analysis.hints).toContain('domain.my-dialect');
});
```

When a test fails or produces unexpected hints, the `console.log` output lets you see immediately whether the parser produced the metric types your dialect expects. This is especially useful when:
- A keyword parses as `Effort` instead of `Action` (or vice versa)
- A distance value produces a `Distance` metric vs being embedded in an `Effort` string
- A number produces `Rep` vs `Rounds` vs `Duration`

---

## 7. Multi-Statement Scripts

For dialects that care about **parent blocks** (e.g., a block with children implies an EMOM):

```typescript
// Parse a multi-line script — children are referenced by ID
const script = runtime.read(`(20) :60
  5 Pushups
  10 Situps`);

const parent = script.statements[0] as ICodeStatement;
// parent.children is a number[][] of child statement ID groups
const hasChildren = parent.children && parent.children.length > 0;
```

---

## 8. Registering Multiple Dialects

Dialects compose — register multiple for a single session:

```typescript
const registry = new DialectRegistry();
registry.register(new CrossFitDialect());
registry.register(new WodDialect());
registry.register(new CardioDialect());

// All three will analyze every statement in order.
// Hints from all dialects are merged onto statement.hints.
registry.processAll(statements);
```

Hints from earlier dialects are preserved; later dialects only add. There is no conflict — a statement can have hints from multiple domains simultaneously.

---

## 9. Current Dialect Inventory

| Dialect class | `id` | Domain |
|--------------|------|--------|
| `CrossFitDialect` | `crossfit` | AMRAP, EMOM, FOR TIME, TABATA |
| `WodDialect` | `wod` | STRENGTH, METCON, SKILLS, WOD, SUPERSET |
| `CardioDialect` | `cardio` | RUN, ROW, BIKE, SWIM, WALK, distance-only |
| `YogaDialect` | `yoga` | poses, flows, breathing, meditation |
| `HabitsDialect` | `habits` | daily habits, streaks, check-offs |

All dialects are exported from `src/dialects/index.ts`.

---

## 10. Further Reading

- `src/core/models/Dialect.ts` — `IDialect` interface and `DialectAnalysis` type
- `src/core/models/Metric.ts` — full `MetricType` enum with documentation
- `src/services/DialectRegistry.ts` — registry implementation
- `src/dialects/CrossFitDialect.ts` — reference implementation (most complete)
- `docs/brainstorm-dialects.md` — architectural brainstorm with proposed future directions (two-axis dialect registry, metric mutation strategies)
