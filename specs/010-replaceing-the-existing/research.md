# Research: Clock & Memory Visualization Stories

**Feature**: 010-replaceing-the-existing  
**Date**: October 6, 2025  
**Status**: Complete

## Research Objectives

This research phase resolves technical unknowns from the feature specification, identifies implementation patterns from existing code, and establishes the technical foundation for clock-memory visualization integration.

## Resolved Clarifications

### 1. Interaction Model (FR-009)
**Decision**: Hover highlighting with bidirectional association

**Rationale**:
- Matches proven pattern from Runtime Stack & Memory Visualization stories
- Provides immediate visual feedback without requiring clicks
- Enables developers to quickly understand memory-clock relationships
- Lower cognitive load than click-to-reveal patterns

**Evidence from Codebase**:
- `stories/runtime/StackMemoryVisualization.stories.tsx` successfully implements hover interactions
- Pattern documented: "Hover over runtime blocks in the stack to see associated memory and source highlighting"
- No reported issues with this interaction pattern in existing stories

**Alternatives Considered**:
- Click for details: More complex, requires modal or expansion UI
- Static display: Misses opportunity for interactive learning
- Mixed approach: Adds unnecessary complexity

### 2. Layout Arrangement (FR-010)
**Decision**: Side-by-side panels (clock left, memory right)

**Rationale**:
- Consistent with Runtime Stack & Memory Visualization pattern
- Natural left-to-right reading flow (clock output → memory state)
- Adequate space for both visualizations on modern displays
- Reuses existing CSS/Tailwind patterns from runtime stories

**Evidence from Codebase**:
- Runtime stories use split-panel layout successfully
- Clock components already designed for contained display
- Memory visualization components from runtime can be adapted

**Alternatives Considered**:
- Vertical stack: Requires more scrolling, less efficient use of screen space
- Tabbed view: Prevents simultaneous viewing of clock and memory
- Integrated overlay: Risk of visual clutter, harder to implement

### 3. Memory Scope (FR-011)
**Decision**: Timer-specific memory only (time spans, running state, block key)

**Rationale**:
- Focused debugging experience for timer behavior
- Reduces visual noise and cognitive overload
- Aligns with feature's primary use case (understanding timer mechanics)
- Other memory types (metrics, handlers) less relevant to clock display

**Evidence from Codebase**:
- Timer memory defined in `src/runtime/behaviors/TimerBehavior.ts`
- Constants: `TIMER_MEMORY_TYPES.TIME_SPANS`, `TIMER_MEMORY_TYPES.IS_RUNNING`
- Clock components only consume timer memory, not other block memory

**Alternatives Considered**:
- All block memory: Too much information, harder to understand timer-specific behavior
- Entire runtime memory: Overwhelming, not relevant to clock debugging
- Configurable per story: Adds unnecessary complexity without clear benefit

### 4. Multiple Timer Display (Edge Case)
**Decision**: One timer per story (single clock-memory pair)

**Rationale**:
- Simplifies initial implementation and story organization
- Each story demonstrates one clear timer scenario
- Easier to understand and maintain
- Aligns with Storybook best practices (one component state per story)

**Future Consideration**: Multi-timer support could be added later if debugging workflows require comparing concurrent timers

## Existing Patterns Analysis

### Runtime Stack & Memory Visualization Pattern

**File**: `stories/runtime/StackMemoryVisualization.stories.tsx`

**Pattern Components**:
1. **JitCompilerDemo Component**: Main visualization harness
2. **Workout Script Input**: Monaco editor with workout syntax
3. **Split Panel Layout**: Visual separation of stack and memory
4. **Hover Highlighting**: Interactive association between elements
5. **Next Block Button**: Step-through execution control

**Applicable Elements for Clock Stories**:
- Split panel layout (adapt for clock + memory)
- Hover highlighting interaction pattern
- Story organization and documentation structure
- Visual design consistency (colors, spacing, typography)

**Not Applicable**:
- Monaco editor (not needed for clock stories)
- Step-through execution (clock stories show static timer states)
- Stack visualization (clock stories focus on single timer block)

### Clock Component Architecture

**Files**:
- `src/clock/anchors/ClockAnchor.tsx` - Main clock display component
- `src/clock/components/TimeDisplay.tsx` - Time formatting and rendering
- `src/clock/hooks/` - Timer-related hooks (useTimerElapsed, useTimerReferences)

**Key Patterns**:
1. **Memory Subscription**: Components subscribe to timer memory via `useMemorySubscription`
2. **Block Key Prop**: Components receive `blockKey` to identify timer source
3. **Time Formatting**: `useMemo` for efficient time unit calculation
4. **Placeholder Display**: Shows `--:--` when no time data available

**Integration Requirements**:
- Clock components work as-is, no modification needed
- Need to expose memory references for visualization
- Must maintain existing subscription patterns

### TimerTestHarness Pattern

**File**: `stories/clock/utils/TimerTestHarness.tsx`

**Current Capabilities**:
- Creates minimal runtime with timer behavior
- Initializes timer memory (time spans, running state)
- Provides RuntimeProvider context
- Handles cleanup on unmount

**Enhancements Needed**:
- Expose memory references for visualization component
- Support configurable timer scenarios (completed, running, paused)
- Integrate with memory visualization components

## Technology Stack Confirmation

### Language & Framework
- **TypeScript**: Strict mode enabled, full typing required
- **React 18+**: Functional components with hooks
- **Storybook 9.1.10**: For component development and documentation

### Key Dependencies
- **@monaco-editor/react**: Editor integration (not needed for new stories)
- **Chevrotain**: Parser (not directly used in stories)
- **Tailwind CSS**: Styling framework
- **Vitest**: Unit testing
- **Playwright**: E2E testing (for Storybook tests)

### Memory System
- **RuntimeMemory**: Allocates and manages memory references
- **TypedMemoryReference**: Strongly-typed memory access with subscriptions
- **TimerBehavior**: Creates timer-specific memory on block push

## Component Reusability Assessment

### Components to Reuse (No Changes)
1. **ClockAnchor** (`src/clock/anchors/ClockAnchor.tsx`)
   - Displays formatted time from timer memory
   - Handles placeholder states
   - Subscribes to memory updates

2. **TimeDisplay** (`src/clock/components/TimeDisplay.tsx`)
   - Renders time units (days, hours, minutes, seconds)
   - Handles time formatting and display logic

3. **useTimerElapsed** (`src/runtime/hooks/useTimerElapsed.ts`)
   - Calculates elapsed time from time spans
   - Handles running timer updates
   - Manages memory subscriptions

4. **useTimerReferences** (`src/runtime/hooks/useTimerReferences.ts`)
   - Searches runtime memory for timer refs
   - Returns typed memory references

### Components to Adapt
1. **TimerTestHarness** (`stories/clock/utils/TimerTestHarness.tsx`)
   - **Adaptation**: Return memory references in render prop
   - **Reason**: Visualization component needs direct access to memory refs
   - **Change**: Minimal, add memory refs to returned harness object

### Components to Create
1. **TimerMemoryVisualization** (new)
   - **Purpose**: Display timer memory allocations
   - **Inputs**: Memory references (time spans ref, running state ref)
   - **Outputs**: Visual representation of memory state
   - **Pattern**: Follow Runtime memory visualization design

2. **ClockMemoryStory** (new story wrapper)
   - **Purpose**: Combine clock and memory in split-panel layout
   - **Inputs**: Timer configuration (duration, running state, time spans)
   - **Outputs**: Integrated visualization
   - **Pattern**: Similar to StackMemoryVisualization stories

## Performance Considerations

### Rendering Performance
- **Clock Component**: Already optimized with `useMemo` for time calculation
- **Memory Updates**: Only re-render when memory values change (React subscriptions)
- **Hover Interactions**: CSS-based when possible, minimal JS overhead

### Memory Management
- **Cleanup**: TimerTestHarness already handles proper disposal
- **Subscriptions**: useEffect cleanup ensures no memory leaks
- **Re-renders**: Minimal due to selective memoization

### Story Load Time
- **Target**: Stories should load in < 1 second
- **Strategy**: Pre-initialized timer states, no complex async operations
- **Testing**: Verify with Storybook performance addon

## Visual Design Specifications

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│  Story Title & Description                      │
├─────────────────────┬───────────────────────────┤
│                     │                           │
│  Clock Display      │  Timer Memory             │
│  ┌───────────────┐  │  ┌─────────────────────┐ │
│  │  03:05        │  │  │ Time Spans: [1]     │ │
│  │  MM    SS     │  │  │ ├─ Start: 10:00:00  │ │
│  └───────────────┘  │  │ └─ Stop:  10:03:05  │ │
│                     │  │                       │ │
│  Timer: 185000ms    │  │ Running: false       │ │
│  Status: Completed  │  │ Block: abc-123       │ │
│                     │  └─────────────────────┘ │
└─────────────────────┴───────────────────────────┘
```

### Color Scheme (Tailwind)
- **Clock Background**: `bg-gray-50` (light gray)
- **Memory Background**: `bg-white`
- **Borders**: `border-gray-200`
- **Hover Highlight**: `bg-blue-100` (light blue)
- **Text**: `text-gray-900` (default), `text-gray-600` (secondary)
- **Timer Running**: `text-green-600` (indicates active state)
- **Timer Stopped**: `text-gray-600` (indicates completed state)

### Typography
- **Clock Time**: Large, bold (existing TimeDisplay component)
- **Memory Labels**: `text-sm font-medium`
- **Memory Values**: `text-sm font-mono` (timestamps)
- **Descriptions**: `text-base text-gray-700`

## Story Scenarios

### Required Stories (FR-007)
1. **Completed Timer**: Duration 3:05 (185000ms), stopped
2. **Running Timer**: Started 50s ago, currently running
3. **Paused Timer**: Multiple time spans, total 2:30
4. **Zero Duration**: No elapsed time, empty state
5. **Long Duration**: 2d 3h 45m 10s, demonstrates all time units

### Additional Scenarios (Nice to Have)
6. **Very Long Running**: Timer running for hours
7. **Rapid Updates**: Running timer with visible second increments
8. **Edge Case**: Single-second duration

## Testing Strategy

### Story Testing
- **Visual Regression**: Playwright tests for each story
- **Interaction Testing**: Verify hover highlighting works
- **State Verification**: Confirm memory values match clock display

### Component Testing
- **TimerMemoryVisualization**: Unit tests for display logic
- **Integration**: Verify clock-memory synchronization
- **Edge Cases**: Zero duration, missing memory, invalid timestamps

### Performance Testing
- **Story Load**: Measure time to interactive
- **Hover Responsiveness**: Verify < 100ms hover feedback
- **Memory Usage**: Monitor for leaks over time

## Implementation Complexity Assessment

### Low Complexity (1-2 hours each)
- Create TimerMemoryVisualization component
- Adapt TimerTestHarness to expose memory refs
- Create 5 required story scenarios

### Medium Complexity (2-4 hours each)
- Implement hover highlighting interaction
- Style and layout integration
- Story documentation and descriptions

### High Complexity (4+ hours)
- Memory visualization component with full feature set
- Edge case handling and error states
- Comprehensive testing suite

**Total Estimated Effort**: 15-20 hours

## Risks & Mitigations

### Risk 1: Memory Reference Lifecycle
**Issue**: Memory refs may be disposed before visualization reads them  
**Mitigation**: TimerTestHarness already handles lifecycle correctly (useMemo initialization)  
**Likelihood**: Low  

### Risk 2: Visual Consistency
**Issue**: New stories might not match Runtime story aesthetics  
**Mitigation**: Use exact same Tailwind classes and layout patterns  
**Likelihood**: Low  

### Risk 3: Performance Degradation
**Issue**: Hover interactions might cause jank  
**Mitigation**: CSS-based highlights, minimal JS, performance testing  
**Likelihood**: Very Low  

### Risk 4: Scope Creep
**Issue**: Feature could expand beyond clock-memory visualization  
**Mitigation**: Strict adherence to FR requirements, defer enhancements  
**Likelihood**: Medium  

## Dependencies

### External Dependencies (No Changes)
- React, TypeScript, Storybook, Tailwind - all already installed
- No new npm packages required

### Internal Dependencies
- **Required**: TimerTestHarness, Clock components, Runtime memory system
- **Optional**: Runtime visualization components (for pattern reference)

### File Dependencies
- **Must Exist**: All clock components, timer hooks, memory system
- **Will Create**: New story files, TimerMemoryVisualization component
- **Will Delete**: Old standalone clock stories

## Success Criteria

### Functional
- ✅ All 5 required story scenarios implemented
- ✅ Hover highlighting works bidirectionally
- ✅ Memory displays match timer states accurately
- ✅ Old standalone clock stories removed

### Non-Functional
- ✅ Stories load in < 1 second
- ✅ Hover interactions respond in < 100ms
- ✅ Visual consistency with Runtime stories
- ✅ No TypeScript errors in changed files
- ✅ All tests pass

### Documentation
- ✅ Each story has clear description
- ✅ Memory-clock relationship explained
- ✅ Developer learning objectives met

## Next Steps

This research phase has resolved all technical unknowns. The implementation can proceed to Phase 1 (Design & Contracts) with high confidence in the chosen approaches.

**Key Decisions Finalized**:
1. ✅ Hover highlighting for interactions
2. ✅ Side-by-side panel layout
3. ✅ Timer-specific memory only
4. ✅ One timer per story
5. ✅ Reuse existing components where possible
6. ✅ Follow Runtime visualization patterns

**Ready for Phase 1**: Data model and component contracts
