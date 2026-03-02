import React, { useEffect, useState } from 'react';
import { useWorkbenchSyncStore } from './workbenchSyncStore';
import { usePrimaryTimer, useSecondaryTimers, useStackDisplayRows, useStackTimers } from '../../runtime/hooks/useStackDisplay';
import { calculateDuration } from '../../lib/timeUtils';
import { useRuntimeLifecycle } from './RuntimeLifecycleProvider';
import { ScriptRuntimeProvider } from '../../runtime/context/RuntimeContext';
import { useNextPreview } from '@/runtime/hooks/useNextPreview';

/**
 * DisplaySyncBridgeContent - Serializes the FULL UI state for the TV / Chromecast receiver.
 *
 * Produces a JSON-serializable snapshot that mirrors everything the Track panel shows:
 * - timerStack (primary + secondary timers with accumulatedMs)
 * - displayRows (stack blocks with label, fragments, per-block timer)
 * - lookahead (next block's fragments)
 * - subLabel (from label resolution logic)
 */
const DisplaySyncBridgeContent: React.FC = () => {
  const setDisplayState = useWorkbenchSyncStore(s => s.setDisplayState);
  const execution = useWorkbenchSyncStore(s => s.execution);
  
  // 1. Get the full rich stacks
  const primaryTimerEntry = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const allTimers = useStackTimers();
  const stackItems = useStackDisplayRows();
  const nextPreview = useNextPreview();

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (execution.status !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [execution.status]);

  useEffect(() => {
    // 2. Build per-block timer lookup (blockKey → timer state)
    const blockTimerMap = new Map<string, {
      elapsed: number;
      durationMs?: number;
      direction: 'up' | 'down';
      isRunning: boolean;
    }>();
    for (const entry of allTimers) {
      const blockKey = entry.block.key.toString();
      blockTimerMap.set(blockKey, {
        elapsed: calculateDuration(entry.timer.spans, now),
        durationMs: entry.timer.durationMs,
        direction: entry.timer.direction,
        isRunning: entry.timer.spans.some(s => s.ended === undefined),
      });
    }

    // 3. Prepare full serializable timer stack
    const timerStack = [
      ...(primaryTimerEntry ? [{
        id: `timer-${primaryTimerEntry.block.key}`,
        ownerId: primaryTimerEntry.block.key.toString(),
        label: primaryTimerEntry.timer.label,
        format: (primaryTimerEntry.timer as any).format || primaryTimerEntry.timer.direction,
        durationMs: primaryTimerEntry.timer.durationMs,
        role: 'primary',
        accumulatedMs: calculateDuration(primaryTimerEntry.timer.spans, now),
        isRunning: primaryTimerEntry.timer.spans.some(s => s.ended === undefined),
        isPinned: primaryTimerEntry.isPinned,
      }] : []),
      ...secondaryTimers.map(t => ({
        id: `timer-${t.block.key}`,
        ownerId: t.block.key.toString(),
        label: t.timer.label,
        format: (t.timer as any).format || t.timer.direction,
        durationMs: t.timer.durationMs,
        role: 'secondary',
        accumulatedMs: calculateDuration(t.timer.spans, now),
        isRunning: t.timer.spans.some(s => s.ended === undefined),
        isPinned: t.isPinned,
      }))
    ];

    // 4. Prepare serializable display rows with per-block timer data
    const displayRows = stackItems?.map(item => {
      const blockKey = item.block.key.toString();
      const timer = blockTimerMap.get(blockKey);
      return {
        blockKey,
        blockType: item.block.blockType,
        label: item.label,
        isLeaf: item.isLeaf,
        depth: item.depth,
        rows: item.displayRows, // ICodeFragment[][] is serializable
        timer: timer || null,   // per-block timer state
      };
    }) || [];

    // 5. Derive sub-label (same logic as StackIntegratedTimer)
    let subLabel: string | undefined;
    const leafItem = stackItems?.find(i => i.isLeaf);
    const roundsItem = stackItems?.find(i => i.block.blockType === 'Rounds');
    if (primaryTimerEntry?.isPinned) {
      const resolvedMainLabel = roundsItem?.label || primaryTimerEntry.timer.label;
      if (resolvedMainLabel !== leafItem?.label) {
        subLabel = leafItem?.label;
      }
    } else if (roundsItem && roundsItem.label !== leafItem?.label) {
      subLabel = leafItem?.label;
    }

    // 6. Serialize lookahead (next block preview)
    const lookahead = nextPreview ? {
      fragments: nextPreview.fragments,
    } : null;

    setDisplayState({
      timerStack: timerStack as any,
      displayRows: displayRows as any,
      lookahead: lookahead as any,
      subLabel,
      workoutState: execution.status,
      totalElapsedMs: execution.elapsedTime,
      isRunning: execution.status === 'running',
    } as any);
  }, [primaryTimerEntry, secondaryTimers, allTimers, stackItems, nextPreview, execution.status, execution.elapsedTime, now]);

  return null;
};

export const DisplaySyncBridge: React.FC = () => {
  const { runtime } = useRuntimeLifecycle();
  if (!runtime) return null;
  return (
    <ScriptRuntimeProvider runtime={runtime}>
      <DisplaySyncBridgeContent />
    </ScriptRuntimeProvider>
  );
};
