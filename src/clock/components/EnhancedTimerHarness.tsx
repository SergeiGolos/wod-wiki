import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { RuntimeProvider } from '../../runtime/context/RuntimeContext';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { RuntimeBlock } from '../../runtime/RuntimeBlock';
import { TimerInitBehavior, TimerTickBehavior, TimerPauseBehavior } from '../../runtime/behaviors';
import { JitCompiler } from '../../runtime/compiler/JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { TimeSpan } from '../../runtime/models/TimeSpan';
import { TimerState } from '../../runtime/memory/MemoryTypes';
import { IRuntimeBlock } from '../../runtime/contracts/IRuntimeBlock';
import { RuntimeMemory } from '../../runtime/RuntimeMemory';
import { RuntimeStack } from '../../runtime/RuntimeStack';
import { RuntimeClock } from '../../runtime/RuntimeClock';
import { EventBus } from '../../runtime/events/EventBus';

export interface EnhancedTimerHarnessResult {
  runtime: ScriptRuntime;
  blockKey: string;
  block: IRuntimeBlock;
  timerState: TimerState | undefined;
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
 * Uses the new behavior-based timer system with:
 * - TimerInitBehavior for state initialization
 * - TimerTickBehavior for time updates
 * - TimerPauseBehavior for pause/resume events
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

    // Create dependencies
    const memory = new RuntimeMemory();
    const stack = new RuntimeStack();
    const clock = new RuntimeClock();
    const eventBus = new EventBus();

    return new ScriptRuntime(emptyScript, jitCompiler, {
      memory,
      stack,
      clock,
      eventBus
    });
  }, []);

  // Create block with new behavior-based timer system
  const { block, blockKey, timerState } = useMemo(() => {
    const direction = timerType === 'countdown' ? 'down' : 'up';
    
    // Use new aspect-based behaviors
    const behaviors = [
      new TimerInitBehavior({
        direction,
        durationMs: timerType === 'countdown' ? durationMs : undefined,
        label: 'Timer'
      }),
      new TimerTickBehavior(),
      new TimerPauseBehavior()
    ];

    const newBlock = new RuntimeBlock(runtime, [1], behaviors, 'Timer');

    // Mount block to trigger behavior initialization
    newBlock.mount(runtime);

    // Get timer state from the block's typed memory
    const timerEntry = newBlock.getMemory('timer');
    let currentState = timerEntry?.value;

    // Configure timer state based on props
    if (currentState) {
      let spans: TimeSpan[];

      if (timeSpans) {
        // Use provided time spans (for complex scenarios)
        spans = timeSpans;
      } else if (autoStart) {
        // Running timer: start time in the past, no stop time
        spans = [new TimeSpan(Date.now() - durationMs)];
      } else {
        // Stopped timer: start and stop time
        const now = Date.now();
        spans = [new TimeSpan(now - durationMs, now)];
      }

      // Update timer state with configured spans
      newBlock.setMemoryValue('timer', {
        ...currentState,
        spans
      });

      // Refresh current state
      currentState = newBlock.getMemory('timer')?.value;
    }

    return {
      block: newBlock,
      blockKey: newBlock.key.toString(),
      timerState: currentState
    };
  }, [runtime, timerType, durationMs, autoStart, timeSpans]);

  // Determine if timer is running based on last span having no end time
  const isRunning = useMemo(() => {
    if (!timerState || timerState.spans.length === 0) return false;
    const lastSpan = timerState.spans[timerState.spans.length - 1];
    return lastSpan.ended === undefined;
  }, [timerState, recalcTrigger]);

  // Control functions using event-based approach
  const handleStart = useCallback(() => {
    // Start means resume if paused, or create new span
    runtime.eventBus.emit({
      name: 'timer:resume',
      timestamp: new Date(),
      data: { blockKey }
    }, runtime);
    setRecalcTrigger(prev => prev + 1);
  }, [runtime, blockKey]);

  const handleStop = useCallback(() => {
    // Stop means pause the timer
    runtime.eventBus.emit({
      name: 'timer:pause',
      timestamp: new Date(),
      data: { blockKey }
    }, runtime);
    setRecalcTrigger(prev => prev + 1);
  }, [runtime, blockKey]);

  const handlePause = useCallback(() => {
    runtime.eventBus.emit({
      name: 'timer:pause',
      timestamp: new Date(),
      data: { blockKey }
    }, runtime);
    setRecalcTrigger(prev => prev + 1);
  }, [runtime, blockKey]);

  const handleResume = useCallback(() => {
    runtime.eventBus.emit({
      name: 'timer:resume',
      timestamp: new Date(),
      data: { blockKey }
    }, runtime);
    setRecalcTrigger(prev => prev + 1);
  }, [runtime, blockKey]);

  const handleReset = useCallback(() => {
    // Reset clears all spans and starts fresh
    if (block.hasMemory('timer')) {
      const current = block.getMemory('timer')?.value;
      if (current) {
        block.setMemoryValue('timer', {
          ...current,
          spans: []
        });
      }
    }
    setRecalcTrigger(prev => prev + 1);
  }, [block]);

  const recalculateElapsed = useCallback(() => {
    setRecalcTrigger(prev => prev + 1);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      block.dispose(runtime);
    };
  }, [block, blockKey, runtime]);

  const harness: EnhancedTimerHarnessResult = {
    runtime,
    blockKey,
    block,
    timerState,
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
  const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return 'running';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateElapsed = (): number => {
    if (timeSpans.length === 0) return 0;

    return timeSpans.reduce((total, span) => {
      // span is TimeSpan class
      const end = span.ended || Date.now();
      return total + Math.max(0, end - span.started);
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
                  const duration = span.started
                    ? span.ended
                      ? Math.round((span.ended - span.started) / 1000)
                      : Math.round((Date.now() - span.started) / 1000)
                    : 0;

                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-2 font-medium">{index + 1}</td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {formatTimestamp(span.started)}
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {formatTimestamp(span.ended)}
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
