# Consolidate Fragment Memory Types

## Status: IN PROGRESS
## Created: 2026-02-10

---

## Goal

Replace `FragmentMemory` + `DisplayFragmentMemory` with a single `FragmentGroupMemory`.
Each `ICodeFragment[]` group becomes its own precedence-resolved `IFragmentSource`.
One-shot: breaking changes are acceptable.

## Design Principles

1. **Display fragments only** — block memory stores display-ready `IFragmentSource[]`,
   not raw `ICodeFragment[][]`. The raw arrays are resolved at construction time.
2. **First-group default** — consumers expecting a flat `ICodeFragment[]` see `groups[0]`
   only. This is the backward-compatible surface for behaviors like timer/segment output.
3. **Per-group precedence** — each group resolves precedence independently. Groups are
   semantic boundaries (one per source CodeStatement).
4. **UI row binding** — one row per group. The UI iterates `IFragmentSource[]` and renders
   a `FragmentVisualizer` for each.
5. **Global output composition** — when behaviors write output statements (segment,
   completion), they compose globally: `flatMap(g => g.fragments)` then resolve.

## New Data Model

### MemoryTypes.ts changes

```typescript
/** State for a single resolved fragment group (one per source CodeStatement). */
export interface FragmentSourceState {
    readonly fragments: readonly ICodeFragment[];
    readonly resolved: readonly ICodeFragment[];
}

/** State for the 'fragments' memory entry. */
export interface FragmentGroupsState {
    readonly groups: readonly FragmentSourceState[];
}
```

Remove: `FragmentState`, `FragmentDisplayState`
Remove from union: `'fragment'`, `'fragment:display'`
Add to union: `'fragments'`

### FragmentGroupMemory class

```typescript
export class FragmentGroupMemory
    extends BaseMemoryEntry<'fragments', FragmentGroupsState> {

    constructor(blockId: string, fragmentGroups: ICodeFragment[][] = []) {
        const groups = fragmentGroups.map(group => ({
            fragments: group,
            resolved: resolveFragmentPrecedence(group)
        }));
        super('fragments', { groups });
    }

    /** Get IFragmentSource for group at index. */
    getGroupSource(index: number): IFragmentSource | undefined

    /** Get all group sources. One per row in the UI. */
    getGroupSources(): IFragmentSource[]

    /**
     * First group's resolved fragments.
     * For consumers expecting flat ICodeFragment[] access.
     */
    getDefaultResolved(): ICodeFragment[]

    /**
     * All fragments globally resolved across all groups.
     * For output behaviors composing completion/segment statements.
     */
    getAllResolved(): ICodeFragment[]
}
```

### FragmentGroupSource (lightweight IFragmentSource per group)

Internal class. Created by `FragmentGroupMemory.getGroupSource()`.
Each instance wraps a single `FragmentSourceState` and implements `IFragmentSource`.

## Consumer Impact Analysis

### BehaviorContext.ts (line 117)
**Current:** `ctx.getMemory('fragment:display')` returns `FragmentDisplayState`
**After:** `ctx.getMemory('fragments')` returns `FragmentGroupsState`
**Detail:** The `emitOutput` fallback (lines 116-121) currently reads `displayMem.resolved`.
With new model, it should use `FragmentGroupMemory.getDefaultResolved()` — but
`getMemory()` returns the raw state value, not the class instance. Two options:
  - a) Access the entry directly via `block.getMemory('fragments')` and cast
  - b) Add a helper to `FragmentGroupsState` itself (breaks pure-data contract)
  - **Decision:** Use option (a). BehaviorContext reads `block.getMemory()` entry,
    casts to `FragmentGroupMemory`, calls `.getDefaultResolved()`.

### SegmentOutputBehavior.ts
**Current:** Fallback chain trying `'fragment:display'` then `'fragment'`
**After:** `block.getMemory('fragments')` → cast → `.getAllResolved()`
Note: Output should compose globally per user decision.

### TimerOutputBehavior.ts
**Current:** `displayMem.resolved` from `'fragment:display'`
**After:** Same pattern as SegmentOutputBehavior — `.getAllResolved()`

### BlockBuilder.build()
**Current:** Two allocations + subscription wiring (6 lines)
**After:** Single allocation (2 lines):
```typescript
const mem = new FragmentGroupMemory(block.key.toString(), this.fragments);
block.allocateMemory('fragments', mem);
```

### useBlockMemory.ts — useFragmentSource hook
**Current:** Returns `IFragmentSource | undefined` (single)
**After:** Returns `IFragmentSource[]` (one per group, empty array if none).
Rename to `useFragmentSources`.

### useStackDisplay.ts — useStackFragmentSources hook
**Current:** Dual-read from `'fragment:display'` AND `'fragment'`, populates
`fragmentGroups` escape-hatch prop on `StackFragmentEntry`.
**After:** Single read from `'fragments'`, returns `sources: IFragmentSource[]`
on each entry. Remove `fragmentGroups` from `StackFragmentEntry` and
`FragmentSourceEntry`.

### FragmentSourceRow.tsx
**Current:** Has branching render path: `fragmentGroups` prop → multi-line,
else `source.getDisplayFragments()` → single line.
**After:** Receives `sources: IFragmentSource[]` prop. Always iterates sources,
rendering one `FragmentVisualizer` per source. Single code path.

### FragmentSourceList.tsx
**Current:** Passes `fragmentGroups` to each row.
**After:** Passes `sources` to each row.

### RuntimeAdapter.ts
**Current:** Reads both `'fragment'` and `'fragment:display'` keys.
**After:** Reads `'fragments'` only. `RuntimeStackBlock.fragmentGroups` can be
populated from `.getGroupSources()` if the test bench still needs raw groups,
or removed entirely.

### WorkoutTestHarness.ts
**Current:** Fallback chain trying display then raw.
**After:** Single path via `.getAllResolved()`.

### core-entry.ts
**Current:** Exports `DisplayFragmentMemory`.
**After:** Export `FragmentGroupMemory` instead.

## Execution Checklist

### Create
- [ ] `runtime/memory/FragmentGroupMemory.ts` — new consolidated class + FragmentGroupSource
- [ ] `runtime/memory/__tests__/FragmentGroupMemory.test.ts` — tests

### Update (memory layer)
- [ ] `runtime/memory/MemoryTypes.ts` — new types, remove old, update union

### Update (producer)
- [ ] `runtime/compiler/BlockBuilder.ts` — single allocation

### Update (behavior consumers)
- [ ] `runtime/BehaviorContext.ts` — `fragment:display` → `fragments` entry access
- [ ] `runtime/behaviors/SegmentOutputBehavior.ts` — `.getAllResolved()`
- [ ] `runtime/behaviors/TimerOutputBehavior.ts` — `.getAllResolved()`

### Update (UI hooks)
- [ ] `runtime/hooks/useBlockMemory.ts` — `useFragmentSource` → `useFragmentSources`
- [ ] `runtime/hooks/useStackDisplay.ts` — single read, `sources[]` on entry
- [ ] `runtime/hooks/index.ts` — update exports

### Update (UI components)
- [ ] `components/fragments/FragmentSourceRow.tsx` — `sources` prop replaces `source` + `fragmentGroups`
- [ ] `components/fragments/FragmentSourceList.tsx` — pass `sources`

### Update (adapters/test infra)
- [ ] `runtime-test-bench/adapters/RuntimeAdapter.ts` — single read
- [ ] `runtime-test-bench/types/interfaces.ts` — update `RuntimeStackBlock`
- [ ] `testing/harness/WorkoutTestHarness.ts` — single path
- [ ] `runtime/RuntimeBlock.ts` — update comments
- [ ] `core-entry.ts` — update exports

### Delete
- [ ] `runtime/memory/FragmentMemory.ts`
- [ ] `runtime/memory/DisplayFragmentMemory.ts`
- [ ] `runtime/memory/__tests__/DisplayFragmentMemory.test.ts`

### Test Updates
- [ ] `runtime/compiler/__tests__/BlockBuilderFragments.test.ts`
- [ ] `runtime/hooks/__tests__/useFragmentSource.test.ts`
- [ ] `runtime/memory/__tests__/MemoryEntries.test.ts`
- [ ] `runtime/__tests__/RuntimeBlockMemory.test.ts`
