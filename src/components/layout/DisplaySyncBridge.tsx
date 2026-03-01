import React, { useEffect, useMemo } from 'react';
import { useWorkbenchSyncStore } from './workbenchSyncStore';
import { usePrimaryTimer, useSecondaryTimers, useStackDisplayRows } from '../../runtime/hooks/useStackDisplay';
import { calculateDuration } from '../../lib/timeUtils';
import { useRuntimeLifecycle } from './RuntimeLifecycleProvider';
import { ScriptRuntimeProvider } from '../../runtime/context/RuntimeContext';

/**
 * DisplaySyncBridgeContent - The actual logic that requires ScriptRuntimeProvider.
 */
const DisplaySyncBridgeContent: React.FC = () => {
  const setDisplayState = useWorkbenchSyncStore(s => s.setDisplayState);
  const execution = useWorkbenchSyncStore(s => s.execution);
  
  // These hooks require ScriptRuntimeProvider
  const primaryTimerEntry = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const stackItems = useStackDisplayRows();

  // Ticking logic for derived elapsed times
  const [now, setNow] = React.useState(Date.now());
  useEffect(() => {
    if (execution.status !== 'running') return;
    let frameId: number;
    const update = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frameId);
  }, [execution.status]);

  // Derive the same labels as TimerDisplay.tsx
  useEffect(() => {
    // 1. Determine Labels (Logic copied from TimerDisplay.tsx for consistency)
    const leafItem = stackItems?.find(i => i.isLeaf);
    const leafLabel = leafItem?.label;
    const roundsItem = stackItems?.find(i => i.block.blockType === 'Rounds');
    const roundsLabel = roundsItem?.label;

    let mainLabel = "Timer";
    let subLabel: string | undefined = undefined;

    if (primaryTimerEntry && primaryTimerEntry.isPinned) {
      mainLabel = roundsLabel || primaryTimerEntry.timer.label;
      subLabel = (mainLabel === leafLabel) ? undefined : leafLabel;
    } else if (roundsLabel && roundsLabel !== leafLabel) {
      mainLabel = roundsLabel;
      subLabel = leafLabel;
    } else {
      mainLabel = leafLabel || primaryTimerEntry?.timer.label || "Timer";
    }

    // 2. Prepare Primary Timer Entry (Serializable)
    const primary = primaryTimerEntry ? {
      id: `timer-${primaryTimerEntry.block.key}`,
      ownerId: primaryTimerEntry.block.key.toString(),
      timerMemoryId: '',
      label: mainLabel,
      format: primaryTimerEntry.timer.format || primaryTimerEntry.timer.direction,
      durationMs: primaryTimerEntry.timer.durationMs,
      role: primaryTimerEntry.isPinned ? 'primary' as const : 'auto' as const,
      accumulatedMs: calculateDuration(primaryTimerEntry.timer.spans, now),
      isRunning: primaryTimerEntry.timer.spans.some(s => s.ended === undefined)
    } : undefined;

    // 3. Prepare Secondary Timers (Serializable)
    const secondary = secondaryTimers.map(t => ({
      id: `timer-${t.block.key}`,
      ownerId: t.block.key.toString(),
      timerMemoryId: '',
      label: t.timer.label,
      format: t.timer.format || t.timer.direction,
      durationMs: t.timer.durationMs,
      accumulatedMs: calculateDuration(t.timer.spans, now),
      isRunning: t.timer.spans.some(s => s.ended === undefined)
    }));

    setDisplayState({
      primaryTimer: primary as any,
      secondaryTimers: secondary as any,
      subLabel,
      isRunning: execution.status === 'running'
    });
  }, [primaryTimerEntry, secondaryTimers, stackItems, execution.status, setDisplayState, now, execution.stepCount]);

  return null;
};

/**
 * DisplaySyncBridge - Derives UI state from runtime hooks and pushes to Zustand.
 */
export const DisplaySyncBridge: React.FC = () => {
  const { runtime } = useRuntimeLifecycle();

  if (!runtime) return null;

  return (
    <ScriptRuntimeProvider runtime={runtime}>
      <DisplaySyncBridgeContent />
    </ScriptRuntimeProvider>
  );
};
