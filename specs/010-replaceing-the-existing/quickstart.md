# Clock Memory Visualization - Planning Phase Quickstart

**Feature**: 010-replaceing-the-existing  
**Phase**: 1 - Design & Contracts  
**Date**: October 6, 2025  
**Status**: Complete

## What This Feature Does

Replace standalone clock stories with integrated clock + memory visualization stories. Users will see timer displays alongside their runtime memory state with interactive hover highlighting.

## Key Decisions Made

### Research Phase (Phase 0)

1. **Interaction Pattern**: Hover-based highlighting (Option A)
   - Rationale: Consistent with Runtime visualization, no cluttered controls

2. **Layout**: Side-by-side panels (Option A)
   - Rationale: Simultaneous view, no switching required, best for correlation

3. **Memory Scope**: Timer-specific only (Option A)
   - Rationale: Focused scope, avoids complexity, meets all requirements

4. **Multi-Timer Stories**: One timer per story (Option A)
   - Rationale: Simple, clear, extensible later if needed

### Design Phase (Phase 1)

**Component Architecture**:
- `TimerMemoryVisualization`: New component for memory display
- `ClockMemoryStory`: New wrapper for story integration
- `TimerTestHarness`: Enhanced to expose memory references
- `ClockAnchor`, `TimeDisplay`: No changes (reused as-is)

**Data Model**: 5 core interfaces defined
- `ClockMemoryStoryConfig`: Story configuration
- `TimerMemoryState`: Memory snapshot
- `TimerMemoryVisualizationProps`: Component props
- `ClockMemoryHarnessResult`: Enhanced harness result
- `TimeSpan`: Existing (reused)

**Contracts**: 2 contract documents
- `component-contracts.md`: Component behaviors, error handling, performance
- `integration-contracts.md`: Story structure, validation, testing

## Critical Information for Implementation

### Component Contracts Summary

**TimerMemoryVisualization**:
- Subscribe to `timeSpansRef` and `isRunningRef`
- Display time spans array, running state, block key
- Handle hover callbacks and highlight prop
- Handle missing memory gracefully
- Performance: < 10ms render, < 16ms update

**ClockMemoryStory**:
- Use `TimerTestHarness` for setup
- Render side-by-side panels (clock left, memory right)
- Manage hover state ('clock', 'memory', or null)
- Display title and description above panels
- Cleanup runtime on unmount

**Enhanced TimerTestHarness**:
- Create runtime synchronously in useMemo (avoid race condition)
- Find and return memory references for time spans and running state
- Generate time spans from config (completed or running)
- Validate config before use

### Story Implementation

**File Structure**:
```
stories/clock/
├── ClockMemoryStory.tsx          # Main wrapper component
├── TimerMemoryVisualization.tsx  # Memory display component
├── RunningTimers.stories.tsx     # Running timer stories
├── CompletedTimers.stories.tsx   # Completed timer stories
└── EdgeCases.stories.tsx         # Edge case stories
```

**Story Configuration**:
```typescript
{
  durationMs: 5000,              // > 0, realistic
  isRunning: true,               // boolean
  timeSpans: undefined,          // optional, generated if omitted
  title: "Five Second Timer",    // non-empty, descriptive
  description: "A timer that..." // non-empty, explains scenario
}
```

**Validation Rules**:
- `durationMs` > 0
- `isRunning` is boolean
- `title` and `description` non-empty
- `timeSpans` (if provided) array of valid TimeSpan objects

### Testing Strategy

**Contract Tests** (TDD approach):
1. Write failing tests first
2. Implement component to minimum viable
3. Run tests, verify failures
4. Implement full behavior
5. Run tests, verify pass

**Test Files**:
- `TimerMemoryVisualization.contract.test.tsx` - Component behavior
- `ClockMemoryStory.contract.test.tsx` - Story wrapper behavior
- `TimerTestHarness.contract.test.tsx` - Enhanced harness behavior
- `ClockMemoryStories.integration.test.tsx` - Story integration

**Key Test Scenarios**:
- Memory subscription and cleanup
- Hover highlighting bidirectionality
- Missing memory error handling
- Time span generation (running vs completed)
- Runtime disposal on unmount

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Story Load Time | < 1s | Time to interactive |
| Component Render | < 10ms | Individual component |
| Memory Update | < 16ms | Re-render after memory change |
| Hover Feedback | < 100ms | Visual response time |
| Hover Callback | < 5ms | Callback execution |

### Story Migration

**Old Stories to Replace**:
- `ClockAnchor.stories.tsx` → Multiple new stories by category
- All standalone timer stories

**Migration Checklist**:
- [ ] Identify all scenarios in old stories
- [ ] Create equivalent new stories
- [ ] Visual comparison (screenshot diff)
- [ ] Verify behavior equivalence
- [ ] Archive old story files to `__archive__/`
- [ ] Update any dependent imports

**Story Count Target**: 10-15 total stories

### Story Categories

```
Clock/
├── Running Timers/
│   ├── Short Duration (< 1 min)
│   ├── Medium Duration (1-10 min)
│   └── Long Duration (> 10 min)
├── Completed Timers/
│   ├── Short Duration
│   ├── Medium Duration
│   └── Long Duration
└── Edge Cases/
    ├── Minimum Duration (1 second)
    ├── Maximum Duration (24 hours)
    └── Multiple Time Spans
```

## Constitutional Compliance

✅ **Component-First**: New components (TimerMemoryVisualization, ClockMemoryStory)  
✅ **Storybook-Driven**: Multiple stories demonstrate all scenarios  
✅ **Parser-First**: N/A (no syntax changes)  
✅ **TypeScript Strict**: All interfaces fully typed  
✅ **Performance**: Targets defined and testable  
✅ **Testing**: TDD approach with contract tests  
✅ **Accessibility**: Proper labels, color contrast, keyboard support

## File Locations

**Specification**:
- Feature spec: `specs/010-replaceing-the-existing/spec.md`
- Research: `specs/010-replaceing-the-existing/research.md`
- Data model: `specs/010-replaceing-the-existing/data-model.md`
- Contracts: `specs/010-replaceing-the-existing/contracts/`
- This file: `specs/010-replaceing-the-existing/quickstart.md`

**Implementation** (to be created):
- Components: `src/clock/` or `src/components/`
- Stories: `stories/clock/`
- Tests: `tests/stories/` and component-level test files

**Branch**: `010-replaceing-the-existing`

## Dependencies

**Existing Code** (no changes required):
- `ClockAnchor` - Clock display component
- `TimeDisplay` - Time unit rendering
- `useTimerElapsed` - Hook for elapsed time calculation
- `useMemorySubscription` - Hook for memory updates

**Existing Types** (reused):
- `TimeSpan` - Start/stop timestamp pair
- `TypedMemoryReference<T>` - Memory reference type
- `RuntimeBlock` - Block with timer behavior
- `ScriptRuntime` - Runtime execution

**New Code** (to be implemented):
- `TimerMemoryVisualization` component
- `ClockMemoryStory` wrapper component
- Enhanced `TimerTestHarness` with memory refs
- Config validation logic
- Story files (10-15 stories)
- Contract tests

## Implementation Order

**Recommended Sequence**:

1. **Phase 2A: Component Development**
   - Write contract tests (failing)
   - Implement `TimerMemoryVisualization`
   - Implement `ClockMemoryStory`
   - Enhance `TimerTestHarness`
   - Make all contract tests pass

2. **Phase 2B: Story Creation**
   - Create first story (running timer)
   - Verify in Storybook
   - Create remaining stories by category
   - Add validation logic

3. **Phase 2C: Integration & Testing**
   - Write integration tests
   - Run all tests (unit + integration)
   - Visual regression testing
   - Accessibility testing

4. **Phase 2D: Migration & Cleanup**
   - Compare old vs new stories
   - Archive old story files
   - Update documentation
   - Final validation

**Estimated Effort**: 6-8 hours total (2h per phase)

## Known Risks & Mitigations

### Risk: Race Condition in Memory Initialization

**Description**: If memory not initialized before render, components show placeholder  
**Mitigation**: Use useMemo (synchronous) instead of useEffect (async) in TimerTestHarness  
**Status**: Addressed in design (learned from previous clock stories fix)

### Risk: Hover State Stuck

**Description**: Hover enter without matching leave, highlight never clears  
**Mitigation**: Ensure cleanup on unmount, test unhover scenarios explicitly  
**Status**: Addressed in contracts (invariants section)

### Risk: Memory Disposed While Displayed

**Description**: Block disposed but story still mounted, references invalid  
**Mitigation**: Handle undefined memory gracefully, show error message  
**Status**: Addressed in contracts (error handling section)

### Risk: Story Count Scope Creep

**Description**: Too many stories (>20), maintenance burden  
**Mitigation**: Target 10-15 stories, focus on representative scenarios  
**Status**: Addressed in integration contracts (story count target)

## Questions & Answers

### Q: Do we need to modify existing clock components?

**A**: No. `ClockAnchor` and `TimeDisplay` work as-is. Only new components needed are `TimerMemoryVisualization` and `ClockMemoryStory`.

### Q: How do we avoid the race condition that broke clock stories before?

**A**: Use `useMemo` for runtime initialization in `TimerTestHarness`. This runs synchronously before render, ensuring memory is ready. (See `contracts/component-contracts.md` section 3).

### Q: Do we show all runtime memory or just timer memory?

**A**: Timer-specific only (time spans and running state). This keeps scope focused and UI clean. (See `research.md` clarification 3).

### Q: How many stories should we create?

**A**: Target 10-15 stories covering running timers, completed timers, and edge cases. See category structure in integration contracts.

### Q: What happens if memory is missing or invalid?

**A**: Display error message, don't crash. Contract tests verify graceful error handling. (See `contracts/component-contracts.md` section 1.7).

### Q: How do we test hover interactions?

**A**: Use Storybook play functions and contract tests. Simulate hover events, assert highlight state updates. (See `contracts/integration-contracts.md` section 5).

### Q: What's the performance requirement?

**A**: Story load < 1s, render < 10ms, memory update < 16ms, hover response < 100ms. Measure with profiling. (See performance contracts section).

## Next Steps

**You are here**: Planning Phase (Phase 1) Complete

**Next**: Execute Phase 2 - Task Planning Approach

1. Review this quickstart
2. Review contracts for any gaps
3. Document task planning approach in plan.md
4. Update agent context with `update-agent-context.ps1`
5. Begin implementation with TDD approach

**Do NOT proceed to implementation yet** - Complete Phase 2 planning first.

## Success Criteria

This feature is successfully planned when:

✅ All clarifications resolved (research.md complete)  
✅ Data model defined (data-model.md complete)  
✅ Component contracts specified (contracts/component-contracts.md complete)  
✅ Integration contracts specified (contracts/integration-contracts.md complete)  
✅ Quickstart documented (this file complete)  
✅ Constitutional compliance verified  
✅ Agent context updated  

Next: Phase 2 planning to document task approach (do not execute tasks).

---

**Agent Instructions**: You have completed Phase 1. Update this file with any additional context discovered during planning. Then proceed to Phase 2 to document the task planning approach.
