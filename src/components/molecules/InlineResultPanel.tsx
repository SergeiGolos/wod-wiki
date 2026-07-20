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

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { ReviewGrid } from '@/components/organisms/review/ReviewGrid';
import { AnalyticsScorecard, getMetricStyle } from '@/components/organisms/review/AnalyticsScorecard';
import { CollectionWizard } from '@/components/organisms/review/CollectionWizard';
import { useUserOverrides } from '@/components/organisms/review/useUserOverrides';
import { useCollectionMetrics, type CollectionItem } from '@/hooks/useCollectionMetrics';
import { useDebugMode } from '@/contexts/DebugModeContext';
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer';
import type { Segment } from '@/core/models/AnalyticsModels';
import type { WorkoutResult } from '@/types/storage';
import { groupResultsByVersion } from '@/utils/groupResultsByVersion';
import { notePersistence } from '@/services/persistence';
import { MetricType } from '@/core/models/Metric';

import type { ProjectionResult } from '@/core/analytics/ProjectionResult';
import { ChevronDown, ChevronRight, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────

export interface InlineResultPanelProps {
  sectionId: string;
  /** All results for this blockId (all versions). Widget groups into current + history. */
  allResults: WorkoutResult[];
  /** Section's current contentId — used to determine which results are "current". */
  currentContentId?: string;
  /** Open the full-screen review dialog */
  onOpenReview?: (result: WorkoutResult) => void;
  /**
  /** When true, clicking a result row opens the fullscreen review directly
   * instead of expanding inline. Used by canvas pages where the editor panel
   * is too small for the inline ReviewGrid.
   */
  compactMode?: boolean;
  /** Note ID of the current document; used to exclude own results from cross-note lookups. */
  noteId?: string;
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
export const InlineResultPanel: React.FC<InlineResultPanelProps> = ({
  allResults,
  currentContentId,
  onOpenReview,
  compactMode = false,
  noteId,
}) => {
  // Track which result is expanded (null = all collapsed)
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAcrossNotes, setShowAcrossNotes] = useState(false);
  const [acrossNotesResults, setAcrossNotesResults] = useState<WorkoutResult[]>([]);
  const [noteTitleMap, setNoteTitleMap] = useState<Map<string, string>>(new Map());

  // Fetch results for this same workout recorded in other notes.
  // Guard: skip when the backend adapter doesn't implement the query, and
  // ignore stale responses if the block or note changes while fetching.
  useEffect(() => {
    if (
      compactMode ||
      !currentContentId ||
      !noteId ||
      typeof notePersistence.getSimilarWorkoutResults !== 'function'
    ) {
      setAcrossNotesResults([]);
      setNoteTitleMap(new Map());
      return;
    }

    let cancelled = false;

    async function fetchAcrossNotes() {
      try {
        const results = await notePersistence.getSimilarWorkoutResults!(currentContentId!, {
          excludeNoteId: noteId,
          limit: 10,
        });

        if (cancelled) return;
        setAcrossNotesResults(results);

        const uniqueNoteIds = Array.from(new Set(results.map((r) => r.noteId)));
        const titleMap = new Map<string, string>();

        await Promise.all(
          uniqueNoteIds.map(async (id) => {
            try {
              const entry = await notePersistence.getNote(id, { projection: 'summary' });
              if (entry?.title) {
                titleMap.set(id, entry.title);
              }
            } catch {
              // Fallback to the raw noteId below.
            }
          }),
        );

        if (!cancelled) {
          setNoteTitleMap(titleMap);
        }
      } catch {
        if (!cancelled) {
          setAcrossNotesResults([]);
        }
      }
    }

    fetchAcrossNotes();

    return () => {
      cancelled = true;
    };
  }, [compactMode, currentContentId, noteId]);

  const toggleResult = useCallback(
    (resultId: string) => {
      setExpandedResultId((prev) => (prev === resultId ? null : resultId));
    },
    [],
  );

  // Group results by version (derived from allResults + currentContentId)
 const { current, currentVersion, history } = useMemo(
    () => groupResultsByVersion(allResults, undefined, currentContentId),
    [allResults, currentContentId],
  )

  const hasCurrent = current.length > 0
  const hasHistory = history.size > 0
  const sortedHistory = Array.from(history.entries()).sort((a, b) => b[0] - a[0])

  return (
    <div className="cm-wod-results-inlay">
      {/* Separator line */}
      <div className="cm-wod-results-separator" />

      {/* Version header — only when there's history (multi-version block) */}
      {hasHistory && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] text-muted-foreground">
          <span className={hasCurrent ? 'text-emerald-500' : 'text-muted-foreground/50'}>
            {hasCurrent ? '●' : '○'}
          </span>
          <span>
            {hasCurrent
              ? `v${currentVersion} · ${current.length} result${current.length === 1 ? '' : 's'}`
              : `No results · v${currentVersion}`}
          </span>
          <button
            type="button"
            className="ml-auto text-primary hover:underline"
            onClick={() => setShowHistory(v => !v)}
          >
            {showHistory ? '▴ Hide' : `▾ ${sortedHistory.length} previous`}
          </button>
        </div>
      )}

      {/* Current-version result rows */}
      {current.map((result) => {
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
            compactMode={compactMode}
          />
        );
      })}

      {/* History compact cards — shown when toggle is open */}
      {showHistory && sortedHistory.length > 0 && (
        <div className="border-t border-border/30 px-4 py-2 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Previous Versions
          </div>
          {sortedHistory.map(([version, group]) => (
            <div
              key={version}
              className="rounded-md border border-border/40 bg-muted/30 px-3 py-2 opacity-80"
            >
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-semibold">v{version}</span>
                <span className="truncate flex-1">
                  {group.contentId ? `hash: ${group.contentId.slice(0, 12)}…` : 'no contentId'}
                </span>
                <span>{group.results.length} result{group.results.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Across notes — results for the same workout in other notes.
          Hidden in compact mode because the inline panel density trade-off
          there prioritizes direct review; this supplementary section is not
          worth the extra vertical space when space is constrained. */}
      {!compactMode && acrossNotesResults.length > 0 && (
        <div className="border-t border-border/30 px-4 py-2">
          <button
            type="button"
            onClick={() => setShowAcrossNotes((v) => !v)}
            className="flex items-center gap-2 w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-semibold uppercase tracking-wider">Across notes</span>
            <span className="text-muted-foreground/70">({acrossNotesResults.length})</span>
            <span className="ml-auto">{showAcrossNotes ? '▴ Hide' : '▾ Show'}</span>
          </button>

          {showAcrossNotes && (
            <div className="mt-2 space-y-1">
              {acrossNotesResults.map((result) => (
                <AcrossNoteRow
                  key={result.id}
                  result={result}
                  noteTitle={noteTitleMap.get(result.noteId)}
                  onOpenReview={onOpenReview}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── AcrossNoteRow (single cross-note result entry) ─────────────────

interface AcrossNoteRowProps {
  result: WorkoutResult;
  noteTitle?: string;
  onOpenReview?: (result: WorkoutResult) => void;
}

const AcrossNoteRow: React.FC<AcrossNoteRowProps> = ({
  result,
  noteTitle,
  onOpenReview,
}) => {
  const dateLabel = formatDateShort(result.createdAt);
  const statusLabel = result.data?.completed ? 'Completed' : 'Partial';
  const completed = !!result.data?.completed;

  return (
    <button
      type="button"
      onClick={() => onOpenReview?.(result)}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left group w-full rounded-md border border-border/40 bg-muted/30"
    >
      <span
        className={cn(
          'flex-shrink-0 size-7 rounded-lg flex items-center justify-center transition-colors',
          completed
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'bg-amber-500/10 text-amber-500'
        )}
      >
        {completed ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21.801 10A10 10 0 1 1 17 3.335" />
            <path d="m9 11 3 3L22 4" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
      </span>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate">
          {noteTitle || result.noteId}
        </h3>
        <p className="text-[11px] text-muted-foreground truncate">
          {dateLabel} · {statusLabel}
        </p>
      </div>

      <span className="flex-shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
        <Maximize2 className="h-3.5 w-3.5" />
      </span>
    </button>
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
  compactMode?: boolean;
}

const ResultRow: React.FC<ResultRowProps> = ({
  result,
  segments,
  projections,
  isExpanded,
  onToggle,
  onOpenReview,
  compactMode = false,
}) => {
  const { isDebugMode } = useDebugMode();
  const { overrides, setOverride } = useUserOverrides(false);
  const { collectionItems } = useCollectionMetrics(segments, overrides);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set());

  const duration = formatDuration(result.data?.duration ?? 0);
  const timeLabel = formatTime(result.createdAt);
  const dateLabel = formatDateShort(result.createdAt);

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
        onClick={compactMode ? onOpenReview : onToggle}
      >
        {/* Expand/collapse chevron (or maximize icon in compact mode) */}
        <span className="flex-shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
          {compactMode ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : isExpanded ? (
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
