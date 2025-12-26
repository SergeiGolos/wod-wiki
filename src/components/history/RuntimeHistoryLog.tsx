import React, { useMemo, useEffect, useState } from 'react';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { useTrackedSpans } from '@/clock/hooks/useExecutionSpans';
import { UnifiedItemList, runtimeSpansToDisplayItems } from '@/components/unified';

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
  const { runtimeSpans } = useTrackedSpans(runtime);
  const [updateVersion, setUpdateVersion] = useState(0);

  // Interval for timestamp updates (10Hz)
  useEffect(() => {
    if (!runtime) return;
    const intervalId = setInterval(() => setUpdateVersion(v => v + 1), 100);
    return () => {
      clearInterval(intervalId);
    };
  }, [runtime]);

  const { items, activeItemId } = useMemo(() => {
    if (!runtime) return { items: [], activeItemId: null };
    void updateVersion; // Dependency to force re-calc for timers

    // Sort by startTime
    const sortedSpans = [...runtimeSpans].sort((a, b) => a.startTime - b.startTime);

    // Convert to IDisplayItem array using adapter
    let displayItems = runtimeSpansToDisplayItems(sortedSpans);

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
  }, [runtime, runtimeSpans, updateVersion, showActive]);

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
