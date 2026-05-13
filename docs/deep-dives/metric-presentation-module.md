# Metric Presentation Module — Problem, Solution, and Benefits

**Date:** 2026-05-08
**Status:** Design proposal
**Opportunity:** D from `docs/persistence-metrics-assessment-2026-05-08.md`
**Prior art:** `docs/metric-presentation-implementation-deep-dive-2026-05-07.md`
**Scope:** All modules that filter, label, colour, or render `IMetric` objects

---

## 1. Problem

### 1.1 The Same Display Rules Are Written Five Times

Five separate modules independently decide which metrics to show and how to render
them. Each implements the same three rules with slightly different code:

**Rule A — Hide structural `group` markers (`+`, `-`):**

```typescript
// MetricVisualizer.tsx
if (type === 'group' && (image === '+' || image === '-')) return false;

// MetricSourceRow.tsx
if (type === 'group' && (image === '+' || image === '-')) return false;

// RuntimeHistoryLog.tsx
if (type === 'group' && (image === '+' || image === '-')) return false;

// timer-panel.tsx
if (type === 'group' && (image === '+' || image === '-')) return false;

// LabelComposer.ts (slightly different)
type !== MetricType.Group && type !== 'group'
```

**Rule B — Hide `lap` metrics from statement displays:**

```typescript
// MetricVisualizer.tsx
return type !== 'lap';

// MetricSourceRow.tsx
return type !== 'lap';

// RuntimeHistoryLog.tsx
return type !== 'lap';

// timer-panel.tsx
return type !== 'lap';

// LabelComposer.ts
type !== MetricType.Lap && type !== 'lap'  // guards both enum and string form
```

**Rule C — Render parser-origin `text` as a passive comment:**

```typescript
// MetricVisualizer.tsx ONLY
if (type === 'text' && metric.origin === 'parser') {
  return <span className="italic text-muted-foreground ...">{tokenValue}</span>;
}
// MetricSourceRow, RuntimeHistoryLog, timer-panel: NOT APPLIED
```

Rule C is inconsistent: comment treatment only applies in `MetricVisualizer`. The
same parser-origin text metric rendered through `MetricSourceRow` or `timer-panel`
gets badge treatment instead of italic muted text.

### 1.2 Display Policy Is Split Across Two Render Components

**Rounds label formatting** (UX-03 — "3 Rounds" not "3"):

```typescript
// MetricVisualizer.tsx: formatTokenValue()
if (type.toLowerCase() === 'rounds' && /^\d+$/.test(trimmed)) {
  return `${base} ${numeric === 1 ? 'Round' : 'Rounds'}`;
}

// MetricPill.tsx: metricDisplayText()
if (frag.type === MetricType.Rounds && /^\d+$/.test(frag.image.trim())) {
  const n = Number(frag.image);
  return `${frag.image} ${n === 1 ? 'Round' : 'Rounds'}`;
}
```

Both implement the same logic. If the rule changes ("AMRAP" should be appended for
AMRAP rounds) it must change in two places.

**Time formatting:**

```typescript
// MetricPill.tsx ONLY
if (frag.type === MetricType.Duration || ... && typeof frag.value === 'number') {
  return formatDurationSmart(frag.value);
}
// MetricVisualizer.tsx: uses raw image, not formatDurationSmart
```

Timer display in the review grid gets formatted durations; the runtime badge does
not. This inconsistency is invisible until a user switches between views.

**User-origin affordance:**

```typescript
// MetricPill.tsx ONLY
const isUser = metric.origin === 'user';
// dashed border + italic + (u) suffix
// MetricVisualizer, MetricSourceRow: no user-origin treatment
```

### 1.3 Column Suppression Rules Are Buried in `useGridData` and `GridHeader`

The review grid decides which metric types show as columns via logic in two files:

```typescript
// useGridData.ts
if (ft === MetricType.Sound) return;              // noise
if (ft === MetricType.Elapsed || ft === MetricType.Total) return;  // combined into fixed cols
if (ft === MetricType.System && !isDebugMode) return false;        // debug-only

// GridHeader.tsx  
const METRIC_LABELS: Partial<Record<string, { label: string }>> = {
  duration: { label: 'Duration' },
  rep: { label: 'Reps' },
  // ... 17 more entries
};
```

`METRIC_LABELS` in `GridHeader` and the suppression guards in `useGridData` are
the same kind of per-type policy decision. They are in separate files with no
connection to the rest/comment/structural rules above.

### 1.4 `LabelComposer` Reaches into View-Layer Knowledge

`LabelComposer` (in `src/runtime/compiler/utils/`) applies structural metric
exclusions — `MetricType.Lap`, `MetricType.Group` — to decide what text to include
in a compiled block label. This is the same display policy as the four components
above, but it lives in the compiler layer.

If the definition of "structural metric" changes, it must be updated in:
- `MetricVisualizer.tsx` — filter lambda
- `MetricSourceRow.tsx` — filter lambda  
- `RuntimeHistoryLog.tsx` — filter lambda
- `timer-panel.tsx` — filter lambda
- `LabelComposer.ts` — filter in fallback label builder

### 1.5 Deletion Test

**Delete the inline `group`/`lap` filter from `MetricVisualizer`:** Structural
`+`/`-` and `lap` markers appear in every runtime badge. Users see noise.

**Delete the four duplicate filters and consolidate into one:** Nothing changes
visually. Complexity concentrates. This is the signal the module is worth building.

---

## 2. Proposed Solution: `MetricPresentationPolicy`

Create a pure-function policy module at `src/core/metrics/presentation/` that
owns all display decisions for `IMetric` objects. UI components become renderers
of **presentation tokens** — they stop re-deciding policy.

### 2.1 Architecture

```
IMetric[]                           ← raw domain data (no change)
     │
     ▼
MetricPresentationPolicy            ← pure decision module, no React
     │
     ▼
MetricPresentationToken[]           ← normalized presentation facts
     │
     ├── MetricVisualizer            ← renders badges/comments
     ├── MetricSourceRow             ← renders multi-group rows
     ├── RuntimeHistoryLog           ← builds history label strings
     ├── timer-panel                 ← builds subtitle label strings
     ├── MetricPill                  ← renders review-grid cells
     ├── GridHeader / useGridData    ← decides column visibility/labels
     └── LabelComposer               ← builds compiler block labels (core only)
```

### 2.2 Core Types

```typescript
// src/core/metrics/presentation/types.ts

/**
 * Named display surface — each has distinct visibility and formatting rules.
 * Prefer named surfaces over ad-hoc boolean flags.
 */
export type MetricPresentationSurface =
  | 'runtime-badge'       // MetricVisualizer, MetricSourceRow, Chromecast badge panels
  | 'timer-subtitle'      // timer-panel subLabel construction
  | 'history-label'       // RuntimeHistoryLog entry label strings
  | 'review-grid-cell'    // MetricPill in the review grid
  | 'review-grid-column'  // column visibility and column label in useGridData / GridHeader
  | 'label-composer'      // LabelComposer block label (no React, no Tailwind)
  | 'debug';              // Show everything including structural and system metrics

export type MetricRenderKind =
  | 'badge'               // Pill-style badge with background, border, icon
  | 'comment'             // Muted italic text, no badge chrome
  | 'plain-text'          // Bare text, no styling, for label concatenation
  | 'column-heading'      // Grid column header
  | 'hidden';             // Do not render

export type MetricTone =
  | 'time' | 'rep' | 'effort' | 'distance' | 'rounds' | 'action'
  | 'resistance' | 'rest' | 'muted' | 'system' | 'unknown';

export interface MetricPresentationToken {
  readonly metric: IMetric;
  /** Computed display text (e.g., "3 Rounds", "1:30", "Pushups") */
  readonly label: string;
  /** Hover tooltip text */
  readonly tooltip: string;
  readonly renderKind: MetricRenderKind;
  readonly tone: MetricTone;
  /** Icon key (maps to getMetricIcon — null if no icon) */
  readonly iconKey: string | null;
  readonly visible: boolean;
  /** True for group(+/-) and lap structural markers */
  readonly structural: boolean;
  /** True for effort metrics whose value is "Rest" */
  readonly rest: boolean;
  /** True for parser-origin text metrics (coach annotations) */
  readonly comment: boolean;
  /** True for user-origin metrics (user override in review grid) */
  readonly userEntered: boolean;
  /** Column label for review-grid-column surface */
  readonly columnLabel?: string;
}

export interface IMetricPresentationPolicy {
  present(metric: IMetric, surface: MetricPresentationSurface): MetricPresentationToken;
  presentGroup(
    metrics: readonly IMetric[],
    surface: MetricPresentationSurface,
  ): MetricPresentationToken[];
  columnLabel(type: MetricType | string): string;
  isStructural(metric: IMetric): boolean;
  isHidden(metric: IMetric, surface: MetricPresentationSurface): boolean;
}
```

### 2.3 Policy Implementation

```typescript
// src/core/metrics/presentation/MetricPresentationPolicy.ts

export function createMetricPresentationPolicy(): IMetricPresentationPolicy {
  return {
    isStructural(metric) {
      const t = metric.type;
      if (t === MetricType.Group) {
        const img = metric.image ?? '';
        return img === '+' || img === '-';
      }
      return t === MetricType.Lap;
    },

    isHidden(metric, surface) {
      if (this.isStructural(metric)) {
        // Structural metrics visible only in debug surface
        return surface !== 'debug';
      }
      // Sound never shows in non-debug surfaces
      if (metric.type === MetricType.Sound && surface !== 'debug') return true;
      // Elapsed/Total suppressed in column surfaces (combined into fixed time columns)
      if (surface === 'review-grid-column') {
        if (metric.type === MetricType.Elapsed || metric.type === MetricType.Total) return true;
        if (metric.type === MetricType.System) return true; // shown via debug flag elsewhere
      }
      return false;
    },

    present(metric, surface) {
      const structural = this.isStructural(metric);
      const hidden = this.isHidden(metric, surface);
      const rest = isRestMetric(metric);
      const comment = metric.type === MetricType.Text && metric.origin === 'parser';
      const userEntered = metric.origin === 'user';

      const renderKind: MetricRenderKind = hidden
        ? 'hidden'
        : comment
          ? 'comment'
          : surface === 'timer-subtitle' || surface === 'history-label' || surface === 'label-composer'
            ? 'plain-text'
            : 'badge';

      return {
        metric,
        label: computeLabel(metric, surface),
        tooltip: buildTooltip(metric),
        renderKind,
        tone: computeTone(metric, rest),
        iconKey: rest ? 'rest' : metric.type,
        visible: !hidden,
        structural,
        rest,
        comment,
        userEntered,
        columnLabel: computeColumnLabel(metric.type),
      };
    },

    presentGroup(metrics, surface) {
      return metrics.map(m => this.present(m, surface));
    },

    columnLabel(type) {
      return computeColumnLabel(type);
    },
  };
}

// Exported singleton for app code
export const metricPresentation = createMetricPresentationPolicy();
```

**`computeLabel()` consolidates all formatting in one place:**

```typescript
function computeLabel(metric: IMetric, surface: MetricPresentationSurface): string {
  // Time-based: format milliseconds
  if (isTimeLikeMetric(metric.type) && typeof metric.value === 'number') {
    return formatDurationSmart(metric.value);
  }

  const base = metric.image
    ?? (typeof metric.value === 'object' ? valueToString(metric.value) : String(metric.value ?? metric.type));

  // Rounds: append "Round" / "Rounds" suffix when base is a bare number
  if (metric.type === MetricType.Rounds && /^\d+$/.test(base.trim())) {
    const n = Number(base.trim());
    return `${base} ${n === 1 ? 'Round' : 'Rounds'}`;
  }

  return base;
}
```

### 2.4 UI Adapter (Tailwind classes + icons)

The core policy produces framework-agnostic tokens. React components need Tailwind
classes and emoji. A thin adapter at `src/components/metrics/presentation/` adds
those without contaminating the core module:

```typescript
// src/components/metrics/presentation/themedMetricPresentation.ts

export interface ThemedMetricPresentationToken extends MetricPresentationToken {
  readonly colorClasses: string;
  readonly icon: string | null;
  readonly originClasses: string;
}

export function themeToken(token: MetricPresentationToken): ThemedMetricPresentationToken {
  return {
    ...token,
    colorClasses: token.rest ? metricColorMap.rest ?? '' : getMetricColorClasses(token.metric.type),
    icon: getMetricIcon(token.metric.type, token.metric.value as string ?? undefined),
    originClasses: token.userEntered
      ? 'border-dashed italic ring-1 ring-offset-1 ring-primary/30'
      : '',
  };
}

export function presentThemedGroup(
  metrics: readonly IMetric[],
  surface: MetricPresentationSurface,
): ThemedMetricPresentationToken[] {
  return metricPresentation.presentGroup(metrics, surface).map(themeToken);
}
```

### 2.5 Backward-Compatible Wrappers

`metricColorMap` and `getMetricColorClasses` continue to work unchanged during
migration. Once all call sites consume themed tokens, the old functions can be
deprecated.

### 2.6 Migration Path (Slice by Slice)

**Slice 1 — Characterization tests (zero risk)**

Write pure policy tests that lock the current behavior before touching any
call site:

```typescript
describe('MetricPresentationPolicy', () => {
  it('hides structural group(+) on runtime-badge surface', () => {
    const token = metricPresentation.present(
      { type: MetricType.Group, image: '+', origin: 'parser' },
      'runtime-badge',
    );
    expect(token.visible).toBe(false);
    expect(token.structural).toBe(true);
  });

  it('hides lap on all non-debug surfaces', () => {
    for (const surface of ['runtime-badge', 'timer-subtitle', 'history-label']) {
      const token = metricPresentation.present(
        { type: MetricType.Lap, origin: 'parser' },
        surface,
      );
      expect(token.visible).toBe(false);
    }
  });

  it('renders parser-origin text as comment on runtime-badge', () => {
    const token = metricPresentation.present(
      { type: MetricType.Text, origin: 'parser', image: 'Scale if needed' },
      'runtime-badge',
    );
    expect(token.renderKind).toBe('comment');
  });

  it('formats bare rounds number with label', () => {
    const token = metricPresentation.present(
      { type: MetricType.Rounds, image: '3', origin: 'parser' },
      'runtime-badge',
    );
    expect(token.label).toBe('3 Rounds');
  });

  it('marks effort=Rest as rest tone', () => {
    const token = metricPresentation.present(
      { type: MetricType.Effort, image: 'Rest', value: 'Rest', origin: 'parser' },
      'runtime-badge',
    );
    expect(token.rest).toBe(true);
    expect(token.tone).toBe('rest');
  });
});
```

These tests can be written and passed before any call site migration.

**Slice 2 — Create the module (no callers change yet)**

Create the following files:

```
src/core/metrics/presentation/
  types.ts
  MetricPresentationPolicy.ts
  index.ts

src/components/metrics/presentation/
  themedMetricPresentation.ts
  index.ts
```

Export `metricPresentation` singleton and `presentThemedGroup()`.

**Slice 3 — Migrate `MetricVisualizer`**

Replace the inline filter + `formatTokenValue()` with themed tokens:

```typescript
// Before
{visibleFragments
  .filter(metric => {
    if (type === 'group' && (image === '+' || image === '-')) return false;
    return type !== 'lap';
  })
  .map((metric, index) => {
    const tokenValue = formatTokenValue(metric, type);
    if (type === 'text' && metric.origin === 'parser') {
      return <span className="italic ...">...</span>;
    }
    const colorClasses = getMetricColorClasses(type, tokenValue);
    const icon = getMetricIcon(type, tokenValue);
    return <span className={colorClasses}>...</span>;
  })}

// After
{presentThemedGroup(visibleFragments, 'runtime-badge')
  .filter(t => t.visible)
  .map((token, index) => {
    if (token.renderKind === 'comment') {
      return <span className="italic text-muted-foreground ...">{token.label}</span>;
    }
    return (
      <span className={cn(token.colorClasses, ...)}>
        {token.icon && <span>{token.icon}</span>}
        <span>{token.label}</span>
      </span>
    );
  })}
```

The component's render logic shrinks to a switch on `token.renderKind`. Policy is
gone from the component.

**Slice 4 — Migrate `MetricSourceRow`, `RuntimeHistoryLog`, `timer-panel`**

These all have the same `group`/`lap` filter. Replace each with:

```typescript
// Before
.filter(f => {
  const type = (f.type || '').toLowerCase();
  const image = f.image || '';
  if (type === 'group' && (image === '+' || image === '-')) return false;
  return type !== 'lap';
})
.map(f => f.image || '')

// After (timer-panel / history-label surfaces)
metricPresentation.presentGroup(metrics, 'timer-subtitle')
  .filter(t => t.visible)
  .map(t => t.label)
```

This is the highest-locality win: one rule replaces four duplicates.

**Slice 5 — Migrate `MetricPill` and review-grid column policy**

`MetricPill` already has the right shape — it just needs to consume a themed token
instead of calling `getMetricColorClasses` and `metricDisplayText` directly:

```typescript
// Before
export const MetricPill: React.FC<MetricPillProps> = ({ metric }) => {
  const colorClasses = getMetricColorClasses(metric.type);
  const isUser = metric.origin === 'user';
  const displayText = metricDisplayText(metric);
  ...
}

// After
export const MetricPill: React.FC<MetricPillProps> = ({ metric }) => {
  const token = useMemo(
    () => themeToken(metricPresentation.present(metric, 'review-grid-cell')),
    [metric],
  );
  ...
}
```

For `useGridData` column suppression:

```typescript
// Before
if (ft === MetricType.Sound) return;
if (ft === MetricType.Elapsed || ft === MetricType.Total) return;
if (ft === MetricType.System && !isDebugMode) return false;

// After
const surface: MetricPresentationSurface = isDebugMode ? 'debug' : 'review-grid-column';
if (metricPresentation.isHidden({ type: ft, origin: 'runtime' }, surface)) return;
```

For `GridHeader` column labels:

```typescript
// Before
const cfg = METRIC_LABELS[type as string];
const label = cfg?.label ?? (type.charAt(0).toUpperCase() + type.slice(1));

// After
const label = metricPresentation.columnLabel(type);
```

`METRIC_LABELS` in `GridHeader` is deleted; its content moves into
`computeColumnLabel()` inside the policy module.

**Slice 6 — Migrate `LabelComposer` (core-only)**

`LabelComposer` should use the core policy (not the themed adapter) for its
structural exclusion filter:

```typescript
// Before
.filter(f => {
  const type = f.type || f.type;
  return type !== MetricType.Lap && type !== MetricType.Group && type !== 'lap' && type !== 'group';
})

// After
.filter(f => !metricPresentation.isStructural(f))
```

This eliminates the `'lap'` / `'group'` string literal guards. The policy knows
the definition.

---

## 3. Benefits

### 3.1 Locality

Every display decision for `IMetric` objects has one address:
`src/core/metrics/presentation/MetricPresentationPolicy.ts`.

Current state:

| Decision | Locations |
|----------|-----------|
| Hide structural `group(+/-)` | 5 places |
| Hide `lap` | 5 places |
| Comment rendering | 1 place (inconsistent) |
| Rounds label suffix | 2 places |
| Time formatting | 1 place (MetricPill only) |
| Rest detection | 1 place (metricColorMap only) |
| Column suppression | 2 places (useGridData + GridHeader) |
| Column labels | 1 place (GridHeader METRIC_LABELS) |
| User-origin affordance | 1 place (MetricPill only) |

After migration:

| Decision | Location |
|----------|----------|
| All of the above | `MetricPresentationPolicy.ts` |

A product change like "also hide `current-round` on timer-subtitle" becomes a
one-line addition to `isHidden()`. Before, it would require changing 4 filter
lambdas and testing each surface independently.

### 3.2 Leverage

Callers get **presentation decisions** back from the policy — not raw metric data
that they must re-evaluate. A component that renders a metric badge asks
"is this visible? what kind? what label?" and renders the answer. It stops
encoding policy.

The interface is smaller than the implementation: `present()`, `presentGroup()`,
`isStructural()`, `isHidden()`, `columnLabel()` — five methods covering all current
display surfaces.

### 3.3 Tests Improve

**Before:** Testing metric display requires mounting a React component and
inspecting the DOM for the presence or absence of specific text. Filter logic is
entangled with React rendering. A filter-regression (e.g., `lap` showing up in the
timer) requires a full Storybook test to catch.

**After:**

- `MetricPresentationPolicy.test.ts` — pure unit tests: given `IMetric`, assert
  token shape. No DOM, no React, no mocks. Runs in ~5ms.
- Component tests shrink to: given tokens, assert the DOM matches the token's
  `renderKind`. They stop asserting filter behavior.
- A regression like "lap shows in timer" is caught by the pure policy test
  `isHidden({ type: 'lap' }, 'timer-subtitle') === true`.

**New test surface for correctness across all surfaces:** The same metric tested
against all five surfaces in one describe block — something impossible to write
when the logic is scattered across five components.

### 3.4 Consistency Fixes for Free

Comment rendering (`parser`-origin `text`) is currently only applied in
`MetricVisualizer`. After migration, every surface that consumes `presentGroup()`
automatically gets comment treatment. The inconsistency between
`MetricVisualizer` and `MetricSourceRow` disappears without any extra work.

User-origin affordance (`(u)` badge, dashed border) is currently only in
`MetricPill`. After migration, any surface that renders a themed token
automatically gets `token.userEntered = true` and can apply its own affordance.

Time formatting is currently only in `MetricPill`. After migration, `computeLabel()`
in the policy applies `formatDurationSmart` everywhere — a timer duration in the
runtime badge reads `"1:30"` instead of `"90000"`.

### 3.5 Dialect and Theme Extension Points

The policy is created via `createMetricPresentationPolicy(config?)`. Future work
can pass a dialect-specific config to change which types are structural, what the
column labels are, or whether rest metrics are identified differently. This is not
possible today — the logic is hardcoded in each component.

---

## 4. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Visual regression during migration | Write characterization tests first (Slice 1). Migrate one surface per PR. Compare Storybook before and after each slice. |
| Policy becomes a god module | Keep it about **presentation only**. Workout-logic ordering (AMRAP label precedence) stays in `LabelComposer`. Analytics derivation stays in `AnalyticsTransformer`. |
| `LabelComposer` importing from presentation module creates unexpected coupling | Use the core policy (`src/core/`) only — no React, no Tailwind. The import `LabelComposer → MetricPresentationPolicy` is clean (both are in core). |
| New enum members cause silent display gaps | `Partial<Record<MetricType, ...>>` in the color map already flags gaps at compile time (from Opportunity E). The policy's `computeTone()` can have an exhaustive switch with a TS-checked fallback. |

---

## 5. File Structure

```
src/core/metrics/presentation/
  types.ts                          ← MetricPresentationSurface, MetricRenderKind,
                                       MetricTone, MetricPresentationToken,
                                       IMetricPresentationPolicy
  MetricPresentationPolicy.ts       ← createMetricPresentationPolicy(), metricPresentation
  labelFormatting.ts                ← computeLabel(), computeColumnLabel() (pure functions)
  index.ts                          ← re-exports

src/components/metrics/presentation/
  themedMetricPresentation.ts       ← themeToken(), presentThemedGroup()
  index.ts                          ← re-exports

src/core/metrics/presentation/__tests__/
  MetricPresentationPolicy.test.ts  ← pure unit tests for all rules
```

Existing files unchanged until they are migrated slice by slice:
- `src/views/runtime/metricColorMap.ts` — compatibility wrapper, kept until Slice 5
- `src/views/runtime/MetricVisualizer.tsx` — migrated in Slice 3
- `src/components/metrics/MetricSourceRow.tsx` — migrated in Slice 4
- `src/components/history/RuntimeHistoryLog.tsx` — migrated in Slice 4
- `src/panels/timer-panel.tsx` — migrated in Slice 4
- `src/components/review-grid/MetricPill.tsx` — migrated in Slice 5
- `src/components/review-grid/useGridData.ts` — migrated in Slice 5
- `src/components/review-grid/GridHeader.tsx` — migrated in Slice 5
- `src/runtime/compiler/utils/LabelComposer.ts` — migrated in Slice 6

---

## 6. Success Criteria

1. `metricPresentation.isHidden({ type: MetricType.Lap }, 'runtime-badge')` → `true`
2. `metricPresentation.isHidden({ type: MetricType.Lap }, 'debug')` → `false`
3. `metricPresentation.present({ type: MetricType.Text, origin: 'parser', image: 'Scale' }, 'runtime-badge').renderKind` → `'comment'`
4. `metricPresentation.present({ type: MetricType.Text, origin: 'runtime', image: 'Round 2' }, 'runtime-badge').renderKind` → `'badge'`
5. `metricPresentation.present({ type: MetricType.Rounds, image: '3', origin: 'parser' }, 'runtime-badge').label` → `'3 Rounds'`
6. `metricPresentation.present({ type: MetricType.Effort, image: 'Rest', value: 'Rest', origin: 'parser' }, 'runtime-badge').rest` → `true`
7. `metricPresentation.present({ type: MetricType.Effort, origin: 'user' }, 'review-grid-cell').userEntered` → `true`
8. All five filter lambdas in the components deleted — no inline `type !== 'lap'` guards remain
9. `METRIC_LABELS` in `GridHeader.tsx` deleted — column labels come from `metricPresentation.columnLabel()`
10. Zero `as any` casts in metric rendering code

---

## 7. References

- **May 7 deep dive:** `docs/metric-presentation-implementation-deep-dive-2026-05-07.md`
- **Current filter locations:**
  - `src/views/runtime/MetricVisualizer.tsx` lines ~146–151 and ~159–172
  - `src/components/metrics/MetricSourceRow.tsx` lines ~247–252
  - `src/components/history/RuntimeHistoryLog.tsx` lines ~99–100
  - `src/panels/timer-panel.tsx` lines ~292–293
  - `src/runtime/compiler/utils/LabelComposer.ts` line ~74
- **Column policy:**
  - `src/components/review-grid/useGridData.ts` lines ~82–86, ~178–181
  - `src/components/review-grid/GridHeader.tsx` lines ~197–218
- **Rounds formatting:**
  - `src/views/runtime/MetricVisualizer.tsx:formatTokenValue()`
  - `src/components/review-grid/MetricPill.tsx:metricDisplayText()`
- **Color/icon map:** `src/views/runtime/metricColorMap.ts`
- **MetricType enum:** `src/core/models/Metric.ts`
