# Spec Delta: TestBench Execution Controls

## MODIFIED Requirements

### Requirement: Execution Lifecycle Management
The RuntimeTestBench SHALL manage workout execution lifecycle (start, pause, resume, step, stop, reset) through a dedicated custom hook instead of inline handler functions, improving code organization and reusability.

**Changes:**
- Extract ~200 lines of execution logic to `useRuntimeExecution` hook
- Consolidate duplicate interval management code
- Implement proper cleanup on component unmount
- Add support for variable execution speed (currently no-op)

#### Scenario: Start Execution from Idle State
- **GIVEN** a compiled ScriptRuntime in idle state
- **WHEN** user clicks Play button
- **THEN** `execution.start()` is called from the hook
- **AND** status changes from 'idle' to 'running'
- **AND** first execution step runs immediately
- **AND** interval is created with specified speed (default 100ms)
- **AND** elapsed time tracking begins

#### Scenario: Pause Execution from Running State
- **GIVEN** a workout executing with active interval
- **WHEN** user clicks Pause button
- **THEN** `execution.pause()` is called from the hook
- **AND** interval is cleared and reference set to null
- **AND** status changes from 'running' to 'paused'
- **AND** elapsed time stops incrementing but retains current value

#### Scenario: Resume Execution from Paused State
- **GIVEN** a paused workout with progress retained
- **WHEN** user clicks Play button
- **THEN** `execution.start()` is called from the hook (same function as initial start)
- **AND** execution continues from current runtime state
- **AND** new interval is created with same speed
- **AND** status changes from 'paused' to 'running'
- **AND** elapsed time continues incrementing from previous value

#### Scenario: Execute Single Step
- **GIVEN** a workout in paused or idle state
- **WHEN** user clicks Step button
- **THEN** `execution.step()` is called from the hook
- **AND** exactly one NextEvent is created and handled
- **AND** no interval is created (one-off execution)
- **AND** status changes to 'paused' (or remains 'paused')

#### Scenario: Stop Execution and Reset State
- **GIVEN** a workout in any execution state
- **WHEN** user clicks Stop button
- **THEN** `execution.stop()` is called from the hook
- **AND** interval is cleared if active
- **AND** status changes to 'idle'
- **AND** elapsed time resets to 0

#### Scenario: Reset Execution to Initial State
- **GIVEN** a completed or stopped workout
- **WHEN** user clicks Reset button
- **THEN** `execution.reset()` is called from the hook
- **AND** all execution state is cleared (time, status, intervals)
- **AND** runtime remains available for re-execution
- **AND** status is 'idle'

### Requirement: Fixed Execution Tick Rate
The RuntimeTestBench SHALL execute workouts at a fixed 20ms tick rate (50 ticks per second) defined in a configuration constant.

**Changes:**
- Define `EXECUTION_TICK_RATE_MS = 20` constant
- Remove variable speed control UI and logic
- Use fixed tick rate in `useRuntimeExecution` hook
- Ensure consistent timing across all workout executions

#### Scenario: Execute with Fixed Tick Rate
- **GIVEN** a workout ready to execute
- **WHEN** user clicks Play
- **THEN** execution runs with 20ms interval between steps
- **AND** tick rate is consistent throughout execution
- **AND** no speed control UI is present

#### Scenario: Tick Rate Configuration
- **GIVEN** the EXECUTION_TICK_RATE_MS constant is defined
- **WHEN** execution hook creates interval
- **THEN** interval uses EXECUTION_TICK_RATE_MS value
- **AND** constant is defined at high-level configuration
- **AND** constant can be changed globally if needed (not at runtime)

## REMOVED Requirements

### Requirement: Inline Execution Handler Functions
**Removed**: The RuntimeTestBench SHALL implement execution control logic directly in component handler functions (handleExecute, handlePause, handleResume, handleStep, handleStop, handleReset).

**Reason**: Inline handlers create code duplication (executeStep duplicated in handleExecute and handleResume), spread cleanup logic across multiple locations, and prevent reusability.

**Migration**: Replace inline handlers with `useRuntimeExecution` hook:
```typescript
// Before
const handleExecute = useCallback(() => {
  setStatus('running');
  setExecutionStartTime(Date.now());
  
  const executeStep = () => {
    // 45 lines of logic
  };
  
  executeStep();
  executionIntervalRef.current = setInterval(executeStep, 100);
}, [runtime]);

// After
import { EXECUTION_TICK_RATE_MS } from './config/constants';
const execution = useRuntimeExecution(runtime);

<ControlsPanel
  onPlay={execution.start}
  onPause={execution.pause}
  onStep={execution.step}
/>
// Note: No speed parameter - uses fixed EXECUTION_TICK_RATE_MS
```

### Requirement: Manual Interval Cleanup Management
**Removed**: The RuntimeTestBench SHALL manually clear execution intervals in multiple handler functions and useEffect cleanup.

**Reason**: Cleanup logic duplicated in 5 locations creates maintenance burden and risk of memory leaks in error paths.

**Migration**: Hook handles all cleanup automatically via useEffect cleanup:
```typescript
// Before - cleanup in multiple places
const handlePause = () => {
  if (executionIntervalRef.current) {
    clearInterval(executionIntervalRef.current); // Cleanup 1
  }
};

const handleStop = () => {
  if (executionIntervalRef.current) {
    clearInterval(executionIntervalRef.current); // Cleanup 2
  }
};

useEffect(() => {
  return () => {
    if (executionIntervalRef.current) {
      clearInterval(executionIntervalRef.current); // Cleanup 3
    }
  };
}, []);

// After - single cleanup location in hook
useEffect(() => {
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
}, []);
```

## ADDED Requirements

### Requirement: Reusable Execution Hook
The RuntimeTestBench SHALL use a `useRuntimeExecution` custom hook that encapsulates all execution lifecycle logic and can be reused across other components.

#### Scenario: Use Execution Hook in Multiple Components
- **GIVEN** a RuntimeTestBench component and a future WorkoutClock component
- **WHEN** both components need execution control
- **THEN** both can use `const execution = useRuntimeExecution(runtime)`
- **AND** each component gets isolated execution state
- **AND** hook logic is shared (no duplication)
- **AND** both components benefit from bug fixes to hook

#### Scenario: Test Execution Hook in Isolation
- **GIVEN** unit tests for execution logic
- **WHEN** tests use `renderHook(() => useRuntimeExecution(mockRuntime))`
- **THEN** hook can be tested without React component overhead
- **AND** tests validate start, pause, step, stop, reset behaviors
- **AND** tests verify interval cleanup on unmount

### Requirement: Automatic Cleanup on Unmount
The RuntimeTestBench SHALL guarantee cleanup of execution intervals when the component unmounts, preventing memory leaks.

#### Scenario: Cleanup Running Execution on Unmount
- **GIVEN** a workout executing with active interval
- **WHEN** RuntimeTestBench component unmounts (user navigates away)
- **THEN** useEffect cleanup function clears the interval
- **AND** no interval continues running after unmount
- **AND** no memory leak occurs

#### Scenario: Cleanup Error State Intervals
- **GIVEN** an execution error occurs mid-workout
- **WHEN** execution enters error state
- **THEN** interval is immediately cleared in error handler
- **AND** no orphaned interval continues running
- **AND** component can safely transition to error display

### Requirement: Elapsed Time Tracking
The RuntimeTestBench SHALL track and display elapsed execution time using the execution hook's built-in time tracking.

#### Scenario: Track Time During Execution
- **GIVEN** a workout starts executing
- **WHEN** execution is running at fixed 20ms tick rate
- **THEN** `execution.elapsedTime` updates every 100ms (separate from tick rate)
- **AND** StatusFooter displays elapsed time in HH:MM:SS format
- **AND** time continues incrementing until paused or stopped

#### Scenario: Preserve Time on Pause
- **GIVEN** a workout paused after 30 seconds of execution
- **WHEN** status is 'paused'
- **THEN** `execution.elapsedTime` retains value of 30000ms
- **AND** time does not increment while paused
- **AND** time resumes incrementing when execution resumes

**Note**: Elapsed time tracking (100ms updates for display) is independent of execution tick rate (20ms for runtime steps).

## Performance Impact

**Current Performance:**
- Duplicate `executeStep` function definitions: 2 (in handleExecute and handleResume)
- Interval cleanup locations: 5 (handlePause, handleStop, handleReset, error handlers, useEffect)
- Lines of execution logic in main component: ~200

**Target Performance:**
- `executeStep` function definitions: 1 (inside hook)
- Interval cleanup locations: 1 (useEffect in hook)
- Lines of execution logic in main component: 0 (all in hook)
- Main component reduction: 200 lines

**Expected Improvement: 36% reduction in main component size**

## Backward Compatibility

**Breaking Changes:**
- Handler function signatures changed (e.g., `onPlay` instead of `onExecute`)
- Execution state now comes from hook return value instead of component state
- Speed control UI and logic **removed** (was no-op, now properly eliminated)
- Execution runs at fixed 20ms tick rate (not configurable at runtime)

**Migration Path:**
- Update ControlsPanel prop mappings:
  ```typescript
  // Before
  <ControlsPanel
    onExecute={handleExecute}
    onPause={handlePause}
    onResume={handleResume}
    speed={speed}
    onSpeedChange={setSpeed}
  />
  
  // After
  <ControlsPanel
    onPlay={execution.start}
    onPause={execution.pause}
    // speed props removed
  />
  ```

**No Impact:**
- External consumers (none - internal tool)
- Visual behavior (consistent 20ms tick rate)
- Keyboard shortcuts (still trigger same actions)
