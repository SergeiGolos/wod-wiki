# WOD Wiki — Fragment Overhaul & Standardization

> **Status**: Proposed / Draft
> **Scope**: Core Data Structures (`CodeStatement`, `RuntimeBlock`, `OutputStatement`) & UI Rendering
> **Objective**: Unify the data shape shared between transformation levels to simplify UI logic and standardize fragment precedence.

---

## 1. The Problem
Currently, the WOD Wiki architecture passes data through three distinct levels of transformation:

1.  **`CodeStatement`** (Parser Level): Static representation of the user's script. Contains `fragments` parsed directly from text.
2.  **`RuntimeBlock`** (Execution Level): Dynamic, executing entity. Contains `fragments` (sometimes grouped) AND separate **Block Memory** (Typed, observable state like `timer`, `reps`).
3.  **`OutputStatement`** (Result Level): Snapshot of execution history. Extends `CodeStatement` but appends runtime-generated fragments.

### Issues
- **Inconsistent Access**: UI components (`FragmentVisualizer`, `UnifiedItemList`) currently have to "know" which type of object they are rendering to extract data correctly.
- **Memory vs. Fragments**: `RuntimeBlock` stores dynamic state in `Memory` (e.g., current remaining time), while `CodeStatement` stores static state in `Fragments` (e.g., duration). The UI has to manually merge these.
- **Precedence Ambiguity**: When a block has both a static "10 reps" fragment and a dynamic "8 reps completed" memory value, the UI logic for which to display is scattered.

---

## 2. Proposed Solution: `IFragmentProvider`

We introduce a common interface `IFragmentProvider` (or `IDisplayDataContainer`) that all three levels MUST implement. This interface abstracts away the source of the data (static array vs. dynamic memory vs. historic log).

### The Interface

```typescript
export interface IFragmentProvider {
  /**
   * unique identifier for React keys and tracking
   */
  readonly id: string | number;
  
  /**
   * The "Winner" fragments that should be displayed to the user.
   * This list is pre-filtered based on standard precedence rules.
   */
  getDisplayFragments(): ICodeFragment[];

  /**
   * Access to raw underlying fragments if needed (e.g. for debugging)
   */
  getAllFragments(): ICodeFragment[];

  /**
   * Helper to get a specific fragment type with precedence applied.
   */
  getFragment(type: FragmentType): ICodeFragment | undefined;
  
  /**
   * Query if a specific fragment type exists in the active set.
   */
  hasFragment(type: FragmentType): boolean;
}
```

### Implementation Strategies

#### 1. `CodeStatement` (Static)
- **Source**: `this.fragments`
- **Logic**: Returns the static parsed fragments.
- **Precedence**: N/A (Only 'parser' origin exists).

#### 2. `RuntimeBlock` (Dynamic)
- **Source**: `this.fragments` (static) + `this.context.memory` (dynamic).
- **Logic**: 
  - The `getDisplayFragments()` method **synthesizes** fragments from Memory.
  - If `MemoryType.Timer` exists, it generates a `FragmentType.Timer` with `origin: 'runtime'`.
  - These runtime fragments **replace** or **overlay** static fragments of the same type based on rules.

#### 3. `OutputStatement` (Historic)
- **Source**: `this.fragments` (merged static + runtime).
- **Logic**: Already contains the "final" state. `origin` fields distinguish `parser` vs `runtime`.

---

## 3. Order of Precedence
When `getDisplayFragments()` is called, the provider must resolve conflicts using the following precedence (highest priority first):

1.  **User Override** (`origin: 'user'`)
    - *Example*: User manually edited "Reps" count to 8 (vs 10 planned).
2.  **Runtime State** (`origin: 'runtime'`)
    - *Example*: Live Timer value, or sensor-recorded Rep count.
3.  **Compiler Hint** (`origin: 'compiler'`)
    - *Example*: JIT strategy injected a default value.
4.  **Static Parser** (`origin: 'parser'`)
    - *Example*: The original text "User wrote this".

### Precedence resolution table
| Fragment Type | If 'Runtime' exists... | If 'User' exists... | Action |
| :--- | :--- | :--- | :--- |
| **Timer** | ✅ Use Runtime | ✅ Use User | Hide Parser value (e.g. show counting down timer, not static duration) |
| **Reps** | ✅ Use Runtime | ✅ Use User | Show incomplete/complete reps over static target |
| **Text** | ❌ Ignore Runtime | ✅ Use User | Text usually stays static unless explicitly rewritten |
| **Distance** | ✅ Use Runtime | ✅ Use User | Show live distance |

---

## 4. UI Simplification

With this change, the standard UI component `UnifiedItemList` (and `FragmentVisualizer`) no longer needs complex logic.

### Before (Pseudo-code)
```tsx
function renderItem(item) {
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

### After (Goal)
```tsx
function renderItem(provider: IFragmentProvider) {
  // The provider has already done the heavy lifting of precedence and merging
  const fragments = provider.getDisplayFragments();
  
  return <FragmentVisualizer fragments={fragments} />;
}
```

---

## 5. Implementation Plan

1.  **Define Interface**: Create `src/core/contracts/IFragmentProvider.ts`.
2.  **Refactor `CodeStatement`**:
    - Implement `IFragmentProvider`.
    - `getDisplayFragments` returns `this.fragments`.
3.  **Refactor `RuntimeBlock`**:
    - Update `IRuntimeBlock` to extend or implement `IFragmentProvider`.
    - Implement `getDisplayFragments`:
        - Map valid `Memory` entries to temporary `ICodeFragment` objects.
        - Merge with static `fragments`.
        - Apply precedence filter.
4.  **Refactor `OutputStatement`**:
    - Implement `IFragmentProvider`.
    - Ensure `fragments` array is correctly sorted/filtered or do it on access.
5.  **Update UI Adapters**:
    - Start with `blockToDisplayItem` and `statementsToDisplayItems` adapters.
    - Ensure they pass the full `IFragmentProvider` capabilities or mapped "display fragments" to the visualizers.

## 6. Future Proofing: Multi-Fragment Handling

The system must handle cases where *multiple* fragments of the same type are valid (e.g., an Interval workout with "Run" (Text) and "400m" (Distance) and "Timer" (Timer)).

- **Filter vs. Find**: `getDisplayFragments` returns **ALL** valid fragments to show.
- **Collision**: Accessors like `getFragment(FragmentType.Timer)` should return the *highest precedence* single item.

---
**Generated by Antigravity**
