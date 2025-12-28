# Fragment Types Reference & Lookup Utility

Quick reference of all FragmentTypes in the codebase, how each fragment is used, the current lookup patterns we see in the repo, and a proposed helper API to reduce repeated `.find/.filter/.flat()` logic.

---

## TL;DR ✅
- Fragment types are defined in `src/core/models/CodeFragment.ts` (enum `FragmentType`).
- Concrete fragments live in `src/fragments/` (e.g., `RepFragment`, `TimerFragment`).
- Current code frequently uses patterns like `fragments.find(f => f.fragmentType === FragmentType.Rep)` which is verbose and requires casting.
- Proposed: add `findFragment`, `filterFragments`, `hasFragment` methods directly on `CodeStatement` and `IRuntimeBlock` for a fluent, type-safe API.

---

## Fragment Types (list)

| FragmentType | Defined in | Primary fields | Typical usage locations |
|---|---:|---|---|
| **Timer** | `src/fragments/TimerFragment.ts` | `image`, `value` (ms), `direction`, `collectionState` | Parsing (script → fragments), runtime spans (start/stop timers), display (`StatementDisplay`) | 
| **Rep** | `src/fragments/RepFragment.ts` | `value` (number) `image` | Repetition metrics, metric collection, fragment-based metrics, assertions in tests | 
| **Effort** | `src/fragments/EffortFragment.ts` | `value` (string) `image` | Activity/effort labels (e.g., "Run"), span classification, UI labels | 
| **Distance** | `src/fragments/DistanceFragment.ts` | `value: {amount, units}`, `collectionState` | Distance metrics (running, rower), collectible vs defined values | 
| **Rounds** | `src/fragments/RoundsFragment.ts` | `count` | Rounds/AMRAP constructs, runtime loops, display | 
| **Action** | `src/fragments/ActionFragment.ts` | `raw`, `name`, `isPinned` | Action blocks (e.g., Rest), pinned actions, display | 
| **Increment** | `src/fragments/IncrementFragment.ts` | `increment` (±1) | ++/-- style operators in timer sequence, internal control | 
| **Lap** | `src/fragments/LapFragment.ts` | `group` (GroupType) `image` | Timer-sublaps and grouped sequences | 
| **Text** | `src/fragments/TextFragment.ts` | `{ text, level? }` | Arbitrary text in scripts / headings / labels | 
| **Resistance** | `src/fragments/ResistanceFragment.ts` | `value: {amount, units}`, `collectionState` | Weight/resistance metrics (e.g., lbs, kg), collectible vs defined values |

> Files: `src/core/models/CodeFragment.ts`, `src/fragments/*.ts` (see repository) ✨

---

## How fragments are currently looked up (patterns)

Common real examples found across docs/tests:

- Flatten + find first:

```ts
// often on per-statement fragments (ICodeFragment[][])
const repFrag = span.fragments.flat().find(f => f.fragmentType === FragmentType.Rep);
```

- Filter by type (get all reps):

```ts
const repFrags = fragments.filter(f => f.fragmentType === FragmentType.Rep);
```

- Check existence:

```ts
const hasEffort = s.fragments.flat().some(f => f.fragmentType === FragmentType.Effort);
```

Problems with this approach:
- Repetitive code and logic duplication.
- Not type-safe (callers often cast: `as RoundsFragment`).
- Easy to forget `.flat()` when working with nested fragment groups.

---

## Block-Level API (CodeStatement & IRuntimeBlock)

We propose adding **public methods directly on blocks** so consumers get a fluent, discoverable API without needing standalone utilities.

### CodeStatement (parsed statements)

Located: `src/parser/CodeStatement.ts` (or wherever CodeStatement is defined)

```ts
export class CodeStatement {
  fragments: ICodeFragment[] = [];
  
  // ... existing properties ...

  /**
   * Find the first fragment of a given type, optionally matching a predicate.
   */
  findFragment<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType,
    predicate?: (f: ICodeFragment) => boolean
  ): T | undefined {
    return this.fragments.find(
      f => f.fragmentType === type && (!predicate || predicate(f))
    ) as T | undefined;
  }

  /**
   * Get all fragments of a given type.
   */
  filterFragments<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType
  ): T[] {
    return this.fragments.filter(f => f.fragmentType === type) as T[];
  }

  /**
   * Check if a fragment of a given type exists.
   */
  hasFragment(type: FragmentType): boolean {
    return this.fragments.some(f => f.fragmentType === type);
  }
}
```

### IRuntimeBlock (runtime blocks)

Located: `src/runtime/IRuntimeBlock.ts`

```ts
export interface IRuntimeBlock {
  readonly fragments: ICodeFragment[];
  
  // ... existing members ...

  /**
   * Find the first fragment of a given type, optionally matching a predicate.
   */
  findFragment<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType,
    predicate?: (f: ICodeFragment) => boolean
  ): T | undefined;

  /**
   * Get all fragments of a given type.
   */
  filterFragments<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType
  ): T[];

  /**
   * Check if a fragment of a given type exists.
   */
  hasFragment(type: FragmentType): boolean;
}
```

### BaseBlock implementation (shared)

Located: `src/runtime/BaseBlock.ts` (or a mixin/trait)

```ts
export abstract class BaseBlock implements IRuntimeBlock {
  readonly fragments: ICodeFragment[] = [];

  findFragment<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType,
    predicate?: (f: ICodeFragment) => boolean
  ): T | undefined {
    return this.fragments.find(
      f => f.fragmentType === type && (!predicate || predicate(f))
    ) as T | undefined;
  }

  filterFragments<T extends ICodeFragment = ICodeFragment>(
    type: FragmentType
  ): T[] {
    return this.fragments.filter(f => f.fragmentType === type) as T[];
  }

  hasFragment(type: FragmentType): boolean {
    return this.fragments.some(f => f.fragmentType === type);
  }
}
```

### Usage examples (block-level API)

```ts
// Before (verbose)
const timer = block.fragments.find(f => f.fragmentType === FragmentType.Timer) as TimerFragment;
const allReps = block.fragments.filter(f => f.fragmentType === FragmentType.Rep);
const hasEffort = block.fragments.some(f => f.fragmentType === FragmentType.Effort);

// After (fluent)
const timer = block.findFragment<TimerFragment>(FragmentType.Timer);
const allReps = block.filterFragments<RepFragment>(FragmentType.Rep);
const hasEffort = block.hasFragment(FragmentType.Effort);

// With predicate (find specific fragment)
const collectibleRep = statement.findFragment<RepFragment>(
  FragmentType.Rep,
  f => f.collectionState === FragmentCollectionState.UserCollected
);
```

---

## Type safety & casting

- Use `findFragment<RepFragment>(...)` or `as RepFragment` when you need access to fragment-specific fields.
- Provide small type-guard helpers where useful (e.g., `isTimerFragment(f)` returning `f is TimerFragment`) to remove casts.

---

## Migration plan & acceptance

### Phase 1: Add block-level methods
1. Add `findFragment`, `filterFragments`, `hasFragment` methods to:
   - `CodeStatement` class (parser layer)
   - `IRuntimeBlock` interface + `BaseBlock` implementation (runtime layer)
2. Write unit tests for block-level methods.

### Phase 2: Migrate existing code
3. Replace `block.fragments.find(...)`, `.some()`, `.filter()` with block methods.
4. For rare cases with raw `ICodeFragment[][]` (e.g., span data), use `.flat().find(...)` directly — no utility needed.

### Phase 3: Enforce conventions (optional)
5. Add a lint rule to warn on direct `.find(f => f.fragmentType` patterns on block-owned fragments.

**Acceptance criteria:**
- All existing tests pass.
- Block methods are documented with TSDoc.
- Common lookup patterns in runtime code use the new methods.

---

## Notes & rationale 💡
- Block-level methods are the **only** API — no separate utility file needed.
- This keeps fragment access co-located with the data owner (SRP).
- For rare cases where you have a raw `ICodeFragment[]` or `ICodeFragment[][]` (e.g., from a span), use standard array methods directly.
- If we later change how fragments are stored internally, we update the block methods once.

---

If you'd like, I can implement `src/core/utils/fragmentUtils.ts` and add unit tests + a codemod/grep-based migration PR to replace the existing lookup patterns across the codebase. ✅

