# Runtime Simplification Project

> **Goal:** Simplified, extensible runtime with observable stack and typed memory

---

## Documents

| Document | Purpose |
|----------|---------|
| [01-drift-analysis.md](./01-drift-analysis.md) | Gap analysis: current vs proposed |
| [02-task-breakdown.md](./02-task-breakdown.md) | Phased implementation tasks |
| [03-files-inventory.md](./03-files-inventory.md) | Files to create/modify/remove |

---

## Quick Summary

### What's Changing

| From (Current) | To (Proposed) | Status |
|----------------|---------------|--------|
| Global `RuntimeMemory` with refs | Block-owned `IMemoryEntry<T>` | 🟡 Interfaces done, integration pending |
| Passive stack | Observable stack with subscribe() | ✅ Implemented |
| 34+ behavior classes | Minimal core behaviors | ⬜ Pending |
| Implicit lifecycle | Explicit mount → next → unmount | ⬜ Pending |

### Key Interfaces

```typescript
// Observable Stack (Implemented)
stack.subscribe((event) => { 
  // event.type: 'push' | 'pop' | 'initial'
  // event.block: IRuntimeBlock
  // event.depth: number
});

// Typed Block Memory (Interfaces ready, block integration pending)
block.hasMemory('timer');
block.getMemory('timer').subscribe(state => { ... });

// Fragment Inheritance (Pending)
parent.getInheritedFragments() → child
```

### File Impact

| Action | Count | Notes |
|--------|-------|-------|
| Create | 6 files | ✅ 5 complete (memory) |
| Modify | 11 files | ✅ 2 complete (stack interface + impl) |
| Remove | ~15 files | ⬜ Phase 4 |
| Keep | 15+ files | - |

---

## Phases

1. **Core Infrastructure** ✅ - Typed memory interfaces, observable stack
2. **Block Integration** ⬜ - Memory map on blocks, fragment inheritance
3. **Behavior Migration** ⬜ - Timer/round behaviors use new memory
4. **Cleanup** ⬜ - Remove legacy memory system, update UI

---

## Implemented Files (Phase 1)

### Memory System
- [`src/runtime/memory/IMemoryEntry.ts`](file:///x:/wod-wiki/src/runtime/memory/IMemoryEntry.ts) - Base interface
- [`src/runtime/memory/MemoryTypes.ts`](file:///x:/wod-wiki/src/runtime/memory/MemoryTypes.ts) - TimerState, RoundState, FragmentState
- [`src/runtime/memory/BaseMemoryEntry.ts`](file:///x:/wod-wiki/src/runtime/memory/BaseMemoryEntry.ts) - Abstract base class
- [`src/runtime/memory/TimerMemory.ts`](file:///x:/wod-wiki/src/runtime/memory/TimerMemory.ts) - Timer implementation
- [`src/runtime/memory/RoundMemory.ts`](file:///x:/wod-wiki/src/runtime/memory/RoundMemory.ts) - Round implementation
- [`src/runtime/memory/FragmentMemory.ts`](file:///x:/wod-wiki/src/runtime/memory/FragmentMemory.ts) - Fragment inheritance

### Observable Stack
- [`src/runtime/contracts/IRuntimeStack.ts`](file:///x:/wod-wiki/src/runtime/contracts/IRuntimeStack.ts) - Updated with subscribe()
- [`src/runtime/RuntimeStack.ts`](file:///x:/wod-wiki/src/runtime/RuntimeStack.ts) - Observable implementation

### Tests
- [`src/runtime/memory/__tests__/MemoryEntries.test.ts`](file:///x:/wod-wiki/src/runtime/memory/__tests__/MemoryEntries.test.ts)
- [`src/runtime/memory/__tests__/RuntimeStack.test.ts`](file:///x:/wod-wiki/src/runtime/memory/__tests__/RuntimeStack.test.ts)

---

## Design Decisions

| Area | Decision |
|------|----------|
| Parser/UI | **Stable** - minimal changes |
| Fragment inheritance | **Runtime job** - parents pass to children |
| Active blocks | **All on stack** are active |
| Metrics | **Raw data only** - no aggregation |
| Persistence | **Separate concern** - not in runtime |

---

## Related Brain Artifacts

- [runtime-core-prd.md](file:///C:/Users/serge/.gemini/antigravity/brain/570c889d-59ed-425f-9b53-828c9bc133e9/runtime-core-prd.md) - Initial brainstorming
- [runtime-prototype-proposal.md](file:///C:/Users/serge/.gemini/antigravity/brain/570c889d-59ed-425f-9b53-828c9bc133e9/runtime-prototype-proposal.md) - Detailed design

