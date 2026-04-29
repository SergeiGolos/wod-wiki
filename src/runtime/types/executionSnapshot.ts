// Runtime execution snapshot types
// Extracted from runtime-test-bench/types/interfaces.ts for use in production code

import type { MetricContainer } from '../../core/models/MetricContainer';

export type ExecutionStatus =
  | 'idle'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'error';

export type BlockType =
  | 'workout'
  | 'group'
  | 'timer'
  | 'rounds'
  | 'effort'
  | 'exercise'
  | 'custom';

export type BlockStatus =
  | 'pending'
  | 'active'
  | 'running'
  | 'complete'
  | 'error';

export type MemoryType =
  | 'metric'
  | 'timer-state'
  | 'loop-state'
  | 'group-state'
  | 'handler'
  | 'span'
  | 'unknown';

export type MemoryGrouping =
  | 'owner'
  | 'type'
  | 'none';

export interface MetricValue {
  value: any;
  unit?: string;
  formatted: string;
}

/**
 * Benchmarking metrics for runtime operations.
 */
export interface BenchmarkMetrics {
  snapshotCreationTime: number;
  renderTime: number;
  memoryUsage?: number;
  frameRate?: number;
}

/**
 * UI-friendly representation of IRuntimeBlock
 */
export interface RuntimeStackBlock {
  key: string;
  blockType: BlockType;
  parentKey?: string;
  children: string[];
  depth: number;
  label: string;
  color: string;
  icon?: string;
  isActive: boolean;
  isComplete: boolean;
  status: BlockStatus;
  metric: Record<string, MetricValue>;
  metrics?: MetricContainer;
  metricGroups?: MetricContainer[];
  sourceIds: number[];
  lineNumber?: number;
  metadata?: {
    mountTime?: number;
    executionTime?: number;
    iterationCount?: number;
  };
}

/**
 * UI-friendly representation of memory allocation
 */
export interface MemoryEntry {
  id: string;
  ownerId: string;
  ownerLabel?: string;
  type: MemoryType;
  value: any;
  valueFormatted: string;
  label: string;
  groupLabel?: string;
  icon?: string;
  lineNumber?: number;
  isValid: boolean;
  isHighlighted: boolean;
  metadata?: {
    createdAt?: number;
    lastModified?: number;
    accessCount?: number;
  };
  references?: string[];
  referencedBy?: string[];
}

/**
 * Immutable snapshot of runtime state for UI rendering
 */
export interface ExecutionSnapshot {
  stack: {
    blocks: RuntimeStackBlock[];
    activeIndex: number;
    depth: number;
    rootBlockKey?: string;
  };
  memory: {
    entries: MemoryEntry[];
    groupedByOwner: Map<string, MemoryEntry[]>;
    groupedByType: Map<string, MemoryEntry[]>;
    totalEntries: number;
  };
  status: ExecutionStatus;
  metadata: {
    stepCount: number;
    elapsedTime: number;
    lastEvent?: string;
    lastEventTime?: number;
    benchmarkMetrics?: BenchmarkMetrics;
  };
  timestamp: number;
}

/**
 * Converts ScriptRuntime state to ExecutionSnapshot
 */
export interface IRuntimeAdapter {
  createSnapshot(runtime: any): ExecutionSnapshot;
  extractStackBlocks(runtime: any): RuntimeStackBlock[];
  extractMemoryEntries(runtime: any): MemoryEntry[];
  groupMemoryEntries(entries: MemoryEntry[], groupBy: MemoryGrouping): Map<string, MemoryEntry[]>;
}
