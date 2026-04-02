import React, { useState } from "react";
import { ReviewGrid } from "@/components/review-grid/ReviewGrid";
import type { Segment } from "@/core/models/AnalyticsModels";
import { FocusedDialog } from "./FocusedDialog";
import { CastButtonRpc } from "@/components/cast/CastButtonRpc";
import { AudioToggle } from "@/components/audio/AudioToggle";

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

  return (
    <FocusedDialog title={title} onClose={onClose} variant="minimal" actions={<><CastButtonRpc /><AudioToggle /></>}>
      <ReviewGrid
        runtime={null}
        segments={segments}
        selectedSegmentIds={selectedSegmentIds}
        onSelectSegment={handleSelectSegment}
        groups={[]}
      />
    </FocusedDialog>
  );
};
