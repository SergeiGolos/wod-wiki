import React, { useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { RuntimeTimerPanel } from "./RuntimeTimerPanel";
import type { WodBlock, WorkoutResults } from "../types";
import { X } from "lucide-react";
import { ReviewGrid } from "@/components/review-grid/ReviewGrid";
import { getAnalyticsFromLogs } from "@/services/AnalyticsTransformer";
import type { Segment } from "@/core/models/AnalyticsModels";

export interface FullscreenTimerProps {
  block: WodBlock;
  view: EditorView;
  onClose: () => void;
  onCompleteWorkout?: (blockId: string, results: WorkoutResults) => void;
}

export const FullscreenTimer: React.FC<FullscreenTimerProps> = ({
  block,
  view,
  onClose,
  onCompleteWorkout,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  // When a workout completes naturally (last block popped), we show the results
  // view in place of the timer view within this same popup.
  const [completedSegments, setCompletedSegments] = useState<Segment[] | null>(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set());

  const handleClose = () => {
    setIsClosing(true);
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

  // Prevent scrolling on the body while the popup is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-full flex flex-col bg-card overflow-hidden">

        {completedSegments !== null ? (
          /* ── Results view: shown after natural workout completion ── */
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <h2 className="text-lg font-semibold">Workout Complete</h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ReviewGrid
                runtime={null}
                segments={completedSegments}
                selectedSegmentIds={selectedSegmentIds}
                onSelectSegment={handleSelectSegment}
                groups={[]}
              />
            </div>
          </>
        ) : (
          /* ── Track view: active timer ── */
          <>
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-[110] p-2 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm"
              title="Close Timer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex-1 min-h-0">
              <RuntimeTimerPanel
                block={block}
                view={view}
                onClose={handleClose}
                onComplete={handleComplete}
                isExpanded={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
