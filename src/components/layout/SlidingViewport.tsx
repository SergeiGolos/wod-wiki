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

export type ViewMode = 'plan' | 'track' | 'analyze';

export interface SlidingViewportProps {
  /** Current view mode */
  currentView: ViewMode;
  
  /** Callback when view changes */
  onViewChange: (view: ViewMode) => void;
  
  /** Plan view panels */
  planPrimaryPanel: React.ReactNode;   // Monaco Editor (2/3)
  planIndexPanel: React.ReactNode;     // EditorIndexPanel (1/3)
  
  /** Track view panels */
  trackIndexPanel: React.ReactNode;    // TimerIndexPanel (1/3)
  trackPrimaryPanel: React.ReactNode;  // TimerDisplay (2/3)
  trackDebugPanel?: React.ReactNode;   // RuntimeDebugPanel (optional 1/3)
  
  /** Analyze view panels */
  analyzeIndexPanel: React.ReactNode;  // AnalyticsIndexPanel (1/3)
  analyzePrimaryPanel: React.ReactNode; // TimelineView (2/3)
  
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
  analyze: '-66.666%',
};

/**
 * SlidingViewport Component
 */
export const SlidingViewport: React.FC<SlidingViewportProps> = ({
  currentView,
  onViewChange,
  planPrimaryPanel,
  planIndexPanel,
  trackIndexPanel,
  trackPrimaryPanel,
  trackDebugPanel,
  analyzeIndexPanel,
  analyzePrimaryPanel,
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
          if (currentView === 'analyze') onViewChange('track');
          else if (currentView === 'track') onViewChange('plan');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (currentView === 'plan') onViewChange('track');
          else if (currentView === 'track') onViewChange('analyze');
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
        {/* Hidden Monaco Editor - Must be rendered for WOD block parsing to work */}
        <div className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
          {planPrimaryPanel}
        </div>
        
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{
            width: '300%',
            transform: `translateX(${viewOffsets[currentView]})`,
          }}
        >
          {/* Plan View - Full Screen Editor Index */}
          <div className="w-1/3 h-full flex-shrink-0">
            {planIndexPanel}
          </div>

          {/* Track View - 50/50 Vertical Split */}
          <div className="w-1/3 h-full flex-shrink-0 flex flex-col">
            <div className="h-1/2 flex-shrink-0 border-b border-border overflow-hidden">
              {trackPrimaryPanel}
            </div>
            <div className="h-1/2 flex-shrink-0 overflow-hidden">
              {trackIndexPanel}
            </div>
          </div>

          {/* Analyze View - Full Screen Timeline */}
          <div className="w-1/3 h-full flex-shrink-0">
            {analyzePrimaryPanel}
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
          {/* Plan View - Stacked */}
          <div className="w-1/3 h-full flex-shrink-0 flex flex-col">
            <div className="flex-1 overflow-hidden">
              {planPrimaryPanel}
            </div>
            <div className="h-1/3 border-t border-border overflow-hidden">
              {planIndexPanel}
            </div>
          </div>

          {/* Track View - 50/50 vertical */}
          <div className="w-1/3 h-full flex-shrink-0 flex flex-col">
            <div className="h-1/2 border-b border-border overflow-hidden">
              {trackPrimaryPanel}
            </div>
            <div className="h-1/2 overflow-hidden">
              {trackIndexPanel}
            </div>
          </div>

          {/* Analyze View - Stacked */}
          <div className="w-1/3 h-full flex-shrink-0 flex flex-col">
            <div className="flex-1 overflow-hidden">
              {analyzePrimaryPanel}
            </div>
            <div className="h-1/3 border-t border-border overflow-hidden">
              {analyzeIndexPanel}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout - Side-by-side panels with optional debug
  const trackWidthClass = isDebugMode ? 'w-1/3' : 'w-2/3';

  return (
    <div className={cn('h-full w-full overflow-hidden', className)}>
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{
          width: '300%',
          transform: `translateX(${viewOffsets[currentView]})`,
        }}
      >
        {/* Plan View - Editor (2/3) + Index (1/3) */}
        <div className="w-1/3 h-full flex-shrink-0 flex">
          <div className="w-2/3 h-full border-r border-border overflow-hidden">
            {planPrimaryPanel}
          </div>
          <div className="w-1/3 h-full overflow-hidden">
            {planIndexPanel}
          </div>
        </div>

        {/* Track View - Index (1/3) + Timer (1/3 or 2/3) + Debug (1/3 if enabled) */}
        <div className="w-1/3 h-full flex-shrink-0 flex">
          <div className="w-1/3 h-full border-r border-border overflow-hidden">
            {trackIndexPanel}
          </div>
          <div className={cn('h-full overflow-hidden transition-all duration-300', trackWidthClass)}>
            {trackPrimaryPanel}
          </div>
          {isDebugMode && trackDebugPanel && (
            <div className="w-1/3 h-full border-l border-border overflow-hidden">
              {trackDebugPanel}
            </div>
          )}
        </div>

        {/* Analyze View - Index (1/3) + Timeline (2/3) */}
        <div className="w-1/3 h-full flex-shrink-0 flex">
          <div className="w-1/3 h-full border-r border-border overflow-hidden">
            {analyzeIndexPanel}
          </div>
          <div className="w-2/3 h-full overflow-hidden">
            {analyzePrimaryPanel}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidingViewport;
