/**
 * Panel System Types
 *
 * Core type definitions for the responsive panel system.
 * Supports flexible panel layouts with 1/3, 2/3, and full-screen spans.
 */

import React from 'react';

/**
 * Panel span values (fraction of the view)
 * - 1 = 1/3 width (sidebar panel)
 * - 2 = 2/3 width (primary content panel)
 * - 3 = Full width (expanded or single-panel view)
 */
export type PanelSpan = 1 | 2 | 3;

/**
 * Screen mode based on viewport width
 * - desktop: ≥ 1024px
 * - tablet: 768px - 1023px
 * - mobile: < 768px
 */
export type ScreenMode = 'desktop' | 'tablet' | 'mobile';

/**
 * Individual panel descriptor
 * Defines a single panel within a view, including its content and default sizing.
 */
export interface PanelDescriptor {
  /** Unique identifier for this panel */
  id: string;

  /** Display title for panel header */
  title: string;

  /** Optional icon to display in panel header */
  icon?: React.ReactNode;

  /** Default span when panel is not expanded */
  defaultSpan: PanelSpan;

  /** Content to render inside the panel */
  content: React.ReactNode;

  /** Whether this panel should be hidden on mobile (will be embedded in another panel) */
  hideOnMobile?: boolean;
}

/**
 * A view is a named collection of panels
 * Each view represents a major mode in the workbench (Plan, Track, Review)
 */
export interface ViewDescriptor {
  /** Unique identifier for this view */
  id: string;

  /** Display label for view */
  label: string;

  /** Icon for view navigation */
  icon: React.ReactNode;

  /** Panels that comprise this view */
  panels: PanelDescriptor[];
}

/**
 * Panel layout state (managed in context)
 * Tracks current panel sizing and expansion state for a single view.
 */
export interface PanelLayoutState {
  /** The view this layout state belongs to */
  viewId: string;

  /** Current span for each panel (panelId → current span) */
  panelSpans: Record<string, PanelSpan>;

  /** Which panel (if any) is currently expanded to full-screen */
  expandedPanelId: string | null;
}

/**
 * Panel layout actions
 * Methods for manipulating panel layout state
 */
export interface PanelLayoutActions {
  /** Expand a panel to full-screen (span=3) */
  expandPanel: (viewId: string, panelId: string) => void;

  /** Collapse the currently expanded panel, restoring previous spans */
  collapsePanel: (viewId: string) => void;

  /** Manually set a panel's span */
  setSpan: (viewId: string, panelId: string, span: PanelSpan) => void;
}

/**
 * Strip configuration — defines the views and layout for a given strip mode.
 * Used by the ResponsiveViewport to dynamically adjust the sliding strip.
 */
export interface StripConfiguration {
  mode: import('@/types/history').StripMode;
  views: ViewDescriptor[];
  stripWidth: string;
  offsets: Record<string, string>;
}
