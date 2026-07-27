/**
 * workoutDerivation — the single module that owns "derive the analytics view
 * of a workout" (Candidates 4 + 5, analytics-two-layer-derivation-deep-dive).
 *
 * The AnalyticsEngine is headless: it takes IOutputStatements in and produces
 * annotations (Tier 1, per-segment via IRealtimeProcessor) and summaries
 * (Tier 2, whole-result via ISummaryProcessor) with no runtime lifecycle.
 * This module drives it directly over STORED logs, skipping OutputEmitter —
 * which is exactly what post-hoc re-derivation (replay) needs.
 *
 * Policies enforced here (one home, no drift):
 *   - Canonical input/output is StoredOutputStatement[] — a SINGLE logs
 *     stream holding all tiers. Tier 2 is discriminated by outputType
 *     ('analytics'); there is no separate analytics property (CONTEXT.md,
 *     2026-07-20 — the shapes-doc §2 split was rejected).
 *   - Tier-2 outputs in the input are DISCARDED and regenerated.
 *   - Tier-1 strip rule: only metrics with origin === 'analyzed' are removed
 *     before re-run; compile-time/runtime effort data AND predictions
 *     ('analyzed-estimated') are preserved — a recorded workout's predictions
 *     are frozen at recording time (CONTEXT.md, 2026-07-20).
 *   - Canonical Metric Key is the cross-workout join dimension, identical in
 *     fact rows and display: 'reps', 'distance', 'resistance', 'elapsed',
 *     'power', 'pace', 'totalVolume', 'tis', … (CONTEXT.md §Analytics).
 */
import { createAnalyticsEngineForBlock } from '@/core/analytics/createAnalyticsEngineForBlock';
import { MetricType } from '@/core/models/Metric';
import { OutputStatement, type IOutputStatement } from '@/core/models/OutputStatement';
import type { IEffortResolver } from '@/effort-registry/types';
import {
  toStoredOutputStatement,
  type ScriptBlock,
  type StoredOutputStatement,
} from '@/components/Editor/types';
import type { AnalyticsDataPoint, ResultOrigin, WorkoutResult } from '@/types/storage';

export interface DeriveWorkoutOptions {
  /** Block the workout was run from — supplies dialect + statements for the
   *  engine profile. Parse statements first if the block may lack them. */
  block: ScriptBlock;
  effortResolver?: IEffortResolver;
  userProfile?: { vo2max?: number };
}

/**
 * Rehydrate a stored output into a live IOutputStatement for the engine.
 * The runtime assigns a fresh statement id; summary processors aggregate on
 * metrics, not ids, so id lineage is not preserved across replay.
 */
function toLiveOutputStatement(stored: StoredOutputStatement): IOutputStatement {
  return new OutputStatement({
    outputType: stored.outputType,
    timeSpan: stored.timeSpan,
    sourceBlockKey: stored.sourceBlockKey,
    stackLevel: stored.stackLevel,
    sourceStatementId: stored.sourceStatementId,
    metrics: stored.metrics,
    parent: stored.parent,
    completionReason: stored.completionReason,
  });
}

/** Remove Tier-1 annotations so re-running processors can't double-apply. */
function stripAnalyzedMetrics(stored: StoredOutputStatement): StoredOutputStatement {
  return { ...stored, metrics: stored.metrics.filter(m => m.origin !== 'analyzed') };
}

/**
 * Derive Tier-1 annotations + Tier-2 summaries from stored logs by driving
 * the headless AnalyticsEngine directly. Returns the complete single logs
 * stream: input logs (minus stale Tier-2, annotations re-applied) followed by
 * the freshly generated Tier-2 summary outputs.
 */
export function deriveWorkoutFromLogs(
  logs: StoredOutputStatement[],
  options: DeriveWorkoutOptions,
): StoredOutputStatement[] {
  const { engine } = createAnalyticsEngineForBlock(options.block, {
    effortResolver: options.effortResolver,
    userProfile: options.userProfile,
  });

  const derived: StoredOutputStatement[] = [];
  for (const stored of logs) {
    if (stored.outputType === 'analytics') continue; // stale Tier 2 — regenerated below
    if (stored.outputType !== 'segment') {
      derived.push(stored);
      continue;
    }
    const enriched = engine.run(toLiveOutputStatement(stripAnalyzedMetrics(stored)));
    derived.push(toStoredOutputStatement(enriched));
  }

  return [...derived, ...engine.finalize().map(toStoredOutputStatement)];
}

/**
 * Replay seam (Candidate 5): re-derive a persisted result's analytics from
 * its canonical logs. Caller supplies the block context (recovered from the
 * result's NoteSegment — see IndexedDBNotePersistence.rederiveResultAnalytics).
 */
export function replayResultAnalytics(
  result: WorkoutResult,
  block: ScriptBlock,
  options?: Omit<DeriveWorkoutOptions, 'block'>,
): StoredOutputStatement[] {
  return deriveWorkoutFromLogs(result.data.logs ?? [], { block, ...options });
}

/**
 * Map a summary projection name to its Canonical Metric Key — the one key two
 * workouts must share for an aggregate to be compared across them. Same key
 * in fact rows and display. 'Total Volume' → 'totalVolume', 'TIS' → 'tis'.
 */
export function resolveCanonicalMetricKey(projectionName: string): string {
  const words = projectionName.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return words
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('');
}

// ---------------------------------------------------------------------------
// Summary fact normalization — logs → persisted AnalyticsDataPoint rows
// ---------------------------------------------------------------------------

/**
 * Identity of the block a result belongs to, stamped on every fact row.
 */
export interface SummaryFactIdentity {
  noteId: string;
  resultId: string;
  /** FK to NoteSegment.id (positional section id of the block run). */
  segmentId?: string;
  /** NoteSegment.version at record time. */
  segmentVersion?: number;
  /** Content-stable cross-note join key. */
  blockContentId?: string;
  /** Which surface produced the result; trend queries exclude 'playground' by default. */
  origin?: ResultOrigin;
  /** FK to the `page` store (copied from the parent note). */
  pageId?: string;
  /**
   * Canonical workout time — WorkoutResult.createdAt (true workout end).
   * Every fact row carries it as `timestamp` so time-range queries mean
   * "when the workout happened", never "when the metric was derived".
   */
  workoutTimestamp?: number;
}

/** Logs shape read by normalizeSummaryFacts (StoredOutputStatement-compatible). */
export interface SummaryFactSourceOutput {
  outputType: string;
  metrics: readonly {
    type: string;
    value?: unknown;
    image?: string;
    unit?: string;
    /** Summary-processor payload (effortSlug / effortDiscipline / effortIntensityTier / …). */
    metadata?: Record<string, unknown>;
  }[];
  timeSpan: { started: number; ended?: number };
}

/** Read a string metadata field off the projection value metric, when present. */
function metadataString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Convert Tier-2 summary outputs (outputType 'analytics') in a result's logs
 * into persisted fact rows — one row per result × Canonical Metric Key.
 *
 * The analytics store holds SUMMARY FACTS ONLY (CONTEXT.md, 2026-07-20):
 * per-segment data (Tier 0 + Tier 1) is not denormalized here — it stays in
 * WorkoutResult.data.logs, the authoritative source for a single workout.
 *
 * These rows exist for cross-workout queries ("compare total volume across my
 * last 30 Fran runs"). If this write fails or is skipped, the workout result
 * remains fully functional.
 *
 * V12: effort identity (effortSlug / discipline / intensityTier) is carried
 * from the summary processor's metadata onto the row, populating the
 * by-effort / by-discipline indexes; `timestamp` is the canonical workout
 * time (identity.workoutTimestamp = WorkoutResult.createdAt), not the
 * derivation-time stamp the engine puts on the output's timeSpan.
 */
export function normalizeSummaryFacts(
  logs: readonly SummaryFactSourceOutput[],
  identity: SummaryFactIdentity,
): AnalyticsDataPoint[] {
  const now = Date.now();
  const rowsByKey = new Map<string, AnalyticsDataPoint>();

  for (const output of logs) {
    if (output.outputType !== 'analytics') continue;
    const label = output.metrics.find(m => m.type === MetricType.Label);
    const value = output.metrics.find(m => m.type !== MetricType.Label && typeof m.value === 'number');
    if (!label || !value) continue;

    const projectionName = String(label.value ?? label.image ?? '');
    if (!projectionName) continue;
    const metricKey = resolveCanonicalMetricKey(projectionName);

    const effortSlug = metadataString(value.metadata, 'effortSlug');
    const discipline = metadataString(value.metadata, 'effortDiscipline');
    const intensityTier = metadataString(value.metadata, 'effortIntensityTier');

    const rowKey = effortSlug ? `${metricKey}:${effortSlug}` : metricKey;

    rowsByKey.set(rowKey, {
      id: `${identity.resultId}-${rowKey}-${now}`,
      noteId: identity.noteId,
      blockContentId: identity.blockContentId,
      origin: identity.origin,
      pageId: identity.pageId,
      grain: 'summary',
      segmentId: identity.segmentId ?? '',
      segmentVersion: identity.segmentVersion ?? 0,
      resultId: identity.resultId,
      type: metricKey,
      value: value.value as number,
      unit: value.unit,
      label: projectionName,
      metricKey,
      metricLabel: projectionName,
      metricUnit: value.unit,
      ...(effortSlug ? { effortSlug } : {}),
      ...(discipline ? { discipline } : {}),
      ...(intensityTier ? { intensityTier } : {}),
      timestamp: identity.workoutTimestamp ?? output.timeSpan.started ?? now,
      createdAt: now,
    });
  }

  return Array.from(rowsByKey.values());
}
