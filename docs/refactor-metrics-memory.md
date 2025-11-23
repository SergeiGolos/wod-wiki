# Refactor: Metrics Storage in Runtime Memory

## Overview
This refactor moves the storage of `ExecutionRecord`s from `ScriptRuntime` instance properties (`executionLog`, `_activeSpans`) to the `RuntimeMemory` system. This enables a reactive architecture where UI components can subscribe to memory changes instead of polling the runtime.

## Changes

### 1. ScriptRuntime (`src/runtime/ScriptRuntime.ts`)
- **Removed**: `executionLog` array and `_activeSpans` Map properties.
- **Added**: `executionLog` and `activeSpans` getters that query `RuntimeMemory` for backward compatibility.
- **Updated**: `_setupMemoryAwareStack` now allocates `ExecutionRecord`s in memory using `memory.allocate` (on push) and updates them using `memory.set` (on pop).
- **Key Benefit**: Execution state is now part of the unified memory model, accessible via `memory.search` and `memory.subscribe`.

### 2. EmitMetricAction (`src/runtime/actions/EmitMetricAction.ts`)
- **Updated**: Now searches for the active execution record in memory and updates it using `memory.set`.
- **Benefit**: Metric updates trigger memory subscriptions, allowing real-time UI updates.

### 3. HistoryBehavior (`src/runtime/behaviors/HistoryBehavior.ts`)
- **Updated**: Removed redundant logging to `executionLog`. `ScriptRuntime` now handles all execution logging automatically via stack hooks.

### 4. useExecutionLog Hook (`src/clock/hooks/useExecutionLog.ts`)
- **Updated**: Replaced `setInterval` polling with `runtime.memory.subscribe`.
- **Benefit**: UI updates only when data changes, eliminating polling overhead and latency.

## Memory Schema

### Execution Record
- **Type**: `'execution-record'`
- **OwnerId**: `blockId`
- **Visibility**: `'public'`
- **Value**: `ExecutionRecord` object

### Querying
```typescript
// Get all active spans
const activeRefs = memory.search({ type: 'execution-record', visibility: 'public' });
const activeRecords = activeRefs.map(ref => memory.get(ref)).filter(r => r.status === 'active');

// Get history
const historyRefs = memory.search({ type: 'execution-record' });
const historyRecords = historyRefs.map(ref => memory.get(ref)).filter(r => r.status === 'completed');
```

## Future Work
- **Metrics Repository**: Implement a persistent repository to save/load execution logs for analysis.
- **Granular Subscriptions**: Optimize UI to subscribe only to specific blocks if needed.
