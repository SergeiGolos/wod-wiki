/**
 * SlidingViewport - Core component for the unified responsive layout
 * 
 * Implements the "sliding viewport" mental model where the app is a viewport
 * sliding horizontally across a continuous strip of panels.
 * 
 * Desktop: Full sliding strip with 2/3 + 1/3 panel pairs
 * Tablet: Slide with bottom sheets for index panels
 * Mobile: Full-screen slides with 50/50 split for Track view
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type ViewMode = 'plan' | 'track' | 'review';

export interface SlidingViewportProps {
  /** Current view mode */
  currentView: ViewMode;

  /** Callback when view changes */
  onViewChange: (view: ViewMode) => void;

  /** Plan view panel - Full width Monaco editor */
  planPanel: React.ReactNode;

  /** Track view panels */
  trackIndexPanel: React.ReactNode;    // TimerIndexPanel (1/3)
  trackPrimaryPanel: React.ReactNode;  // TimerDisplay (2/3)
  trackDebugPanel?: React.ReactNode;   // RuntimeDebugPanel (optional 1/3)

  /** Review view panels */
  reviewIndexPanel: React.ReactNode;  // AnalyticsIndexPanel (1/3)
  reviewPrimaryPanel: React.ReactNode; // TimelineView (2/3)

  /** Whether debug mode is enabled */
  isDebugMode?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Calculate viewport offset based on current view
 */
const viewOffsets: Record<ViewMode, string> = {
  plan: '0%',
  track: '-33.333%',
  review: '-66.666%',
};

/**
 * SlidingViewport Component
 */
export const SlidingViewport: React.FC<SlidingViewportProps> = ({
  currentView,
  onViewChange,
  planPanel,
  trackIndexPanel,
  trackPrimaryPanel,
  trackDebugPanel,
  reviewIndexPanel,
  reviewPrimaryPanel,
  isDebugMode = false,
  className,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Responsive breakpoint detection
  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Ctrl/Cmd + Arrow for view navigation
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (currentView === 'review') onViewChange('track');
          else if (currentView === 'track') onViewChange('plan');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (currentView === 'plan') onViewChange('track');
          else if (currentView === 'track') onViewChange('review');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, onViewChange]);

  // Mobile Layout - Full screen slides with special Track view
  if (isMobile) {
    return (
      <div className={cn('h-full w-full overflow-hidden', className)}>
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{
            width: '300%',
            transform: `translateX(${viewOffsets[currentView]})`,
          }}
        >
          {/* Plan View - Full Screen Monaco Editor */}
          <div className="w-1/3 h-full flex-shrink-0">
            {planPanel}
          </div>

          {/* Track View - Full Height Primary (Primary handles internal layout) */}
          <div className="w-1/3 h-full flex-shrink-0 overflow-hidden">
            {trackPrimaryPanel}
          </div>

          {/* Review View - Full Screen Timeline */}
          <div className="w-1/3 h-full flex-shrink-0">
            {reviewPrimaryPanel}
          </div>
        </div>
      </div>
    );
  }

  // Tablet Layout - Stacked with bottom sheets
  if (isTablet) {
    return (
      <div className={cn('h-full w-full overflow-hidden', className)}>
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{
            width: '300%',
            transform: `translateX(${viewOffsets[currentView]})`,
          }}
        >
          {/* Plan View - Full width Monaco Editor */}
          <div className="w-1/3 h-full flex-shrink-0">
            {planPanel}
          </div>

          {/* Track View - Index on top (40%), Timer below (60%) - same as mobile */}
          <div className="w-1/3 h-full flex-shrink-0 flex flex-col">
            <div className="h-[40%] border-b border-border overflow-hidden">
              {trackIndexPanel}
            </div>
            <div className="h-[60%] overflow-hidden">
              {trackPrimaryPanel}
            </div>
          </div>

          {/* Review View - Stacked */}
          <div className="w-1/3 h-full flex-shrink-0 flex flex-col">
            <div className="flex-1 overflow-hidden">
              {reviewPrimaryPanel}
            </div>
            <div className="h-1/3 border-t border-border overflow-hidden">
              {reviewIndexPanel}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout - Side-by-side panels with optional debug
  // When debug is enabled: Timer (2/3) + Debug (1/3) - debug replaces history
  // When debug is disabled: Timer (2/3) + History (1/3)

  return (
    <div className={cn('h-full w-full overflow-hidden', className)}>
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{
          width: '300%',
          transform: `translateX(${viewOffsets[currentView]})`,
        }}
      >
        {/* Plan View - Full width Monaco Editor only */}
        <div className="w-1/3 h-full flex-shrink-0">
          {planPanel}
        </div>

        {/* Track View - Timer (2/3) + History/Debug (1/3) - debug replaces history when enabled */}
        <div className="w-1/3 h-full flex-shrink-0 flex">
          <div className="w-2/3 h-full overflow-hidden border-r border-border">
            {trackPrimaryPanel}
          </div>
          <div className="w-1/3 h-full overflow-hidden flex-shrink-0">
            {isDebugMode && trackDebugPanel ? trackDebugPanel : trackIndexPanel}
          </div>
        </div>

        {/* Review View - Index (1/3) + Timeline (2/3) */}
        <div className="w-1/3 h-full flex-shrink-0 flex">
          <div className="w-1/3 h-full border-r border-border overflow-hidden">
            {reviewIndexPanel}
          </div>
          <div className="w-2/3 h-full overflow-hidden">
            {reviewPrimaryPanel}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidingViewport;
