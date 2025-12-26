/**
 * TrackedSpan - Unified execution and metrics tracking model
 * 
 * Consolidates ExecutionRecord and RuntimeMetric collection into a single
 * cohesive model that supports:
 * - Block lifecycle tracking (start/end/status)
 * - Hierarchical parent-child relationships
 * - Unified metric collection
 * - Timestamp groupings via TimeSegments
 * 
 * @see docs/plans/unified-execution-metrics.md
 */

import { MetricValue as LegacyMetricValue, RuntimeMetric } from '../RuntimeMetric';
import { ICodeFragment } from '../../core/models/CodeFragment';

/** Memory type identifier for execution spans */
export const EXECUTION_SPAN_TYPE = 'execution-span';

// ============================================================================
// Span Types & Status
// ============================================================================

/**
 * Classification of execution span types.
 * Determines how the span is displayed and what metrics are expected.
 */
export type SpanType =
  | 'timer'     // Time-based block (countdown, count-up)
  | 'rounds'    // Multi-round block
  | 'effort'    // Single exercise effort
  | 'group'     // Grouping container
  | 'interval'  // Interval training (generic)
  | 'emom'      // Every Minute on the Minute
  | 'amrap'     // As Many Rounds As Possible
  | 'tabata';   // Tabata intervals

/**
 * Lifecycle status of an execution span.
 */
export type SpanStatus =
  | 'active'    // Currently executing
  | 'completed' // Successfully finished
  | 'failed'    // Error occurred
  | 'skipped';  // Bypassed (e.g., user skip)

/**
 * Classification of time segments within a span.
 */
export type SegmentType =
  | 'work'       // Active work period
  | 'rest'       // Rest period
  | 'round'      // Individual round in a rounds-based workout
  | 'minute'     // Individual minute in EMOM
  | 'pause'      // User-initiated pause
  | 'transition'; // Between exercises/rounds

// ============================================================================
// Debug Metadata
// ============================================================================

/**
 * DebugMetadata - Contextual information captured at span creation time.
 * 
 * This eliminates the need to infer context later during analytics.
 * All relevant information (strategy used, workout type tags, etc.)
 * is stamped onto the span when it is created.
 * 
 * @see docs/plans/jit-01-execution-span-consolidation.md
 */
export interface DebugMetadata {
  /** Tags for categorization (e.g., "amrap", "emom", "time_bound", "rounds_based") */
  tags: string[];
  /** Arbitrary key-value context captured during execution */
  context: Record<string, unknown>;
  /** Captured log messages during this span */
  logs?: string[];
}

// ============================================================================
// Metric Value
// ============================================================================

/**
 * A single metric value with timestamp and source tracking.
 * 
 * Unlike the legacy MetricValue, this includes:
 * - Recording timestamp for when the value was captured
 * - Optional source identifier for tracing
 */
export interface MetricValueWithTimestamp<T = number> {
  /** The metric value */
  value: T;
  /** Unit of measurement (e.g., 'reps', 'lb', 'kg', 'm', 'ms') */
  unit: string;
  /** Unix timestamp (ms) when this value was recorded */
  recorded: number;
  /** Source identifier (behavior name, block id, etc.) */
  source?: string;
}

/**
 * Rich metric value with type information for grouped emission.
 * This is the unified shape for metrics derived from fragments (replacing legacy MetricValue).
 */
export interface RecordedMetricValue<T = number> extends MetricValueWithTimestamp<T> {
  /** Metric type discriminator (matches legacy MetricValue types) */
  type: LegacyMetricValue['type'] | string;
  /** Optional display label if different from type/unit */
  label?: string;
}

/**
 * Grouped metrics representing a collection captured for a span or time segment.
 * Supports metrics[][] semantics without flattening.
 */
export interface MetricGroup {
  /** Optional identifier for tracing */
  id?: string;
  /** Human-readable label (e.g., exercise name, round label) */
  label?: string;
  /** Metrics contained in this group */
  metrics: RecordedMetricValue[];
}

// ============================================================================
// Span Metrics
// ============================================================================

/**
 * SpanMetrics - All metric data for a single TrackedSpan
 * 
 * Provides typed properties for common metrics while allowing
 * extensibility through the custom map.
 */
export interface SpanMetrics {
  // === Exercise Identity ===
  /** Exercise name/ID if this is an effort span */
  exerciseId?: string;
  /** Thumbnail image URL for UI display */
  exerciseImage?: string;

  // === Repetition Metrics ===
  /** Completed repetitions */
  reps?: MetricValueWithTimestamp<number>;
  /** Target repetitions (goal) */
  targetReps?: number;

  // === Resistance Metrics ===
  /** Weight used */
  weight?: MetricValueWithTimestamp<number>;

  // === Distance Metrics ===
  /** Distance covered */
  distance?: MetricValueWithTimestamp<number>;

  // === Time Metrics ===
  /** Total duration of the span */
  duration?: MetricValueWithTimestamp<number>;
  /** Running elapsed time (for count-up timers) */
  elapsed?: MetricValueWithTimestamp<number>;
  /** Remaining time (for countdown timers) */
  remaining?: MetricValueWithTimestamp<number>;

  // === Round Metrics ===
  /** Current round number (1-indexed) */
  currentRound?: number;
  /** Total rounds in set */
  totalRounds?: number;
  /** Rep scheme array (e.g., [21, 15, 9]) */
  repScheme?: number[];

  // === Calories ===
  /** Calories burned */
  calories?: MetricValueWithTimestamp<number>;

  // === Biometrics (future) ===
  /** Heart rate */
  heartRate?: MetricValueWithTimestamp<number>;
  /** Power output */
  power?: MetricValueWithTimestamp<number>;
  /** Cadence (RPM) */
  cadence?: MetricValueWithTimestamp<number>;

  // === Legacy Metrics ===
  /** 
   * Legacy RuntimeMetric array for backward compatibility.
   * New code should use typed properties above.
   */
  legacyMetrics?: RuntimeMetric[];

  /**
   * Grouped metrics derived from fragments or runtime capture (preferred over legacy arrays).
   * Each group represents a metrics[][] collection for a span or segment.
   */
  metricGroups?: MetricGroup[];

  // === Extensible Metrics ===
  /** Custom metrics not covered by typed properties */
  custom?: Map<string, MetricValueWithTimestamp<unknown>>;
}

// ============================================================================
// Time Segment
// ============================================================================

/**
 * TimeSegment - A time-bounded subdivision of an TrackedSpan
 * 
 * Use cases:
 * - EMOM: Each minute is a segment
 * - Rounds: Each round is a segment
 * - Tabata: Work/rest periods are segments
 * - Rest periods: Track rest vs work time
 * - Pauses: Track user-initiated pauses
 */
export interface TimeSegment {
  /** Unique segment identifier */
  id: string;
  /** Parent span ID this segment belongs to */
  parentSpanId: string;

  // === Time Bounds ===
  /** Unix timestamp (ms) when segment started */
  startTime: number;
  /** Unix timestamp (ms) when segment ended (undefined while active) */
  endTime?: number;

  // === Classification ===
  /** Type of segment */
  type: SegmentType;
  /** Human-readable label (e.g., "Round 1", "Minute 3", "Rest") */
  label: string;
  /** Position in sequence (0-indexed) */
  index?: number;

  // === Metrics Recorded During This Segment ===
  /** Metrics captured specifically during this time window */
  metrics?: Partial<SpanMetrics>;
}

// ============================================================================
// Execution Span
// ============================================================================

/**
 * TrackedSpan - The single source of truth for a block's execution
 * 
 * Replaces ExecutionRecord with a unified model that includes:
 * - Full lifecycle tracking
 * - Hierarchical relationships via parentSpanId
 * - Unified metrics collection
 * - Timestamp groupings via segments
 */
export interface TrackedSpan {
  // === Identity ===
  /** Unique span identifier (timestamp-blockId format) */
  id: string;
  /** Block key as string */
  blockId: string;
  /** Links to parent TrackedSpan.id (NOT parent block ID) */
  parentSpanId: string | null;

  // === Classification ===
  /** Type of span (determines display and expected metrics) */
  type: SpanType;
  /** Human-readable label (e.g., "21-15-9", "10 Burpees", "5:00") */
  label: string;

  // === Lifecycle ===
  /** Current status */
  status: SpanStatus;
  /** Unix timestamp (ms) when span started */
  startTime: number;
  /** Unix timestamp (ms) when span ended (undefined while active) */
  endTime?: number;

  // === Metrics ===
  /** All metrics for this span */
  metrics: SpanMetrics;

  /** Fragments carried forward from the originating statements */
  fragments?: ICodeFragment[];

  // === Time Segments ===
  /** Sub-spans for detailed tracking (rounds, minutes, etc.) */
  segments: TimeSegment[];

  // === Source Info ===
  /** Source line IDs from the workout script */
  sourceIds?: number[];

  // === Debug & Context ===
  /** 
   * Debug metadata captured at span creation time.
   * Eliminates the need to infer context during analytics.
   * @see docs/plans/jit-01-execution-span-consolidation.md
   */
  debugMetadata?: DebugMetadata;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a span type indicates a timer-based block
 */
export function isTimerSpan(type: SpanType): boolean {
  return type === 'timer' || type === 'emom' || type === 'amrap' || type === 'tabata';
}

/**
 * Check if a span type indicates a rounds-based block
 */
export function isRoundsSpan(type: SpanType): boolean {
  return type === 'rounds';
}

/**
 * Check if a span type indicates an effort block
 */
export function isEffortSpan(type: SpanType): boolean {
  return type === 'effort';
}

/**
 * Check if a span is currently active
 */
export function isActiveSpan(span: TrackedSpan): boolean {
  return span.status === 'active';
}

/**
 * Check if a span has completed (successfully or not)
 */
export function isFinishedSpan(span: TrackedSpan): boolean {
  return span.status === 'completed' || span.status === 'failed' || span.status === 'skipped';
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an empty SpanMetrics object
 */
export function createEmptyMetrics(): SpanMetrics {
  return {
    custom: new Map()
  };
}

/**
 * Create a new TrackedSpan
 */
export function createTrackedSpan(
  blockId: string,
  type: SpanType,
  label: string,
  parentSpanId: string | null = null,
  sourceIds?: number[],
  debugMetadata?: DebugMetadata,
  extra?: Partial<TrackedSpan>
): TrackedSpan {
  return {
    id: `${Date.now()}-${blockId}`,
    blockId,
    parentSpanId,
    type,
    label,
    status: 'active',
    startTime: Date.now(),
    metrics: createEmptyMetrics(),
    segments: [],
    sourceIds,
    ...(debugMetadata && { debugMetadata }),
    ...(extra || {})
  };
}

/**
 * Create a DebugMetadata object with default values.
 * Use this when stamping context onto spans at creation time.
 */
export function createDebugMetadata(
  tags: string[] = [],
  context: Record<string, unknown> = {}
): DebugMetadata {
  return {
    tags,
    context,
    logs: []
  };
}

/**
 * Create a new TimeSegment
 */
export function createTimeSegment(
  parentSpanId: string,
  type: SegmentType,
  label: string,
  index?: number
): TimeSegment {
  return {
    id: `${parentSpanId}-seg-${Date.now()}`,
    parentSpanId,
    startTime: Date.now(),
    type,
    label,
    index,
    metrics: {}
  };
}

// ============================================================================
// Conversion Utilities (Legacy Support)
// ============================================================================

/**
 * Convert legacy MetricValue to MetricValueWithTimestamp
 */
export function fromLegacyMetricValue(
  legacy: LegacyMetricValue,
  source?: string
): MetricValueWithTimestamp<number | undefined> {
  return {
    value: legacy.value,
    unit: legacy.unit,
    recorded: Date.now(),
    source
  };
}

/**
 * Convert a legacy RuntimeMetric into a grouped RecordedMetric set.
 * This is a bridge helper while migrating off RuntimeMetric.
 */
export function legacyRuntimeMetricToGroup(metric: RuntimeMetric, recordedAt: number = Date.now()): MetricGroup {
  return {
    label: metric.exerciseId,
    metrics: metric.values.map(value => ({
      type: value.type,
      value: value.value,
      unit: value.unit,
      recorded: recordedAt,
      source: metric.exerciseId
    }))
  };
}

/**
 * Map legacy metric type to SpanMetrics property name
 */
export function legacyTypeToMetricKey(type: LegacyMetricValue['type']): keyof SpanMetrics | null {
  const mapping: Record<string, keyof SpanMetrics> = {
    'repetitions': 'reps',
    'resistance': 'weight',
    'distance': 'distance',
    'time': 'duration',
    'timestamp': 'elapsed',
    'rounds': 'currentRound',
    'calories': 'calories',
    'heart_rate': 'heartRate',
    'power': 'power',
    'cadence': 'cadence'
  };
  return mapping[type] ?? null;
}

/**
 * Convert SpanType to legacy block type string
 */
export function spanTypeToLegacyType(type: SpanType): string {
  return type; // Direct mapping for now
}

/**
 * Convert legacy block type string to SpanType
 */
export function legacyTypeToSpanType(type: string): SpanType {
  const mapping: Record<string, SpanType> = {
    'timer': 'timer',
    'rounds': 'rounds',
    'effort': 'effort',
    'group': 'group',
    'interval': 'interval',
    'emom': 'emom',
    'amrap': 'amrap',
    'tabata': 'tabata'
  };
  return mapping[type.toLowerCase()] ?? 'group';
}
