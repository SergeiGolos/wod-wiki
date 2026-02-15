/**
 * TimerDisplay - Stack-driven timer display component
 * 
 * Subscribes to runtime stack events and reads block memory directly.
 * No global memory store — blocks own their state, stack events drive UI updates.
 * 
 * Timer Pinning:
 * - Scans stack bottom-to-top for the lowest block with timer role === 'primary'
 * - If no pinned timer exists, falls back to the leaf (top-of-stack) timer
 * - This allows parent blocks (For Time, AMRAP) to pin their timer as the main display
 */

import React, { useMemo } from 'react';
import { useScriptRuntime } from '../../runtime/context/RuntimeContext';
import {
  usePrimaryTimer,
  useSecondaryTimers,
  useStackTimers,
  useActiveControls,
  useStackDisplayRows,
} from '../../runtime/hooks/useStackDisplay';
import { calculateDuration } from '../../lib/timeUtils';

import { TimerStackView } from './TimerStackView';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerDisplayProps {
  /** Current elapsed time in milliseconds */
  elapsedMs: number;

  /** Whether a workout block is active */
  hasActiveBlock: boolean;

  /** Callback to start the timer */
  onStart: () => void;

  /** Callback to pause the timer */
  onPause: () => void;

  /** Callback to stop the timer */
  onStop: () => void;

  /** Callback to advance to next segment */
  onNext: () => void;

  /** Whether the timer is currently running */
  isRunning: boolean;

  /** Enable compact mode for mobile */
  compact?: boolean;

  /** Callback when hovering a timer block (for highlighting in editor) */
  onBlockHover?: (blockKey: string | null) => void;

  /** Callback when clicking a timer block (for navigation) */
  onBlockClick?: (blockKey: string) => void;

  /** Enable stack-driven display features (requires RuntimeLifecycleProvider) */
  enableDisplayStack?: boolean;
}



/**
 * StackIntegratedTimer - Timer with full runtime integration
 * 
 * Subscribes to:
 * - Stack events (push/pop) via useSnapshotBlocks
 * - Block timer memory via useStackTimers
 * - Block controls memory via useActiveControls
 * 
 * When a block is popped from the stack, its memory subscriptions complete
 * automatically and the stack event triggers a UI re-render.
 */
const StackIntegratedTimer: React.FC<TimerDisplayProps> = (props) => {
  const runtime = useScriptRuntime();

  // Stack-driven hooks — subscribe to block memory directly
  const primaryTimer = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const allTimers = useStackTimers();
  const activeControls = useActiveControls();
  const stackItems = useStackDisplayRows();

  // ---------------------------------------------------------------------------
  // Ticking Logic for Open Spans
  // ---------------------------------------------------------------------------
  const [now, setNow] = React.useState(Date.now());

  // Check if ANY timer is running (has an open span)
  const isAnyTimerRunning = useMemo(() => {
    return allTimers.some(t => t.timer.spans.some(s => s.ended === undefined));
  }, [allTimers]);

  // Run animation frame loop only when needed
  React.useEffect(() => {
    if (!isAnyTimerRunning) return;

    let frameId: number;
    const update = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(frameId);
  }, [isAnyTimerRunning]);

  // ---------------------------------------------------------------------------
  // Data Derivation (using `now`)
  // ---------------------------------------------------------------------------

  // 1. Primary Timer Elapsed
  // Note: We use the memory-derived elapsed time, overriding props.elapsedMs
  const primaryElapsedMs = useMemo(() => {
    if (!primaryTimer) return 0;
    return calculateDuration(primaryTimer.timer.spans, now);
  }, [primaryTimer, now]);

  // 2. Timer States for Stack Items
  const timerStates = useMemo(() => {
    const map = new Map<string, { elapsed: number; duration?: number; format: 'down' | 'up' }>();

    for (const entry of allTimers) {
      const blockKey = entry.block.key.toString();
      const elapsed = calculateDuration(entry.timer.spans, now);

      map.set(blockKey, {
        elapsed,
        duration: entry.timer.durationMs,
        format: entry.timer.direction
      });
    }

    return map;
  }, [allTimers, now]);

  // Convert primary timer to Display Entry
  const primaryTimerEntry = useMemo(() => {
    if (!primaryTimer) return undefined;
    const blockKey = primaryTimer.block.key.toString();
    return {
      id: `timer-${blockKey}`,
      ownerId: blockKey,
      timerMemoryId: '',
      label: primaryTimer.timer.label,
      format: primaryTimer.timer.direction,
      durationMs: primaryTimer.timer.durationMs,
      role: primaryTimer.isPinned ? 'primary' as const : 'auto' as const,
    };
  }, [primaryTimer]);

  // Convert secondary timers
  const secondaryTimerEntries = useMemo(() => {
    return secondaryTimers.map(entry => {
      const blockKey = entry.block.key.toString();
      return {
        id: `timer-${blockKey}`,
        ownerId: blockKey,
        timerMemoryId: '',
        label: entry.timer.label,
        format: entry.timer.direction,
        durationMs: entry.timer.durationMs,
        role: entry.isPinned ? 'primary' as const : 'auto' as const,
      };
    });
  }, [secondaryTimers]);

  // Convert active controls
  const actions = useMemo(() => {
    return activeControls
      .filter(btn => btn.visible && btn.enabled && btn.eventName)
      .map(btn => ({
        id: btn.id,
        name: btn.label,
        eventName: btn.eventName!,
        ownerId: '',
        displayLabel: btn.label,
        isPinned: btn.isPinned,
      }));
  }, [activeControls]);

  // The focused block is the primary timer's block
  const focusedBlockId = primaryTimer ? primaryTimer.block.key.toString() : undefined;

  // 3. Label & Time Logic for Display
  const { mainLabel, subLabel, activeTimerEntry, activeElapsed } = useMemo(() => {
    // Determine the Leaf Item (lowest child on stack)
    const leafItem = stackItems?.find(i => i.isLeaf);
    const leafLabel = leafItem?.label;

    // Find the timer corresponding to the leaf block
    const leafTimer = leafItem ? allTimers.find(t => t.block.key.toString() === leafItem.block.key.toString()) : undefined;
    const leafElapsed = leafTimer ? calculateDuration(leafTimer.timer.spans, now) : 0;

    // If we have a Pinned Primary Timer
    if (primaryTimer && primaryTimer.isPinned) {
      const isLeafTimer = primaryTimer.block.key.toString() === leafItem?.block.key.toString();
      const pinnedElapsed = calculateDuration(primaryTimer.timer.spans, now);

      return {
        mainLabel: primaryTimer.timer.label,
        // Only show sub-label (leaf) if it's different from the pinned timer
        subLabel: isLeafTimer ? undefined : leafLabel,
        activeTimerEntry: primaryTimer,
        activeElapsed: pinnedElapsed
      };
    }

    // No pinned timer (Primary is auto/fallback) -> Show the Leaf Label & Time
    // If the leaf has a timer, use it. Otherwise fall back to primary (likely session)
    return {
      mainLabel: leafLabel || primaryTimer?.timer.label || "Timer",
      subLabel: undefined,
      activeTimerEntry: leafTimer || primaryTimer,
      activeElapsed: leafTimer ? leafElapsed : primaryElapsedMs /* fallback to session if leaf has no timer */
    };
  }, [primaryTimer, stackItems, allTimers, now, primaryElapsedMs]);

  // Override the label/values in the primaryTimerEntry sent to the view
  const displayTimerEntry = useMemo(() => {
    // If we have an override from Step 3 (activeTimerEntry), use it
    if (activeTimerEntry) {
      const blockKey = activeTimerEntry.block.key.toString();
      return {
        id: `timer-${blockKey}`,
        ownerId: blockKey,
        timerMemoryId: '',
        label: mainLabel,
        format: activeTimerEntry.timer.direction,
        durationMs: activeTimerEntry.timer.durationMs,
        role: activeTimerEntry.isPinned ? 'primary' as const : 'auto' as const,
        accumulatedMs: activeElapsed
      };
    }

    // Otherwise fallback to the existing primaryTimerEntry (likely session or leaf from hook)
    // but update label and elapsed
    if (!primaryTimerEntry) return undefined;

    return {
      ...primaryTimerEntry,
      label: mainLabel,
      accumulatedMs: activeElapsed
    };
  }, [primaryTimerEntry, activeTimerEntry, mainLabel, activeElapsed]);

  return (
    <TimerStackView
      // Use our calculated elapsed time from the active selection
      elapsedMs={activeElapsed}
      // Pass other props
      hasActiveBlock={props.hasActiveBlock}
      onStart={props.onStart}
      onPause={props.onPause}
      onStop={props.onStop}
      onNext={props.onNext}
      actions={actions.length > 0 ? actions : undefined}
      onAction={(eventName, payload) => {
        // Dispatch the event to the runtime's event bus.
        // For 'next' events, this goes through NextEventHandler → NextAction
        // which handles block advancement directly.
        runtime.handle({ name: eventName, timestamp: new Date(), data: payload });

        // For non-runtime events, delegate to the appropriate prop callback.
        // Note: 'next' is NOT delegated to props.onNext() because the
        // runtime.handle() call above already advances the block. Calling
        // props.onNext() would double-dispatch and skip a block.
        switch (eventName) {
          case 'timer:pause':
            props.onPause?.();
            break;
          case 'timer:resume':
          case 'timer:start':
            props.onStart?.();
            break;
          case 'workout:stop':
            props.onStop?.();
            break;
        }
      }}
      // If any timer is running, the display should look alive
      isRunning={isAnyTimerRunning}

      primaryTimer={displayTimerEntry}
      subLabel={subLabel}
      secondaryTimers={secondaryTimerEntries}
      stackItems={stackItems}
      compact={props.compact}
      focusedBlockId={focusedBlockId}
      timerStates={timerStates}
    />
  );
};

/**
 * TimerDisplay - Enhanced timer display component
 */
export const TimerDisplay: React.FC<TimerDisplayProps> = (props) => {
  // If display stack is enabled (runtime available), render with runtime hooks
  if (props.enableDisplayStack) {
    return <StackIntegratedTimer {...props} />;
  }

  // Render without runtime dependencies (fallback)
  return (
    <TimerStackView
      elapsedMs={props.elapsedMs}
      hasActiveBlock={props.hasActiveBlock}
      onStart={props.onStart}
      onPause={props.onPause}
      onStop={props.onStop}
      onNext={props.onNext}
      isRunning={props.isRunning}
      compact={props.compact}
    />
  );
};

export default TimerDisplay;
