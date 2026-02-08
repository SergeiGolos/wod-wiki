/**
 * ExecutionLogPanel - Displays execution history in Git-tree format
 *
 * Supports two modes:
 * 1. Live Mode - Shows active execution with growing log from RuntimeMemory
 * 2. Historical Mode - Shows completed execution from MetricsRepository
 */

import React, { useMemo } from 'react';
import { UnifiedItemList, outputStatementsToDisplayItems } from '../unified';
import { Segment } from '../../core/models/AnalyticsModels'; // Import from proper location
import { ScriptRuntime } from '../../runtime/ScriptRuntime';

import { useOutputStatements } from '../../clock/hooks/useExecutionSpans';

export interface ExecutionLogPanelProps {
  /** Active runtime for live mode (null for historical mode) */
  runtime: ScriptRuntime | null;

  /** Historical segments for analysis mode */
  historicalSegments?: Segment[];

  /** Currently active segment ID */
  activeSegmentId?: number | null;

  /** Whether to disable auto-scroll */
  disableScroll?: boolean;

  /** Ref to scroll container */
  scrollRef?: React.RefObject<HTMLDivElement>;

  /** Children to render below the tree (e.g., "feeding" connector) */
  children?: React.ReactNode;
}

/**
 * Main execution log panel component
 */
export const ExecutionLogPanel: React.FC<ExecutionLogPanelProps> = ({
  runtime,
  historicalSegments = [],
  activeSegmentId = null,
  disableScroll = false,
  children
}) => {
  const { outputs } = useOutputStatements(runtime);

  const selectedIds = useMemo(() => {
    return activeSegmentId ? new Set([activeSegmentId.toString()]) : new Set<string>();
  }, [activeSegmentId]);

  // Build items from runtime memory if available
  const items = useMemo(() => {
    // Mode 1: Historical segments provided (Analytics view)
    if (historicalSegments.length > 0) {
      return [];
    }

    // Mode 2: Live runtime data
    if (!runtime) {
      return [];
    }

    // Convert output statements to display items
    return outputStatementsToDisplayItems(outputs)
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

  }, [runtime, historicalSegments, outputs]);

  return (
    <div className="h-full flex flex-col bg-background">
      <UnifiedItemList
        items={items}
        compact={true}
        showDurations={true}
        autoScroll={!disableScroll}
        className="flex-1"
        emptyMessage="Waiting for execution to start..."

        selectedIds={selectedIds}
      />
      {children}
    </div>
  );
};
