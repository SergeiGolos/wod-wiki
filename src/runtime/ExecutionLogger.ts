import { IRuntimeMemory } from './IRuntimeMemory';
import { ExecutionRecord } from './models/ExecutionRecord';
import { TypedMemoryReference } from './IMemoryReference';
import { RuntimeMetric } from './RuntimeMetric';

/**
 * ExecutionLogger
 *
 * Manages the creation, updating, and retrieval of execution records in runtime memory.
 * Acts as an abstraction layer over raw memory operations for execution tracking.
 */
export class ExecutionLogger {
  constructor(private readonly memory: IRuntimeMemory) {}

  /**
   * Starts tracking execution for a block.
   * Allocates a new ExecutionRecord in memory.
   */
  startExecution(
    blockId: string,
    type: string,
    label: string,
    parentId: string | null,
    metrics: RuntimeMetric[] = []
  ): ExecutionRecord {
    const record: ExecutionRecord = {
      id: `${Date.now()}-${blockId}`, // Simple unique ID
      blockId,
      parentId,
      type,
      label,
      startTime: Date.now(),
      status: 'active',
      metrics
    };

    this.memory.allocate<ExecutionRecord>('execution-record', blockId, record, 'public');
    return record;
  }

  /**
   * Completes tracking for a block.
   * Updates the existing ExecutionRecord with endTime and status.
   */
  completeExecution(blockId: string): void {
    const refs = this.memory.search({
      type: 'execution-record',
      ownerId: blockId,
      id: null,
      visibility: null
    });

    if (refs.length > 0) {
      const ref = refs[0] as TypedMemoryReference<ExecutionRecord>;
      const record = this.memory.get(ref);

      if (record && record.status === 'active') {
        const updatedRecord: ExecutionRecord = {
          ...record,
          endTime: Date.now(),
          status: 'completed'
        };

        this.memory.set(ref, updatedRecord);
      }
    }
  }

  /**
   * Gets the active ExecutionRecord ID for a block.
   */
  getActiveRecordId(blockId: string): string | null {
    const refs = this.memory.search({
      type: 'execution-record',
      ownerId: blockId,
      id: null,
      visibility: null
    });

    if (refs.length > 0) {
      const record = this.memory.get(refs[0] as any) as ExecutionRecord;
      if (record && record.status === 'active') {
        return record.id;
      }
    }
    return null;
  }

  /**
   * Retrieves all completed execution records.
   */
  getLog(): ExecutionRecord[] {
    return this.memory.search({
      type: 'execution-record',
      id: null,
      ownerId: null,
      visibility: null
    })
    .map(ref => this.memory.get(ref as any) as ExecutionRecord)
    .filter(r => r && r.status === 'completed');
  }

  /**
   * Retrieves all currently active execution records.
   */
  getActiveSpans(): Map<string, ExecutionRecord> {
    const map = new Map<string, ExecutionRecord>();
    this.memory.search({
      type: 'execution-record',
      visibility: 'public',
      id: null,
      ownerId: null
    })
    .forEach(ref => {
      const record = this.memory.get(ref as any) as ExecutionRecord;
      if (record && record.status === 'active') {
        map.set(record.blockId, record);
      }
    });
    return map;
  }
}
