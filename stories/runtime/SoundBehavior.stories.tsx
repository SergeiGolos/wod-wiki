/**
 * SoundBehavior Storybook Story
 * 
 * Demonstrates the SoundBehavior that triggers audio cues at specific time thresholds.
 * This story provides a visual representation of sound cue triggering and allows
 * interactive testing of the behavior.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SoundBehavior, SOUND_MEMORY_TYPE } from '../../src/runtime/behaviors/SoundBehavior';
import { SoundBehaviorConfig, SoundCue, PREDEFINED_SOUNDS } from '../../src/runtime/models/SoundModels';
import { TimerBehavior } from '../../src/runtime/behaviors/TimerBehavior';
import { RuntimeBlock } from '../../src/runtime/RuntimeBlock';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { WodScript } from '../../src/parser/WodScript';
import { JitCompiler } from '../../src/runtime/JitCompiler';

interface SoundBehaviorDemoProps {
  /** Timer duration in seconds */
  durationSeconds: number;
  /** Sound cues configuration */
  cues: Array<{
    id: string;
    thresholdSeconds: number;
    sound: string;
    volume?: number;
  }>;
  /** Timer direction */
  direction: 'up' | 'down';
}

/**
 * Demo component that visualizes SoundBehavior with timer integration.
 */
const SoundBehaviorDemo: React.FC<SoundBehaviorDemoProps> = ({
  durationSeconds,
  cues,
  direction
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [triggeredCues, setTriggeredCues] = useState<Set<string>>(new Set());
  const [soundEvents, setSoundEvents] = useState<Array<{ time: Date; cueId: string; sound: string }>>([]);
  const runtimeRef = useRef<ScriptRuntime | null>(null);
  const blockRef = useRef<RuntimeBlock | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const durationMs = durationSeconds * 1000;

  // Convert cue config to SoundBehavior config
  const soundConfig: SoundBehaviorConfig = {
    direction,
    durationMs: direction === 'down' ? durationMs : undefined,
    cues: cues.map(c => ({
      id: c.id,
      threshold: c.thresholdSeconds * 1000,
      sound: c.sound,
      volume: c.volume
    }))
  };

  // Initialize runtime and block
  useEffect(() => {
    const script = new WodScript('sound-demo', []);
    const compiler = new JitCompiler([]);
    const runtime = new ScriptRuntime(script, compiler);
    runtimeRef.current = runtime;

    // Initialize Web Audio API (with Safari fallback)
    const AudioContextClass = window.AudioContext || 
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play a beep sound using Web Audio API
  const playBeep = useCallback((frequency: number = 440, duration: number = 200, volume: number = 0.5) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = volume;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    oscillator.stop(ctx.currentTime + duration / 1000);
  }, []);

  // Handle sound:play events
  useEffect(() => {
    if (!runtimeRef.current) return;

    const originalHandle = runtimeRef.current.handle.bind(runtimeRef.current);
    runtimeRef.current.handle = (event) => {
      originalHandle(event);
      
      if (event.name === 'sound:play') {
        const { sound, volume, cueId } = event.data || {};
        
        // Add to sound events log
        setSoundEvents(prev => [...prev, {
          time: new Date(),
          cueId: cueId || 'unknown',
          sound: sound || 'unknown'
        }]);
        
        // Mark cue as triggered
        if (cueId) {
          setTriggeredCues(prev => new Set([...prev, cueId]));
        }
        
        // Play actual sound
        const freq = sound === PREDEFINED_SOUNDS.BUZZER ? 220 :
                     sound === PREDEFINED_SOUNDS.CHIME ? 880 :
                     sound === PREDEFINED_SOUNDS.TICK ? 1000 : 440;
        const dur = sound === PREDEFINED_SOUNDS.BUZZER ? 500 : 150;
        playBeep(freq, dur, volume || 0.5);
      }
    };
  }, [playBeep]);

  // Start the timer
  const handleStart = useCallback(() => {
    if (!runtimeRef.current || isRunning) return;

    // Reset state
    setElapsedMs(0);
    setTriggeredCues(new Set());
    setSoundEvents([]);

    // Create behaviors
    const timerBehavior = new TimerBehavior(direction, direction === 'down' ? durationMs : undefined, 'Demo Timer');
    const soundBehavior = new SoundBehavior(soundConfig);

    // Create and mount block
    const block = new RuntimeBlock(
      runtimeRef.current,
      [1],
      [timerBehavior, soundBehavior],
      'Timer'
    );
    blockRef.current = block;

    // Mount block and execute actions
    const actions = block.mount(runtimeRef.current);
    for (const action of actions) {
      action.do(runtimeRef.current!);
    }

    setIsRunning(true);

    // Start tick interval
    const startTime = performance.now();
    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = now - startTime;
      const remaining = durationMs - elapsed;

      setElapsedMs(elapsed);

      // Emit timer:tick event
      if (runtimeRef.current && blockRef.current) {
        runtimeRef.current.handle({
          name: 'timer:tick',
          timestamp: new Date(),
          data: {
            blockId: blockRef.current.key.toString(),
            elapsedMs: elapsed,
            remainingMs: remaining,
            direction
          }
        });
      }

      // Stop when timer completes (for countdown) or after double duration (for count-up)
      if ((direction === 'down' && elapsed >= durationMs) ||
          (direction === 'up' && elapsed >= durationMs * 2)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRunning(false);
      }
    }, 100);
  }, [isRunning, direction, durationMs, soundConfig, playBeep]);

  // Stop the timer
  const handleStop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    handleStop();
    setElapsedMs(0);
    setTriggeredCues(new Set());
    setSoundEvents([]);
  }, [handleStop]);

  // Format time for display
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  };

  const displayTime = direction === 'down' 
    ? Math.max(0, durationMs - elapsedMs)
    : elapsedMs;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">SoundBehavior Demo</h1>
        <p className="text-gray-600 mt-2">
          This demo shows how SoundBehavior triggers audio cues at specific time thresholds.
        </p>
      </div>

      {/* Timer Display */}
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <div className="text-6xl font-mono text-white">
          {formatTime(displayTime)}
        </div>
        <div className="text-gray-400 mt-2">
          {direction === 'down' ? 'Countdown' : 'Count Up'} | Duration: {durationSeconds}s
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={handleStart}
          disabled={isRunning}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Stop
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Reset
        </button>
      </div>

      {/* Sound Cues Visualization */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-4">Sound Cues</h2>
        <div className="space-y-2">
          {cues.map(cue => {
            const thresholdMs = cue.thresholdSeconds * 1000;
            const isTriggered = triggeredCues.has(cue.id);
            const progress = direction === 'down'
              ? Math.min(100, Math.max(0, ((durationMs - thresholdMs - (durationMs - elapsedMs)) / (durationMs - thresholdMs)) * 100))
              : Math.min(100, (elapsedMs / thresholdMs) * 100);
            
            return (
              <div key={cue.id} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-600">
                  {cue.thresholdSeconds}s
                </div>
                <div className="flex-1 relative">
                  <div className="h-8 bg-gray-200 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        isTriggered ? 'bg-green-500' : 'bg-blue-400'
                      }`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-sm">
                  {cue.sound}
                </div>
                <div className={`w-6 h-6 rounded-full ${
                  isTriggered ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {isTriggered && (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sound Events Log */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-4">Sound Events Log</h2>
        <div className="max-h-48 overflow-y-auto">
          {soundEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No sounds triggered yet. Start the timer!</p>
          ) : (
            <div className="space-y-1">
              {soundEvents.map((event, index) => (
                <div key={index} className="flex items-center gap-4 text-sm py-1 border-b last:border-b-0">
                  <span className="text-gray-500 font-mono">
                    {event.time.toLocaleTimeString()}
                  </span>
                  <span className="font-medium text-blue-600">
                    {event.cueId}
                  </span>
                  <span className="text-gray-600">
                    played "{event.sound}"
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Storybook Meta
const meta: Meta<typeof SoundBehaviorDemo> = {
  title: 'Runtime/SoundBehavior',
  component: SoundBehaviorDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# SoundBehavior

The **SoundBehavior** triggers audio cues at specific time thresholds during timer execution.

## Features

- **Countdown Timers**: Triggers sounds when remaining time falls below threshold
- **Count-up Timers**: Triggers sounds when elapsed time exceeds threshold  
- **Multiple Cues**: Configure multiple sounds at different time points
- **Deduplication**: Each cue triggers only once per timer lifecycle
- **Volume Control**: Per-cue volume configuration

## Usage

\`\`\`typescript
const soundBehavior = new SoundBehavior({
  direction: 'down',
  durationMs: 60000, // 1 minute
  cues: [
    { id: '30-sec', threshold: 30000, sound: 'beep' },
    { id: '10-sec', threshold: 10000, sound: 'beep' },
    { id: 'complete', threshold: 0, sound: 'buzzer' }
  ]
});
\`\`\`

## Predefined Sounds

- \`beep\` - Short single beep (440Hz)
- \`buzzer\` - Long buzz (220Hz) 
- \`chime\` - Pleasant chime (880Hz)
- \`tick\` - Clock tick (1000Hz)
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof SoundBehaviorDemo>;

// ==================== STORIES ====================

/**
 * Countdown timer with warning sounds at 30s, 10s, 3-2-1, and completion.
 */
export const CountdownWithWarnings: Story = {
  args: {
    durationSeconds: 60,
    direction: 'down',
    cues: [
      { id: '30-sec-warning', thresholdSeconds: 30, sound: 'chime' },
      { id: '10-sec-warning', thresholdSeconds: 10, sound: 'beep' },
      { id: '3-sec', thresholdSeconds: 3, sound: 'tick' },
      { id: '2-sec', thresholdSeconds: 2, sound: 'tick' },
      { id: '1-sec', thresholdSeconds: 1, sound: 'tick' },
      { id: 'complete', thresholdSeconds: 0, sound: 'buzzer' }
    ]
  }
};

/**
 * Short 10-second countdown with simple beep at 5s and buzzer at end.
 */
export const Quick10SecondCountdown: Story = {
  args: {
    durationSeconds: 10,
    direction: 'down',
    cues: [
      { id: '5-sec', thresholdSeconds: 5, sound: 'beep' },
      { id: '3-sec', thresholdSeconds: 3, sound: 'tick' },
      { id: '2-sec', thresholdSeconds: 2, sound: 'tick' },
      { id: '1-sec', thresholdSeconds: 1, sound: 'tick' },
      { id: 'complete', thresholdSeconds: 0, sound: 'buzzer' }
    ]
  }
};

/**
 * Count-up timer with milestone sounds every 15 seconds.
 */
export const CountUpMilestones: Story = {
  args: {
    durationSeconds: 60,
    direction: 'up',
    cues: [
      { id: '15-sec', thresholdSeconds: 15, sound: 'chime' },
      { id: '30-sec', thresholdSeconds: 30, sound: 'chime' },
      { id: '45-sec', thresholdSeconds: 45, sound: 'chime' },
      { id: '60-sec', thresholdSeconds: 60, sound: 'buzzer' }
    ]
  }
};

/**
 * EMOM-style interval with 10-second warning and completion.
 */
export const EMOMInterval: Story = {
  args: {
    durationSeconds: 60,
    direction: 'down',
    cues: [
      { id: '10-sec-warning', thresholdSeconds: 10, sound: 'beep', volume: 0.5 },
      { id: 'complete', thresholdSeconds: 0, sound: 'buzzer', volume: 1.0 }
    ]
  }
};

/**
 * Minimal setup with just a completion sound.
 */
export const CompletionOnly: Story = {
  args: {
    durationSeconds: 15,
    direction: 'down',
    cues: [
      { id: 'complete', thresholdSeconds: 0, sound: 'buzzer' }
    ]
  }
};
