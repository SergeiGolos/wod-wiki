import React, { useMemo, useEffect, useState } from 'react';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { useOutputStatements } from '@/runtime/hooks/useOutputStatements';
import { FragmentSourceList } from '@/components/unified/FragmentSourceList';
import { FragmentSourceEntry, FragmentSourceStatus } from '@/components/unified/FragmentSourceRow';
import { IFragmentSource } from '@/core/contracts/IFragmentSource';
import { FragmentType } from '@/core/models/CodeFragment';
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
  /** Compact display mode */
  compact?: boolean;
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

  const { entries, activeItemId } = useMemo(() => {
    if (!runtime) return { entries: [] as FragmentSourceEntry[], activeItemId: null };
    void updateVersion; // Dependency to force re-calc for timers

    // Convert output statements directly — they implement IFragmentSource
    let displayEntries: FragmentSourceEntry[] = outputs.map((output): FragmentSourceEntry => {
      const fragments = output.fragments.flat();

      let status: FragmentSourceStatus = 'completed';
      if (output.outputType === 'segment') {
        status = 'active';
      }

      const isHeader = fragments.some(f =>
        f.fragmentType === FragmentType.Timer ||
        f.fragmentType === FragmentType.Rounds ||
        HEADER_TYPES.has(f.type.toLowerCase())
      );

      return {
        source: output as unknown as IFragmentSource,
        depth: output.stackLevel,
        isHeader,
        status,
        duration: output.timeSpan.duration,
        startTime: output.timeSpan.started,
        endTime: output.timeSpan.ended,
        label: fragments.map(f => f.image || '').join(' ').trim() || undefined,
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
  }, [runtime, outputs, updateVersion, showActive]);

  const effectiveSize: VisualizerSize = compact ? 'compact' : 'normal';

  return (
    <FragmentSourceList
      entries={entries}
      activeItemId={activeItemId || highlightedBlockKey || undefined}
      autoScroll={autoScroll}
      size={effectiveSize}
      showDurations
      groupLinked={false}
      className={className}
      emptyMessage="No events recorded"
    />
  );
};
