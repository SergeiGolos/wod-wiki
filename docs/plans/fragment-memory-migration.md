# Plan: Fragment-Based Memory Migration

## Status: PLANNING
## Created: 2026-02-10
## Revised: 2026-02-11 — List-based memory, ICodeFragment[] values, display-tag rendering

---

## Goal

Restructure RuntimeBlock memory from a `Map<MemoryType, IMemoryEntry>` to an **ordered list
of memory locations** where:

1. **Multiple entries of the same type** can coexist (push-based, not keyed).
2. **All memory values are `ICodeFragment[]`** — every memory type stores its state as fragments.
3. **Behaviors know the `ICodeFragment` structure** for their memory type (e.g., timer behavior knows it writes a timer fragment with specific fields).
4. **The UI scans the memory list for `fragment:display` entries** and renders each `ICodeFragment[]` as a row in the stack view, giving blocks a natural `ICodeFragment[][]` shape for display.

---

## Memory Type Overview

### Current Memory Types (Map-based)

| Type Key | Value Type | Behavior Owner | Purpose |
|----------|-----------|----------------|---------|
| `'timer'` | `TimerState` | `TimerInitBehavior`, `TimerTickBehavior`, `TimerPauseBehavior`, `TimerCompletionBehavior` | Time tracking with spans, direction, duration |
| `'round'` | `RoundState` | `RoundInitBehavior`, `RoundAdvanceBehavior` | Iteration counter (current/total) |
| `'fragment'` | `FragmentState` | — (set by `BlockBuilder`) | Raw parsed fragments as `ICodeFragment[][]` groups |
| `'fragment:display'` | `FragmentDisplayState` | — (set by `BlockBuilder`) | Precedence-resolved fragments for UI |
| `'completion'` | `CompletionState` | Various completion behaviors | Block completion tracking (isComplete, reason) |
| `'display'` | `DisplayState` | `DisplayInitBehavior`, `RoundDisplayBehavior` | UI labels, mode, round/action display |
| `'controls'` | `ButtonsState` | `ButtonBehavior` | UI button configurations |

### Problem with Current Design

```
RuntimeBlock._memoryEntries: Map<MemoryType, IMemoryEntry>
    ↓
    'timer'            → TimerState { spans, direction, durationMs, ... }
    'round'            → RoundState { current, total }
    'fragment'         → FragmentState { groups: ICodeFragment[][] }
    'fragment:display' → FragmentDisplayState { fragments, resolved }
    'completion'       → CompletionState { isComplete, reason }
    'display'          → DisplayState { mode, label, subtitle, ... }
    'controls'         → ButtonsState { buttons: ButtonConfig[] }
```

Issues:
- **Each type is a singleton** — only one timer, one round, one display per block.
- **Values are heterogeneous structs** — not a uniform contract, requiring type-specific hooks for each.
- **Fragment display is a separate concern** bolted on top of fragment storage.
- **UI must know each memory type's shape** to render anything useful.

---

## New Design: List-Based Memory with ICodeFragment[] Values

### Core Principle

> Every memory location stores `ICodeFragment[]` — fragments are the universal currency.
> Behaviors produce fragments. The UI consumes fragments. Memory is the list between them.

### Memory Location Structure

```typescript
/**
 * A single memory location in the block's memory list.
 * Multiple locations with the same tag can coexist.
 */
interface IMemoryLocation {
    /** Discriminator tag — same values as current MemoryType but not unique */
    readonly tag: MemoryTag;

    /** The fragment data stored at this location */
    readonly fragments: ICodeFragment[];

    /** Subscribe to changes at this location */
    subscribe(listener: (newValue: ICodeFragment[], oldValue: ICodeFragment[]) => void): () => void;
}

/**
 * Tags for memory locations. A block can have multiple locations with the same tag.
 */
type MemoryTag =
    | 'timer'           // Timer fragment(s): elapsed, duration, direction
    | 'round'           // Round fragment(s): current, total
    | 'completion'      // Completion fragment(s): isComplete, reason
    | 'display'         // Display control fragment(s): label, mode
    | 'controls'        // Button control fragment(s)
    | 'fragment:display' // Display-ready row of fragments for UI rendering
    ;
```

### Block Memory as a List

```typescript
/**
 * RuntimeBlock's memory is an ordered list of locations,
 * not a unique-keyed map.
 */
class RuntimeBlock {
    private _memory: IMemoryLocation[] = [];

    /** Push a new memory location onto the list */
    pushMemory(location: IMemoryLocation): void { ... }

    /** Get ALL locations with the given tag */
    getMemory(tag: MemoryTag): IMemoryLocation[] { ... }

    /** Get the FIRST location with the given tag (convenience) */
    getFirstMemory(tag: MemoryTag): IMemoryLocation | undefined { ... }

    /** Get ALL locations (for full inspection/debugging) */
    getAllMemory(): IMemoryLocation[] { ... }
}
```

### How Each Memory Type Maps to ICodeFragment[]

| Tag | ICodeFragment[] Contents | Fragment Types Used | Who Writes |
|-----|-------------------------|---------------------|------------|
| `'timer'` | `[{ fragmentType: 'timer', value: { spans, direction, durationMs }, image: '10:00' }]` | `FragmentType.Timer` | `TimerInitBehavior`, `TimerTickBehavior` |
| `'round'` | `[{ fragmentType: 'rounds', value: { current, total }, image: 'Round 2/5' }]` | `FragmentType.Rounds` | `RoundInitBehavior`, `RoundAdvanceBehavior` |
| `'completion'` | `[{ fragmentType: 'text', value: { isComplete, reason }, origin: 'runtime' }]` | `FragmentType.Text` | Completion behaviors |
| `'display'` | `[{ fragmentType: 'text', value: { mode, label }, image: 'AMRAP' }]` | `FragmentType.Text` | `DisplayInitBehavior` |
| `'controls'` | `[{ fragmentType: 'action', value: { buttons }, origin: 'runtime' }]` | `FragmentType.Action` | `ButtonBehavior` |
| `'fragment:display'` | `[timer_frag, action_frag, effort_frag, ...]` | Mixed — one row of display | `BlockBuilder`, behaviors |

### The Display Model: ICodeFragment[][] from Memory List

Each `'fragment:display'` memory location holds one `ICodeFragment[]` — a single display row.
A block with multiple `'fragment:display'` locations naturally forms `ICodeFragment[][]`:

```
Block Memory List:
  [0] tag: 'timer'            → [{ type: 'timer', value: {...}, image: '10:00' }]
  [1] tag: 'round'            → [{ type: 'rounds', value: {current:2, total:5} }]
  [2] tag: 'fragment:display'  → [timerFrag, effortFrag]        ← display row 1
  [3] tag: 'fragment:display'  → [repFrag, actionFrag]          ← display row 2
  [4] tag: 'fragment:display'  → [distanceFrag]                 ← display row 3
  [5] tag: 'controls'         → [{ type: 'action', value: {id, label, eventName} }]
```

The UI collects all `fragment:display` entries → `ICodeFragment[][]`:
```typescript
const displayRows: ICodeFragment[][] = block
    .getMemory('fragment:display')
    .map(loc => loc.fragments);
// → [[timerFrag, effortFrag], [repFrag, actionFrag], [distanceFrag]]
```

---

## Behavior Fragment Contracts

Each behavior knows exactly what `ICodeFragment` structure it produces for its memory tag.

### TimerBehavior Fragment Contract

```typescript
// TimerInitBehavior produces:
const timerFragment: ICodeFragment = {
    fragmentType: FragmentType.Timer,
    type: 'timer',
    image: '10:00',                    // formatted duration
    origin: 'runtime',
    value: {
        spans: [new TimeSpan(now)],
        direction: 'down',
        durationMs: 600000,
    },
    sourceBlockKey: block.key.toString(),
    timestamp: new Date(),
};

// Pushed to memory:
ctx.pushMemory('timer', [timerFragment]);
```

### RoundBehavior Fragment Contract

```typescript
const roundFragment: ICodeFragment = {
    fragmentType: FragmentType.Rounds,
    type: 'rounds',
    image: 'Round 2 / 5',
    origin: 'runtime',
    value: { current: 2, total: 5 },
    sourceBlockKey: block.key.toString(),
};

ctx.pushMemory('round', [roundFragment]);
```

### DisplayBehavior Fragment Contract

```typescript
// Display row — one fragment:display entry per statement line
const displayRow: ICodeFragment[] = [
    { fragmentType: FragmentType.Timer, type: 'timer', image: '10:00', origin: 'parser' },
    { fragmentType: FragmentType.Action, type: 'action', image: 'Run', origin: 'parser' },
    { fragmentType: FragmentType.Effort, type: 'effort', image: '@RPE8', origin: 'parser' },
];

ctx.pushMemory('fragment:display', displayRow);
```

### ButtonBehavior Fragment Contract

```typescript
const controlFragments: ICodeFragment[] = buttons.map(btn => ({
    fragmentType: FragmentType.Action,
    type: 'action',
    image: btn.label,
    origin: 'runtime',
    value: { id: btn.id, variant: btn.variant, enabled: btn.enabled, eventName: btn.eventName },
}));

ctx.pushMemory('controls', controlFragments);
```

---

## UI Rendering Pipeline

### Stack View: Memory List → Display Rows

```
┌──────────────────────────────────────────────────────────┐
│  useStackFragmentSources() hook                          │
│  ──────────────────────────                              │
│  For each block on the runtime stack:                    │
│    1. block.getMemory('fragment:display') → IMemLoc[]    │
│    2. Map each location → ICodeFragment[]                │
│    3. Result: ICodeFragment[][] per block                │
│    4. Pass to <FragmentSourceRow> for rendering           │
└──────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────┐
│  <TimerStackView>                                        │
│  ─────────────────                                       │
│  stackItems.map(entry =>                                 │
│    entry.displayRows.map(row =>                          │
│      <FragmentSourceRow fragments={row} />               │
│    )                                                     │
│  )                                                       │
└──────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────┐
│  <FragmentSourceRow>                                     │
│  ──────────────────                                      │
│  Renders a single ICodeFragment[] as a horizontal row    │
│  of fragment pills/badges using <FragmentVisualizer>     │
└──────────────────────────────────────────────────────────┘
```

### Updated Hook: useStackDisplayRows

```typescript
export interface StackDisplayEntry {
    /** The owning runtime block */
    block: IRuntimeBlock;
    /** Display rows — each ICodeFragment[] is one visual row */
    displayRows: ICodeFragment[][];
    /** Block label (fallback) */
    label: string;
    /** Nesting depth for indentation */
    depth: number;
    /** Whether this is the leaf (most active) entry */
    isLeaf: boolean;
}

export function useStackDisplayRows(): StackDisplayEntry[] | undefined {
    const blocks = useSnapshotBlocks();
    const [version, setVersion] = useState(0);

    // Subscribe to fragment:display memory changes on all blocks
    useEffect(() => {
        const unsubscribes: (() => void)[] = [];
        for (const block of blocks) {
            const displayLocs = block.getMemory('fragment:display');
            for (const loc of displayLocs) {
                unsubscribes.push(loc.subscribe(() => setVersion(v => v + 1)));
            }
        }
        return () => unsubscribes.forEach(fn => fn());
    }, [blocks]);

    return useMemo(() => {
        if (blocks.length === 0) return undefined;
        const entries: StackDisplayEntry[] = [];
        const orderedBlocks = [...blocks].reverse();

        orderedBlocks.forEach((block, index) => {
            const displayLocs = block.getMemory('fragment:display');
            const displayRows = displayLocs.map(loc => loc.fragments);

            entries.push({
                block,
                displayRows,
                label: block.label,
                depth: index,
                isLeaf: index === orderedBlocks.length - 1,
            });
        });

        return entries.length > 0 ? entries : undefined;
    }, [blocks, version]);
}
```

### Updated TimerStackView Rendering

```tsx
// In TimerStackView — replacing the current stackItems iteration:
{stackItems && stackItems.map((entry) => (
    <div key={entry.block.key.toString()} className="transition-all duration-300">
        {entry.displayRows.map((row, rowIdx) => (
            <FragmentSourceRow
                key={rowIdx}
                fragments={row}
                status={entry.isLeaf ? 'active' : 'pending'}
                depth={entry.depth}
                size="focused"
                filter={stackFilter}
                label={rowIdx === 0 ? entry.label : undefined}
            />
        ))}
    </div>
))}
```

---

## Migration Architecture

### What Changes vs. What Stays

| Aspect | Status |
|--------|--------|
| `RuntimeBlock._memoryEntries: Map<>` | **Replaced** → `_memory: IMemoryLocation[]` |
| `block.getMemory('timer')` returns singular entry | **Changed** → returns `IMemoryLocation[]` |
| `block.hasMemory('timer')` | **Same** → checks if any location has tag |
| `ctx.setMemory('timer', value)` | **Changed** → `ctx.pushMemory('timer', fragments)` or `ctx.updateMemory('timer', fragments)` |
| `IMemoryEntry<T, V>` generic interface | **Replaced** → `IMemoryLocation` with `ICodeFragment[]` value |
| `FragmentMemory` class | **Deleted** → memory list handles groups naturally |
| `DisplayFragmentMemory` class | **Deleted** → `fragment:display` locations in list |
| `BaseMemoryEntry`, `SimpleMemoryEntry` | **Deleted** → replaced by `MemoryLocation` impl |
| `TimerState`, `RoundState`, etc. | **Deleted as memory shapes** → behaviors encode into `ICodeFragment.value` |
| `MemoryTypeMap` registry | **Deleted** → uniform `ICodeFragment[]` at every location |
| `useBlockMemory(block, 'timer')` hook | **Simplified** → reads `ICodeFragment[]` from first matching location |
| `useFragmentSource(block)` hook | **Replaced** → `useStackDisplayRows()` scans for `'fragment:display'` tag |
| `BlockBuilder.setFragments()` | **Simplified** → pushes `'fragment:display'` locations to list |
| `FragmentSourceRow` component | **Simplified** → takes `ICodeFragment[]` directly, no `IFragmentSource` needed |

---

## Implementation Steps

### Step 1: Define IMemoryLocation and MemoryTag

**File:** `src/runtime/memory/MemoryLocation.ts` (New)

```typescript
import { ICodeFragment } from '../../core/models/CodeFragment';

export type MemoryTag = 
    | 'timer'
    | 'round'
    | 'completion'
    | 'display'
    | 'controls'
    | 'fragment:display';

export interface IMemoryLocation {
    readonly tag: MemoryTag;
    readonly fragments: ICodeFragment[];
    subscribe(listener: (nv: ICodeFragment[], ov: ICodeFragment[]) => void): () => void;
    update(fragments: ICodeFragment[]): void;
    dispose(): void;
}

export class MemoryLocation implements IMemoryLocation {
    private _listeners = new Set<(nv: ICodeFragment[], ov: ICodeFragment[]) => void>();
    private _fragments: ICodeFragment[];

    constructor(
        public readonly tag: MemoryTag,
        initialFragments: ICodeFragment[] = []
    ) {
        this._fragments = initialFragments;
    }

    get fragments(): ICodeFragment[] { return this._fragments; }

    update(fragments: ICodeFragment[]): void {
        const old = this._fragments;
        this._fragments = fragments;
        for (const listener of this._listeners) {
            listener(fragments, old);
        }
    }

    subscribe(listener: (nv: ICodeFragment[], ov: ICodeFragment[]) => void): () => void {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    dispose(): void {
        const old = this._fragments;
        this._fragments = [];
        for (const listener of this._listeners) {
            listener([], old);
        }
        this._listeners.clear();
    }
}
```

### Step 2: Update IRuntimeBlock Interface

**File:** `src/runtime/contracts/IRuntimeBlock.ts`

```typescript
// Add new list-based memory API alongside existing API (for phased migration)
export interface IRuntimeBlock {
    // ... existing ...

    // ===== New List-Based Memory =====

    /** Push a new memory location to the block's memory list */
    pushMemory(location: IMemoryLocation): void;

    /** Get all memory locations matching the given tag */
    getMemoryByTag(tag: MemoryTag): IMemoryLocation[];

    /** Get all memory locations */
    getAllMemory(): IMemoryLocation[];
}
```

### Step 3: Update RuntimeBlock Implementation

**File:** `src/runtime/RuntimeBlock.ts`

Replace `Map<MemoryType, IMemoryEntry>` with `IMemoryLocation[]`:

```typescript
export class RuntimeBlock implements IRuntimeBlock {
    private _memory: IMemoryLocation[] = [];

    pushMemory(location: IMemoryLocation): void {
        this._memory.push(location);
    }

    getMemoryByTag(tag: MemoryTag): IMemoryLocation[] {
        return this._memory.filter(loc => loc.tag === tag);
    }

    getAllMemory(): IMemoryLocation[] {
        return [...this._memory];
    }

    // Backward compat shim (phased removal)
    getMemory<T extends MemoryType>(type: T): IMemoryEntry<T, MemoryValueOf<T>> | undefined {
        // Adapter: wrap first matching IMemoryLocation as IMemoryEntry
        // ... (temporary during migration)
    }
}
```

### Step 4: Update BehaviorContext

**File:** `src/runtime/BehaviorContext.ts`

```typescript
export class BehaviorContext implements IBehaviorContext {
    /** Push a tagged memory location with fragment data */
    pushMemory(tag: MemoryTag, fragments: ICodeFragment[]): IMemoryLocation {
        const location = new MemoryLocation(tag, fragments);
        this.block.pushMemory(location);
        return location;
    }

    /** Update the first matching memory location (convenience) */
    updateMemory(tag: MemoryTag, fragments: ICodeFragment[]): void {
        const locations = (this.block as RuntimeBlock).getMemoryByTag(tag);
        if (locations.length > 0) {
            locations[0].update(fragments);
        }
    }
}
```

### Step 5: Update BlockBuilder

**File:** `src/runtime/compiler/BlockBuilder.ts`

```typescript
build(): IRuntimeBlock {
    // ...create block...

    // Push each fragment group as a separate 'fragment:display' location
    if (this.fragments && this.fragments.length > 0) {
        for (const group of this.fragments) {
            block.pushMemory(new MemoryLocation('fragment:display', group));
        }
    }

    return block;
}
```

### Step 6: Migrate Behaviors to ICodeFragment[] Output

Migrate each behavior to produce `ICodeFragment[]` instead of typed state objects:

1. **TimerInitBehavior** → push `'timer'` location with timer fragment
2. **RoundInitBehavior** → push `'round'` location with rounds fragment
3. **DisplayInitBehavior** → push `'display'` location with text fragment
4. **ButtonBehavior** → push `'controls'` location with action fragments
5. **CompletionBehaviors** → push `'completion'` location with completion fragment

### Step 7: Update UI Hooks

Replace `useStackFragmentSources` with `useStackDisplayRows` (shown above).
Replace `useBlockMemory` specialized hooks with fragment-reading versions.

### Step 8: Update TimerStackView and FragmentSourceRow

`TimerStackView` iterates `displayRows: ICodeFragment[][]` per block.
`FragmentSourceRow` accepts `ICodeFragment[]` directly instead of `IFragmentSource`.

### Step 9: Delete Legacy Types

- `MemoryTypeMap`, `MemoryValueOf<T>`, typed state interfaces (as memory shapes)
- `FragmentMemory`, `DisplayFragmentMemory`, `BaseMemoryEntry`, `SimpleMemoryEntry`
- `IMemoryEntry<T, V>` generic interface

---

## Visualization: Before & After

### Before (Map-Based, Heterogeneous Values)

```
RuntimeBlock
  └── _memoryEntries: Map<MemoryType, IMemoryEntry>
        ├── 'timer'            → TimerState { spans, direction, durationMs }
        ├── 'round'            → RoundState { current: 2, total: 5 }
        ├── 'fragment'         → FragmentState { groups: [[frag1, frag2], [frag3]] }
        ├── 'fragment:display' → FragmentDisplayState { fragments, resolved }
        ├── 'display'          → DisplayState { mode: 'timer', label: 'AMRAP' }
        └── 'controls'         → ButtonsState { buttons: [...] }
```

### After (List-Based, ICodeFragment[] Values)

```
RuntimeBlock
  └── _memory: IMemoryLocation[]
        ├── [0] tag: 'timer'             fragments: [{ type: 'timer', value: {spans, dir, dur}, image: '10:00' }]
        ├── [1] tag: 'round'             fragments: [{ type: 'rounds', value: {current:2, total:5}, image: 'Rd 2/5' }]
        ├── [2] tag: 'fragment:display'   fragments: [timerFrag, effortFrag]        ← display row 1
        ├── [3] tag: 'fragment:display'   fragments: [repFrag, actionFrag]          ← display row 2
        ├── [4] tag: 'display'           fragments: [{ type: 'text', image: 'AMRAP' }]
        └── [5] tag: 'controls'          fragments: [{ type: 'action', value: {id, label, eventName} }]
```

### UI Stack View Rendering (After)

```
┌─────────────────────── Stack View ───────────────────────┐
│                                                           │
│  ┌─── Block: "AMRAP 20:00" (depth: 0) ────────────────┐ │
│  │  Row 1: [⏱ 10:00] [💪 Run] [@RPE8]                 │ │
│  │  Row 2: [🔄 Round 2/5]                              │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─── Block: "10 Burpees" (depth: 1, leaf) ────────────┐ │
│  │  Row 1: [🔢 10] [🏃 Burpees]                       │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## Key Benefits

1. **Uniform contract** — everything is `ICodeFragment[]`, no type-specific hooks needed.
2. **Multi-row display is natural** — multiple `fragment:display` locations = multiple rows.
3. **Behaviors are fragment producers** — they know exactly what fragments they produce, no struct-to-fragment translation layer needed.
4. **List allows duplicates** — a block can have multiple timers, multiple round counters, multiple display rows without Map key conflicts.
5. **UI is simple** — scan for `fragment:display` tag, render each `ICodeFragment[]` as a row.
6. **Debugging is easy** — the full memory list is inspectable, every piece of state is a fragment with `origin`, `type`, `image`.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Performance of linear scan vs Map lookup | Memory lists are tiny (5-10 entries per block); linear scan is negligible |
| Breaking timer tick performance (60fps updates) | Timer behavior updates its fragment in-place via `location.update()`, same as current `entry.update()` |
| Backward compat during migration | Phased approach: add list API first, then migrate consumers, then remove Map API |
| Loss of type safety from `MemoryTypeMap` | Behaviors provide typed factory functions: `TimerBehavior.createTimerFragment(state): ICodeFragment` |
| `ICodeFragment.value` becomes a loose `unknown` | Document per-tag contracts; consider branded types or validation in debug mode |

---

## Files Affected

| File | Change |
|------|--------|
| `src/runtime/memory/MemoryLocation.ts` | **New** — `IMemoryLocation`, `MemoryLocation`, `MemoryTag` |
| `src/runtime/memory/MemoryTypes.ts` | **Modified** — remove typed state interfaces as memory shapes (keep as domain types) |
| `src/runtime/memory/IMemoryEntry.ts` | **Deleted** (after migration) |
| `src/runtime/memory/BaseMemoryEntry.ts` | **Deleted** (after migration) |
| `src/runtime/memory/SimpleMemoryEntry.ts` | **Deleted** (after migration) |
| `src/runtime/memory/FragmentMemory.ts` | **Deleted** |
| `src/runtime/memory/DisplayFragmentMemory.ts` | **Deleted** |
| `src/runtime/contracts/IRuntimeBlock.ts` | **Modified** — add list-based memory methods |
| `src/runtime/RuntimeBlock.ts` | **Modified** — replace Map with list |
| `src/runtime/BehaviorContext.ts` | **Modified** — add `pushMemory()`, `updateMemory()` |
| `src/runtime/compiler/BlockBuilder.ts` | **Simplified** — push `fragment:display` locations |
| `src/runtime/behaviors/*.ts` | **Modified** — produce `ICodeFragment[]` instead of typed state |
| `src/runtime/hooks/useBlockMemory.ts` | **Modified** — read from list API |
| `src/runtime/hooks/useStackDisplay.ts` | **Modified** — `useStackDisplayRows()` replaces `useStackFragmentSources()` |
| `src/components/workout/TimerStackView.tsx` | **Modified** — iterate `ICodeFragment[][]` per block |
| `src/components/fragments/FragmentSourceRow.tsx` | **Simplified** — accept `ICodeFragment[]` directly |
| `src/testing/harness/MockBlock.ts` | **Modified** — implement list-based memory |
| `src/testing/testable/TestableBlock.ts` | **Modified** — delegate to list-based memory |
