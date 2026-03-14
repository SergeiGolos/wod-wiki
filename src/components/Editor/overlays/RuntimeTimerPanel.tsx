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

import React, { useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { ScriptRuntimeProvider } from "@/runtime/context/RuntimeContext";
import { TimerDisplay } from "@/panels/timer-panel";
import { VisualStatePanel } from "@/panels/visual-state-panel";
import { PanelSizeProvider } from "@/panels/panel-system/PanelSizeContext";
import { RuntimeFactory } from "@/runtime/compiler/RuntimeFactory";
import { globalCompiler, globalParser } from "@/runtime-test-bench/services/testbench-services";
import { useRuntimeExecution } from "@/runtime-test-bench/hooks/useRuntimeExecution";
import type { WodBlock } from "../types";
import type { IScriptRuntime } from "@/runtime/contracts/IScriptRuntime";
import type { ScriptRuntime } from "@/runtime/ScriptRuntime";
import type { StackSnapshot } from "@/runtime/contracts/IRuntimeStack";
import type { IOutputStatement } from "@/core/models/OutputStatement";
import { dispatchGutterHighlights } from "../extensions/gutter-runtime";
import { NextEvent } from "@/runtime/events/NextEvent";
import { Maximize2, Minimize2, CheckCircle2 } from "lucide-react";

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
  /** Whether the slot is currently in full-height expanded mode. */
  isExpanded?: boolean;
  /** Toggle between expanded and compact runtime view. */
  onToggleExpand?: () => void;
}

// ── Component ───────────────────────────────────────────────────────────

export const RuntimeTimerPanel: React.FC<RuntimeTimerPanelProps> = ({
  block,
  view,
  onClose,
  isExpanded = false,
  onToggleExpand,
}) => {
  const runtimeRef = useRef<IScriptRuntime | null>(null);
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

  // Track completion time
  useEffect(() => {
    if (execution.status === "completed" && !completedAt) {
      setCompletedAt(new Date());
    }
  }, [execution.status, completedAt]);

  const handleStop = () => {
    execution.stop();
    runtimeRef.current?.handle({ name: 'workout:stop', timestamp: new Date(), data: {} });
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
        <div className="flex h-full flex-col overflow-hidden bg-background">

          {/* ── Header ── */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-2.5 py-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              {execution.status === "running" && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              )}
              {execution.status === "completed" ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Completed
                </span>
              ) : (
                <span className="text-muted-foreground capitalize">
                  {block.dialect ?? "wod"} · {execution.status}
                </span>
              )}
            </span>
            <button
              title={isExpanded ? "Shrink" : "Expand"}
              onClick={() => onToggleExpand?.()}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {isExpanded
                ? <Minimize2 className="h-3.5 w-3.5" />
                : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* ── Body: VisualStatePanel (left) + TimerDisplay (right) ── */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Left: stack + lookahead */}
            <div className="min-w-0 flex-1 overflow-hidden border-r border-border">
              <VisualStatePanel />
            </div>

            {/* Right: clock + controls */}
            <div className="flex w-[48%] flex-col overflow-hidden bg-background">
              <TimerDisplay
                elapsedMs={execution.elapsedTime}
                hasActiveBlock={true}
                onStart={handleStart}
                onPause={execution.pause}
                onStop={handleStop}
                onNext={handleNext}
                isRunning={execution.status === "running"}
                compact={false}
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
      </ScriptRuntimeProvider>
    </PanelSizeProvider>
  );
};
