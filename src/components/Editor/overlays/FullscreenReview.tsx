import React, { useEffect, useState } from "react";
import { ReviewGrid } from "@/components/review-grid/ReviewGrid";
import { X } from "lucide-react";
import type { Segment } from "@/core/models/AnalyticsModels";

export interface FullscreenReviewProps {
  segments: Segment[];
  onClose: () => void;
  title?: string;
}

export const FullscreenReview: React.FC<FullscreenReviewProps> = ({
  segments,
  onClose,
  title = "Workout Review",
}) => {
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set());

  const handleSelectSegment = (id: number, modifiers?: { ctrlKey: boolean; shiftKey: boolean }, visibleIds?: number[]) => {
    setSelectedSegmentIds((prev) => {
      const next = new Set(prev);
      if (modifiers?.ctrlKey) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else if (modifiers?.shiftKey && visibleIds) {
        // Range selection logic
        const lastId = Array.from(prev).pop();
        if (lastId !== undefined) {
          const startIdx = visibleIds.indexOf(lastId);
          const endIdx = visibleIds.indexOf(id);
          if (startIdx !== -1 && endIdx !== -1) {
            const min = Math.min(startIdx, endIdx);
            const max = Math.max(startIdx, endIdx);
            for (let i = min; i <= max; i++) {
              next.add(visibleIds[i]);
            }
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

  // Prevent scrolling on the body while the review is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-full flex flex-col max-w-7xl mx-auto shadow-2xl border-x border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm"
            title="Close Review"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ReviewGrid
            runtime={null}
            segments={segments}
            selectedSegmentIds={selectedSegmentIds}
            onSelectSegment={handleSelectSegment}
            groups={[]}
          />
        </div>
      </div>
    </div>
  );
};
