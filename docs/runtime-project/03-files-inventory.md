# Runtime Simplification: Files Inventory

> **Purpose:** Track all files affected by the runtime simplification

---

## Files to CREATE

| File                                   | Purpose                     | Phase | Status |
| -------------------------------------- | --------------------------- | ----- | ------ |
| `src/runtime/memory/IMemoryEntry.ts`   | Base typed memory interface | 1.1   | ✅ Created |
| `src/runtime/memory/MemoryTypes.ts`    | Type registry and unions    | 1.1   | ✅ Created |
| `src/runtime/memory/BaseMemoryEntry.ts` | Abstract base class        | 1.2   | ✅ Created |
| `src/runtime/memory/TimerMemory.ts`    | Timer state implementation  | 1.2   | ✅ Created |
| `src/runtime/memory/RoundMemory.ts`    | Round state implementation  | 1.2   | ✅ Created |
| `src/runtime/memory/FragmentMemory.ts` | Fragment inheritance        | 1.2   | ✅ Created |
| `src/runtime/memory/index.ts`          | Barrel export               | 1.2   | ⬜ Pending |

---

## Files to MODIFY

### Core Runtime

| File               | Changes                                     | Phase    | Status    |
| ------------------ | ------------------------------------------- | -------- | --------- |
| `RuntimeStack.ts`  | Add subscribe()                             | 1.3      | ✅ Done    |
| `IRuntimeStack.ts` | Add subscribe to interface                  | 1.3      | ✅ Done    |
| `RuntimeBlock.ts`  | Add memory map + methods                    | 2.1, 2.2 | ⬜ Pending |
| `IRuntimeBlock.ts` | Add memory + inheritance interface          | 2.1, 2.2 | ⬜ Pending |
| `ScriptRuntime.ts` | Fragment inheritance on push, remove memory | 2.2, 4.1 | ⬜ Pending |

### Behaviors (Keep + Modify)

| File                      | Changes                      | Phase |
| ------------------------- | ---------------------------- | ----- |
| `TimerBehavior.ts`        | Use block.setMemory('timer') | 3.1   |
| `BoundTimerBehavior.ts`   | Use block.setMemory('timer') | 3.1   |
| `BoundLoopBehavior.ts`    | Use block.setMemory('round') | 3.2   |
| `RoundPerLoopBehavior.ts` | Use block.setMemory('round') | 3.2   |
| `CompletionBehavior.ts`   | Verify with new system       | 3.3   |
| `PopOnNextBehavior.ts`    | Verify with new system       | 3.3   |

---

## Files to REMOVE

### Memory System (Phase 4.1)

| File                            | Lines | Reason                         |
| ------------------------------- | ----- | ------------------------------ |
| `RuntimeMemory.ts`              | 95    | Replaced by block-owned memory |
| `contracts/IRuntimeMemory.ts`   | ~60   | Interface replaced             |
| `contracts/IMemoryReference.ts` | ~100  | Untyped refs replaced          |
| `BlockContext.ts`               | ~150  | Memory wrapper removed         |
| `contracts/IBlockContext.ts`    | ~80   | Interface removed              |

### Timer Behaviors (Phase 3.1)

| File | Lines | Reason |
|------|-------|--------|
| `TimerStateManager.ts` | ~130 | State in TimerMemory |
| `TimerPauseResumeBehavior.ts` | ~70 | Pause/resume in memory |
| `IntervalTimerRestartBehavior.ts` | ~60 | Interval logic simplified |
| `TransitionTimingBehavior.ts` | ~40 | Not needed |

### Round Behaviors (Phase 3.2)

| File | Lines | Reason |
|------|-------|--------|
| `RoundDisplayBehavior.ts` | ~80 | Display from memory |
| `ChildIndexBehavior.ts` | ~50 | Index in RoundMemory |
| `ReentryIndexBehavior.ts` | ~25 | Index in RoundMemory |

### Other Behaviors (Evaluate)

| File | Lines | Decision |
|------|-------|----------|
| `SinglePassBehavior.ts` | ~40 | **Remove** - merge into PopOnNextBehavior |
| `IntervalWaitingBehavior.ts` | ~50 | **Evaluate** - may be needed |
| `LapTimerBehavior.ts` | ~90 | **Evaluate** - special case |

---

## Files to KEEP (No Changes)

### Core Behaviors

| File | Reason |
|------|--------|
| `CompletionBehavior.ts` | Core lifecycle |
| `PopOnNextBehavior.ts` | Core lifecycle |
| `PopOnEventBehavior.ts` | Core lifecycle |
| `SoundBehavior.ts` | Distinct concern |
| `ChildRunnerBehavior.ts` | Child execution |

### Compiler (Untouched)

| File | Reason |
|------|--------|
| `JitCompiler.ts` | Compiler untouched |
| `RuntimeFactory.ts` | Factory untouched |
| `BlockBuilder.ts` | Block creation |
| All strategies | Compilation logic |

### Events (Untouched)

| File | Reason |
|------|--------|
| `StackEvents.ts` | Keep existing events |
| `events/*.ts` | Event types |

---

## Summary

| Category | Create | Modify | Remove | Keep |
|----------|--------|--------|--------|------|
| Memory | 6 (✅ 5) | 0 | 5 | 0 |
| Stack | 0 | 2 (✅ 2) | 0 | 0 |
| Block | 0 | 2 | 0 | 0 |
| Runtime | 0 | 1 | 0 | 0 |
| Behaviors | 0 | 6 | 7-10 | 5+ |
| Compiler | 0 | 0 | 0 | 8+ |
| **Total** | **6** | **11** | **~15** | **15+** |

---

## Phase 1 Tests

| Test File | Coverage |
|-----------|----------|
| `src/runtime/memory/__tests__/MemoryEntries.test.ts` | TimerMemory, RoundMemory, FragmentMemory |
| `src/runtime/memory/__tests__/RuntimeStack.test.ts` | Observable stack, subscribe, events |
