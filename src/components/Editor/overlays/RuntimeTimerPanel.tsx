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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tv } from "lucide-react";
import type { EditorView } from "@codemirror/view";
import { ScriptRuntimeProvider } from "@/runtime/context/RuntimeContext";
import { TimerDisplay } from "@/panels/timer-panel";
import { VisualStatePanel } from "@/panels/visual-state-panel";
import { PanelSizeProvider, usePanelSize } from "@/panels/panel-system/PanelSizeContext";
import { RuntimeFactory } from "@/runtime/compiler/RuntimeFactory";
import { globalCompiler, globalParser } from "@/runtime-test-bench/services/testbench-services";
import { useRuntimeExecution, type UseRuntimeExecutionReturn } from "@/runtime-test-bench/hooks/useRuntimeExecution";
import { useChromecast } from "@/hooks/useChromecast";
import type { WodBlock, WorkoutResults } from "../types";
import type { IScriptRuntime } from "@/runtime/contracts/IScriptRuntime";
import type { ScriptRuntime } from "@/runtime/ScriptRuntime";
import type { StackSnapshot } from "@/runtime/contracts/IRuntimeStack";
import type { IOutputStatement } from "@/core/models/OutputStatement";
import { dispatchGutterHighlights } from "../extensions/gutter-runtime";
import { NextEvent } from "@/runtime/events/NextEvent";

// Singleton factory — avoids re-constructing the compiler on every render
const factory = new RuntimeFactory(globalCompiler);

// ── Types ───────────────────────────────────────────────────────────────

export interface RuntimeTimerPanelProps {
  /**
   * The WOD block to execute, pinned at the time Run was clicked.
   * `block.startLine` is 0-indexed; gutter base = block.startLine + 1.
   */
  block: WodBlock;
  /** The CM6 EditorView — needed to dispatch gutter highlights. */
  view: EditorView;
  /** Called when the user presses Stop (which also closes the panel). */
  onClose: () => void;
  /** Called when a workout is completed or stopped with results. */
  onComplete?: (blockId: string, results: WorkoutResults) => void;
  /** Whether the slot is currently in full-height expanded mode. */
  isExpanded?: boolean;
  /** Toggle between expanded and compact runtime view. */
  onToggleExpand?: () => void;
}


// ── Inner body component (needs PanelSizeContext) ───────────────────────

interface RuntimeTimerBodyProps {
  execution: UseRuntimeExecutionReturn;
  outputCount: number;
  completedAt: Date | null;
  casting: ReturnType<typeof useChromecast>;
  handleCast: () => void;
  handleStart: () => void;
  handleStop: () => void;
  handleNext: () => void;
}

const RuntimeTimerBody: React.FC<RuntimeTimerBodyProps> = ({
  execution,
  outputCount,
  completedAt,
  casting,
  handleCast,
  handleStart,
  handleStop,
  handleNext,
}) => {
  const { isCompact } = usePanelSize();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* ── Header: Cast button ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20">
        <span className="text-xs font-semibold text-foreground">Running</span>
        <button
          onClick={handleCast}
          disabled={casting.sdkState === "unavailable" || casting.sdkState === "not-loaded" || casting.isConnecting}
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium transition-colors hover:bg-muted"
          style={{
            backgroundColor: casting.isCasting ? "#3b82f6" : "transparent",
            color: casting.isCasting ? "white" : "inherit",
            opacity: casting.sdkState === "unavailable" || casting.sdkState === "not-loaded" ? 0.5 : 1,
            cursor: casting.sdkState === "unavailable" || casting.sdkState === "not-loaded" || casting.isConnecting ? "not-allowed" : "pointer",
          }}
          title={casting.isCasting ? "Casting to device" : "Cast to device"}
        >
          <Tv size={14} />
          <span>{casting.isConnecting ? "Connecting..." : casting.isCasting ? "Casting" : "Cast"}</span>
        </button>
      </div>

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
            <span className="ml-auto text-green-600 dark:text-green-400">
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
}) => {
  const runtimeRef = useRef<IScriptRuntime | null>(null);
  const [ready, setReady] = useState(false);
  const [outputCount, setOutputCount] = useState(0);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  // Chromecast integration
  const casting = useChromecast();

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
    runtimeRef.current = rt;

    // ── Gutter highlighting via stack subscription ──────────────────
    const unsubStack = rt.subscribeToStack(
      (snapshot: StackSnapshot) => {
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
      dispatchGutterHighlights(view, []); // clear gutter on unmount
      rt?.dispose();
      runtimeRef.current = null;
    };

    // Block identity pinned at mount — do not re-run on block changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const execution = useRuntimeExecution(runtimeRef.current as ScriptRuntime | null);

  const handleComplete = useCallback((completed: boolean) => {
    if (!runtimeRef.current) return;

    // Finalize analytics to get summary outputs
    runtimeRef.current.finalizeAnalytics();
    const allOutputs = runtimeRef.current.getOutputStatements();
    
    // Extract metrics fragments from all segment outputs
    const metricFragments = allOutputs
      .filter(o => o.outputType === 'segment')
      .flatMap(o => (o.metrics || []).map(m => ({
        metric: m,
        timestamp: o.timeSpan.start
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
  }, [block.id, execution.elapsedTime, execution.startTime, onComplete]);

  // Track completion time and handle auto-close
  useEffect(() => {
    if (execution.status === "completed" && !completedAt) {
      setCompletedAt(new Date());
      handleComplete(true);

      // Auto-close after 2 seconds so the user can see the "Completed" state
      const timer = setTimeout(() => {
        onClose();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [execution.status, completedAt, onClose, handleComplete]);

  const handleStop = () => {
    execution.stop();
    runtimeRef.current?.handle({ name: 'workout:stop', timestamp: new Date(), data: {} });
    handleComplete(false);
    onClose();
  };

  const handleStart = () => {
    execution.start();
    // Auto-expand to full content area when the timer starts.
    if (!isExpanded) onToggleExpand?.();
  };

  const handleNext = () => {
    runtimeRef.current?.handle(new NextEvent());
  };

  // Handle cast button click
  const handleCast = async () => {
    if (casting.isCasting) {
      return; // Already casting
    }
    await casting.requestSession();
  };

  // Sync runtime state to receiver when casting
  useEffect(() => {
    if (!casting.isCasting || !runtimeRef.current) return;

    const syncState = () => {
      if (!runtimeRef.current) return;
      // Send runtime state snapshot to receiver
      const state = {
        elapsedTime: execution.elapsedTime,
        status: execution.status,
        timestamp: Date.now(),
      };
      casting.sendMessage("state-update", state);
    };

    // Sync on every execution update
    const interval = setInterval(syncState, 100); // 10Hz updates
    return () => clearInterval(interval);
  }, [casting.isCasting, execution.elapsedTime, execution.status, casting]);

  if (!ready || !runtimeRef.current) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Initializing…
      </div>
    );
  }

  return (
    <PanelSizeProvider>
      <ScriptRuntimeProvider runtime={runtimeRef.current}>
        <RuntimeTimerBody
          execution={execution}
          outputCount={outputCount}
          completedAt={completedAt}
          casting={casting}
          handleCast={handleCast}
          handleStart={handleStart}
          handleStop={handleStop}
          handleNext={handleNext}
        />
      </ScriptRuntimeProvider>
    </PanelSizeProvider>
  );
};
