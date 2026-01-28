# Runtime Behavior System - Next Steps

> **Status:** ✅ Phase 1 Complete  
> **Last Updated:** 2026-01-28

## Completed Work

### Phase 1: Aspect-Based Behaviors ✅

**19 behaviors implemented** across 7 aspects:

| Aspect | Behaviors | Tests |
|--------|-----------|-------|
| Time | TimerInit, TimerTick, TimerCompletion, TimerPause, TimerOutput | ✅ |
| Iteration | RoundInit, RoundAdvance, RoundCompletion, RoundDisplay, RoundOutput | ✅ |
| Completion | PopOnNext, PopOnEvent | ✅ |
| Display | DisplayInit | ✅ |
| Children | ChildRunner | ✅ |
| Output | SegmentOutput, HistoryRecord, SoundCue | ✅ |
| Controls | ControlsInit | ✅ |

**Test Results:** 40 tests passing

**Key Files:**
- Behaviors: `src/runtime/behaviors/`
- Design Doc: `docs/runtime-project/05-aspect-based-behaviors.md`
- Proof of Concept: `EffortFallbackStrategy.ts` (migrated)

---

## Next Steps Task Plans

### 1. [Migrate Strategies](./tasks/migrate-strategies-task.md)

**Priority:** High | **Effort:** 2-3 hours

Migrate remaining strategies to use aspect-based behaviors:
- Timer Strategies (Interval, EMOM, Tabata, AMRAP)
- Loop Strategies (Loop, Rounds, ForTime)
- Root & Utility Strategies

**Key Deliverables:**
- All strategies using behavior composition
- Old compound behaviors deprecated
- Documentation updated

---

### 2. [Integration Tests](./tasks/integration-tests-task.md)

**Priority:** Medium | **Effort:** 1.5-2 hours

Create comprehensive integration tests for multi-behavior compositions:
- Timer block compositions
- Loop block compositions  
- Hybrid patterns (EMOM, Tabata, AMRAP)
- Edge cases and performance

**Key Deliverables:**
- 7 integration test files
- Reusable test helpers
- >80% coverage for behavior module

---

### 3. [UI Memory Observer](./tasks/ui-memory-observer-task.md)

**Priority:** Medium | **Effort:** 3-4 hours

Update UI to observe block memory state changes:
- Create memory change observables
- Implement React hooks for memory consumption
- Update timer, round, and control components
- Ensure reactive UI updates

**Key Deliverables:**
- `MemoryChangeBus` for state observation
- `useBlockMemory` React hook family
- Updated UI components
- Smooth 60fps timer display

---

## Recommended Execution Order

```mermaid
graph TD
    A[Phase 1: Behaviors ✅] --> B[Migrate Strategies]
    A --> C[Integration Tests]
    B --> D[UI Memory Observer]
    C --> D
    D --> E[Full System Integration]
```

**Parallel Tracks:**
- **Track A:** Migrate Strategies → Test migrated strategies
- **Track B:** Integration Tests → Can run alongside Track A

**Sequential Dependency:**
- UI Memory Observer depends on strategy migration for full testing

---

## Quick Reference

### Run Tests
```bash
# Behavior unit tests
npx vitest run src/runtime/behaviors/__tests__/AspectBehaviors.test.ts

# All runtime tests
npx vitest run src/runtime

# Specific strategy tests
npx vitest run src/runtime/compiler/strategies
```

### Key Documentation
- [Aspect-Based Behaviors Design](./05-aspect-based-behaviors.md)
- [Behavior Interface Redesign](./04-behavior-interface-redesign.md)
- [Implementation Plan](./implementation_plan.md)

---

## Definition of Done

Phase 2 is complete when:
- [ ] All strategies migrated to aspect behaviors
- [ ] Integration tests covering all patterns
- [ ] UI reactively displays memory state
- [ ] No performance regression
- [ ] All documentation updated
