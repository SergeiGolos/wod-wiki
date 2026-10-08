import React, { useCallback, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { RuntimeTimerPanel } from "@/components/organisms/editor/RuntimeTimerPanel";
import type { ScriptBlock, Sessions } from "@/components/Editor/types";
import { ReviewGrid } from "@/components/organisms/review/ReviewGrid";
import { useDebugMode } from "@/contexts/DebugModeContext";
import { getAnalyticsFromLogs } from "@/hooks/useWorkbenchServices";
import type { IScriptRuntime } from "@/hooks/useRuntimeTimer";
import type { Segment } from '@bitcobblers/wod-wiki-engine';
import { FocusedDialog } from "@/components/molecules/FocusedDialog";
import { CastButtonRpc } from "@/components/organisms/cast/CastButtonRpc";
import { AudioToggle } from "@/components/atoms/AudioToggle";

export interface FullscreenTimerProps {
  block: ScriptBlock;
  view?: EditorView;
  onClose: () => void;
  onCompleteWorkout?: (blockId: string, results: Sessions) => void;
  /** Whether the timer should start automatically on mount. */
  autoStart?: boolean;
  /** Called when the inner runtime is created — host can send gate-popping events (e.g. Next to clear WaitingToStart). */
  onRuntimeReady?: (runtime: IScriptRuntime) => void;
  /** Called once when the inner runtime transitions from idle to running. */
  onRunStarted?: () => void;
  /**
   * Host-driven halt (doc swap / pending restart): while true, a live run is
   * stopped and its partial results reported via onCompleteWorkout WITHOUT
   * closing — the host keeps control of when the overlay exits.
   */
  externalStop?: boolean;
}

export const FullscreenTimer: React.FC<FullscreenTimerProps> = ({
  block,
  view,
  onClose,
  onCompleteWorkout,
  autoStart,
  onRuntimeReady,
  onRunStarted,
  externalStop,
}) => {
  const [completedSegments, setCompletedSegments] = useState<Segment[] | null>(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set());
  const { isDebugMode } = useDebugMode();

  // Exit/Stop on a live run must not discard outputs: flip the panel's halt
  // flag (RuntimeTimerPanel externalStop), which stops the execution and
  // reports partial results via onComplete BEFORE we close. Refs make idle
  // exits cheap (plain close, nothing to report) and double-finalize
  // impossible.
  const startedRef = useRef(false);
  const finalizedRef = useRef(false);
  const exitRequestedRef = useRef(false);
  const [haltRequested, setHaltRequested] = useState(false);

  const handleRunStarted = useCallback(() => {
    startedRef.current = true;
    onRunStarted?.();
  }, [onRunStarted]);

  const handleClose = () => {
    // Review view, an already-finalized run, or a never-started run: nothing
    // left to report — dismiss immediately (idle exit finishes with no results).
    if (completedSegments !== null || finalizedRef.current || !startedRef.current) {
      onClose();
      return;
    }
    // Live run: halt first; close once the partial report has gone out.
    exitRequestedRef.current = true;
    setHaltRequested(true);
  };

  // Called by RuntimeTimerPanel when the workout finishes (naturally, via its
  // Stop button, or via a halt). When completed === true (natural finish), we
  // transition to the results view instead of closing.
  const handleComplete = (blockId: string, results: Sessions) => {
    if (finalizedRef.current) return; // single report per run — no double-finalize
    finalizedRef.current = true;
    onCompleteWorkout?.(blockId, results);

    if (results.completed && results.logs && results.logs.length > 0) {
      const { segments } = getAnalyticsFromLogs(results.logs, results.startTime);
      setCompletedSegments(segments);
    } else if (results.completed) {
      // Completed but no logs — still switch to results view (will show empty state)
      setCompletedSegments([]);
    } else if (exitRequestedRef.current) {
      // User Exit/Stop on a live run: partial results are reported — safe to close.
      onClose();
    }
    // Host-driven externalStop partial: panel stays mounted; the host owns exit.
  };

  const handleSelectSegment = (id: number, modifiers?: { ctrlKey: boolean; shiftKey: boolean }, visibleIds?: number[]) => {
    setSelectedSegmentIds((prev) => {
      const next = new Set(prev);
      if (modifiers?.ctrlKey) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else if (modifiers?.shiftKey && visibleIds) {
        const lastId = Array.from(prev).pop();
        if (lastId !== undefined) {
          const startIdx = visibleIds.indexOf(lastId);
          const endIdx = visibleIds.indexOf(id);
          if (startIdx !== -1 && endIdx !== -1) {
            const min = Math.min(startIdx, endIdx);
            const max = Math.max(startIdx, endIdx);
            for (let i = min; i <= max; i++) next.add(visibleIds[i]);
          } else {
            next.add(id);
          }
        } else {
          next.add(id);
        }
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return completedSegments !== null ? (
    /* ── Results view: shown after natural workout completion ── */
    <FocusedDialog title="Workout Complete" onClose={handleClose} actions={<><CastButtonRpc /><AudioToggle /></>}>
      <ReviewGrid
        runtime={null}
        segments={completedSegments}
        selectedSegmentIds={selectedSegmentIds}
        onSelectSegment={handleSelectSegment}
        groups={[]}
        gridViewPreset={isDebugMode ? 'debug' : 'default'}
      />
    </FocusedDialog>
  ) : (
    /* ── Track view: active timer ── */
    <FocusedDialog
      onClose={handleClose}
      title="Workout"
      closeLabel="Exit"
      actions={
        <>
          <button
            type="button"
            onClick={handleClose}
            title="Stop Session"
            className="flex h-11 min-w-[44px] items-center justify-center rounded-pill bg-muted/50 px-4 text-sm font-medium text-muted-foreground shadow-[rgba(0,0,0,0.06)_0px_1px_2px] transition-colors hover:bg-muted hover:text-foreground"
          >
            Stop
          </button>
          <CastButtonRpc />
          <AudioToggle />
        </>
      }
    >
      <RuntimeTimerPanel
        block={block}
        view={view}
        onClose={handleClose}
        onComplete={handleComplete}
        isExpanded={true}
        autoStart={autoStart}
        onRuntimeReady={onRuntimeReady}
        onRunStarted={handleRunStarted}
        externalStop={externalStop || haltRequested}
      />
    </FocusedDialog>
  );
};
