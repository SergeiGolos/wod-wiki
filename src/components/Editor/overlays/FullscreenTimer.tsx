import React, { useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { RuntimeTimerPanel } from "./RuntimeTimerPanel";
import type { WodBlock, WorkoutResults } from "../types";
import { X } from "lucide-react";

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

  const handleClose = () => {
    setIsClosing(true);
    // Brief delay for any closing animations if we add them later
    setTimeout(onClose, 100);
  };

  // Prevent scrolling on the body while the timer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-full flex flex-col max-w-7xl mx-auto shadow-2xl border-x border-border bg-card overflow-hidden">
        {/* Close Button Overlay (Top Right) */}
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
            onComplete={onCompleteWorkout}
            isExpanded={true}
          />
        </div>
      </div>
    </div>
  );
};
