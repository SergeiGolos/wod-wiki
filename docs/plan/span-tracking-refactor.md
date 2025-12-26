# Span Tracking Refactor Plan

> **Created:** 2025-12-26  
> **Status:** Draft / Scratchpad  
> **Purpose:** Planning document for restructuring span tracking classes and interfaces

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Current Interfaces & Classes](#current-interfaces--classes)
3. [Issues / Pain Points](#issues--pain-points)
4. [Proposed Changes](#proposed-changes)
5. [Migration Strategy](#migration-strategy)

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ExecutionSpan (Model)                     │
│  - Core data structure for tracking block execution              │
│  - Location: src/runtime/models/ExecutionSpan.ts                 │
└───────────────────────────────▲─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────┴────────┐    ┌─────────┴─────────┐    ┌───────┴────────┐
│ExecutionTracker│    │ HistoryBehavior   │    │ExecutionLog    │
│(Central API)   │    │(Block Lifecycle)  │    │Service         │
│                │    │                   │    │(Persistence)   │
│ src/tracker/   │    │ src/runtime/      │    │ src/services/  │
│                │    │ behaviors/        │    │                │
└───────┬────────┘    └───────────────────┘    └────────────────┘
        │
        │ (uses Command Pattern)
        ▼
┌────────────────────────────────────────────┐
│ Tracker Commands (src/tracker/commands/)   │
│ - TrackSpanCommand  (start/end/update)     │
│ - TrackEventCommand (log/tag/context)      │
│ - TrackSectionCommand (segments)           │
└────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────────────┐
                    │  React Hooks                    │
                    │  src/clock/hooks/               │
                    │ - useExecutionSpans             │
                    │ - useExecutionSpan              │
                    │ - useSpanHierarchy              │
                    └─────────────────────────────────┘
```

---

## Current Interfaces & Classes

### Core Model (`src/runtime/models/ExecutionSpan.ts`)

```typescript
// === Types ===

export type SpanType =
  | 'timer'     // Time-based block (countdown, count-up)
  | 'rounds'    // Multi-round block
  | 'effort'    // Single exercise effort
  | 'group'     // Grouping container
  | 'interval'  // Interval training (generic)
  | 'emom'      // Every Minute on the Minute
  | 'amrap'     // As Many Rounds As Possible
  | 'tabata';   // Tabata intervals

export type SpanStatus =
  | 'active'    // Currently executing
  | 'completed' // Successfully finished
  | 'failed'    // Error occurred
  | 'skipped';  // Bypassed (e.g., user skip)

export type SegmentType =
  | 'work'       // Active work period
  | 'rest'       // Rest period
  | 'round'      // Individual round in a rounds-based workout
  | 'minute'     // Individual minute in EMOM
  | 'pause'      // User-initiated pause
  | 'transition'; // Between exercises/rounds

// === Interfaces ===

export interface DebugMetadata {
  tags: string[];
  context: Record<string, unknown>;
  logs?: string[];
}

export interface MetricValueWithTimestamp<T = number> {
  value: T;
  unit: string;
  recorded: number;
  source?: string;
}

export interface RecordedMetricValue<T = number> extends MetricValueWithTimestamp<T> {
  type: LegacyMetricValue['type'] | string;
  label?: string;
}

export interface MetricGroup {
  id?: string;
  label?: string;
  metrics: RecordedMetricValue[];
}

export interface SpanMetrics {
  // Exercise Identity
  exerciseId?: string;
  exerciseImage?: string;

  // Repetition Metrics
  reps?: MetricValueWithTimestamp<number>;
  targetReps?: number;

  // Resistance Metrics
  weight?: MetricValueWithTimestamp<number>;

  // Distance Metrics
  distance?: MetricValueWithTimestamp<number>;

  // Time Metrics
  duration?: MetricValueWithTimestamp<number>;
  elapsed?: MetricValueWithTimestamp<number>;
  remaining?: MetricValueWithTimestamp<number>;

  // Round Metrics
  currentRound?: number;
  totalRounds?: number;
  repScheme?: number[];

  // Other
  calories?: MetricValueWithTimestamp<number>;
  heartRate?: MetricValueWithTimestamp<number>;
  power?: MetricValueWithTimestamp<number>;
  cadence?: MetricValueWithTimestamp<number>;

  // Legacy Support
  legacyMetrics?: RuntimeMetric[];
  metricGroups?: MetricGroup[];

  // Extensible
  custom?: Map<string, MetricValueWithTimestamp<unknown>>;
}

export interface TimeSegment {
  id: string;
  parentSpanId: string;
  startTime: number;
  endTime?: number;
  type: SegmentType;
  label: string;
  index?: number;
  metrics?: Partial<SpanMetrics>;
}

export interface ExecutionSpan {
  // Identity
  id: string;
  blockId: string;
  parentSpanId: string | null;

  // Classification
  type: SpanType;
  label: string;

  // Lifecycle
  status: SpanStatus;
  startTime: number;
  endTime?: number;

  // Metrics
  metrics: SpanMetrics;

  // Fragments
  fragments?: ICodeFragment[];

  // Time Segments
  segments: TimeSegment[];

  // Source Info
  sourceIds?: number[];

  // Debug
  debugMetadata?: DebugMetadata;
}
```

### Tracker Interface (`src/tracker/ITrackerCommand.ts`)

```typescript
export interface TrackerContext {
    memory: IRuntimeMemory;
}

export interface ITrackerCommand {
    write(context: TrackerContext): ExecutionSpan[];
}
```

### ExecutionTracker (`src/tracker/ExecutionTracker.ts`)

```typescript
export class ExecutionTracker {
    constructor(private readonly memory: IRuntimeMemory) { }

    // Command execution
    execute(command: ITrackerCommand): ExecutionSpan[]

    // Span lifecycle
    startSpan(block: IRuntimeBlock, parentSpanId: string | null, debugMetadata?: DebugMetadata): ExecutionSpan
    endSpan(blockId: string, status: SpanStatus = 'completed'): void
    failSpan(blockId: string): void
    skipSpan(blockId: string): void
    appendFragments(blockId: string, fragments: ICodeFragment[]): void

    // Metric recording
    recordMetric<T>(blockId: string, metricKey: keyof SpanMetrics | string, value: T, unit: string, source?: string): void
    recordNumericMetric(blockId: string, metricKey: 'reps' | 'weight' | 'distance' | 'duration' | 'elapsed' | 'remaining' | 'calories', value: number, unit: string, source?: string): void
    recordRound(blockId: string, currentRound: number, totalRounds?: number, repScheme?: number[]): void

    // Segment management
    startSegment(blockId: string, type: SegmentType, label: string, index?: number): TimeSegment | null
    endSegment(blockId: string, segmentId?: string): void
    endAllSegments(blockId: string): void

    // Debug metadata
    addDebugLog(blockId: string, message: string): void
    addDebugTag(blockId: string, tag: string): void
    setDebugContext(blockId: string, context: Record<string, unknown>): void
    setDebugMetadata(blockId: string, debugMetadata: DebugMetadata): void

    // Queries
    getActiveSpan(blockId: string): ExecutionSpan | null
    getActiveSpanId(blockId: string): string | null
    getAllSpans(): ExecutionSpan[]
    getCompletedSpans(): ExecutionSpan[]
    getActiveSpansMap(): Map<string, ExecutionSpan>
    findSpanRef(blockId: string): TypedMemoryReference<ExecutionSpan> | null
    isKnownMetricKey(key: string): key is keyof SpanMetrics
}
```

### Tracker Commands (`src/tracker/commands/`)

```typescript
// TrackSpanCommand.ts
export type TrackSpanAction = 'start' | 'end' | 'fail' | 'skip' | 'update';

export interface TrackSpanPayload {
    action: TrackSpanAction;
    blockId: string;
    block?: IRuntimeBlock;
    parentSpanId?: string | null;
    status?: SpanStatus;
    metrics?: Partial<SpanMetrics>;
    segments?: TimeSegment[];
    debugMetadata?: Partial<DebugMetadata>;
    fragments?: ICodeFragment[];
}

export class TrackSpanCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackSpanPayload) { }
    write(context: TrackerContext): ExecutionSpan[]
}

// TrackEventCommand.ts
export type TrackEventAction = 'log' | 'tag' | 'context';

export interface TrackEventPayload {
    action: TrackEventAction;
    blockId: string;
    message?: string;
    tag?: string;
    context?: Record<string, unknown>;
}

export class TrackEventCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackEventPayload) { }
    write(context: TrackerContext): ExecutionSpan[]
}

// TrackSectionCommand.ts
export type TrackSectionAction = 'start' | 'end' | 'end-all';

export interface TrackSectionPayload {
    action: TrackSectionAction;
    blockId: string;
    type?: SegmentType;
    label?: string;
    index?: number;
    segmentId?: string;
}

export class TrackSectionCommand implements ITrackerCommand {
    constructor(private readonly payload: TrackSectionPayload) { }
    write(context: TrackerContext): ExecutionSpan[]
}
```

### HistoryBehavior (`src/runtime/behaviors/HistoryBehavior.ts`)

```typescript
export interface HistoryBehaviorConfig {
    label?: string;
    debugMetadata?: DebugMetadata;
}

export class HistoryBehavior implements IRuntimeBehavior {
    constructor(labelOrConfig?: string | HistoryBehaviorConfig)
    
    onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]
    onDispose(runtime: IScriptRuntime, block: IRuntimeBlock): void
    onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]
}
```

### ExecutionLogService (`src/services/ExecutionLogService.ts`)

```typescript
export class ExecutionLogService {
    constructor(private storage: LocalStorageProvider)

    startSession(runtime: IScriptRuntime, documentId?: string, documentTitle?: string): void
    getHistoricalLogs(): Promise<ExecutionSpan[]>
    finishSession(): void
    cleanup(): void
}
```

### React Hooks (`src/clock/hooks/useExecutionSpans.ts`)

```typescript
export interface ExecutionSpansData {
  active: ExecutionSpan[];
  completed: ExecutionSpan[];
  byId: Map<string, ExecutionSpan>;
  byBlockId: Map<string, ExecutionSpan>;
}

export function useExecutionSpans(runtime: IScriptRuntime | null): ExecutionSpansData
export function useExecutionLog(runtime: IScriptRuntime | null): { history: ExecutionSpan[]; active: ExecutionSpan[] }  // @deprecated
export function useExecutionSpan(runtime: IScriptRuntime | null, id: string | null, byBlockId?: boolean): ExecutionSpan | null
export function useSpanHierarchy(runtime: IScriptRuntime | null): Map<string, number>
```

---

## Issues / Pain Points

<!-- Add your pain points and issues here -->

1. **TODO:** ...
2. **TODO:** ...
3. **TODO:** ...

---

## Proposed Changes

### Option A: [Name]

<!-- Describe proposed changes here -->

```typescript
// Proposed interface changes
```

### Option B: [Name]

<!-- Alternative approach -->

```typescript
// Proposed interface changes
```

---

## Migration Strategy

### Phase 1: ...

<!-- Steps for phase 1 -->

### Phase 2: ...

<!-- Steps for phase 2 -->

---

## Notes / Scratch Space

<!-- Free-form notes, ideas, diagrams, etc. -->


