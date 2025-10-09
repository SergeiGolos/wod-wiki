# Component Contracts: Clock & Memory Visualization

**Feature**: 010-replaceing-the-existing  
**Date**: October 6, 2025  
**Status**: Complete

## Contract Overview

This document defines the behavioral contracts for all components in the clock-memory visualization feature. Each contract specifies inputs, outputs, side effects, and invariants.

## 1. TimerMemoryVisualization Component

### Purpose
Display timer memory allocations (time spans and running state) in a visually organized format.

### Contract

**Inputs**:
```typescript
interface TimerMemoryVisualizationProps {
  timeSpansRef: TypedMemoryReference<TimeSpan[]>;
  isRunningRef: TypedMemoryReference<boolean>;
  blockKey: string;
  onMemoryHover?: (highlighted: boolean) => void;
  isHighlighted?: boolean;
}
```

**Outputs**:
- Visual display of memory state
- Hover callback invocations

**Behavioral Requirements**:

1. **MUST subscribe to memory references** on mount
   - Subscribe to `timeSpansRef` for time span updates
   - Subscribe to `isRunningRef` for running state updates
   - Unsubscribe on unmount

2. **MUST display time spans array**
   - Show array length
   - For each span: start timestamp, stop timestamp (or "running" if undefined)
   - Format timestamps as HH:MM:SS or ISO string

3. **MUST display running state**
   - Show boolean value
   - Visual indicator (color: green for true, gray for false)

4. **MUST display block key**
   - Show as readonly text
   - Use monospace font

5. **MUST invoke hover callback** when mouse enters/leaves
   - Call `onMemoryHover(true)` on mouse enter
   - Call `onMemoryHover(false)` on mouse leave
   - Skip if callback not provided

6. **MUST respond to highlight prop**
   - Apply highlight styling when `isHighlighted === true`
   - Remove highlight when `isHighlighted === false`
   - Highlight styling: background color change (bg-blue-100)

7. **MUST handle missing memory**
   - If `get()` returns undefined, show "No memory allocated"
   - If references invalid, show error state
   - Never throw exceptions

**Invariants**:
- Component always renders (no conditional returns)
- Memory subscriptions always cleaned up
- Hover state never stuck (leave always called after enter)

**Performance**:
- Render time < 10ms
- Hover callback latency < 5ms
- Memory update re-render < 16ms

## 2. ClockMemoryStory Component (Story Wrapper)

### Purpose
Combine clock and memory visualization in split-panel layout with hover highlighting.

### Contract

**Inputs**:
```typescript
interface ClockMemoryStoryProps {
  config: ClockMemoryStoryConfig;
}

interface ClockMemoryStoryConfig {
  durationMs: number;
  isRunning: boolean;
  timeSpans?: TimeSpan[];
  title: string;
  description: string;
}
```

**Outputs**:
- Integrated clock + memory display
- Story metadata (title, description)

**Behavioral Requirements**:

1. **MUST use TimerTestHarness** for setup
   - Create runtime and block
   - Initialize timer memory
   - Expose memory references

2. **MUST render side-by-side panels**
   - Left panel: Clock display
   - Right panel: Memory visualization
   - Equal width or 40/60 split
   - Vertical divider line

3. **MUST manage hover state**
   - Track which section is hovered ('clock', 'memory', or null)
   - Update state on hover enter/leave
   - Pass highlight props to both components

4. **MUST display story metadata**
   - Title as heading
   - Description as paragraph
   - Above the split panels

5. **MUST handle cleanup**
   - Dispose runtime on unmount
   - Clear hover state
   - Unsubscribe all subscriptions

**Invariants**:
- Only one section highlighted at a time
- Hover state always consistent (hover/unhover paired)
- Runtime always disposed on unmount

**Layout**:
```
┌─────────────────────────────────────────┐
│ [Title]                                 │
│ [Description]                           │
├─────────────────────┬───────────────────┤
│ Clock Display       │ Memory Display    │
│ (ClockAnchor)       │ (MemoryViz)       │
└─────────────────────┴───────────────────┘
```

## 3. Enhanced TimerTestHarness

### Purpose
Create timer runtime with memory references exposed for visualization.

### Contract

**Inputs**:
```typescript
interface TimerTestHarnessProps {
  durationMs: number;
  isRunning: boolean;
  timeSpans?: TimeSpan[];
  children: (harness: ClockMemoryHarnessResult) => React.ReactNode;
}
```

**Outputs**:
```typescript
interface ClockMemoryHarnessResult {
  runtime: ScriptRuntime;
  blockKey: string;
  block: RuntimeBlock;
  memoryRefs: {
    timeSpans: TypedMemoryReference<TimeSpan[]>;
    isRunning: TypedMemoryReference<boolean>;
  };
}
```

**Behavioral Requirements**:

1. **MUST create runtime synchronously** in useMemo
   - Create ScriptRuntime with empty script
   - Create RuntimeBlock with TimerBehavior
   - Push block to initialize memory

2. **MUST find memory references**
   - Search for TIMER_MEMORY_TYPES.TIME_SPANS
   - Search for TIMER_MEMORY_TYPES.IS_RUNNING
   - Error if not found

3. **MUST set memory values**
   - Set time spans based on props
   - Set running state based on props
   - Calculate time spans from durationMs if not provided

4. **MUST return memory references**
   - Include in harness result object
   - Ensure references are valid
   - Ensure owner matches block key

5. **MUST cleanup on unmount**
   - Dispose block
   - Release memory references
   - Clear subscriptions

**Invariants**:
- Memory always initialized before children render
- Block key always matches memory owner
- Cleanup always executes

**Time Span Generation**:
```typescript
// If isRunning=false (completed timer)
timeSpans = [{
  start: new Date(Date.now() - durationMs),
  stop: new Date()
}];

// If isRunning=true (running timer)
timeSpans = [{
  start: new Date(Date.now() - durationMs),
  stop: undefined
}];
```

## 4. Existing Components (Contracts Validated)

### ClockAnchor

**Contract Status**: ✅ Already meets requirements

**Key Behaviors**:
- Subscribes to timer memory via useTimerElapsed
- Calculates and displays formatted time
- Shows placeholder when elapsed = 0
- Handles all time units (days, hours, minutes, seconds)

**No Changes Required**: Component works as-is

### TimeDisplay

**Contract Status**: ✅ Already meets requirements

**Key Behaviors**:
- Renders time units with labels
- Handles variable unit counts (2-4 units)
- Applies consistent styling
- Accessible (proper labels and hierarchy)

**No Changes Required**: Component works as-is

## Contract Violations (Error Handling)

### Invalid Memory References

**Condition**: Memory refs not found or invalid type  
**Required Behavior**: Display error message, don't crash  
**Test**: Pass invalid refs to TimerMemoryVisualization

### Null/Undefined Props

**Condition**: Required props missing or null  
**Required Behavior**: TypeScript should prevent, but handle gracefully  
**Test**: Test with mock props containing nulls

### Memory Disposed While Displayed

**Condition**: Block disposed while story still mounted  
**Required Behavior**: Show "Memory no longer available" message  
**Test**: Manually dispose block, verify error handling

## Integration Contracts

### Clock ↔ Memory Synchronization

**Contract**: Clock and memory always show same timer state

**Verification**:
- If memory shows isRunning=true, clock should be updating
- If memory shows time spans totaling 185s, clock shows 3:05
- If memory shows zero spans, clock shows placeholder

**Test**: For each story, assert memory values match clock display

### Hover Bidirectionality

**Contract**: Hover on either section highlights both

**Verification**:
- Hover clock → memory gets `isHighlighted=true`
- Hover memory → clock gets `isHighlighted=true`
- Leave either → both get `isHighlighted=false`

**Test**: Simulate hover events, assert state updates

## Performance Contracts

### Story Load Time

**Contract**: < 1 second to fully interactive

**Measurement**: Time from story navigation to hover enabled  
**Test**: Performance profiling in Storybook

### Hover Responsiveness

**Contract**: < 100ms visual feedback on hover

**Measurement**: Time from mouse enter to highlight visible  
**Test**: Record hover events, measure render time

### Memory Update Latency

**Contract**: < 50ms from memory change to UI update

**Measurement**: Time from memory.set() to re-render complete  
**Test**: Manually trigger memory updates, measure timing

## Contract Tests

### Test File: `TimerMemoryVisualization.contract.test.tsx`

```typescript
describe('TimerMemoryVisualization Contract', () => {
  it('MUST subscribe to memory references on mount', () => {
    // Test subscription setup
  });
  
  it('MUST unsubscribe on unmount', () => {
    // Test cleanup
  });
  
  it('MUST display time spans array correctly', () => {
    // Test display logic
  });
  
  it('MUST display running state with visual indicator', () => {
    // Test boolean display
  });
  
  it('MUST invoke hover callback on mouse enter/leave', () => {
    // Test callbacks
  });
  
  it('MUST apply highlight styling when isHighlighted=true', () => {
    // Test highlight state
  });
  
  it('MUST handle missing memory gracefully', () => {
    // Test error state
  });
});
```

### Test File: `ClockMemoryStory.contract.test.tsx`

```typescript
describe('ClockMemoryStory Contract', () => {
  it('MUST render side-by-side panels', () => {
    // Test layout
  });
  
  it('MUST manage hover state correctly', () => {
    // Test state management
  });
  
  it('MUST highlight only one section at a time', () => {
    // Test mutual exclusivity
  });
  
  it('MUST display story metadata', () => {
    // Test title and description
  });
  
  it('MUST cleanup on unmount', () => {
    // Test disposal
  });
});
```

### Test File: `TimerTestHarness.contract.test.tsx`

```typescript
describe('Enhanced TimerTestHarness Contract', () => {
  it('MUST expose memory references', () => {
    // Test memory refs in result
  });
  
  it('MUST initialize memory before children render', () => {
    // Test timing
  });
  
  it('MUST generate correct time spans for completed timer', () => {
    // Test time span logic
  });
  
  it('MUST generate correct time spans for running timer', () => {
    // Test running timer
  });
  
  it('MUST dispose block on unmount', () => {
    // Test cleanup
  });
});
```

## Acceptance Criteria

For each component, contracts are met when:

1. ✅ All contract tests pass
2. ✅ TypeScript compilation succeeds with strict mode
3. ✅ Visual inspection confirms expected behavior
4. ✅ Performance benchmarks meet targets
5. ✅ Error states handle gracefully (no crashes)

## Next Steps

These contracts are ready for implementation. Each contract test should be written first (TDD), then implementation should make tests pass.

**Test-Driven Development Order**:
1. Write contract tests (failing)
2. Implement component to minimum viable
3. Run tests, verify failures
4. Implement full behavior
5. Run tests, verify pass
6. Visual/manual testing in Storybook
