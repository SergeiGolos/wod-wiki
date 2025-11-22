import { RuntimeMetric } from '../RuntimeMetric';

export interface ExecutionRecord {
    id: string;              // Unique ID for this execution span
    blockId: string;         // The ID of the block (from BlockKey)
    parentId: string | null; // ID of the parent record (parent span ID, not block ID)
    type: string;            // 'timer' | 'rounds' | 'effort' | 'group' etc.
    label: string;           // e.g., "Round 1", "Push-ups", "For Time"
    startTime: number;       // Timestamp when block was pushed
    endTime?: number;        // Timestamp when block was popped (undefined while active)
    status: 'active' | 'completed' | 'failed';
    metrics: RuntimeMetric[]; // Collection of metrics recorded during this span
}
