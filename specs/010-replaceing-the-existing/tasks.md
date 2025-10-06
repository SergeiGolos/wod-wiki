# Tasks: Clock & Memory Visualization Stories

**Input**: Design documents from `X:\wod-wiki\specs\010-replaceing-the-existing\`
**Prerequisites**: ✅ plan.md, ✅ research.md, ✅ data-model.md, ✅ contracts/, ✅ quickstart.md

## Execution Flow
```
1. Load plan.md → Extract tech stack (TypeScript, React, Storybook, Vitest)
2. Load contracts/ → Generate contract test tasks
3. Load quickstart.md → Extract implementation phases and story categories
4. Generate tasks by phase:
   → Phase 3.2: Contract tests (TDD - must fail first)
   → Phase 3.3: Component implementation (make tests pass)
   → Phase 3.4: Story creation (10-15 stories across categories)
   → Phase 3.5: Integration tests and validation
   → Phase 3.6: Migration and cleanup
5. Apply task rules:
   → Contract tests can run in parallel [P] (different files)
   → Component implementations sequential (depend on tests)
   → Story files can run in parallel [P] (independent files)
   → Tests before implementation (TDD)
6. Validate completeness:
   ✅ All contracts have tests
   ✅ All components implemented
   ✅ All stories created (10-15 target)
   ✅ Integration tests cover key scenarios
   ✅ Migration plan executed
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- All paths are absolute from repository root

## Path Conventions (Single Project)
- **Components**: `src/clock/` (co-located with ClockAnchor)
- **Stories**: `stories/clock/` (co-located with test harness)
- **Test Harness**: `stories/clock/utils/` (enhanced version)
- **Contract Tests**: `tests/unit/` (component-level)
- **Integration Tests**: `tests/stories/` (story-level)
- **Archives**: `stories/clock/__archive__/` (old stories)

---

## Phase 3.1: Setup
- [ ] **T001** Verify project dependencies (React 18+, Storybook 9.1.10, Vitest, Tailwind CSS)
- [ ] **T002** Create archive directory `stories/clock/__archive__/` for old story migration
- [ ] **T003** [P] Review existing TimerTestHarness implementation in `stories/clock/utils/TimerTestHarness.tsx`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (Component Behavior)
- [ ] **T004** [P] Contract test for TimerMemoryVisualization in `tests/unit/TimerMemoryVisualization.contract.test.tsx`
  - Test: MUST subscribe to memory references on mount
  - Test: MUST unsubscribe on unmount
  - Test: MUST display time spans array correctly
  - Test: MUST display running state with visual indicator
  - Test: MUST invoke hover callback on mouse enter/leave
  - Test: MUST apply highlight styling when isHighlighted=true
  - Test: MUST handle missing memory gracefully
  - Expected: ALL TESTS FAIL (component doesn't exist yet)

- [ ] **T005** [P] Contract test for ClockMemoryStory in `tests/unit/ClockMemoryStory.contract.test.tsx`
  - Test: MUST render side-by-side panels (clock left, memory right)
  - Test: MUST manage hover state correctly (only one highlighted at a time)
  - Test: MUST highlight only one section at a time
  - Test: MUST display story metadata (title and description)
  - Test: MUST cleanup on unmount (dispose runtime)
  - Expected: ALL TESTS FAIL (component doesn't exist yet)

- [ ] **T006** [P] Contract test for enhanced TimerTestHarness in `tests/unit/TimerTestHarness.contract.test.tsx`
  - Test: MUST expose memory references in result
  - Test: MUST initialize memory before children render (useMemo, not useEffect)
  - Test: MUST generate correct time spans for completed timer (stop timestamp set)
  - Test: MUST generate correct time spans for running timer (stop timestamp undefined)
  - Test: MUST dispose block on unmount
  - Expected: PARTIAL FAILURES (harness exists but doesn't expose memory refs yet)

### Validation Tests
- [ ] **T007** [P] Config validation test in `tests/unit/ConfigValidation.test.tsx`
  - Test: MUST reject durationMs <= 0
  - Test: MUST reject non-boolean isRunning
  - Test: MUST reject empty title
  - Test: MUST reject empty description
  - Test: MUST validate timeSpans array structure (if provided)
  - Expected: ALL TESTS FAIL (validation doesn't exist yet)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Component Implementation
- [ ] **T008** Implement TimerMemoryVisualization component in `src/clock/TimerMemoryVisualization.tsx`
  - Subscribe to timeSpansRef and isRunningRef using useMemorySubscription hook
  - Display time spans array (start, stop, or "running" if stop undefined)
  - Display running state with visual indicator (green=true, gray=false)
  - Display block key in monospace font
  - Handle hover callbacks (onMemoryHover)
  - Respond to isHighlighted prop (bg-blue-100 when true)
  - Handle missing memory (show "No memory allocated")
  - Use Tailwind CSS for styling (no custom CSS)
  - Expected: Contract tests T004 pass

- [ ] **T009** Implement ClockMemoryStory wrapper component in `stories/clock/ClockMemoryStory.tsx`
  - Accept ClockMemoryStoryConfig props
  - Use TimerTestHarness to create runtime and get memory refs
  - Render side-by-side layout (flex with divider)
  - Left panel: ClockAnchor with hover handling
  - Right panel: TimerMemoryVisualization with hover handling
  - Manage hover state ('clock', 'memory', or null)
  - Display title and description above panels
  - Cleanup runtime on unmount
  - Expected: Contract tests T005 pass

- [ ] **T010** Enhance TimerTestHarness in `stories/clock/utils/TimerTestHarness.tsx`
  - Add memory reference finding logic (TIMER_MEMORY_TYPES.TIME_SPANS, IS_RUNNING)
  - Return ClockMemoryHarnessResult with memoryRefs object
  - Generate time spans from config (completed vs running logic)
  - Add config validation using validateConfig function
  - Keep useMemo pattern (NOT useEffect) to avoid race condition
  - Expected: Contract tests T006 pass

- [ ] **T011** Implement config validation in `stories/clock/utils/ConfigValidation.ts`
  - Validate durationMs > 0
  - Validate isRunning is boolean
  - Validate title non-empty
  - Validate description non-empty
  - Validate timeSpans structure (if provided)
  - Throw descriptive errors with field names
  - Expected: Validation tests T007 pass

---

## Phase 3.4: Story Creation (10-15 stories across categories)

### Running Timers Category
- [ ] **T012** [P] Create RunningTimers.stories.tsx in `stories/clock/RunningTimers.stories.tsx`
  - Meta: title='Clock/Running Timers', component=ClockMemoryStory
  - Story: ShortDuration (5 seconds, isRunning=true)
  - Story: MediumDuration (3 minutes, isRunning=true)
  - Story: LongDuration (15 minutes, isRunning=true)
  - All stories: descriptive title and description
  - Verify in Storybook: hover highlights both panels

### Completed Timers Category
- [ ] **T013** [P] Create CompletedTimers.stories.tsx in `stories/clock/CompletedTimers.stories.tsx`
  - Meta: title='Clock/Completed Timers', component=ClockMemoryStory
  - Story: ShortCompleted (5 seconds, isRunning=false)
  - Story: MediumCompleted (3 minutes, isRunning=false)
  - Story: LongCompleted (1 hour, isRunning=false)
  - All stories: show stop timestamps in memory
  - Verify in Storybook: memory shows completed state

### Edge Cases Category
- [ ] **T014** [P] Create EdgeCases.stories.tsx in `stories/clock/EdgeCases.stories.tsx`
  - Meta: title='Clock/Edge Cases', component=ClockMemoryStory
  - Story: MinimumDuration (1 second, isRunning=false)
  - Story: VeryLongDuration (24 hours, isRunning=true)
  - Story: MultipleTimeSpans (custom timeSpans array with 3 entries)
  - Story: ZeroDuration (handle gracefully, show validation error if < 1s)
  - Verify in Storybook: edge cases render without crashes

### Story Verification
- [ ] **T015** Manual verification of all stories in Storybook
  - Run `npm run storybook`
  - Navigate to Clock/Running Timers, Clock/Completed Timers, Clock/Edge Cases
  - Test hover interaction on each story (both panels highlight)
  - Verify memory values match clock display
  - Verify all stories load in < 1 second
  - Document any issues or unexpected behavior

---

## Phase 3.5: Integration Tests & Validation

### Integration Tests
- [ ] **T016** Create integration test in `tests/stories/ClockMemoryStories.integration.test.tsx`
  - Test: All stories render without errors
  - Test: All stories have valid configurations (validation passes)
  - Test: All stories display both clock and memory panels
  - Test: All stories support hover interaction (highlighting works)
  - Test: Story categories are organized correctly
  - Test: Memory values correlate with clock display
  - Expected: All integration tests pass

### Performance Tests
- [ ] **T017** [P] Performance validation for story load time
  - Measure time from story navigation to interactive
  - Target: < 1 second for all stories
  - Document results in performance log
  - If target missed: profile and optimize

- [ ] **T018** [P] Performance validation for hover responsiveness
  - Measure time from mouse enter to highlight visible
  - Target: < 100ms visual feedback
  - Test on all 10-15 stories
  - Document results

### Accessibility Tests
- [ ] **T019** [P] Accessibility validation with axe-core
  - Run accessibility scan on all stories
  - Verify no WCAG violations
  - Check proper heading hierarchy
  - Verify color contrast meets AA standard
  - Fix any violations found

---

## Phase 3.6: Migration & Cleanup

### Story Migration
- [ ] **T020** Identify all scenarios in existing clock stories
  - Review `stories/clock/ClockAnchor.stories.tsx`
  - List all story scenarios and configurations
  - Map to new story categories (Running/Completed/Edge Cases)
  - Verify all scenarios covered in new stories

- [ ] **T021** Visual comparison of old vs new stories
  - Take screenshots of old stories
  - Take screenshots of equivalent new stories
  - Compare clock displays (should be identical)
  - Note differences (new stories have memory panel)
  - Verify no regression in clock display

- [ ] **T022** Archive old clock story files
  - Move `stories/clock/ClockAnchor.stories.tsx` to `stories/clock/__archive__/`
  - Move any other standalone timer stories to `__archive__/`
  - Add README.md in __archive__/ explaining migration
  - Keep files for reference (do not delete)

- [ ] **T023** Update dependent imports (if any)
  - Search for imports of old story files
  - Update to use new story structure
  - Verify no broken imports in codebase
  - Run `npm run build-storybook` to verify build succeeds

### Documentation
- [ ] **T024** [P] Update project documentation
  - Update README.md (if mentions clock stories)
  - Update docs/ with new story structure
  - Run `npm run docs:check` to validate links
  - Document migration in CHANGELOG or migration guide

---

## Phase 3.7: Final Validation

- [ ] **T025** Run all tests (unit + integration)
  - Command: `npm run test:unit`
  - Expected: All contract tests pass (T004-T007)
  - Expected: All integration tests pass (T016)
  - Expected: No new test failures (baseline: 45 passed, 1 failed, 4 module errors)

- [ ] **T026** Build Storybook for production
  - Command: `npm run build-storybook`
  - Wait for completion (~30 seconds, DO NOT CANCEL)
  - Expected: Build succeeds without errors
  - Expected: storybook-static/ directory created

- [ ] **T027** Manual testing checklist from quickstart.md
  - Navigate to Clock > Running Timers > ShortDuration
  - Verify clock displays "0:05" or equivalent
  - Verify memory shows time spans array with one entry
  - Verify isRunning = true in memory
  - Hover over clock → memory highlights
  - Hover over memory → clock highlights
  - Test 3-5 other stories for same behavior

- [ ] **T028** Performance validation against targets
  - Story load time: < 1s (from T017)
  - Component render: < 10ms (profile in dev tools)
  - Memory updates: < 16ms (measure re-render time)
  - Hover response: < 100ms (from T018)
  - Document all results in validation report

---

## Dependencies

### Critical Paths
```
T001-T003 (Setup)
  ↓
T004-T007 (Contract Tests - MUST FAIL) [P]
  ↓
T008-T011 (Implementation - MUST MAKE TESTS PASS)
  ↓
T012-T014 (Story Creation) [P]
  ↓
T015 (Story Verification)
  ↓
T016-T019 (Integration & Validation) [P]
  ↓
T020-T024 (Migration & Cleanup)
  ↓
T025-T028 (Final Validation)
```

### Task Blocking
- **T004-T007** → Must complete before T008-T011 (TDD: tests first)
- **T008** → Blocks T009 (ClockMemoryStory depends on TimerMemoryVisualization)
- **T009, T010** → Block T012-T014 (stories need wrapper and harness)
- **T012-T014** → Block T015 (can't verify stories that don't exist)
- **T015** → Blocks T016 (manual verification before automated tests)
- **T020** → Blocks T021-T022 (must identify scenarios before migration)
- **T025** → Blocks T028 (must pass tests before performance validation)

### Parallelization Opportunities
```
# Phase 3.2: Contract Tests (4 tasks in parallel)
T004, T005, T006, T007 → Different test files, no dependencies

# Phase 3.4: Story Creation (3 tasks in parallel)
T012, T013, T014 → Different story files, no dependencies

# Phase 3.5: Validation (3 tasks in parallel)
T017, T018, T019 → Independent validation tasks

# Phase 3.6: Documentation (1 task parallel with others)
T024 → Can run while T020-T023 executing
```

---

## Parallel Execution Examples

### Example 1: Contract Tests (Phase 3.2)
```bash
# Launch T004-T007 together (4 parallel tasks):
Task: "Contract test for TimerMemoryVisualization in tests/unit/TimerMemoryVisualization.contract.test.tsx"
Task: "Contract test for ClockMemoryStory in tests/unit/ClockMemoryStory.contract.test.tsx"
Task: "Contract test for enhanced TimerTestHarness in tests/unit/TimerTestHarness.contract.test.tsx"
Task: "Config validation test in tests/unit/ConfigValidation.test.tsx"

# Verify all tests FAIL before proceeding to T008
npm run test:unit
```

### Example 2: Story Creation (Phase 3.4)
```bash
# Launch T012-T014 together (3 parallel tasks):
Task: "Create RunningTimers.stories.tsx in stories/clock/RunningTimers.stories.tsx"
Task: "Create CompletedTimers.stories.tsx in stories/clock/CompletedTimers.stories.tsx"
Task: "Create EdgeCases.stories.tsx in stories/clock/EdgeCases.stories.tsx"

# Verify stories load in Storybook
npm run storybook
```

### Example 3: Validation (Phase 3.5)
```bash
# Launch T017-T019 together (3 parallel tasks):
Task: "Performance validation for story load time"
Task: "Performance validation for hover responsiveness"
Task: "Accessibility validation with axe-core"

# Review validation results
cat performance-log.txt
cat accessibility-report.txt
```

---

## Notes

### TDD Discipline
- **Phase 3.2 (Tests)** MUST complete before **Phase 3.3 (Implementation)**
- ALL contract tests MUST fail before implementing components
- Run `npm run test:unit` after T007 to verify failures
- Run `npm run test:unit` after T011 to verify passes

### Race Condition Prevention
- **CRITICAL**: Use `useMemo` in TimerTestHarness (T010), NOT `useEffect`
- This lesson learned from previous clock stories fix
- Memory initialization MUST be synchronous before render

### Story Count Target
- Target: 10-15 stories total
- Current plan: 10 stories (3 + 3 + 4)
- Can add more if needed, but avoid scope creep
- Focus on representative scenarios

### Performance Critical
- Story load < 1s (T017)
- Component render < 10ms (T028)
- Memory updates < 16ms (T028)
- Hover response < 100ms (T018)
- If targets missed: profile and optimize before proceeding

### Constitutional Compliance
- ✅ Component-First: New components self-contained (T008, T009)
- ✅ Storybook-Driven: Stories created and verified (T012-T015)
- ✅ TDD: Tests before implementation (T004-T007 before T008-T011)
- ✅ TypeScript Strict: All components fully typed
- ✅ Performance: Targets validated (T017-T018, T028)

---

## Task Generation Rules Applied

1. ✅ Each contract file → contract test task marked [P]
   - component-contracts.md → T004, T005, T006
   - integration-contracts.md → T007, T016

2. ✅ Each component → implementation task
   - TimerMemoryVisualization → T008
   - ClockMemoryStory → T009
   - Enhanced TimerTestHarness → T010

3. ✅ Each story category → story file task marked [P]
   - Running Timers → T012
   - Completed Timers → T013
   - Edge Cases → T014

4. ✅ Integration scenarios → integration test
   - All stories integration → T016

5. ✅ Different files = parallel [P]
   - T004-T007, T012-T014, T017-T019

6. ✅ Same file = sequential (no [P])
   - T008→T009, T020→T021→T022

7. ✅ Tests before implementation (TDD)
   - Phase 3.2 before Phase 3.3

---

**Status**: ✅ Ready for execution
**Total Tasks**: 28 tasks across 7 phases
**Estimated Time**: 6-8 hours (as per quickstart.md)
**Next Step**: Begin with T001 (Setup verification)

---

*Based on plan.md (Phase 2 task planning approach) and Constitution v1.0.0*
