import React, { useEffect, useState } from 'react';
import { useWorkbenchSyncStore } from './workbenchSyncStore';
import { usePrimaryTimer, useSecondaryTimers, useStackTimers } from '../../runtime/hooks/useStackDisplay';
import { useSnapshotBlocks } from '../../runtime/hooks/useStackSnapshot';
import { calculateDuration } from '../../lib/timeUtils';
import { useRuntimeLifecycle } from './RuntimeLifecycleProvider';
import { ScriptRuntimeProvider } from '../../runtime/context/RuntimeContext';
import { useNextPreview } from '@/runtime/hooks/useNextPreview';

/**
 * DisplaySyncBridgeContent - Serializes the FULL UI state for the TV / Chromecast receiver.
 *
 * Produces a JSON-serializable snapshot that mirrors everything the Track panel shows:
 * - timerStack (primary + secondary timers with accumulatedMs)
 * - displayRows (ALL stack blocks with label, fragments, per-block timer — no filtering)
 * - lookahead (next block's fragments)
 * - subLabel (from label resolution logic)
 *
 * Unlike useStackDisplayRows() (which filters blocks), this renders ALL blocks on the
 * runtime stack — matching exactly what RuntimeStackView in VisualStatePanel does.
 */
const DisplaySyncBridgeContent: React.FC = () => {
  const setDisplayState = useWorkbenchSyncStore(s => s.setDisplayState);
  const execution = useWorkbenchSyncStore(s => s.execution);
  
  // 1. Get the full stack (unfiltered) + timer data
  const blocks = useSnapshotBlocks();
  const primaryTimerEntry = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const allTimers = useStackTimers();
  const nextPreview = useNextPreview();

  // 2. Subscribe to fragment memory changes on ALL blocks (like StackBlockItem does)
  const [fragmentVersion, setFragmentVersion] = useState(0);
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    for (const block of blocks) {
      // Subscribe to display-tier fragment memory
      const displayLocs = block.getFragmentMemoryByVisibility('display');
      for (const loc of displayLocs) {
        unsubscribes.push(loc.subscribe(() => setFragmentVersion(v => v + 1)));
      }
    }
    return () => unsubscribes.forEach(fn => fn());
  }, [blocks]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (execution.status !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [execution.status]);

  useEffect(() => {
    // 3. Build per-block timer lookup (blockKey → timer state)
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

    // 4. Prepare full serializable timer stack
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

    // 5. Serialize ALL stack blocks (root→leaf order) — matches RuntimeStackView exactly
    //    NO filtering: every block on the stack gets a display row.
    const orderedBlocks = [...blocks].reverse(); // Stack is leaf→root; reverse for root→leaf
    const displayRows = orderedBlocks.map((block, index) => {
      const blockKey = block.key.toString();
      const timer = blockTimerMap.get(blockKey);

      // Read fragment:display memory for this block (same as StackBlockItem)
      const displayLocs = block.getFragmentMemoryByVisibility('display');
      const rows = displayLocs.map(loc => loc.fragments);

      return {
        blockKey,
        blockType: block.blockType,
        label: block.label,
        isLeaf: index === orderedBlocks.length - 1,
        depth: index,
        rows,            // ICodeFragment[][] — serializable
        timer: timer || null,
      };
    });

    // 6. Derive sub-label (same logic as StackIntegratedTimer)
    let subLabel: string | undefined;
    const leafItem = displayRows.find(i => i.isLeaf);
    const roundsItem = displayRows.find(i => i.blockType === 'Rounds');
    if (primaryTimerEntry?.isPinned) {
      const resolvedMainLabel = roundsItem?.label || primaryTimerEntry.timer.label;
      if (resolvedMainLabel !== leafItem?.label) {
        subLabel = leafItem?.label;
      }
    } else if (roundsItem && roundsItem.label !== leafItem?.label) {
      subLabel = leafItem?.label;
    }

    // 7. Serialize lookahead (next block preview)
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
  }, [blocks, primaryTimerEntry, secondaryTimers, allTimers, nextPreview, fragmentVersion, execution.status, execution.elapsedTime, now]);

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
