import React, { useMemo, useEffect, useState } from 'react';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { useOutputStatements } from '@/runtime/hooks/useOutputStatements';
import { MetricSourceList } from '@/components/metrics/MetricSourceList';
import { FragmentSourceEntry, FragmentSourceStatus } from '@/components/metrics/MetricSourceRow';
import { IMetricSource } from '@/core/contracts/IMetricSource';
import { MetricType } from '@/core/models/Metric';
import { VisualizerSize } from '@/core/models/DisplayItem';

export interface RuntimeHistoryLogProps {
  runtime: ScriptRuntime | null;
  activeStatementIds?: Set<number>;
  highlightedBlockKey?: string | null;
  autoScroll?: boolean;
  className?: string;
  workoutStartTime?: number | null;
  /** Whether to show active items (default: true) */
  showActive?: boolean;
  /** Display size variant */
  size?: VisualizerSize;
  /** Pre-computed entries — when provided, skips useOutputStatements */
  entries?: FragmentSourceEntry[];
  /** Set of selected item IDs (string) for multi-select */
  selectedIds?: Set<string>;
  /** Callback when an item's selection is toggled */
  onSelectionChange?: (id: string | null, modifiers?: { ctrlKey: boolean; shiftKey: boolean }) => void;
  /** Callback for double click */
  onDoubleClick?: () => void;
}

/**
 * Header block types that should render with header styling
 */
const HEADER_TYPES = new Set([
  'root', 'round', 'interval', 'warmup', 'cooldown',
  'amrap', 'emom', 'tabata', 'group', 'start', 'timer', 'rounds'
]);

export const RuntimeHistoryLog: React.FC<RuntimeHistoryLogProps> = ({
  runtime,
  highlightedBlockKey,
  autoScroll = true,
  className,
  showActive = true,
  size = 'normal',
  entries: externalEntries,
  selectedIds,
  onSelectionChange,
  onDoubleClick,
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

  // When external entries are provided (e.g. historical segments), skip runtime derivation
  const { entries, activeItemId } = useMemo(() => {
    if (externalEntries) {
      return { entries: externalEntries, activeItemId: null };
    }

    if (!runtime) return { entries: [] as FragmentSourceEntry[], activeItemId: null };
    void updateVersion; // Dependency to force re-calc for timers

    // Convert output statements directly — they implement IMetricSource
    let displayEntries: FragmentSourceEntry[] = outputs.map((output): FragmentSourceEntry => {
      const metrics = output.metrics.flat();

      let status: FragmentSourceStatus = 'completed';
      if (output.outputType === 'segment') {
        status = 'active';
      }

      const isHeader = metrics.some(f =>
        f.metricType === MetricType.Duration ||
        f.metricType === MetricType.Rounds ||
        HEADER_TYPES.has(f.type.toLowerCase())
      );

      return {
        source: output as unknown as IMetricSource,
        depth: output.stackLevel,
        isHeader,
        status,
        duration: output.elapsed,
        startTime: output.timeSpan.started,
        endTime: output.timeSpan.ended,
        label: metrics
          .filter(f => {
            const type = (f.type || f.metricType || '').toLowerCase();
            const image = f.image || '';
            if (type === 'group' && (image === '+' || image === '-')) return false;
            return type !== 'lap';
          })
          .map(f => f.image || '')
          .join(' ')
          .trim() || undefined,
      };
    });

    // Sort by start time
    displayEntries = [...displayEntries].sort(
      (a, b) => (a.startTime || 0) - (b.startTime || 0)
    );

    // Filter out active items if showActive is false
    if (!showActive) {
      displayEntries = displayEntries.filter(entry => entry.status !== 'active');
    }

    // Determine active item (last active one) OR last item if none active
    let activeItemId: string | null = null;
    const activeEntries = displayEntries.filter(entry => entry.status === 'active');
    if (activeEntries.length > 0) {
      activeItemId = String(activeEntries[activeEntries.length - 1].source.id);
    } else if (displayEntries.length > 0) {
      activeItemId = String(displayEntries[displayEntries.length - 1].source.id);
    }

    return { entries: displayEntries, activeItemId };
  }, [runtime, outputs, updateVersion, showActive, externalEntries]);

  return (
    <MetricSourceList
      entries={entries}
      activeItemId={activeItemId || highlightedBlockKey || undefined}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      onDoubleClick={onDoubleClick}
      autoScroll={autoScroll}
      size={size}
      showDurations
      groupLinked={false}
      className={className}
      emptyMessage="No events recorded"
    />
  );
};
