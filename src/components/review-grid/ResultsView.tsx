/**
 * ResultsView — Consolidated results page with analytics carousel + data grid.
 *
 * Integrates AnalyticsScorecard (horizontal metric carousel) with ReviewGrid
 * (data table) into a single responsive layout.
 *
 * Desktop: Full-width, information-dense. Carousel is compact above the grid.
 * Mobile: Carousel scrolls horizontally, table scrolls both axes.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Segment, AnalyticsGroup } from '@/core/models/AnalyticsModels';
import type { IScriptRuntime } from '@/hooks/useRuntimeTimer';
import { MetricType, type IMetric } from '@/core/models/Metric';
import type { ProjectionResult } from '@/core/analytics/ProjectionResult';
import { ReviewGrid } from './ReviewGrid';
import { AnalyticsScorecard } from '@/components/review/AnalyticsScorecard';
import { useDebugMode } from '@/components/layout/DebugModeContext';
import { cn } from '@/lib/utils';

// ─── Props ─────────────────────────────────────────────────────

export interface ResultsViewProps {
  /** Script runtime instance */
  runtime: IScriptRuntime | null;
  /** Analytics segments from the transformer */
  segments: Segment[];
  /** Currently selected segment IDs */
  selectedSegmentIds: Set<number>;
  /** Segment selection handler */
  onSelectSegment: (id: number, modifiers?: { ctrlKey: boolean; shiftKey: boolean }, visibleIds?: number[]) => void;
  /** Analytics groups */
  groups: AnalyticsGroup[];
  /** Session-level projections for the scorecard carousel */
  projections?: ProjectionResult[];
  /** User override map from the store */
  userOutputOverrides?: Map<string, IMetric[]>;
  /** Active grid preset id from the store */
  gridViewPreset?: string;
  /** Callback to update the preset in the store */
  onPresetChange?: (presetId: string) => void;
  /** Block key currently hovered in other panels */
  hoveredBlockKey?: string | null;
  /** Callback for cross-panel hover highlighting */
  onHoverBlockKey?: (key: string | null) => void;
  /** Optional className for the container */
  className?: string;
}

// ─── Workout type filter tabs ──────────────────────────────────

type WorkoutFilter = 'all' | 'strength' | 'endurance' | 'general';

const FILTER_TABS: { id: WorkoutFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'general', label: 'General', icon: '📄' },
  { id: 'strength', label: 'Strength', icon: '💪' },
  { id: 'endurance', label: 'Endurance', icon: '🏃' },
];

// ─── Component ─────────────────────────────────────────────────

export const ResultsView: React.FC<ResultsViewProps> = ({
  runtime,
  segments,
  selectedSegmentIds,
  onSelectSegment,
  groups,
  projections = [],
  userOutputOverrides,
  gridViewPreset,
  onPresetChange,
  hoveredBlockKey,
  onHoverBlockKey,
  className,
}) => {
  const { isDebugMode } = useDebugMode();
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [workoutFilter, setWorkoutFilter] = useState<WorkoutFilter>('all');

  // Filter segments based on workout type tab
  const filteredSegments = useMemo(() => {
    if (workoutFilter === 'all') return segments;

    // Heuristic: strength workouts have rep/resistance/load metrics
    // endurance workouts have distance/duration metrics
    return segments.filter((seg) => {
      const metrics = seg.metrics?.toArray() || [];
      const types = new Set(metrics.map((m) => m.type));

      switch (workoutFilter) {
        case 'strength':
          return types.has(MetricType.Rep) || types.has(MetricType.Resistance) || types.has(MetricType.Load);
        case 'endurance':
          return types.has(MetricType.Distance) || types.has(MetricType.Duration);
        case 'general':
          // General = not clearly strength or endurance
          const isStrength = types.has(MetricType.Rep) || types.has(MetricType.Resistance) || types.has(MetricType.Load);
          const isEndurance = types.has(MetricType.Distance) || types.has(MetricType.Duration);
          return !isStrength && !isEndurance;
        default:
          return true;
      }
    });
  }, [segments, workoutFilter]);

  const handleSelectMetric = useCallback((name: string) => {
    setSelectedMetric((prev) => (prev === name ? null : name));
  }, []);

  return (
    <div className={cn('h-full flex flex-col bg-background', className)}>
      {/* ── Analytics Carousel ─────────────────────────────── */}
      {projections.length > 0 && (
        <AnalyticsScorecard
          projections={projections}
          onSelectMetric={handleSelectMetric}
          selectedMetric={selectedMetric}
        />
      )}

      {/* ── Filter Tabs ────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1 px-4 py-1.5 border-b border-border/50 bg-muted/20">
        <span className="text-[10px] font-bold tracking-label uppercase text-muted-foreground mr-2">
          Filter
        </span>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setWorkoutFilter(tab.id)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all',
              workoutFilter === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Data Grid ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <ReviewGrid
          runtime={runtime}
          segments={filteredSegments}
          selectedSegmentIds={selectedSegmentIds}
          onSelectSegment={onSelectSegment}
          groups={groups}
          userOutputOverrides={userOutputOverrides}
          gridViewPreset={gridViewPreset}
          onPresetChange={onPresetChange}
          hoveredBlockKey={hoveredBlockKey}
          onHoverBlockKey={onHoverBlockKey}
        />
      </div>
    </div>
  );
};
