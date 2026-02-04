import React, { useEffect, useMemo } from 'react';
import { RuntimeProvider } from '../../../src/runtime/context/RuntimeContext';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../../../src/runtime/RuntimeBlock';
import { TimerInitBehavior, TimerTickBehavior } from '../../../src/runtime/behaviors';
import { JitCompiler } from '../../../src/runtime/compiler/JitCompiler';
import { WodScript } from '../../../src/parser/WodScript';
import { TimerState } from '../../../src/runtime/memory/MemoryTypes';
import { TimeSpan } from '../../../src/runtime/models/TimeSpan';
import { IRuntimeBlock } from '../../../src/runtime/contracts/IRuntimeBlock';
import { RuntimeStack } from '../../../src/runtime/RuntimeStack';
import { RuntimeClock } from '../../../src/runtime/RuntimeClock';
import { EventBus } from '../../../src/runtime/events/EventBus';

/**
 * Creates a minimal ScriptRuntime for testing purposes.
 * Provides all required dependencies (stack, clock, eventBus).
 * Note: Memory is now owned by blocks, not the runtime.
 */
export function createTestRuntime(): ScriptRuntime {
  const emptyScript = new WodScript('', []);
  const jitCompiler = new JitCompiler([]);
  const dependencies = {
    stack: new RuntimeStack(),
    clock: new RuntimeClock(),
    eventBus: new EventBus()
  };
  return new ScriptRuntime(emptyScript, jitCompiler, dependencies);
}

export interface ClockMemoryHarnessResult {
  runtime: ScriptRuntime;
  blockKey: string;
  block: IRuntimeBlock;
  timerState: TimerState | undefined;
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
 * pre-configured for testing clock displays. Uses the new behavior-based
 * memory system with TimerInitBehavior and TimerTickBehavior.
 * 
 * @example
 * ```tsx
 * <TimerTestHarness durationMs={185000}>
 *   {({ blockKey, block }) => <ClockAnchor blockKey={blockKey} />}
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
    return createTestRuntime();
  }, []);
  
  // Create block with new behavior-based timer system
  const { block, blockKey, timerState } = useMemo(() => {
    console.log('[TimerTestHarness] Creating block with new behavior system');

    // Use new aspect-based behaviors
    const behaviors = [
      new TimerInitBehavior({
        direction: 'up',
        durationMs: durationMs,
        label: 'Timer'
      }),
      new TimerTickBehavior()
    ];

    const newBlock = new RuntimeBlock(runtime, [1], behaviors, 'Timer');

    // Mount block to trigger behavior initialization
    newBlock.mount(runtime);

    // Get timer state from the block's typed memory
    const timerEntry = newBlock.getMemory('timer');
    let currentState = timerEntry?.value;

    console.log('[TimerTestHarness] Initial timer state:', {
      blockKey: newBlock.key.toString(),
      hasTimer: !!currentState
    });

    // Update timer state based on props
    if (currentState) {
      let spans: TimeSpan[];

      if (timeSpans) {
        // Use provided time spans (for complex scenarios)
        spans = timeSpans;
      } else if (isRunning) {
        // Running timer: start time in the past, no stop time
        spans = [new TimeSpan(Date.now() - durationMs)];
      } else {
        // Completed timer: start and stop time
        spans = [new TimeSpan(Date.now() - durationMs, Date.now())];
      }

      console.log('[TimerTestHarness] Setting timer spans:', {
        durationMs,
        isRunning,
        spansCount: spans.length
      });

      // Update timer state with configured spans
      newBlock.setMemoryValue('timer', {
        ...currentState,
        spans
      });

      // Refresh current state reference
      currentState = newBlock.getMemory('timer')?.value;

      console.log('[TimerTestHarness] Timer state configured:', {
        spans: currentState?.spans?.length,
        direction: currentState?.direction
      });
    } else {
      console.warn('[TimerTestHarness] Could not find timer state - behaviors may not have initialized');
    }

    return {
      block: newBlock,
      blockKey: newBlock.key.toString(),
      timerState: currentState
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
    timerState
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
      const ended = currentTime;
      const started = currentTime - segment.durationMs;
      spans.unshift(new TimeSpan(started, ended));
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
  
  // Add current running span (no end time = still running)
  spans.push(new TimeSpan(Date.now() - currentSegmentDurationMs));

  return spans;
}
