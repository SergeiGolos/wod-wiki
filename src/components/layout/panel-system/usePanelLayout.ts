/**
 * usePanelLayout Hook
 *
 * Manages panel layout state for a single view.
 * Handles expand/collapse operations and span management.
 */

import { useState, useCallback } from 'react';
import type { PanelDescriptor, PanelLayoutState, PanelSpan } from './types';

/**
 * Hook to manage panel layout state
 *
 * @param viewId - The ID of the view this layout manages
 * @param panels - The panel descriptors for this view
 * @returns Layout state and control functions
 *
 * @example
 * ```tsx
 * const layout = usePanelLayout('track', trackPanels);
 *
 * // Expand a panel
 * layout.expandPanel('timer-panel');
 *
 * // Collapse back to default layout
 * layout.collapsePanel();
 * ```
 */
export function usePanelLayout(
  viewId: string,
  panels: PanelDescriptor[]
): PanelLayoutState & {
  expandPanel: (panelId: string) => void;
  collapsePanel: () => void;
  setSpan: (panelId: string, span: PanelSpan) => void;
} {
  // Initialize panel spans from defaults
  const [panelSpans, setPanelSpans] = useState<Record<string, PanelSpan>>(() => {
    const spans: Record<string, PanelSpan> = {};
    panels.forEach((panel) => {
      spans[panel.id] = panel.defaultSpan;
    });
    return spans;
  });

  // Track which panel is expanded (null if none)
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null);

  // Store previous spans for restoration after collapse
  const [previousSpans, setPreviousSpans] = useState<Record<string, PanelSpan> | null>(null);

  /**
   * Expand a panel to full-screen
   * Stores current spans for later restoration
   */
  const expandPanel = useCallback(
    (panelId: string) => {
      // Store current spans before expanding
      setPreviousSpans({ ...panelSpans });

      // Set expanded panel to span=3, hide others
      const newSpans: Record<string, PanelSpan> = {};
      panels.forEach((panel) => {
        newSpans[panel.id] = panel.id === panelId ? 3 : panelSpans[panel.id];
      });

      setPanelSpans(newSpans);
      setExpandedPanelId(panelId);
    },
    [panels, panelSpans]
  );

  /**
   * Collapse the expanded panel, restoring previous spans
   */
  const collapsePanel = useCallback(() => {
    if (previousSpans) {
      // Restore previous spans
      setPanelSpans(previousSpans);
      setPreviousSpans(null);
    } else {
      // Fallback: restore default spans
      const defaultSpans: Record<string, PanelSpan> = {};
      panels.forEach((panel) => {
        defaultSpans[panel.id] = panel.defaultSpan;
      });
      setPanelSpans(defaultSpans);
    }

    setExpandedPanelId(null);
  }, [panels, previousSpans]);

  /**
   * Manually set a panel's span
   */
  const setSpan = useCallback((panelId: string, span: PanelSpan) => {
    setPanelSpans((current) => ({
      ...current,
      [panelId]: span,
    }));
  }, []);

  return {
    viewId,
    panelSpans,
    expandedPanelId,
    expandPanel,
    collapsePanel,
    setSpan,
  };
}
