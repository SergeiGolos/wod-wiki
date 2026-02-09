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
  useStackDisplayItems,
} from '../../runtime/hooks/useStackDisplay';
import { TimeSpan } from '../../runtime/models/TimeSpan';
import { calculateDuration } from '../../lib/timeUtils';

import { RefinedTimerDisplay } from './RefinedTimerDisplay';

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

  /** Enable stack-driven display features (requires RuntimeProvider) */
  enableDisplayStack?: boolean;
}



/**
 * DisplayStackTimerDisplay - Timer with full runtime integration
 * 
 * Subscribes to:
 * - Stack events (push/pop) via useStackBlocks
 * - Block timer memory via useStackTimers
 * - Block controls memory via useActiveControls
 * 
 * When a block is popped from the stack, its memory subscriptions complete
 * automatically and the stack event triggers a UI re-render.
 */
const DisplayStackTimerDisplay: React.FC<TimerDisplayProps> = (props) => {
  const runtime = useScriptRuntime();

  // Stack-driven hooks — subscribe to block memory directly
  const primaryTimer = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const allTimers = useStackTimers();
  const activeControls = useActiveControls();
  const stackItems = useStackDisplayItems();

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

  return (
    <RefinedTimerDisplay
      // Use our calculated elapsed time instead of props.elapsedMs
      elapsedMs={primaryElapsedMs}
      // Pass other props
      hasActiveBlock={props.hasActiveBlock}
      onStart={props.onStart}
      onPause={props.onPause}
      onStop={props.onStop}
      onNext={props.onNext}
      actions={actions.length > 0 ? actions : undefined}
      onAction={(eventName, payload) => {
        runtime.handle({ name: eventName, timestamp: new Date(), data: payload });

        switch (eventName) {
          case 'next':
          case 'block:next':
            props.onNext?.();
            break;
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

      primaryTimer={primaryTimerEntry}
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
    return <DisplayStackTimerDisplay {...props} />;
  }

  // Render without runtime dependencies (fallback)
  return (
    <RefinedTimerDisplay
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
