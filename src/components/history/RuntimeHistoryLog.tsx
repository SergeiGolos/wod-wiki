import React, { useMemo, useEffect, useState } from 'react';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { HistoryList, HistoryItem } from './HistoryList';
import { SpanMetrics, createEmptyMetrics } from '@/runtime/models/ExecutionSpan';
import { spanMetricsToFragments } from '@/runtime/utils/metricsToFragments';

export interface RuntimeHistoryLogProps {
  runtime: ScriptRuntime | null;
  activeStatementIds?: Set<number>;
  highlightedBlockKey?: string | null;
  autoScroll?: boolean;
  mobile?: boolean;
  className?: string;
  workoutStartTime?: number | null;
}

// Container types that should be treated as Headers
const HEADER_TYPES = new Set(['root', 'round', 'interval', 'warmup', 'cooldown', 'amrap', 'emom', 'tabata', 'group']);

export const RuntimeHistoryLog: React.FC<RuntimeHistoryLogProps> = ({
  runtime,
  highlightedBlockKey,
  autoScroll = true,
  className,
  workoutStartTime
}) => {
  const [updateVersion, setUpdateVersion] = useState(0);

  // Subscribe to runtime updates
  useEffect(() => {
    if (!runtime) return;
    const unsubscribe = runtime.memory.subscribe(() => setUpdateVersion(v => v + 1));
    const intervalId = setInterval(() => setUpdateVersion(v => v + 1), 100); // 10Hz update for timestamps
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [runtime]);

  const { items, activeItemId } = useMemo(() => {
    if (!runtime) return { items: [], activeItemId: null };
    void updateVersion; // Dependency

    // 1. Gather all records (completed + active)
    const rawItems: any[] = [
        ...runtime.executionLog,
        ...Array.from(runtime.activeSpans.values())
    ];

    // Sort by startTime
    rawItems.sort((a, b) => a.startTime - b.startTime);

    // Map for quick lookup
    const itemMap = new Map<string, any>();
    rawItems.forEach(item => itemMap.set(item.id, item));

    // Calculate depths and inherit metrics
    const historyItems: HistoryItem[] = rawItems.map(record => {
        // Calculate Depth
        let depth = 0;
        let parent = record.parentSpanId ? itemMap.get(record.parentSpanId) : null;

        // Safety check for depth to prevent infinite loops (though unlikely with proper IDs)
        let depthCheck = 0;
        while (parent && depthCheck < 20) {
            depth++;
            parent = parent.parentSpanId ? itemMap.get(parent.parentSpanId) : null;
            depthCheck++;
        }

        // Inherit Metrics (similar to RuntimeEventLog logic)
        const combinedMetrics: SpanMetrics = { ...(record.metrics || createEmptyMetrics()) };

        // Simple metric inheritance
        let currentParentId = record.parentSpanId;
        const visited = new Set<string>();
        visited.add(record.id);

        while (currentParentId) {
             if (visited.has(currentParentId)) break;
             visited.add(currentParentId);

             const p = itemMap.get(currentParentId);
             if (p && p.metrics) {
                 const pm = p.metrics;
                 if (pm.reps && !combinedMetrics.reps) combinedMetrics.reps = pm.reps;
                 if (pm.weight && !combinedMetrics.weight) combinedMetrics.weight = pm.weight;
                 if (pm.distance && !combinedMetrics.distance) combinedMetrics.distance = pm.distance;
                 currentParentId = p.parentSpanId;
             } else {
                 break;
             }
        }

        const isHeader = HEADER_TYPES.has(record.type.toLowerCase()) || record.type === 'start';

        // Generate Fragments
        const fragments = spanMetricsToFragments(combinedMetrics, record.label, record.type);

        return {
            id: record.id,
            label: record.label,
            startTime: record.startTime,
            endTime: record.endTime,
            type: record.type,
            depth: depth,
            fragments: fragments,
            isHeader: isHeader,
            status: record.status
        };
    });

    // Determine active item (last active one)
    let activeItemId: string | null = null;
    const activeItems = historyItems.filter(i => i.status === 'active');
    if (activeItems.length > 0) {
        activeItemId = activeItems[activeItems.length - 1].id;
    }

    return { items: historyItems, activeItemId };
  }, [runtime, updateVersion, workoutStartTime]);

  return (
    <HistoryList
        items={items}
        activeItemId={activeItemId || highlightedBlockKey}
        autoScroll={autoScroll}
        className={className}
    />
  );
};
