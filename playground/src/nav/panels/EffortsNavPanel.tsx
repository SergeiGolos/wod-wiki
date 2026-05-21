/**
 * EffortsNavPanel — L2 context panel for effort browsing.
 *
 * Route modes:
 *   - /efforts                  → origin + discipline filter toggles
 *   - /effort/:slug             → recent workouts that used this effort
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ClockIcon } from '@heroicons/react/20/solid';
import type { NavPanelProps } from '../navTypes';
import { useEffortsQueryState } from '../../hooks/useEffortsQueryState';
import { useEffortRegistry } from '../../components/efforts/EffortRegistryContext';
import { indexedDBService } from '@/services/db/IndexedDBService';
import type { WorkoutResult } from '@/types/storage';
import type { StoredOutputStatement } from '@/components/Editor/types';
import { MetricType } from '@/core/models/Metric';
import { journalEntryPath } from '../../lib/routes';
import { TEST_IDS } from '@/testing/contracts/TestIdContract';

const ORIGIN_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'bundled' as const, label: 'Bundled' },
  { value: 'user' as const, label: 'Custom' },
];

/** Normalize a string for fuzzy comparison: lowercase, strip punctuation, collapse whitespace. */
function normalizeForCompare(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Check whether a workout result's logs mention the given effort. */
function resultMentionsEffort(
  result: WorkoutResult,
  effortLabel: string,
  aliases: string[],
): boolean {
  const logs = result.data?.logs ?? [];
  const names = [effortLabel, ...aliases].map(normalizeForCompare);

  for (const log of logs) {
    const metrics = (log as StoredOutputStatement).metrics ?? [];
    for (const metric of metrics) {
      // Check effort metrics (raw effort string from parser/runtime)
      if (metric.type === MetricType.Effort) {
        const val = normalizeForCompare(String(metric.value ?? metric.image ?? ''));
        if (names.some(n => val === n || val.includes(n))) return true;
      }
      // Check effort-data metrics (compile-time resolved effort)
      if (metric.type === 'effort-data' && metric.value && typeof metric.value === 'object') {
        const resolved = metric.value as { slug?: string; label?: string };
        const slugMatch = resolved.slug ? normalizeForCompare(resolved.slug) : '';
        const labelMatch = resolved.label ? normalizeForCompare(resolved.label) : '';
        if (names.some(n => n === slugMatch || n === labelMatch || labelMatch.includes(n))) {
          return true;
        }
      }
      // Fallback: check any metric image/value for mention
      const val = normalizeForCompare(String(metric.value ?? ''));
      const img = normalizeForCompare(String(metric.image ?? ''));
      if (names.some(n => val === n || val.includes(n) || img === n || img.includes(n))) {
        return true;
      }
    }
  }
  return false;
}

export function EffortsNavPanel(_props: NavPanelProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { origin, setOrigin, discipline, setDiscipline } = useEffortsQueryState();
  const { registry, isReady } = useEffortRegistry();

  const isListPage = location.pathname === '/efforts';
  const detailMatch = location.pathname.match(/^\/effort\/([^/]+)$/);
  const effortSlug = detailMatch ? decodeURIComponent(detailMatch[1]) : null;

  const effort = useMemo(() => {
    if (!effortSlug || !isReady) return null;
    return registry.resolve(effortSlug);
  }, [effortSlug, isReady, registry]);

  // ── Recent workouts state ──────────────────────────────────────────────
  const [recentResults, setRecentResults] = useState<WorkoutResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const fetchRecentResults = useCallback(async () => {
    if (!effort) return;
    setLoadingResults(true);
    try {
      const results = await indexedDBService.getRecentResults(50);
      const filtered = results.filter(r =>
        resultMentionsEffort(r, effort.label, effort.aliases),
      );
      setRecentResults(filtered.slice(0, 10));
    } catch {
      setRecentResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, [effort]);

  useEffect(() => {
    if (effort) {
      fetchRecentResults();
    } else {
      setRecentResults([]);
    }
  }, [effort, fetchRecentResults]);

  // ── Disciplines list (for list page) ──────────────────────────────────
  const disciplines = useMemo(() => {
    if (!isReady) return [];
    const set = new Set<string>();
    for (const e of registry.list()) {
      if (e.baseAttributes.discipline) set.add(e.baseAttributes.discipline);
    }
    return Array.from(set).sort();
  }, [isReady, registry]);

  // ── Render: List page ─────────────────────────────────────────────────

  if (isListPage) {
    return (
      <div className="flex flex-col gap-2 px-2 py-3">
        <div data-testid={TEST_IDS.EFFORTS_NAV_ORIGIN_FILTER} className="flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Origin
          </div>
          <div className="flex flex-col gap-1">
            {ORIGIN_OPTIONS.map(opt => {
              const active = origin === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setOrigin(opt.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'size-2 rounded-full shrink-0',
                      active ? 'bg-primary' : 'bg-border',
                    )}
                  />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {disciplines.length > 0 && (
          <>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-2">
              Discipline
            </div>
            <div data-testid={TEST_IDS.EFFORTS_NAV_DISCIPLINE_FILTER} className="flex flex-col gap-1">
              <button
                onClick={() => setDiscipline('')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors',
                  discipline === ''
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full shrink-0',
                    discipline === '' ? 'bg-primary' : 'bg-border',
                  )}
                />
                All
              </button>
              {disciplines.map(d => {
                const active = discipline === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDiscipline(d)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors capitalize',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'size-2 rounded-full shrink-0',
                        active ? 'bg-primary' : 'bg-border',
                      )}
                    />
                    {d}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Render: Detail page ───────────────────────────────────────────────

  if (effortSlug && effort) {
    return (
      <div data-testid={TEST_IDS.EFFORTS_NAV_RECENT_WORKOUTS} className="flex flex-col gap-3 px-2 py-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Recent Workouts
          </div>
          <button
            onClick={() => navigate('/efforts')}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            All efforts
          </button>
        </div>

        {loadingResults ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse h-3 w-20 bg-muted rounded" />
          </div>
        ) : recentResults.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-2">
            No recent workouts found for this effort.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {recentResults.map(result => {
              const date = new Date(result.completedAt);
              const dateLabel = date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const timeLabel = date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              });
              // noteId format: journal/YYYY-MM-DD or playground/...
              const noteIdParts = result.noteId.split('/');
              const noteType = noteIdParts[0];
              const noteKey = noteIdParts[1] ?? result.noteId;

              const handleClick = () => {
                if (noteType === 'journal' && noteKey) {
                  navigate(journalEntryPath(noteKey));
                }
                // For other note types, we could navigate generically
              };

              return (
                <button
                  key={result.id}
                  onClick={handleClick}
                  data-testid={TEST_IDS.EFFORTS_NAV_RECENT_WORKOUT_ITEM}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ClockIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs">{dateLabel}</span>
                    <span className="text-[10px] text-muted-foreground/60">{timeLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Non-matching effort routes (e.g., /effort/new)
  return null;
}
