import React, { useMemo } from 'react';
import { ICodeStatement } from '../core/models/CodeStatement';
import { FragmentSourceList } from './fragments/FragmentSourceList';
import { FragmentSourceEntry, FragmentSourceStatus } from './fragments/FragmentSourceRow';
import { IFragmentSource } from '../core/contracts/IFragmentSource';
import { FragmentType } from '../core/models/CodeFragment';
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
  renderActions?: (entry: FragmentSourceEntry) => React.ReactNode;
  className?: string;
  maxHeight?: string | number;
}

/**
 * Calculate depth for a statement by walking the parent chain.
 */
function calculateDepth(statement: ICodeStatement, map: Map<number, ICodeStatement>): number {
  let depth = 0;
  let currentId = statement.parent;
  const visited = new Set<number>();
  while (currentId !== undefined && !visited.has(currentId)) {
    visited.add(currentId);
    const parent = map.get(currentId);
    if (parent) {
      depth++;
      currentId = parent.parent;
    } else {
      break;
    }
    if (depth > 10) break;
  }
  return depth;
}

export const WodScriptVisualizer: React.FC<WodScriptVisualizerProps> = ({
  statements,
  showDurations,
  autoScroll,
  selectedLine,
  size,
  filter,
  compact,
  onSelectionChange,
  renderActions,
  className,
  maxHeight
}) => {
  // Convert statements to FragmentSourceEntry[] — statements implement IFragmentSource
  const entries = useMemo(() => {
    const statementMap = new Map(statements.map(s => [s.id, s]));

    return statements.map((statement): FragmentSourceEntry => {
      const depth = calculateDepth(statement, statementMap);
      const isLinked = statement.fragments.some(
        f => f.fragmentType === FragmentType.Group && f.image === '+'
      );
      const hasChildren = statement.children && statement.children.length > 0;
      const hasTimerOrRounds = statement.fragments.some(
        f => f.fragmentType === FragmentType.Timer || f.fragmentType === FragmentType.Rounds
      );
      const isHeader = hasChildren && hasTimerOrRounds;

      return {
        source: statement as unknown as IFragmentSource,
        depth,
        isHeader,
        isLinked,
        label: statement.fragments.map(f => f.image || '').join(' ').trim() || undefined,
        status: 'pending' as FragmentSourceStatus,
      };
    });
  }, [statements]);

  // Determine active item based on selectedLine
  const activeItemId = useMemo(() => {
    if (selectedLine !== undefined) {
      const found = entries.find(e => Number(e.source.id) === selectedLine);
      return found ? String(found.source.id) : undefined;
    }
    return undefined;
  }, [entries, selectedLine]);

  const effectiveSize = compact ? 'compact' as VisualizerSize : size;

  return (
    <FragmentSourceList
      entries={entries}
      activeItemId={activeItemId}
      size={effectiveSize}
      filter={filter}
      showDurations={showDurations}
      groupLinked
      autoScroll={autoScroll}
      renderActions={renderActions}
      onSelectionChange={onSelectionChange}
      className={className}
      maxHeight={maxHeight}
    />
  );
};

