/**
 * RuntimeHistoryPanel - Live execution history for Track screen
 * 
 * Key Features:
 * - Shows captured execution spans from runtime memory
 * - Section headers for looper blocks (rounds, EMOM minutes, intervals)
 * - Timestamp and visual breaks between sections
 * - Exercise efforts grouped under their parent section
 * - Newest-first, oldest-last ordering within sections
 * - Always shows active blocks highlighted
 * - Displays metrics as fragments (effort name, reps, etc.)
 * - Supports unified ExecutionSpan with segments
 */

import React, { useMemo } from 'react';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { useExecutionSpans } from '../../clock/hooks/useExecutionSpans';
import { cn } from '../../lib/utils';
import { UnifiedItemList, spansToDisplayItems, IDisplayItem } from '../unified';

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

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <UnifiedItemList
        items={items}
        activeItemId={activeItemId ?? undefined}
        autoScroll={autoScroll}
        compact={compact}
        showDurations
        groupLinked={false}
        className="flex-1"
        emptyMessage="Waiting for workout to start..."
      />
    </div>
  );
};
