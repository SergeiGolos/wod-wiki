/**
 * RuntimeTimerPanel
 *
 * In-overlay timer UI rendered inside the WhiteboardCompanion slot when a runtime
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
import { TimerDisplay } from "@/panels/wallclock-panel";
import { VisualStatePanel } from "@/panels/visual-state-panel";
import { PanelSizeProvider, usePanelSize } from "@/panels/panel-system/PanelSizeContext";
import { useScreenMode } from "@/panels/panel-system/useScreenMode";
import { ScriptRuntimeProvider, useRuntimeExecution, type UseRuntimeExecutionReturn, NextEvent, ScriptRuntime } from "@/hooks/useRuntimeTimer";
import type { IScriptRuntime, StackSnapshot } from "@/hooks/useRuntimeTimer";
import { getActiveWorkbenchSessionStore } from "@/stores/workbenchSessionStore";
import { useCastTransport } from "@/contexts/CastTransportContext";
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types';
import type { IOutputStatement } from "@/core/models/OutputStatement";
import { dispatchGutterHighlights } from '@/components/Editor/extensions/gutter-unified';
import { buildCompletedRuntimeProjection } from "@/app/cast/workbenchProjection";
import { useUserOverrides } from '@/components/organisms/review/useUserOverrides';
import { buildWorkoutResults, countSegmentOutputs, createRuntimeForBlock, prepareRuntimeBlock } from "@/app/editor/runtimeTimerModel";
import { useCollectionMetrics, resolveChoiceSelection } from "@/hooks/useCollectionMetrics";
import { CollectionWizard } from "@/components/organisms/review/CollectionWizard";

import type { ChoiceCollectionItem } from "@/hooks/useCollectionMetrics";

// ── Types ───────────────────────────────────────────────────────────────

export interface RuntimeTimerPanelProps {
  /**
   * The WOD block to execute, pinned at the time Run was clicked.
   * `block.startLine` is 0-indexed; gutter base = block.startLine + 1.
   */
  block: ScriptBlock;
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
  createdAt: Date | null;
  handleStart: () => void;
  handleStop: () => void;
  handleNext: () => void;
}

const RuntimeTimerBody: React.FC<RuntimeTimerBodyProps> = ({
  execution,
  outputCount,
  createdAt,
  handleStart,
  handleStop,
  handleNext,
}) => {
  const { isCompact } = usePanelSize();
  const screenMode = useScreenMode();
  const isMobile = screenMode === 'mobile' || isCompact;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* ── Body: stacked on mobile, side-by-side on desktop ── */}
      <div className={`min-h-0 flex-1 overflow-hidden flex ${isMobile ? "flex-col" : "flex-row"}`}>
        {/* Visual State — top on mobile, left on desktop */}
        <div className={`overflow-hidden bg-secondary/10 ${
          isMobile
            ? "flex-1 min-h-0 border-b border-border pt-14"
            : "min-w-0 w-1/3 border-r border-border"
        }`}>
          <VisualStatePanel />
        </div>

        {/* Timer — bottom on mobile, right on desktop */}
        <div className={`flex flex-col justify-center overflow-hidden bg-background ${
          isMobile ? "shrink-0" : "w-2/3"
        }`}>
          <TimerDisplay
            elapsedMs={execution.elapsedTime}
            hasActiveBlock={true}
            onStart={handleStart}
            onPause={execution.pause}
            onStop={handleStop}
            onNext={handleNext}
            isRunning={execution.status === "running"}
            compact={isMobile}
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
          {createdAt && (
            <span className="ml-auto font-medium text-primary">
              ✓ {createdAt.toLocaleTimeString()}
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
  const [runtimeBlock] = useState(() => prepareRuntimeBlock(block));
  const [preRunScript] = useState(() => ({ statements: runtimeBlock.statements }));
  const [runtime, setRuntime] = useState<IScriptRuntime | null>(null);
  const [ready, setReady] = useState(false);
  const [outputCount, setOutputCount] = useState(0);
  const [createdAt, setCompletedAt] = useState<Date | null>(null);
  const [wizardDone, setWizardDone] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  // True once the factory declined to build a runtime (empty / uncompilable
  // block) — drives the "Nothing to run" empty state instead of hanging on
  // "Initializing…". (#702)
  const [nothingToRun, setNothingToRun] = useState(false);

  // Gutter base: 0-indexed block.startLine → 1-based fence line
  // statement sourceId = 1-based line within content
  // document line = (block.startLine + 1) + sourceId
  const gutterBase = block.startLine + 1;
  const { overrides, setOverride } = useUserOverrides(true);
  const { collectionItems } = useCollectionMetrics([], overrides, preRunScript);

  // Create runtime only after pre-run collection has been resolved. This keeps
  // ChoiceGroupMetric out of RuntimeFactory unless the entry point has no wizard,
  // where the factory's safety net defaults it.
  useEffect(() => {
    if (!wizardDone && collectionItems.length > 0) return;

    const rt = createRuntimeForBlock(runtimeBlock);
    if (!rt) {
      // Block has no compilable statements — nothing to run
      setNothingToRun(true);
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
      rt.dispose();
    };

    // Block identity pinned at mount; pre-run collection is the only creation gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardDone, collectionItems.length]);

  const execution = useRuntimeExecution(runtime as ScriptRuntime | null);

  // Sync the inline runtime's execution status into the active Workbench
  // Session store. Store-driven panels (StackIntegratedTimer reads
  // `execution.status` for its Play/Pause/Continue control) have no
  // useWorkbenchSessionLifecycle on this surface to do it — /run creates its
  // runtime locally here, so the label would otherwise never reflect pause.
  // (#701)
  useEffect(() => {
    getActiveWorkbenchSessionStore().getState().setExecution(execution);
  }, [execution.status, execution.elapsedTime, execution.stepCount, execution.startTime]);

  // Auto-start only after the runtime exists; if collection is required, the
  // wizard's Start button sets pendingStart after resolving the choices.
  useEffect(() => {
    if ((autoStart || pendingStart) && ready && execution.status === 'idle') {
      execution.start();
      setPendingStart(false);
    }
  }, [autoStart, pendingStart, ready, execution.status, execution.start]);

  const handleComplete = useCallback((completed: boolean) => {
    if (!runtime) return;

    // Finalize analytics to get summary outputs
    runtime.finalizeAnalytics();
    const allOutputs = runtime.getOutputStatements();

    const results: WorkoutResults = buildWorkoutResults(allOutputs, {
      startTime: execution.startTime ?? undefined,
      elapsedTime: execution.elapsedTime,
      completed,
      now: runtime.nowProvider,
    });

    onComplete?.(block.id, results);
  }, [block.id, execution.elapsedTime, execution.startTime, onComplete, runtime]);

  // Cast bridge — read the active transport from context (provided by
  // `CastButtonRpc`). The inline runtime has no inline subscription
  // (the workbench runtime's subscription handles the cast stream).
  const castTransport = useCastTransport();

  // Track completion: notify parent immediately so it can switch to results view.
  // The parent (FullscreenTimer) will unmount this panel when it transitions.
  // Also send review mode to Chromecast BEFORE the panel unmounts (which would
  // otherwise lose the cast subscription).
  useEffect(() => {
    if (execution.status === "completed" && !createdAt) {
      setCompletedAt(new Date());
      handleComplete(true);

      // Send review data to Chromecast so the receiver transitions to the
      // review screen. This must happen before the panel unmounts and the
      // cast subscription is disposed.
      if (castTransport?.connected) {
        const allOutputs = runtime?.getOutputStatements() || [];
        const segmentCount = countSegmentOutputs(allOutputs);
        const reviewMessage = buildCompletedRuntimeProjection({
          totalDurationMs: execution.elapsedTime,
          segmentCount,
        });
        try { castTransport.send(reviewMessage); } catch { /* ignore */ }
      }
    }
  }, [execution.status, createdAt, handleComplete, castTransport]);

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

  // ── Pre-run Choice Wizard ─────────────────────────────────────────────────
  // Scan the parsed block before RuntimeFactory can default unresolved choices.
  // The wizard's Start button resolves all choices into the same statements,
  // then runtime creation proceeds from those collapsed statements.
  const showChoiceWizard = !wizardDone && collectionItems.length > 0;

  const handleWizardStart = () => {
    setWizardDone(true);
    setPendingStart(true);
    if (!isExpanded) onToggleExpand?.();
  };

  const resolveChoice = (item: ChoiceCollectionItem, selectedIndex: number) => {
    resolveChoiceSelection(preRunScript, item, selectedIndex);
  };

  const handleNext = () => {
    runtime?.handle(new NextEvent(undefined, runtime!.nowProvider));
  };

  // The cast stack is wired by `CastSessionManager` against the workbench
  // `SubscriptionManager`. The inline runtime's snapshots flow to the
  // receiver through the workbench runtime. D-Pad events are routed by
  // `CastButtonRpc` against the workbench handles. The completion-message
  // send below is a one-shot projection that doesn't need a session.
  if (showChoiceWizard) {
    return (
      <PanelSizeProvider>
        <CollectionWizard
          items={collectionItems}
          onSave={(item, val) => {
            if (item.kind === 'choice') {
              resolveChoice(item as ChoiceCollectionItem, val as number);
            } else {
              // value items: save to override store so the grid sees it
              setOverride(item.blockKey, item.metricType, val);
            }
          }}
          onSkip={() => {}}
          onStart={handleWizardStart}
          mode="pre-run"
        />
      </PanelSizeProvider>
    );
  }

  // Empty / uncompilable block: the factory declined to build a runtime, so
  // `ready` never flips. Surface a clear empty state instead of hanging on
  // "Initializing…" forever. Keyed on the factory's decision (not statement
  // count) so it catches every entry path (editor Run, date-page Play, /run
  // route) and every un-runnable shape. (#702)
  if (nothingToRun) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-medium text-foreground">Nothing to run</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          This block has no workout statements yet. Add a timer or some
          movements, then run it again.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Close
        </button>
      </div>
    );
  }

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
          createdAt={createdAt}
          handleStart={handleStart}
          handleStop={handleStop}
          handleNext={handleNext}
        />
      </ScriptRuntimeProvider>
    </PanelSizeProvider>
  );
};
