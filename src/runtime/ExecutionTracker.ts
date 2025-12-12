/**
 * ExecutionTracker - Unified execution and metrics tracking service
 * 
 * Replaces ExecutionLogger with a comprehensive tracking service that:
 * - Manages ExecutionSpan lifecycle (start/end)
 * - Records metrics directly to spans
 * - Supports timestamp groupings via segments
 * - Stores all data in RuntimeMemory for reactive subscriptions
 * 
 * @see docs/plans/unified-execution-metrics.md
 */

import { IRuntimeMemory } from './IRuntimeMemory';
import { IRuntimeBlock } from './IRuntimeBlock';
import { TypedMemoryReference } from './IMemoryReference';
import {
  ExecutionSpan,
  SpanMetrics,
  SpanStatus,
  SpanType,
  SegmentType,
  TimeSegment,
  MetricValueWithTimestamp,
  DebugMetadata,
  createExecutionSpan,
  createTimeSegment,
  createEmptyMetrics,
  legacyTypeToSpanType
} from './models/ExecutionSpan';
import { createLabelFragment } from './utils/metricsToFragments';
import { ICodeFragment } from '../core/models/CodeFragment';

/** Memory type identifier for execution spans */
export const EXECUTION_SPAN_TYPE = 'execution-span';

/**
 * ExecutionTracker
 * 
 * Central service for tracking workout execution with unified metrics collection.
 * All data is stored in RuntimeMemory, enabling reactive UI updates.
 */
export class ExecutionTracker {
  constructor(private readonly memory: IRuntimeMemory) {}

  /**
   * Append fragments to an existing span for the given block.
   * When spans already carry fragments, new ones are concatenated.
   */
  appendFragments(blockId: string, fragments: ICodeFragment[]): void {
    if (!fragments || fragments.length === 0) return;
    const ref = this.findSpanRef(blockId);
    if (!ref) return;
    const span = this.memory.get(ref);
    if (!span) return;

    const existing = span.fragments ?? [];
    const updatedSpan: ExecutionSpan = {
      ...span,
      fragments: [...existing, ...fragments],
    };

    this.memory.set(ref, updatedSpan);
  }

  // ============================================================================
  // Span Lifecycle
  // ============================================================================

  /**
   * Start tracking a block's execution.
   * Creates a new ExecutionSpan and stores it in memory.
   * 
   * @param block The runtime block to track
   * @param parentSpanId ID of the parent span (null for root)
   * @param debugMetadata Optional debug metadata to stamp onto the span
   * @returns The created ExecutionSpan
   */
  startSpan(
    block: IRuntimeBlock,
    parentSpanId: string | null,
    debugMetadata?: DebugMetadata
  ): ExecutionSpan {
    const blockId = block.key.toString();
    const type = this.resolveSpanType(block.blockType);
    const fragments = block.fragments?.length
      ? block.fragments.flat()
      : [createLabelFragment(block.label, block.blockType || 'group')];

    const initialMetrics: SpanMetrics = {
      ...createEmptyMetrics(),
      ...(block.context?.exerciseId ? { exerciseId: block.context.exerciseId } : {}),
    };
    
    const span = createExecutionSpan(
      blockId,
      type,
      block.label || blockId,
      parentSpanId,
      block.sourceIds,
      debugMetadata,
      {
        metrics: initialMetrics,
        fragments
      }
    );
    
    this.memory.allocate<ExecutionSpan>(
      EXECUTION_SPAN_TYPE,
      blockId,
      span,
      'public'
    );
    
    return span;
  }

  /**
   * Complete a span's execution.
   * Updates the span with endTime and status.
   * 
   * @param blockId The block ID to complete
   * @param status Final status (defaults to 'completed')
   */
  endSpan(blockId: string, status: SpanStatus = 'completed'): void {
    const ref = this.findSpanRef(blockId);
    if (!ref) return;
    
    const span = this.memory.get(ref);
    if (!span || span.status !== 'active') return;
    
    // End any open segments
    const updatedSegments = span.segments.map(seg => 
      seg.endTime ? seg : { ...seg, endTime: Date.now() }
    );
    
    // Calculate duration if not already set
    const endTime = Date.now();
    const updatedMetrics = { ...span.metrics };
    if (!updatedMetrics.duration) {
      updatedMetrics.duration = {
        value: endTime - span.startTime,
        unit: 'ms',
        recorded: endTime
      };
    }
    
    const updatedSpan: ExecutionSpan = {
      ...span,
      endTime,
      status,
      segments: updatedSegments,
      metrics: updatedMetrics
    };
    
    this.memory.set(ref, updatedSpan);
  }

  /**
   * Mark a span as failed.
   * Convenience method for error scenarios.
   */
  failSpan(blockId: string): void {
    this.endSpan(blockId, 'failed');
  }

  /**
   * Mark a span as skipped.
   * Convenience method for bypass scenarios.
   */
  skipSpan(blockId: string): void {
    this.endSpan(blockId, 'skipped');
  }

  // ============================================================================
  // Metric Recording
  // ============================================================================

  /**
   * Record a metric value for the active span.
   * 
   * @param blockId The block ID to record metric for
   * @param metricKey Property name in SpanMetrics (e.g., 'reps', 'weight')
   * @param value The metric value
   * @param unit Unit of measurement
   * @param source Optional source identifier
   */
  recordMetric<T>(
    blockId: string,
    metricKey: keyof SpanMetrics | string,
    value: T,
    unit: string,
    source?: string
  ): void {
    const span = this.getActiveSpan(blockId);
    if (!span) return;
    
    const metricValue: MetricValueWithTimestamp<T> = {
      value,
      unit,
      recorded: Date.now(),
      source
    };
    
    // Update span metrics
    const updatedMetrics = { ...span.metrics };
    
    if (this.isKnownMetricKey(metricKey)) {
      (updatedMetrics as any)[metricKey] = metricValue;
    } else {
      // Store in custom map
      if (!updatedMetrics.custom) {
        updatedMetrics.custom = new Map();
      }
      updatedMetrics.custom.set(metricKey as string, metricValue as MetricValueWithTimestamp<unknown>);
    }
    
    // Also record to active segment if one exists
    const activeSegment = span.segments.find(s => !s.endTime);
    let updatedSegments = span.segments;
    
    if (activeSegment) {
      updatedSegments = span.segments.map(seg => {
        if (seg.id === activeSegment.id) {
          const segMetrics = { ...(seg.metrics || {}) };
          if (this.isKnownMetricKey(metricKey)) {
            (segMetrics as any)[metricKey] = metricValue;
          }
          return { ...seg, metrics: segMetrics };
        }
        return seg;
      });
    }
    
    this.updateSpan(blockId, {
      metrics: updatedMetrics,
      segments: updatedSegments
    });
  }

  /**
   * Record a numeric metric with simplified signature.
   * Convenience method for common numeric metrics.
   */
  recordNumericMetric(
    blockId: string,
    metricKey: 'reps' | 'weight' | 'distance' | 'duration' | 'elapsed' | 'remaining' | 'calories',
    value: number,
    unit: string,
    source?: string
  ): void {
    this.recordMetric(blockId, metricKey, value, unit, source);
  }

  /**
   * Record round information.
   */
  recordRound(
    blockId: string,
    currentRound: number,
    totalRounds?: number,
    repScheme?: number[]
  ): void {
    const span = this.getActiveSpan(blockId);
    if (!span) return;
    
    const updatedMetrics: SpanMetrics = {
      ...span.metrics,
      currentRound,
      ...(totalRounds !== undefined && { totalRounds }),
      ...(repScheme && { repScheme })
    };
    
    this.updateSpan(blockId, { metrics: updatedMetrics });
  }



  // ============================================================================
  // Segment Management
  // ============================================================================

  /**
   * Start a time segment within a span.
   * 
   * @param blockId The block ID
   * @param type Segment type
   * @param label Human-readable label
   * @param index Optional position in sequence
   * @returns The created TimeSegment
   */
  startSegment(
    blockId: string,
    type: SegmentType,
    label: string,
    index?: number
  ): TimeSegment | null {
    const span = this.getActiveSpan(blockId);
    if (!span) return null;
    
    const segment = createTimeSegment(span.id, type, label, index);
    
    const updatedSegments = [...span.segments, segment];
    this.updateSpan(blockId, { segments: updatedSegments });
    
    return segment;
  }

  /**
   * End a time segment.
   * 
   * @param blockId The block ID
   * @param segmentId Optional specific segment ID (ends active segment if not provided)
   */
  endSegment(blockId: string, segmentId?: string): void {
    const span = this.getActiveSpan(blockId);
    if (!span) return;
    
    const updatedSegments = span.segments.map(seg => {
      const shouldEnd = segmentId 
        ? seg.id === segmentId 
        : !seg.endTime;
      
      if (shouldEnd && !seg.endTime) {
        return { ...seg, endTime: Date.now() };
      }
      return seg;
    });
    
    this.updateSpan(blockId, { segments: updatedSegments });
  }

  /**
   * End all active segments for a block.
   */
  endAllSegments(blockId: string): void {
    const span = this.getActiveSpan(blockId);
    if (!span) return;
    
    const updatedSegments = span.segments.map(seg => 
      seg.endTime ? seg : { ...seg, endTime: Date.now() }
    );
    
    this.updateSpan(blockId, { segments: updatedSegments });
  }

  // ============================================================================
  // Debug Metadata
  // ============================================================================

  /**
   * Get or create default debug metadata for a span.
   * Helper to avoid repeated default object creation.
   */
  private getOrCreateDebugMetadata(span: ExecutionSpan): DebugMetadata {
    return span.debugMetadata || {
      tags: [],
      context: {},
      logs: []
    };
  }

  /**
   * Add a debug log message to a span.
   * Messages are captured in the debugMetadata.logs array.
   * 
   * @param blockId The block ID
   * @param message The log message to capture
   */
  addDebugLog(blockId: string, message: string): void {
    const span = this.getActiveSpan(blockId);
    if (!span) return;
    
    const debugMetadata = this.getOrCreateDebugMetadata(span);
    const logs = debugMetadata.logs || [];
    logs.push(`[${new Date().toISOString()}] ${message}`);
    
    this.updateSpan(blockId, {
      debugMetadata: {
        ...debugMetadata,
        logs
      }
    });
  }

  /**
   * Add a tag to a span's debug metadata.
   * Tags are used for categorization (e.g., "amrap", "emom", "time_bound").
   * 
   * @param blockId The block ID
   * @param tag The tag to add
   */
  addDebugTag(blockId: string, tag: string): void {
    const span = this.getActiveSpan(blockId);
    if (!span) return;
    
    const debugMetadata = this.getOrCreateDebugMetadata(span);
    
    if (!debugMetadata.tags.includes(tag)) {
      this.updateSpan(blockId, {
        debugMetadata: {
          ...debugMetadata,
          tags: [...debugMetadata.tags, tag]
        }
      });
    }
  }

  /**
   * Set debug context values for a span.
   * Context is an arbitrary key-value store for execution metadata.
   * 
   * @param blockId The block ID
   * @param context Key-value pairs to merge into the debug context
   */
  setDebugContext(blockId: string, context: Record<string, unknown>): void {
    const span = this.getActiveSpan(blockId);
    if (!span) return;
    
    const debugMetadata = this.getOrCreateDebugMetadata(span);
    
    this.updateSpan(blockId, {
      debugMetadata: {
        ...debugMetadata,
        context: {
          ...debugMetadata.context,
          ...context
        }
      }
    });
  }

  /**
   * Set or replace the entire debug metadata for a span.
   * 
   * @param blockId The block ID
   * @param debugMetadata The complete debug metadata to set
   */
  setDebugMetadata(blockId: string, debugMetadata: DebugMetadata): void {
    const span = this.getActiveSpan(blockId);
    if (!span) return;
    
    this.updateSpan(blockId, { debugMetadata });
  }

  // ============================================================================
  // Queries
  // ============================================================================

  /**
   * Get the active span for a block.
   */
  getActiveSpan(blockId: string): ExecutionSpan | null {
    const ref = this.findSpanRef(blockId);
    if (!ref) return null;
    
    const span = this.memory.get(ref);
    return (span && span.status === 'active') ? span : null;
  }

  /**
   * Get the active span ID for a block.
   */
  getActiveSpanId(blockId: string): string | null {
    const span = this.getActiveSpan(blockId);
    return span?.id ?? null;
  }

  /**
   * Get all spans (for backward compatibility with ExecutionLogger.getLog).
   */
  getAllSpans(): ExecutionSpan[] {
    const refs = this.memory.search({
      type: EXECUTION_SPAN_TYPE,
      id: null,
      ownerId: null,
      visibility: null
    });
    
    return refs
      .map(ref => this.memory.get(ref as TypedMemoryReference<ExecutionSpan>))
      .filter((s): s is ExecutionSpan => s !== null);
  }

  /**
   * Get completed spans (for backward compatibility with ExecutionLogger.getLog).
   */
  getCompletedSpans(): ExecutionSpan[] {
    return this.getAllSpans().filter(s => s.status === 'completed');
  }

  /**
   * Get active spans as a Map (for backward compatibility with ExecutionLogger.getActiveSpans).
   */
  getActiveSpansMap(): Map<string, ExecutionSpan> {
    const map = new Map<string, ExecutionSpan>();
    
    for (const span of this.getAllSpans()) {
      if (span.status === 'active') {
        map.set(span.blockId, span);
      }
    }
    
    return map;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private findSpanRef(blockId: string): TypedMemoryReference<ExecutionSpan> | null {
    const refs = this.memory.search({
      type: EXECUTION_SPAN_TYPE,
      ownerId: blockId,
      id: null,
      visibility: null
    });
    
    return refs.length > 0 
      ? refs[0] as TypedMemoryReference<ExecutionSpan>
      : null;
  }

  private updateSpan(blockId: string, updates: Partial<ExecutionSpan>): void {
    const ref = this.findSpanRef(blockId);
    if (!ref) return;
    
    const span = this.memory.get(ref);
    if (!span) return;
    
    const updatedSpan: ExecutionSpan = {
      ...span,
      ...updates
    };
    
    this.memory.set(ref, updatedSpan);
  }

  private resolveSpanType(blockType?: string): SpanType {
    if (!blockType) return 'group';
    return legacyTypeToSpanType(blockType);
  }

  private isKnownMetricKey(key: string): key is keyof SpanMetrics {
    const knownKeys: Set<string> = new Set([
      'exerciseId', 'exerciseImage',
      'reps', 'targetReps',
      'weight',
      'distance',
      'duration', 'elapsed', 'remaining',
      'currentRound', 'totalRounds', 'repScheme',
      'calories',
      'heartRate', 'power', 'cadence',
      'legacyMetrics'
    ]);
    return knownKeys.has(key);
  }
}

