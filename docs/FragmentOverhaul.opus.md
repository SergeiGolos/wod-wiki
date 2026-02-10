# WOD Wiki — Fragment Overhaul & Standardization

> **Generated**: 2026-02-09  
> **Author**: Opus  
> **Status**: Proposed / Draft  
> **Scope**: Core data pipeline (`CodeStatement` → `RuntimeBlock` → `OutputStatement` → `IDisplayItem`)  
> **Objective**: Define a unified fragment interface that standardizes fragment access, precedence resolution, and multi-fragment-per-type handling across all levels of the runtime pipeline.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture — As-Is Analysis](#2-current-architecture--as-is-analysis)
   - [2.1 The Three Data Levels](#21-the-three-data-levels)
   - [2.2 Fragment Storage Shapes](#22-fragment-storage-shapes)
   - [2.3 Adapter/Conversion Pipeline](#23-adapterconversion-pipeline)
   - [2.4 UI Rendering Pipeline](#24-ui-rendering-pipeline)
3. [Problems & Pain Points](#3-problems--pain-points)
   - [3.1 Structural Inconsistencies](#31-structural-inconsistencies)
   - [3.2 Fragment Precedence is Ad-Hoc](#32-fragment-precedence-is-ad-hoc)
   - [3.3 Multi-Fragment-per-Type is Unsupported](#33-multi-fragment-per-type-is-unsupported)
   - [3.4 Broken Fragment Flow in Compilation](#34-broken-fragment-flow-in-compilation)
   - [3.5 UI Components Must Know Source Type](#35-ui-components-must-know-source-type)
4. [Proposed Solution: `IFragmentSource`](#4-proposed-solution-ifragmentsource)
   - [4.1 Core Interface](#41-core-interface)
   - [4.2 Fragment Precedence Rules](#42-fragment-precedence-rules)
   - [4.3 Fragment Resolution Algorithm](#43-fragment-resolution-algorithm)
   - [4.4 Multi-Fragment Handling](#44-multi-fragment-handling)
5. [Implementation Per Data Level](#5-implementation-per-data-level)
   - [5.1 CodeStatement](#51-codestatement)
   - [5.2 RuntimeBlock](#52-runtimeblock)
   - [5.3 OutputStatement](#53-outputstatement)
   - [5.4 IDisplayItem](#54-idisplayitem)
6. [Adapter Simplification](#6-adapter-simplification)
7. [UI Component Simplification](#7-ui-component-simplification)
8. [Migration Plan](#8-migration-plan)
9. [Relationship to Gemini Proposal](#9-relationship-to-gemini-proposal)
10. [Open Questions](#10-open-questions)

---

## 1. Executive Summary

The WOD Wiki runtime pipeline transforms workout data through four stages:

```
Parser → CodeStatement → RuntimeBlock → OutputStatement → IDisplayItem → UI
```

Each stage carries `ICodeFragment[]` arrays, but fragments are stored differently, accessed differently, and merged differently at each level. The UI layer must maintain per-source-type adapter logic to extract the same fundamental data: "what fragments should I display?"

This document proposes **`IFragmentSource`** — a minimal, shared contract that each data level implements. It provides:

1. **`getDisplayFragments()`** — the "winning" fragments after precedence resolution
2. **`getFragment(type)`** — single-fragment access with type-based precedence
3. **`getAllFragmentsByType(type)`** — multi-fragment access for same-type scenarios
4. **Standard origin precedence**: `user` > `runtime` > `compiler` > `parser`

This eliminates adapter-per-type logic, standardizes fragment precedence globally, and enables UI components to render any data level uniformly through a single code path.

---

## 2. Current Architecture — As-Is Analysis

### 2.1 The Three Data Levels

| Level       | Interface          | Role                      | Fragment Source                                                                                                                                                                                                       |
| ----------- | ------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parser**  | `ICodeStatement`   | Static parsed script      | `fragments: ICodeFragment[]` — flat, `origin: 'parser'`                                                                                                                                                               |
| **Runtime** | `IRuntimeBlock`    | Executing block on stack  | `fragments?: ICodeFragment[][]` — nominally 2D per-round buckets, but actually `[[...flat]]` from `FragmentMemory` getter. **Plus** typed `Memory` entries (`timer`, `round`, etc.) that carry parallel runtime state |
| **Output**  | `IOutputStatement` | Execution result snapshot | `fragments: ICodeFragment[]` — merged parser + runtime fragments, extends `ICodeStatement`                                                                                                                            |

Additionally, `RuntimeSpan` (used by analytics) mirrors the same `ICodeFragment[][]` pattern as `IRuntimeBlock`.

### 2.2 Fragment Storage Shapes

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ICodeStatement                                                          │
│   fragments: ICodeFragment[]          ← flat 1D, all origin: 'parser'   │
│   findFragment(type): T | undefined   ← searches flat array             │
│   filterFragments(type): T[]                                             │
│   hasFragment(type): boolean                                             │
├──────────────────────────────────────────────────────────────────────────┤
│ IRuntimeBlock                                                            │
│   fragments?: ICodeFragment[][]       ← 2D (per-round), but in practice │
│                                         always [[...flat]] from memory   │
│   findFragment(type): T | undefined   ← iterates 2D                     │
│   filterFragments(type): T[]                                             │
│   hasFragment(type): boolean                                             │
│   context.memory:                                                        │
│     'timer'  → TimerState { spans, durationMs, direction, label }       │
│     'round'  → RoundState { current, total }                             │
│     'fragment' → FragmentState { fragments: ICodeFragment[] }            │
│     'completion' → CompletionState                                       │
│     'display' → DisplayState                                             │
│     'controls' → ButtonsState                                            │
├──────────────────────────────────────────────────────────────────────────┤
│ IOutputStatement (extends ICodeStatement)                                │
│   fragments: ICodeFragment[]          ← flat 1D, mixed origins          │
│   outputType: OutputStatementType                                        │
│   timeSpan: TimeSpan                                                     │
│   sourceBlockKey: string                                                 │
│   stackLevel: number                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ IDisplayItem (adapter target)                                            │
│   fragments: ICodeFragment[]          ← flat 1D, always .flat()'d       │
│   status: DisplayStatus                                                  │
│   sourceType: 'statement' | 'block' | 'span' | 'record'                │
│   label?: string                      ← fallback when fragments empty   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Adapter/Conversion Pipeline

The display adapter layer in `src/core/adapters/displayItemAdapters.ts` maintains **four separate conversion paths**:

```
ICodeStatement[]  ─── statementToDisplayItem()  ──┐
                                                    ├──→ IDisplayItem[]
IRuntimeBlock     ─── blockToDisplayItem()        ──┤      │
                      block.fragments.flat()        │      │
                                                    │      ▼
IOutputStatement ─── outputStatementToDisplayItem() ┤  UnifiedItemList
                                                    │      │
RuntimeSpan      ─── runtimeSpanToDisplayItem()   ──┘      ▼
                      span.fragments.flat()              UnifiedItemRow
                                                            │
                                                            ▼
                                                      FragmentVisualizer
```

**Key observation**: Every adapter does the same thing — extracts `fragments`, `.flat()`s them, and shoves them into `IDisplayItem.fragments`. The differences are:
- **Depth calculation** (parent chain vs. stackIndex vs. stackLevel)
- **Status mapping** (pending/active vs. always-active vs. outputType mapping)
- **Timing extraction** (absent vs. startTime vs. timeSpan)
- **Header detection** (identical logic copy-pasted across adapters)

### 2.4 UI Rendering Pipeline

```
IDisplayItem.fragments: ICodeFragment[]
       │
       ▼
FragmentVisualizer
  1. Apply VisualizerFilter (allowedOrigins, typeOverrides, nameOverrides)
  2. Suppress '+' lap tokens
  3. Render each fragment as colored <span> badge via fragmentColorMap
```

`FragmentVisualizer` is origin-agnostic — it doesn't care whether fragments came from parser, runtime, or user. **This is good.** The problem is everything *above* it that decides which fragments to put in the `IDisplayItem`.

---

## 3. Problems & Pain Points

### 3.1 Structural Inconsistencies

| Property | CodeStatement | RuntimeBlock | OutputStatement |
|----------|---------------|--------------|-----------------|
| `fragments` shape | `ICodeFragment[]` | `ICodeFragment[][]` | `ICodeFragment[]` |
| `findFragment` param | `FragmentType` (enum) | `FragmentType` (enum) | `string` (legacy) |
| Origins present | `'parser'` only | `'parser'` + memory-derived | `'parser'` + `'runtime'` + `'user'` |
| Fragment source | Direct property | Memory-backed getter | Direct property |

**`OutputStatement.findFragment(type: string)`** uses a raw string parameter while `ICodeStatement.findFragment(type: FragmentType)` uses the enum. This is a type-safety gap.

### 3.2 Fragment Precedence is Ad-Hoc

When multiple fragments of the same `FragmentType` exist with different origins, **there is no standard precedence**. Each consumer makes its own decision:

- `GenericTimerStrategy` filters out `origin: 'runtime'` fragments before compiling
- `TimerOutputBehavior` creates a new `origin: 'runtime'` timer fragment with elapsed time
- `SegmentOutputBehavior` passes `block.fragments?.flat()` through unchanged
- `AnalyticsIndexPanel.segmentToFragments()` builds entirely new fragments from metric data
- `useStackDisplayItems()` takes `block.fragments?.flat()` with no precedence logic

**No component asks**: "For this `FragmentType.Timer`, should I show the parser's `10:00` or the runtime's `07:23` remaining?"

### 3.3 Multi-Fragment-per-Type is Unsupported

Real workouts produce multiple fragments of the same type:

```
21-15-9 Thrusters + Pull-ups
```

This produces:
- `RepFragment(21)`, `RepFragment(15)`, `RepFragment(9)` — three `FragmentType.Rep`
- `ActionFragment("Thrusters")`, `ActionFragment("Pull-ups")` — two `FragmentType.Action`

Currently `findFragment(FragmentType.Rep)` returns the **first** one. There is no mechanism to ask for "the most relevant rep fragment for the current round."

### 3.4 Broken Fragment Flow in Compilation

**Critical bug**: `BlockBuilder.setFragments()` stores fragments, but `BlockBuilder.build()` passes them as an 8th constructor argument to `RuntimeBlock` which only accepts 7 parameters:

```typescript
// BlockBuilder.ts
build(): IRuntimeBlock {
    return new RuntimeBlock(
        this.runtime,
        this.sourceIds,
        Array.from(this.behaviors.values()),
        this.context,
        this.key,
        this.blockType,
        this.label,
        this.fragments  // ← 8th arg, SILENTLY IGNORED
    );
}
```

`RuntimeBlock`'s `fragments` getter reads from `FragmentMemory`:

```typescript
get fragments(): ICodeFragment[][] {
    const fragmentEntry = this.getMemory('fragment');
    return fragmentEntry?.value.fragments ? [[...fragmentEntry.value.fragments]] : [];
}
```

Unless a behavior explicitly calls `block.setMemoryValue('fragment', { fragments: [...] })`, the block has **zero fragments**. The strategies call `builder.setFragments(fragmentGroups)` but the data never arrives.

**Consequence**: `SegmentOutputBehavior.onUnmount()` calls `ctx.block.fragments?.flat()` and gets `[]`, meaning output statements are often emitted with empty fragment arrays. The UI falls back to `label` strings.

### 3.5 UI Components Must Know Source Type

`IDisplayItem.sourceType` exists specifically because the UI sometimes needs to know "was this a statement, a block, or a span?" to render differently. With a proper `IFragmentSource`, the source type would only matter for debugging — the fragments themselves would carry all needed display information.

---

## 4. Proposed Solution: `IFragmentSource`

### 4.1 Core Interface

```typescript
/**
 * Unified contract for any data object that provides displayable fragments.
 * 
 * Implemented by CodeStatement, RuntimeBlock, OutputStatement, and Segment.
 * Consumed by IDisplayItem adapters and UI components.
 * 
 * All fragment access goes through this interface, ensuring:
 * 1. Consistent precedence resolution
 * 2. Multi-fragment-per-type support
 * 3. Origin-aware filtering
 * 4. Source-type-agnostic UI rendering
 */
export interface IFragmentSource {
  /**
   * Unique identifier for React keys and tracking.
   */
  readonly id: string | number;

  /**
   * Get the "display-ready" fragments after precedence resolution.
   * 
   * For each FragmentType present, returns fragments in precedence order.
   * Multiple fragments of the same type are preserved (e.g., 3 rep fragments
   * for a 21-15-9 scheme). Within a type, higher-precedence origins replace
   * lower-precedence ones unless both carry unique information.
   * 
   * @param filter Optional filter to restrict which fragments are returned
   */
  getDisplayFragments(filter?: FragmentFilter): ICodeFragment[];

  /**
   * Get the highest-precedence single fragment of a given type.
   * 
   * Precedence order: user > runtime > compiler > parser
   * 
   * @param type The fragment type to look up
   * @returns The winning fragment, or undefined if none exist
   */
  getFragment(type: FragmentType): ICodeFragment | undefined;

  /**
   * Get ALL fragments of a given type, ordered by precedence (highest first).
   * 
   * Use when multiple fragments of the same type are meaningful
   * (e.g., rep scheme 21-15-9, multiple actions in a complex).
   */
  getAllFragmentsByType(type: FragmentType): ICodeFragment[];

  /**
   * Check if any fragment of this type exists (at any precedence level).
   */
  hasFragment(type: FragmentType): boolean;

  /**
   * Access the raw, unfiltered fragments for debugging or advanced use.
   * No precedence resolution applied.
   */
  readonly rawFragments: ICodeFragment[];
}

/**
 * Filter configuration for fragment retrieval.
 */
export interface FragmentFilter {
  /** Only include fragments with these origins */
  origins?: FragmentOrigin[];
  /** Only include these fragment types */
  types?: FragmentType[];
  /** Exclude these fragment types */
  excludeTypes?: FragmentType[];
}
```

### 4.2 Fragment Precedence Rules

Origins are ranked from highest to lowest priority:

```
┌──────────────┐
│  1. 'user'   │  User manually entered/overrode a value
├──────────────┤
│  2. 'runtime'│  Generated during execution (elapsed time, sensor data)
├──────────────┤
│  3. 'compiler│  Synthesized by JIT compilation strategy
├──────────────┤
│  4. 'parser' │  Parsed from source text (the "plan")
└──────────────┘
```

**Supplemental origins** (`'collected'`, `'hinted'`, `'tracked'`, `'analyzed'`) map into this hierarchy:

| Origin | Precedence Equivalent | Rationale |
|--------|----------------------|-----------|
| `'collected'` | Same as `'user'` | Collected from user input |
| `'hinted'` | Same as `'compiler'` | Suggestion, not authoritative |
| `'tracked'` | Same as `'runtime'` | Being actively tracked at runtime |
| `'analyzed'` | Same as `'runtime'` | Post-hoc analysis, overrides plan |

### 4.3 Fragment Resolution Algorithm

```typescript
/**
 * Utility function implementing the standard precedence algorithm.
 * 
 * Rules:
 * 1. Group fragments by FragmentType
 * 2. Within each type, partition by origin precedence tier
 * 3. Return fragments from the HIGHEST tier that has any
 * 4. If multiple fragments exist in the winning tier, keep ALL of them
 *    (multi-fragment-per-type support)
 * 5. Across types, concatenate results maintaining original order
 */
function resolveFragmentPrecedence(
  fragments: ICodeFragment[],
  filter?: FragmentFilter
): ICodeFragment[] {
  // Step 1: Apply type/origin filters
  let filtered = fragments;
  if (filter) {
    if (filter.origins) {
      filtered = filtered.filter(f => filter.origins!.includes(f.origin ?? 'parser'));
    }
    if (filter.types) {
      filtered = filtered.filter(f => filter.types!.includes(f.fragmentType));
    }
    if (filter.excludeTypes) {
      filtered = filtered.filter(f => !filter.excludeTypes!.includes(f.fragmentType));
    }
  }

  // Step 2: Group by FragmentType
  const byType = new Map<FragmentType, ICodeFragment[]>();
  for (const f of filtered) {
    const group = byType.get(f.fragmentType) ?? [];
    group.push(f);
    byType.set(f.fragmentType, group);
  }

  // Step 3: For each type, take highest-precedence tier
  const result: ICodeFragment[] = [];
  for (const [_type, typeFragments] of byType) {
    const bestTier = selectBestTier(typeFragments);
    result.push(...bestTier);
  }

  return result;
}

const ORIGIN_PRECEDENCE: Record<FragmentOrigin, number> = {
  'user': 0,
  'collected': 0,
  'runtime': 1,
  'tracked': 1,
  'analyzed': 1,
  'compiler': 2,
  'hinted': 2,
  'parser': 3,
};

function selectBestTier(fragments: ICodeFragment[]): ICodeFragment[] {
  let bestRank = Infinity;
  let best: ICodeFragment[] = [];

  for (const f of fragments) {
    const rank = ORIGIN_PRECEDENCE[f.origin ?? 'parser'] ?? 3;
    if (rank < bestRank) {
      bestRank = rank;
      best = [f];
    } else if (rank === bestRank) {
      best.push(f);
    }
  }

  return best;
}
```

### 4.4 Multi-Fragment Handling

The algorithm preserves **all** fragments within the winning tier. This handles:

| Scenario | Fragments in Winning Tier | Result |
|----------|---------------------------|--------|
| Simple timer: `10:00 Run` | 1× `Timer(parser)`, 1× `Action(parser)` | Both shown |
| Active timer: `10:00 Run` during execution | 1× `Timer(runtime, elapsed=4:32)` replaces `Timer(parser)`, `Action(parser)` unchanged | `Timer(runtime)` + `Action(parser)` |
| Rep scheme: `21-15-9 Thrusters` | 3× `Rep(parser)` | All 3 shown |
| Rep scheme with tracking: | 1× `Rep(runtime, actual=19)` replaces all 3 `Rep(parser)` | `Rep(runtime)` only |
| User override: | 1× `Rep(user, actual=18)` replaces `Rep(runtime)` | `Rep(user)` only |

**Important**: Tier replacement is per-`FragmentType`. A `runtime` origin `Timer` does NOT affect `parser` origin `Action` fragments.

---

## 5. Implementation Per Data Level

### 5.1 CodeStatement

**Simplest implementation** — parser output has only `'parser'` origin fragments. No precedence to resolve.

```typescript
export class ParsedCodeStatement extends CodeStatement implements IFragmentSource {
  // ... existing fields ...

  getDisplayFragments(filter?: FragmentFilter): ICodeFragment[] {
    return resolveFragmentPrecedence(this.fragments, filter);
  }

  getFragment(type: FragmentType): ICodeFragment | undefined {
    return this.findFragment(type);  // Existing method works fine
  }

  getAllFragmentsByType(type: FragmentType): ICodeFragment[] {
    return this.filterFragments(type);
  }

  get rawFragments(): ICodeFragment[] {
    return this.fragments;
  }
}
```

### 5.2 RuntimeBlock

**Most complex implementation** — must merge `FragmentMemory` state with typed `Memory` entries (timer, round, etc.) and apply precedence.

```typescript
export class RuntimeBlock implements IRuntimeBlock, IFragmentSource {
  // ... existing fields ...

  /**
   * Synthesize a complete fragment array from ALL sources:
   * 1. Static fragments from FragmentMemory (origin: 'parser')
   * 2. Timer state from TimerMemory (origin: 'runtime')
   * 3. Round state from RoundMemory (origin: 'runtime')
   * 4. Any user-collected fragments (origin: 'user')
   */
  private synthesizeAllFragments(): ICodeFragment[] {
    const fragments: ICodeFragment[] = [];

    // Source 1: Fragment memory (static parser fragments)
    const fragmentEntry = this.getMemory('fragment');
    if (fragmentEntry?.value.fragments) {
      fragments.push(...fragmentEntry.value.fragments);
    }

    // Source 2: Timer memory → synthesize Timer fragment
    const timerEntry = this.getMemory('timer');
    if (timerEntry) {
      const timer = timerEntry.value;
      const elapsed = calculateElapsedFromSpans(timer.spans);
      fragments.push({
        type: 'timer',
        fragmentType: FragmentType.Timer,
        value: elapsed,
        image: formatDuration(elapsed),
        origin: 'runtime',
        sourceBlockKey: this.key.toString(),
        timestamp: new Date(),
      });
    }

    // Source 3: Round memory → synthesize Rounds fragment
    const roundEntry = this.getMemory('round');
    if (roundEntry) {
      const round = roundEntry.value;
      fragments.push({
        type: 'rounds',
        fragmentType: FragmentType.Rounds,
        value: round.current,
        image: round.total
          ? `${round.current}/${round.total}`
          : `Round ${round.current}`,
        origin: 'runtime',
        sourceBlockKey: this.key.toString(),
      });
    }

    return fragments;
  }

  getDisplayFragments(filter?: FragmentFilter): ICodeFragment[] {
    return resolveFragmentPrecedence(this.synthesizeAllFragments(), filter);
  }

  getFragment(type: FragmentType): ICodeFragment | undefined {
    const all = this.getAllFragmentsByType(type);
    return all[0]; // Highest precedence first
  }

  getAllFragmentsByType(type: FragmentType): ICodeFragment[] {
    return resolveFragmentPrecedence(
      this.synthesizeAllFragments(),
      { types: [type] }
    );
  }

  get rawFragments(): ICodeFragment[] {
    return this.synthesizeAllFragments();
  }
}
```

### 5.3 OutputStatement

**Straightforward** — fragments are already merged at creation time. The `IFragmentSource` implementation adds precedence resolution.

```typescript
export class OutputStatement implements IOutputStatement, IFragmentSource {
  // ... existing fields ...

  getDisplayFragments(filter?: FragmentFilter): ICodeFragment[] {
    return resolveFragmentPrecedence(this.fragments, filter);
  }

  getFragment(type: FragmentType): ICodeFragment | undefined {
    const resolved = resolveFragmentPrecedence(this.fragments, { types: [type] });
    return resolved[0];
  }

  getAllFragmentsByType(type: FragmentType): ICodeFragment[] {
    return resolveFragmentPrecedence(this.fragments, { types: [type] });
  }

  get rawFragments(): ICodeFragment[] {
    return this.fragments;
  }
}
```

### 5.4 IDisplayItem

`IDisplayItem` needs a minimal change — it can optionally carry a reference to the `IFragmentSource` for advanced consumers, while still exposing the flat `fragments` array for simple rendering:

```typescript
export interface IDisplayItem {
  // ... existing fields ...

  /** 
   * Pre-resolved fragments for display.
   * When populated from an IFragmentSource, these are already precedence-resolved.
   */
  fragments: ICodeFragment[];

  /**
   * Optional reference to the source for advanced fragment queries.
   * Allows UI components to access getAllFragmentsByType() etc.
   * Not required for basic rendering.
   */
  source?: IFragmentSource;
}
```

---

## 6. Adapter Simplification

### Before: Four Adapters with Duplicated Logic

Each adapter manually extracts and flattens fragments:

```typescript
// blockToDisplayItem (current)
const fragments = block.fragments?.flat()
  ?? [createLabelFragment(block.label, block.blockType || 'group')];

// outputStatementToDisplayItem (current)
const fragments = output.fragments.flat();

// statementToDisplayItem (current)
fragments: statement.fragments

// runtimeSpanToDisplayItem (current)
const fragments = span.fragments.flat();
```

### After: Single Fragment Extraction via IFragmentSource

```typescript
/**
 * Universal adapter — works for any IFragmentSource.
 */
export function fragmentSourceToDisplayItem(
  source: IFragmentSource,
  options: {
    depth: number;
    status: DisplayStatus;
    sourceType: DisplaySourceType;
    parentId?: string | null;
    startTime?: number;
    endTime?: number;
    duration?: number;
    isLinked?: boolean;
  }
): IDisplayItem {
  const fragments = source.getDisplayFragments();

  const isHeader = fragments.some(f =>
    f.fragmentType === FragmentType.Timer ||
    f.fragmentType === FragmentType.Rounds ||
    HEADER_TYPES.has(f.type.toLowerCase())
  );

  return {
    id: source.id.toString(),
    parentId: options.parentId ?? null,
    fragments,
    depth: options.depth,
    isHeader,
    isLinked: options.isLinked,
    status: options.status,
    sourceType: options.sourceType,
    sourceId: source.id,
    startTime: options.startTime,
    endTime: options.endTime,
    duration: options.duration,
    label: fragmentsToLabel(fragments),
    source,
  };
}
```

The existing four adapters become thin wrappers that compute `depth`, `status`, and timing:

```typescript
// Simplified blockToDisplayItem
export function blockToDisplayItem(block: IRuntimeBlock & IFragmentSource, stackIndex: number): IDisplayItem {
  return fragmentSourceToDisplayItem(block, {
    depth: stackIndex,
    status: 'active',
    sourceType: 'block',
    startTime: block.executionTiming?.startTime?.getTime(),
  });
}

// Simplified outputStatementToDisplayItem
export function outputStatementToDisplayItem(output: IOutputStatement & IFragmentSource): IDisplayItem {
  return fragmentSourceToDisplayItem(output, {
    depth: output.stackLevel,
    status: output.outputType === 'segment' ? 'active' : 'completed',
    sourceType: 'record',
    parentId: output.parent?.toString(),
    startTime: output.timeSpan.started,
    endTime: output.timeSpan.ended,
    duration: output.timeSpan.duration,
  });
}
```

---

## 7. UI Component Simplification

### FragmentVisualizer — No Changes Needed

`FragmentVisualizer` already accepts `ICodeFragment[]` and renders them uniformly. It already supports `VisualizerFilter` for origin/type filtering. **No changes needed.**

### UnifiedItemRow — Simplified

Currently:
```tsx
{item.fragments.length > 0 ? (
  <FragmentVisualizer fragments={item.fragments} size={size} filter={filter} />
) : item.label ? (
  <span>{item.label}</span>
) : (
  <span>No data</span>
)}
```

With `IFragmentSource`, the fallback to `label` disappears because `getDisplayFragments()` can synthesize a text fragment from the label when no other fragments exist:

```tsx
<FragmentVisualizer fragments={item.fragments} size={size} filter={filter} />
```

### Advanced Components — Access Source Directly

Components like `TimerDisplay`, `RefinedTimerDisplay`, and `RuntimeDebugPanel` that need per-type fragment queries can use `item.source`:

```tsx
// Before: Manual memory access
const timerMemory = block.getMemory('timer');
const roundMemory = block.getMemory('round');
const elapsed = timerMemory ? calculateElapsed(timerMemory.value) : 0;

// After: Fragment-based access
const timerFragment = source.getFragment(FragmentType.Timer);
const elapsed = timerFragment?.value as number ?? 0;
```

---

## 8. Migration Plan

### Phase 0: Fix the Fragment Pipeline Bug (Prerequisites)

**Must do first** — without these fixes, `IFragmentSource` on RuntimeBlock won't have data.

| Task | File | Change |
|------|------|--------|
| Fix `BlockBuilder.build()` to pass fragments to `FragmentMemory` | `src/runtime/compiler/BlockBuilder.ts` | After constructing `RuntimeBlock`, call `block.setMemoryValue('fragment', { fragments: this.fragments.flat() })` |
| Fix `OutputStatement.findFragment` type parameter | `src/core/models/OutputStatement.ts` | Change `type: string` to `type: FragmentType` to match `ICodeStatement` |

### Phase 1: Define the Interface

| Task | File |
|------|------|
| Create `IFragmentSource` interface | `src/core/contracts/IFragmentSource.ts` |
| Create `resolveFragmentPrecedence()` utility | `src/core/utils/fragmentPrecedence.ts` |
| Create `FragmentFilter` type | `src/core/contracts/IFragmentSource.ts` |
| Export from `src/core/index.ts` | `src/core/index.ts` |

### Phase 2: Implement on Data Models

| Task                                         | File                                 | Risk                             |
| -------------------------------------------- | ------------------------------------ | -------------------------------- |
| `CodeStatement implements IFragmentSource`   | `src/core/models/CodeStatement.ts`   | Low — trivial delegation         |
| `RuntimeBlock implements IFragmentSource`    | `src/runtime/RuntimeBlock.ts`        | Medium — memory synthesis logic  |
| `OutputStatement implements IFragmentSource` | `src/core/models/OutputStatement.ts` | Low — already has flat fragments |
| `RuntimeSpan implements IFragmentSource`     | `src/runtime/models/RuntimeSpan.ts`  | Low — mirrors OutputStatement    |

### Phase 3: Update Adapters

| Task | File | Risk |
|------|------|------|
| Create `fragmentSourceToDisplayItem()` | `src/core/adapters/displayItemAdapters.ts` | Low |
| Refactor existing adapters to use it | `src/core/adapters/displayItemAdapters.ts` | Medium — verify no behavior changes |
| Add `source?: IFragmentSource` to `IDisplayItem` | `src/core/models/DisplayItem.ts` | Low — optional field |
| Update `useStackDisplayItems` to use new adapters | `src/runtime/hooks/useStackDisplay.ts` | Medium |

### Phase 4: Simplify UI Components

| Task | File | Risk |
|------|------|------|
| Remove source-type branching from `UnifiedItemRow` | `src/components/fragments/UnifiedItemRow.tsx` | Low |
| Update `AnalyticsIndexPanel.segmentToFragments()` | `src/components/layout/AnalyticsIndexPanel.tsx` | Medium |
| Migrate `TimerDisplay` to use `IFragmentSource` | `src/components/workout/TimerDisplay.tsx` | High — live timer rendering |
| Remove ad-hoc fragment merging in `RuntimeHistoryLog` | `src/components/history/RuntimeHistoryLog.tsx` | Medium |

### Phase 5: Deprecation Cleanup

| Task | Notes |
|------|-------|
| Mark `ICodeStatement.findFragment()` as `@deprecated` | Use `IFragmentSource.getFragment()` |
| Mark `IRuntimeBlock.fragments` getter as `@deprecated` | Use `IFragmentSource.getDisplayFragments()` |
| Remove `createLabelFragment()` fallback path | Labels synthesized by `IFragmentSource` |
| Remove `IDisplayItem.sourceType` discrimination in UI | No longer needed for rendering decisions |

---

## 9. Relationship to Gemini Proposal

The earlier Gemini proposal (`docs/FragmentOverhaul.gemini.md`) introduced `IFragmentProvider` with similar goals. This Opus document refines and extends that proposal:

| Aspect | Gemini Proposal | This Proposal |
|--------|-----------------|---------------|
| **Interface name** | `IFragmentProvider` | `IFragmentSource` (avoids confusion with React `Provider`) |
| **Core methods** | `getDisplayFragments()`, `getAllFragments()`, `getFragment()`, `hasFragment()` | Same + `getAllFragmentsByType()`, `rawFragments`, `FragmentFilter` parameter |
| **Precedence** | 4-tier (user > runtime > compiler > parser) | Same 4-tier + maps supplemental origins (`collected` → user, `hinted` → compiler, etc.) |
| **Multi-fragment** | Mentioned but not specified | Explicit algorithm: keep ALL fragments in winning tier |
| **Implementation details** | Conceptual per-level notes | Concrete code per level with memory synthesis for RuntimeBlock |
| **Bug identification** | Not addressed | Documents `BlockBuilder` 8th-arg bug and `OutputStatement.findFragment` type mismatch |
| **Migration plan** | 5-step outline | 5-phase plan with per-file risk assessment |
| **Adapter simplification** | Mentioned | Concrete `fragmentSourceToDisplayItem()` universal adapter |

**Recommendation**: This document supersedes the Gemini proposal. The Gemini doc should be archived or cross-referenced.

---

## 10. Open Questions

### Q1: Should `IFragmentSource` be an interface or abstract class?

**Interface** keeps it lightweight and allows `CodeStatement`, `OutputStatement`, and `RuntimeBlock` to implement it without changing their inheritance hierarchy. A `FragmentSourceMixin` or standalone `resolveFragmentPrecedence()` utility provides shared logic.

### Q2: Should the display item carry the full `IFragmentSource` or just pre-resolved fragments?

**Both**: `IDisplayItem.fragments` is pre-resolved for simple rendering. `IDisplayItem.source` is optional for advanced access. This avoids breaking the existing `FragmentVisualizer` pipeline.

### Q3: How should the precedence algorithm handle `TimerFragment` specifically?

Timer fragments are special — the parser produces a "target duration" (`10:00`) while the runtime produces "elapsed time" (`07:23`). These are complementary, not competing. Options:

- **A)** Runtime replaces parser (current proposal): Show `07:23`, hide `10:00`
- **B)** Both are shown with different visual treatments: `07:23 / 10:00`
- **C)** Introduce `FragmentType.TimerTarget` vs `FragmentType.TimerElapsed` subtypes

**Recommendation**: Option A for now. The circular progress ring in `RefinedTimerDisplay` already shows both values visually (arc + text). Fragment-level display should show the "current truth."

### Q4: What about `MetricBehavior` vs `FragmentOrigin`?

Both classify fragment intent. `MetricBehavior` (`Defined`, `Hint`, `Collected`, `Recorded`, `Calculated`) overlaps with `FragmentOrigin` (`parser`, `hinted`, `user`, `runtime`, `analyzed`). Should we:

- **A)** Keep both — `origin` for precedence, `behavior` for UI styling
- **B)** Merge into a single classification

**Recommendation**: Option A. `origin` drives precedence logic. `behavior` drives UI affordances (e.g., "Collected" values have edit buttons). They answer different questions.

### Q5: Should RuntimeSpan also implement IFragmentSource?

Yes. `RuntimeSpan` has the same 2D fragment storage pattern as `RuntimeBlock`. Its adapter flattens identically. Implementing `IFragmentSource` eliminates the runtime span adapter entirely.

### Q6: Per-round fragment resolution?

Some blocks have per-round fragment groups (`ICodeFragment[][]`). When displaying round 2 of 3, should `getDisplayFragments()` return:

- **A)** All fragments from all rounds (current behavior — `.flat()`)
- **B)** Only fragments for the "current" round

**Recommendation**: A for now (backward compatible). Future: add `getDisplayFragments({ round: 2 })` to `FragmentFilter` for round-scoped views.

---

*Generated by Opus — 2026-02-09*
