/**
 * Tracker-Chromecast Stories
 *
 * Showcases the Cast-receiver layout (`ReceiverStackPanel` + `ReceiverTimerPanel`)
 * using a real ScriptRuntime — the same components and hooks as the production
 * Chromecast receiver, but hydrated locally without a WebRTC transport.
 *
 * This lets you see the exact TV layout that a Cast receiver would display,
 * driven by the real stack state, without needing a Chromecast device.
 *
 * States illustrated:
 *  1. Idle          — no runtime, "waiting for cast" style placeholder
 *  2. Preview       — a note loaded but no runtime started (workout selection list)
 *  3. ReadyToStart  — WaitingToStart block on the stack
 *  4. ActiveFran    — 21-15-9 Thrusters & Pull-ups, first block active
 *  5. ActiveAmrap   — 20-minute AMRAP running
 *  6. ActiveEmom    — 10-minute EMOM running
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

// Runtime
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { RuntimeClock } from '@/runtime/RuntimeClock';
import { sharedParser } from '@/parser/parserInstance';
import { WodScript } from '@/parser/WodScript';

// Strategies
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '@/runtime/compiler/strategies/components/GenericGroupStrategy';
import { SoundStrategy } from '@/runtime/compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '@/runtime/compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

// Actions
import { StartSessionAction } from '@/runtime/actions/stack/StartSessionAction';
import { NextAction } from '@/runtime/actions/stack/NextAction';

// Runtime hooks — same ones used by ReceiverStackPanel / ReceiverTimerPanel
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { useSnapshotBlocks } from '@/runtime/hooks/useStackSnapshot';
import {
  usePrimaryTimer,
  useSecondaryTimers,
  useStackTimers,
} from '@/runtime/hooks/useStackDisplay';
import { useNextPreview } from '@/runtime/hooks/useNextPreview';
import { useOutputStatements } from '@/runtime/hooks/useOutputStatements';
import { MetricTrackerCard } from '@/components/track/MetricTrackerCard';
import { MetricSourceRow } from '@/components/metrics/MetricSourceRow';
import { TimerStackView } from '@/components/workout/TimerStackView';
import { calculateDuration } from '@/lib/timeUtils';
import { formatTimeMMSS } from '@/lib/formatTime';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, Timer, Dumbbell, Play } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildCompiler(): JitCompiler {
  const compiler = new JitCompiler();
  compiler.registerStrategy(new AmrapLogicStrategy());
  compiler.registerStrategy(new IntervalLogicStrategy());
  compiler.registerStrategy(new GenericTimerStrategy());
  compiler.registerStrategy(new GenericLoopStrategy());
  compiler.registerStrategy(new GenericGroupStrategy());
  compiler.registerStrategy(new SoundStrategy());
  compiler.registerStrategy(new ReportOutputStrategy());
  compiler.registerStrategy(new ChildrenStrategy());
  compiler.registerStrategy(new EffortFallbackStrategy());
  return compiler;
}

function buildRuntime(scriptText: string): ScriptRuntime {
  const script = sharedParser.read(scriptText) as WodScript;
  const compiler = buildCompiler();
  const clock = new RuntimeClock();
  const stack = new RuntimeStack();
  const eventBus = new EventBus();
  return new ScriptRuntime(script, compiler, { stack, clock, eventBus });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components — mirror the production ReceiverStackPanel / ReceiverTimerPanel
// but are self-contained so they can be used in Storybook independently.
// ─────────────────────────────────────────────────────────────────────────────

const CastStackPanel: React.FC<{ localNow: number }> = ({ localNow }) => {
  const blocks = useSnapshotBlocks();
  const nextPreview = useNextPreview();
  const allTimers = useStackTimers();
  const { outputs } = useOutputStatements();

  const blockTimerMap = useMemo(() => {
    const map = new Map<string, {
      elapsed: number;
      durationMs?: number;
      direction: 'up' | 'down';
      isRunning: boolean;
    }>();
    for (const entry of allTimers) {
      const key = entry.block.key.toString();
      map.set(key, {
        elapsed: calculateDuration(entry.timer.spans, localNow),
        durationMs: entry.timer.durationMs,
        direction: entry.timer.direction,
        isRunning: entry.timer.spans.some(s => s.ended === undefined),
      });
    }
    return map;
  }, [allTimers, localNow]);

  // Root→leaf order (stack is leaf→root)
  const orderedBlocks = useMemo(() => [...blocks].reverse(), [blocks]);

  const renderCompletionSummary = (childLevel: number) => {
    const levelOutputs = outputs.filter(
      o => o.stackLevel === childLevel && (o.outputType as string) === 'completion',
    );
    if (levelOutputs.length === 0) return null;

    const totalDuration = levelOutputs.reduce(
      (acc, curr) => acc + (curr.elapsed ?? curr.timeSpan.duration ?? 0), 0,
    );
    const formatDur = (ms: number) => {
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      return `${m}:${String(s % 60).padStart(2, '0')}`;
    };

    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground py-2 pl-4 border-l-2 border-muted ml-3 my-1 bg-muted/5 rounded-r-md">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="font-medium">{levelOutputs.length} Completed</span>
        </div>
        <div className="w-px h-3 bg-border/50" />
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono">{formatDur(totalDuration)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
      <div className="shrink-0">
        {orderedBlocks.length > 0 ? (
          <div className="flex flex-col gap-1 relative">
            {orderedBlocks.map((block, index) => {
              const blockKey = block.key.toString();
              const timer = blockTimerMap.get(blockKey);
              const isLeaf = index === orderedBlocks.length - 1;
              const displayLocs = block.getMetricMemoryByVisibility('display');
              const rows = displayLocs.map(loc => loc.metrics);
              const childLevel = index + 1;

              return (
                <React.Fragment key={blockKey}>
                  <div className={cn(
                    "relative w-full",
                    isLeaf ? "animate-in fade-in slide-in-from-left-1 duration-300" : ""
                  )}>
                    <div className={cn(
                      "rounded-md border text-sm transition-all",
                      isLeaf
                        ? "bg-card shadow-sm border-primary/40 ring-1 ring-primary/10"
                        : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50"
                    )}>
                      <div className="flex items-center justify-between gap-3 p-3">
                        <span className={cn(
                          "tracking-tight",
                          isLeaf ? "text-base font-bold text-foreground" : "text-xs font-medium text-muted-foreground/70"
                        )}>
                          {block.label}
                        </span>
                        {timer && (
                          <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded font-mono text-xs font-bold shrink-0",
                            timer.isRunning
                              ? "bg-primary/10 text-primary animate-pulse"
                              : "bg-muted text-muted-foreground"
                          )}>
                            <Timer className="h-3 w-3" />
                            {formatTimeMMSS(timer.elapsed)}
                          </div>
                        )}
                      </div>
                      {rows.length > 0 && (
                        <div className="flex flex-col gap-0.5 px-3 pb-2">
                          {rows.map((row, rowIdx) => (
                            <MetricSourceRow
                              key={rowIdx}
                              metrics={row}
                              size={isLeaf ? "normal" : "compact"}
                              isLeaf={isLeaf}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {renderCompletionSummary(childLevel)}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card p-4">
            <span className="text-base font-medium text-foreground capitalize">
              Ready to Start
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0" />

      {/* Up Next */}
      <div className="shrink-0 bg-muted/30 border border-dashed rounded-lg">
        <div className="p-3 pb-0">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Up Next</h3>
        </div>
        <div className="p-3">
          {nextPreview ? (
            <div className="rounded-md border text-sm bg-card/50 border-border/60 hover:bg-card/80">
              <div className="flex flex-col gap-0.5 p-3">
                <MetricSourceRow metrics={nextPreview.metrics} size="compact" isLeaf={false} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm p-3 border border-dashed rounded-lg text-muted-foreground bg-muted/10">
              <CheckCircle2 className="h-4 w-4" />
              <span className="italic">End of section</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CastTimerPanel: React.FC<{
  localNow: number;
  onEvent: (name: string) => void;
}> = ({ localNow, onEvent }) => {
  const primaryTimerEntry = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const allTimers = useStackTimers();
  const blocks = useSnapshotBlocks();

  const isRunning = primaryTimerEntry
    ? primaryTimerEntry.timer.spans.some(s => s.ended === undefined)
    : false;

  const primaryElapsed = primaryTimerEntry
    ? calculateDuration(primaryTimerEntry.timer.spans, localNow)
    : 0;

  const timerStates = useMemo(() => {
    const map = new Map<string, { elapsed: number; duration?: number; format: 'down' | 'up' }>();
    for (const t of allTimers) {
      map.set(t.block.key.toString(), {
        elapsed: calculateDuration(t.timer.spans, localNow),
        duration: t.timer.durationMs,
        format: t.timer.direction,
      });
    }
    return map;
  }, [allTimers, localNow]);

  const leafLabel = blocks[0]?.label;
  const timerLabel = (leafLabel && leafLabel !== primaryTimerEntry?.timer.label)
    ? leafLabel
    : (primaryTimerEntry?.timer.label || 'Session');

  const primaryEntry = primaryTimerEntry ? {
    id: `timer-${primaryTimerEntry.block.key}`,
    ownerId: primaryTimerEntry.block.key.toString(),
    timerMemoryId: '',
    label: timerLabel,
    format: primaryTimerEntry.timer.direction,
    durationMs: primaryTimerEntry.timer.durationMs,
    role: primaryTimerEntry.isPinned ? 'primary' as const : 'auto' as const,
    accumulatedMs: primaryElapsed,
  } : undefined;

  const secondaryEntries = secondaryTimers.map(t => ({
    id: `timer-${t.block.key}`,
    ownerId: t.block.key.toString(),
    timerMemoryId: '',
    label: t.timer.label,
    format: t.timer.direction,
    durationMs: t.timer.durationMs,
    role: 'auto' as const,
    accumulatedMs: calculateDuration(t.timer.spans, localNow),
  }));

  return (
    <div className="flex-1 flex flex-col justify-center">
      <TimerStackView
        elapsedMs={primaryElapsed}
        hasActiveBlock={!!primaryTimerEntry}
        onStart={() => onEvent('start')}
        onPause={() => onEvent('pause')}
        onStop={() => onEvent('stop')}
        onNext={() => onEvent('next')}
        isRunning={isRunning}
        primaryTimer={primaryEntry}
        subLabel={undefined}
        secondaryTimers={secondaryEntries}
        timerStates={timerStates}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TrackerChromecastHarness — the shared storybook component
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackerChromecastHarnessProps {
  /** Workout script text to compile and execute */
  script: string;
  /**
   * Initial stack state:
   *  - 'idle'   : no runtime pushed — shows waiting screen
   *  - 'preview': no runtime, shows a preview-mode selection screen
   *  - 'ready'  : StartSessionAction pushed so WaitingToStart is on the stack
   *  - 'active' : StartSessionAction + NextAction to move past WaitingToStart
   */
  initialState: 'idle' | 'preview' | 'ready' | 'active';
  /** Label shown in the preview panel workout list */
  previewTitle?: string;
  /** Height of the story canvas */
  height?: string;
}

/** Intercept events and log them to the Actions panel */
function useActionLogger(prefix: string) {
  return {
    onStart: fn().mockName(`${prefix}:start`),
    onPause: fn().mockName(`${prefix}:pause`),
    onStop: fn().mockName(`${prefix}:stop`),
    onNext: fn().mockName(`${prefix}:next`),
  };
}

const TrackerChromecastHarness: React.FC<TrackerChromecastHarnessProps> = ({
  script,
  initialState,
  previewTitle = 'Morning WOD',
  height = '600px',
}) => {
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);
  const [now, setNow] = useState(Date.now());
  const logger = useActionLogger('cast');

  // Local animation-frame clock
  useEffect(() => {
    let frameId: number;
    const tick = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Build and initialise the runtime once on mount
  useEffect(() => {
    if (initialState === 'idle' || initialState === 'preview') {
      setRuntime(null);
      return;
    }

    const rt = buildRuntime(script);
    rt.do(new StartSessionAction({ label: previewTitle }));

    if (initialState === 'active') {
      rt.do(new NextAction());
    }

    setRuntime(rt);

    return () => {
      rt.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEvent = (name: string) => {
    if (!runtime) return;
    if (name === 'start') logger.onStart({ name });
    else if (name === 'pause') logger.onPause({ name });
    else if (name === 'stop') logger.onStop({ name });
    else if (name === 'next') logger.onNext({ name });

    runtime.handle({ name, timestamp: new Date() });
  };

  // ── Idle — no connection ───────────────────────────────────────────────────
  if (initialState === 'idle') {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center bg-black text-white/20 font-mono uppercase tracking-[0.5em] rounded-lg border"
      >
        <div className="animate-pulse">Wod.Wiki // waiting-for-cast</div>
      </div>
    );
  }

  // ── Preview — note loaded, no workout running ──────────────────────────────
  if (initialState === 'preview') {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center gap-8 p-12 bg-background border rounded-lg text-foreground"
      >
        <div className="flex items-center gap-3">
          <Dumbbell className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold tracking-tight">Wod.Wiki</span>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold leading-tight">{previewTitle}</h1>
          <p className="mt-2 text-muted-foreground text-lg">Select a workout to begin</p>
        </div>
        <div className="w-full max-w-lg flex flex-col gap-2">
          {script.split('\n').filter(Boolean).slice(0, 4).map((line, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{line}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/40 font-mono uppercase tracking-widest">Ready</p>
      </div>
    );
  }

  // ── Active / Ready — runtime running ──────────────────────────────────────
  if (!runtime) return null;

  return (
    <ScriptRuntimeProvider runtime={runtime}>
      <PanelSizeProvider>
        {/* TV-style fullscreen layout */}
        <div
          style={{ height }}
          className="flex overflow-hidden border rounded-lg bg-background text-foreground"
        >
          {/* Left Column: Stack & Lookahead */}
          <div className="flex-1 min-w-0 bg-secondary/10 border-r border-border">
            <CastStackPanel localNow={now} />
          </div>

          {/* Right Column: Metric bubbles + Timer */}
          <div className="w-1/2 flex flex-col bg-background">
            <div className="p-4 pt-6">
              <MetricTrackerCard />
            </div>
            <CastTimerPanel localNow={now} onEvent={handleEvent} />
            {/* Status badge — mirrors the real receiver's connection overlay */}
            <div className="absolute bottom-2 right-2 opacity-20 text-[9px] font-mono uppercase tracking-widest">
              storybook // {initialState}
            </div>
          </div>
        </div>
      </PanelSizeProvider>
    </ScriptRuntimeProvider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta: Meta<typeof TrackerChromecastHarness> = {
  title: 'catalog/templates/Tracker/Chromecast',
  component: TrackerChromecastHarness,
  parameters: {
    layout: 'padded',
    subsystem: 'chromecast',
    docs: {
      description: {
        component:
          'Chromecast receiver layout driven by a real ScriptRuntime. ' +
          'Mirrors the production Cast receiver (receiver-rpc.tsx) but ' +
          'hydrated locally — no WebRTC transport or Cast SDK required. ' +
          'Use the Actions panel to see D-Pad / button events as they fire.',
      },
    },
  },
  argTypes: {
    script: {
      control: 'text',
      description: 'Workout script in WOD-wiki syntax',
    },
    initialState: {
      control: { type: 'select' },
      options: ['idle', 'preview', 'ready', 'active'],
      description: 'Stack / connection state to initialise the harness with',
    },
    previewTitle: {
      control: 'text',
      description: 'Title shown in the workout selection preview screen',
    },
    height: {
      control: 'text',
      description: 'CSS height of the story canvas',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Idle — receiver booted but no Cast session yet.
 * Shows the pulsing "waiting-for-cast" splash.
 */
export const Idle: Story = {
  name: 'Idle (No Connection)',
  args: {
    script: '21 Thrusters\n21 Pull-ups',
    initialState: 'idle',
    height: '500px',
  },
};

/**
 * Preview — a note has been cast but no workout started yet.
 * Shows the workout selection list.
 */
export const Preview: Story = {
  name: 'Preview (Select Workout)',
  args: {
    script: '21 Thrusters @95lb\n21 Pull-ups\n15 Thrusters @95lb\n15 Pull-ups\n9 Thrusters @95lb\n9 Pull-ups',
    initialState: 'preview',
    previewTitle: 'Fran',
    height: '600px',
  },
};

/**
 * Ready to Start — session root and WaitingToStart are on the stack.
 * Press Start / Next to transition into the first exercise.
 */
export const ReadyToStart: Story = {
  name: 'Ready To Start',
  args: {
    script: '21 Thrusters @95lb\n21 Pull-ups\n15 Thrusters @95lb\n15 Pull-ups\n9 Thrusters @95lb\n9 Pull-ups',
    initialState: 'ready',
    previewTitle: 'Fran',
    height: '600px',
  },
};

/**
 * Active Fran — 21-15-9 benchmark.  First exercise block is live.
 */
export const ActiveFran: Story = {
  name: 'Active: Fran (21-15-9)',
  args: {
    script: [
      '21 Thrusters @95lb',
      '21 Pull-ups',
      '15 Thrusters @95lb',
      '15 Pull-ups',
      '9 Thrusters @95lb',
      '9 Pull-ups',
    ].join('\n'),
    initialState: 'active',
    previewTitle: 'Fran',
    height: '700px',
  },
};

/**
 * Active AMRAP — 20-minute as-many-rounds-as-possible countdown.
 */
export const ActiveAmrap: Story = {
  name: 'Active: AMRAP 20',
  args: {
    script: '20:00 AMRAP\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    initialState: 'active',
    previewTitle: 'Cindy',
    height: '700px',
  },
};

/**
 * Active EMOM — every-minute-on-the-minute, 10 rounds.
 */
export const ActiveEmom: Story = {
  name: 'Active: EMOM 10',
  args: {
    script: '10x 1:00\n10 Thrusters @95lb',
    initialState: 'active',
    previewTitle: 'EMOM 10',
    height: '700px',
  },
};

/**
 * Active interval rounds — 5 rounds with explicit rep target.
 */
export const ActiveRounds: Story = {
  name: 'Active: 5×10 Thrusters',
  args: {
    script: '5x\n10 Thrusters @95lb',
    initialState: 'active',
    previewTitle: '5×10 Thrusters',
    height: '700px',
  },
};
