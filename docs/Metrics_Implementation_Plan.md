# Metrics & Analysis Implementation Plan

This document details the implementation steps required to build the automated tracking and analysis system for WOD Wiki. It bridges the gap between the current codebase and the architecture proposed in the [Runtime Engine Deep Dive](./Runtime_Engine_Deep_Dive.md).

## 1. Overview

**Goal**: Automatically track the execution duration and metrics of every runtime block (Timer, Round, Effort) to populate a historical log for the "Track and Analyze" UI.

**Current State**:
*   `ScriptRuntime` executes blocks but doesn't persist a structured history.
*   `EmitMetricAction` exists but isn't tied to specific execution spans.
*   `ExecutionRecord` interface exists but isn't used.

**Proposed Architecture**:
*   `ScriptRuntime` manages a map of `activeSpans`.
*   Pushing a block starts a span.
*   Popping a block ends a span and saves it to `executionLog`.
*   Metrics emitted during a block's life are attached to its span.

---

## 2. Implementation Steps

### Phase 1: Data Model Updates

#### 1.1 Update `ExecutionRecord`
Refine the existing interface to be more strict and align with `RuntimeMetric`.

**File**: `src/runtime/models/ExecutionRecord.ts`

```typescript
import { RuntimeMetric } from '../RuntimeMetric';

export interface ExecutionRecord {
    id: string;              // Unique ID for this record (e.g., UUID)
    blockId: string;         // The ID of the block (from BlockKey)
    parentId: string | null; // ID of the parent record (not parent block ID, but parent *span* ID)
    type: string;            // 'timer', 'rounds', 'effort', etc.
    label: string;           // Human-readable label ("Round 1", "Push-ups")
    startTime: number;       // Timestamp
    endTime?: number;        // Timestamp (undefined while active)
    status: 'active' | 'completed' | 'failed';
    metrics: RuntimeMetric[]; // Collection of metrics recorded during this span
}
```

#### 1.2 Update `IRuntimeBlock`
Add a `label` property to blocks so the runtime knows what to call them in the log.

**File**: `src/runtime/IRuntimeBlock.ts`

```typescript
export interface IRuntimeBlock {
    // ... existing properties ...
    
    /**
     * Human-readable label for the block.
     * Used for logging and UI display.
     * e.g., "Round 1", "21 Reps", "For Time"
     */
    readonly label: string;
}
```

*Action*: You will need to update `RuntimeBlock` base class and specific implementations (`TimerBlock`, `RoundsBlock`, etc.) to populate this label.

---

## 2. Phase 2: Runtime State Management

#### 2.1 Enhance `ScriptRuntime`
Add state to track active spans and the completed log.

**File**: `src/runtime/ScriptRuntime.ts`

```typescript
// Add imports
import { ExecutionRecord } from './models/ExecutionRecord';

export class ScriptRuntime implements IScriptRuntime {
    // ... existing properties ...
    
    // NEW: Track active spans by Block ID
    private _activeSpans: Map<string, ExecutionRecord> = new Map();
    
    // NEW: Completed history
    public readonly executionLog: ExecutionRecord[] = [];

    // ...
}
```

---

## 3. Phase 3: Lifecycle Hooks (The "Glue")

We need to intercept stack operations to manage spans automatically.

#### 3.1 Hook into `stack.push` (Start Span)

**File**: `src/runtime/ScriptRuntime.ts` -> `_setupMemoryAwareStack`

```typescript
this.stack.push = (block) => {
    // ... existing logging ...

    // 1. Identify Parent
    const parentBlock = this.stack.current;
    const parentSpan = parentBlock ? this._activeSpans.get(parentBlock.key.toString()) : null;

    // 2. Create Record
    const record: ExecutionRecord = {
        id: crypto.randomUUID(), // Or a simple counter
        blockId: block.key.toString(),
        parentId: parentSpan ? parentSpan.id : null,
        type: block.blockType || 'unknown',
        label: block.label || block.key.toString(),
        startTime: Date.now(),
        status: 'active',
        metrics: []
    };

    // 3. Store in Active Spans
    this._activeSpans.set(block.key.toString(), record);
    
    // ... existing push logic ...
    originalPush(block);
};
```

#### 3.2 Hook into `stack.pop` (End Span)

**File**: `src/runtime/ScriptRuntime.ts` -> `_setupMemoryAwareStack`

```typescript
this.stack.pop = () => {
    const poppedBlock = originalPop();

    if (poppedBlock) {
        const blockId = poppedBlock.key.toString();
        const record = this._activeSpans.get(blockId);

        if (record) {
            // 1. Finalize Record
            record.endTime = Date.now();
            record.status = 'completed';

            // 2. Move to Log
            this.executionLog.push(record);
            
            // 3. Remove from Active
            this._activeSpans.delete(blockId);
        }
        
        // ... existing dispose warning ...
    }
    return poppedBlock;
};
```

---

## 4. Phase 4: Metric Capture

We need to ensure that when a block says "I did 10 reps", that data goes into the *current* span.

#### 4.1 Update `EmitMetricAction` Handling

**File**: `src/runtime/ScriptRuntime.ts` -> `handle(event)`

Currently, `EmitMetricAction` calls `runtime.metrics.collect()`. We should intercept this or update `MetricCollector` to be aware of the current span.

**Option A: Intercept in Runtime (Simpler)**

Modify `EmitMetricAction.do()` or the loop in `ScriptRuntime` that executes actions.

```typescript
// In ScriptRuntime.handle() loop or a specific action handler:

if (action instanceof EmitMetricAction) {
    const currentBlock = this.stack.current;
    if (currentBlock) {
        const span = this._activeSpans.get(currentBlock.key.toString());
        if (span) {
            // Attach metric to the active span
            span.metrics.push(action.metric);
        }
    }
    // Still call the global collector if needed for aggregate stats
    action.do(this); 
}
```

---

## 5. Phase 5: UI Integration

#### 5.1 Expose Data
Ensure `ScriptRuntime` exposes `executionLog` publicly (it already does in the plan above).

#### 5.2 React Hook
Update `useRuntime` or create `useExecutionLog` to subscribe to changes.

```typescript
export function useExecutionLog(runtime: ScriptRuntime) {
    const [log, setLog] = useState(runtime.executionLog);

    useEffect(() => {
        // You might need to add a 'log-updated' event to runtime
        const unsubscribe = runtime.on('log-updated', () => {
            setLog([...runtime.executionLog]);
        });
        return unsubscribe;
    }, [runtime]);

    return log;
}
```

---

## 6. Summary of Changes

| File | Change |
| :--- | :--- |
| `src/runtime/models/ExecutionRecord.ts` | Update interface to include `metrics: RuntimeMetric[]` and `status`. |
| `src/runtime/IRuntimeBlock.ts` | Add `label: string` property. |
| `src/runtime/RuntimeBlock.ts` | Implement `label` property. |
| `src/runtime/ScriptRuntime.ts` | Add `_activeSpans`, `executionLog`. Hook into `push`/`pop` to manage spans. |
| `src/runtime/actions/EmitMetricAction.ts` | Ensure metrics are routed to the active span. |

This plan provides a minimally invasive way to add robust tracking to the existing engine without rewriting the core block logic.
