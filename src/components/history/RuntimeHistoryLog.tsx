import React, { useMemo, useEffect, useState } from 'react';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { UnifiedItemList, spansToDisplayItems } from '@/components/unified';
import { createEmptyMetrics, SpanMetrics } from '@/runtime/models/ExecutionSpan';

export interface RuntimeHistoryLogProps {
  runtime: ScriptRuntime | null;
  activeStatementIds?: Set<number>;
  highlightedBlockKey?: string | null;
  autoScroll?: boolean;
  mobile?: boolean;
  className?: string;
  workoutStartTime?: number | null;
  /** Whether to show active items (default: true) */
  showActive?: boolean;
  /** Compact display mode */
  compact?: boolean;
}

export const RuntimeHistoryLog: React.FC<RuntimeHistoryLogProps> = ({
  runtime,
  highlightedBlockKey,
  autoScroll = true,
  className,
  showActive = true,
  compact = false
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

    // 1. Gather all spans (completed + active)
    const allSpans = [
      ...runtime.executionLog,
      ...Array.from(runtime.activeSpans.values())
    ];

    // Sort by startTime
    allSpans.sort((a, b) => a.startTime - b.startTime);

    // Create span map for metric inheritance
    const spanMap = new Map(allSpans.map(s => [s.id, s]));

    // Inherit metrics from parent spans
    const enrichedSpans = allSpans.map(span => {
      const combinedMetrics: SpanMetrics = { ...(span.metrics || createEmptyMetrics()) };

      // Simple metric inheritance from parents
      let currentParentId = span.parentSpanId;
      const visited = new Set<string>();
      visited.add(span.id);

      while (currentParentId) {
        if (visited.has(currentParentId)) break;
        visited.add(currentParentId);

        const parent = spanMap.get(currentParentId);
        if (parent?.metrics) {
          const pm = parent.metrics;
          if (pm.reps && !combinedMetrics.reps) combinedMetrics.reps = pm.reps;
          if (pm.weight && !combinedMetrics.weight) combinedMetrics.weight = pm.weight;
          if (pm.distance && !combinedMetrics.distance) combinedMetrics.distance = pm.distance;
          currentParentId = parent.parentSpanId;
        } else {
          break;
        }
      }

      return { ...span, metrics: combinedMetrics };
    });

    // Convert to IDisplayItem array using adapter
    let displayItems = spansToDisplayItems(enrichedSpans);

    // Filter out active items if showActive is false
    if (!showActive) {
      displayItems = displayItems.filter(item => item.status !== 'active');
    }

    // Determine active item (last active one) OR last item if none active (for auto-scroll in history mode)
    let activeItemId: string | null = null;
    const activeItems = displayItems.filter(item => item.status === 'active');
    if (activeItems.length > 0) {
      activeItemId = activeItems[activeItems.length - 1].id;
    } else if (displayItems.length > 0) {
      // If no active items (e.g. history only), target the last item for scrolling
      activeItemId = displayItems[displayItems.length - 1].id;
    }

    return { items: displayItems, activeItemId };
  }, [runtime, updateVersion, showActive]);

  return (
    <UnifiedItemList
      items={items}
      activeItemId={activeItemId || highlightedBlockKey || undefined}
      autoScroll={autoScroll}
      compact={compact}
      showDurations
      groupLinked={false}
      className={className}
      emptyMessage="No events recorded"
    />
  );
};
