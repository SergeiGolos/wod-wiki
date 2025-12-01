import React, { useEffect, useMemo } from 'react';
import { RuntimeProvider } from '../../../src/runtime/context/RuntimeContext';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../../../src/runtime/RuntimeBlock';
import { TimerBehavior } from '../../../src/runtime/behaviors/TimerBehavior';
import { TypedMemoryReference } from '../../../src/runtime/IMemoryReference';
import { JitCompiler } from '../../../src/runtime/JitCompiler';
import { WodScript } from '../../../src/WodScript';
import { TimerState, TimerSpan } from '../../../src/runtime/models/MemoryModels';
import { MemoryTypeEnum } from '../../../src/runtime/MemoryTypeEnum';

export interface ClockMemoryHarnessResult {
  runtime: ScriptRuntime;
  blockKey: string;
  block: RuntimeBlock;
  timerStateRef: TypedMemoryReference<TimerState> | undefined;
}

// Legacy alias for backward compatibility
export interface TimerTestHarness extends ClockMemoryHarnessResult {}

export interface TimerTestHarnessProps {
  /** Total elapsed time in milliseconds */
  durationMs: number;
  /** Whether the timer is currently running */
  isRunning?: boolean;
  /** Optional: Multiple time spans for pause/resume scenarios */
  timeSpans?: TimerSpan[];
  /** Children to render with runtime context */
  children: (harness: ClockMemoryHarnessResult) => React.ReactNode;
}

/**
 * Test harness component for clock stories.
 * 
 * Creates a complete runtime environment with timer memory references
 * pre-configured for testing clock displays.
 * 
 * @example
 * ```tsx
 * <TimerTestHarness durationMs={185000}>
 *   {({ blockKey }) => <ClockAnchor blockKey={blockKey} />}
 * </TimerTestHarness>
 * ```
 */
export const TimerTestHarness: React.FC<TimerTestHarnessProps> = ({
  durationMs,
  isRunning = false,
  timeSpans,
  children
}) => {
  // Create minimal runtime with empty script for testing
  const runtime = useMemo(() => {
    const emptyScript = new WodScript('', []); // Empty script for testing
    const jitCompiler = new JitCompiler([]);
    return new ScriptRuntime(emptyScript, jitCompiler);
  }, []);
  
  // Create block, push it, and set memory all in one useMemo
  // This ensures memory is initialized BEFORE the component renders
  const { block, blockKey, timerStateRef } = useMemo(() => {
    console.log('[TimerTestHarness] Creating and initializing block');

    const behavior = new TimerBehavior('up', durationMs, 'Timer');
    const newBlock = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

    // Mount block immediately to trigger behavior initialization
    newBlock.mount(runtime);

    // Find unified TimerState reference using the new memory model
    // The 'type' field in memory allocation is `timer:${blockId}`
    const timerStateRefs = runtime.memory.search({
      id: null,
      ownerId: newBlock.key.toString(),
      type: `${MemoryTypeEnum.TIMER_PREFIX}${newBlock.key.toString()}`,
      visibility: null
    });

    console.log('[TimerTestHarness] Found timer state refs:', {
      blockKey: newBlock.key.toString(),
      timerStateRefs: timerStateRefs.length
    });

    let timerRef: TypedMemoryReference<TimerState> | undefined;

    if (timerStateRefs.length > 0) {
      timerRef = timerStateRefs[0] as TypedMemoryReference<TimerState>;
      const currentState = timerRef.get();

      if (currentState) {
        // Set timer state based on props
        let spans: TimerSpan[];

        if (timeSpans) {
          // Use provided time spans (for complex scenarios)
          spans = timeSpans;
        } else if (isRunning) {
          // Running timer: start time in the past, no stop time
          spans = [{
            start: Date.now() - durationMs,
            stop: undefined,
            state: 'new'
          }];
        } else {
          // Completed timer: start and stop time
          spans = [{
            start: Date.now() - durationMs,
            stop: Date.now(),
            state: 'new'
          }];
        }

        console.log('[TimerTestHarness] Setting timer state:', {
          durationMs,
          isRunning,
          spans
        });

        timerRef.set({
          ...currentState,
          spans,
          isRunning
        });

        console.log('[TimerTestHarness] Timer state set. Values:', {
          spans: timerRef.get()?.spans,
          isRunning: timerRef.get()?.isRunning
        });
      }
    } else {
      console.warn('[TimerTestHarness] Could not find timer state reference - timer may not display correctly');
    }

    return {
      block: newBlock,
      blockKey: newBlock.key.toString(),
      timerStateRef: timerRef
    };
  }, [runtime, durationMs, isRunning, timeSpans]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[TimerTestHarness] Cleaning up block:', blockKey);
      block.dispose(runtime);
    };
  }, [block, blockKey, runtime]);

  const harness: ClockMemoryHarnessResult = {
    runtime,
    blockKey,
    block,
    timerStateRef
  };

  return (
    <RuntimeProvider runtime={runtime}>
      {children(harness)}
    </RuntimeProvider>
  );
};

/**
 * Creates time spans for pause/resume scenarios.
 * 
 * @example
 * ```tsx
 * const spans = createPausedTimeSpans([
 *   { durationMs: 60000 },  // 1 min active
 *   { durationMs: 30000 },  // 30 sec pause
 *   { durationMs: 45000 }   // 45 sec active
 * ]);
 * ```
 */
export function createPausedTimeSpans(
  segments: Array<{ durationMs: number; isPause?: boolean }>
): TimerSpan[] {
  const spans: TimerSpan[] = [];
  let currentTime = Date.now();

  // Build spans backward from current time
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    
    if (segment.isPause) {
      // Pause = gap in time (no span)
      currentTime -= segment.durationMs;
    } else {
      // Active segment = span with start and stop
      const stop = currentTime;
      const start = currentTime - segment.durationMs;
      spans.unshift({ start, stop, state: 'new' });
      currentTime -= segment.durationMs;
    }
  }

  return spans;
}

/**
 * Creates time spans for a running timer with pause history.
 */
export function createRunningTimeSpans(
  completedSegments: Array<{ durationMs: number; isPause?: boolean }>,
  currentSegmentDurationMs: number
): TimerSpan[] {
  // Get completed spans
  const spans = createPausedTimeSpans(completedSegments);
  
  // Add current running span
  spans.push({
    start: Date.now() - currentSegmentDurationMs,
    stop: undefined,
    state: 'new'
  });

  return spans;
}
