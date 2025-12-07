/**
 * RuntimeHistoryPanel - Live execution history for Track screen
 */

import React, { useMemo } from 'react';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { useExecutionSpans } from '../../clock/hooks/useExecutionSpans';
import { cn } from '../../lib/utils';
import { UnifiedItemList, spansToDisplayItems } from '../unified';
import { VisualizerFilter } from '../../core/models/DisplayItem';
import { FragmentCollectionState } from '../../core/models/CodeFragment';

export interface RuntimeHistoryPanelProps {
  /** Active runtime for live tracking */
  runtime: IScriptRuntime | null;
  
  /** Whether to auto-scroll to newest entries */
  autoScroll?: boolean;
  
  /** Compact display mode */
  compact?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * RuntimeHistoryPanel Component - Uses unified visualization system
 */
export const RuntimeHistoryPanel: React.FC<RuntimeHistoryPanelProps> = ({
  runtime,
  autoScroll = true,
  compact = false,
  className = ''
}) => {
  // Use reactive hook for execution spans
  const { active, completed } = useExecutionSpans(runtime);

  // Convert spans to unified display items
  const { items, activeItemId } = useMemo(() => {
    if (!runtime) return { items: [], activeItemId: null };

    // Combine all spans and sort by start time (oldest first)
    // History usually shows log: oldest at top? Or newest at top?
    // "Newest-first" is in the header comments of the original file. 
    // BUT the sort in the original file was: `sort((a, b) => a.startTime - b.startTime)` which is Oldest First.
    // Let's stick to Oldest First (chronological log) as implemented in original code.
    const allSpans = [...completed, ...active].sort((a, b) => a.startTime - b.startTime);
    
    if (allSpans.length === 0) return { items: [], activeItemId: null };

    // Convert to display items using unified adapter
    const displayItems = spansToDisplayItems(allSpans);

    // Find the last active item
    let activeId: string | null = null;
    const activeItems = displayItems.filter(item => item.status === 'active');
    if (activeItems.length > 0) {
      activeId = activeItems[activeItems.length - 1].id;
    }

    return { items: displayItems, activeItemId: activeId };
  }, [runtime, active, completed]);

  // Filter configuration for History Panel
  const historyFilter: VisualizerFilter = {
    allowedStates: [
      FragmentCollectionState.Defined,
      FragmentCollectionState.Collected,
    ],
    nameOverrides: {
      // FORCE SHOW 'ellapsed-time' even if it might be excluded by allowedStates (e.g. if it was runtime-generated)
      'ellapsed-time': true, 
      'elapsed': true,
      'rep': true // Ensure reps are shown
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <UnifiedItemList
        items={items}
        activeItemId={activeItemId ?? undefined}
        autoScroll={autoScroll}
        size={compact ? 'compact' : 'normal'}
        filter={historyFilter}
        showDurations
        groupLinked={false}
        className="flex-1"
        emptyMessage="Waiting for workout to start..."
      />
    </div>
  );
};
