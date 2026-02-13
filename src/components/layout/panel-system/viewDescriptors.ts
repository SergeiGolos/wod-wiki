/**
 * View Descriptors
 *
 * Default view configurations for the panel system.
 * Defines the three main views: Plan, Track, and Review.
 */

import React from 'react';
import { Edit, Timer, BarChart2, Calendar, BarChart3 } from 'lucide-react';
import type { ViewDescriptor, PanelSpan, PanelDescriptor } from './types';


/**
 * Plan View - Editor for authoring workout definitions
 *
 * Single full-width panel with Monaco Editor
 */
export function createPlanView(planPanel: React.ReactNode): ViewDescriptor {
  return {
    id: 'plan',
    label: 'Plan',
    icon: React.createElement(Edit, { className: 'w-4 h-4' }),
    panels: [
      {
        id: 'editor',
        title: 'Editor',
        icon: React.createElement(Edit, { className: 'w-4 h-4' }),
        defaultSpan: 3, // Full-screen
        content: planPanel,
      },
    ],
  };
}

/**
 * Track View - Live workout execution
 *
 * Two panels:
 * - Timer (2/3 width) - Primary timer display
 * - History (1/3 width) - Execution history log (hidden on mobile, embedded in primary)
 */
export function createTrackView(
  timerPanel: React.ReactNode,
  historyPanel: React.ReactNode,
  debugPanel?: React.ReactNode,
  isDebugMode = false
): ViewDescriptor {
  return {
    id: 'track',
    label: 'Track',
    icon: React.createElement(Timer, { className: 'w-4 h-4' }),
    panels: [
      {
        id: 'timer',
        title: 'Timer',
        icon: React.createElement(Timer, { className: 'w-4 h-4' }),
        defaultSpan: 2, // 2/3 width
        content: timerPanel,
      },
      {
        id: isDebugMode ? 'debug' : 'history',
        title: isDebugMode ? 'Debug' : 'History',
        icon: React.createElement(Timer, { className: 'w-4 h-4' }),
        defaultSpan: 1, // 1/3 width
        content: isDebugMode && debugPanel ? debugPanel : historyPanel,
        hideOnMobile: true, // Embedded in timer panel on mobile
      },
    ],
  };
}

/**
 * Review View - Post-workout analytics
 *
 * Two panels:
 * - History (1/3 width) - Execution history with segment selection
 * - Timeline (2/3 width) - Analytics visualization
 */
export function createReviewView(
  indexPanel: React.ReactNode,
  timelinePanel: React.ReactNode
): ViewDescriptor {
  return {
    id: 'review',
    label: 'Review',
    icon: React.createElement(BarChart2, { className: 'w-4 h-4' }),
    panels: [
      {
        id: 'analytics-index',
        title: 'History',
        icon: React.createElement(BarChart2, { className: 'w-4 h-4' }),
        defaultSpan: 1, // 1/3 width
        content: indexPanel,
      },
      {
        id: 'timeline',
        title: 'Timeline',
        icon: React.createElement(BarChart2, { className: 'w-4 h-4' }),
        defaultSpan: 2, // 2/3 width
        content: timelinePanel,
      },
    ],
  };
}

/**
 * Helper to get all view descriptors
 */
export function getAllViews(
  planPanel: React.ReactNode,
  timerPanel: React.ReactNode,
  historyPanel: React.ReactNode,
  indexPanel: React.ReactNode,
  timelinePanel: React.ReactNode,
  debugPanel?: React.ReactNode,
  isDebugMode = false
): ViewDescriptor[] {
  return [
    createPlanView(planPanel),
    createTrackView(timerPanel, historyPanel, debugPanel, isDebugMode),
    createReviewView(indexPanel, timelinePanel),
  ];
}

/**
 * History View - Browse and select stored workout entries
 *
 * With the stacked viewport approach, each view owns the full screen.
 * The History panel always uses span 3 (full width).
 */
export function createHistoryView(
  filterPanel: React.ReactNode,
  listPanel: React.ReactNode,
  previewPanel?: React.ReactNode, // Optional: Only shown if selected
): ViewDescriptor {
  const panels: PanelDescriptor[] = [
    {
      id: 'history-filter',
      title: 'Filter',
      icon: React.createElement(Calendar, { className: 'w-4 h-4' }),
      defaultSpan: 1,
      content: filterPanel,
    },
    {
      id: 'history-list',
      title: 'Workouts',
      icon: React.createElement(Calendar, { className: 'w-4 h-4' }),
      defaultSpan: (previewPanel ? 1 : 2) as PanelSpan,
      content: listPanel,
    }
  ];

  if (previewPanel) {
    panels.push({
      id: 'history-preview',
      title: 'Preview',
      icon: React.createElement(Calendar, { className: 'w-4 h-4' }),
      defaultSpan: 1,
      content: previewPanel,
      hideOnMobile: true,
    });
  }

  return {
    id: 'history',
    label: 'History',
    icon: React.createElement(Calendar, { className: 'w-4 h-4' }),
    panels,
  };
}

/**
 * Analyze View - Comparative analysis of multiple selected entries (placeholder)
 *
 * Single full-width panel containing the AnalyzePanel component.
 */
export function createAnalyzeView(analyzePanel: React.ReactNode): ViewDescriptor {
  return {
    id: 'analyze',
    label: 'Analyze',
    icon: React.createElement(BarChart3, { className: 'w-4 h-4' }),
    panels: [
      {
        id: 'analyze-main',
        title: 'Analyze',
        icon: React.createElement(BarChart3, { className: 'w-4 h-4' }),
        defaultSpan: 3,
        content: analyzePanel,
      },
    ],
  };
}
