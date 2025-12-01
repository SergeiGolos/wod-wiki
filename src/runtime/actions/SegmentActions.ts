/**
 * Segment Actions - Actions for managing time segments within execution spans
 * 
 * These actions allow behaviors/blocks to create timestamp groupings
 * (rounds, minutes, rest periods, etc.) within their execution span.
 * 
 * @see docs/plans/unified-execution-metrics.md
 */

import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { SegmentType } from '../models/ExecutionSpan';

/**
 * Action to start a new time segment within the current block's execution span.
 * 
 * Use cases:
 * - RoundsBlock starting a new round
 * - EMOM starting a new minute
 * - Tabata starting work/rest period
 * 
 * @example
 * ```typescript
 * // Start tracking round 2
 * return [new StartSegmentAction('round', 'Round 2', 1)];
 * ```
 */
export class StartSegmentAction implements IRuntimeAction {
  readonly type = 'start-segment';
  
  constructor(
    /** Type of segment to start */
    public readonly segmentType: SegmentType,
    /** Human-readable label for the segment */
    public readonly label: string,
    /** Optional index/position in sequence (0-based) */
    public readonly index?: number
  ) {}

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (!currentBlock) return;
    
    const blockId = currentBlock.key.toString();
    
    if (runtime.tracker) {
      runtime.tracker.startSegment(blockId, this.segmentType, this.label, this.index);
    }
  }
}

/**
 * Action to end the current time segment within the current block's execution span.
 * 
 * @example
 * ```typescript
 * // End the current active segment
 * return [new EndSegmentAction()];
 * 
 * // End a specific segment by ID
 * return [new EndSegmentAction('segment-123')];
 * ```
 */
export class EndSegmentAction implements IRuntimeAction {
  readonly type = 'end-segment';
  
  constructor(
    /** Optional specific segment ID to end (ends active segment if not provided) */
    public readonly segmentId?: string
  ) {}

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (!currentBlock) return;
    
    const blockId = currentBlock.key.toString();
    
    if (runtime.tracker) {
      runtime.tracker.endSegment(blockId, this.segmentId);
    }
  }
}

/**
 * Action to end all active segments within the current block's execution span.
 * Useful when completing a block that may have multiple open segments.
 * 
 * @example
 * ```typescript
 * // Clean up all segments before block completes
 * return [new EndAllSegmentsAction()];
 * ```
 */
export class EndAllSegmentsAction implements IRuntimeAction {
  readonly type = 'end-all-segments';

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (!currentBlock) return;
    
    const blockId = currentBlock.key.toString();
    
    if (runtime.tracker) {
      runtime.tracker.endAllSegments(blockId);
    }
  }
}

/**
 * Action to record a numeric metric to the current execution span.
 * 
 * This is a convenience action for recording simple metrics without
 * building a full RuntimeMetric object.
 * 
 * @example
 * ```typescript
 * // Record reps completed
 * return [new RecordMetricAction('reps', 10, 'reps', 'pushups')];
 * 
 * // Record weight used
 * return [new RecordMetricAction('weight', 135, 'lb', 'deadlift')];
 * ```
 */
export class RecordMetricAction implements IRuntimeAction {
  readonly type = 'record-metric';
  
  constructor(
    /** Metric key (e.g., 'reps', 'weight', 'distance') */
    public readonly metricKey: string,
    /** Metric value */
    public readonly value: number,
    /** Unit of measurement */
    public readonly unit: string,
    /** Optional source identifier */
    public readonly source?: string
  ) {}

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (!currentBlock) return;
    
    const blockId = currentBlock.key.toString();
    
    if (runtime.tracker) {
      runtime.tracker.recordMetric(blockId, this.metricKey, this.value, this.unit, this.source);
    }
  }
}

/**
 * Action to record round progress to the current execution span.
 * 
 * @example
 * ```typescript
 * // Record current round progress
 * return [new RecordRoundAction(2, 5)];  // Round 2 of 5
 * 
 * // Record with rep scheme
 * return [new RecordRoundAction(1, 3, [21, 15, 9])];
 * ```
 */
export class RecordRoundAction implements IRuntimeAction {
  readonly type = 'record-round';
  
  constructor(
    /** Current round number (1-indexed) */
    public readonly currentRound: number,
    /** Total rounds */
    public readonly totalRounds?: number,
    /** Rep scheme array (e.g., [21, 15, 9]) */
    public readonly repScheme?: number[]
  ) {}

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (!currentBlock) return;
    
    const blockId = currentBlock.key.toString();
    
    if (runtime.tracker) {
      runtime.tracker.recordRound(blockId, this.currentRound, this.totalRounds, this.repScheme);
    }
  }
}
