/**
 * View Descriptors
 *
 * Default view configurations for the panel system.
 * Defines the three main views: Plan, Track, and Review.
 */

import React from 'react';
import { Edit, Timer, BarChart2 } from 'lucide-react';
import type { ViewDescriptor } from './types';

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
 * - History (1/3 width) - Execution history log (hidden on mobile, embedded in primary)
 * - Timer (2/3 width) - Primary timer display
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
        id: isDebugMode ? 'debug' : 'history',
        title: isDebugMode ? 'Debug' : 'History',
        icon: React.createElement(Timer, { className: 'w-4 h-4' }),
        defaultSpan: 1, // 1/3 width
        content: isDebugMode && debugPanel ? debugPanel : historyPanel,
        hideOnMobile: true, // Embedded in timer panel on mobile
      },
      {
        id: 'timer',
        title: 'Timer',
        icon: React.createElement(Timer, { className: 'w-4 h-4' }),
        defaultSpan: 2, // 2/3 width
        content: timerPanel,
      },
    ],
  };
}

/**
 * Review View - Post-workout analytics
 *
 * Two panels:
 * - Index (1/3 width) - Segment selection sidebar
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
        title: 'Segments',
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
