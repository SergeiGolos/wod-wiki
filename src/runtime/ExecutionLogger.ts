import { IRuntimeMemory } from './IRuntimeMemory';
import { ExecutionSpan, createEmptyMetrics, SpanType, legacyTypeToSpanType, legacyRuntimeMetricToGroup } from './models/ExecutionSpan';
import { TypedMemoryReference } from './IMemoryReference';
import { RuntimeMetric } from './RuntimeMetric';
import { EXECUTION_SPAN_TYPE } from './ExecutionTracker';
import { metricsToFragments, createLabelFragment } from './utils/metricsToFragments';

// Re-export ExecutionSpan as ExecutionRecord for backward compatibility
export type ExecutionRecord = ExecutionSpan;

/**
 * ExecutionLogger
 *
 * @deprecated Use ExecutionTracker instead. This class is maintained for backward compatibility.
 * 
 * Manages the creation, updating, and retrieval of execution records in runtime memory.
 * Acts as an abstraction layer over raw memory operations for execution tracking.
 */
export class ExecutionLogger {
  constructor(private readonly memory: IRuntimeMemory) {}

  /**
   * Starts tracking execution for a block.
   * Allocates a new ExecutionSpan in memory.
   */
  startExecution(
    blockId: string,
    type: string,
    label: string,
    parentId: string | null,
    metrics: RuntimeMetric[] = []
  ): ExecutionSpan {
    const spanType: SpanType = legacyTypeToSpanType(type);
    const fragments = metrics.length > 0
      ? metricsToFragments(metrics)
      : [createLabelFragment(label, type)];
    const record: ExecutionSpan = {
      id: `${Date.now()}-${blockId}`, // Simple unique ID
      blockId,
      parentSpanId: parentId,
      type: spanType,
      label,
      startTime: Date.now(),
      status: 'active',
      metrics: {
        ...createEmptyMetrics(),
        legacyMetrics: metrics,
        ...(metrics.length > 0 ? { metricGroups: metrics.map(m => legacyRuntimeMetricToGroup(m)) } : {})
      },
      segments: [],
      fragments
    };

    this.memory.allocate<ExecutionSpan>(EXECUTION_SPAN_TYPE, blockId, record, 'public');
    return record;
  }

  /**
   * Completes tracking for a block.
   * Updates the existing ExecutionSpan with endTime and status.
   */
  completeExecution(blockId: string): void {
    const refs = this.memory.search({
      type: EXECUTION_SPAN_TYPE,
      ownerId: blockId,
      id: null,
      visibility: null
    });

    if (refs.length > 0) {
      const ref = refs[0] as TypedMemoryReference<ExecutionSpan>;
      const record = this.memory.get(ref);

      if (record && record.status === 'active') {
        const updatedRecord: ExecutionSpan = {
          ...record,
          endTime: Date.now(),
          status: 'completed'
        };

        this.memory.set(ref, updatedRecord);
      }
    }
  }

  /**
   * Gets the active ExecutionSpan ID for a block.
   */
  getActiveRecordId(blockId: string): string | null {
    const refs = this.memory.search({
      type: EXECUTION_SPAN_TYPE,
      ownerId: blockId,
      id: null,
      visibility: null
    });

    if (refs.length > 0) {
      const record = this.memory.get(refs[0] as any) as ExecutionSpan;
      if (record && record.status === 'active') {
        return record.id;
      }
    }
    return null;
  }

  /**
   * Retrieves all completed execution records.
   */
  getLog(): ExecutionSpan[] {
    return this.memory.search({
      type: EXECUTION_SPAN_TYPE,
      id: null,
      ownerId: null,
      visibility: null
    })
    .map(ref => this.memory.get(ref as any) as ExecutionSpan)
    .filter(r => r && r.status === 'completed');
  }

  /**
   * Retrieves all currently active execution records.
   */
  getActiveSpans(): Map<string, ExecutionSpan> {
    const map = new Map<string, ExecutionSpan>();
    this.memory.search({
      type: EXECUTION_SPAN_TYPE,
      visibility: 'public',
      id: null,
      ownerId: null
    })
    .forEach(ref => {
      const record = this.memory.get(ref as any) as ExecutionSpan;
      if (record && record.status === 'active') {
        map.set(record.blockId, record);
      }
    });
    return map;
  }
}
