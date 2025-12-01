/**
 * TimerDisplay - Enhanced timer display component
 * 
 * Uses RefinedTimerDisplay for the UI.
 */

import React, { useMemo } from 'react';
import { useRuntimeContext } from '../../runtime/context/RuntimeContext';
import { useMemorySubscription } from '../../runtime/hooks/useMemorySubscription';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';
import { RuntimeControls } from '../../runtime/models/MemoryModels';
import {
  useTimerStack,
  useCardStack
} from '../../clock/hooks/useDisplayStack';

import { RefinedTimerDisplay, BreadcrumbItem } from './RefinedTimerDisplay';

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

  /** Enable memory-driven display stack features */
  enableDisplayStack?: boolean;
}

/**
 * DisplayStackTimerDisplay - Timer with full runtime integration
 * This component MUST be rendered inside a RuntimeProvider
 */
const DisplayStackTimerDisplay: React.FC<TimerDisplayProps> = (props) => {
  // These hooks require RuntimeProvider - safe to call here since we're only
  // rendered when enableDisplayStack is true (which requires runtime)
  const timerStack = useTimerStack();
  const cardStack = useCardStack();
  const runtime = useRuntimeContext();

  // Subscribe to runtime controls
  const controlsRef = useMemo(() => {
    const refs = runtime.memory.search({
      type: 'runtime-controls',
      id: null,
      ownerId: null,
      visibility: null
    });
    // Use the last one (most recently created/pushed) as it likely corresponds to the active block
    return refs.length > 0 ? (refs[refs.length - 1] as TypedMemoryReference<RuntimeControls>) : undefined;
  }, [runtime]);

  const controls = useMemorySubscription(controlsRef);

  // Primary timer is the last in stack (if display stack enabled)
  const primaryTimer = timerStack.length > 0 ? timerStack[timerStack.length - 1] : undefined;

  // Secondary timers are all except the primary
  const secondaryTimers = timerStack.length > 1 ? timerStack.slice(0, -1) : [];

  // Current activity card
  const currentCard = cardStack.length > 0 ? cardStack[cardStack.length - 1] : undefined;

  // Calculate active items for breadcrumb
  const activeItems = useMemo(() => {
    if (!runtime) return undefined;

    // Cast to any to access activeSpans if not in interface
    const rt = runtime as any;
    if (!rt.activeSpans) return undefined;

    // Get all active spans
    const activeSpansMap = rt.activeSpans as Map<string, any>;

    if (activeSpansMap.size === 0) return undefined;

    const items: BreadcrumbItem[] = [];

    // Filter spans to only those present in the timer stack (or card stack for the active leaf)
    // This ensures we only show what's visually relevant/active on the stack
    // We iterate through the timerStack to preserve order
    timerStack.forEach(timerEntry => {
      const span = activeSpansMap.get(timerEntry.ownerId);
      if (!span) return;

      // Skip root/workout container if needed
      if (span.type === 'group' && !span.label) return;

      const isLeaf = timerEntry === timerStack[timerStack.length - 1];

      const item: BreadcrumbItem = {
        type: span.type === 'group' ? 'group' : 'exercise',
        isLeaf
      };

      // Format based on metrics
      if (span.metrics?.currentRound && span.metrics?.totalRounds) {
        item.metric = `${span.metrics.currentRound}/${span.metrics.totalRounds}`;
      } else if (span.metrics?.currentRound) {
        item.metric = `${span.metrics.currentRound}`;
      }

      // Add label
      if (span.label) {
        item.label = span.label;
      }

      items.push(item);
    });

    return items.length > 0 ? items : undefined;
  }, [runtime, (runtime as any)?.activeSpans, timerStack]);

  return (
    <RefinedTimerDisplay
      elapsedMs={props.elapsedMs}
      hasActiveBlock={props.hasActiveBlock}
      onStart={props.onStart}
      onPause={props.onPause}
      onStop={props.onStop}
      onNext={props.onNext}
      isRunning={props.isRunning}
      primaryTimer={primaryTimer}
      secondaryTimers={secondaryTimers}
      currentCard={currentCard}

      controls={controls}
      activeItems={activeItems}
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
    // No stack data available in this mode
    />
  );
};

export default TimerDisplay;
