# Unified Span & Timer Memory Model Plan

> **Created:** 2025-12-26  
> **Status:** Draft  
> **Purpose:** Consolidate `TrackedSpan`, `RuntimeSpan`, and timer memory models into a single unified span representation.

---

## Executive Summary

This plan consolidates the time-tracking models in the codebase:

| Current Model | Location | Purpose |
|---------------|----------|---------|
| `TrackedSpan` (interface) | `TrackedSpan.ts` | Analytics, history, UI display |
| `RuntimeSpan` (class) | `RuntimeSpan.ts` | Current execution tracking |
| `TimerState` / `TimerSpan` | `MemoryModels.ts` | Live UI timer state |
| `TimeSpan` | `RuntimeMetric.ts` | Metric capture timestamps |

**Goal:** Unify these into a single `RuntimeSpan` class that serves all use cases, with memory allocation supporting polymorphic span types (execution spans, timer spans, etc.).

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [Unified RuntimeSpan Model](#unified-runtimespan-model)
4. [Memory Model Changes](#memory-model-changes)
5. [Migration Plan](#migration-plan)
6. [Implementation Phases](#implementation-phases)
7. [Consumer Impact Matrix](#consumer-impact-matrix)

---

## Current State Analysis

### Model Comparison Matrix

| Feature | `TrackedSpan` | `RuntimeSpan` | `TimerState` |
|---------|---------------|---------------|--------------|
| **Time tracking** | `startTime`/`endTime` (numbers) | `spans: TimerSpan[]` | `spans: TimerSpan[]` |
| **Pause/resume** | Via `segments` | Via `spans` array | Via `spans` array |
| **Status** | `status: SpanStatus` (4 states) | `status?: SpanStatus` (2 states) | `isRunning: boolean` |
| **Identity** | `id`, `blockId`, `parentSpanId` | `blockId`, computed `id` | `blockId` |
| **Display data** | `label`, `type`, `fragments` | `fragments[][]` | `label`, `card` config |
| **Metrics** | Rich `SpanMetrics` object | Via fragments | N/A |
| **Hierarchy** | `parentSpanId` | None | N/A |
| **Debug** | `debugMetadata` | `metadata` | N/A |

### Key Observations

1. **`RuntimeSpan`** already exists and is used by `HistoryBehavior` and `ExecutionTracker`
2. **`TrackedSpan`** is a "legacy" interface that was never fully adopted
3. **`TimerState`** duplicates span tracking but adds UI-specific data (`label`, `format`, `card`)
4. **All three** use similar `TimerSpan`/time-span concepts but with incompatible shapes

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RuntimeSpan (Unified Class)                       │
│                                                                          │
│  Core span tracking for ALL block types (timers, rounds, efforts, etc.) │
│  - Identity: blockId, sourceIds                                          │
│  - Time: spans[] (pause/resume)                                          │
│  - Display: fragments[][] + displayConfig?                               │
│  - Status: 'failed' | 'skipped' | undefined                              │
│  - Metadata: tags, context, logs                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (extends with display config)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Timer-Specific Display Config                         │
│                                                                          │
│  Optional configuration stored on span OR in separate display entry      │
│  - format: 'up' | 'down'                                                 │
│  - durationMs?: number                                                   │
│  - card: { title, subtitle }                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Base model** | `RuntimeSpan` class | Already in use, has pause/resume support |
| **TrackedSpan fate** | **DELETE** | Align consumers to use `RuntimeSpan` directly |
| **TimerState fate** | **REFACTOR** | Store `RuntimeSpan` ref + display config |
| **Hierarchy** | **Reconstruct** | Derive from block relationships, not stored |
| **Metrics** | **Fragments** | Already decided in gap analysis |

---

## Unified RuntimeSpan Model

### Enhanced RuntimeSpan Class

```typescript
// src/runtime/models/RuntimeSpan.ts

import { ICodeFragment } from '../../core/models/CodeFragment';

/** Memory type identifier for runtime spans */
export const RUNTIME_SPAN_TYPE = 'runtime-span';

/**
 * Terminal status for a span.
 * If not present, the span is either active or successfully completed.
 */
export type SpanStatus = 'failed' | 'skipped';

/**
 * Metadata for a span, including tags, context, and logs.
 */
export interface SpanMetadata {
    tags: string[];
    context: Record<string, unknown>;
    logs: string[];
}

/**
 * Timer-specific display configuration.
 * Attached to spans that should show a timer UI.
 */
export interface TimerDisplayConfig {
    /** Timer direction */
    format: 'up' | 'down';
    /** Duration in ms (for countdown timers) */
    durationMs?: number;
    /** Display label for the timer */
    label: string;
    /** Card configuration for UI display */
    card?: {
        title: string;
        subtitle: string;
    };
    /** Timer role for display prioritization */
    role?: 'primary' | 'secondary' | 'auto';
}

/**
 * A discrete period of time within a span.
 * Multiple spans allow for pause/resume tracking.
 */
export class TimerSpan {
    constructor(
        public started: number,
        public ended?: number
    ) { }

    static fromJSON(json: any): TimerSpan {
        return new TimerSpan(json.started, json.ended);
    }

    get duration(): number {
        const end = this.ended ?? Date.now();
        return Math.max(0, end - this.started);
    }

    get isOpen(): boolean {
        return this.ended === undefined;
    }
}

/**
 * RuntimeSpan - Unified tracking model for block execution.
 * 
 * This is the SINGLE source of truth for tracking any block's execution,
 * including timers, rounds, efforts, and groups.
 */
export class RuntimeSpan {
    constructor(
        public blockId: string,
        public sourceIds: number[] = [],
        public spans: TimerSpan[] = [],
        public fragments: ICodeFragment[][] = [],
        public status?: SpanStatus,
        public metadata: SpanMetadata = { tags: [], context: {}, logs: [] },
        public parentSpanId?: string,
        /** Optional timer display configuration */
        public timerConfig?: TimerDisplayConfig
    ) { }

    /**
     * Unique identifier for the span instance.
     * Derived from start time and block ID to ensure uniqueness across executions.
     */
    get id(): string {
        const start = this.spans[0]?.started ?? 0;
        return `${start}-${this.blockId}`;
    }

    /**
     * Whether the span is currently running (has an open TimerSpan).
     */
    isActive(): boolean {
        return this.spans.length > 0 && this.spans[this.spans.length - 1].ended === undefined;
    }

    /**
     * Alias for isActive() for timer-specific contexts.
     */
    get isRunning(): boolean {
        return this.isActive();
    }

    /**
     * Total elapsed time across all TimerSpans in milliseconds.
     */
    total(): number {
        return this.spans.reduce((acc, span) => acc + span.duration, 0);
    }

    /**
     * Synonym for total() to align with common naming.
     */
    elapsed(): number {
        return this.total();
    }

    /**
     * Remaining time in ms, or undefined if span is unbounded.
     */
    remaining(): number | undefined {
        // Check timer config first
        if (this.timerConfig?.durationMs) {
            return Math.max(0, this.timerConfig.durationMs - this.total());
        }

        // Fall back to finding timer fragment
        const timerFragment = this.fragments
            .flat()
            .find(f => f.fragmentType === 'timer');

        if (!timerFragment?.value || typeof timerFragment.value !== 'number') {
            return undefined;
        }

        return Math.max(0, timerFragment.value - this.total());
    }

    /**
     * Start time of the first timer span.
     */
    get startTime(): number {
        return this.spans[0]?.started ?? 0;
    }

    /**
     * End time of the last timer span (if finished).
     */
    get endTime(): number | undefined {
        if (this.isActive()) return undefined;
        return this.spans[this.spans.length - 1]?.ended;
    }

    /**
     * Start tracking time (add new open span).
     */
    start(timestamp: number = Date.now()): void {
        // Don't start if already running
        if (this.isActive()) return;
        this.spans.push(new TimerSpan(timestamp));
    }

    /**
     * Stop tracking time (close current span).
     */
    stop(timestamp: number = Date.now()): void {
        if (!this.isActive()) return;
        this.spans[this.spans.length - 1].ended = timestamp;
    }

    /**
     * Pause is an alias for stop (creates gap in tracking).
     */
    pause(timestamp: number = Date.now()): void {
        this.stop(timestamp);
    }

    /**
     * Resume is an alias for start (begins new span).
     */
    resume(timestamp: number = Date.now()): void {
        this.start(timestamp);
    }

    /**
     * Reset all time spans.
     */
    reset(): void {
        this.spans = [];
    }

    /**
     * Derive a display label from fragments.
     */
    get label(): string {
        // Use timer config label if available
        if (this.timerConfig?.label) {
            return this.timerConfig.label;
        }

        // Derive from fragments
        const labelFragment = this.fragments
            .flat()
            .find(f => f.fragmentType === 'label' || f.fragmentType === 'effort');
        
        return labelFragment?.image?.toString() ?? this.blockId;
    }

    /**
     * Serialization
     */
    static fromJSON(json: any): RuntimeSpan {
        return new RuntimeSpan(
            json.blockId,
            json.sourceIds || [],
            (json.spans || []).map((s: any) => TimerSpan.fromJSON(s)),
            json.fragments || [],
            json.status,
            json.metadata || { tags: [], context: {}, logs: [] },
            json.parentSpanId,
            json.timerConfig
        );
    }

    toJSON(): any {
        return {
            blockId: this.blockId,
            sourceIds: this.sourceIds,
            spans: this.spans,
            fragments: this.fragments,
            status: this.status,
            metadata: this.metadata,
            parentSpanId: this.parentSpanId,
            timerConfig: this.timerConfig,
            _model: RUNTIME_SPAN_TYPE
        };
    }
}
```

---

## Memory Model Changes

### Before: Separate Timer Memory

```typescript
// Current: MemoryModels.ts
export interface TimerSpan {
    start: number;
    stop?: number;
    state: 'new' | 'reported';
}

export interface TimerState {
    blockId: string;
    label: string;
    format: 'up' | 'down' | 'time';
    durationMs?: number;
    card?: TimerCardConfig;
    spans: TimerSpan[];
    isRunning: boolean;
}

// Allocated as:
// memory.allocate<TimerState>(`timer:${blockId}`, blockId, timerState, 'public');
```

### After: Unified Span Memory

```typescript
// New: RuntimeSpan with optional timer config
export interface TimerDisplayConfig {
    format: 'up' | 'down';
    durationMs?: number;
    label: string;
    card?: { title: string; subtitle: string; };
    role?: 'primary' | 'secondary' | 'auto';
}

// RuntimeSpan now includes optional timerConfig
export class RuntimeSpan {
    // ... existing properties
    public timerConfig?: TimerDisplayConfig;
    
    // Computed property for UI hooks
    get isRunning(): boolean { return this.isActive(); }
}

// Allocated as:
// memory.allocate<RuntimeSpan>(RUNTIME_SPAN_TYPE, blockId, runtimeSpan, 'public');
```

### Memory Type Consolidation

| Old Type | New Type | Notes |
|----------|----------|-------|
| `timer:${blockId}` | `runtime-span` | Search by `ownerId` |
| `execution-span` | `runtime-span` | Already using this |
| `runtime:span` | `runtime-span` | Normalize constant |

---

## Migration Plan

### Phase 1: Enhance RuntimeSpan (Non-Breaking)

**Goal:** Add timer-specific capabilities to `RuntimeSpan` without breaking existing consumers.

1. **Add `TimerDisplayConfig`** interface to `RuntimeSpan.ts`
2. **Add optional `timerConfig`** property to `RuntimeSpan`
3. **Add `isRunning` getter** as alias for `isActive()`
4. **Add `start()`, `stop()`, `pause()`, `resume()`, `reset()` methods**
5. **Add `label` getter** that derives from config or fragments
6. **Export new types** for timer configuration

### Phase 2: Update TimerStateManager

**Goal:** Have `TimerStateManager` work with `RuntimeSpan` instead of `TimerState`.

1. **Refactor `TimerStateManager.initialize()`**:
   - Create `RuntimeSpan` with `timerConfig` instead of `TimerState`
   - Allocate with `RUNTIME_SPAN_TYPE`
   
2. **Refactor `TimerStateManager.updateState()`**:
   - Call `RuntimeSpan.start()` / `RuntimeSpan.stop()` methods
   - Update the span in memory
   
3. **Update `getTimerRef()`** return type to `TypedMemoryReference<RuntimeSpan>`

4. **Update timer-related display actions** to read from `RuntimeSpan.timerConfig`

### Phase 3: Update TimerBehavior

**Goal:** `TimerBehavior` now manages a `RuntimeSpan` with timer config.

1. **Remove internal `TimeSpan` type alias**
2. **Update `getTimeSpans()`** to return `TimerSpan[]` from `RuntimeSpan.spans`
3. **Simplify state methods** to delegate to `RuntimeSpan`

### Phase 4: Update Timer Hooks

**Goal:** Hooks read from unified `RuntimeSpan` model.

1. **`useTimerElapsed`**:
   - Search for `RUNTIME_SPAN_TYPE` instead of `timer:*`
   - Read `spans` and `isRunning` from `RuntimeSpan`

2. **`useTimerReferences`**:
   - Return `RuntimeSpan` reference or derived values
   - Add `useTimerSpan(blockKey)` hook

### Phase 5: Delete TrackedSpan Interface

**Goal:** Remove legacy interface and align all consumers.

1. **Update `useTrackedSpans`** to return `RuntimeSpan[]` 
2. **Update `ExecutionLogService`** to store `RuntimeSpan`
3. **Update `RuntimeReporter`** commands to use `RuntimeSpan`
4. **Delete** `TrackedSpan` interface and related types:
   - `SpanType`
   - `SpanStatus` (keep the one in `RuntimeSpan.ts`)
   - `SegmentType`
   - `SpanMetrics`
   - `TimeSegment`
   - `DebugMetadata`

### Phase 6: Consolidate MemoryModels

**Goal:** Remove duplicated timer-span types.

1. **Delete from `MemoryModels.ts`**:
   - `TimerSpan` interface (use `TimerSpan` class from `RuntimeSpan.ts`)
   - `TimerState` interface (now part of `RuntimeSpan` with `timerConfig`)
   - `TimerCardConfig` interface (moved to `TimerDisplayConfig`)

2. **Update imports** across codebase

---

## Implementation Phases

### Quick Reference Checklist

#### Phase 1: Enhance RuntimeSpan
- [ ] Add `TimerDisplayConfig` interface
- [ ] Add `timerConfig?: TimerDisplayConfig` to `RuntimeSpan`
- [ ] Add `isRunning` getter
- [ ] Add `start()`, `stop()`, `pause()`, `resume()`, `reset()` methods
- [ ] Add `label` getter
- [ ] Update serialization

#### Phase 2: Update TimerStateManager
- [ ] Change `timerRef` type to `TypedMemoryReference<RuntimeSpan>`
- [ ] Update `initialize()` to create `RuntimeSpan` with `timerConfig`
- [ ] Update `updateState()` to use `RuntimeSpan` methods
- [ ] Update `getTimerRef()` return type

#### Phase 3: Update TimerBehavior
- [ ] Remove local `TimeSpan` type
- [ ] Update internal state management
- [ ] Test pause/resume flow

#### Phase 4: Update Timer Hooks
- [ ] Update `useTimerElapsed` to use `RuntimeSpan`
- [ ] Update `useTimerReferences` or create `useTimerSpan`
- [ ] Update `TimerMemoryVisualization` component

#### Phase 5: Delete TrackedSpan
- [ ] Migrate all `TrackedSpan` type references
- [ ] Update hooks to return `RuntimeSpan`
- [ ] Delete `TrackedSpan.ts` types

#### Phase 6: Clean Up
- [ ] Remove `TimerState` from `MemoryModels.ts`
- [ ] Update all imports
- [ ] Run all tests
- [ ] Update documentation

---

## Consumer Impact Matrix

| Consumer | Current Type | After | Migration Effort |
|----------|--------------|-------|------------------|
| `useTrackedSpans` | `TrackedSpan[]` | `RuntimeSpan[]` | Low - interface similar |
| `useTimerElapsed` | `TimerState` | `RuntimeSpan` | Medium - property names change |
| `TimerBehavior` | Internal spans | `RuntimeSpan` | Medium - refactor state |
| `TimerStateManager` | `TimerState` | `RuntimeSpan` | High - central refactor |
| `HistoryBehavior` | `RuntimeSpan` | `RuntimeSpan` | None - already aligned |
| `ExecutionLogService` | `RuntimeSpan` | `RuntimeSpan` | Low - add timer support |
| `RuntimeReporter` | `RuntimeSpan` | `RuntimeSpan` | None - already aligned |
| Display Actions | `TimerState` | `RuntimeSpan.timerConfig` | Medium |
| `TimerMemoryVisualization` | `TimeSpan[]` | `TimerSpan[]` | Low - shape similar |

---

## Open Questions

| Question | Proposed Answer |
|----------|----------------|
| Should timer config be stored ON the span or separately? | ON the span via `timerConfig` - simpler, single source of truth |
| How do we handle display actions that expect `TimerState`? | Update actions to read from `RuntimeSpan.timerConfig` |
| What about components that depend on `TimerState` shape? | Create adapter or update components |
| Keep `parentSpanId` or reconstruct? | Keep it for now, mark deprecated, remove in later phase |

---

## Success Criteria

1. **Single Span Type**: Only `RuntimeSpan` class used for all tracking
2. **Unified Memory**: All spans use `RUNTIME_SPAN_TYPE` memory key
3. **Timer Support**: Timer-specific display works via `timerConfig`
4. **No Regressions**: All existing tests pass
5. **Clean Delete**: `TrackedSpan.ts` types removed, `MemoryModels.ts` simplified

---

## References

- [Span Model Gap Analysis](./span-model-gap-analysis.md)
- [Span Tracking Refactor](./span-tracking-refactor.md)
- Current `RuntimeSpan.ts`: `src/runtime/models/RuntimeSpan.ts`
- Current `TrackedSpan.ts`: `src/runtime/models/TrackedSpan.ts`
- Current `MemoryModels.ts`: `src/runtime/models/MemoryModels.ts`
