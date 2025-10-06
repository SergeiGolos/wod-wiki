import React, { useEffect, useMemo } from 'react';
import { RuntimeProvider } from '../../../src/runtime/context/RuntimeContext';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../../../src/runtime/RuntimeBlock';
import { TimerBehavior, TIMER_MEMORY_TYPES, TimeSpan } from '../../../src/runtime/behaviors/TimerBehavior';
import { TypedMemoryReference } from '../../../src/runtime/IMemoryReference';
import { JitCompiler } from '../../../src/runtime/JitCompiler';
import { WodScript } from '../../../src/WodScript';

export interface ClockMemoryHarnessResult {
  runtime: ScriptRuntime;
  blockKey: string;
  block: RuntimeBlock;
  memoryRefs: {
    timeSpans: TypedMemoryReference<TimeSpan[]>;
    isRunning: TypedMemoryReference<boolean>;
  };
}

// Legacy alias for backward compatibility
export interface TimerTestHarness extends ClockMemoryHarnessResult {}

export interface TimerTestHarnessProps {
  /** Total elapsed time in milliseconds */
  durationMs: number;
  /** Whether the timer is currently running */
  isRunning?: boolean;
  /** Optional: Multiple time spans for pause/resume scenarios */
  timeSpans?: TimeSpan[];
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
  const { block, blockKey, memoryRefs } = useMemo(() => {
    console.log('[TimerTestHarness] Creating and initializing block');

    const behavior = new TimerBehavior();
    const newBlock = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

    // Push block immediately to trigger behavior initialization
    newBlock.push();

    // Find timer memory references
    const timeSpansRefs = runtime.memory.search({
      id: null,
      ownerId: newBlock.key.toString(),
      type: TIMER_MEMORY_TYPES.TIME_SPANS,
      visibility: null
    });

    const isRunningRefs = runtime.memory.search({
      id: null,
      ownerId: newBlock.key.toString(),
      type: TIMER_MEMORY_TYPES.IS_RUNNING,
      visibility: null
    });

    console.log('[TimerTestHarness] Found memory refs:', {
      blockKey: newBlock.key.toString(),
      timeSpansRefs: timeSpansRefs.length,
      isRunningRefs: isRunningRefs.length
    });

    let timeSpansRef: TypedMemoryReference<TimeSpan[]> | undefined;
    let isRunningRef: TypedMemoryReference<boolean> | undefined;

    if (timeSpansRefs.length > 0 && isRunningRefs.length > 0) {
      timeSpansRef = timeSpansRefs[0] as TypedMemoryReference<TimeSpan[]>;
      isRunningRef = isRunningRefs[0] as TypedMemoryReference<boolean>;

      // Set timer state based on props
      let spans: TimeSpan[];

      if (timeSpans) {
        // Use provided time spans (for complex scenarios)
        spans = timeSpans;
      } else if (isRunning) {
        // Running timer: start time in the past, no stop time
        spans = [{
          start: new Date(Date.now() - durationMs),
          stop: undefined
        }];
      } else {
        // Completed timer: start and stop time
        spans = [{
          start: new Date(Date.now() - durationMs),
          stop: new Date()
        }];
      }

      console.log('[TimerTestHarness] Setting timer state:', {
        durationMs,
        isRunning,
        spans
      });

      timeSpansRef.set(spans);
      isRunningRef.set(isRunning);

      console.log('[TimerTestHarness] Timer state set. Values:', {
        timeSpans: timeSpansRef.get(),
        isRunning: isRunningRef.get()
      });
    } else {
      console.error('[TimerTestHarness] Could not find timer memory references!');
      // This should not happen with proper TimerBehavior initialization
      // But we need to provide valid references for TypeScript
      throw new Error('Failed to find timer memory references - TimerBehavior may not have initialized properly');
    }

    // Return memory references for consumers to use
    const memoryRefsResult: {
      timeSpans: TypedMemoryReference<TimeSpan[]>;
      isRunning: TypedMemoryReference<boolean>;
    } = {
      timeSpans: timeSpansRef!,
      isRunning: isRunningRef!
    };

    return {
      block: newBlock,
      blockKey: newBlock.key.toString(),
      memoryRefs: memoryRefsResult
    };
  }, [runtime, durationMs, isRunning, timeSpans]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[TimerTestHarness] Cleaning up block:', blockKey);
      block.dispose();
    };
  }, [block, blockKey]);

  const harness: ClockMemoryHarnessResult = {
    runtime,
    blockKey,
    block,
    memoryRefs
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
): TimeSpan[] {
  const spans: TimeSpan[] = [];
  let currentTime = Date.now();

  // Build spans backward from current time
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    
    if (segment.isPause) {
      // Pause = gap in time (no span)
      currentTime -= segment.durationMs;
    } else {
      // Active segment = span with start and stop
      const stop = new Date(currentTime);
      const start = new Date(currentTime - segment.durationMs);
      spans.unshift({ start, stop });
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
): TimeSpan[] {
  // Get completed spans
  const spans = createPausedTimeSpans(completedSegments);
  
  // Add current running span
  spans.push({
    start: new Date(Date.now() - currentSegmentDurationMs),
    stop: undefined
  });

  return spans;
}
