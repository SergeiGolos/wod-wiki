# Plan: ExecutionSpan Consolidation

## Overview

This plan addresses the consolidation of execution tracking into a single source of truth: `ExecutionSpan`. The goal is to eliminate side channels and ensure all visualization, analytics, and storage derive from the `executionLog` property on the runtime.

## Context

### Current Architecture

The WOD Wiki runtime tracks execution through multiple channels:

1. **`executionLog` (Primary)** - A runtime property (`IScriptRuntime.executionLog`) containing an array of completed `ExecutionSpan` objects
2. **Real-time Events (Side Channel)** - UI listens to `timer:tick` events directly for countdowns
3. **Console Logs (Side Channel)** - Debug information logged to console
4. **Local Storage (Persistence)** - Saves `WodResult` for workout history

### Key Interfaces

```typescript
// src/runtime/IScriptRuntime.ts
export interface IScriptRuntime {
    // ... other properties

    /** Persistent log of completed execution spans */
    readonly executionLog: ExecutionSpan[];
}
```

```typescript
// src/runtime/models/ExecutionSpan.ts
export interface ExecutionSpan {
    id: string;
    blockId: string;
    parentSpanId: string | null;
    type: SpanType;
    label: string;
    status: SpanStatus;
    startTime: number;
    endTime?: number;
    metrics: SpanMetrics;
    segments: TimeSegment[];
    sourceIds?: number[];
}
```

## Gap Analysis

| Channel | Current State | Target State | Action |
|---------|--------------|--------------|--------|
| `executionLog` | ✅ Canonical | ✅ Canonical | Keep as-is |
| Real-time Events | UI consumes directly | Acceptable for display | Document acceptable latency use |
| Console Logs | Scattered debug output | Migrate to `DebugMetadata` | Add metadata field to `ExecutionSpan` |
| Local Storage | Saves `WodResult` | Serialize from `executionLog` | Ensure strict derivation |

## Proposed Changes

### 1. Add DebugMetadata Field to ExecutionSpan

**Before:**
```typescript
// src/runtime/models/ExecutionSpan.ts
export interface ExecutionSpan {
    id: string;
    blockId: string;
    parentSpanId: string | null;
    type: SpanType;
    label: string;
    status: SpanStatus;
    startTime: number;
    endTime?: number;
    metrics: SpanMetrics;
    segments: TimeSegment[];
    sourceIds?: number[];
}
```

**After:**
```typescript
// src/runtime/models/ExecutionSpan.ts
export interface ExecutionSpan {
    id: string;
    blockId: string;
    parentSpanId: string | null;
    type: SpanType;
    label: string;
    status: SpanStatus;
    startTime: number;
    endTime?: number;
    metrics: SpanMetrics;
    segments: TimeSegment[];
    sourceIds?: number[];
    
    // NEW: Debug and context metadata
    debugMetadata?: DebugMetadata;
}

export interface DebugMetadata {
    /** Tags for categorization (e.g., "AMRAP", "EMOM") */
    tags: string[];
    /** Arbitrary key-value context captured during execution */
    context: Record<string, unknown>;
    /** Captured log messages during this span */
    logs?: string[];
}
```

### 2. Create Unified AnalyticsTransformer Contract

Ensure `AnalyticsTransformer` is the **only** component reading raw spans.

**Before:**
```typescript
// Various UI components
function WorkoutDisplay({ runtime }: Props) {
    // PROBLEM: Direct access to executionLog
    const spans = runtime.executionLog;
    return spans.map(s => <SpanCard span={s} />);
}
```

**After:**
```typescript
// src/services/AnalyticsTransformer.ts
export class AnalyticsTransformer {
    /** Transform raw spans into UI-ready Segments */
    toSegments(spans: ExecutionSpan[]): Segment[];
    
    /** Group segments by configured analytics */
    toAnalyticsGroup(segments: Segment[]): AnalyticsGroup;
}

// UI components
function WorkoutDisplay({ transformer, spans }: Props) {
    // CORRECT: UI consumes Segments, not raw spans
    const segments = transformer.toSegments(spans);
    return segments.map(s => <SegmentCard segment={s} />);
}
```

### 3. Rich Metadata at Creation Time

All context (e.g., "This was an AMRAP round") must be stamped onto the `ExecutionSpan` at creation time, not inferred later.

**Before:**
```typescript
// Strategy creates span without context
function createSpanForBlock(block: IRuntimeBlock): ExecutionSpan {
    return createExecutionSpan(
        block.key.toString(),
        'amrap',
        '20:00 AMRAP',
        null
    );
}

// Later in analytics - PROBLEM: inferring context
function analyzeSpan(span: ExecutionSpan) {
    // Guessing based on type
    const isAmrap = span.type === 'amrap';
}
```

**After:**
```typescript
// Strategy creates span WITH context
function createSpanForBlock(block: IRuntimeBlock): ExecutionSpan {
    const span = createExecutionSpan(
        block.key.toString(),
        'amrap',
        '20:00 AMRAP',
        null
    );
    
    // Stamp context at creation
    span.debugMetadata = {
        tags: ['amrap', 'time_bound', 'max_rounds'],
        context: {
            strategyUsed: 'TimeBoundRoundsStrategy',
            timerDuration: 1200000,
            targetRounds: Infinity
        },
        logs: []
    };
    
    return span;
}
```

## Implementation Steps

1. **Add `DebugMetadata` interface** to `src/runtime/models/ExecutionSpan.ts`
2. **Add optional `debugMetadata` field** to `ExecutionSpan` interface
3. **Update `createExecutionSpan` factory** to optionally accept debug metadata
4. **Audit strategies** to ensure they stamp metadata at span creation
5. **Update `AnalyticsTransformer`** to expose typed transformation methods
6. **Migrate UI components** to consume `Segment` instead of raw `ExecutionSpan`

## Files to Modify

- `src/runtime/models/ExecutionSpan.ts` - Add DebugMetadata interface and field
- `src/runtime/strategies/*.ts` - Stamp metadata during span creation
- `src/services/AnalyticsTransformer.ts` - Add typed transformation methods
- `src/clock/components/*.tsx` - Migrate to Segment consumption

## Testing

1. Unit tests for `DebugMetadata` creation and serialization
2. Integration tests verifying metadata flows through transformer
3. E2E tests confirming UI displays correctly from transformed segments

## Related Documents

- `docs/plans/unified-execution-metrics.md` - Original metrics consolidation plan
- `src/runtime/models/ExecutionSpan.ts` - Current interface definitions
