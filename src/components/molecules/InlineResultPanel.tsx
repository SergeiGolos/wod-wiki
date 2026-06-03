/**
 * InlineResultPanel
 *
 * React component rendered inside a CM6 widget (via createRoot).
 * Shows workout results for a single section with two states:
 *
 * Collapsed: Result rows with summary info (duration, date, time).
 * Expanded:  AnalyticsScorecard + full ReviewGrid (sort, filter, search, graph, user overrides).
 * Clicking a result row toggles its expanded state.
 * A "Full Review" button in the expanded view opens the FullscreenReview dialog.
 */

import React, { useState, useCallback } from 'react';
import { ReviewGrid } from '@/components/organisms/review/ReviewGrid';
import { AnalyticsScorecard, getMetricStyle } from '@/components/organisms/review/AnalyticsScorecard';
import { CollectionWizard } from '@/components/organisms/review/CollectionWizard';
import { useUserOverrides } from '@/components/organisms/review/useUserOverrides';
import { useCollectionMetrics, type CollectionItem } from '@/hooks/useCollectionMetrics';
import { useDebugMode } from '@/contexts/DebugModeContext';
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer';
import type { Segment } from '@/core/models/AnalyticsModels';
import type { WorkoutResult } from '@/types/storage';
import { MetricType } from '@/core/models/Metric';
import type { ProjectionResult } from '@/timeline/analytics/analytics/ProjectionResult';
import { ChevronDown, ChevronRight, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────

export interface InlineResultPanelProps {
  sectionId: string;
  results: WorkoutResult[];
  /** Open the full-screen review dialog */
  onOpenReview?: (result: WorkoutResult) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '--:--';
  const secs = Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Re-derive segments + projections from a WorkoutResult (pure, no hooks). */
function deriveSegmentsFromResult(result: WorkoutResult): {
  segments: Segment[];
  projections: ProjectionResult[];
} {
  if (!result?.data?.logs?.length) {
    return { segments: [], projections: [] };
  }
  const analytics = getAnalyticsFromLogs(result.data.logs, result.data.startTime);
  const segments = analytics.segments;

  // Extract projections the same way FullscreenReview does
  const projections: ProjectionResult[] = segments
    .filter((s) => (s as any).context?.outputType === 'analytics')
    .map((s) => {
      const metrics = s.metrics?.toArray() || [];
      const labelMetric = metrics.find((m) => m.type === MetricType.Label);
      const valueMetric = metrics.find((m) => m.type !== MetricType.Label);
      return {
        name: labelMetric?.value?.toString() || labelMetric?.image || 'Stat',
        value: (valueMetric?.value as number) || 0,
        unit: valueMetric?.unit || '',
        metricType: valueMetric?.type,
        timeSpan: { started: s.startTime, ended: s.endTime },
      };
    });

  return { segments, projections };
}

// ─── Component ─────────────────────────────────────────────────────

export const InlineResultPanel: React.FC<InlineResultPanelProps> = ({
  results,
  onOpenReview,
}) => {
  // Track which result is expanded (null = all collapsed)
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

  const toggleResult = useCallback(
    (resultId: string) => {
      setExpandedResultId((prev) => (prev === resultId ? null : resultId));
    },
    [],
  );

  return (
    <div className="cm-wod-results-inlay">
      {/* Separator line */}
      <div className="cm-wod-results-separator" />

      {results.map((result) => {
        const { segments, projections } = deriveSegmentsFromResult(result);
        const isExpanded = expandedResultId === result.id;

        return (
          <ResultRow
            key={result.id}
            result={result}
            segments={segments}
            projections={projections}
            isExpanded={isExpanded}
            onToggle={() => toggleResult(result.id)}
            onOpenReview={() => onOpenReview?.(result)}
          />
        );
      })}
    </div>
  );
};

// ─── ResultRow (single result entry) ──────────────────────────────

interface ResultRowProps {
  result: WorkoutResult;
  segments: Segment[];
  projections: ProjectionResult[];
  isExpanded: boolean;
  onToggle: () => void;
  onOpenReview: () => void;
}

const ResultRow: React.FC<ResultRowProps> = ({
  result,
  segments,
  projections,
  isExpanded,
  onToggle,
  onOpenReview,
}) => {
  const { isDebugMode } = useDebugMode();
  const { overrides, setOverride } = useUserOverrides(false);
  const { collectionItems } = useCollectionMetrics(segments, overrides);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set());

  const duration = formatDuration(result.data?.duration ?? 0);
  const timeLabel = formatTime(result.completedAt);
  const dateLabel = formatDateShort(result.completedAt);

  const handleSelectSegment = useCallback(
    (id: number, modifiers?: { ctrlKey: boolean; shiftKey: boolean }, visibleIds?: number[]) => {
      setSelectedSegmentIds((prev) => {
        const next = new Set(prev);
        if (modifiers?.ctrlKey) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        } else if (modifiers?.shiftKey && visibleIds) {
          const lastId = Array.from(prev).pop();
          if (lastId !== undefined) {
            const startIdx = visibleIds.indexOf(lastId);
            const endIdx = visibleIds.indexOf(id);
            if (startIdx !== -1 && endIdx !== -1) {
              const min = Math.min(startIdx, endIdx);
              const max = Math.max(startIdx, endIdx);
              for (let i = min; i <= max; i++) next.add(visibleIds[i]);
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
    },
    [],
  );

  const handleCollectionSave = useCallback(
    (item: CollectionItem, value: any) => {
      if (item.kind !== 'value') return;
      setOverride(item.blockKey, item.metricType, value);
    },
    [setOverride],
  );

  return (
    <div className="border-b border-border/30 last:border-b-0">
      {/* Collapsed header row */}
      <button
        type="button"
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left group w-full"
        onClick={onToggle}
      >
        {/* Expand/collapse chevron */}
        <span className="flex-shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>

        {/* Time column */}
        <div className="flex-shrink-0 w-14 text-right">
          <div className="flex items-center justify-end gap-1">
            <span className="text-muted-foreground/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </span>
            <span className="text-[10px] font-black text-muted-foreground/60 tabular-nums">
              {timeLabel}
            </span>
          </div>
        </div>

        {/* Status icon */}
        <div className="flex-shrink-0 size-7 rounded-lg bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
          <span className="text-emerald-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>
          </span>
        </div>

        {/* Text column */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {duration !== '--:--' ? duration : 'Result'}
          </h3>
          <p className="text-[11px] text-muted-foreground truncate">{dateLabel}</p>
        </div>

        {/* Inline metric chips — visible in both collapsed and expanded */}
        {projections.length > 0 && (
          <div className="flex items-center gap-1.5 flex-shrink-0 overflow-hidden">
            {projections.slice(0, 3).map((proj, idx) => {
              const { icon, colors } = getMetricStyle(
                (proj.metricType?.toString() ?? 'metric')
              );
              return (
                <span
                  key={`${proj.name}-${idx}`}
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border whitespace-nowrap',
                    colors.text,
                    colors.border,
                    colors.bg
                  )}
                  title={`${proj.name}: ${proj.value.toLocaleString()}${proj.unit ? ' ' + proj.unit : ''}`}
                >
                  <span className="opacity-70">{icon}</span>
                  <span className="tabular-nums">{proj.value.toLocaleString()}</span>
                  {proj.unit && <span className="opacity-60 font-normal">{proj.unit}</span>}
                </span>
              );
            })}
            {projections.length > 3 && (
              <span className="text-[10px] text-muted-foreground px-1">
                +{projections.length - 3}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Analytics scorecard — shown only when expanded */}
      {isExpanded && projections.length > 0 && (
        <div className="px-4 pb-2">
          <AnalyticsScorecard projections={projections} />
        </div>
      )}

      {/* Expanded: full ReviewGrid */}
      {isExpanded && (
        <div className="px-4 pb-3">
          {/* Collection banner */}
          {collectionItems.length > 0 && (
            <div className="mb-3 border-b border-border bg-warning/5 -mx-4 px-4 py-3">
              <CollectionWizard
                items={collectionItems}
                onSave={handleCollectionSave}
                onSkip={() => {}}
                mode="post-run"
              />
            </div>
          )}

          {/* ReviewGrid */}
          {segments.length > 0 && (
            <div className="border border-border rounded-2xl bg-card overflow-hidden">
              <ReviewGrid
                runtime={null}
                segments={segments}
                selectedSegmentIds={selectedSegmentIds}
                onSelectSegment={handleSelectSegment}
                groups={[]}
                userOutputOverrides={overrides}
                gridViewPreset={isDebugMode ? 'debug' : 'default'}
              />
            </div>
          )}

          {/* Full Review button */}
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReview();
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
            >
              <Maximize2 className="h-3 w-3" />
              Full Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
