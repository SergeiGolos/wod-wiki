import React, { useMemo, useEffect, useState } from 'react';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { useOutputStatements } from '@/runtime/hooks/useOutputStatements';
import { UnifiedItemList, outputStatementsToDisplayItems } from '@/components/unified';

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
  const { outputs } = useOutputStatements(runtime);
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

    // Convert output statements to display items
    let displayItems = outputStatementsToDisplayItems(outputs);

    // Sort by start time
    displayItems = [...displayItems].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

    // Filter out active items if showActive is false
    if (!showActive) {
      displayItems = displayItems.filter(item => item.status !== 'active');
    }

    // Determine active item (last active one) OR last item if none active
    let activeItemId: string | null = null;
    const activeItems = displayItems.filter(item => item.status === 'active');
    if (activeItems.length > 0) {
      activeItemId = activeItems[activeItems.length - 1].id;
    } else if (displayItems.length > 0) {
      activeItemId = displayItems[displayItems.length - 1].id;
    }

    return { items: displayItems, activeItemId };
  }, [runtime, outputs, updateVersion, showActive]);

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
