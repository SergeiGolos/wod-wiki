# Plan: Fragment-Based Memory Migration

## Status: PLANNING
## Created: 2026-02-10
## Revised: 2026-02-10 — Query-based facade approach

---

## Goal

Unify the block memory system around a single `FragmentGroupStore` while **standardizing
fragment queries** to return grouped results. The existing `MemoryType` keys remain
**query selectors** against the store for state, and `IFragmentSource` becomes the
single API for fragment lookup across plan → track → review.

**Key changes**:
1. `IFragmentSource` methods return `ICodeFragment[][]` (groups) for all query results.
2. `ICodeFragment.visibility` is the filtering mechanism for query results.
3. No backward compatibility — all callers migrate to grouped APIs.

### What Changes vs. What Stays

| Aspect | Status |
|--------|--------|
| `ctx.getMemory('timer')` call sites | **No change** — same API, same types |
| `ctx.setMemory('timer', value)` call sites | **No change** — same API, same types |
| `block.getMemory('timer')?.subscribe()` in hooks | **No change** — returns `IMemoryEntry` with `subscribe()` |
| `MemoryType` union + `MemoryTypeMap` | **No change** — same type keys, same value shapes |
| `Map<MemoryType, IMemoryEntry>` inside RuntimeBlock | **Replaced** by `FragmentGroupStore` |
| `FragmentMemory` + `DisplayFragmentMemory` classes | **Deleted** — store handles both |
| `SimpleMemoryEntry` + `BaseMemoryEntry` classes | **Deleted** — replaced by `FragmentGroupEntry` adapter |
| `BlockBuilder.build()` fragment allocation | **Simplified** — single store, no dual allocation |
| `SegmentOutputBehavior.getFragments()` duck-typing | **Fixed** — clean query path |
| `as any` casts on `'fragment:display'` | **Eliminated** — typed query returns correct shape |
| `IFragmentSource` query results | **Changed** — always return `ICodeFragment[][]` |
| Fragment visibility filtering | **Added** — visibility filter supported in all queries |

---

## Core Concepts

### A. Three Layers

```
┌─────────────────────────────────────────────────────────┐
│  COMPILER (build-time)                                  │
│  ─────────────────────                                  │
│  Receives fragments from parser / parent statements.    │
│  Stores as ICodeFragment[][] in FragmentGroupStore.     │
│  Applies cascade: copies parent's cascade-marked groups │
│  into child blocks at compile-time.                     │
└──────────────────────────┬──────────────────────────────┘
                           │ mount()
┌──────────────────────────▼──────────────────────────────┐
│  BEHAVIORS (runtime)                                    │
│  ────────────────────                                   │
│  ctx.getMemory('timer') → queries store for 'timer'    │
│  ctx.setMemory('timer', v) → upserts 'timer' group    │
│  Same API, fragment store underneath.                   │
└──────────────────────────┬──────────────────────────────┘
                           │ subscribe()
┌──────────────────────────▼──────────────────────────────┐
│  UI (rendering)                                         │
│  ──────────────                                         │
│  block.getMemory('timer')?.subscribe(cb) — unchanged   │
│  block.getMemory('fragment:display') → public groups   │
│  Returns IMemoryEntry with proper subscribe() support. │
└─────────────────────────────────────────────────────────┘
```

### B. Visibility Semantics

| Visibility  | Who sees it?                                     | Example                                    |
| ----------- | ------------------------------------------------ | ------------------------------------------ |
| `private`   | Only behaviors on **this** block via getMemory   | Timer spans, round counters                |
| `public`    | UI + output + behaviors via getMemory            | Display fragments ("Thrusters", "21 reps") |
| `cascade`   | Compiler copies into **children** at build-time  | Rep scheme (21-15-9 pushed to children)    |

> **`cascade` is NOT runtime inheritance.** The compiler resolves it at build-time.
> Visibility is applied per fragment via `ICodeFragment.visibility` for query filtering.

### C. MemoryType → Fragment Group Query Mapping

Each `MemoryType` key becomes a **query selector** against the `FragmentGroupStore`.
The store internally maps each key to a fragment group with a visibility and a typed value.

| MemoryType Key       | Fragment Group ID | Value Shape          | Visibility  | Query Behavior                             |
| -------------------- | ----------------- | -------------------- | ----------- | ------------------------------------------ |
| `'timer'`            | `'timer'`         | `TimerState`         | `private`   | Returns group value directly               |
| `'round'`            | `'round'`         | `RoundState`         | `private`   | Returns group value directly               |
| `'display'`          | `'display'`       | `DisplayState`       | `public`    | Returns group value directly               |
| `'controls'`         | `'controls'`      | `ButtonsState`       | `public`    | Returns group value directly               |
| `'fragment'`         | — (virtual) —     | `FragmentState`      | —           | **Computed**: aggregates all groups' raw fragments as `{ groups }` |
| `'fragment:display'` | — (virtual) —     | `FragmentDisplayState` | —         | **Computed**: aggregates all public groups, applies precedence resolution |
| `'completion'`       | — (removed) —     | —                    | —           | Use `block.isComplete` + `markComplete()` instead |

**Virtual queries** (`'fragment'` and `'fragment:display'`) don't map to a single group —
they aggregate across groups. This replaces the `FragmentMemory` → `DisplayFragmentMemory`
subscription chain with a single computed view.

---

## Data Model Changes

### Step 1: Add Visibility to ICodeFragment

**File:** `src/core/models/CodeFragment.ts` (Update)

```typescript
// NEW — visibility for memory propagation + query filtering
export type FragmentVisibility = 'private' | 'public' | 'cascade';

export interface ICodeFragment {
  // ...existing fields...
  readonly visibility?: FragmentVisibility;
}
```

Visibility now lives on each fragment so query filtering can be applied without
dependence on storage grouping.

### Step 1b: Standardize IFragmentSource (Grouped Results)

**File:** `src/core/contracts/IFragmentSource.ts` (Update)

All query methods return grouped results (`ICodeFragment[][]`). A single statement
returns `[ICodeFragment[]]`, and multiple statements return one group per statement.
Visibility filtering is built into the query surface.

```typescript
export interface FragmentFilter {
  /** Optional visibility filter applied to fragments */
  readonly visibility?: FragmentVisibility;
}

export interface IFragmentSource {
  /** Unique id for this source (statement id, block key, output id) */
  readonly id: string | number;

  /** Display fragments grouped by statement or group */
  getDisplayFragments(filter?: FragmentFilter): ICodeFragment[][];

  /** First matching fragment of a type (search across groups) */
  getFragment(type: FragmentType, filter?: FragmentFilter): ICodeFragment | undefined;

  /** All fragments of a type, grouped by source group */
  getAllFragmentsByType(type: FragmentType, filter?: FragmentFilter): ICodeFragment[][];

  /** Whether any fragment of a type exists (with optional filter) */
  hasFragment(type: FragmentType, filter?: FragmentFilter): boolean;

  /** Raw grouped fragments (no precedence applied) */
  readonly rawFragments: ICodeFragment[][];
}
```

**Implementations to update (no backward compatibility):**
- `CodeStatement` (parser output)
- `OutputStatement` (review output)
- `FragmentDisplayView` (runtime)
- `SimpleFragmentSource`

### Step 2: FragmentGroupStore — Unified Storage

**File:** `src/runtime/memory/FragmentGroupStore.ts` (New)

```typescript
import { FragmentVisibility } from '../../core/models/CodeFragment';

/**
 * A typed fragment group stored in the block's memory.
 * The `value` field holds the domain-specific state (TimerState, RoundState, etc.)
 * The `fragments` field holds ICodeFragment[] for workout-semantic data.
 */
export interface FragmentGroup<V = unknown> {
  readonly id: string;
  readonly value: V;
  readonly visibility: FragmentVisibility;
}

type GroupListener<V> = (newValue: V | undefined, oldValue: V | undefined) => void;

/**
 * Unified store for all block state.
 *
 * Each MemoryType key maps to a named group.
 * The store supports per-group subscriptions (for IMemoryEntry compatibility)
 * and whole-store subscriptions (for aggregated views).
 */
export class FragmentGroupStore {
  private _groups = new Map<string, FragmentGroup>();
  private _listeners = new Map<string, Set<GroupListener<any>>>();
  private _globalListeners = new Set<() => void>();

  // ── Queries ──

  /** Get a group by id, returning its value */
  get<V>(id: string): V | undefined {
    return this._groups.get(id)?.value as V | undefined;
  }

  /** Get a group entry (id, value, visibility) */
  getGroup(id: string): FragmentGroup | undefined {
    return this._groups.get(id);
  }

  /** Check if a group exists */
  has(id: string): boolean {
    return this._groups.has(id);
  }

  /** All group ids */
  keys(): string[] {
    return Array.from(this._groups.keys());
  }

  /** All groups */
  all(): FragmentGroup[] {
    return Array.from(this._groups.values());
  }

  /** Only groups with public visibility */
  public(): FragmentGroup[] {
    return this.all().filter(g => g.visibility === 'public');
  }

  // ── Mutations ──

  /** Upsert a group by id. Notifies per-group and global listeners. */
  upsert<V>(id: string, value: V, visibility: FragmentVisibility = 'public'): void {
    const oldGroup = this._groups.get(id);
    const oldValue = oldGroup?.value as V | undefined;
    const group: FragmentGroup<V> = { id, value, visibility };
    this._groups.set(id, group);
    this.notifyGroup(id, value, oldValue);
    this.notifyGlobal();
  }

  /** Remove a group by id. Notifies listeners with undefined. */
  remove(id: string): void {
    const old = this._groups.get(id);
    if (old) {
      this._groups.delete(id);
      this.notifyGroup(id, undefined, old.value);
      this.notifyGlobal();
    }
  }

  /** Clear all groups. */
  clear(): void {
    const entries = Array.from(this._groups.entries());
    this._groups.clear();
    for (const [id, group] of entries) {
      this.notifyGroup(id, undefined, group.value);
    }
    this.notifyGlobal();
  }

  // ── Subscriptions ──

  /** Subscribe to changes on a specific group (IMemoryEntry compatibility) */
  subscribeGroup<V>(id: string, listener: GroupListener<V>): () => void {
    if (!this._listeners.has(id)) {
      this._listeners.set(id, new Set());
    }
    this._listeners.get(id)!.add(listener);
    return () => this._listeners.get(id)?.delete(listener);
  }

  /** Subscribe to any change across the store */
  subscribe(listener: () => void): () => void {
    this._globalListeners.add(listener);
    return () => this._globalListeners.delete(listener);
  }

  // ── Disposal ──

  dispose(): void {
    this.clear();
    this._listeners.clear();
    this._globalListeners.clear();
  }

  // ── Internals ──

  private notifyGroup<V>(id: string, newValue: V | undefined, oldValue: V | undefined): void {
    const listeners = this._listeners.get(id);
    if (listeners) {
      for (const l of listeners) l(newValue, oldValue);
    }
  }

  private notifyGlobal(): void {
    for (const l of this._globalListeners) l();
  }
}
```

### Step 3: FragmentGroupEntry — IMemoryEntry Adapter

**File:** `src/runtime/memory/FragmentGroupEntry.ts` (New)

This adapter wraps a single group in the store to implement `IMemoryEntry<T, V>`.
Hooks that call `block.getMemory('timer')?.subscribe(cb)` get one of these.

```typescript
import { IMemoryEntry } from './IMemoryEntry';
import { FragmentGroupStore } from './FragmentGroupStore';

/**
 * Adapts a single FragmentGroupStore group to the IMemoryEntry interface.
 *
 * This is the bridge that lets existing code call:
 *   block.getMemory('timer')?.value      → reads from store
 *   block.getMemory('timer')?.subscribe  → subscribes to store group
 *
 * Not instantiated eagerly — created on demand by RuntimeBlock.getMemory().
 */
export class FragmentGroupEntry<T extends string, V> implements IMemoryEntry<T, V> {
  constructor(
    readonly type: T,
    private readonly store: FragmentGroupStore,
    private readonly groupId: string
  ) {}

  get value(): V {
    return this.store.get<V>(this.groupId) as V;
  }

  subscribe(listener: (newValue: V | undefined, oldValue: V | undefined) => void): () => void {
    return this.store.subscribeGroup<V>(this.groupId, listener);
  }
}
```

### Step 4: Virtual Queries for `'fragment'` and `'fragment:display'`

**File:** `src/runtime/memory/FragmentDisplayView.ts` (New)

For `getMemory('fragment:display')`, we return a computed view that aggregates
fragment groups into **grouped results** and applies precedence resolution
**per group**. This view implements the new grouped `IFragmentSource` API and
supports visibility filtering via `ICodeFragment.visibility`.

```typescript
import { IMemoryEntry } from './IMemoryEntry';
import { FragmentGroupStore } from './FragmentGroupStore';
import { FragmentDisplayState, FragmentState } from './MemoryTypes';
import { IFragmentSource, FragmentFilter } from '../../core/contracts/IFragmentSource';
import { FragmentType, ICodeFragment } from '../../core/models/CodeFragment';
import { resolveFragmentPrecedence, ORIGIN_PRECEDENCE } from '../../core/utils/fragmentPrecedence';

/**
 * Computed view over the FragmentGroupStore that provides:
 * - IMemoryEntry<'fragment:display', FragmentDisplayState> — for getMemory() compatibility
 * - IFragmentSource — grouped query API with visibility filtering
 */
export class FragmentDisplayView
  implements IMemoryEntry<'fragment:display', FragmentDisplayState>, IFragmentSource
{
  readonly type = 'fragment:display' as const;
  private _cachedValue: FragmentDisplayState | null = null;
  private _storeUnsubscribe?: () => void;

  constructor(
    private readonly sourceId: string | number,
    private readonly store: FragmentGroupStore,
    private readonly fragmentGroupIds: string[] = []
  ) {
    this._storeUnsubscribe = store.subscribe(() => {
      this._cachedValue = null;
    });
  }

  // ── IMemoryEntry ──

  get value(): FragmentDisplayState {
    if (!this._cachedValue) {
      this._cachedValue = this.compute();
    }
    return this._cachedValue;
  }

  subscribe(listener: (nv: FragmentDisplayState | undefined, ov: FragmentDisplayState | undefined) => void): () => void {
    return this.store.subscribe(() => {
      const old = this._cachedValue;
      this._cachedValue = null;
      listener(this.value, old ?? undefined);
    });
  }

  // ── IFragmentSource (grouped) ──

  get id(): string | number { return this.sourceId; }

  getDisplayFragments(filter?: FragmentFilter): ICodeFragment[][] {
    return this.getDisplayGroups(filter);
  }

  getFragment(type: FragmentType, filter?: FragmentFilter): ICodeFragment | undefined {
    const groups = this.getAllFragmentsByType(type, filter);
    const flattened = groups.flat();
    return flattened.length > 0 ? flattened[0] : undefined;
  }

  getAllFragmentsByType(type: FragmentType, filter?: FragmentFilter): ICodeFragment[][] {
    const groups = this.getDisplayGroups(filter);
    return groups.map(group => {
      const ofType = group.filter(f => f.fragmentType === type);
      return [...ofType].sort((a, b) => {
        const rankA = ORIGIN_PRECEDENCE[a.origin ?? 'parser'] ?? 3;
        const rankB = ORIGIN_PRECEDENCE[b.origin ?? 'parser'] ?? 3;
        return rankA - rankB;
      });
    }).filter(group => group.length > 0);
  }

  hasFragment(type: FragmentType, filter?: FragmentFilter): boolean {
    return this.getAllFragmentsByType(type, filter).length > 0;
  }

  get rawFragments(): ICodeFragment[][] { return this.getDisplayGroups(); }

  // ── Internals ──

  private compute(): FragmentDisplayState {
    const groups = this.computeGroups();
    const resolvedGroups = groups.map(group => resolveFragmentPrecedence(group));
    return { fragments: groups.flat(), resolved: resolvedGroups.flat() };
  }

  private computeGroups(): ICodeFragment[][] {
    const groups: ICodeFragment[][] = [];
    for (const gid of this.fragmentGroupIds) {
      const group = this.store.getGroup(gid);
      if (group && Array.isArray(group.value)) {
        groups.push([...(group.value as ICodeFragment[])]);
      }
    }
    return groups;
  }

  private getDisplayGroups(filter?: FragmentFilter): ICodeFragment[][] {
    const groups = this.computeGroups();
    if (!filter) return groups;
    return groups
      .map(group => group.filter(f => this.matchesFilter(f, filter)))
      .filter(group => group.length > 0);
  }

  private matchesFilter(fragment: ICodeFragment, filter: FragmentFilter): boolean {
    if (filter.visibility && fragment.visibility && fragment.visibility !== filter.visibility) {
      return false;
    }
    if (filter.visibility && !fragment.visibility && filter.visibility !== 'public') {
      return false;
    }
    return true;
  }

  dispose(): void {
    this._storeUnsubscribe?.();
  }
}

/**
 * Computed view for getMemory('fragment') — returns raw fragment groups.
 */
export class FragmentStateView implements IMemoryEntry<'fragment', FragmentState> {
  readonly type = 'fragment' as const;

  constructor(
    private readonly store: FragmentGroupStore,
    private readonly fragmentGroupIds: string[] = []
  ) {}

  get value(): FragmentState {
    const groups: ICodeFragment[][] = [];
    for (const gid of this.fragmentGroupIds) {
      const group = this.store.getGroup(gid);
      if (group && Array.isArray(group.value)) {
        groups.push(group.value as ICodeFragment[]);
      }
    }
    return { groups };
  }

  subscribe(listener: (nv: FragmentState | undefined, ov: FragmentState | undefined) => void): () => void {
    return this.store.subscribe(() => {
      listener(this.value, undefined);
    });
  }
}
```

### Step 5: Refactor RuntimeBlock — Swap Storage, Keep API

**File:** `src/runtime/RuntimeBlock.ts`

```typescript
// BEFORE — rigid memory map
class RuntimeBlock {
  private _memoryEntries: Map<MemoryType, IMemoryEntry<MemoryType, any>> = new Map();

  getMemory<T extends MemoryType>(type: T): IMemoryEntry<T, MemoryValueOf<T>> | undefined {
    return this._memoryEntries.get(type) as IMemoryEntry<T, MemoryValueOf<T>> | undefined;
  }

  setMemoryValue<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void {
    const existing = this._memoryEntries.get(type);
    if (existing && typeof (existing as any).update === 'function') {
      (existing as any).update(value);
    } else {
      this._memoryEntries.set(type, new SimpleMemoryEntry(type, value));
    }
  }
}

// AFTER — FragmentGroupStore behind the same API
class RuntimeBlock {
  /** Unified storage for all block state */
  private readonly _store: FragmentGroupStore;

  /** IDs of groups that hold ICodeFragment[] data (from parser/compiler) */
  private readonly _fragmentGroupIds: string[];

  /** Cached virtual views (created on first access) */
  private _displayView?: FragmentDisplayView;
  private _fragmentView?: FragmentStateView;

  constructor(
    runtime, sourceIds, behaviors, context, key, blockType, label,
    initialFragments?: ICodeFragment[][]      // NEW param from BlockBuilder
  ) {
    this._store = new FragmentGroupStore();
    this._fragmentGroupIds = [];

    // Seed the store with parser/compiler fragment groups
    if (initialFragments) {
      for (let i = 0; i < initialFragments.length; i++) {
        const gid = `frag-${i}`;
        this._store.upsert(gid, initialFragments[i], 'public');
        this._fragmentGroupIds.push(gid);
      }
    }
  }

  // ── getMemory — SAME SIGNATURE, routes to store ──

  getMemory<T extends MemoryType>(type: T): IMemoryEntry<T, MemoryValueOf<T>> | undefined {
    // Virtual queries (computed views over the store)
    if (type === 'fragment:display') {
      return this.getDisplayView() as unknown as IMemoryEntry<T, MemoryValueOf<T>>;
    }
    if (type === 'fragment') {
      return this.getFragmentView() as unknown as IMemoryEntry<T, MemoryValueOf<T>>;
    }

    // Direct group lookup
    if (!this._store.has(type)) return undefined;
    return new FragmentGroupEntry<T, MemoryValueOf<T>>(type, this._store, type);
  }

  hasMemory(type: MemoryType): boolean {
    if (type === 'fragment:display' || type === 'fragment') {
      return this._fragmentGroupIds.length > 0;
    }
    return this._store.has(type);
  }

  // ── setMemoryValue — SAME SIGNATURE, routes to store ──

  setMemoryValue<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void {
    const visibility = MEMORY_VISIBILITY[type] ?? 'private';
    this._store.upsert(type, value, visibility);
  }

  // ── allocateMemory — kept for backward compat during transition ──
  // Strategies that call allocateMemory('fragment', new FragmentMemory(...))
  // will be migrated to pass fragments through the constructor.
  // During transition, this extracts the value and stores it.
  allocateMemory<T extends MemoryType>(type: T, entry: IMemoryEntry<T, MemoryValueOf<T>>): void {
    this.setMemoryValue(type, entry.value);
  }

  getMemoryTypes(): MemoryType[] {
    const types = this._store.keys() as MemoryType[];
    if (this._fragmentGroupIds.length > 0) {
      if (!types.includes('fragment')) types.push('fragment');
      if (!types.includes('fragment:display')) types.push('fragment:display');
    }
    return types;
  }

  // ── Internals ──

  private getDisplayView(): FragmentDisplayView {
    if (!this._displayView) {
      this._displayView = new FragmentDisplayView(
        this.key.toString(),
        this._store,
        this._fragmentGroupIds
      );
    }
    return this._displayView;
  }

  private getFragmentView(): FragmentStateView {
    if (!this._fragmentView) {
      this._fragmentView = new FragmentStateView(this._store, this._fragmentGroupIds);
    }
    return this._fragmentView;
  }
}

/** Default visibility by memory type */
const MEMORY_VISIBILITY: Partial<Record<MemoryType, FragmentVisibility>> = {
  timer:   'private',
  round:   'private',
  display: 'public',
  controls: 'public',
};
```

---

## What Behaviors DON'T Need To Change

Because `getMemory` / `setMemory` signatures are preserved, **no behavior call site changes**.
Here's the proof — these all work unchanged:

### TimerInitBehavior (unchanged)

```typescript
// This code stays EXACTLY as-is
onMount(ctx: IBehaviorContext): IRuntimeAction[] {
  ctx.setMemory('timer', {
    direction: this.config.direction,
    durationMs: this.config.durationMs,
    spans: [new TimeSpan(now)],
    label: this.config.label ?? ctx.block.label,
    role: this.config.role
  });
  return [];
}
// Under the hood: store.upsert('timer', value, 'private')
```

### RoundAdvanceBehavior (unchanged)

```typescript
// This code stays EXACTLY as-is
onNext(ctx: IBehaviorContext): IRuntimeAction[] {
  const round = ctx.getMemory('round') as RoundState | undefined;
  if (!round) return [];
  ctx.setMemory('round', { current: round.current + 1, total: round.total });
  return [];
}
// Under the hood: store.get<RoundState>('round') → store.upsert('round', newValue, 'private')
```

### TimerCompletionBehavior (unchanged)

```typescript
// This code stays EXACTLY as-is
const timer = ctx.getMemory('timer') as TimerState | undefined;
if (!timer) return [];
const elapsed = calculateElapsed(timer, now);
if (elapsed >= timer.durationMs!) {
  ctx.markComplete('timer-expired');
}
// Under the hood: store.get<TimerState>('timer')
```

### ButtonBehavior (unchanged)

```typescript
// This code stays EXACTLY as-is
ctx.setMemory('controls', { buttons: [...] });
// Under the hood: store.upsert('controls', { buttons }, 'public')
```

---

## What DOES Change

### 1. SegmentOutputBehavior — fix the duck-typing

```typescript
// BEFORE — `as any` casts + duck-typing
private getFragments(ctx: IBehaviorContext): ICodeFragment[] {
  const displayMem = ctx.getMemory('fragment:display' as any);
  if (displayMem && 'getDisplayFragments' in displayMem) {
    return (displayMem as any).getDisplayFragments();
  }
  const fragmentMem = ctx.getMemory('fragment' as any);
  return (fragmentMem as any)?.value?.groups?.flat() ?? [];
}

// AFTER — clean typed query
private getFragments(ctx: IBehaviorContext): ICodeFragment[] {
  const displayState = ctx.getMemory('fragment:display');
  return displayState?.resolved ? [...displayState.resolved] : [];
}
```

### 2. TimerOutputBehavior — fix fragment:display access

```typescript
// BEFORE — `as any` cast
const displayMem = ctx.getMemory('fragment:display') as any;
const sourceFragments = displayMem?.resolved ? [...displayMem.resolved] : [];

// AFTER — typed access (FragmentDisplayState has `resolved`)
const displayState = ctx.getMemory('fragment:display');
const sourceFragments = displayState?.resolved ? [...displayState.resolved] : [];
```

### 3. BlockBuilder.build() — simplified

```typescript
// BEFORE — dual allocation
build(): IRuntimeBlock {
  const block = new RuntimeBlock(this.runtime, this.sourceIds, ...);

  if (this.fragments && this.fragments.length > 0) {
    const fragmentMemory = new FragmentMemory(this.fragments);
    block.allocateMemory('fragment', fragmentMemory);
    const displayMemory = new DisplayFragmentMemory(block.key.toString(), fragmentMemory);
    block.allocateMemory('fragment:display', displayMemory);
  }

  return block;
}

// AFTER — pass fragments to constructor, store handles everything
build(): IRuntimeBlock {
  const block = new RuntimeBlock(
    this.runtime,
    this.sourceIds,
    Array.from(this.behaviors.values()),
    this.context,
    this.key,
    this.blockType,
    this.label,
    this.fragments   // NEW: ICodeFragment[][] passed directly
  );

  return block;
}
```

### 4. BehaviorContext.emitOutput() — remove auto-population complexity

```typescript
// BEFORE — magic fallback reads from fragment:display
emitOutput(type, fragments, options): void {
  let effectiveFragments = fragments;
  if (effectiveFragments.length === 0) {
    const displayMem = this.getMemory('fragment:display') as any;
    if (displayMem && displayMem.resolved.length > 0) {
      effectiveFragments = [...displayMem.resolved];
    }
  }
  // ...
}

// AFTER — explicit, no magic
emitOutput(type, fragments, options): void {
  // If caller passes empty fragments, use display fragments explicitly
  let effectiveFragments = fragments;
  if (effectiveFragments.length === 0) {
    const displayState = this.getMemory('fragment:display');
    if (displayState && displayState.resolved.length > 0) {
      effectiveFragments = [...displayState.resolved];
    }
  }
  // ... (same logic, but now typed — no `as any` needed)
}
```

---

## Compiler: Cascade Resolution

Cascade is a compile-time concept. The compiler copies `cascade`-visibility groups
from parent → children during `BlockBuilder.build()`. This does NOT happen at runtime.

```typescript
// In BlockBuilder — NEW method
private applyCascadeFragments(childFragments: ICodeFragment[][]): ICodeFragment[][] {
  if (!this.parentBlock) return childFragments;

  // Query parent's store for cascade-visibility fragment groups
  const parentStore = (this.parentBlock as RuntimeBlock)._store; // or through a public accessor
  const cascadeGroups = parentStore.all()
    .filter(g => g.visibility === 'cascade')
    .map(g => g.value as ICodeFragment[]);

  if (cascadeGroups.length === 0) return childFragments;
  return [...cascadeGroups, ...childFragments];
}
```

---

## UI: Hooks Update for Grouped Results

### useBlockMemory (unchanged)

```typescript
// This hook already works by calling block.getMemory(type)?.subscribe()
// Since our new store returns IMemoryEntry-compatible objects, no changes needed.
function useBlockMemory<T extends MemoryType>(block: IRuntimeBlock | undefined, type: T) {
  const entry = block?.getMemory(type);           // → FragmentGroupEntry or virtual view
  const [value, setValue] = useState(entry?.value);

  useEffect(() => {
    if (!entry) return;
    setValue(entry.value);
    return entry.subscribe((nv) => setValue(nv));  // → store.subscribeGroup() or store.subscribe()
  }, [entry]);

  return value;
}
```

### useFragmentSource — eliminates the cast

```typescript
// BEFORE — unsafe cast
function useFragmentSource(block: IRuntimeBlock | undefined): IFragmentSource | undefined {
  const entry = block?.getMemory('fragment:display');
  return entry as unknown as IFragmentSource;
}

// AFTER — the FragmentDisplayView already implements IFragmentSource
function useFragmentSource(block: IRuntimeBlock | undefined): IFragmentSource | undefined {
  const entry = block?.getMemory('fragment:display');
  return entry as IFragmentSource;  // FragmentDisplayView implements both interfaces
}
```

All UI consumers of `IFragmentSource` must now handle grouped results
(`ICodeFragment[][]`) rather than flat arrays.

---

## Test Migration

### Behavior tests — MINIMAL changes

Most behavior tests mock `ctx.getMemory` / `ctx.setMemory` as simple functions.
Since the API signatures don't change, **most test mocks work unchanged**:

```typescript
// BEFORE — works
const memoryStore = new Map();
const ctx = {
  getMemory: vi.fn((type: string) => memoryStore.get(type)),
  setMemory: vi.fn((type: string, value: any) => memoryStore.set(type, value)),
  block: { key: { toString: () => 'test-key' } }
} as unknown as IBehaviorContext;

memoryStore.set('timer', { spans: [], direction: 'up', label: 'Test' });

// AFTER — SAME. No change needed.
// The behaviors call ctx.getMemory('timer') which hits the mock.
// The tests assert on ctx.setMemory calls which hit the mock.
// The mock doesn't care what storage is underneath.
```

### Tests that need updating

Only tests that directly construct `FragmentMemory` or `DisplayFragmentMemory`:

```typescript
// BEFORE
const fragmentMemory = new FragmentMemory([[timerFrag, actionFrag]]);
block.allocateMemory('fragment', fragmentMemory);
const displayMemory = new DisplayFragmentMemory(blockKey, fragmentMemory);
block.allocateMemory('fragment:display', displayMemory);

// AFTER — pass to constructor or use setMemoryValue
const block = new RuntimeBlock(runtime, [], behaviors, ctx, key, 'Timer', 'Test', [
  [timerFrag, actionFrag]   // initialFragments
]);
// Or for tests that need to add fragments after construction:
// block.setMemoryValue('fragment' as any, { groups: [[timerFrag, actionFrag]] });
```

---

## Execution Checklist

### Phase 1: Foundation (no behavior changes)

#### Create (new files)
- [ ] `src/runtime/memory/FragmentGroupStore.ts` — unified store
- [ ] `src/runtime/memory/FragmentGroupEntry.ts` — IMemoryEntry adapter
- [ ] `src/runtime/memory/FragmentDisplayView.ts` — virtual views for `'fragment'` / `'fragment:display'`
- [ ] `src/runtime/memory/__tests__/FragmentGroupStore.test.ts`
- [ ] `src/runtime/memory/__tests__/FragmentGroupEntry.test.ts`
- [ ] `src/core/models/FragmentVisibility.ts` — `FragmentVisibility` type

#### Update (core — swap storage behind stable API)
- [ ] `src/runtime/RuntimeBlock.ts` — replace `Map<MemoryType, IMemoryEntry>` with `FragmentGroupStore` + query routing in `getMemory`/`setMemoryValue`
- [ ] `src/runtime/compiler/BlockBuilder.ts` — pass `initialFragments` to RuntimeBlock constructor; remove `FragmentMemory` + `DisplayFragmentMemory` allocation
- [ ] `src/core/contracts/IFragmentSource.ts` — grouped query API + visibility filter
- [ ] `src/core/models/CodeStatement.ts` — return grouped fragments from IFragmentSource
- [ ] `src/core/models/OutputStatement.ts` — return grouped fragments from IFragmentSource
- [ ] `src/core/models/SimpleFragmentSource.ts` — return grouped fragments from IFragmentSource

#### Verify: All fragment query call sites updated for grouped results

### Phase 2: Fix Duck-Typing + Grouped Consumers

- [ ] `src/runtime/behaviors/SegmentOutputBehavior.ts` — replace `as any` duck-typing with typed `ctx.getMemory('fragment:display').resolved`
- [ ] `src/runtime/behaviors/TimerOutputBehavior.ts` — replace `as any` cast with typed access
- [ ] `src/runtime/BehaviorContext.ts` — remove `as any` in `emitOutput()` auto-population
- [ ] `src/runtime/hooks/useStackDisplay.ts` — remove `as unknown as IFragmentSource` cast (FragmentDisplayView implements it)
- [ ] `src/runtime/hooks/useBlockMemory.ts` — remove `as unknown as IFragmentSource` cast in `useFragmentSource`
- [ ] UI components consuming `IFragmentSource` — update to handle `ICodeFragment[][]`

### Phase 3: Cleanup (delete dead code)

- [ ] Delete `src/runtime/memory/FragmentMemory.ts`
- [ ] Delete `src/runtime/memory/DisplayFragmentMemory.ts`
- [ ] Delete `src/runtime/memory/SimpleMemoryEntry.ts`
- [ ] Delete `src/runtime/memory/BaseMemoryEntry.ts`
- [ ] Delete `src/runtime/memory/__tests__/DisplayFragmentMemory.test.ts`
- [ ] Delete `src/runtime/memory/__tests__/MemoryEntries.test.ts`
- [ ] Remove `'completion'` from `MemoryType` union (unused — completion uses `markComplete()`)
- [ ] Remove `PassthroughFragmentDistributor` — inline the trivial `[fragments]` wrapping

### Phase 4: Cascade (optional, future)

- [ ] Add `applyCascadeFragments()` to `BlockBuilder` for parent → child fragment inheritance
- [ ] Tag fragment groups with `'cascade'` visibility in strategies that produce inheritable metrics
- [ ] Update strategy files to set correct visibility on fragment groups

### NOT Changed (explicitly preserved)

| File | Why |
|------|-----|
| `IBehaviorContext.ts` | `getMemory`/`setMemory` signatures unchanged |
| `IRuntimeBlock.ts` | `getMemory`/`setMemoryValue`/`hasMemory`/`getMemoryTypes` signatures unchanged |
| `IMemoryEntry.ts` | Interface preserved — `FragmentGroupEntry` implements it |
| `MemoryTypes.ts` | `MemoryType` union, `MemoryTypeMap`, all state interfaces preserved |
| All 13+ behaviors using `getMemory('timer')` | API unchanged |
| All 7+ behaviors using `getMemory('round')` | API unchanged |
| `DisplayInitBehavior.ts` | `setMemory('display', ...)` unchanged |
| `ButtonBehavior.ts` | `setMemory('controls', ...)` unchanged |
| `useBlockMemory.ts` hook | Subscribes via `IMemoryEntry.subscribe()` unchanged |
| `useTimerElapsed.ts` hook | Reads via `block.getMemory('timer')` unchanged |

### Test Updates (grouped results)

- [ ] `runtime/compiler/__tests__/BlockBuilderFragments.test.ts` — update to pass fragments via constructor instead of `allocateMemory`
- [ ] `runtime/__tests__/RuntimeBlockMemory.test.ts` — verify new store routing
- [ ] `runtime/hooks/__tests__/useFragmentSource.test.ts` — verify `FragmentDisplayView` as `IFragmentSource`
- [ ] Tests that construct `FragmentMemory` or `DisplayFragmentMemory` directly — use constructor / `setMemoryValue`

### Tests NOT Changed
- [ ] `runtime/behaviors/__tests__/AspectBehaviors.test.ts` — mocks `ctx.getMemory`/`ctx.setMemory`, API unchanged
- [ ] `runtime/behaviors/__tests__/RoundAdvanceBehavior.test.ts` — same
- [ ] `runtime/behaviors/__tests__/SegmentOutputBehavior.test.ts` — same (after Phase 2 fix)
- [ ] `runtime/behaviors/__tests__/RestBlockBehavior.test.ts` — same
- [ ] `runtime/behaviors/__tests__/ChildLoopBehavior.test.ts` — same
- [ ] All other behavior tests using `getMemory`/`setMemory` mocks

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| **Fragment query call sites** | No backward compatibility — all `IFragmentSource` consumers must update to grouped results. |
| **Virtual view (`fragment:display`) reactivity** | `FragmentDisplayView` subscribes to global store changes, invalidates cache. Same subscription pattern as `DisplayFragmentMemory`. |
| **`FragmentGroupEntry` created on every `getMemory()` call** | Lightweight object (3 fields, delegates to store). Could cache per-type if profiling shows need. |
| **Test setup actions with ad-hoc keys (`'timer:state'`, `'loop:state'`)** | `FragmentGroupStore.upsert()` accepts any string key — these keep working via `setMemoryValue(key as any, value)`. |
| **`allocateMemory()` still called during transition** | Transition shim extracts `.value` from passed `IMemoryEntry` and upserts into store. |

---

## Summary

This approach achieves the architectural goal (unified fragment-based storage with visibility)
while **standardizing fragment queries** around grouped `ICodeFragment[][]` results. The
`getMemory`/`setMemory` API remains the state facade, and `IFragmentSource` becomes the
sole fragment query API with visibility filtering.

**No backward compatibility**: all `IFragmentSource` consumers migrate to grouped results.
