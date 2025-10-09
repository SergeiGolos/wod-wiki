import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { RuntimeProvider } from '../../../src/runtime/context/RuntimeContext';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../../../src/runtime/RuntimeBlock';
import { TimerBehavior, TIMER_MEMORY_TYPES, TimeSpan } from '../../../src/runtime/behaviors/TimerBehavior';
import { TypedMemoryReference } from '../../../src/runtime/IMemoryReference';
import { JitCompiler } from '../../../src/runtime/JitCompiler';
import { WodScript } from '../../../src/WodScript';
import { ClockAnchor } from '../../anchors/ClockAnchor';

export interface EnhancedTimerHarnessResult {
  runtime: ScriptRuntime;
  blockKey: string;
  block: RuntimeBlock;
  memoryRefs: {
    timeSpans: TypedMemoryReference<TimeSpan[]>;
    isRunning: TypedMemoryReference<boolean>;
  };
  controls: {
    start: () => void;
    stop: () => void;
    reset: () => void;
    pause: () => void;
    resume: () => void;
  };
  isRunning: boolean;
  recalculateElapsed: () => void;
}

export interface EnhancedTimerHarnessProps {
  /** Timer type: 'countdown' or 'countup' */
  timerType: 'countdown' | 'countup';
  /** Initial duration in milliseconds */
  durationMs: number;
  /** Whether the timer should start running immediately */
  autoStart?: boolean;
  /** Optional: Pre-configured time spans for complex scenarios */
  timeSpans?: TimeSpan[];
  /** Children to render with runtime context */
  children: (harness: EnhancedTimerHarnessResult) => React.ReactNode;
}

/**
 * Enhanced Timer Test Harness with memory visualization and controls
 *
 * Provides a complete runtime environment with:
 * - Timer display (clock anchor)
 * - Memory card with start/stop table
 * - Timer control buttons (start/stop/pause/resume/reset)
 * - Recalculate elapsed time functionality
 */
export const EnhancedTimerHarness: React.FC<EnhancedTimerHarnessProps> = ({
  timerType,
  durationMs,
  autoStart = false,
  timeSpans,
  children
}) => {
  const [recalcTrigger, setRecalcTrigger] = useState(0);

  // Create minimal runtime with empty script for testing
  const runtime = useMemo(() => {
    const emptyScript = new WodScript('', []);
    const jitCompiler = new JitCompiler([]);
    return new ScriptRuntime(emptyScript, jitCompiler);
  }, []);

  // Create block, push it, and set memory all in one useMemo
  const { block, blockKey, memoryRefs, behavior } = useMemo(() => {
    console.log('[EnhancedTimerHarness] Creating and initializing block');

    const timerBehavior = new TimerBehavior();
    const newBlock = new RuntimeBlock(runtime, [1], [timerBehavior], 'Timer');

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

    console.log('[EnhancedTimerHarness] Found memory refs:', {
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
      } else if (autoStart) {
        // Running timer: start time in the past, no stop time
        spans = [{
          start: new Date(Date.now() - durationMs),
          stop: undefined
        }];
      } else {
        // Stopped timer: start and stop time
        spans = [{
          start: new Date(Date.now() - durationMs),
          stop: new Date()
        }];
      }

      console.log('[EnhancedTimerHarness] Setting timer state:', {
        timerType,
        durationMs,
        autoStart,
        spans
      });

      timeSpansRef.set(spans);
      isRunningRef.set(autoStart);
    } else {
      console.error('[EnhancedTimerHarness] Could not find timer memory references!');
      throw new Error('Failed to find timer memory references - TimerBehavior may not have initialized properly');
    }

    return {
      block: newBlock,
      blockKey: newBlock.key.toString(),
      memoryRefs: {
        timeSpans: timeSpansRef!,
        isRunning: isRunningRef!
      },
      behavior: timerBehavior
    };
  }, [runtime, timerType, durationMs, autoStart, timeSpans]);

  // Subscribe to running state
  const isRunning = useMemo(() => {
    return memoryRefs.isRunning.get();
  }, [memoryRefs.isRunning, recalcTrigger]);

  // Control functions
  const handleStart = useCallback(() => {
    console.log('[EnhancedTimerHarness] Starting timer');
    behavior.start();
    setRecalcTrigger(prev => prev + 1);
  }, [behavior]);

  const handleStop = useCallback(() => {
    console.log('[EnhancedTimerHarness] Stopping timer');
    behavior.stop();
    setRecalcTrigger(prev => prev + 1);
  }, [behavior]);

  const handlePause = useCallback(() => {
    console.log('[EnhancedTimerHarness] Pausing timer');
    behavior.pause();
    setRecalcTrigger(prev => prev + 1);
  }, [behavior]);

  const handleResume = useCallback(() => {
    console.log('[EnhancedTimerHarness] Resuming timer');
    behavior.resume();
    setRecalcTrigger(prev => prev + 1);
  }, [behavior]);

  const handleReset = useCallback(() => {
    console.log('[EnhancedTimerHarness] Resetting timer');
    behavior.reset();

    // Reset memory based on timer type
    if (timerType === 'countdown') {
      // For countdown, set up initial duration
      const spans = [{
        start: new Date(),
        stop: undefined
      }];
      memoryRefs.timeSpans.set(spans);
      memoryRefs.isRunning.set(false);
    } else {
      // For count up, reset to zero
      memoryRefs.timeSpans.set([]);
      memoryRefs.isRunning.set(false);
    }

    setRecalcTrigger(prev => prev + 1);
  }, [behavior, timerType, memoryRefs]);

  const recalculateElapsed = useCallback(() => {
    console.log('[EnhancedTimerHarness] Recalculating elapsed time');
    setRecalcTrigger(prev => prev + 1);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[EnhancedTimerHarness] Cleaning up block:', blockKey);
      block.dispose();
    };
  }, [block, blockKey]);

  const harness: EnhancedTimerHarnessResult = {
    runtime,
    blockKey,
    block,
    memoryRefs,
    controls: {
      start: handleStart,
      stop: handleStop,
      pause: handlePause,
      resume: handleResume,
      reset: handleReset
    },
    isRunning,
    recalculateElapsed
  };

  return (
    <RuntimeProvider runtime={runtime}>
      <div className="enhanced-timer-harness">
        {children(harness)}
      </div>
    </RuntimeProvider>
  );
};

/**
 * Memory Card Component with start/stop table and recalculate functionality
 */
interface MemoryCardProps {
  timeSpans: TimeSpan[];
  isRunning: boolean;
  blockKey: string;
  onRecalculate: () => void;
  timerType: 'countdown' | 'countup';
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  timeSpans,
  isRunning,
  blockKey,
  onRecalculate,
  timerType
}) => {
  const formatTimestamp = (date?: Date): string => {
    if (!date) return 'running';
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateElapsed = (): number => {
    if (timeSpans.length === 0) return 0;

    return timeSpans.reduce((total, span) => {
      if (!span.start) return total;
      const stop = span.stop || new Date();
      return total + (stop.getTime() - span.start.getTime());
    }, 0);
  };

  const formatElapsedTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const elapsedMs = calculateElapsed();
  const elapsedDisplay = timerType === 'countdown'
    ? `-${formatElapsedTime(elapsedMs)}`
    : formatElapsedTime(elapsedMs);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      {/* Header with recalculate button */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Memory Card</h3>
          <p className="text-sm text-gray-500">Block Key: {blockKey}</p>
        </div>
        <button
          onClick={onRecalculate}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
        >
          Recalculate Elapsed
        </button>
      </div>

      {/* Current State Display */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Status</div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="font-medium">
              {isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Elapsed Time</div>
          <div className="font-mono font-medium mt-1">
            {elapsedDisplay}
          </div>
        </div>
      </div>

      {/* Start/Stop Table */}
      <div>
        <h4 className="text-md font-semibold text-gray-700 mb-3">Time Spans</h4>
        {timeSpans.length === 0 ? (
          <div className="text-gray-500 italic text-sm">No time spans recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-700">#</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Start</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Stop</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Duration</th>
                </tr>
              </thead>
              <tbody>
                {timeSpans.map((span, index) => {
                  const duration = span.start
                    ? span.stop
                      ? Math.round((span.stop.getTime() - span.start.getTime()) / 1000)
                      : Math.round((Date.now() - span.start.getTime()) / 1000)
                    : 0;

                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-2 font-medium">{index + 1}</td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {formatTimestamp(span.start)}
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {formatTimestamp(span.stop)}
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {duration}s
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Timer Controls Component
 */
interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  onStart,
  onStop,
  onPause,
  onResume,
  onReset
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Timer Controls</h3>

      <div className="grid grid-cols-2 gap-3">
        {isRunning ? (
          <>
            <button
              onClick={onPause}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              Pause
            </button>
            <button
              onClick={onStop}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Stop
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStart}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Start
            </button>
            <button
              onClick={onResume}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Resume
            </button>
          </>
        )}

        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors col-span-2"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Status: <span className="font-medium">{isRunning ? 'Running' : 'Stopped'}</span>
      </div>
    </div>
  );
};