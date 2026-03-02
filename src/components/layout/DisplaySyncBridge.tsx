import React, { useEffect, useState } from 'react';
import { useWorkbenchSyncStore } from './workbenchSyncStore';
import { usePrimaryTimer, useSecondaryTimers, useStackDisplayRows } from '../../runtime/hooks/useStackDisplay';
import { calculateDuration } from '../../lib/timeUtils';
import { useRuntimeLifecycle } from './RuntimeLifecycleProvider';
import { ScriptRuntimeProvider } from '../../runtime/context/RuntimeContext';

/**
 * DisplaySyncBridgeContent - Serializes the FULL UI state for the TV.
 */
const DisplaySyncBridgeContent: React.FC = () => {
  const setDisplayState = useWorkbenchSyncStore(s => s.setDisplayState);
  const execution = useWorkbenchSyncStore(s => s.execution);
  
  // 1. Get the full rich stacks
  const primaryTimerEntry = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const stackItems = useStackDisplayRows();

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (execution.status !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [execution.status]);

  useEffect(() => {
    // 2. Prepare full serializable timer stack
    const timerStack = [
      ...(primaryTimerEntry ? [{
        id: `timer-${primaryTimerEntry.block.key}`,
        label: primaryTimerEntry.timer.label,
        format: primaryTimerEntry.timer.format || primaryTimerEntry.timer.direction,
        durationMs: primaryTimerEntry.timer.durationMs,
        role: 'primary',
        accumulatedMs: calculateDuration(primaryTimerEntry.timer.spans, now),
        isRunning: primaryTimerEntry.timer.spans.some(s => s.ended === undefined)
      }] : []),
      ...secondaryTimers.map(t => ({
        id: `timer-${t.block.key}`,
        label: t.timer.label,
        format: t.timer.format || t.timer.direction,
        durationMs: t.timer.durationMs,
        role: 'secondary',
        accumulatedMs: calculateDuration(t.timer.spans, now),
        isRunning: t.timer.spans.some(s => s.ended === undefined)
      }))
    ];

    // 3. Prepare serializable display rows (The left panel data)
    const displayRows = stackItems?.map(item => ({
      label: item.label,
      isLeaf: item.isLeaf,
      depth: item.depth,
      rows: item.displayRows // ICodeFragment[][] is serializable
    })) || [];

    setDisplayState({
      timerStack: timerStack as any,
      displayRows: displayRows as any,
      workoutState: execution.status,
      totalElapsedMs: execution.elapsedTime,
      isRunning: execution.status === 'running'
    } as any);
  }, [primaryTimerEntry, secondaryTimers, stackItems, execution.status, execution.elapsedTime, now]);

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
