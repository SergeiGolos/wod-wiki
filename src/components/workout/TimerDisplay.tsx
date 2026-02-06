/**
 * TimerDisplay - Enhanced timer display component
 * 
 * Uses RefinedTimerDisplay for the UI.
 */

import React, { useMemo } from 'react';
import { useRuntimeContext } from '../../runtime/context/RuntimeContext';
import { useMemorySubscription } from '../../runtime/hooks/useMemorySubscription';
import { TypedMemoryReference } from '../../runtime/contracts/IMemoryReference';
import { RuntimeControls } from '../../runtime/models/MemoryModels';
import { ActionDescriptor } from '../../runtime/actions/stack/ActionStackActions';
import { MemoryTypeEnum } from '../../runtime/models/MemoryTypeEnum';
import {
  useTimerStack,
  useCardStack
} from '../../clock/hooks/useDisplayStack';
import { searchStackMemory } from '../../runtime/utils/MemoryUtils';

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
    const refs = searchStackMemory(runtime, {
      type: 'runtime-controls',
      ownerId: null
    });
    // Use the last one (most recently created/pushed) as it likely corresponds to the active block
    return refs.length > 0 ? (refs[refs.length - 1] as TypedMemoryReference<RuntimeControls>) : undefined;
  }, [runtime]);

  const controls = useMemorySubscription(controlsRef);

  // Subscribe to action stack (visible actions)
  const actionStateRef = useMemo(() => {
    const refs = searchStackMemory(runtime, {
      type: MemoryTypeEnum.ACTION_STACK_STATE,
      ownerId: 'runtime'
    });
    return refs.length > 0 ? (refs[refs.length - 1] as TypedMemoryReference<{ visible: ActionDescriptor[] }>) : undefined;
  }, [runtime]);

  const actionState = useMemorySubscription(actionStateRef);

  // Subscribe to primary-clock registry
  const primaryClockRef = useMemo(() => {
    const refs = searchStackMemory(runtime, {
      type: 'registry',
      id: 'primary-clock'
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
    const map = new Map<string, { elapsed: number; duration?: number; format: 'down' | 'up' }>();

    timerStack.forEach(t => {
      // Calculate elapsed time based on timer state
      const { accumulatedMs = 0, startTime, isRunning } = t;
      let elapsed = accumulatedMs;

      // If this timer matches the currently active primary timer, use the LIVE elapsedMs prop
      // This ensures smooth 60fps animation for the active block.
      if (primaryTimer && t.id === primaryTimer.id) {
        elapsed = props.elapsedMs;
      } else if (isRunning && startTime !== undefined) {
        // For other running timers (parents), calculate live time
        // Note: This assumes the component re-renders frequently (driven by primary timer updates)
        elapsed += Math.max(0, Date.now() - startTime);
      }

      map.set(t.ownerId, {
        elapsed,
        duration: t.durationMs,
        format: t.format
      });
    });

    return map;
  }, [timerStack, primaryTimer, props.elapsedMs]);


  // Calculate stack items for display from runtime stack blocks
  const stackItems = useMemo(() => {
    if (!runtime) return undefined;

    // Get blocks from the runtime stack
    const blocks = runtime.stack.blocks;
    if (!blocks || blocks.length === 0) return undefined;

    const items: IDisplayItem[] = [];

    // Convert stack blocks to display items
    blocks.forEach((block, index) => {
      // Skip root/workout container blocks without meaningful labels
      if (block.blockType === 'Root' && !block.label) return;

      const isLeaf = index === blocks.length - 1;

      // Flatten fragments from block (fragments is ICodeFragment[][])
      const fragments = block.fragments?.flat() || [];

      const item: IDisplayItem = {
        id: block.key.toString(),
        parentId: index > 0 ? blocks[index - 1].key.toString() : null,
        fragments: fragments,
        depth: index, // Use index as depth for stack visualization
        isHeader: false,
        status: isLeaf ? 'active' : 'pending', // Leaf is active, parents are pending (still on stack)
        sourceType: 'block',
        sourceId: block.key.toString(),
        label: block.label
      };

      items.push(item);
    });

    return items.length > 0 ? items : undefined;
  }, [runtime, runtime?.stack.blocks, timerStack]);

  return (
    <RefinedTimerDisplay
      elapsedMs={props.elapsedMs}
      hasActiveBlock={props.hasActiveBlock}
      onStart={props.onStart}
      onPause={props.onPause}
      onStop={props.onStop}
      onNext={props.onNext}
      actions={actionState?.visible}
      onAction={(eventName, payload) => {
        runtime.handle({ name: eventName, timestamp: new Date(), data: payload });
        if (eventName === 'next') {
          props.onNext?.();
        }
      }}
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
