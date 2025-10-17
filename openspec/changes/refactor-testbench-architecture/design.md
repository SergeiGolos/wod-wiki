# Design: RuntimeTestBench Architecture Refactoring

## Overview

This document outlines the architectural decisions and technical patterns for refactoring the RuntimeTestBench component from a monolithic 550-line component with redundant abstraction layers to a streamlined architecture with <200 lines and optimal performance characteristics.

## Current Architecture Problems

### Problem 1: Redundant Abstraction Layers

**Current Flow:**
```
ScriptRuntime → RuntimeAdapter.createSnapshot() → ExecutionSnapshot → 
RuntimeTestBench extracts blocks/memory → Panel props
```

**Issues:**
1. RuntimeAdapter (301 lines) is recreated every render - **60x/second during execution**
2. ExecutionSnapshot duplicates ScriptRuntime structure with minimal transformation
3. Snapshot immediately destructured: `const blocks = snapshot?.stack.blocks || []`
4. Three object creation steps to display data that already exists in runtime

**Evidence:**
```typescript
// RuntimeTestBench.tsx line 57
const adapter = new RuntimeAdapter(); // ❌ Recreated every render!

const updateSnapshot = () => {
  if (runtime) {
    const newSnapshot = adapter.createSnapshot(runtime); // Object 1
    setSnapshot(newSnapshot); // Object 2
  }
};

// Later:
const blocks = snapshot?.stack.blocks || []; // Extract immediately
const memory = snapshot?.memory.entries || [];
```

### Problem 2: Over-Centralized State Management

**Current State:**
- 13 useState hooks in main component
- 7 useCallback hooks with complex dependency arrays
- 4 useEffect hooks creating temporal coupling
- 1 custom hook (useHighlighting) with bidirectional data flow

**Effect Chain Example:**
```typescript
// Effect 1: Debounced parse
const handleCodeChange = (newCode: string) => {
  // ... 500ms delay → sets parseResults
};

// Effect 2: Auto-compile on parse success
useEffect(() => {
  if (parseResults.status === 'success') {
    handleCompile(); // Timing non-deterministic
  }
}, [parseResults.status, handleCompile]);
```

**Problem**: Effects depend on each other but timing is implicit, creating race conditions.

### Problem 3: Prop Drilling Anti-Pattern

**Current Highlighting System:**
```typescript
// RuntimeTestBench passes highlighting to 3 panels
<RuntimeStackPanel
  highlightedBlockKey={highlightState.blockKey}
  onBlockHover={(blockKey) => setBlockHighlight(blockKey, 'stack')}
/>

<MemoryPanel
  highlightedMemoryId={highlightState.memoryId}
  onEntryHover={(memoryId) => setMemoryHighlight(memoryId, 'memory')}
/>

<EditorPanel
  highlightedLine={highlightState.line}
/>
```

**Issues:**
- 16+ props passed to panels for coordination
- Bidirectional data flow (panels call setters directly)
- Tight coupling - panels must know about highlighting system
- Doesn't scale - adding new coordination requires more props

### Problem 4: Execution Control Duplication

**Current State:**
```typescript
// handleExecute - 45 lines
// handlePause - 20 lines
// handleResume - 45 lines (duplicates executeStep logic)
// handleStep - 30 lines
// handleStop - 20 lines
// handleReset - 25 lines
```

**Problems:**
1. `executeStep` function duplicated in `handleExecute` and `handleResume`
2. Interval cleanup in 5 different locations
3. No speed control implementation (hardcoded 100ms)
4. Missing cleanup in some error paths

## Proposed Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ RuntimeTestBench (< 200 lines)                              │
│                                                              │
│ ┌─────────────────┐  ┌──────────────────┐                  │
│ │ TestBenchContext│  │ useRuntimeExec   │                  │
│ │ Provider        │  │ Hook             │                  │
│ └─────────────────┘  └──────────────────┘                  │
│                                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ Editor   │ │ Stack    │ │ Memory   │ │ Controls │       │
│ │ Panel    │ │ Panel    │ │ Panel    │ │ Panel    │       │
│ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│      │            │            │            │               │
│      └────────────┴────────────┴────────────┘               │
│                    │                                         │
│              useContext(TestBenchContext)                   │
└─────────────────────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────┐         ┌────────▼────────┐
│ Module-Level │         │ Selector        │
│ Services     │         │ Functions       │
│              │         │                 │
│ • Parser     │         │ • selectBlocks  │
│ • Compiler   │         │ • selectMemory  │
└──────────────┘         └─────────────────┘
        │                         │
        └────────────┬────────────┘
                     │
              ┌──────▼──────┐
              │ ScriptRuntime│
              └─────────────┘
```

### Key Design Decisions

#### Decision 1: Eliminate RuntimeAdapter with Selector Functions

**Rationale:**
- RuntimeAdapter provides no business logic - pure data transformation
- Object creation overhead unnecessary when data already exists
- Selector functions enable tree-shaking and zero overhead

**Implementation:**
```typescript
// Before (Current)
const adapter = new RuntimeAdapter(); // 301 lines, recreated every render
const snapshot = adapter.createSnapshot(runtime);
const blocks = snapshot?.stack.blocks || [];

// After (Proposed)
import { selectBlocks, selectMemory } from './selectors/runtime-selectors';

const blocks = runtime ? selectBlocks(runtime) : [];
const memory = runtime ? selectMemory(runtime) : [];
```

**Selector Implementation:**
```typescript
// runtime-selectors.ts (class-based for organization)
export class RuntimeSelectors {
  selectBlocks(runtime: ScriptRuntime): RuntimeStackBlock[] {
    return runtime.stack.blocks.map(block => ({
      key: block.key.toString(),
      type: block.type,
      label: block.label || block.type,
      depth: block.depth,
      state: block.state,
      metrics: this.extractMetrics(block)
    }));
  }

  selectMemory(runtime: ScriptRuntime): MemoryEntry[] {
    return runtime.memory.search({}).map(this.adaptMemoryEntry.bind(this));
  }

  private extractMetrics(block: any) { /* ... */ }
  private adaptMemoryEntry(entry: any) { /* ... */ }
}

// Single instance at module level
export const runtimeSelectors = new RuntimeSelectors();

// Usage:
// const blocks = runtimeSelectors.selectBlocks(runtime);
```

**Benefits:**
- Zero object allocation overhead (single instance)
- Better organization with encapsulated helper methods
- Potential for future optimization (caching, memoization)
- Testable in isolation without component context
- Clear API with method namespacing

**Trade-offs:**
- Lose adapter interface abstraction (acceptable - internal only)
- Selectors coupled to ScriptRuntime structure (acceptable - same codebase)
- Slightly more verbose than pure functions (acceptable for organization)

#### Decision 2: Extract Execution Logic to `useRuntimeExecution` Hook

**Rationale:**
- Execution logic is reusable across components
- Encapsulates interval management and cleanup
- Reduces main component by ~200 lines
- Better testing isolation

**Implementation:**
```typescript
// config/constants.ts
export const EXECUTION_TICK_RATE_MS = 20; // Fixed 50 ticks per second

// useRuntimeExecution.ts
export const useRuntimeExecution = (runtime: ScriptRuntime | null) => {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const executeStep = useCallback(() => {
    if (!runtime) return;
    try {
      const nextEvent = new NextEvent();
      runtime.handle(nextEvent);
      
      if (runtime.isComplete()) {
        stop();
        setStatus('completed');
      }
    } catch (error) {
      stop();
      setStatus('error');
      console.error('Execution error:', error);
    }
  }, [runtime]);

  const start = useCallback(() => {
    if (status === 'running') return;
    setStatus('running');
    startTimeRef.current = Date.now();
    
    executeStep(); // Immediate first step
    intervalRef.current = setInterval(executeStep, EXECUTION_TICK_RATE_MS);
  }, [status, executeStep]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('paused');
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsedTime(0);
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    stop();
    setElapsedTime(0);
    startTimeRef.current = null;
  }, [stop]);

  const step = useCallback(() => {
    if (status === 'running') return;
    executeStep();
    setStatus('paused');
  }, [status, executeStep]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Track elapsed time
  useEffect(() => {
    if (status !== 'running' || !startTimeRef.current) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current!);
    }, 100);
    
    return () => clearInterval(interval);
  }, [status]);

  return {
    status,
    elapsedTime,
    start,
    pause,
    stop,
    reset,
    step
  };
};
```

**Usage in Component:**
```typescript
export const RuntimeTestBench: React.FC<Props> = ({ ... }) => {
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);
  const execution = useRuntimeExecution(runtime);

  return (
    <>
      <ControlsPanel
        status={execution.status}
        elapsedTime={execution.elapsedTime}
        onPlay={execution.start}
        onPause={execution.pause}
        onStop={execution.stop}
        onReset={execution.reset}
        onStep={execution.step}
      />
    </>
  );
};
```

**Benefits:**
- Single source of truth for execution logic
- Guaranteed cleanup on unmount
- Reusable in other components (future Clock component)
- Testable without React component overhead
- Fixed tick rate ensures consistent timing across all executions

**Trade-offs:**
- Additional abstraction layer (justified by reusability)
- Hook rules apply (must be used in components)

#### Decision 3: Context API for Cross-Panel Coordination

**Rationale:**
- Eliminates prop drilling (16+ props removed)
- Scales better as features added
- Panels self-subscribe to needed state
- Clear separation of concerns

**Implementation:**
```typescript
// TestBenchContext.tsx
interface HighlightingContextValue {
  highlightedBlock?: string;
  highlightedMemory?: string;
  highlightedLine?: number;
  setHighlight: (target: HighlightTarget) => void;
  clearHighlight: () => void;
}

interface PreferencesContextValue {
  showMetrics: boolean;
  showIcons: boolean;
  expandAll: boolean;
  theme: 'light' | 'dark';
  toggleMetrics: () => void;
  toggleIcons: () => void;
  setExpandAll: (expand: boolean) => void;
}

export const HighlightingContext = createContext<HighlightingContextValue>(null!);
export const PreferencesContext = createContext<PreferencesContextValue>(null!);

export const TestBenchProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const highlighting = useHighlighting();
  const preferences = useUIPreferences();

  return (
    <HighlightingContext.Provider value={highlighting}>
      <PreferencesContext.Provider value={preferences}>
        {children}
      </PreferencesContext.Provider>
    </HighlightingContext.Provider>
  );
};
```

**Panel Usage:**
```typescript
// RuntimeStackPanel.tsx
export const RuntimeStackPanel: React.FC<{blocks: RuntimeStackBlock[]}> = ({blocks}) => {
  const { highlightedBlock, setHighlight } = useContext(HighlightingContext);
  const { showMetrics, showIcons } = useContext(PreferencesContext);

  return (
    <div>
      {blocks.map(block => (
        <BlockItem
          key={block.key}
          block={block}
          highlighted={highlightedBlock === block.key}
          onHover={() => setHighlight({ type: 'block', id: block.key })}
          showMetrics={showMetrics}
          showIcons={showIcons}
        />
      ))}
    </div>
  );
};
```

**Benefits:**
- Zero prop drilling
- Panels only consume needed state (no re-render on unrelated changes)
- Easy to add new shared state
- Better TypeScript inference
- Clearer component contracts

**Trade-offs:**
- Context changes cause re-renders of all consumers (mitigated by splitting contexts)
- Slightly more boilerplate (providers, consumers)
- Debugging more complex (React DevTools needed)

**Context Split Strategy:**
- **HighlightingContext**: Changes frequently (on every hover)
- **PreferencesContext**: Changes rarely (user toggles)
- **Separate contexts prevent re-render cascades**

#### Decision 4: Move Parser/Compiler to Module Scope

**Rationale:**
- Parser and compiler are stateless services
- No need for component lifecycle
- Shared across all component instances
- Reduces initialization overhead

**Implementation:**
```typescript
// services/testbench-services.ts
import { MdTimerRuntime } from '../../parser/md-timer';
import { JitCompiler } from '../../runtime/JitCompiler';
import { 
  TimerStrategy, 
  RoundsStrategy, 
  EffortStrategy, 
  IntervalStrategy, 
  TimeBoundRoundsStrategy, 
  GroupStrategy 
} from '../../runtime/strategies';

// Created once per module load
export const globalParser = new MdTimerRuntime();

export const globalCompiler = (() => {
  const compiler = new JitCompiler();
  
  // Register strategies in precedence order
  compiler.registerStrategy(new TimeBoundRoundsStrategy());
  compiler.registerStrategy(new IntervalStrategy());
  compiler.registerStrategy(new TimerStrategy());
  compiler.registerStrategy(new RoundsStrategy());
  compiler.registerStrategy(new GroupStrategy());
  compiler.registerStrategy(new EffortStrategy());
  
  return compiler;
})();
```

**Usage:**
```typescript
// RuntimeTestBench.tsx
import { globalParser, globalCompiler } from './services/testbench-services';

export const RuntimeTestBench: React.FC<Props> = ({ ... }) => {
  const handleCodeChange = (newCode: string) => {
    const script = globalParser.read(newCode);
    // ...
  };

  const handleCompile = () => {
    const compiledBlocks = globalCompiler.compile(script);
    // ...
  };
};
```

**Benefits:**
- Eliminates 2 useMemo hooks from component
- Parser/compiler initialized once per app load
- Shared across multiple RuntimeTestBench instances
- Simpler component code
- Module-level testing easier

**Trade-offs:**
- Global state (acceptable - services are stateless)
- Can't mock easily in tests (acceptable - use module mocking)
- Strategies registered at module load (acceptable - fixed configuration)

## Performance Analysis

### Current Performance Baseline

**Per Render Cycle (during execution):**
- RuntimeAdapter instantiation: 1 object
- ExecutionSnapshot creation: 1 object + nested arrays
- Panel props creation: 6 objects
- Total: ~8 objects per render

**During 10-second execution:**
- Renders: ~600 (60 fps assumption)
- Objects created: ~4,800
- Memory allocations: ~500KB

### Projected Performance (Post-Refactoring)

**Per Render Cycle:**
- Selector function calls: 2 (pure functions, no allocation)
- Panel props creation: 6 objects (unchanged)
- Total: ~6 objects per render

**During 10-second execution:**
- Renders: ~300 (50% reduction via Context optimization)
- Objects created: ~1,800
- Memory allocations: ~180KB

**Improvement: 64% reduction in allocations**

### Benchmarking Strategy

**Metrics to Track:**
1. Component render count (React DevTools Profiler)
2. Object allocations (Chrome Memory Profiler)
3. JavaScript heap size (Chrome DevTools Performance)
4. Time to interactive (Lighthouse)
5. Bundle size (webpack-bundle-analyzer)

**Test Scenarios:**
1. Load Storybook story
2. Execute 60-second workout
3. Rapidly toggle panels
4. Type in editor with debounce
5. Hover highlighting stress test

## Migration Strategy

### Phase 1: Foundation (Non-Breaking)

**Goal:** Prepare infrastructure without breaking existing code

**Tasks:**
1. Create `services/testbench-services.ts` with parser/compiler
2. Create `selectors/runtime-selectors.ts` with selector functions
3. Create `hooks/useRuntimeExecution.ts` hook
4. Create `contexts/TestBenchContext.tsx` (unused initially)
5. Add comprehensive tests for new code

**Validation:** Existing code unchanged, new modules tested in isolation

### Phase 2: Execution Hook Migration

**Goal:** Extract execution logic to hook

**Tasks:**
1. Replace execution logic in RuntimeTestBench with `useRuntimeExecution`
2. Update ControlsPanel to use hook return values
3. Remove old execution handler functions
4. Update tests

**Validation:** Execution controls work identically to current

### Phase 3: Selector Migration

**Goal:** Remove RuntimeAdapter and ExecutionSnapshot

**Tasks:**
1. Replace `adapter.createSnapshot()` with selector functions
2. Update panel props to receive direct state slices
3. Remove ExecutionSnapshot interface
4. Remove RuntimeAdapter class
5. Update interfaces.ts to remove unused types

**Validation:** All panels display identical data to current

### Phase 4: Context Migration

**Goal:** Replace prop drilling with Context API

**Tasks:**
1. Wrap RuntimeTestBench in TestBenchProvider
2. Update panels to use useContext hooks
3. Remove highlighting and preference props
4. Simplify panel prop interfaces
5. Update Storybook stories

**Validation:** Cross-panel coordination works identically

### Phase 5: Cleanup & Optimization

**Goal:** Final refinements and documentation

**Tasks:**
1. Remove deprecated code and interfaces
2. Update TypeScript types
3. Optimize Context to prevent re-render cascades
4. Update documentation
5. Run performance benchmarks

**Validation:** All success criteria met

## Testing Strategy

### Unit Tests

**New Hooks:**
```typescript
describe('useRuntimeExecution', () => {
  it('should start execution and increment elapsed time', () => {
    // Test hook in isolation
  });

  it('should pause execution and maintain state', () => {});
  it('should stop execution and reset state', () => {});
  it('should cleanup interval on unmount', () => {});
  it('should handle runtime errors gracefully', () => {});
});
```

**Selector Functions:**
```typescript
describe('selectBlocks', () => {
  it('should transform runtime blocks to panel format', () => {});
  it('should handle empty block stack', () => {});
  it('should extract metrics correctly', () => {});
});
```

**Context Providers:**
```typescript
describe('TestBenchContext', () => {
  it('should provide highlighting state to consumers', () => {});
  it('should update highlight on setHighlight call', () => {});
  it('should not re-render consumers of other context', () => {});
});
```

### Integration Tests

**Component Behavior:**
```typescript
describe('RuntimeTestBench', () => {
  it('should compile and execute workout', () => {});
  it('should update panels on state change', () => {});
  it('should coordinate highlighting across panels', () => {});
  it('should handle errors during execution', () => {});
});
```

### Storybook Visual Tests

**Stories to Update:**
```typescript
// RuntimeTestBench.stories.tsx
export const Default: Story = {
  play: async ({ canvasElement }) => {
    // Validate initial render
    // Click compile
    // Click execute
    // Verify panels update
    // Test highlighting
  }
};

export const WithLongWorkout: Story = {
  // 60-second execution test
};

export const ErrorHandling: Story = {
  // Invalid script test
};
```

### Performance Tests

**Benchmarks:**
```typescript
describe('Performance', () => {
  it('should render in < 100ms', () => {});
  it('should not create adapter instances', () => {});
  it('should reduce re-renders by 50%', () => {});
  it('should reduce memory allocations by 65%', () => {});
});
```

## Rollback Plan

**Rollback Triggers:**
- Performance regression > 10%
- Visual regression in panels
- Critical functionality broken
- Test failure rate increase > 5%

**Rollback Procedure:**
1. Revert git commits in reverse order of phases
2. Restore RuntimeAdapter and ExecutionSnapshot
3. Restore original panel prop interfaces
4. Validate Storybook stories render correctly
5. Run full test suite

**Rollback Risk:** Low - each phase independently validated before proceeding

## Success Metrics

**Quantitative:**
- [ ] Component LOC: 550 → <200 (64% reduction)
- [ ] Object allocations: 4,800/10s → 1,800/10s (64% reduction)
- [ ] Re-renders: 600/10s → 300/10s (50% reduction)
- [ ] Bundle size: ~15% reduction
- [ ] Test coverage: ≥90% for new code

**Qualitative:**
- [ ] Code easier to understand (subjective review)
- [ ] Adding new features easier (developer feedback)
- [ ] Debugging simpler (React DevTools clarity)
- [ ] Performance feels smoother (manual testing)

## Conclusion

This refactoring addresses fundamental architectural issues in RuntimeTestBench through systematic elimination of redundant abstractions, extraction of reusable logic, and implementation of modern React patterns. The phased approach ensures each change is validated before proceeding, minimizing risk while delivering significant performance and maintainability improvements.

**Key Innovations:**
1. **Selector Functions** - Zero-overhead data transformation
2. **Execution Hook** - Reusable, testable execution logic
3. **Context Split** - Scalable cross-panel coordination
4. **Module Services** - Shared, optimized parser/compiler

**Expected Outcome:** A 64% reduction in runtime overhead and a 64% reduction in component complexity, creating a solid foundation for future testbench enhancements.
