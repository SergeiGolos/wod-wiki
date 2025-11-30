# Multi-Runtime Architecture Deep Dive

## Executive Summary

This document analyzes the architectural changes needed to support **headless multi-runtime execution** with **observer-based UI binding** in WOD Wiki. The core principle is:

> **Runtimes execute independently of observers. The UI is just one possible observer that can mount/unmount without affecting runtime execution.**

### Target Architecture Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              VIEW MODES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│   PLAN (Setup)          │   TRACK / ANALYZE (Observation)               │
│   ─────────────────     │   ─────────────────────────────               │
│   • Edit workout        │   • Bound to ONE runtime at a time            │
│   • No runtime needed   │   • Can switch binding between runtimes       │
│   • Spawns runtimes     │   • Runtime continues if UI unmounts          │
└─────────────────────────┴───────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RUNTIME REGISTRY                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │ Runtime A   │  │ Runtime B   │  │ Runtime C   │   (all executing)    │
│  │ (athlete 1) │  │ (athlete 2) │  │ (replay)    │                      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                      │
│         │                │                │                              │
│         └────────────────┼────────────────┘                              │
│                          ▼                                               │
│                   Event Emission (headless)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Primary Use Cases

1. **Multi-athlete tracking** - Each athlete has their own runtime executing in parallel
2. **History replay** - Replay a completed workout while a new one is in progress
3. **Comparison analysis** - Switch between runtimes to compare execution patterns
4. **Background execution** - Runtime continues while user edits in Plan view

---

## Current Architecture Overview

### Runtime Lifecycle

The current architecture uses a **singleton runtime pattern** managed through React Context:

```
┌─────────────────────────────────────────────────────────────────┐
│                     UnifiedWorkbench                             │
│  ┌───────────────────┐    ┌─────────────────────────────────┐   │
│  │ WorkbenchProvider │    │       RuntimeProvider           │   │
│  │  - content        │    │  - runtime: ScriptRuntime|null  │   │
│  │  - blocks         │    │  - initializeRuntime()          │   │
│  │  - viewMode       │    │  - disposeRuntime()             │   │
│  │  - selectedBlock  │    │                                 │   │
│  └───────────────────┘    └─────────────────────────────────┘   │
│                                      │                           │
│                                      ▼                           │
│                           ┌─────────────────────┐               │
│                           │ useRuntimeExecution │               │
│                           │  - status           │               │
│                           │  - elapsedTime      │               │
│                           │  - start/stop/step  │               │
│                           └─────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `RuntimeProvider` | [RuntimeProvider.tsx](../src/components/layout/RuntimeProvider.tsx) | Single runtime lifecycle management via React Context |
| `RuntimeFactory` | [RuntimeFactory.ts](../src/runtime/RuntimeFactory.ts) | Creates and disposes `ScriptRuntime` instances |
| `useRuntimeExecution` | [useRuntimeExecution.ts](../src/runtime-test-bench/hooks/useRuntimeExecution.ts) | Manages execution tick loop, status, elapsed time |
| `TimerIndexPanel` | [TimerIndexPanel.tsx](../src/components/layout/TimerIndexPanel.tsx) | Live execution history, binds to single runtime |
| `AnalyticsIndexPanel` | [AnalyticsIndexPanel.tsx](../src/components/layout/AnalyticsIndexPanel.tsx) | Historical segment selection, receives data from runtime transformation |
| `UnifiedWorkbench` | [UnifiedWorkbench.tsx](../src/components/layout/UnifiedWorkbench.tsx) | Orchestrates all contexts and views |

---

## Identified Challenges

### 1. Singleton Runtime Pattern in Context

**Current Implementation** ([RuntimeProvider.tsx](../src/components/layout/RuntimeProvider.tsx#L26-L44)):

```typescript
interface RuntimeContextState {
  runtime: ScriptRuntime | null;  // ❌ Single instance only
  isInitializing: boolean;
  error: Error | null;
  initializeRuntime: (block: WodBlock) => void;
  disposeRuntime: () => void;
}
```

**Problem**: The context holds exactly one runtime. Creating a new runtime disposes the previous one:

```typescript
const initializeRuntime = useCallback((block: WodBlock) => {
  // Dispose existing runtime first  ❌ Destroys previous state
  setRuntime(currentRuntime => {
    if (currentRuntime) {
      factoryRef.current.disposeRuntime(currentRuntime);
    }
    return null;
  });
  // Then create new one...
});
```

**Impact**: Cannot have two workouts running simultaneously or compare historical vs live execution.

---

### 2. Tightly Coupled Execution Hook

**Current Implementation** ([useRuntimeExecution.ts](../src/runtime-test-bench/hooks/useRuntimeExecution.ts#L62-L70)):

```typescript
export const useRuntimeExecution = (
  runtime: ScriptRuntime | null  // ❌ Bound to single runtime
): UseRuntimeExecutionReturn => {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  // ...
```

**Problem**: The execution hook maintains its own state (status, elapsed time, step count) that's tightly coupled to a single runtime reference. When runtime changes:

```typescript
useEffect(() => {
  if (!runtime) {
    stop();  // ❌ Resets all state when runtime changes
  }
}, [runtime, stop]);
```

**Impact**: Switching between runtimes resets execution state, losing elapsed time and step count.

---

### 3. Analytics Data Transformation Coupling

**Current Implementation** ([UnifiedWorkbench.tsx](../src/components/layout/UnifiedWorkbench.tsx#L67-L130)):

```typescript
const transformRuntimeToAnalytics = (runtime: ScriptRuntime | null) => {
  if (!runtime) return { data: [], segments: [] };
  // ... transforms runtime.executionLog to Segment[]
};

// In component:
const [analyticsState, setAnalyticsState] = useState<{data: any[], segments: Segment[]}>({ 
  data: [], 
  segments: [] 
});

useEffect(() => {
  if (runtime) {  // ❌ Only watches single runtime
    const newState = transformRuntimeToAnalytics(runtime);
    setAnalyticsState(newState);
  }
}, [runtime, execution.stepCount, execution.status]);
```

**Problem**: Analytics state is derived from a single runtime. There's no mechanism to:
- Maintain analytics from a disposed runtime
- Aggregate data from multiple runtimes
- Compare execution logs side-by-side

**Impact**: When switching views or runtimes, analytics data is lost or replaced entirely.

---

### 4. TimerIndexPanel Direct Runtime Binding

**Current Implementation** ([TimerIndexPanel.tsx](../src/components/layout/TimerIndexPanel.tsx#L226-L280)):

```typescript
export interface TimerIndexPanelProps {
  runtime: ScriptRuntime | null;  // ❌ Direct runtime reference
  activeBlock?: WodBlock | null;
  activeSegmentIds?: Set<number>;
  // ...
}

const items = React.useMemo((): MetricItem[] => {
  if (!runtime) return [];
  
  // Reads directly from runtime.executionLog and runtime.stack
  for (const record of runtime.executionLog) { /* ... */ }
  for (const block of runtime.stack.blocks) { /* ... */ }
}, [runtime, workoutStartTime]);
```

**Problem**: Panel directly accesses runtime internals:
- `runtime.executionLog`
- `runtime.stack.blocks`
- `runtime.memory.search()`

This creates tight coupling that makes it impossible to switch data sources.

**Impact**: Cannot display data from a different runtime without changing the bound reference.

---

### 5. View Mode and Runtime Lifecycle Coupling

**Current Implementation** ([UnifiedWorkbench.tsx](../src/components/layout/UnifiedWorkbench.tsx#L340-L354)):

```typescript
useEffect(() => {
  if (selectedBlock && selectedBlock.statements && viewMode === 'track') {
    initializeRuntime(selectedBlock);  // Creates runtime on view change
  } else if (viewMode !== 'track') {
    disposeRuntime();  // ❌ Destroys runtime when leaving track view
  }
}, [selectedBlockId, viewMode, selectedBlock, initializeRuntime, disposeRuntime]);
```

**Problem**: Runtime lifecycle is tied to view mode navigation:
- Entering `track` view → creates runtime
- Leaving `track` view → destroys runtime (and all execution history)
- Returning to `track` view → creates fresh runtime

**Impact**: Analytics view cannot show data from a just-completed workout because the runtime is disposed when switching views.

---

### 6. Memory Reference Ownership

**Current Implementation** ([ScriptRuntime.ts](../src/runtime/ScriptRuntime.ts#L60-L95)):

```typescript
this.stack.pop = () => {
  const poppedBlock = originalPop();
  if (poppedBlock) {
    const refs = this.memory.search({ 
      type: 'execution-record', 
      ownerId: blockId 
    });
    // Updates memory with completed record
  }
  return poppedBlock;
};
```

**Problem**: Memory is owned by a single runtime instance. Each runtime has isolated memory:
- No shared memory between runtimes
- No way to merge execution histories
- Memory references are runtime-specific (can't transfer between runtimes)

**Impact**: Cannot create a unified view of multiple workout executions.

---

## Architectural Patterns for Multi-Runtime Support

### Core Principle: Observer Pattern with Headless Execution

The fundamental shift is treating the UI as an **optional observer**, not a controller:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HEADLESS RUNTIME LAYER                            │
│                                                                          │
│  ScriptRuntime executes via internal tick loop (setInterval)            │
│  • No React dependencies                                                 │
│  • Emits events to any subscribed observers                              │
│  • Continues execution even with zero observers                          │
│                                                                          │
│  Events: 'tick' | 'block-pushed' | 'block-popped' | 'metric' | 'complete'│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          subscribe / unsubscribe
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│                           OBSERVER LAYER                                 │
│                                   │                                      │
│  ┌────────────────┐   ┌──────────┴────────┐   ┌────────────────┐        │
│  │ React UI       │   │ Metrics Collector │   │ External Logger│        │
│  │ (TimerPanel)   │   │ (Analytics)       │   │ (Telemetry)    │        │
│  └────────────────┘   └───────────────────┘   └────────────────┘        │
│                                                                          │
│  Observers can mount/unmount at any time without affecting runtime       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Pattern 1: Runtime Registry with Self-Executing Runtimes

```typescript
/**
 * RuntimeInstance wraps a ScriptRuntime with its own execution loop.
 * The runtime executes independently - UI observes but doesn't control.
 */
interface RuntimeInstance {
  readonly id: string;
  readonly runtime: ScriptRuntime;
  readonly status: 'idle' | 'running' | 'paused' | 'completed';
  readonly startedAt: number | null;
  readonly metadata: RuntimeMetadata;
  
  // Self-managed execution (not React-dependent)
  start(): void;
  pause(): void;
  resume(): void;
  
  // Observer pattern
  subscribe(listener: RuntimeEventListener): Unsubscribe;
}

/**
 * RuntimeRegistry manages multiple independent runtimes.
 * UI can bind to any runtime for observation.
 */
interface RuntimeRegistry {
  // Lifecycle
  createRuntime(id: string, block: WodBlock): RuntimeInstance;
  disposeRuntime(id: string): void;
  
  // Access
  getRuntime(id: string): RuntimeInstance | undefined;
  getAllRuntimes(): RuntimeInstance[];
  
  // UI Binding (which runtime is the UI currently observing)
  boundRuntimeId: string | null;
  bindToRuntime(id: string): void;
  unbind(): void;
}
```

### Pattern 2: Clean Mount/Unmount Semantics

The key insight is separating **runtime control** from **UI observation**:

```typescript
/**
 * useRuntimeObserver - Observes a runtime WITHOUT controlling it
 * 
 * This hook:
 * - Subscribes to runtime events on mount
 * - Unsubscribes on unmount  
 * - Does NOT start/stop the runtime (that's RuntimeInstance's job)
 * - Returns derived state for rendering
 */
function useRuntimeObserver(runtimeId: string | null): RuntimeObservation {
  const registry = useRuntimeRegistry();
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  
  useEffect(() => {
    if (!runtimeId) {
      setSnapshot(null);
      return;
    }
    
    const instance = registry.getRuntime(runtimeId);
    if (!instance) return;
    
    // Take initial snapshot
    setSnapshot(captureSnapshot(instance));
    
    // Subscribe to updates (runtime keeps running regardless)
    const unsubscribe = instance.subscribe((event) => {
      setSnapshot(captureSnapshot(instance));
    });
    
    return () => {
      unsubscribe();  // UI stops observing, runtime continues
    };
  }, [runtimeId, registry]);
  
  return { snapshot, runtimeId };
}

/**
 * RuntimeSnapshot - Immutable view of runtime state at a point in time
 * UI renders from snapshots, never directly from runtime
 */
interface RuntimeSnapshot {
  readonly capturedAt: number;
  readonly status: ExecutionStatus;
  readonly elapsedTime: number;
  readonly executionLog: ExecutionRecord[];
  readonly activeBlocks: BlockSnapshot[];
  readonly memoryState: MemorySnapshot;
}
```

### Pattern 3: View Mode as Binding Context

```typescript
/**
 * View modes determine UI behavior, not runtime behavior
 * 
 * PLAN:    No runtime binding needed (editing only)
 * TRACK:   Bound to one runtime for live observation
 * ANALYZE: Bound to one runtime for historical review (same binding, different view)
 */
type ViewMode = 'plan' | 'track' | 'analyze';

/**
 * Switching views does NOT affect runtime execution
 */
function handleViewModeChange(newMode: ViewMode) {
  setViewMode(newMode);
  
  // Runtime keeps running regardless of view
  // Only the UI presentation changes
  
  if (newMode === 'plan') {
    // Optionally unbind (runtime still executes in background)
    // registry.unbind();  
  }
}

/**
 * Switching runtime binding changes what the UI observes
 */
function handleRuntimeSwitch(newRuntimeId: string) {
  registry.bindToRuntime(newRuntimeId);
  // UI now observes different runtime
  // Previous runtime continues executing
}
```

---

## Target Component Architecture

### Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PLAN VIEW (Setup Layer)                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Monaco Editor  │  Block Index  │  Spawn Runtime Button         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Responsibilities:                                                       │
│  • Edit workout scripts                                                  │
│  • View parsed blocks                                                    │
│  • Create new RuntimeInstances via registry                              │
│  • NO runtime binding (does not observe execution)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                            createRuntime(block)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      RUNTIME REGISTRY (Service Layer)                    │
│                                                                          │
│  • Owns all RuntimeInstance objects                                      │
│  • Each RuntimeInstance self-executes via internal interval              │
│  • Provides subscribe() for observers                                    │
│  • Tracks which runtime UI is currently bound to                         │
│                                                                          │
│  Map<string, RuntimeInstance>                                            │
│  boundRuntimeId: string | null                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          bindToRuntime(id)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   TRACK / ANALYZE VIEW (Observer Layer)                  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Runtime Selector (dropdown of available runtimes)               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────┐   ┌────────────────────────────────────────┐   │
│  │  TimerIndexPanel    │   │  Timer Display / Timeline View         │   │
│  │  (observes snapshot)│   │  (observes snapshot)                   │   │
│  └─────────────────────┘   └────────────────────────────────────────┘   │
│                                                                          │
│  Responsibilities:                                                       │
│  • Subscribe to bound runtime's events                                   │
│  • Render from RuntimeSnapshot (immutable)                               │
│  • Switch binding without affecting runtime execution                    │
│  • Can unmount while runtime continues in background                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Hook Architecture

```typescript
// ─────────────────────────────────────────────────────────────────────────
// REGISTRY HOOK - Access to runtime management (used by Plan view)
// ─────────────────────────────────────────────────────────────────────────
function useRuntimeRegistry(): RuntimeRegistry {
  // Returns singleton registry
  // Used to create/dispose runtimes
}

// ─────────────────────────────────────────────────────────────────────────
// BINDING HOOK - Manages which runtime UI observes (used by Track/Analyze)
// ─────────────────────────────────────────────────────────────────────────
function useRuntimeBinding(): {
  boundRuntimeId: string | null;
  boundRuntime: RuntimeInstance | null;
  availableRuntimes: RuntimeInstance[];
  bindTo: (id: string) => void;
  unbind: () => void;
} {
  const registry = useRuntimeRegistry();
  // Thin wrapper around registry binding state
}

// ─────────────────────────────────────────────────────────────────────────
// OBSERVER HOOK - Subscribes to bound runtime (used by UI panels)
// ─────────────────────────────────────────────────────────────────────────
function useRuntimeSnapshot(): RuntimeSnapshot | null {
  const { boundRuntime } = useRuntimeBinding();
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  
  useEffect(() => {
    if (!boundRuntime) {
      setSnapshot(null);
      return;
    }
    
    // Initial snapshot
    setSnapshot(captureSnapshot(boundRuntime));
    
    // Subscribe to changes
    return boundRuntime.subscribe(() => {
      setSnapshot(captureSnapshot(boundRuntime));
    });
  }, [boundRuntime]);
  
  return snapshot;
}

// ─────────────────────────────────────────────────────────────────────────
// CONTROL HOOK - Send commands to bound runtime (start/pause/stop)
// ─────────────────────────────────────────────────────────────────────────
function useRuntimeControls(): {
  start: () => void;
  pause: () => void;
  stop: () => void;
  step: () => void;
} {
  const { boundRuntime } = useRuntimeBinding();
  
  return {
    start: () => boundRuntime?.start(),
    pause: () => boundRuntime?.pause(),
    stop: () => boundRuntime?.stop(),
    step: () => boundRuntime?.step(),
  };
}
```

---

## Recommended Migration Path

### Phase 1: Make Runtime Self-Executing (Headless)

**Goal**: Runtime executes via internal interval, not React hook.

**Current State**: `useRuntimeExecution` hook owns the interval.

**Target State**: `RuntimeInstance` class owns the interval.

```typescript
class RuntimeInstance {
  private intervalId: NodeJS.Timeout | null = null;
  private listeners = new Set<RuntimeEventListener>();
  
  start() {
    if (this.intervalId) return;
    this.status = 'running';
    this.intervalId = setInterval(() => {
      this.runtime.handle(new TickEvent());
      this.notifyListeners('tick');
      
      if (this.runtime.isComplete()) {
        this.stop();
        this.notifyListeners('complete');
      }
    }, TICK_RATE_MS);
  }
  
  subscribe(listener: RuntimeEventListener): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

**Files to modify**:
- Create `src/runtime/RuntimeInstance.ts`
- Refactor `useRuntimeExecution` to be observer-only

---

### Phase 2: Introduce Runtime Registry

**Goal**: Multiple runtimes coexist, UI binds to one at a time.

**New files**:
- `src/runtime/RuntimeRegistry.ts` - Service class
- `src/components/layout/RuntimeRegistryProvider.tsx` - React context
- `src/hooks/useRuntimeRegistry.ts` - Access hook
- `src/hooks/useRuntimeBinding.ts` - Binding hook

```typescript
// RuntimeRegistry.ts
class RuntimeRegistry {
  private runtimes = new Map<string, RuntimeInstance>();
  private _boundId: string | null = null;
  private bindingListeners = new Set<() => void>();
  
  createRuntime(id: string, block: WodBlock): RuntimeInstance {
    const runtime = this.factory.createRuntime(block);
    const instance = new RuntimeInstance(id, runtime);
    this.runtimes.set(id, instance);
    return instance;
  }
  
  bindToRuntime(id: string) {
    this._boundId = id;
    this.bindingListeners.forEach(l => l());
  }
  
  get boundRuntime(): RuntimeInstance | null {
    return this._boundId ? this.runtimes.get(this._boundId) ?? null : null;
  }
}
```

---

### Phase 3: Refactor UI to Use Snapshots

**Goal**: UI panels consume `RuntimeSnapshot`, not `ScriptRuntime`.

**Files to modify**:
- [TimerIndexPanel.tsx](../src/components/layout/TimerIndexPanel.tsx)
  - Change prop from `runtime: ScriptRuntime` to consume `useRuntimeSnapshot()`
- [AnalyticsIndexPanel.tsx](../src/components/layout/AnalyticsIndexPanel.tsx)
  - Consume snapshot-based data
- [UnifiedWorkbench.tsx](../src/components/layout/UnifiedWorkbench.tsx)
  - Remove inline `transformRuntimeToAnalytics`
  - Use binding hooks instead of direct runtime prop drilling

```typescript
// Before: Direct runtime access
const TimerIndexPanel: FC<{ runtime: ScriptRuntime | null }> = ({ runtime }) => {
  const items = useMemo(() => {
    if (!runtime) return [];
    return runtime.executionLog.map(...);  // Direct access
  }, [runtime]);
};

// After: Snapshot-based
const TimerIndexPanel: FC = () => {
  const snapshot = useRuntimeSnapshot();
  const items = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.executionLog.map(...);  // Snapshot access
  }, [snapshot]);
};
```

---

### Phase 4: Add Runtime Selector UI

**Goal**: User can switch between runtimes in Track/Analyze views.

**New components**:
- `RuntimeSelector` dropdown showing all active runtimes
- Status indicators (running/paused/completed)
- Quick actions (start/pause per runtime)

```typescript
const RuntimeSelector: FC = () => {
  const { availableRuntimes, boundRuntimeId, bindTo } = useRuntimeBinding();
  
  return (
    <Select value={boundRuntimeId} onValueChange={bindTo}>
      {availableRuntimes.map(rt => (
        <SelectItem key={rt.id} value={rt.id}>
          {rt.metadata.name} ({rt.status})
        </SelectItem>
      ))}
    </Select>
  );
};
```

---

## Key Design Decisions

### 1. Runtime Executes Without Observers

**Decision**: Move execution loop from React hook to RuntimeInstance class.

**Rationale**:
- UI unmount should not stop workout execution
- Multiple UIs could observe same runtime (future: spectator mode)
- Enables headless execution for testing
- Cleaner separation of concerns

**Trade-off**: Need explicit lifecycle management (who disposes runtimes?)

### 2. Immutable Snapshots for UI Rendering

**Decision**: UI always renders from `RuntimeSnapshot`, never directly from runtime.

**Rationale**:
- Prevents race conditions between tick updates and React renders
- Makes runtime switching instant (just swap snapshot source)
- Enables time-travel debugging (replay from snapshot history)
- Simplifies component testing (mock snapshots easily)

**Trade-off**: Memory overhead of snapshot creation per tick (mitigate with throttling)

### 3. Binding vs Control Separation

**Decision**: Separate "which runtime am I observing" from "should this runtime execute".

**Rationale**:
- Binding changes are UI-only operations (instant, no side effects)
- Control commands affect runtime state (async, may fail)
- User can browse completed runtimes without affecting running ones

**Implementation**:
```typescript
// Binding = pure UI state
const { bindTo, boundRuntimeId } = useRuntimeBinding();
bindTo('runtime-2');  // Instant, just changes what we observe

// Control = affects runtime
const { start, pause } = useRuntimeControls();
start();  // Actually starts the bound runtime's execution loop
```

### 4. Plan View as Runtime Spawner

**Decision**: Plan view creates runtimes but doesn't observe them.

**Rationale**:
- Clear mental model: Plan = setup, Track/Analyze = observe
- Plan view stays lightweight (no subscription overhead)
- User explicitly chooses when to "start tracking" a workout

**Flow**:
```
User in Plan View
        │
        ├─► Edits workout script
        │
        ├─► Clicks "Start Workout" on a block
        │         │
        │         ├─► registry.createRuntime(block)
        │         ├─► registry.bindToRuntime(newId)
        │         └─► setViewMode('track')
        │
        └─► User now in Track View, observing new runtime
```

---

## Component Dependency Graph

```
                    UnifiedWorkbench
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
   WorkbenchContext  RuntimeRegistry  MetricsProvider
   (document state)  (runtime mgmt)   (analytics)
          │               │
          │    ┌──────────┴──────────────────────────┐
          │    │                                     │
          ▼    ▼                                     ▼
     ViewMode  │                              RuntimeInstance(s)
               │                              (self-executing)
               │
     ┌─────────┴──────────┐
     │                    │
     ▼                    ▼
  boundRuntimeId     RuntimeSnapshot
  (binding state)    (immutable view)
               │
     ┌─────────┴─────────────────────┐
     │                               │
     ▼                               ▼
TimerIndexPanel              AnalyticsIndexPanel
(renders snapshot)           (renders snapshot)
     │                               │
     └───────────────┬───────────────┘
                     │
                     ▼
               TimelineView
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Memory leaks from undisposed runtimes | High | High | Auto-dispose after 1 hour idle; max 5 concurrent runtimes |
| Performance with multiple running runtimes | Medium | Medium | Limit to 3 simultaneously executing runtimes |
| Stale snapshot data (race conditions) | Low | Medium | Immutable snapshots + React 18 concurrent features |
| Complexity of observer subscription cleanup | Medium | Medium | Standard useEffect cleanup pattern; WeakRef for listeners |
| Breaking existing single-runtime UI | Low | High | Adapter layer provides backward-compatible props |

---

## Conclusion

The target architecture establishes a clear separation:

| Layer | Responsibility | Lifecycle |
|-------|----------------|-----------|
| **Plan View** | Setup, editing, spawning runtimes | No runtime binding |
| **Runtime Registry** | Owns RuntimeInstances, manages bindings | App lifetime |
| **RuntimeInstance** | Self-executing workout engine | Until disposed |
| **Track/Analyze View** | Observes bound runtime via snapshots | Mounts/unmounts freely |

Key principles:
1. **Runtimes execute independently** - UI is just an observer
2. **Binding is instant** - Switch what you're watching without side effects
3. **Snapshots are immutable** - UI renders from point-in-time captures
4. **Clean mount/unmount** - UI can come and go; runtime persists

---

## References

- [Runtime Engine Deep Dive](./Runtime_Engine_Deep_Dive.md)
- [Runtime Behaviors Deep Dive](./Runtime_Behaviors_Deep_Dive.md)
- [Runtime Architecture Blocks & Strategies](./Runtime_Architecture_Blocks_Strategies.md)
- [Metrics Implementation Plan](./Metrics_Implementation_Plan.md)

---

## Appendix: Display Stack Architecture

The Display Stack system provides a way for runtime blocks to control what the Clock UI displays. This enables blocks to push/pop timer displays and content cards as they execute, creating a layered visualization of the workout state.

### Core Concepts

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DISPLAY STACK STATE                              │
│  (stored in runtime memory as DISPLAY_STACK_STATE)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Timer Stack                    Card Stack                               │
│  ─────────────                  ──────────                               │
│  ┌──────────────┐              ┌──────────────────┐                     │
│  │ EMOM Min 7   │ ← top       │ 12 KB Swings     │ ← top               │
│  │ (countdown)  │              │ (active-block)   │                      │
│  ├──────────────┤              ├──────────────────┤                      │
│  │ Total Time   │              │ Rest Card        │                      │
│  │ (countup)    │              │ (rest-period)    │                      │
│  └──────────────┘              └──────────────────┘                      │
│                                                                          │
│  workoutState: 'running' | 'idle' | 'paused' | 'complete'               │
│  currentRound: 7                                                         │
│  totalRounds: 12                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Types

**Timer Display Entry** (`ITimerDisplayEntry`):
```typescript
interface ITimerDisplayEntry {
  id: string;                    // Unique identifier
  ownerId: string;               // Block key that owns this entry
  timerMemoryId: string;         // Points to TimeSpan[] in memory
  label?: string;                // Display label (e.g., "AMRAP 20")
  format: 'countdown' | 'countup';
  durationMs?: number;           // For countdown format
  buttons?: IDisplayButton[];    // Optional action buttons
  priority?: number;             // Stack ordering (lower = shown first)
}
```

**Display Card Entry** (`IDisplayCardEntry`):
```typescript
interface IDisplayCardEntry {
  id: string;
  ownerId: string;
  type: 'idle-start' | 'idle-complete' | 'active-block' | 'rest-period' | 'custom';
  title?: string;
  subtitle?: string;
  metrics?: IDisplayMetric[];    // For active-block type
  componentId?: string;          // For custom type
  componentProps?: Record<string, unknown>;
  buttons?: IDisplayButton[];
  priority?: number;
}
```

### Runtime Actions

Blocks control the display stack through runtime actions:

```typescript
// Push a timer display when block mounts
class MyBlock implements IRuntimeBlock {
  mount(runtime: IScriptRuntime): IRuntimeAction[] {
    return [
      new PushTimerDisplayAction({
        id: `timer-${this.key}`,
        ownerId: this.key.toString(),
        timerMemoryId: this.timerRef.id,
        label: 'AMRAP 20',
        format: 'countdown',
        durationMs: 20 * 60 * 1000,
      }),
      new PushCardDisplayAction({
        id: `card-${this.key}`,
        ownerId: this.key.toString(),
        type: 'active-block',
        title: '10 Burpees',
        metrics: [
          { type: 'reps', value: 10, image: '10' },
          { type: 'effort', value: 'Burpees', image: 'Burpees' }
        ]
      })
    ];
  }
  
  unmount(runtime: IScriptRuntime): IRuntimeAction[] {
    return [
      new PopTimerDisplayAction(`timer-${this.key}`),
      new PopCardDisplayAction(`card-${this.key}`)
    ];
  }
}
```

### Available Actions

| Action | Purpose |
|--------|---------|
| `PushTimerDisplayAction` | Add a timer to the display stack |
| `PopTimerDisplayAction` | Remove a timer by ID or pop the top |
| `UpdateTimerDisplayAction` | Update an existing timer's properties |
| `PushCardDisplayAction` | Add a card to the display stack |
| `PopCardDisplayAction` | Remove a card by ID or pop the top |
| `UpdateCardDisplayAction` | Update an existing card's properties |
| `SetWorkoutStateAction` | Update global workout state |
| `SetRoundsDisplayAction` | Update round information |
| `ResetDisplayStackAction` | Clear all stacks to initial state |

### Card Component Registry

Custom card components can be registered for rendering:

```typescript
// Register a custom card component
import { CardComponentRegistry } from '@/clock';

const MyCustomCard: React.FC<CardComponentProps> = ({ entry, onButtonClick }) => {
  return (
    <div>
      <h2>{entry.title}</h2>
      {/* Custom rendering */}
    </div>
  );
};

CardComponentRegistry.register('my-custom-type', MyCustomCard);

// Use in a block
new PushCardDisplayAction({
  id: 'my-card',
  ownerId: 'my-block',
  type: 'custom',
  componentId: 'my-custom-type',
  componentProps: { /* custom props */ }
})
```

### React Hooks

The clock module provides hooks for accessing display state:

```typescript
// Get the complete display stack state
const displayState = useDisplayStack();

// Get just the current (top) timer
const currentTimer = useCurrentTimer();

// Get just the current (top) card
const currentCard = useCurrentCard();

// Get workout state
const workoutState = useWorkoutState();

// Get round info
const { currentRound, totalRounds } = useRoundsInfo();

// Check if timer stack is empty
const isEmpty = useIsTimerStackEmpty();
```

### UI Component

The `StackedClockDisplay` component renders the display stack:

```tsx
import { StackedClockDisplay, registerDefaultCards } from '@/clock';

// Register default card components on app init
registerDefaultCards();

// Use in your UI
function WorkoutPage() {
  return (
    <RuntimeProvider runtime={runtime}>
      <StackedClockDisplay 
        showStackDebug={true}  // Show debug visualization
        onButtonClick={(event, payload) => {
          // Handle button clicks
          runtime.handle({ name: event, data: payload });
        }}
      />
    </RuntimeProvider>
  );
}
```

### Integration with Multi-Runtime

The display stack integrates with the multi-runtime architecture:

1. **Per-Runtime State**: Each `ScriptRuntime` has its own display stack in memory
2. **Observer Pattern**: `StackedClockDisplay` subscribes to the bound runtime's display state
3. **Snapshot-Based**: UI renders from memory subscriptions, not direct state access
4. **Independent Execution**: Display updates happen as blocks execute, regardless of UI mount state

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       RUNTIME BINDING FLOW                               │
│                                                                          │
│  RuntimeInstance A          RuntimeInstance B                            │
│  ┌──────────────────┐      ┌──────────────────┐                        │
│  │ Display Stack    │      │ Display Stack    │                        │
│  │ ├── Timer: AMRAP │      │ ├── Timer: EMOM  │                        │
│  │ └── Card: Burpees│      │ └── Card: Squats │                        │
│  └────────┬─────────┘      └────────┬─────────┘                        │
│           │                         │                                    │
│           │  bound                  │                                    │
│           └────────────┬────────────┘                                    │
│                        │                                                 │
│                        ▼                                                 │
│              ┌─────────────────────┐                                    │
│              │ StackedClockDisplay │                                    │
│              │ (renders bound      │                                    │
│              │  runtime's stack)   │                                    │
│              └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────┘
```
