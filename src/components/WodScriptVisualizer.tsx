import React, { useMemo } from 'react';
import { ICodeStatement } from '../core/models/CodeStatement';
import { UnifiedItemList, statementsToDisplayItems, IDisplayItem } from './unified';
import { VisualizerSize, VisualizerFilter } from '../core/models/DisplayItem';

export interface WodScriptVisualizerProps {
  statements: ICodeStatement[];
  showTimestamps?: boolean;
  showDurations?: boolean;
  autoScroll?: boolean;
  selectedLine?: number;
  highlightedLine?: number;
  /** Display size variant @default 'normal' */
  size?: VisualizerSize;
  /** Optional filter configuration */
  filter?: VisualizerFilter;
  /** @deprecated Use size='compact' instead */
  compact?: boolean;
  onSelectionChange?: (itemId: string | null) => void;
  renderActions?: (item: IDisplayItem) => React.ReactNode;
  className?: string;
  maxHeight?: string | number;
}

export const WodScriptVisualizer: React.FC<WodScriptVisualizerProps> = ({
  statements,
  showTimestamps,
  showDurations,
  autoScroll,
  selectedLine,
  highlightedLine,
  size,
  filter,
  compact,
  onSelectionChange,
  renderActions,
  className,
  maxHeight
}) => {
  // Convert statements to display items
  const items = useMemo(() => {
    return statementsToDisplayItems(statements);
  }, [statements]);

  // Find active item ID based on highlighted/selected line if provided
  const activeItemId = useMemo(() => {
    // Basic mapping: if we have a highlighted line, try to find an item that roughly corresponds?
    // In strict visualizer, usually the 'id' of the display item matches the statement id.
    // If selectedLine is passed, we might need to map it.
    // However, existing usage suggests strict ID matching might be handled by parent or custom hooks.
    // For now, let's leave this undefined unless we have a specific ID passed.
    // If statementsToDisplayItems attaches IDs matching statement IDs, we can use that?
    // statementsToDisplayItems typically uses statement.id as sourceId.
    if (selectedLine !== undefined) {
         const found = items.find(i => Number(i.sourceId) === selectedLine); // Assuming line/ID correlation or sourceId
         return found?.id;
    }
    return undefined;
  }, [items, selectedLine]);

  return (
    <UnifiedItemList 
      items={items}
      activeItemId={activeItemId}
      size={size}
      filter={filter}
      compact={compact}
      showTimestamps={showTimestamps}
      showDurations={showDurations}
      autoScroll={autoScroll}
      renderActions={renderActions}
      onSelectionChange={onSelectionChange}
      className={className}
      maxHeight={maxHeight}
    />
  );
};

