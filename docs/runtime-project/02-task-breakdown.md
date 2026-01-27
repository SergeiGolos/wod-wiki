# Runtime Simplification: Task Breakdown

> **Scope:** Implement simplified runtime with typed memory, observable stack, and `IOutputStatement[]` as execution return type.
>
> **Key Insight:** The runtime is a function: `execute(ICodeStatement[]) → IOutputStatement[]`

---

## Phase 1: Core Infrastructure

### 1.1 Create Typed Memory Interfaces

**Files to Create:**
- `src/runtime/memory/IMemoryEntry.ts`
- `src/runtime/memory/MemoryTypes.ts`

**Tasks:**
- [x] Define `IMemoryEntry<T, V>` base interface
- [x] Define `TimerState`, `RoundState` shapes
- [x] Define `MemoryTypeMap` for type registry
- [x] Add subscription support to memory entries

**Acceptance:**
- TypeScript compiles with strict mode
- Memory types are discriminated unions

---

### 1.2 Create Typed Memory Implementations

**Files to Create:**
- `src/runtime/memory/TimerMemory.ts`
- `src/runtime/memory/RoundMemory.ts`
- `src/runtime/memory/FragmentMemory.ts`

**Tasks:**
- [x] Implement `TimerMemory` with spans/duration/direction
- [x] Implement `RoundMemory` with current/total
- [x] Implement `FragmentMemory` for inherited fragments
- [x] Add `subscribe()` and disposal notification methods

**Acceptance:**
- Unit tests pass for each memory type
- Subscribers receive typed updates

---

### 1.3 Add Observable Stack

**Files to Modify:**
- `src/runtime/RuntimeStack.ts`
- `src/runtime/contracts/IRuntimeStack.ts`

**Tasks:**
- [x] Add `subscribe(listener): Unsubscribe` to interface
- [x] Emit `{ type: 'push', block, depth }` on push
- [x] Emit `{ type: 'pop', block, depth }` on pop
- [x] Return current stack snapshot to new subscribers via `initial` event

**Acceptance:**
- Stack changes trigger subscriber callbacks
- Multiple subscribers receive independent notifications

---

## Phase 2: Block Integration

### 2.1 Add Memory Map to RuntimeBlock

**Files to Modify:**
- `src/runtime/RuntimeBlock.ts`
- `src/runtime/contracts/IRuntimeBlock.ts`

**Tasks:**
- [x] Add `private memoryMap: Map<MemoryType, IMemoryEntry<any, any>>`
- [x] Implement `hasMemory<T>(type: T): boolean`
- [x] Implement `getMemory<T>(type: T): MemoryTypeMap[T] | undefined`
- [x] Implement `getMemoryTypes(): MemoryType[]`
- [x] Add `protected setMemory<T>(type, entry)` for behaviors

**Acceptance:**
- Blocks can store and retrieve typed memory
- Consumer code can scan blocks for memory types

---

### 2.2 Lifecycle Refinement (Mount/Next/Unmount)

**Files to Modify:**
- `src/runtime/RuntimeBlock.ts`
- `src/runtime/contracts/IRuntimeBlock.ts`

**Tasks:**
- [x] Move event registration from `constructor` to `mount()`
- [x] Implement `next()` to handle manual progression and timer completion
- [x] Implement `unmount()` to emit 'unmount' event
- [x] Update `unmount()` to complete/dispose all block memory observables
- [x] Ensure `unmount()` cleans up event subscriptions (move from dispose)

**Acceptance:**
- Events are only handled when block is mounted
- Observables complete when block unmounts
- 'unmount' event is emitted on pop

---

### 2.3 Explicit next() in Lifecycle

**Files to Modify:**
- `src/runtime/ScriptRuntime.ts`

**Tasks:**
- [x] Ensure `popBlock()` calls `parent.next()` after unmount/dispose
- [x] Remove redundant `next()` calls from behaviors
- [x] Add lifecycle documentation to IRuntimeBlock

**Acceptance:**
- Pop → unmount → dispose → parent.next() order is guaranteed
- Single source of truth for lifecycle

---

### 2.4 Fragment Inheritance (Deferred)

**Files to Modify:**
- `src/runtime/RuntimeBlock.ts`
- `src/runtime/contracts/IRuntimeBlock.ts`

**Tasks:**
- [ ] Add `getInheritedFragments(): ICodeFragment[]` - returns fragment memory
- [ ] Add `receiveInheritedFragments(fragments): void` - merges with own
- [ ] Update `ScriptRuntime.pushBlock()` to pass inherited fragments

**Acceptance:**
- Child blocks receive parent's inherited fragments
- Round context flows from parent to child

---

### 2.5 Output Statement Emission (NEW)

**Files to Create:**
- `src/core/models/OutputStatement.ts` ✅

**Files to Modify:**
- `src/core/models/CodeFragment.ts` ✅
- `src/runtime/contracts/IScriptRuntime.ts` ✅
- `src/runtime/contracts/IRuntimeStack.ts` ✅ (added `Unsubscribe` type)
- `src/runtime/ScriptRuntime.ts` ✅
- `src/runtime/compiler/fragments/*.ts` ✅ (all 10 fragment classes updated with `origin: 'parser'`)

**Tasks:**
- [x] Create `IOutputStatement` interface extending `ICodeStatement`
- [x] Add `OutputStatementType` enum (segment, completion, milestone, label, metric)
- [x] Add `origin` field to `ICodeFragment` interface
- [x] Add `subscribeToOutput(listener): Unsubscribe` to `IScriptRuntime`
- [x] Add `getOutputStatements(): IOutputStatement[]` to `IScriptRuntime`
- [x] Update `ScriptRuntime.popBlock()` to emit `IOutputStatement`
- [x] Notify subscribers when output statements are created
- [x] Write tests for output subscription flow
- [x] Add `origin: 'parser'` to all fragment classes
- [x] Write tests for fragment origin marking

**Acceptance:**
- ✅ Runtime emits `IOutputStatement` on every block unmount
- ✅ Subscribers receive output statements with timing and fragments
- ✅ Fragments have origin tracking (parser/compiler/runtime/user)

### 3.1 Migrate Timer Behaviors to TimerMemory

**Files to Modify:**
- `src/runtime/behaviors/TimerBehavior.ts`
- `src/runtime/behaviors/BoundTimerBehavior.ts`

**Files to Remove:**
- `src/runtime/behaviors/TimerStateManager.ts`
- `src/runtime/behaviors/TimerPauseResumeBehavior.ts`

**Tasks:**
- [ ] Update `TimerBehavior.mount()` to create `TimerMemory` on block
- [ ] Update `TimerBehavior.onTick()` to mutate memory and notify
- [ ] Remove behaviors that only updated memory state

**Acceptance:**
- Timer state accessible via `block.getMemory('timer')`
- UI can subscribe to timer changes

---

### 3.2 Migrate Round Behaviors to RoundMemory

**Files to Modify:**
- `src/runtime/behaviors/BoundLoopBehavior.ts`
- `src/runtime/behaviors/RoundPerLoopBehavior.ts`

**Files to Remove:**
- `src/runtime/behaviors/RoundDisplayBehavior.ts`
- `src/runtime/behaviors/ChildIndexBehavior.ts`
- `src/runtime/behaviors/ReentryIndexBehavior.ts`

**Tasks:**
- [ ] Update loop behaviors to create `RoundMemory` on block
- [ ] Update round increment to mutate memory and notify
- [ ] Remove display-only behaviors

**Acceptance:**
- Round state accessible via `block.getMemory('round')`
- UI can subscribe to round changes

---

### 3.3 Simplify Completion Behaviors

**Files to Keep:**
- `src/runtime/behaviors/CompletionBehavior.ts`
- `src/runtime/behaviors/PopOnNextBehavior.ts`
- `src/runtime/behaviors/PopOnEventBehavior.ts`

**Files to Remove:**
- `src/runtime/behaviors/SinglePassBehavior.ts` (merge into PopOnNextBehavior)

**Tasks:**
- [ ] Verify completion behaviors work with new memory system
- [ ] Consolidate single-pass logic if possible

---

## Phase 4: Cleanup

### 4.1 Remove Legacy Memory System

**Files to Remove:**
- `src/runtime/RuntimeMemory.ts`
- `src/runtime/contracts/IRuntimeMemory.ts`
- `src/runtime/contracts/IMemoryReference.ts`
- `src/runtime/BlockContext.ts`
- `src/runtime/contracts/IBlockContext.ts`

**Tasks:**
- [ ] Find all `RuntimeMemory` imports and remove
- [ ] Find all `BlockContext` usages and migrate
- [ ] Update `ScriptRuntime` to remove memory dependency

**Acceptance:**
- No references to old memory system
- Build passes without errors

---

### 4.2 Update UI Bindings

**Files to Modify:**
- `src/clock/hooks/useWorkoutStack.ts` (if exists)
- `src/components/` (timer/round displays)

**Tasks:**
- [ ] Update UI to use `stack.subscribe()`
- [ ] Update displays to use `block.getMemory().subscribe()`
- [ ] Remove memory search patterns

**Acceptance:**
- UI updates reactively to stack/memory changes
- No memory search calls in UI code

---

### 4.3 Update Tests

**Files to Modify:**
- `src/runtime/__tests__/*.ts`
- `src/runtime/behaviors/__tests__/*.ts`

**Tasks:**
- [ ] Update tests to use new memory API
- [ ] Add tests for stack subscription
- [ ] Add tests for memory inheritance
- [ ] Remove tests for deleted behaviors

---

## Summary Checklist

| Phase | Tasks | Status |
|-------|-------|--------|
| **1.1** Typed Memory Interfaces | 4 | ✅ |
| **1.2** Memory Implementations | 4 | ✅ |
| **1.3** Observable Stack | 4 | ✅ |
| **2.1** Block Memory Map | 5 | ✅ |
| **2.2** Lifecycle Refinement | 5 | ✅ |
| **2.3** Explicit next() | 3 | ✅ |
| **2.4** Fragment Inheritance | 3 | ⏸️ |
| **2.5** Output Statement Emission | 8 | ✅ |
| **3.1** Timer Migration | 3 | ⬜ |
| **3.2** Round Migration | 3 | ⬜ |
| **3.3** Completion Simplify | 2 | ⬜ |
| **4.1** Remove Legacy | 4 | ⬜ |
| **4.2** Update UI | 3 | ⬜ |
| **4.3** Update Tests | 4 | ⬜ |

**Total Tasks:** ~53

