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
import { useRuntimeContext } from '../../runtime/context/RuntimeContext';
import {
  usePrimaryTimer,
  useSecondaryTimers,
  useStackTimers,
  useActiveControls,
  useStackDisplayItems,
} from '../../runtime/hooks/useStackDisplay';
import { TimeSpan } from '../../runtime/models/TimeSpan';

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
 * Calculate elapsed milliseconds from a TimeSpan array.
 */
function calculateElapsedFromSpans(spans: readonly TimeSpan[]): number {
  const now = Date.now();
  return spans.reduce((total, span) => {
    const end = span.ended ?? now;
    return total + Math.max(0, end - span.started);
  }, 0);
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
  const runtime = useRuntimeContext();

  // Stack-driven hooks — subscribe to block memory directly
  const primaryTimer = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const allTimers = useStackTimers();
  const activeControls = useActiveControls();
  const stackItems = useStackDisplayItems();

  // Build timer states map from block memory (keyed by block key for display items)
  const timerStates = useMemo(() => {
    const map = new Map<string, { elapsed: number; duration?: number; format: 'down' | 'up' }>();

    for (const entry of allTimers) {
      const blockKey = entry.block.key.toString();
      const elapsed = calculateElapsedFromSpans(entry.timer.spans);

      map.set(blockKey, {
        elapsed,
        duration: entry.timer.durationMs,
        format: entry.timer.direction
      });
    }

    return map;
  }, [allTimers]);

  // Convert primary timer to the ITimerDisplayEntry shape expected by RefinedTimerDisplay
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

  // Convert active controls to action descriptors for RefinedTimerDisplay
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
      elapsedMs={props.elapsedMs}
      hasActiveBlock={props.hasActiveBlock}
      onStart={props.onStart}
      onPause={props.onPause}
      onStop={props.onStop}
      onNext={props.onNext}
      actions={actions.length > 0 ? actions : undefined}
      onAction={(eventName, payload) => {
        runtime.handle({ name: eventName, timestamp: new Date(), data: payload });
        if (eventName === 'next') {
          props.onNext?.();
        }
      }}
      isRunning={props.isRunning}
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
