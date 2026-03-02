import React, { useEffect, useState, useRef } from 'react';
import { useWorkbenchSyncStore } from './workbenchSyncStore';
import { usePrimaryTimer, useSecondaryTimers, useStackTimers } from '../../runtime/hooks/useStackDisplay';
import { useSnapshotBlocks } from '../../runtime/hooks/useStackSnapshot';
import { useRuntimeLifecycle } from './RuntimeLifecycleProvider';
import { ScriptRuntimeProvider } from '../../runtime/context/RuntimeContext';
import { useNextPreview } from '@/runtime/hooks/useNextPreview';

/**
 * DisplaySyncBridgeContent - Serializes block-based state for the TV / Chromecast receiver.
 *
 * Design principle: **structural events only, no ticks.**
 *
 * The bridge fires a state-update ONLY when:
 * 1. Stack structure changes (push/pop → blocks array changes)
 * 2. Fragment memory changes on any block (display-tier subscriptions)
 * 3. Timer running state changes (start/pause — NOT elapsed ticks)
 * 4. Workout state transitions (running ↔ paused ↔ stopped)
 * 5. Lookahead (next block preview) changes
 *
 * Timer elapsed is NOT computed here. Instead, raw TimeSpan[] arrays
 * (with epoch-ms `started`/`ended` values) are sent so the receiver
 * can call `calculateDuration(spans, Date.now())` locally at 60fps.
 * An open span (ended === undefined) means "currently running."
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

  // 2. Subscribe to fragment memory changes on ALL blocks
  //    This fires on output events (fragment:display updates) but NOT on timer ticks.
  const [fragmentVersion, setFragmentVersion] = useState(0);
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    for (const block of blocks) {
      const displayLocs = block.getFragmentMemoryByVisibility('display');
      for (const loc of displayLocs) {
        unsubscribes.push(loc.subscribe(() => setFragmentVersion(v => v + 1)));
      }
    }
    return () => unsubscribes.forEach(fn => fn());
  }, [blocks]);

  // 3. Track timer running-state changes (NOT elapsed).
  //    We only care when a timer starts or stops (span opened/closed).
  const timerRunningFingerprint = allTimers.map(entry => {
    const lastSpan = entry.timer.spans[entry.timer.spans.length - 1];
    const isRunning = lastSpan && lastSpan.ended === undefined;
    return `${entry.block.key}:${isRunning ? 'R' : 'S'}:${entry.timer.spans.length}`;
  }).join('|');

  // Output fingerprint ref — prevents writing to the store unless
  // the serialized output actually changed. This is critical because
  // useStackTimers() fires on every timer memory update (which can
  // include internal bookkeeping), but we only want to update the
  // store when structural data (blocks, fragments, spans) changes.
  const lastOutputFingerprintRef = useRef('');

  useEffect(() => {
    // 4. Build per-block timer data with raw spans (no elapsed computation)
    const blockTimerMap = new Map<string, {
      spans: Array<{ started: number; ended?: number }>;
      durationMs?: number;
      direction: 'up' | 'down';
      isRunning: boolean;
    }>();
    for (const entry of allTimers) {
      const blockKey = entry.block.key.toString();
      const lastSpan = entry.timer.spans[entry.timer.spans.length - 1];
      blockTimerMap.set(blockKey, {
        spans: entry.timer.spans.map(s => ({
          started: typeof s.started === 'number' ? s.started : (s as any).startDate?.getTime?.() ?? 0,
          ended: s.ended != null ? (typeof s.ended === 'number' ? s.ended : (s as any).endDate?.getTime?.()) : undefined,
        })),
        durationMs: entry.timer.durationMs,
        direction: entry.timer.direction,
        isRunning: !!lastSpan && lastSpan.ended === undefined,
      });
    }

    // 5. Serialize timer stack with raw spans
    const timerStack = [
      ...(primaryTimerEntry ? [{
        id: `timer-${primaryTimerEntry.block.key}`,
        ownerId: primaryTimerEntry.block.key.toString(),
        label: primaryTimerEntry.timer.label,
        format: (primaryTimerEntry.timer as any).format || primaryTimerEntry.timer.direction,
        durationMs: primaryTimerEntry.timer.durationMs,
        role: 'primary',
        spans: blockTimerMap.get(primaryTimerEntry.block.key.toString())?.spans || [],
        isRunning: blockTimerMap.get(primaryTimerEntry.block.key.toString())?.isRunning || false,
        isPinned: primaryTimerEntry.isPinned,
      }] : []),
      ...secondaryTimers.map(t => {
        const timerData = blockTimerMap.get(t.block.key.toString());
        return {
          id: `timer-${t.block.key}`,
          ownerId: t.block.key.toString(),
          label: t.timer.label,
          format: (t.timer as any).format || t.timer.direction,
          durationMs: t.timer.durationMs,
          role: 'secondary',
          spans: timerData?.spans || [],
          isRunning: timerData?.isRunning || false,
          isPinned: t.isPinned,
        };
      })
    ];

    // 6. Serialize ALL stack blocks (root→leaf)
    const orderedBlocks = [...blocks].reverse();
    const displayRows = orderedBlocks.map((block, index) => {
      const blockKey = block.key.toString();
      const timer = blockTimerMap.get(blockKey);

      const displayLocs = block.getFragmentMemoryByVisibility('display');
      const rows = displayLocs.map(loc => loc.fragments);

      return {
        blockKey,
        blockType: block.blockType,
        label: block.label,
        isLeaf: index === orderedBlocks.length - 1,
        depth: index,
        rows,
        timer: timer || null,
      };
    });

    // 7. Derive sub-label
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

    // 8. Serialize lookahead
    const lookahead = nextPreview ? {
      fragments: nextPreview.fragments,
    } : null;

    // 9. Build output fingerprint — only write to store if changed.
    //    This prevents cascading re-renders when timer hooks fire on
    //    internal memory updates that don't change structural data.
    const blockKeys = displayRows.map(r => r.blockKey).join(',');
    const fragmentSig = displayRows.map(r =>
      r.rows.map(row => row.map(f => `${f.fragmentType}:${f.image ?? f.value}`).join(';')).join('/')
    ).join('|');
    const timerSig = timerStack.map(t =>
      `${t.ownerId}:${t.isRunning}:${t.spans.length}:${t.format}:${t.durationMs}`
    ).join('|');
    const outputFingerprint = [
      execution.status,
      blockKeys,
      fragmentSig,
      timerSig,
      subLabel,
      JSON.stringify(lookahead),
    ].join('::');

    if (outputFingerprint === lastOutputFingerprintRef.current) return;
    lastOutputFingerprintRef.current = outputFingerprint;

    setDisplayState({
      timerStack: timerStack as any,
      displayRows: displayRows as any,
      lookahead: lookahead as any,
      subLabel,
      workoutState: execution.status,
      isRunning: execution.status === 'running',
    } as any);
  }, [blocks, primaryTimerEntry, secondaryTimers, allTimers, nextPreview, fragmentVersion, execution.status, timerRunningFingerprint]);

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
