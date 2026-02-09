# WOD Wiki — Fragment Overhaul & Standardization

> **Status**: Proposed / Draft  
> **Created**: 2026-02-09  
> **Sources**: Consolidated from Gemini and Opus proposals  
> **Scope**: Core data pipeline (`CodeStatement` → `RuntimeBlock` → `OutputStatement`) & UI Rendering  
> **Objective**: Define a unified fragment interface that standardizes fragment access, precedence resolution, and multi-fragment-per-type handling across all levels of the runtime pipeline — and eliminates `IDisplayItem` as an intermediate adapter target.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture — As-Is Analysis](#2-current-architecture--as-is-analysis)
3. [Problems & Pain Points](#3-problems--pain-points)
4. [Proposed Solution: `IFragmentSource`](#4-proposed-solution-ifragmentsource)
5. [Fragment Precedence](#5-fragment-precedence)
6. [Multi-Fragment Handling](#6-multi-fragment-handling)
7. [Implementation Per Data Level](#7-implementation-per-data-level)
8. [UI Simplification — IDisplayItem Elimination](#8-ui-simplification--idisplayitem-elimination)
9. [Migration Plan](#9-migration-plan)
10. [Open Questions](#10-open-questions)

---

## 1. Executive Summary

The WOD Wiki runtime pipeline transforms workout data through three stages:

```
Parser → CodeStatement → RuntimeBlock → OutputStatement → UI
```

Each stage carries `ICodeFragment[]` arrays, but fragments are stored differently, accessed differently, and merged differently at each level. The UI layer currently interposes an `IDisplayItem` adapter with per-source-type logic to extract the same fundamental data: *"what fragments should I display?"*

### The Core Problem

- **Inconsistent Access**: UI components (`FragmentVisualizer`, `UnifiedItemList`) must "know" which type of object they render to extract data correctly.
- **Memory vs. Fragments**: `RuntimeBlock` stores dynamic state in `Memory` (e.g., remaining time), while `CodeStatement` stores static state in `Fragments` (e.g., duration). The UI manually merges these.
- **Precedence Ambiguity**: When a block has both a static "10 reps" fragment and a dynamic "8 reps completed" memory value, precedence logic is scattered across consumers.

### The Solution

We introduce **`IFragmentSource`** — a minimal, shared contract for accessing displayable fragments with precedence resolution. It provides:

1. **`getDisplayFragments()`** — the "winning" fragments after precedence resolution
2. **`getFragment(type)`** — single-fragment access with type-based precedence
3. **`getAllFragmentsByType(type)`** — multi-fragment access for same-type scenarios
4. **Standard origin precedence**: `user` > `runtime` > `compiler` > `parser`

### The Key Architectural Insight

**`IRuntimeBlock` does NOT implement `IFragmentSource`.** Instead, the **memory entries** that hold fragments implement it. This keeps fragments in the same memory system used by timers, rounds, completion state, etc. — with reactive subscriptions, proper disposal, and visibility control.

Fragment memory entries come in two flavors:
- **Internal** (`visibility: 'private'`): Per-group storage for the `ICodeFragment[][]` compilation groups. Used by strategies and behaviors.
- **Public** (`visibility: 'public'`): The aggregated, precedence-resolved view that implements `IFragmentSource` and binds directly to UI components.

This eliminates the `IDisplayItem` adapter layer, standardizes fragment precedence globally, and enables UI components to bind directly to `IFragmentSource` instances for rendering — the same way they already bind to timer and round memory via `useBlockMemory`.

**`IDisplayItem` is eliminated.** The UI renders `IFragmentSource` directly. For runtime blocks, the `IFragmentSource` is the `DisplayFragmentMemory` entry in the block's memory. For code statements and output statements, the model itself implements `IFragmentSource`. The four-adapter conversion pipeline becomes unnecessary.

---

## 2. Current Architecture — As-Is Analysis

### 2.1 The Four Data Levels

| Level       | Interface          | Role                      | Fragment Source                                                                                                                                                                                  |
| ----------- | ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Parser**  | `ICodeStatement`   | Static parsed script      | `fragments: ICodeFragment[]` — flat 1D, all `origin: 'parser'`                                                                                                                                   |
| **Runtime** | `IRuntimeBlock`    | Executing block on stack  | `fragments: ICodeFragment[][]` — 2D per-group from `FragmentMemory`. Groups are preserved end-to-end from strategy → builder → memory → getter. **Plus** typed `Memory` entries (`timer`, `round`, etc.) with parallel runtime state |
| **Output**  | `IOutputStatement` | Execution result snapshot | `fragments: ICodeFragment[]` — merged parser + runtime, extends `ICodeStatement`                                                                                                                 |
| **Display** | `IDisplayItem`     | Adapter target for UI     | `fragments: ICodeFragment[]` — flat 1D, always `.flat()`'d — **to be eliminated**                                                                                                              |

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
│   fragments: ICodeFragment[][]        ← 2D groups from FragmentMemory   │
│                                         groups preserved end-to-end      │
│   findFragment(type): T | undefined   ← iterates 2D                     │
│   filterFragments(type): T[]                                             │
│   hasFragment(type): boolean                                             │
│   context.memory:                                                        │
│     'timer'  → TimerState { spans, durationMs, direction, label }       │
│     'round'  → RoundState { current, total }                             │
│     'fragment' → FragmentState { groups: ICodeFragment[][] }             │
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

**Key observation**: Every adapter does the same thing — extracts `fragments`, `.flat()`s them, and puts them into `IDisplayItem.fragments`. The real differences are:
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

| Property             | CodeStatement         | RuntimeBlock                | OutputStatement                     |
| -------------------- | --------------------- | --------------------------- | ----------------------------------- |
| `fragments` shape    | `ICodeFragment[]`     | `ICodeFragment[][]`         | `ICodeFragment[]`                   |
| `findFragment` param | `FragmentType` (enum) | `FragmentType` (enum)       | `string` (legacy)                   |
| Origins present      | `'parser'` only       | `'parser'` + memory-derived | `'parser'` + `'runtime'` + `'user'` |
| Fragment source      | Direct property       | Memory-backed getter        | Direct property                     |

**`OutputStatement.findFragment(type: string)`** uses a raw string parameter while `ICodeStatement.findFragment(type: FragmentType)` uses the enum — a type-safety gap.

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

### 3.4 ~~Broken Fragment Flow in Compilation (Critical Bug)~~ — FIXED in Phase 0

~~`BlockBuilder.setFragments()` stores fragments, but `BlockBuilder.build()` passes them as an 8th constructor argument to `RuntimeBlock`, which only accepts 7 parameters.~~

**Fixed**: `BlockBuilder.build()` now allocates fragment memory after construction:

```typescript
// BlockBuilder.ts — AFTER fix
build(): IRuntimeBlock {
    const block = new RuntimeBlock(
        this.runtime, this.sourceIds,
        Array.from(this.behaviors.values()),
        this.context, this.key, this.blockType, this.label
    );

    // Allocate fragment memory preserving group structure from strategies
    if (this.fragments && this.fragments.length > 0) {
        block.setMemoryValue('fragment', { groups: this.fragments });
    }

    return block;
}
```

`FragmentState` now stores fragment groups as `ICodeFragment[][]`, preserving the multi-group structure produced by fragment distributors:

```typescript
export interface FragmentState {
    readonly groups: readonly (readonly ICodeFragment[])[];
}
```

`RuntimeBlock`'s `fragments` getter returns the stored groups directly:

```typescript
get fragments(): ICodeFragment[][] {
    const fragmentEntry = this.getMemory('fragment');
    return fragmentEntry?.value.groups?.length
        ? fragmentEntry.value.groups.map(g => [...g])
        : [];
}
```

### 3.5 UI Components Must Know Source Type

`IDisplayItem.sourceType` exists specifically because the UI sometimes needs to know "was this a statement, a block, or a span?" to render differently. With a proper `IFragmentSource`, the source type would only matter for debugging — the fragments themselves would carry all needed display information.

### 3.6 IDisplayItem is Redundant

The four-adapter pipeline (`statementToDisplayItem`, `blockToDisplayItem`, `outputStatementToDisplayItem`, `runtimeSpanToDisplayItem`) exists solely to flatten fragments into a common `IDisplayItem` shape. But every adapter does the same thing: extract fragments, `.flat()` them, stuff them into `IDisplayItem.fragments`. The differences (depth, status, timing) are display-context concerns, not fragment concerns. With `IFragmentSource` as the rendering contract, the entire `IDisplayItem` layer becomes dead weight.

---

## 4. Proposed Solution: `IFragmentSource`

### 4.1 Core Interface

```typescript
/**
 * Unified contract for any data object that provides displayable fragments.
 * 
 * Implemented by CodeStatement, RuntimeBlock, OutputStatement, RuntimeSpan.
 * Consumed directly by UI components — no IDisplayItem adapter layer.
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
   * For each FragmentType present, returns fragments from the highest-
   * precedence origin tier. Multiple fragments of the same type within
   * the winning tier are preserved (e.g., 3 rep fragments for 21-15-9).
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
```

### 4.2 Fragment Filter

```typescript
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

> **Naming note**: We use `IFragmentSource` rather than `IFragmentProvider` to avoid confusion with React's `Provider` pattern. Both names appeared in earlier proposals; `IFragmentSource` is the canonical choice.

---

## 5. Fragment Precedence

### 5.1 Origin Hierarchy

When `getDisplayFragments()` is called, the provider resolves conflicts using the following precedence (highest priority first):

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

### 5.2 Supplemental Origin Mapping

Additional origins used throughout the codebase map into the four canonical tiers:

| Origin | Precedence Equivalent | Rationale |
|--------|----------------------|-----------|
| `'collected'` | Same as `'user'` (tier 1) | Collected from user input |
| `'hinted'` | Same as `'compiler'` (tier 3) | Suggestion, not authoritative |
| `'tracked'` | Same as `'runtime'` (tier 2) | Being actively tracked at runtime |
| `'analyzed'` | Same as `'runtime'` (tier 2) | Post-hoc analysis, overrides plan |

### 5.3 Per-Type Precedence Behavior

While precedence is applied uniformly, the *effect* differs by fragment type:

| Fragment Type | If 'Runtime' exists... | If 'User' exists... | Behavior |
| :--- | :--- | :--- | :--- |
| **Timer** | ✅ Use Runtime | ✅ Use User | Hide parser value — show countdown/elapsed, not static duration |
| **Reps** | ✅ Use Runtime | ✅ Use User | Show completed/actual reps over static target |
| **Text** | ❌ Ignore Runtime | ✅ Use User | Text usually stays static unless explicitly rewritten |
| **Distance** | ✅ Use Runtime | ✅ Use User | Show live distance over planned |
| **Rounds** | ✅ Use Runtime | ✅ Use User | Show current round vs planned total |

**Important**: Tier replacement is per-`FragmentType`. A `runtime` origin `Timer` does NOT affect `parser` origin `Action` fragments.

### 5.4 Resolution Algorithm

```typescript
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

/**
 * Standard precedence algorithm.
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
    result.push(...selectBestTier(typeFragments));
  }

  return result;
}

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

---

## 6. Multi-Fragment Handling

The system must handle cases where *multiple* fragments of the same type are valid (e.g., an AMRAP with "21-15-9 Thrusters + Pull-ups").

### 6.1 Design Principles

- **`getDisplayFragments()`** returns **ALL** valid fragments across types.
- **`getFragment(type)`** returns the *highest precedence* single item for that type.
- **`getAllFragmentsByType(type)`** returns all fragments of that type from the winning tier.

### 6.2 Scenario Table

| Scenario | Fragments in Winning Tier | Result |
|----------|---------------------------|--------|
| Simple timer: `10:00 Run` | 1× `Timer(parser)`, 1× `Action(parser)` | Both shown |
| Active timer: `10:00 Run` during execution | 1× `Timer(runtime, elapsed=4:32)` replaces `Timer(parser)`, `Action(parser)` unchanged | `Timer(runtime)` + `Action(parser)` |
| Rep scheme: `21-15-9 Thrusters` | 3× `Rep(parser)` | All 3 shown |
| Rep scheme with tracking | 1× `Rep(runtime, actual=19)` replaces all 3 `Rep(parser)` | `Rep(runtime)` only |
| User override | 1× `Rep(user, actual=18)` replaces `Rep(runtime)` | `Rep(user)` only |
| Interval: "Run" + "400m" + Timer | 1× `Action(parser)` + 1× `Distance(parser)` + 1× `Timer(parser)` | All shown |

---

## 7. Implementation Per Data Level

### 7.1 CodeStatement (Static)

**Simplest implementation** — parser output has only `'parser'` origin fragments. No complex precedence to resolve.

```typescript
export class ParsedCodeStatement extends CodeStatement implements IFragmentSource {
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

### 7.2 Fragment Memory Architecture (RuntimeBlock)

**Key design change**: `IRuntimeBlock` does **not** implement `IFragmentSource`. Instead, fragment data lives in the memory system — the same way timer, round, and completion state already do. The memory entries themselves implement `IFragmentSource` and can be bound directly to UI components via the existing `useBlockMemory` hook.

#### Fragment Memory — Groups Stored Natively (Phase 0 Implementation)

Rather than separate `fragment:group:N` memory entries, `FragmentState` stores the multi-group structure directly:

```
┌─────────────────────────────────────────────────────────────────────┐
│ RuntimeBlock Memory                                                 │
│                                                                     │
│  ┌─ FRAGMENT MEMORY ────────────────────────────────────────────┐   │
│  │  'fragment' → FragmentState {                                 │   │
│  │    groups: [                                                  │   │
│  │      ICodeFragment[],  // group 0 (e.g., parser fragments)   │   │
│  │      ICodeFragment[],  // group 1 (e.g., inherited)          │   │
│  │      ICodeFragment[],  // group N (e.g., per-round)          │   │
│  │    ]                                                          │   │
│  │  }                                                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ FUTURE: PUBLIC DISPLAY (Phase 1) ──────────────────────────┐   │
│  │  'fragment:display'  → DisplayFragmentMemory                  │   │
│  │                        implements IFragmentSource             │   │
│  │                        reads from 'fragment' groups +         │   │
│  │                        timer/round memory for synthesis       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ OTHER MEMORY (existing) ────────────────────────────────────┐   │
│  │  'timer'      → TimerState                                   │   │
│  │  'round'      → RoundState                                   │   │
│  │  'completion' → CompletionState                               │   │
│  │  'display'    → DisplayState                                  │   │
│  │  'controls'   → ButtonsState                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

#### FragmentState (Updated in Phase 0)

```typescript
export interface FragmentState {
    /** Fragment groups — each inner array is a semantic group (e.g., per-round fragments) */
    readonly groups: readonly (readonly ICodeFragment[])[];
}
```

#### FragmentMemory (Updated in Phase 0)

```typescript
export class FragmentMemory extends BaseMemoryEntry<'fragment', FragmentState> {
    constructor(initialGroups: ICodeFragment[][] = []) {
        super('fragment', { groups: initialGroups });
    }

    addFragment(fragment: ICodeFragment, groupIndex: number = 0): void { ... }
    addGroup(fragments: ICodeFragment[]): void { ... }
    clear(): void { ... }
    setGroups(groups: ICodeFragment[][]): void { ... }
}
```

#### Future: New Memory Types (Phase 1)

```typescript
// To be added in Phase 1:

/** Public display fragment source */
export type FragmentDisplayType = 'fragment:display';

// The MemoryType union becomes:
export type MemoryType = 
  | 'timer' | 'round' | 'fragment' | 'completion' | 'display' | 'controls'
  | FragmentDisplayType;  // 'fragment:display'
```

> **Design note**: The original proposal had separate `fragment:group:N` memory entries per group.
> Instead, we store all groups in a single `'fragment'` memory entry as `groups: ICodeFragment[][]`.
> This is simpler (no new memory types needed for Phase 0), preserves the group structure, and 
> the existing `FragmentMemory` class handles it naturally. The Phase 1 `DisplayFragmentMemory` 
> will read from this single entry and aggregate with runtime state.

#### Public Display Fragment Memory (`DisplayFragmentMemory`)

The `fragment:display` memory entry implements `IFragmentSource`. It aggregates fragments from internal groups, timer memory, and round memory, then applies the standard precedence algorithm.

```typescript
/**
 * Public fragment memory that implements IFragmentSource.
 * Aggregates internal fragment groups + runtime state into a 
 * precedence-resolved, display-ready view.
 *
 * UI components bind to this memory entry via useBlockMemory('fragment:display')
 * the same way they bind to 'timer' or 'round' state.
 */
export class DisplayFragmentMemory 
  extends BaseMemoryEntry<'fragment:display', FragmentDisplayState>
  implements IFragmentSource {

  readonly id: string | number;
  private _unsubscribers: Array<() => void> = [];

  constructor(
    blockKey: string,
    private readonly block: IRuntimeBlock
  ) {
    super('fragment:display', { fragments: [], resolved: [] });
    this.id = blockKey;
  }

  /**
   * Subscribe to internal fragment groups and other memory entries.
   * When any source changes, re-resolve and notify subscribers.
   */
  bind(): void {
    // Subscribe to internal fragment groups
    for (const type of this.block.getMemoryTypes()) {
      if (type.startsWith('fragment:group:')) {
        const entry = this.block.getMemory(type as MemoryType);
        if (entry) {
          this._unsubscribers.push(
            entry.subscribe(() => this.resolve())
          );
        }
      }
    }

    // Subscribe to timer memory (synthesize runtime timer fragment)
    const timer = this.block.getMemory('timer');
    if (timer) {
      this._unsubscribers.push(timer.subscribe(() => this.resolve()));
    }

    // Subscribe to round memory (synthesize runtime round fragment)
    const round = this.block.getMemory('round');
    if (round) {
      this._unsubscribers.push(round.subscribe(() => this.resolve()));
    }

    // Initial resolution
    this.resolve();
  }

  /**
   * Re-aggregate from all sources and apply precedence.
   */
  private resolve(): void {
    const all: ICodeFragment[] = [];

    // Collect from internal groups
    for (const type of this.block.getMemoryTypes()) {
      if (type.startsWith('fragment:group:')) {
        const entry = this.block.getMemory(type as MemoryType);
        if (entry?.value?.fragments) {
          all.push(...entry.value.fragments);
        }
      }
    }

    // Synthesize timer fragment from TimerMemory
    const timerEntry = this.block.getMemory('timer');
    if (timerEntry) {
      const timer = timerEntry.value;
      all.push({
        type: 'timer',
        fragmentType: FragmentType.Timer,
        value: calculateElapsedFromSpans(timer.spans),
        image: formatDuration(calculateElapsedFromSpans(timer.spans)),
        origin: 'runtime',
        sourceBlockKey: this.id.toString(),
      });
    }

    // Synthesize round fragment from RoundMemory
    const roundEntry = this.block.getMemory('round');
    if (roundEntry) {
      const round = roundEntry.value;
      all.push({
        type: 'rounds',
        fragmentType: FragmentType.Rounds,
        value: round.current,
        image: round.total 
          ? `${round.current}/${round.total}` 
          : `Round ${round.current}`,
        origin: 'runtime',
        sourceBlockKey: this.id.toString(),
      });
    }

    const resolved = resolveFragmentPrecedence(all);
    this.update({ fragments: all, resolved });
  }

  // ─── IFragmentSource implementation ───

  getDisplayFragments(filter?: FragmentFilter): ICodeFragment[] {
    if (filter) {
      return resolveFragmentPrecedence(this._value.fragments, filter);
    }
    return this._value.resolved;
  }

  getFragment(type: FragmentType): ICodeFragment | undefined {
    return this.getDisplayFragments({ types: [type] })[0];
  }

  getAllFragmentsByType(type: FragmentType): ICodeFragment[] {
    return this.getDisplayFragments({ types: [type] });
  }

  hasFragment(type: FragmentType): boolean {
    return this.getFragment(type) !== undefined;
  }

  get rawFragments(): ICodeFragment[] {
    return this._value.fragments;
  }

  dispose(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    super.dispose();
  }
}

/** State shape for the display fragment memory entry */
export interface FragmentDisplayState {
  readonly fragments: readonly ICodeFragment[];  // all aggregated
  readonly resolved: readonly ICodeFragment[];   // after precedence
}
```

#### RuntimeBlock — No Interface Changes

`IRuntimeBlock` does **not** implement `IFragmentSource` and does **not** gain a `getFragmentSource()` method. The block's API is unchanged. The `DisplayFragmentMemory` entry is just another memory entry — the UI accesses it the same way it accesses timer or round state:

```typescript
// UI code — no changes to IRuntimeBlock needed
const fragmentSource = useBlockMemory(block, 'fragment:display');
```

The block's existing `fragments` getter continues to work for backward compatibility:

```typescript
export class RuntimeBlock implements IRuntimeBlock {
  // Existing fragment getter — backward compatible, delegates to memory
  get fragments(): ICodeFragment[][] {
    // Collect from internal groups
    const groups: ICodeFragment[][] = [];
    for (const type of this.getMemoryTypes()) {
      if (type.startsWith('fragment:group:')) {
        const entry = this.getMemory(type as MemoryType);
        if (entry?.value?.fragments) {
          groups.push([...entry.value.fragments]);
        }
      }
    }
    // Fall back to legacy 'fragment' memory if no groups exist
    if (groups.length === 0) {
      const legacy = this.getMemory('fragment');
      if (legacy?.value.fragments) {
        groups.push([...legacy.value.fragments]);
      }
    }
    return groups;
  }
}
```

**Why no `getFragmentSource()` on `IRuntimeBlock`?** Because the UI already has `useBlockMemory(block, 'fragment:display')`. Adding a convenience method to `IRuntimeBlock` would couple the block contract to the fragment source concept, which violates the principle that the block is just a memory host. The memory system is the abstraction boundary.

#### How Strategies Allocate Fragment Memory

```typescript
// In a strategy's compile() method:
compile(statement: ICodeStatement, builder: BlockBuilder): void {
  const distributor = new PassthroughFragmentDistributor();
  const groups = distributor.distribute(statement.fragments || [], blockType);

  // Allocate one internal memory entry per group
  for (let i = 0; i < groups.length; i++) {
    builder.allocateFragmentGroup(i, groups[i]);
  }

  // The builder automatically creates the public DisplayFragmentMemory
  // during build() and calls .bind() after all memory is initialized.
}
```

#### UI Binding via Hooks

The existing `useBlockMemory` hook works unchanged — the UI subscribes to the `DisplayFragmentMemory` entry reactively:

```tsx
function BlockFragmentDisplay({ block }: { block: IRuntimeBlock }) {
  // Bind to the public fragment source — reactive, auto-updates
  const fragmentSource = useBlockMemory(block, 'fragment:display');
  
  if (!fragmentSource) return null;
  
  const fragments = fragmentSource.resolved; // already precedence-resolved
  return <FragmentVisualizer fragments={fragments} />;
}
```

Or use a new convenience hook:

```tsx
function useFragmentSource(block: IRuntimeBlock | undefined): IFragmentSource | undefined {
  const displayMemory = useBlockMemory(block, 'fragment:display');
  // The memory entry itself IS the IFragmentSource
  const entry = block?.getMemory('fragment:display');
  return entry as unknown as IFragmentSource;
}
```

### 7.3 OutputStatement (Historic)

**Straightforward** — fragments are already merged at creation time. The `IFragmentSource` implementation adds precedence resolution.

```typescript
export class OutputStatement implements IOutputStatement, IFragmentSource {
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

### 7.4 IDisplayItem — Eliminated

`IDisplayItem` is no longer needed. The UI renders `IFragmentSource` directly. The metadata that `IDisplayItem` previously carried (depth, status, timing, parentId) is either:

- **Derivable from context** (stack position → depth, block lifecycle → status)
- **Carried on the source model** (OutputStatement has `timeSpan`, `stackLevel`)
- **Not needed at the fragment rendering level** (display concerns handled by layout components)

```
┌──────────────────────────────────────────────────────────────────┐
│ BEFORE: 4 adapters converting to IDisplayItem                   │
│                                                                  │
│ CodeStatement  ─→ statementToDisplayItem()  ─→ IDisplayItem ─→ UI│
│ RuntimeBlock   ─→ blockToDisplayItem()      ─→ IDisplayItem ─→ UI│
│ OutputStatement─→ outputToDisplayItem()      ─→ IDisplayItem ─→ UI│
│ RuntimeSpan    ─→ spanToDisplayItem()        ─→ IDisplayItem ─→ UI│
├──────────────────────────────────────────────────────────────────┤
│ AFTER: UI binds directly to IFragmentSource                     │
│                                                                  │
│ CodeStatement (implements IFragmentSource)  ─────────────────→ UI│
│ RuntimeBlock.memory['fragment:display']     ─────────────────→ UI│
│   (DisplayFragmentMemory implements IFragmentSource)             │
│ OutputStatement (implements IFragmentSource) ────────────────→ UI│
│ RuntimeSpan (implements IFragmentSource)     ────────────────→ UI│
└──────────────────────────────────────────────────────────────────┘
```

The `IFragmentSource` interface already has `id` for React keys. Display layout concerns (depth, indentation, header detection) are computed by the rendering components from stack context — not baked into an intermediate data structure.

---

## 8. UI Simplification — IDisplayItem Elimination

### 8.1 The Problem with IDisplayItem

The current pipeline has four adapters converting different source types to `IDisplayItem`:

```typescript
// Every adapter does the same thing: extract fragments, .flat(), stuff into IDisplayItem
const fragments = block.fragments?.flat() ?? [createLabelFragment(...)];  // blockToDisplayItem
const fragments = output.fragments.flat();                                 // outputToDisplayItem
fragments: statement.fragments;                                            // statementToDisplayItem
const fragments = span.fragments.flat();                                   // spanToDisplayItem
```

`IDisplayItem` was an intermediate data bag to normalize all these sources. But with `IFragmentSource`, every source already speaks the same language. The adapter layer is dead weight.

### 8.2 IFragmentSource Replaces IDisplayItem

The UI renders `IFragmentSource` directly. No conversion step. No intermediate data structure.

**Before** (4 adapters → `IDisplayItem` → UI):

```tsx
function renderItem(item: IDisplayItem) {
  if (isRuntimeBlock(item)) {
    const memoryTimer = item.getMemory('timer');
    if (memoryTimer) return <Timer value={memoryTimer} />;
    return <FragmentList fragments={item.fragments} />;
  } else if (isOutput(item)) {
    // ... logic for finding runtime fragments
  } else {
    // ... standard fragments
  }
}
```

**After** (UI binds to `IFragmentSource` directly):

```tsx
function renderItem(source: IFragmentSource) {
  const fragments = source.getDisplayFragments();
  return <FragmentVisualizer fragments={fragments} />;
}
```

### 8.3 Where Does Display Metadata Go?

`IDisplayItem` previously carried metadata like `depth`, `status`, `startTime`, `isHeader`, `label`, `sourceType`. These concerns are handled differently:

| Old IDisplayItem field | New home | Rationale |
|----------------------|----------|----------|
| `fragments` | `IFragmentSource.getDisplayFragments()` | The whole point of this overhaul |
| `id` | `IFragmentSource.id` | Already on the interface |
| `depth` | Stack position (layout context) | The rendering component knows its stack index |
| `status` | Block lifecycle (observer/context) | Active = on stack, complete = off stack |
| `isHeader` | Derived from `getDisplayFragments()` | Check if fragments contain Timer/Rounds types |
| `label` | Derived from `getDisplayFragments()` | Synthesize text from fragments or fall back to block label |
| `startTime/endTime` | Source model properties | `OutputStatement.timeSpan`, `RuntimeBlock.executionTiming` |
| `sourceType` | **Eliminated** | UI no longer branches on source type |
| `parentId` | Source model properties | `OutputStatement.parent`, stack hierarchy |

### 8.4 How Each Source Reaches the UI

```tsx
// RuntimeBlock — UI binds to the DisplayFragmentMemory via useBlockMemory
function BlockView({ block }: { block: IRuntimeBlock }) {
  const displayState = useBlockMemory(block, 'fragment:display');
  if (!displayState) return null;
  return <FragmentVisualizer fragments={displayState.resolved} />;
}

// CodeStatement — the statement IS the IFragmentSource
function StatementView({ statement }: { statement: ICodeStatement & IFragmentSource }) {
  return <FragmentVisualizer fragments={statement.getDisplayFragments()} />;
}

// OutputStatement — the output IS the IFragmentSource
function OutputView({ output }: { output: IOutputStatement & IFragmentSource }) {
  return <FragmentVisualizer fragments={output.getDisplayFragments()} />;
}
```

### 8.5 FragmentVisualizer — No Changes Needed

`FragmentVisualizer` already accepts `ICodeFragment[]` and renders them uniformly with `VisualizerFilter` for origin/type filtering. **No changes needed.**

### 8.6 Advanced Components — Query the Source

Components that need per-type fragment queries (timer display, round counter, debug panels) use `IFragmentSource` methods directly:

```tsx
// Before: Manual memory access + type branching
const timerMemory = block.getMemory('timer');
const roundMemory = block.getMemory('round');
const elapsed = timerMemory ? calculateElapsed(timerMemory.value) : 0;

// After: Query the IFragmentSource
const timerFragment = source.getFragment(FragmentType.Timer);
const elapsed = timerFragment?.value as number ?? 0;
```

### 8.7 List Rendering — Stack Provides Layout Context

For list views (workout plan, execution log), the rendering component receives an array of `IFragmentSource` instances and computes layout from context:

```tsx
function WorkoutItemList({ sources }: { sources: IFragmentSource[] }) {
  return (
    <div>
      {sources.map((source, index) => {
        const fragments = source.getDisplayFragments();
        const isHeader = fragments.some(f => 
          f.fragmentType === FragmentType.Timer || 
          f.fragmentType === FragmentType.Rounds
        );
        return (
          <WorkoutItemRow 
            key={source.id} 
            fragments={fragments} 
            depth={index}  // or computed from stack
            isHeader={isHeader} 
          />
        );
      })}
    </div>
  );
}
```

---

## 9. Migration Plan

### Phase 0: Fix the Fragment Pipeline Bug (Prerequisites) ✅

**Completed** — fragments now reach the block's memory with group structure preserved.

| Task                                                        | File                                   | Change                                                                                     | Status |
| ----------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| Fix `BlockBuilder.build()` to allocate fragment memory      | `src/runtime/compiler/BlockBuilder.ts` | Removed silently-dropped 8th arg. `build()` now calls `block.setMemoryValue('fragment', { groups: this.fragments })` preserving the `ICodeFragment[][]` structure | ✅ Done |
| Fix `OutputStatement.findFragment` type parameter           | `src/core/models/OutputStatement.ts`   | Changed `type: string` to `type: FragmentType` on `findFragment`, `filterFragments`, `hasFragment` | ✅ Done |
| Update `FragmentState` to hold `ICodeFragment[][]`          | `src/runtime/memory/MemoryTypes.ts`    | Changed `fragments: readonly ICodeFragment[]` to `groups: readonly (readonly ICodeFragment[])[]` | ✅ Done |
| Update `FragmentMemory` for group-based storage             | `src/runtime/memory/FragmentMemory.ts` | Constructor takes `ICodeFragment[][]`, added `addGroup()`, `setGroups()`, group-indexed `addFragment()` | ✅ Done |
| Update `RuntimeBlock.fragments` getter                      | `src/runtime/RuntimeBlock.ts`          | Returns stored groups directly instead of wrapping flat array as `[[...flat]]` | ✅ Done |

### Phase 1: Define Interfaces & Memory Types

| Task                                                          | File                                         |
| ------------------------------------------------------------- | -------------------------------------------- | ------ |
| Create `IFragmentSource` interface                            | `src/core/contracts/IFragmentSource.ts`      | ✅ Done |
| Create `resolveFragmentPrecedence()` utility                  | `src/core/utils/fragmentPrecedence.ts`       | ✅ Done |
| Create `FragmentFilter` type                                  | `src/core/contracts/IFragmentSource.ts`      | ✅ Done |
| Add `FragmentDisplayType` to `MemoryType`                     | `src/runtime/memory/MemoryTypes.ts`          | ✅ Done |
| Create `DisplayFragmentMemory` (public, implements `IFragmentSource`) | `src/runtime/memory/DisplayFragmentMemory.ts` | ✅ Done |
| Export from `src/core/index.ts` and `src/core-entry.ts`       | respective index files                       | ✅ Done |

> **Note**: `FragmentGroupMemory` is no longer needed as a separate class. Phase 0 stores all
> groups in a single `FragmentMemory` entry with `groups: ICodeFragment[][]`. The `DisplayFragmentMemory`
> reads from this single entry and auto-syncs via subscription.
>
> **Implementation details**:
> - `IFragmentSource` and `FragmentFilter` defined in `src/core/contracts/IFragmentSource.ts`
> - `resolveFragmentPrecedence()`, `selectBestTier()`, `ORIGIN_PRECEDENCE` in `src/core/utils/fragmentPrecedence.ts`
> - `FragmentDisplayState` added to `MemoryTypes.ts` with `fragments` (raw) and `resolved` (precedence-resolved) arrays
> - `MemoryType` union extended with `'fragment:display'`; `MemoryTypeMap` maps it to `FragmentDisplayState`
> - `DisplayFragmentMemory` subscribes to source `FragmentMemory` for reactive updates
> - Tests: 20 tests in `fragmentPrecedence.test.ts`, 22 tests in `DisplayFragmentMemory.test.ts` — all passing

### Phase 2: Implement on Parser & Output Models

| Task                                         | File                                 | Risk                             |
| -------------------------------------------- | ------------------------------------ | -------------------------------- |
| `CodeStatement implements IFragmentSource`   | `src/core/models/CodeStatement.ts`   | Low — trivial delegation         |
| `OutputStatement implements IFragmentSource` | `src/core/models/OutputStatement.ts` | Low — already has flat fragments |
| `RuntimeSpan implements IFragmentSource`     | `src/runtime/models/RuntimeSpan.ts`  | Low — mirrors OutputStatement    |

> **Note**: `IRuntimeBlock` is NOT modified. No new methods, no `IFragmentSource` implementation, no `getFragmentSource()`. The `DisplayFragmentMemory` entry in the block's memory is the `IFragmentSource`.

### Phase 3: Update BlockBuilder & Strategies

| Task | File | Risk |
|------|------|------|
| `build()` allocates `DisplayFragmentMemory` from stored groups | `src/runtime/compiler/BlockBuilder.ts` | Medium — fragment memory already allocated in Phase 0 |
| Update 5 strategies to use `DisplayFragmentMemory` if needed   | `src/runtime/compiler/strategies/`     | Low — pattern is identical |

### Phase 4: Create Hooks & Update UI Bindings

| Task | File | Risk |
|------|------|------|
| Create `useFragmentSource()` hook wrapping `useBlockMemory('fragment:display')` | `src/runtime/hooks/useBlockMemory.ts` | Low — thin wrapper |
| Update stack display hooks to provide `IFragmentSource[]` | `src/runtime/hooks/useStackDisplay.ts` | Medium |
| Update `UnifiedItemList` to render `IFragmentSource` directly | `src/components/unified/UnifiedItemList.tsx` | Medium |
| Update `UnifiedItemRow` to accept `IFragmentSource` instead of `IDisplayItem` | `src/components/unified/UnifiedItemRow.tsx` | Medium |

### Phase 5: Eliminate IDisplayItem & Adapter Layer

| Task | File | Risk |
|------|------|------|
| Remove `statementToDisplayItem()` | `src/core/adapters/displayItemAdapters.ts` | Low |
| Remove `blockToDisplayItem()` | `src/core/adapters/displayItemAdapters.ts` | Low |
| Remove `outputStatementToDisplayItem()` | `src/core/adapters/displayItemAdapters.ts` | Low |
| Remove `runtimeSpanToDisplayItem()` | `src/core/adapters/displayItemAdapters.ts` | Low |
| Remove `IDisplayItem` interface | `src/core/models/DisplayItem.ts` | Medium — verify no remaining consumers |
| Update `AnalyticsIndexPanel` to use `IFragmentSource` | `src/components/layout/AnalyticsIndexPanel.tsx` | Medium |
| Migrate `TimerDisplay` to bind to `fragment:display` memory | `src/components/workout/TimerDisplay.tsx` | High — live timer |

### Phase 6: Deprecation Cleanup

| Task | Notes |
|------|-------|
| Mark `ICodeStatement.findFragment()` as `@deprecated` | Use `IFragmentSource.getFragment()` |
| Mark `IRuntimeBlock.fragments` getter as `@deprecated` | Use `useBlockMemory(block, 'fragment:display')` |
| Mark legacy `FragmentMemory` as `@deprecated` | Replaced by `FragmentGroupMemory` + `DisplayFragmentMemory` |
| Remove `createLabelFragment()` fallback path | Labels synthesized by `DisplayFragmentMemory` |

---

## 10. Open Questions

### Q1: Interface or Abstract Class?

**Interface** keeps it lightweight. `CodeStatement` and `OutputStatement` implement it directly. `RuntimeBlock` doesn't implement it — its `DisplayFragmentMemory` entry does. A standalone `resolveFragmentPrecedence()` utility provides shared logic.

**Decision**: Interface + utility function + `DisplayFragmentMemory` class.

### Q2: Is IDisplayItem really unnecessary?

**Yes.** `IDisplayItem` was an adapter target to normalize four different source types into one shape. With `IFragmentSource`, all sources already speak the same language. Display-layout metadata (depth, status) is a rendering concern computed from context — it doesn't belong in a data transfer object. Eliminating `IDisplayItem` removes the adapter layer, four conversion functions, and the `sourceType` discrimination pattern in UI components.

### Q3: How should Timer fragments handle "target duration" vs "elapsed time"?

Timer fragments are special — the parser produces a "target duration" (`10:00`) while the runtime produces "elapsed time" (`07:23`). These are complementary, not competing. Options:

- **A)** Runtime replaces parser (current proposal): Show `07:23`, hide `10:00`
- **B)** Both shown with different visual treatments: `07:23 / 10:00`
- **C)** Introduce `FragmentType.TimerTarget` vs `FragmentType.TimerElapsed` subtypes

**Recommendation**: Option A for now. The circular progress ring in `RefinedTimerDisplay` already shows both values visually (arc + text). Fragment-level display should show the "current truth."

### Q4: `MetricBehavior` vs `FragmentOrigin` overlap?

Both classify fragment intent. `MetricBehavior` (`Defined`, `Hint`, `Collected`, `Recorded`, `Calculated`) overlaps with `FragmentOrigin` (`parser`, `hinted`, `user`, `runtime`, `analyzed`). Should we:

- **A)** Keep both — `origin` for precedence, `behavior` for UI styling
- **B)** Merge into a single classification

**Recommendation**: Option A. `origin` drives precedence logic. `behavior` drives UI affordances (e.g., "Collected" values show edit buttons). They answer different questions.

> USER: B, i don't wnat MetricBehavior, instead mergethose into FragmentOrigin

### Q5: Should `RuntimeSpan` also implement `IFragmentSource`?

**Yes.** `RuntimeSpan` has the same 2D fragment storage pattern as `RuntimeBlock`. It implements `IFragmentSource` directly (it has no memory system, just static fragment arrays). This eliminates the runtime span adapter entirely — no adapter, no `IDisplayItem`, just `IFragmentSource`.

### Q6: Per-round fragment resolution?

The internal/public memory split solves this naturally:

- Internal groups (`fragment:group:0`, `fragment:group:1`, ...) map to per-round data
- `DisplayFragmentMemory.resolve()` can read `RoundMemory.current` to select the appropriate group
- `FragmentFilter.round` can be added to scope queries to specific groups

**Default behavior**: Aggregate all groups (backward compatible). 
**Future**: `DisplayFragmentMemory` reads current round and selects the matching internal group.

### Q7: How does `DisplayFragmentMemory` stay in sync?

`DisplayFragmentMemory.bind()` subscribes to all internal fragment groups and other memory entries (timer, round). When any source updates, `resolve()` re-aggregates and notifies UI subscribers. This piggybacks on the existing `BaseMemoryEntry.subscribe()` mechanism — no new reactivity system needed.

### Q8: Should `DisplayFragmentMemory` be lazy or eager?

Options:
- **Eager**: `resolve()` on every source change (simple, always up-to-date)
- **Lazy**: Mark dirty on change, resolve on `getDisplayFragments()` access

**Recommendation**: Eager for now. Fragment resolution is cheap (small arrays, simple grouping). If profiling shows overhead, switch to lazy.

---

## Appendix: Source Document Comparison

This unified document was consolidated from two independent proposals. For reference, the delta between them:

| Aspect | Gemini Proposal | Opus Proposal | Unified Decision |
|--------|-----------------|---------------|------------------|
| Interface name | `IFragmentProvider` | `IFragmentSource` | `IFragmentSource` (avoids React Provider confusion) |
| Core methods | `getDisplayFragments()`, `getAllFragments()`, `getFragment()`, `hasFragment()` | Same + `getAllFragmentsByType()`, `rawFragments`, `FragmentFilter` | Full Opus API surface |
| Precedence tiers | 4-tier (user > runtime > compiler > parser) | Same + supplemental origin mapping | 4-tier with supplemental mapping |
| Per-type precedence table | Detailed (Timer/Reps/Text/Distance) | Not present | Included from Gemini |
| Multi-fragment algorithm | Mentioned conceptually | Explicit algorithm with scenario table | Full algorithm with scenarios |
| Bug identification | Not addressed | `BlockBuilder` 8th-arg bug, `OutputStatement.findFragment` type mismatch | Both bugs documented |
| As-Is architecture depth | Brief problem statement | Deep analysis with storage shape diagrams, adapter pipeline | Full Opus analysis |
| Before/After UI comparison | Clean side-by-side pseudo-code | More granular component-level | Both included |
| Migration plan | 5-step outline | 5-phase plan with per-file risk | Phased plan with risks |
| Adapter simplification | Mentioned | Concrete `fragmentSourceToDisplayItem()` | Concrete implementation |
| Open questions | None | 6 important questions | All 6 included |

---

*Consolidated 2026-02-09*
