/**
 * RuntimeTimerPanel
 *
 * In-overlay timer UI rendered inside the WodCompanion slot when a runtime
 * is active for a section.
 *
 * Lifecycle:
 *   - Mount  → creates its own ScriptRuntime via RuntimeFactory
 *   - Unmount → disposes runtime, clears gutter highlights
 *
 * The panel renders in the companion overlay slot (not fixed-position).
 * OverlayTrack expands the slot to ≥75 vh and pins it sticky within the
 * section boundaries when running (see OverlayTrack.tsx).
 *
 * Gutter line highlighting:
 *   Each stack snapshot's top block has `sourceIds` = statement.meta.line
 *   (1-based within the content block, per lezer-mapper.ts).
 *   Document line = block.startLine + 1 + sourceId.
 */

import React, { useCallback, useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { TimerDisplay } from "@/panels/timer-panel";
import { VisualStatePanel } from "@/panels/visual-state-panel";
import { PanelSizeProvider, usePanelSize } from "@/panels/panel-system/PanelSizeContext";
import { ScriptRuntimeProvider, useRuntimeExecution, type UseRuntimeExecutionReturn, SubscriptionManager, NextEvent, ScriptRuntime } from "@/hooks/useRuntimeTimer";
import type { IScriptRuntime, StackSnapshot } from "@/hooks/useRuntimeTimer";
import { runtimeFactory, globalParser } from "@/hooks/useRuntimeFactory";
import { ChromecastRuntimeSubscription, ChromecastEventProvider, ClockSyncService } from "@/hooks/useCastSignaling";
import type { RpcWorkbenchUpdate } from "@/hooks/useCastSignaling";
import { useWorkbenchSyncStore } from "@/components/layout/workbenchSyncStore";
import type { WodBlock, WorkoutResults } from "../types";
import type { IOutputStatement } from "@/core/models/OutputStatement";
import { dispatchGutterHighlights } from "../extensions/gutter-unified";
import { formatTimeMMSS } from "@/lib/formatTime";

// Singleton factory — use shared factory from hooks layer to avoid re-constructing the compiler
const factory = runtimeFactory;

// ── Types ───────────────────────────────────────────────────────────────

export interface RuntimeTimerPanelProps {
  /**
   * The WOD block to execute, pinned at the time Run was clicked.
   * `block.startLine` is 0-indexed; gutter base = block.startLine + 1.
   */
  block: WodBlock;
  /** The CM6 EditorView — needed to dispatch gutter highlights. Optional for standalone tracker. */
  view?: EditorView;
  /** Called when the user presses Stop (which also closes the panel). */
  onClose: () => void;
  /** Called when a workout is completed or stopped with results. */
  onComplete?: (blockId: string, results: WorkoutResults) => void;
  /** Whether the slot is currently in full-height expanded mode. */
  isExpanded?: boolean;
  /** Toggle between expanded and compact runtime view. */
  onToggleExpand?: () => void;
  /** Whether the timer should start automatically on mount. */
  autoStart?: boolean;
  /** Called when the internal runtime is created — allows the parent to subscribe. */
  onRuntimeReady?: (runtime: IScriptRuntime) => void;
}


// ── Inner body component (needs PanelSizeContext) ───────────────────────

interface RuntimeTimerBodyProps {
  execution: UseRuntimeExecutionReturn;
  outputCount: number;
  completedAt: Date | null;
  handleStart: () => void;
  handleStop: () => void;
  handleNext: () => void;
}

const RuntimeTimerBody: React.FC<RuntimeTimerBodyProps> = ({
  execution,
  outputCount,
  completedAt,
  handleStart,
  handleStop,
  handleNext,
}) => {
  const { isCompact } = usePanelSize();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* ── Body: stacked on mobile, side-by-side on desktop ── */}
      <div className={`min-h-0 flex-1 overflow-hidden flex ${isCompact ? "flex-col" : "flex-row"}`}>
        {/* Visual State — top on mobile, left on desktop */}
        <div className={`overflow-hidden bg-secondary/10 ${
          isCompact
            ? "flex-1 min-h-0 border-b border-border"
            : "min-w-0 flex-1 border-r border-border"
        }`}>
          <VisualStatePanel />
        </div>

        {/* Timer — bottom on mobile, right on desktop */}
        <div className={`flex flex-col justify-center overflow-hidden bg-background ${
          isCompact ? "shrink-0" : "w-[48%]"
        }`}>
          <TimerDisplay
            elapsedMs={execution.elapsedTime}
            hasActiveBlock={true}
            onStart={handleStart}
            onPause={execution.pause}
            onStop={handleStop}
            onNext={handleNext}
            isRunning={execution.status === "running"}
            compact={isCompact}
            enableDisplayStack={true}
          />
        </div>
      </div>

      {/* ── Results footer ── */}
      {outputCount > 0 && (
        <div className="flex flex-shrink-0 items-center gap-2 border-t border-border bg-muted/20 px-2.5 py-1 text-[10px] text-muted-foreground">
          <span>
            {outputCount} result{outputCount !== 1 ? "s" : ""} logged
          </span>
          {completedAt && (
            <span className="ml-auto font-medium text-primary">
              ✓ {completedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ── Component ───────────────────────────────────────────────────────────

export const RuntimeTimerPanel: React.FC<RuntimeTimerPanelProps> = ({
  block,
  view,
  onClose,
  onComplete,
  isExpanded = false,
  onToggleExpand,
  autoStart,
  onRuntimeReady,
}) => {
  const [runtime, setRuntime] = useState<IScriptRuntime | null>(null);
  const [ready, setReady] = useState(false);
  const [outputCount, setOutputCount] = useState(0);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  // Gutter base: 0-indexed block.startLine → 1-based fence line
  // statement sourceId = 1-based line within content
  // document line = (block.startLine + 1) + sourceId
  const gutterBase = block.startLine + 1;

  // Create runtime on mount; clean up on unmount
  useEffect(() => {
    // Parse content if statements aren't already populated (sectionToWodBlock
    // doesn't run the parser, so statements is typically undefined here).
    const blockWithStatements = block.statements?.length
      ? block
      : { ...block, statements: globalParser.read(block.content).statements };
    const rt = factory.createRuntime(blockWithStatements);
    if (!rt) {
      // Block has no compilable statements — nothing to run
      return;
    }
    setRuntime(rt);
    onRuntimeReady?.(rt);

    // ── Gutter highlighting via stack subscription ──────────────────
    const unsubStack = rt.subscribeToStack(
      (snapshot: StackSnapshot) => {
        if (!view) return;
        if (snapshot.blocks.length === 0) {
          dispatchGutterHighlights(view, []);
          return;
        }
        const topBlock = snapshot.blocks[snapshot.blocks.length - 1];
        if (topBlock?.sourceIds?.length) {
          const docLines = topBlock.sourceIds.map((id) => gutterBase + id);
          dispatchGutterHighlights(view, docLines);
        } else {
          dispatchGutterHighlights(view, []);
        }
      },
    );

    // ── Output counting ─────────────────────────────────────────────
    const unsubOutput = rt.subscribeToOutput(
      (output: IOutputStatement) => {
        if (output.outputType === "segment" || output.outputType === "milestone") {
          setOutputCount((n) => n + 1);
        }
      },
    );

    setReady(true);

    return () => {
      unsubStack();
      unsubOutput();
      if (view) dispatchGutterHighlights(view, []); // clear gutter on unmount
      rt?.dispose();
    };

    // Block identity pinned at mount — do not re-run on block changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const execution = useRuntimeExecution(runtime as ScriptRuntime | null);

  // Auto-start workout if requested via props
  useEffect(() => {
    if (autoStart && ready && execution.status === 'idle') {
      execution.start();
    }
  }, [autoStart, ready, execution.status, execution.start]);

  const handleComplete = useCallback((completed: boolean) => {
    if (!runtime) return;

    // Finalize analytics to get summary outputs
    runtime.finalizeAnalytics();
    const allOutputs = runtime.getOutputStatements();
    
    // Extract metrics fragments from all segment outputs
    const metricFragments = allOutputs
      .filter((o: IOutputStatement) => o.outputType === 'segment')
      .flatMap((o: IOutputStatement) => (o.metrics || []).map(m => ({
        metric: m,
        timestamp: o.timeSpan.started
      })));

    const results: WorkoutResults = {
      startTime: execution.startTime || Date.now(),
      endTime: Date.now(),
      duration: execution.elapsedTime,
      completed,
      metrics: metricFragments,
      logs: allOutputs
    };

    onComplete?.(block.id, results);
  }, [block.id, execution.elapsedTime, execution.startTime, onComplete, runtime]);

  // Track completion: notify parent immediately so it can switch to results view.
  // The parent (FullscreenTimer) will unmount this panel when it transitions.
  // Also send review mode to Chromecast BEFORE the panel unmounts (which would
  // otherwise lose the cast subscription).
  useEffect(() => {
    if (execution.status === "completed" && !completedAt) {
      setCompletedAt(new Date());
      handleComplete(true);

      // Send review data to Chromecast so the receiver transitions to the
      // review screen. This must happen before the panel unmounts and the
      // cast subscription is disposed.
      const transport = useWorkbenchSyncStore.getState().castTransport;
      if (transport?.connected) {
        const allOutputs = runtime?.getOutputStatements() || [];
        const segmentCount = allOutputs.filter((o: IOutputStatement) => o.outputType === 'segment').length;
        const reviewMessage: RpcWorkbenchUpdate = {
          type: 'rpc-workbench-update',
          mode: 'review',
          reviewData: {
            totalDurationMs: execution.elapsedTime,
            completedSegments: segmentCount,
            rows: [
              { label: 'Total Time', value: formatTimeMMSS(execution.elapsedTime) },
              { label: 'Segments', value: String(segmentCount) },
            ],
          },
        };
        try { transport.send(reviewMessage); } catch { /* ignore */ }
      }
    }
  }, [execution.status, completedAt, handleComplete]);

  const handleStop = () => {
    execution.stop();
    runtime?.handle({ name: 'workout:stop', timestamp: new Date(), data: {} });
    handleComplete(false);
    onClose();
  };

  const handleStart = () => {
    execution.start();
    // Auto-expand to full content area when the timer starts.
    if (!isExpanded) onToggleExpand?.();
  };

  const handleNext = () => {
    runtime?.handle(new NextEvent());
  };

  // ── Chromecast RPC syncing ──────────────────────────────────────────
  // When a cast transport is active (connected from the app-level CastButtonRpc),
  // wire the local runtime into the Chromecast RPC pipeline so the receiver
  // gets proper stack snapshots, output statements, and timer data.
  const castTransport = useWorkbenchSyncStore(s => s.castTransport);

  useEffect(() => {
    const rt = runtime;
    if (!castTransport?.connected || !rt) return;

    // Signal active mode to receiver
    try { castTransport.send({ type: 'rpc-workbench-update', mode: 'active' }); } catch { /* ignore */ }

    // Create a local SubscriptionManager that fans out runtime events
    const subMgr = new SubscriptionManager(rt);
    const chromecastSub = new ChromecastRuntimeSubscription(castTransport, { id: 'inline-chromecast' });
    subMgr.add(chromecastSub);

    // Remote control: D-Pad events from receiver → local runtime
    const eventProvider = new ChromecastEventProvider(castTransport);
    const unsubEvents = eventProvider.onEvent((event) => {
      switch (event.name) {
        case 'next': runtime?.handle(new NextEvent()); break;
        case 'start': execution.start(); break;
        case 'pause': execution.pause(); break;
        case 'stop': handleStop(); break;
      }
    });

    // Clock sync (best-effort, non-blocking)
    const clockSync = new ClockSyncService(castTransport);
    clockSync.sync().catch(() => {});

    return () => {
      unsubEvents();
      eventProvider.dispose();
      clockSync.dispose();
      subMgr.dispose();
      // Do NOT send mode='idle' here — let EditorCastBridge or WorkbenchCastBridge
      // handle the mode transition. Sending 'idle' would flash the waiting screen
      // before the correct mode (preview or review) is re-sent by the bridge.
    };
    // Only re-run when transport connection changes or runtime is created
  }, [castTransport?.connected, runtime, execution, handleStop, ready]);

  if (!ready || !runtime) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Initializing…
      </div>
    );
  }

  return (
    <PanelSizeProvider>
      <ScriptRuntimeProvider runtime={runtime}>
        <RuntimeTimerBody
          execution={execution}
          outputCount={outputCount}
          completedAt={completedAt}
          handleStart={handleStart}
          handleStop={handleStop}
          handleNext={handleNext}
        />
      </ScriptRuntimeProvider>
    </PanelSizeProvider>
  );
};
