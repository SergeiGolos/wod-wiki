/**
 * ResponsiveViewport - Replacement for SlidingViewport
 *
 * Core component for the unified responsive layout with improved panel system.
 * Implements the "sliding viewport" mental model with composable panels.
 *
 * Features:
 * - Sliding view transitions (Plan → Track → Review)
 * - Composable panel system with PanelGrid
 * - Screen-mode-aware layouts (desktop, tablet, mobile)
 * - Keyboard navigation (Ctrl+Arrow keys)
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ViewDescriptor } from './panel-system/types';
import { PanelGrid } from './panel-system/PanelGrid';
import { useScreenMode } from './panel-system/useScreenMode';

export type ViewMode = 'plan' | 'track' | 'review';

export interface ResponsiveViewportProps {
  /** All view descriptors */
  views: ViewDescriptor[];

  /** Current view mode */
  currentView: ViewMode;

  /** Callback when view changes */
  onViewChange: (view: ViewMode) => void;

  /** Panel layout state from WorkbenchContext */
  panelLayouts: Record<string, any>;

  /** Expand panel callback */
  onExpandPanel: (viewId: string, panelId: string) => void;

  /** Collapse panel callback */
  onCollapsePanel: (viewId: string) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Calculate viewport offset based on current view index
 */
const viewOffsets: Record<ViewMode, string> = {
  plan: '0%',
  track: '-100%',
  review: '-200%',
};

/**
 * ResponsiveViewport - Sliding viewport with composable panel system
 *
 * Layout:
 * - Horizontal strip of views (Plan, Track, Review)
 * - Each view contains a PanelGrid with its panels
 * - Smooth sliding transitions between views
 * - Keyboard navigation support
 */
export function ResponsiveViewport({
  views,
  currentView,
  onViewChange,
  panelLayouts,
  onExpandPanel,
  onCollapsePanel,
  className,
}: ResponsiveViewportProps) {
  const screenMode = useScreenMode();

  // Find current view index
  const viewIndex = useMemo(() => {
    const idx = views.findIndex((v) => v.id === currentView);
    return idx >= 0 ? idx : 0;
  }, [views, currentView]);

  // Calculate transform offset
  const translateX = useMemo(() => {
    return `-${viewIndex * 100}%`;
  }, [viewIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (!isCtrlOrCmd) return;

      if (e.key === 'ArrowLeft' && viewIndex > 0) {
        e.preventDefault();
        onViewChange(views[viewIndex - 1].id as ViewMode);
      } else if (e.key === 'ArrowRight' && viewIndex < views.length - 1) {
        e.preventDefault();
        onViewChange(views[viewIndex + 1].id as ViewMode);
      }
    },
    [viewIndex, views, onViewChange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)}>
      {/* Sliding Strip Container */}
      <div
        className={cn(
          'absolute inset-0 flex',
          'transition-transform duration-500 ease-in-out'
        )}
        style={{
          width: `${views.length * 100}%`,
          transform: `translateX(${translateX})`,
        }}
      >
        {/* Render each view */}
        {views.map((view) => {
          // Get layout state for this view (or create default)
          const layoutState = panelLayouts[view.id] || {
            viewId: view.id,
            panelSpans: view.panels.reduce(
              (acc, panel) => {
                acc[panel.id] = panel.defaultSpan;
                return acc;
              },
              {} as Record<string, number>
            ),
            expandedPanelId: null,
          };

          return (
            <div
              key={view.id}
              className="flex-shrink-0 h-full"
              style={{ width: `${100 / views.length}%` }}
              data-view-id={view.id}
            >
              <PanelGrid
                panels={view.panels}
                layoutState={layoutState}
                onExpandPanel={(panelId) => onExpandPanel(view.id, panelId)}
                onCollapsePanel={() => onCollapsePanel(view.id)}
                className="h-full"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
