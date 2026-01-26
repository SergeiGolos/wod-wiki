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

| From (Current) | To (Proposed) |
|----------------|---------------|
| Global `RuntimeMemory` with refs | Block-owned `IMemoryEntry<T>` |
| Passive stack | Observable stack with subscribe() |
| 34+ behavior classes | Minimal core behaviors |
| Implicit lifecycle | Explicit mount → next → unmount |

### Key Interfaces

```typescript
// Observable Stack
stack.subscribe((event, blocks) => { ... });

// Typed Block Memory
block.hasMemory('timer');
block.getMemory('timer').subscribe(state => { ... });

// Fragment Inheritance
parent.getInheritedFragments() → child
```

### File Impact

| Action | Count |
|--------|-------|
| Create | 6 files |
| Modify | 11 files |
| Remove | ~15 files |
| Keep | 15+ files |

---

## Phases

1. **Core Infrastructure** - Typed memory interfaces, observable stack
2. **Block Integration** - Memory map on blocks, fragment inheritance
3. **Behavior Migration** - Timer/round behaviors use new memory
4. **Cleanup** - Remove legacy memory system, update UI

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
