# Metric Presentation Implementation Deep Dive

**Date:** 2026-05-07  
**Status:** Design proposal  
**Related opportunity:** [`architecture-deepening-opportunities-2026-05-07.md`](./architecture-deepening-opportunities-2026-05-07.md)

---

## 1. Executive Summary

The current metric display implementation has the right raw ingredients — `IMetric`, `MetricType`, `MetricVisualizer`, `MetricPill`, `metricColorMap`, review-grid columns, runtime history rows, and `LabelComposer`. The friction is that every caller remembers a slightly different subset of presentation rules.

The proposed **Metric Presentation Module** is a deeper module placed between raw metric data and UI surfaces:

```text
Parser / compiler / runtime / user output
        │
        ▼
IMetric[]                         ← raw domain metrics
        │
        ▼
MetricPresentationPolicy          ← pure display decisions, no React
        │
        ▼
MetricPresentationToken[]         ← normalized presentation objects
        │
        ▼
MetricVisualizer / MetricPill / RuntimeHistoryLog / TimerPanel / ReviewGrid
```

The main rule: **callers render presentation tokens; they do not re-decide metric display policy.**

This module should preserve existing visuals during the first migration. The value is not a redesign; it is **locality**. Rules like “hide structural `group` markers”, “render parser text as a comment”, “format `3` rounds as `3 Rounds`”, and “style effort=`Rest` as rest” move into one seam.

---

## 2. Current State

### 2.1 Scattered display rules

The same decisions are currently repeated or partially repeated in these modules:

| Rule | Current locations |
|------|-------------------|
| Hide structural group markers `group` with image `+` or `-` | `MetricVisualizer`, `MetricSourceRow`, `RuntimeHistoryLog`, `timer-panel` |
| Hide `lap` in statement-style display | `MetricVisualizer`, `MetricSourceRow`, `RuntimeHistoryLog`, `timer-panel`, `LabelComposer` |
| Detect rest as `effort` with value/image `Rest` | `metricColorMap` only |
| Round badge suffix `Round` / `Rounds` | `MetricVisualizer`, `MetricPill` |
| Parser-origin `text` rendered as passive comment | `MetricVisualizer` only |
| Time metric value formatting | `MetricPill` only |
| User-origin visual treatment | `MetricPill` only |
| Review-grid column labels and suppressions | `GridHeader`, `useGridData`, `gridPresets` |
| Label composition exclusions | `LabelComposer` |

This is a shallow set of rules: each caller must know enough to not render noisy metrics incorrectly.

### 2.2 Important distinction: raw metric vs presentation token

`IMetric` is a domain data shape. It should remain raw:

- type
- value
- image
- origin
- action
- unit
- source block key
- timestamp

A UI caller often needs a different shape:

- display label
- tooltip text
- icon
- tone/color key
- render kind
- visibility
- column label
- whether it is structural/rest/comment/user-entered

The new module introduces that second shape explicitly rather than forcing each caller to reconstruct it.

---

## 3. Target Module

### 3.1 Module responsibility

The Metric Presentation Module should own:

- structural metric classification (`group`, `lap`, compiler suppressions where display-relevant)
- surface-specific visibility (`runtime-badge`, `timer-subtitle`, `history-label`, `review-grid-cell`, `review-grid-column`, `label-composer`)
- rest/comment/action/user-origin classification
- display label formatting
- tooltip text
- semantic tone selection (`time`, `rep`, `rest`, `muted`, etc.)
- icon key selection
- review-grid column labels for metric types
- backwards-compatible wrappers for the existing color/icon functions during migration

It should not own:

- parsing or compiler strategy semantics
- runtime stack behavior
- analytics derivation
- React layout
- Tailwind class composition outside metric presentation theme adapters

### 3.2 Proposed file layout

```text
src/core/metrics/presentation/
  types.ts
  MetricPresentationPolicy.ts
  defaultMetricPresentationConfig.ts
  presentMetric.ts
  presentMetricGroup.ts
  metricColumnPresentation.ts
  index.ts

src/components/metrics/presentation/
  defaultMetricPresentationTheme.ts
  themedMetricPresentation.ts
  compatibility.ts          # getMetricColorClasses/getMetricIcon wrappers
  index.ts

src/views/runtime/
  metricColorMap.ts          # compatibility re-export during migration
  MetricVisualizer.tsx       # delegates to presentation module
```

Why split `core` from `components`?

- `LabelComposer` lives under `src/runtime/compiler/utils` and should not import React or a view module.
- Review-grid and runtime views need Tailwind classes and emoji icons.
- A pure core policy can be tested without DOM or CSS knowledge.

---

## 4. Public Interface Shape

### 4.1 Core presentation types

```typescript
export type MetricPresentationSurface =
  | 'runtime-badge'
  | 'metric-source-row'
  | 'timer-subtitle'
  | 'history-label'
  | 'review-grid-cell'
  | 'review-grid-column'
  | 'label-composer'
  | 'debug';

export type MetricRenderKind =
  | 'badge'
  | 'comment'
  | 'plain-text'
  | 'column-heading'
  | 'hidden';

export type MetricTone =
  | 'time'
  | 'rep'
  | 'effort'
  | 'distance'
  | 'rounds'
  | 'action'
  | 'resistance'
  | 'rest'
  | 'muted'
  | 'system'
  | 'derived'
  | 'unknown';

export interface MetricPresentationContext {
  readonly surface: MetricPresentationSurface;
  readonly debug?: boolean;
  readonly includeStructural?: boolean;
  readonly includeRuntime?: boolean;
  readonly includeUserAffordance?: boolean;
}

export interface MetricPresentationToken {
  readonly metric: IMetric;
  readonly type: string;
  readonly label: string;
  readonly tooltip: string;
  readonly renderKind: MetricRenderKind;
  readonly tone: MetricTone;
  readonly iconKey: string | null;
  readonly visible: boolean;
  readonly structural: boolean;
  readonly rest: boolean;
  readonly comment: boolean;
  readonly userEntered: boolean;
  readonly columnLabel?: string;
}

export interface IMetricPresentationPolicy {
  present(metric: IMetric, context: MetricPresentationContext): MetricPresentationToken;
  presentGroup(metrics: readonly IMetric[], context: MetricPresentationContext): MetricPresentationToken[];
  labelFor(metric: IMetric, context: MetricPresentationContext): string;
  columnLabel(type: MetricType | string): string;
  isStructural(metric: IMetric): boolean;
  isHidden(metric: IMetric, context: MetricPresentationContext): boolean;
  isRest(metric: IMetric): boolean;
  isComment(metric: IMetric): boolean;
}
```

### 4.2 The exposed object

Expose a singleton default policy for normal application use:

```typescript
export const metricPresentation: IMetricPresentationPolicy =
  createMetricPresentationPolicy(defaultMetricPresentationConfig);
```

Callers can use the object directly:

```typescript
const tokens = metricPresentation.presentGroup(metrics, {
  surface: 'runtime-badge',
});
```

For tests or future dialect-specific presentation, expose the factory too:

```typescript
export function createMetricPresentationPolicy(
  config: MetricPresentationConfig,
): IMetricPresentationPolicy;
```

This gives two levels of leverage:

1. **Default object** for app code: one import, stable behavior.
2. **Factory** for tests/extensions: change config without mutating global state.

### 4.3 Themed presentation adapter

React-facing code needs classes and actual emoji/icon strings. Keep that in a UI adapter:

```typescript
export interface ThemedMetricPresentationToken extends MetricPresentationToken {
  readonly icon: string | null;
  readonly colorClasses: string;
  readonly originClasses: string;
}

export function themeMetricToken(
  token: MetricPresentationToken,
  theme?: MetricPresentationTheme,
): ThemedMetricPresentationToken;

export function presentThemedMetricGroup(
  metrics: readonly IMetric[],
  context: MetricPresentationContext,
  theme?: MetricPresentationTheme,
): ThemedMetricPresentationToken[];
```

`MetricVisualizer`, `MetricPill`, and review-grid cells consume themed tokens. `LabelComposer` consumes core tokens only.

### 4.4 Backwards-compatible wrappers

Keep `src/views/runtime/metricColorMap.ts` as a compatibility seam while call sites migrate:

```typescript
export function getMetricColorClasses(type: string, value?: string): string {
  const token = metricPresentation.present(syntheticMetric(type, value), {
    surface: 'runtime-badge',
  });
  return themeMetricToken(token).colorClasses;
}

export function getMetricIcon(type: string, value?: string): string | null {
  const token = metricPresentation.present(syntheticMetric(type, value), {
    surface: 'runtime-badge',
  });
  return themeMetricToken(token).icon;
}
```

This avoids a flag day. Old imports keep working while new code moves to `metricPresentation` and themed tokens.

---

## 5. Surface-Specific Behavior

### 5.1 Runtime badge surfaces

Used by:

- `MetricVisualizer`
- `MetricSourceRow`
- `RuntimeHistoryLog`
- Chromecast track panels

Default rules:

- hide structural `group` markers with `image` `+` or `-`
- hide `lap`
- render parser-origin `text` as `comment`
- render runtime-origin `text` as normal badge/plain label depending on surface
- format numeric rounds as `1 Round` / `N Rounds`
- render `effort=Rest` as tone `rest`, icon key `rest`

### 5.2 Timer subtitle surface

Used by `timer-panel.tsx` to build `subLabels` from leaf display rows.

Default rules:

- hide structural markers and `lap`
- produce plain text labels only
- no emoji by default
- preserve multi-row grouping

Example replacement:

```typescript
const lines = leafItem.displayRows
  .map(row => metricPresentation
    .presentGroup(row, { surface: 'timer-subtitle' })
    .filter(t => t.visible)
    .map(t => t.label)
    .join(' ')
    .trim())
  .filter(Boolean);
```

### 5.3 History label surface

Used by `RuntimeHistoryLog` when creating `FragmentSourceEntry.label`.

Default rules:

- same visibility as statement rows
- plain text labels
- avoid JSON blobs unless no better label exists
- use `labelFor` rather than direct `image || ''`

### 5.4 Review-grid cell surface

Used by `MetricPill` and `GridCell`.

Default rules:

- do not automatically hide `lap` or `group` unless the grid asks for statement-style filtering; review mode may want to inspect them
- format time-like numeric values with `formatDurationSmart`
- show user-origin affordance (`(u)`, dashed/italic classes) through token flags/classes
- format object values consistently:
  - `{ text }` → text
  - `{ current }` → `Round ${current}`
  - fallback `JSON.stringify(value)`

### 5.5 Review-grid column surface

Used by:

- `GridHeader`
- `gridPresets`
- `useGridData`
- `AddColumnButton`

Default rules:

- `Sound` hidden from auto columns
- `Elapsed` and `Total` hidden as standalone metric columns because they are combined into fixed time columns
- `System` visible only in debug mode
- labels come from `metricPresentation.columnLabel(type)`
- unknown metric types get title-cased fallback labels

This replaces the local `METRIC_LABELS` table in `GridHeader` and the repeated suppressions in `useGridData`.

### 5.6 Label-composer surface

Used by `LabelComposer` in compiler strategies.

Default rules:

- hide `lap` and structural `group`
- ignore runtime-origin metrics
- use the same rounds formatting decisions as UI where appropriate
- no Tailwind/icon dependency

This should be a **core policy usage**, not a dependency from compiler code to `src/views/runtime`.

---

## 6. Migration Plan

### Slice 1 — Characterization tests first

Add pure tests that lock the current visible behavior before moving call sites:

```text
src/core/metrics/presentation/__tests__/
  MetricPresentationPolicy.test.ts
  metricColumnPresentation.test.ts

src/components/metrics/presentation/__tests__/
  themedMetricPresentation.test.ts
```

Key cases:

- `group` with `image='+'` is hidden on `runtime-badge`
- `group` with non-structural label is visible where intended
- `lap` is hidden on statement/timer/history surfaces
- parser-origin `text` is a comment token
- runtime-origin `text` is not a comment token
- `rounds` image `1` → `1 Round`
- `rounds` image `3` → `3 Rounds`
- non-numeric rounds label is preserved
- `effort` value/image `Rest` gets rest tone/icon
- duration/elapsed/total numeric values format as time on review-grid cells
- user-origin metric sets `userEntered=true`
- grid column suppression matches current behavior for `Sound`, `Elapsed`, `Total`, `System`

### Slice 2 — Add the module and compatibility wrappers

Create the new files but keep existing callers unchanged. Then update `metricColorMap.ts` to delegate to the themed presentation adapter while preserving exports:

- `metricColorMap`
- `getMetricColorClasses`
- `getMetricIcon`
- `MetricType` type alias from the old file if needed
- `FragmentColorMap`

Existing tests such as `MetricVisualizer.ColorMap.test.ts` should still pass.

### Slice 3 — Migrate `MetricVisualizer`

Replace its inline filtering and `formatTokenValue()` with themed tokens:

```typescript
const tokens = useMemo(
  () => presentThemedMetricGroup(visibleFragments, { surface: 'runtime-badge' }),
  [visibleFragments],
);
```

Rendering becomes a switch on `token.renderKind`:

- `comment` → muted italic span
- `badge` → current pill span
- `hidden` → skipped

The component keeps the same props. React tests become layout tests; policy assertions move to pure tests.

### Slice 4 — Migrate row/history/timer label construction

Replace repeated filters with `metricPresentation.presentGroup(...).filter(t => t.visible)` in:

- `MetricSourceRow`
- `RuntimeHistoryLog`
- `timer-panel`
- Chromecast track/timer panels if they derive labels from metrics

This is the highest-locality win: one structural filtering rule replaces four copies.

### Slice 5 — Migrate review grid

Update:

- `MetricPill` to consume `presentThemedMetric(metric, { surface: 'review-grid-cell' })`
- `GridHeader` to use `metricPresentation.columnLabel(type)`
- `useGridData` to call a named policy function such as `shouldAutoIncludeMetricColumn(type, { debug })`
- `gridPresets` to use icon presentation rather than `getMetricIcon` directly
- `UserOverrideDialog` to use themed tokens for preview/styling

### Slice 6 — Migrate `LabelComposer`

Move label-specific exclusions to core policy:

```typescript
const identityFragments = metrics.filter(f =>
  metricPresentation.present(f, { surface: 'label-composer' }).visible
);
```

Be careful here: `LabelComposer` also encodes workout-label semantics such as logic keyword order. Do not move those semantics into Metric Presentation. Move only reusable metric text/visibility formatting.

### Slice 7 — Deprecate old direct imports

After call sites move, mark view-level utilities as compatibility-only:

```typescript
/** @deprecated Use metricPresentation + themeMetricToken. */
export function getMetricColorClasses(...) { ... }
```

Later, delete the old `MetricType` union in `metricColorMap.ts` to avoid divergence from `src/core/models/Metric.ts`.

---

## 7. Testing Impact

### 7.1 Unit tests become the primary test surface

The interface is pure enough that most behavior should be covered without React:

```typescript
describe('MetricPresentationPolicy', () => {
  it('hides structural group markers on runtime badge surfaces', () => {
    const token = metricPresentation.present(metric('group', '+'), {
      surface: 'runtime-badge',
    });

    expect(token.visible).toBe(false);
    expect(token.structural).toBe(true);
  });
});
```

This reduces React test burden. `MetricVisualizer` should not need to test every metric type once the policy is covered.

### 7.2 Existing tests to keep, but refocus

Keep these tests but narrow their purpose:

- `src/views/runtime/MetricVisualizer.RoundsBadge.test.tsx`  
  Keep as an integration regression that the rendered DOM still includes `3 Rounds`.

- `src/views/runtime/MetricVisualizer.test.tsx`  
  Keep comment-vs-action rendering checks, but assert that `comment` tokens render as muted text and `action` tokens render as badges.

- `src/components/metrics/MetricVisualizer.ColorMap.test.ts`  
  Keep while compatibility wrappers exist; later replace with themed-token tests.

- `src/components/review-grid/*` tests  
  Add/adjust tests for column inclusion rules and `MetricPill` user-origin styling.

### 7.3 E2E acceptance testing

If migration is visual-preserving, e2e can be limited to smoke/regression checks for affected stories. If any presentation changes are intentional, add e2e coverage for the user-visible behavior.

Recommended acceptance cases:

1. Runtime statement display hides `+`, `-`, and `lap` structural tokens.
2. A rest interval shows muted/rest treatment and pause icon.
3. A rounds group renders `3 Rounds`, not a bare `3`.
4. Review grid still shows user-entered overrides with distinct styling.
5. Debug mode controls system metric columns.

Run project validation per `AGENTS.md`:

```bash
bun run test
bun x tsc --noEmit
```

For UI/layout behavior changes:

```bash
bun run storybook
bun run test:e2e
```

The known baseline failures/type errors should be treated as baseline; no new failures should be introduced by the migration.

---

## 8. Export Strategy

### 8.1 Internal source exports

Add focused exports:

```typescript
// src/core/metrics/presentation/index.ts
export * from './types';
export * from './MetricPresentationPolicy';
export * from './defaultMetricPresentationConfig';
export * from './presentMetric';
export * from './presentMetricGroup';
export * from './metricColumnPresentation';

// src/components/metrics/presentation/index.ts
export * from './defaultMetricPresentationTheme';
export * from './themedMetricPresentation';
export * from './compatibility';
```

Update `src/components/metrics/index.ts` to expose the app-facing presentation helpers for component consumers:

```typescript
export * from './presentation';
```

### 8.2 Public package exports

Do **not** add it to the root public interface immediately unless the package already exposes similar metric helpers. Prefer subpath usage first:

```typescript
import { metricPresentation } from '@/core/metrics/presentation';
import { presentThemedMetricGroup } from '@/components/metrics/presentation';
```

Once stable, expose it from the component metrics entrypoint. This keeps churn out of package consumers while the seam settles.

### 8.3 Compatibility imports

These imports should keep working during migration:

```typescript
import { getMetricColorClasses, getMetricIcon } from '@/views/runtime/metricColorMap';
import { MetricVisualizer } from '@/views/runtime/MetricVisualizer';
import { MetricVisualizer } from '@/components/metrics';
```

---

## 9. Caller Impact

| Caller | Current knowledge | After migration |
|--------|-------------------|-----------------|
| `MetricVisualizer` | filtering, comments, rounds, icons, colors | render themed tokens |
| `MetricSourceRow` | structural filtering for groups | render already-presented groups |
| `RuntimeHistoryLog` | structural filtering and label joining | ask policy for history labels |
| `timer-panel` | structural filtering and label joining | ask policy for timer subtitles |
| `MetricPill` | color, user styling, time formatting, rounds | render review-grid-cell token |
| `GridHeader` | metric label map | use `columnLabel(type)` |
| `useGridData` | auto-column suppressions | use column presentation policy |
| `LabelComposer` | structural exclusions | use core label-composer visibility/label rules |
| tests | duplicated UI assertions | pure policy tests + focused rendering tests |

---

## 10. Risks and Mitigations

### Risk: import cycles

`src/runtime/compiler/utils/LabelComposer.ts` must not import from `src/views` or `src/components`.

**Mitigation:** keep pure policy under `src/core/metrics/presentation`; keep Tailwind/icons in `src/components/metrics/presentation`.

### Risk: policy becomes a god object

A single policy can become too broad if it absorbs compiler/runtime semantics.

**Mitigation:** keep the interface about presentation only. Workout logic keyword ordering remains in `LabelComposer`; analytics derivation remains in review-grid/analytics modules.

### Risk: one global object blocks experimentation

A singleton is convenient but can hide configuration needs.

**Mitigation:** expose both `metricPresentation` and `createMetricPresentationPolicy(config)`. Use the singleton in app code, factory in tests and future dialect adapters.

### Risk: context flags recreate scattered policy

If callers pass many ad-hoc booleans, the seam becomes shallow again.

**Mitigation:** prefer named `surface` values over many flags. Add a new surface only when a real caller has distinct behavior.

### Risk: visual changes during migration

The migration touches many rendered places.

**Mitigation:** start with characterization tests and compatibility wrappers; migrate one caller at a time; compare Storybook stories after each visible slice.

---

## 11. Open Decisions

1. **Should `group` ever be visible outside debug/review surfaces?**  
   Proposal: hidden for statement/timer/history surfaces; visible only for debug or explicit review-grid inspection.

2. **Should `lap` be displayable in review grid?**  
   Proposal: hidden in statement surfaces, allowed in review-grid/debug surfaces if real data exists.

3. **Should rest detection read `image`, `value`, or both?**  
   Proposal: both, because parser/compiler/runtime metrics are not fully consistent today.

4. **Should presentation tokens include Tailwind classes directly?**  
   Proposal: no for core tokens; yes only after theming in component-layer helpers.

5. **Should `LabelComposer` use the same `Round/Rounds` suffix as badges?**  
   Proposal: not automatically. Labels like `AMRAP 3 Cindy` may not want `3 Rounds`. Use the policy for visibility and primitive label extraction, but keep composition semantics in `LabelComposer`.

---

## 12. First Implementation PR Shape

A low-risk first PR should include:

1. `src/core/metrics/presentation/*`
2. `src/components/metrics/presentation/*`
3. compatibility implementation in `src/views/runtime/metricColorMap.ts`
4. pure policy tests
5. no caller migrations except compatibility wrappers

Then migrate one surface per PR:

1. `MetricVisualizer`
2. row/history/timer labels
3. review-grid cells/columns
4. `LabelComposer`

This keeps review small and makes regressions easy to localize.
