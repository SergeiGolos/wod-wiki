# Plan: Fragment-Based Memory Migration

This plan details the migration of the runtime memory model from "Typed Memory Slots" to a "Fragment-Based Resolution" system.

## 1. Objectives
- **Remove** rigid memory types (`timer`, `round`, etc.) and classes (`TimerMemory`, `RoundMemory`).
- **Implement** a `FragmentRegistry` on `RuntimeBlock` that manages `ICodeFragment[]`.
- **Expose** a `resolve(type: FragmentType)` API that returns the authoritative fragment based on precedence (Runtime > User > Compiler).
- **Update** all Behaviors to read/write Fragments directly.

---

## 2. Before vs After: Conceptual Model

### Before: Typed Memory Slots
Memory is a map of specific types to specific classes.
```typescript
// RuntimeBlock.ts
private _memoryEntries = new Map<MemoryType, IMemoryEntry>();

// Access
const timerMemory = block.getMemory('timer'); // Returns TimerMemory
const spans = timerMemory.value.spans;
```

### After: Fragment Resolution
Memory is a collection of fragments. The "State" is just the latest version of a fragment.
```typescript
// RuntimeBlock.ts
public readonly fragments = new FragmentRegistry();

// Access
const timerFragment = block.fragments.resolve(FragmentType.Timer); // Returns ICodeFragment
const spans = (timerFragment.value as TimerValue).spans;
```

---

## 3. Implementation Steps

### Step 1: Define Fragment Values & Visibility
We need strictly typed values and a new `visibility` property to support inheritance (e.g., 21-15-9 rep schemes cascading down).

**File:** `src/core/models/CodeFragment.ts` (Update)
```typescript
export type FragmentVisibility = 
    | 'private'  // Visible only to this block (default)
    | 'public'   // Visible to external queries/UI
    | 'cascade'; // Visible to children (inherited)

export interface ICodeFragment {
    // ... existing fields
    readonly visibility?: FragmentVisibility;
}
```

**File:** `src/core/models/FragmentValues.ts` (New)
```typescript
import { TimeSpan } from '../../runtime/models/TimeSpan';

export interface TimerFragmentValue {
    spans: readonly TimeSpan[];
    durationMs?: number;
    direction: 'up' | 'down';
    label: string;
}

export interface RoundFragmentValue {
    current: number;
    total?: number;
}
// ... map other types
```

### Step 2: Create FragmentRegistry with Inheritance
A helper class to manage the collection and resolution logic, including **Stack Traversal**.

**File:** `src/runtime/memory/FragmentRegistry.ts` (New)
```typescript
export class FragmentRegistry {
    private _fragments: ICodeFragment[] = [];
    
    constructor(
        private readonly block: IRuntimeBlock, 
        initialFragments: ICodeFragment[]
    ) {
        this._fragments = [...initialFragments];
    }

    /**
     * Resolver Logic:
     * 1. Check Local: Filter by type + sort by Origin Precedence (Runtime > User > Compiler).
     * 2. Check Parent (if not found locally): 
     *    - If local is missing, query Parent for 'cascade' visibility fragments.
     *    - Recurse up the stack.
     */
    resolve(type: FragmentType): ICodeFragment | undefined {
        // 1. Local resolution
        const local = this.findBestMatch(this._fragments, type);
        if (local) return local;

        // 2. Inheritance resolution
        // Requires access to runtime/parent via block context
        return this.resolveInherited(type);
    }

    private resolveInherited(type: FragmentType): ICodeFragment | undefined {
       // Walk up the stack, looking for fragments with visibility: 'cascade'
       // ... implementation
    }

    /**
     * Upsert a fragment.
     */
    update(fragment: ICodeFragment): void {
        // ... implementation
    }
}
```

### Step 3: Refactor RuntimeBlock
Remove `_memoryEntries` and add `fragments`.

**File:** `src/runtime/RuntimeBlock.ts`
```typescript
// BEFORE
class RuntimeBlock {
    getMemory<T>(type: T): IMemoryEntry<T> { ... }
}

// AFTER
class RuntimeBlock {
    public readonly fragments: FragmentRegistry;

    constructor(...) {
        this.fragments = new FragmentRegistry(initialFragments);
    }
    
    // Compatibility Shim (Temporary?)
    // getMemory(type) { return this.fragments.resolve(type)... } 
}
```

### Step 4: Refactor Behaviors
Update behaviors to use the new API.

**Example: TimerTickBehavior**

**Before:**
```typescript
// src/runtime/behaviors/TimerTickBehavior.ts
onMount(ctx: IBehaviorContext) {
    // 1. Get Memory Wrapper
    const memory = ctx.getMemory('timer');
    
    // 2. Start
    if (!memory.isRunning) {
        ctx.setMemory('timer', { ...memory, spans: [...] });
    }
}
```

**After:**
```typescript
onMount(ctx: IBehaviorContext) {
    // 1. Resolve Fragment
    const fragment = ctx.resolveFragment(FragmentType.Timer);
    const value = fragment?.value as TimerFragmentValue;

    // 2. Update logic
    const newSpans = [...value.spans, new TimeSpan(ctx.clock.now)];
    
    // 3. Write Config
    ctx.updateFragment({
        ...fragment,
        origin: 'runtime', // Crucial: Mark as runtime state
        value: { ...value, spans: newSpans }
    });
}
```

### Step 5: Clean Up
1.  Delete `src/runtime/memory/TimerMemory.ts`.
2.  Delete `src/runtime/memory/RoundMemory.ts`.
3.  Delete `src/runtime/memory/IMemoryEntry.ts`.
4.  Remove `MemoryType` enum usage from codebase.

---

## 4. Updates to Tests & Stories

### Updating Tests
Tests often mock memory. They need to mock fragments now.

**Before:**
```typescript
const block = new RuntimeBlock(...);
block.allocateMemory('timer', new TimerMemory({ ... }));
expect(block.getMemory('timer').value.spans).toHaveLength(1);
```

**After:**
```typescript
const block = new RuntimeBlock(...);
// Inject initial fragment via constructor or helper
block.fragments.update({
    type: FragmentType.Timer,
    origin: 'compiler',
    value: { spans: [] }
});

// Act
behavior.onMount(ctx);

// Assert
const runtimeFrag = block.fragments.resolve(FragmentType.Timer);
expect((runtimeFrag.value as TimerFragmentValue).spans).toHaveLength(1);
expect(runtimeFrag.origin).toBe('runtime');
```

### Updating Stories (Workbench)
Component stories often setup a block with memory.

**Before:**
```tsx
const block = createTestBlock();
block.setMemoryValue('round', { current: 1, total: 3 });
// ... render
```

**After:**
```tsx
const block = createTestBlock();
block.fragments.update({
    type: FragmentType.Round,
    origin: 'runtime', // Simulating active state
    value: { current: 1, total: 3 }
});
// ... render
```

---

## 5. Execution Order

1.  **Define Values**: Create `FragmentValues.ts` definitions.
2.  **Scaffold Registry**: Create `FragmentRegistry.ts` with tests.
3.  **Update Block**: Modify `RuntimeBlock` to include registry (keep `memory` shim for a step if needed, or go big bang). *Big bang is likely cleaner given the strict typing.*
4.  **Update Context**: Add `resolveFragment` / `updateFragment` to `IBehaviorContext`.
5.  **Migrate Behaviors**: Go through `src/runtime/behaviors/*` and update logic.
6.  **Migrate Components**: Update UI components that read memory to read resolved fragments (Visualizers).
7.  **Delete Old Code**: Remove the `memory/` folder contents.
