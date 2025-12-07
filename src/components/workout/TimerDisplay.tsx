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
import { spanMetricsToFragments } from '../../runtime/utils/metricsToFragments';
import { IDisplayItem } from '../../core/models/DisplayItem';

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

  // Subscribe to primary-clock registry
  const primaryClockRef = useMemo(() => {
      const refs = runtime.memory.search({
          type: 'registry',
          id: 'primary-clock',
      });
      return refs.length > 0 ? (refs[0] as TypedMemoryReference<string>) : undefined;
  }, [runtime]);

  const primaryClockValue = useMemorySubscription(primaryClockRef);
  const focusedBlockId = primaryClockValue || undefined;

  // Primary timer is the last in stack (if display stack enabled)
  const primaryTimer = timerStack.length > 0 ? timerStack[timerStack.length - 1] : undefined;

  // Secondary timers are all except the primary
  const secondaryTimers = timerStack.length > 1 ? timerStack.slice(0, -1) : [];

  // Current activity card
  const currentCard = cardStack.length > 0 ? cardStack[cardStack.length - 1] : undefined;

  // Calculate timer states for ALL timers in the stack
  // We want to give every card its accurate running time.
  const timerStates = useMemo(() => {
      const map = new Map<string, { elapsed: number; duration?: number; format: 'countdown' | 'countup' }>();
      
      timerStack.forEach(t => {
          // Default accumulated time from the timer entry (snapshot)
          let elapsed = t.accumulatedMs || 0;

          // If this timer matches the currently active primary timer, use the LIVE elapsedMs prop
          // This ensures smooth 60fps animation for the active block.
          if (primaryTimer && t.id === primaryTimer.id) {
              elapsed = props.elapsedMs;
          }

          map.set(t.ownerId, {
              elapsed,
              duration: t.durationMs,
              format: t.format
          });
      });

      return map;
  }, [timerStack, primaryTimer, props.elapsedMs]);


  // Calculate stack items for display
  const stackItems = useMemo(() => {
    if (!runtime) return undefined;

    // Cast to any to access activeSpans if not in interface
    const rt = runtime as any;
    if (!rt.activeSpans) return undefined;

    // Get all active spans
    const activeSpansMap = rt.activeSpans as Map<string, any>;

    if (activeSpansMap.size === 0) return undefined;

    const items: IDisplayItem[] = [];

    // Filter spans to only those present in the timer stack (or card stack for the active leaf)
    // This ensures we only show what's visually relevant/active on the stack
    // We iterate through the timerStack to preserve order
    timerStack.forEach(timerEntry => {
      const span = activeSpansMap.get(timerEntry.ownerId);
      if (!span) return;

      // Skip root/workout container if needed
      if (span.type === 'group' && !span.label) return;

      const isLeaf = timerEntry === timerStack[timerStack.length - 1];

      // Generate fragments from metrics using the utility
      const fragments = spanMetricsToFragments(
          span.metrics || {}, 
          span.label || (span.type === 'group' ? 'Group' : 'Block'), 
          span.type
      );

      const item: IDisplayItem = {
        id: span.id,
        parentId: span.parentSpanId || null,
        fragments: fragments,
        depth: 0, // Flat list for visual cleaness in the stack view
        isHeader: false,
        status: isLeaf ? 'active' : 'completed', // Visually showing parents as completed/context
        sourceType: 'span',
        sourceId: span.id,
        label: span.label
      };

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
    // No stack data available in this mode
    />
  );
};

export default TimerDisplay;
