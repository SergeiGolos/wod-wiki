# Runtime Behavior System - Next Steps

> **Status:** ✅ Phase 3 Complete, Ready for Phase 4 Cleanup  
> **Last Updated:** 2026-01-29

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

**Key Files:**
- Behaviors: `src/runtime/behaviors/`
- Design Doc: `docs/runtime-project/05-aspect-based-behaviors.md`

---

### Phase 2: UI Memory Hooks ✅

**React hooks implemented** for reactive UI updates:

| Hook | Purpose | Animation |
|------|---------|-----------|
| `useBlockMemory<T>` | Generic memory access | - |
| `useTimerState` | Timer state subscription | - |
| `useRoundState` | Round state subscription | - |
| `useDisplayState` | Display state subscription | - |
| `useTimerDisplay` | Formatted timer values | 60fps |
| `useRoundDisplay` | Formatted round values | - |

**Key Files:**
- Hooks: `src/runtime/hooks/useBlockMemory.ts`
- Index: `src/runtime/hooks/index.ts`
- Tests: `src/runtime/hooks/__tests__/useBlockMemory.test.ts`

---

### Phase 3: Strategy Migration ✅

**All strategies migrated** to use aspect-based behaviors:

| Strategy | Location | Status |
|----------|----------|--------|
| IntervalLogicStrategy (EMOM) | `strategies/logic/` | ✅ |
| AmrapLogicStrategy | `strategies/logic/` | ✅ |
| WorkoutRootStrategy | `strategies/` | ✅ |
| IdleBlockStrategy | `strategies/` | ✅ |
| EffortFallbackStrategy | `strategies/fallback/` | ✅ |
| GenericTimerStrategy | `strategies/components/` | ✅ |
| GenericLoopStrategy | `strategies/components/` | ✅ |
| GenericGroupStrategy | `strategies/components/` | ✅ |
| SoundStrategy | `strategies/enhancements/` | ✅ |
| HistoryStrategy | `strategies/enhancements/` | ✅ |
| ChildrenStrategy | `strategies/enhancements/` | ✅ |

**Legacy behaviors deprecated:**
- `TimerBehavior` → Use `TimerInitBehavior` + `TimerTickBehavior`
- `BoundLoopBehavior` → Use `RoundInitBehavior` + `RoundAdvanceBehavior`
- `SinglePassBehavior` → Use `PopOnNextBehavior`

---

## Test Results

```
499 pass | 10 skip | 0 fail
```

Run all tests:
```bash
bun run test
```

---

## Next Steps (Phase 4: Cleanup)

### 4.1 Remove Legacy Memory System (Optional)

**Priority:** Low | **Effort:** 2-3 hours

- [ ] Remove `RuntimeMemory.ts` (if no longer referenced)
- [ ] Remove `BlockContext.ts` memory wrapper
- [ ] Update any remaining legacy imports

**Note:** Legacy behaviors are maintained as stubs for backward compatibility.

---

### 4.2 Component Integration (Optional)

**Priority:** Low | **Effort:** 1-2 hours

Update UI components to use new behavior-based hooks:
- `ClockAnchor.tsx` → use `useTimerDisplay`
- `DigitalClock.tsx` → use `useTimerDisplay`
- Create demo stories showing new hook usage

**Note:** Existing components work with legacy hooks.

---

## Quick Reference

### Run Tests
```bash
# All tests
bun run test

# Behavior tests only
bun test src/runtime/behaviors/__tests__ --preload ./tests/unit-setup.ts

# Hook tests only
bun test src/runtime/hooks --preload ./tests/unit-setup.ts

# Strategy tests only
bun test src/runtime/compiler/strategies --preload ./tests/unit-setup.ts
```

### Key Documentation
- [Aspect-Based Behaviors Design](./05-aspect-based-behaviors.md)
- [Behavior Interface Redesign](./04-behavior-interface-redesign.md)
- [Branch Review](./BRANCH-REVIEW.md)

---

## Definition of Done

Phase 3 is complete when:
- [x] All strategies migrated to aspect behaviors
- [x] Integration tests covering all patterns
- [x] UI hooks for memory state observation
- [x] Legacy behaviors deprecated with @deprecated JSDoc
- [x] All core documentation updated
- [x] All tests passing (499 pass, 10 skip, 0 fail)
