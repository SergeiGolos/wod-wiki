# CrossFit Dialect — Metric Testing Plan

**Date:** 2026-04-28  
**Goal:** Implement the `MetricAction` system and write comprehensive CrossFit dialect tests  
covering metric injection, suppression, display resolution, and nesting.

---

## Current State

`CrossFitDialect.analyze()` returns only `hints: string[]`.  
`DialectRegistry.process()` only applies hints to `statement.hints`.  
No metric injection, suppression, or inheritance is wired anywhere.  
`IMetric` has no `action` field. `MetricOrigin` has no `'dialect'` value.

The existing `CrossFitDialect.test.ts` tests only check `analysis.hints` —  
they call `dialect.analyze(statement)` directly and never touch `statement.metrics`.

---

## Files to Change

| File | Change |
|------|--------|
| `src/core/models/Metric.ts` | Add `MetricAction` type; add `action?` to `IMetric`; add `'dialect'` to `MetricOrigin` |
| `src/core/utils/metricPrecedence.ts` | Add `'dialect': 2` to `ORIGIN_PRECEDENCE`; filter `action:'suppress'` in `resolveMetricPrecedence` |
| `src/core/models/Dialect.ts` | Update `DialectAnalysis.metrics` to `IMetric[]` (flat, action-bearing) |
| `src/services/DialectRegistry.ts` | Apply returned `metrics[]` onto `statement.metrics` after hint pass |
| `src/dialects/CrossFitDialect.ts` | Return metric synthesis + suppression from `analyze()` |

## Files to Create

| File | Purpose |
|------|---------|
| `src/dialects/__tests__/dialect-test-helpers.ts` | `runDialectFixture()` + child resolver |
| `src/dialects/__tests__/capture-fixture.ts` | CLI: parse block → print JSON snapshot |
| `src/dialects/__tests__/CrossFitDialect.metrics.test.ts` | New metric-level tests (hints + metrics + display) |

---

## Step-by-step Plan

### Step 1 — Extend `Metric.ts`

Add `MetricAction` union type and `action?` field to `IMetric`.  
Add `'dialect'` to `MetricOrigin`.

```typescript
export type MetricAction = 'set' | 'suppress' | 'inherit';

export interface IMetric {
  // ... existing fields ...
  readonly action?: MetricAction;  // undefined = passive (parser metrics never set this)
}

export type MetricOrigin =
  | 'parser' | 'compiler' | 'runtime' | 'user' | 'dialect'  // ← add 'dialect'
  | 'collected' | 'hinted' | 'tracked' | 'analyzed' | 'execution';
```

### Step 2 — Update `metricPrecedence.ts`

Add `'dialect': 2` (same tier as compiler).  
Update `resolveMetricPrecedence` to filter out metrics where `action === 'suppress'`  
(suppression sentinel hides its matching type from display).

```typescript
// In ORIGIN_PRECEDENCE:
'dialect': 2,

// In resolveMetricPrecedence, after filtering:
// Remove suppressed metrics from display
const suppressedTypes = new Set(
  filtered.filter(m => m.action === 'suppress').map(m => m.type)
);
filtered = filtered.filter(m =>
  m.action !== 'suppress' && !suppressedTypes.has(m.type)
);
```

Note: suppression sentinel itself is filtered out, AND all other metrics of that  
type from lower-precedence tiers are also hidden. The raw `statement.metrics` still  
contains both — only `getDisplayMetrics()` hides them.

### Step 3 — Update `Dialect.ts`

Flatten `DialectAnalysis.metrics` to `IMetric[]`:

```typescript
import { IMetric } from './Metric';

export interface DialectAnalysis {
  hints: string[];
  metrics?: IMetric[];           // action-bearing metrics to apply to statement
  inheritance?: InheritanceRule[];
}
```

### Step 4 — Update `DialectRegistry.process()`

After processing hints, push returned metrics onto `statement.metrics`:

```typescript
process(statement: ICodeStatement): void {
  if (!statement.hints) statement.hints = new Set();

  for (const dialect of this.dialects.values()) {
    const analysis = dialect.analyze(statement);

    for (const hint of analysis.hints) {
      statement.hints.add(hint);
    }

    // Apply dialect metrics
    if (analysis.metrics?.length) {
      statement.metrics.push(...analysis.metrics);
    }
  }
}
```

### Step 5 — Update `CrossFitDialect.analyze()`

Implement metric synthesis for EMOM and label suppression.  
Three EMOM cases:

| Input | Condition | Dialect action |
|-------|-----------|----------------|
| `(20) EMOM` | Rounds ✓, Duration ✗ | Synthesize Duration=60000, suppress Action="EMOM" |
| `(20) EMOM :30` | Rounds ✓, Duration ✓ | Only suppress Action="EMOM" |
| `EMOM 20 mins` | Duration ✓ (total), Rounds ✗ | Synthesize Rounds=duration/60000, suppress Action="EMOM" |

```typescript
// In analyze(), after hint detection:
const metricsToAdd: IMetric[] = [];

if (isEmom) {
  const hasRounds = metrics.some(m => m.type === MetricType.Rounds);
  const hasDuration = metrics.some(m => m.type === MetricType.Duration);

  if (!hasDuration) {
    metricsToAdd.push({
      type: MetricType.Duration, value: 60000, unit: 'ms',
      origin: 'dialect', action: 'set'
    });
  } else if (!hasRounds) {
    const totalMs = metrics.find(m => m.type === MetricType.Duration)?.value as number;
    if (totalMs) {
      metricsToAdd.push({
        type: MetricType.Rounds, value: Math.round(totalMs / 60000),
        origin: 'dialect', action: 'set'
      });
    }
  }

  // Suppress the EMOM label from display — it's consumed as structural keyword
  metricsToAdd.push({
    type: MetricType.Action, value: 'EMOM',
    origin: 'dialect', action: 'suppress'
  });
}

return { hints, metrics: metricsToAdd };
```

### Step 6 — Create `dialect-test-helpers.ts`

Shared fixture runner with child resolver. Located at:  
`src/dialects/__tests__/dialect-test-helpers.ts`

### Step 7 — Create `CrossFitDialect.metrics.test.ts`

Full test suite covering:
- Metric injection (synthesis when missing)
- No injection when already present
- Suppression (sentinel in raw, hidden in display)
- Hint + metric together in one pass
- Nesting: child statements accessible via resolved tree
- `it.failing()` for inheritance (not yet wired)

### Step 8 — Create `capture-fixture.ts`

CLI tool to snapshot current parse output to JSON.  
Input: wod block text + dialect name.  
Output: structured JSON of all statements with metrics, hints, children.

---

## Test Cases (CrossFit EMOM Matrix)

```
EMOM (20)                    → Duration=60000 (dialect), Rounds=20 (parser)
EMOM (20) :30                → Duration=30000 (parser),  Rounds=20 (parser)
EMOM 20 mins                 → Duration=1200000 (parser), Rounds=20 (dialect)
(20) EMOM                    → Rounds=20 (parser), Duration=60000 (dialect)
(20) EMOM :30                → Rounds=20 (parser), Duration=30000 (parser)
(20) :60\n  5 pullups\n...   → implicit EMOM, Rounds=20 (parser), Duration=60000 (parser)
```

Plus:
- AMRAP: label consumed, Duration present, time_bound hint
- TABATA: label consumed, 20s/:10s intervals
- FOR TIME: label consumed, time_bound hint

---

## Validation

After implementation, run:
```bash
cd ~/projects/wod-wiki/wod-wiki
bun test src/dialects
bun test src/core/utils/__tests__/metricPrecedence.test.ts
bun test src/services/__tests__/DialectRegistry.test.ts
bun x tsc --noEmit
```

All new tests green. Existing hint tests should remain green (no behavior removal).  
TypeScript strict mode passes with new `action?` optional field.
