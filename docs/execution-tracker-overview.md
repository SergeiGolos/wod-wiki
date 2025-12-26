# RuntimeReporter integration overview

## Interface surface
- `RuntimeReporter` is exposed via `IScriptRuntime.tracker` alongside `executionLog`/`activeSpans` compatibility getters.
- Tracker stores spans in `RuntimeMemory` under type `execution-span` and offers lifecycle (`startSpan`, `endSpan`, `failSpan`, `skipSpan`), metric (`recordMetric`, `recordNumericMetric`, `recordRound`), segment (`startSegment`, `endSegment`, `endAllSegments`), and debug metadata (`addDebugLog`, `addDebugTag`, `setDebugContext`) helpers plus queries (`getActiveSpan`, `getActiveSpanId`, `getAllSpans`, `getCompletedSpans`, `getActiveSpansMap`).
- Instantiation: `ScriptRuntime` creates `RuntimeReporter` with its `RuntimeMemory` and injects it into `RuntimeStack` (via `RuntimeStackOptions.tracker`), and exposes it through the `tracker` getter.

### Reference: key interfaces/classes (structure only)
```ts
// src/runtime/IScriptRuntime.ts
export interface IScriptRuntime {
  readonly memory: IRuntimeMemory;
  readonly stack: RuntimeStack;
  readonly tracker: RuntimeReporter;
  
  // TODO: remove executionLog and move in into the Tracker.
  readonly executionLog: TrackedSpan[]; // compat getter -> tracker.getCompletedSpans()
  isComplete(): boolean;
  handle(event: IEvent): void;
}

// TODO:
// This needs to be flippoed, I don't need to many diffent instance on the trackker. instead i want to apply a command pattern, allowing the Exeuction tracker to be responsible for the `TrackedSpan[]` array, (the runtime doesn't end to be concerned with those values) and the RuntimeReporter to take a ITrackerCommand interface, that can generates one or more `TrackedSpan` to add current log.

export class ITrackerCommand {
	write() : TrackedSpan[]
}

// TODO:
// Each of the functions that are defined in the current Execution Tracker now become instance of a class that takes all the arguments in the consutrctor and then returns the generated TrackedSpan... any methopds that don't result in trackker events don't need to be updated to the new format.

// src/runtime/RuntimeReporter.ts
export class RuntimeReporter {
  constructor(private readonly memory: IRuntimeMemory) {}
  startSpan(block: IRuntimeBlock, parentSpanId: string | null, debugMetadata?: DebugMetadata): TrackedSpan;
  endSpan(blockId: string, status?: SpanStatus): void;
  failSpan(blockId: string): void;
  skipSpan(blockId: string): void;
  recordMetric<T>(blockId: string, metricKey: keyof SpanMetrics | string, value: T, unit: string, source?: string): void;
  recordNumericMetric(blockId: string, metricKey: 'reps' | 'weight' | 'distance' | 'duration' | 'elapsed' | 'remaining' | 'calories', value: number, unit: string, source?: string): void;
  recordRound(blockId: string, currentRound: number, totalRounds?: number, repScheme?: number[]): void;
  startSegment(blockId: string, type: SegmentType, label: string, index?: number): TimeSegment | null;
  endSegment(blockId: string, segmentId?: string): void;
  endAllSegments(blockId: string): void;
  addDebugLog(blockId: string, message: string): void;
  addDebugTag(blockId: string, tag: string): void;
  setDebugContext(blockId: string, context: Record<string, unknown>): void;
  setDebugMetadata(blockId: string, debugMetadata: DebugMetadata): void;
  getActiveSpan(blockId: string): TrackedSpan | null;
  getActiveSpanId(blockId: string): string | null;
  getAllSpans(): TrackedSpan[];
  getCompletedSpans(): TrackedSpan[];
  getActiveSpansMap(): Map<string, TrackedSpan>;
  // internal helpers: findSpanRef, updateSpan, resolveSpanType, etc.
}

// TODO: runtime stack shouldn't can about the tracker, another part of the sofware will be resposible for those calls
// src/runtime/RuntimeStack.ts (integration points)
constructor(runtime: IScriptRuntime, tracker: RuntimeReporter, options: RuntimeStackOptions = {}) { ... }
public push(block: IRuntimeBlock, options?: BlockLifecycleOptions): void {
  const parentSpanId = parentBlock ? tracker.getActiveSpanId?.(parentKey) ?? null : null;
  tracker.startSpan(block, parentSpanId);
  // wrap/push, setStartTime, logging...
}
public pop(options?: BlockLifecycleOptions): IRuntimeBlock | undefined {
  // unmount, dispose, unregister...
  tracker.endSpan(ownerKey);
  // run parent.next, hooks, logging...
}

// TODO: these classes should all exist int he src/tracker/* directory along with the tests.
```



## Runtime wiring and data flow
- **Stack lifecycle hooks:** In `RuntimeStack.push`, the tracker is invoked with `startSpan(block, parentSpanId)` before blocks are wrapped/pushed. In `RuntimeStack.pop`, the tracker is called with `endSpan(ownerKey)` after unmount/dispose to close spans. The tracker also receives `getActiveSpanId` when computing parent span IDs for nested blocks.
- **Timestamping and metrics:** `RuntimeReporter` writes spans into `RuntimeMemory` on start; later metric/segment updates mutate the same memory records. Spans default to label/fragments derived from the block, inherit initial metrics (including `exerciseId` from block context), and automatically capture duration when ended if not set.
- **Debug metadata:** Tracker supports attaching debug logs/tags/context; `RuntimeStack` can emit `DebugLogEvent` through `onDebugLog`, but span-level debug data is stored via tracker calls from behaviors/actions.

## Current consumers
- **Hooks:** `useTrackedSpans` and `useExecutionLog` subscribe to `RuntimeMemory` for `execution-span` entries, splitting `active` vs `completed` spans and building lookup maps. These power UI without polling.
- **UI components:** `RuntimeHistoryLog` merges `runtime.executionLog` with `runtime.activeSpans` (tracker-backed) to produce unified timelines; `ExecutionLogPanel` reads `runtime.executionLog` and live `runtime.stack.blocks` for active segments; `TimerDisplay` accesses `activeSpans` to build stack items/fragments.
- **Services:** `ExecutionLogService` subscribes to memory changes for `execution-span`, maintains an in-memory map, and persists debounced logs to local storage with duration aggregation.
- **Tests and behaviors:** Stack lifecycle tests construct `RuntimeStack` with a fresh tracker; behaviors like `HistoryBehavior`, `LoopCoordinatorBehavior`, and blocks such as `EffortBlock` import `EXECUTION_SPAN_TYPE` for memory searches/interop.

## UI processing pipeline
1. `RuntimeStack.push` calls `tracker.startSpan` → span allocated in memory (with fragments/metrics).
2. Actions/behaviors call tracker metric/segment APIs during execution → memory entries mutate.
3. `RuntimeStack.pop` calls `tracker.endSpan` → status/duration finalized.
4. React hooks (`useTrackedSpans`/`useExecutionLog`) listen to memory updates → component state updates.
5. Components (`RuntimeHistoryLog`, `ExecutionLogPanel`, `TimerDisplay`) map spans to display items/segments; `ExecutionLogService` persists spans for history.
