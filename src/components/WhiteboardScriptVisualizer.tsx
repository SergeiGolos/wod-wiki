import React, { useMemo } from 'react';
import { ICodeStatement } from '../core/models/CodeStatement';
import { MetricSourceList } from './metrics/MetricSourceList';
import { FragmentSourceEntry, FragmentSourceStatus } from './metrics/MetricSourceRow';
import { IMetricSource } from '../core/contracts/IMetricSource';
import { MetricType } from '../core/models/Metric';
import { VisualizerSize, VisualizerFilter } from '../core/models/DisplayItem';

export interface WhiteboardScriptVisualizerProps {
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

export const WhiteboardScriptVisualizer: React.FC<WhiteboardScriptVisualizerProps> = ({
  statements,
  showDurations,
  autoScroll,
  selectedLine,
  size,
  filter,
  onSelectionChange,
  renderActions,
  className,
  maxHeight
}) => {
  // Convert statements to FragmentSourceEntry[] — statements implement IMetricSource
  const entries = useMemo(() => {
    const statementMap = new Map(statements.map(s => [s.id, s]));

    return statements.map((statement): FragmentSourceEntry => {
      const depth = calculateDepth(statement, statementMap);
      const isLinked = statement.metrics.some(
        f => f.type === MetricType.Group && f.image === '+'
      );
      const hasChildren = statement.children && statement.children.length > 0;
      const hasTimerOrRounds = statement.metrics.some(
        f => f.type === MetricType.Duration || f.type === MetricType.Rounds
      );
      const isHeader = hasChildren && hasTimerOrRounds;

      return {
        source: statement as unknown as IMetricSource,
        depth,
        isHeader,
        isLinked,
        label: statement.metrics.map(f => f.image || '').join(' ').trim() || undefined,
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

  return (
    <MetricSourceList
      entries={entries}
      activeItemId={activeItemId}
      size={size}
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

