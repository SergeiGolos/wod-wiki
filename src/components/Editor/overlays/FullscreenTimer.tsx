import React, { useState } from "react";
import type { EditorView } from "@codemirror/view";
import { RuntimeTimerPanel } from "./RuntimeTimerPanel";
import type { WodBlock, WorkoutResults } from "../types";
import { ReviewGrid } from "@/components/review-grid/ReviewGrid";
import { getAnalyticsFromLogs } from "@/services/AnalyticsTransformer";
import type { Segment } from "@/core/models/AnalyticsModels";
import { FocusedDialog } from "./FocusedDialog";
import { CastButton } from "@/components/cast/CastButton";

export interface FullscreenTimerProps {
  block: WodBlock;
  view?: EditorView;
  onClose: () => void;
  onCompleteWorkout?: (blockId: string, results: WorkoutResults) => void;
  /** Whether the timer should start automatically on mount. */
  autoStart?: boolean;
}

export const FullscreenTimer: React.FC<FullscreenTimerProps> = ({
  block,
  view,
  onClose,
  onCompleteWorkout,
  autoStart,
}) => {
  const [completedSegments, setCompletedSegments] = useState<Segment[] | null>(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set());

  const handleClose = () => {
    // Brief delay for any closing animations if we add them later
    setTimeout(onClose, 100);
  };

  // Called by RuntimeTimerPanel when the workout finishes (either naturally or
  // via the Stop button).  When completed === true (natural finish), we
  // transition to the results view instead of closing.
  const handleComplete = (blockId: string, results: WorkoutResults) => {
    onCompleteWorkout?.(blockId, results);

    if (results.completed && results.logs && results.logs.length > 0) {
      const { segments } = getAnalyticsFromLogs(results.logs as any, results.startTime);
      setCompletedSegments(segments);
    } else if (results.completed) {
      // Completed but no logs — still switch to results view (will show empty state)
      setCompletedSegments([]);
    }
    // If not completed (manual stop), fall through — RuntimeTimerPanel will call
    // onClose() which closes the popup normally.
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
    <FocusedDialog title="Workout Complete" onClose={handleClose} actions={<CastButton />}>
      <ReviewGrid
        runtime={null}
        segments={completedSegments}
        selectedSegmentIds={selectedSegmentIds}
        onSelectSegment={handleSelectSegment}
        groups={[]}
      />
    </FocusedDialog>
  ) : (
    /* ── Track view: active timer ── */
    <FocusedDialog onClose={handleClose} floatingClose actions={<CastButton />}>
      <RuntimeTimerPanel
        block={block}
        view={view}
        onClose={handleClose}
        onComplete={handleComplete}
        isExpanded={true}
        autoStart={autoStart}
      />
    </FocusedDialog>
  );
};
