# Runtime Test Bench Usage Guide

## Overview

The **Runtime Test Bench** is an interactive development tool for testing, debugging, and validating WOD Wiki workout scripts. It provides a complete workflow for editing, parsing, compiling, and executing workout definitions with real-time runtime visualization.

## Features

- **Integrated Editor**: Monaco-based editor with syntax highlighting for WOD Wiki workout scripts
- **Real-time Parsing**: Automatic parsing with 500ms debounce and error reporting
- **JIT Compilation**: Just-in-time compilation with three optimization strategies
- **Runtime Execution**: Execute workouts with 10 steps/second target rate
- **Debugger Controls**: Pause, resume, single-step, stop, and reset execution
- **Runtime Visualization**: Live panels showing runtime stack, memory allocations, and execution status
- **Keyboard Shortcuts**: Full keyboard support for efficient workflow
- **Elapsed Time Tracking**: Real-time display of workout execution time

---

## Complete Workflow

### 1. Edit Workout Script

The editor panel provides a Monaco-based code editor pre-configured for WOD Wiki syntax:

```
timer 21:00
  (21-15-9)
    Thrusters 95lb
    Pullups
    Box Jumps 24"
```

**Features**:
- Syntax highlighting for workout definitions
- Automatic parsing with 500ms debounce
- Parse error display with line/column information
- Multi-line editing support

---

### 2. Parse Code → WodScript

Parsing happens automatically as you type (with 500ms debounce). The **Compilation Panel** displays:
- ✅ **Valid**: Script parsed successfully, showing statement count
- ❌ **Parse Error**: Displays error message with line/column location

**Parsed Statements**:
- Timer statements (e.g., `timer 21:00`)
- Round schemes (e.g., `(21-15-9)`)
- Exercise definitions (e.g., `Thrusters 95lb`)

---

### 3. Compile WodScript → Runtime Blocks

Click the **Compile** button (⚙️) or press **F11** to compile the parsed script into executable runtime blocks.

**Compilation Strategies**:
1. **Timer Strategy**: Handles timer-based workouts (AMRAP, EMOM, Tabata)
2. **ForTime Strategy**: Handles for-time workouts with rep schemes
3. **Generic Strategy**: Fallback for other workout types

**Output**: 
- Compilation Panel shows compiled blocks
- Runtime ready for execution
- Execute button becomes enabled

---

### 4. Execute Workout

Click the **Run** button (▶️) or press **Ctrl+Enter** to start execution.

**Execution Details**:
- **Rate**: 10 steps/second (100ms interval)
- **Loop**: NextEvent-based advancement via `runtime.handle(nextEvent)`
- **Completion**: Automatic detection when `runtime.stack.current === null`
- **Real-time Updates**: All panels update every step

**Status**: Changes to `running` ⚡

---

### 5. Control Execution

#### Pause (⏸️)
- **Button**: Click Pause button
- **Shortcut**: Press **Space**
- **Action**: Stops execution interval, preserves runtime state
- **Status**: Changes to `paused` ⏸️

#### Resume
- **Button**: Click Run button (label changes to "Resume")
- **Shortcut**: Press **Space** or **Ctrl+Enter**
- **Action**: Recreates execution interval from paused state
- **Status**: Changes to `running` ⚡

#### Step (👟)
- **Button**: Click Step button
- **Shortcut**: Press **F10**
- **Action**: Advances runtime by exactly one NextEvent
- **Use Case**: Debugger-style step-through execution
- **Status**: Changes to `paused` after step

#### Stop (⏹️)
- **Button**: Click Stop button
- **Shortcut**: Press **Escape**
- **Action**: Halts execution, preserves runtime state
- **Status**: Changes to `idle` 💤

#### Reset (🔄)
- **Button**: Click Reset button
- **Shortcut**: Press **F5**
- **Action**: Clears runtime, snapshot, and elapsed time
- **Status**: Changes to `idle` 💤

---

## Keyboard Shortcuts

| Shortcut | Action | Available When |
|----------|--------|----------------|
| **Ctrl+Enter** | Execute / Resume | Idle (after compile) / Paused |
| **Space** | Pause / Resume | Running / Paused |
| **F5** | Reset | Any state |
| **F10** | Step | Idle / Paused |
| **F11** | Compile | Idle |
| **Escape** | Stop | Running / Paused |

**Tip**: Keyboard shortcuts are state-aware and only active when the action is valid.

---

## Real-time Panels

### Runtime Stack Panel
- **Location**: Right side, top panel
- **Content**: Shows current runtime stack frames
- **Updates**: Every execution step (100ms intervals)
- **Data**: Block type, block name, iteration counts

### Memory Panel
- **Location**: Right side, middle panel
- **Content**: Shows memory allocations and variable state
- **Updates**: Every execution step
- **Data**: Memory addresses, variable names, values

### Status Footer
- **Location**: Bottom of screen
- **Content**: 
  - Execution status (idle/running/paused/completed/error)
  - Elapsed time (updates every 100ms when running)
  - Block count
- **Color Coding**:
  - 💤 `idle`: Gray
  - ⚡ `running`: Green
  - ⏸️ `paused`: Yellow
  - ✅ `completed`: Blue
  - ❌ `error`: Red

---

## Example Workflows

### Basic Workflow: Edit → Compile → Run → Complete
```
1. Enter workout: "rounds 3\n  squats 20"
2. Wait for parse (500ms)
3. Click Compile (F11)
4. Click Run (Ctrl+Enter)
5. Watch execution complete
```

### Debugger Workflow: Step-by-Step Execution
```
1. Enter workout: "timer 5:00\n  pushups 10"
2. Compile (F11)
3. Step once (F10) - advances one frame
4. Step again (F10) - advances one frame
5. Continue stepping until complete
```

### Testing Workflow: Pause → Inspect → Resume
```
1. Enter workout: "(21-15-9)\n  Thrusters 95lb"
2. Compile (F11)
3. Run (Ctrl+Enter)
4. Pause mid-execution (Space)
5. Inspect runtime stack and memory
6. Resume (Space)
```

### Error Recovery Workflow
```
1. Enter invalid workout: "workout {"
2. See parse error in Compilation Panel
3. Fix syntax: "rounds 5\n  burpees 10"
4. Auto-reparse clears error
5. Compile and execute normally
```

---

## Performance Targets

The Runtime Test Bench is optimized for performance:

| Metric | Target | Validation |
|--------|--------|------------|
| **Parse Time** | <100ms for 100 lines | Auto-tested |
| **Compile Time** | <500ms | Auto-tested |
| **Execution Rate** | 10 steps/second | Enforced by 100ms interval |
| **Snapshot Generation** | <50ms | Auto-tested |
| **UI Updates** | >30fps | Auto-tested |
| **Memory** | No leaks | Auto-tested with 10 mount/unmount cycles |

---

## Troubleshooting

### Parse Errors Not Clearing
- **Cause**: Syntax still invalid
- **Solution**: Check error message for line/column, fix syntax

### Execute Button Disabled
- **Cause**: Script not compiled or compilation error
- **Solution**: Click Compile button, check for errors

### Execution Not Starting
- **Cause**: Runtime not initialized or already running
- **Solution**: Click Reset, recompile, try again

### Keyboard Shortcuts Not Working
- **Cause**: Focus not on test bench or action not available in current state
- **Solution**: Click inside the test bench, check status (shortcuts are state-aware)

### Performance Issues
- **Cause**: Very large scripts (>100 lines) or complex nested structures
- **Solution**: Simplify script or increase debounce time in code

---

## Testing

The Runtime Test Bench has comprehensive test coverage:

- **Integration Tests**: 12 tests covering full workflow, state transitions, error handling
- **Keyboard Shortcut Tests**: 7 tests validating all shortcuts in all states
- **Performance Tests**: 8 tests validating all performance targets

**Run Tests**:
```bash
# Run all integration tests
npx vitest run tests/integration/RuntimeTestBench.integration.test.tsx

# Run performance tests
npx vitest run tests/integration/RuntimeTestBench.performance.test.tsx
```

---

## Development

### Architecture
- **Component**: `RuntimeTestBench.tsx` (main component)
- **Panels**: EditorPanel, CompilationPanel, RuntimeStackPanel, MemoryPanel, StatusFooter
- **Adapters**: RuntimeAdapter, SnapshotAdapter
- **Hooks**: useTestBenchShortcuts, useMdTimerRuntime
- **Runtime**: ScriptRuntime (execution engine), JitCompiler (compilation)

### Key Implementation Details
- **NextEvent Pattern**: Runtime advances via `runtime.handle(new NextEvent({...}))`
- **Execution Loop**: `setInterval` with 100ms intervals, stored in `executionIntervalRef`
- **Completion Detection**: Checks `runtime.stack.current === null`
- **Elapsed Time**: Tracked with `executionStartTime` and updated every 100ms
- **Cleanup**: useEffect cleanup functions clear intervals on unmount

---

## Storybook

View the Runtime Test Bench in Storybook:

```bash
npm run storybook
```

Navigate to: **Runtime Test Bench → Default**

The Storybook story provides:
- Live demo of the test bench
- Example workout scripts
- Interactive controls panel for testing

---

## API Reference

### Props

```typescript
interface RuntimeTestBenchProps {
  initialCode?: string;  // Optional initial workout script
}
```

### Usage

```tsx
import { RuntimeTestBench } from '@/runtime-test-bench';

function App() {
  return (
    <RuntimeTestBench 
      initialCode="timer 21:00\n  (21-15-9)\n    Thrusters 95lb\n    Pullups" 
    />
  );
}
```

---

## Related Documentation

- [Runtime Interfaces Deep Dive](./runtime-interfaces-deep-dive.md)
- [Runtime Strategies Implementation](./runtime-strategies-implementation.md)
- [Fitness Projection System](./fitness-projection-system.md)
- [Behavior Metric Emission Guide](./behavior-metric-emission-guide.md)

---

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review integration tests for usage examples
3. Open an issue on GitHub with reproduction steps
