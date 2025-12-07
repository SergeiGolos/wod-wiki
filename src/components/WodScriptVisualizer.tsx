import React, { useMemo, useCallback } from 'react';
import { ICodeStatement } from '../core/models/CodeStatement';
import { UnifiedItemList, statementsToDisplayItems, IDisplayItem } from './unified';
import { VisualizerSize } from '../core/models/DisplayItem';

export interface WodScriptVisualizerProps {
  statements: ICodeStatement[];
  activeStatementIds?: Set<number>;
  selectedStatementId?: number | null;
  onSelectionChange?: (id: number | null) => void;
  onHover?: (id: number | null) => void;
  onRenderActions?: (statement: ICodeStatement) => React.ReactNode;
  className?: string;
  /** Display size variant @default 'normal' */
  size?: VisualizerSize;
  /** @deprecated Use size='compact' instead */
  compact?: boolean;
}

export const WodScriptVisualizer: React.FC<WodScriptVisualizerProps> = ({
  statements,
  activeStatementIds = new Set(),
  selectedStatementId,
  onSelectionChange,
  onHover,
  onRenderActions,
  className = '',
  size = 'normal',
  compact
}) => {
  // Create a map for looking up statements by id (used for renderActions)
  const statementMap = useMemo(() => 
    new Map<number, ICodeStatement>(statements.map(s => [s.id, s])), 
    [statements]
  );

  // Convert statements to unified display items
  const displayItems = useMemo(() => 
    statementsToDisplayItems(statements, activeStatementIds),
    [statements, activeStatementIds]
  );

  // Selected IDs set for highlighting
  const selectedIds = useMemo(() => 
    selectedStatementId ? new Set([selectedStatementId.toString()]) : undefined,
    [selectedStatementId]
  );

  // Handle selection changes - convert string ID back to number
  const handleSelectionChange = useCallback((id: string | null) => {
    onSelectionChange?.(id ? parseInt(id, 10) : null);
  }, [onSelectionChange]);

  // Handle hover changes - convert string ID back to number
  const handleHover = useCallback((id: string | null) => {
    onHover?.(id ? parseInt(id, 10) : null);
  }, [onHover]);

  // Render actions for an item
  const renderActions = useCallback((item: IDisplayItem) => {
    if (!onRenderActions) return null;
    const statement = statementMap.get(typeof item.sourceId === 'number' ? item.sourceId : parseInt(item.sourceId as string, 10));
    if (!statement) return null;
    return onRenderActions(statement);
  }, [onRenderActions, statementMap]);

  return (
    <UnifiedItemList
      items={displayItems}
      selectedIds={selectedIds}
      size={size}
      compact={compact}
      groupLinked
      autoScroll={false}
      renderActions={onRenderActions ? renderActions : undefined}
      onSelectionChange={handleSelectionChange}
      onHover={handleHover}
      className={className}
      emptyMessage="No statements to display"
    />
  );
};
