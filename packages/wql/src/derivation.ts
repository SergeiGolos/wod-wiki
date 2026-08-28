/**
 * Workout derivation helpers for WQL QueryService and cross-store joins.
 */

import {
  MetricType,
  type AnalyticsDataPoint,
  type ResultOrigin,
  type StoredOutputStatement,
  type UnifiedEventRecord,
} from '@bitcobblers/wod-wiki-core';

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
  outputType?: string;
  metrics: readonly {
    type?: string;
    value?: unknown;
    image?: string;
    unit?: string;
    /** Summary-processor payload (effortSlug / effortDiscipline / effortIntensityTier / …). */
    metadata?: Record<string, unknown>;
  }[];
  timeSpan?: { started?: number; ended?: number };
}

/** Read a string metadata field off the projection value metric, when present. */
function metadataString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Group-tag pairs from grouped composed-calc emission, key-sorted. */
function readGroupTags(metadata: Record<string, unknown> | undefined): Record<string, string> | undefined {
  const tags = metadata?.groupTags;
  if (!tags || typeof tags !== 'object') return undefined;
  const entries = Object.entries(tags as Record<string, unknown>)
    .filter((pair): pair is [string, string] => typeof pair[1] === 'string' && pair[1].length > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * One fold definition shared by every summary emitter: Tier-2 outputs
 * (outputType 'analytics') folded keep-last per rowKey
 * (`metricKey[:k=v…]`, group tags key-sorted — spec §7.1).
 */
interface FoldedSummary {
  projectionName: string;
  metricKey: string;
  value: number;
  unit?: string;
  effortSlug?: string;
  discipline?: string;
  intensityTier?: string;
  grade?: string;
  groupTags?: Record<string, string>;
  rowKey: string;
  started?: number;
}

function foldSummaryOutputs(logs: readonly SummaryFactSourceOutput[]): Map<string, FoldedSummary> {
  const folded = new Map<string, FoldedSummary>();
  for (const output of logs) {
    if (output.outputType !== 'analytics') continue;
    const label = output.metrics.find(m => m.type === MetricType.Label);
    const value = output.metrics.find(m => m.type !== MetricType.Label && typeof m.value === 'number');
    if (!label || !value) continue;

    const projectionName = String(label.value ?? label.image ?? '');
    if (!projectionName) continue;
    // Composed calcs carry their Canonical Metric Key explicitly (#878);
    // legacy projections fall back to name-derived keys during cutover.
    const metricKey = metadataString(value.metadata, 'canonicalKey') ?? resolveCanonicalMetricKey(projectionName);

    const effortSlug = metadataString(value.metadata, 'effortSlug');
    const discipline = metadataString(value.metadata, 'effortDiscipline');
    const intensityTier = metadataString(value.metadata, 'effortIntensityTier');
    const grade = metadataString(value.metadata, 'grade');

    // Grouped dims auto-tag; legacy per-effort projections tag `effort`
    // from their effortSlug metadata.
    const groupTags = readGroupTags(value.metadata) ?? (effortSlug ? { effort: effortSlug } : undefined);
    const rowKey = groupTags
      ? `${metricKey}:${Object.entries(groupTags).map(([k, v]) => `${k}=${v}`).join(':')}`
      : metricKey;

    folded.set(rowKey, {
      projectionName, metricKey, value: value.value as number, unit: value.unit,
      effortSlug, discipline, intensityTier, grade, groupTags, rowKey,
      started: output.timeSpan?.started,
    });
  }
  return folded;
}

/**
 * Convert Tier-2 summary outputs (outputType 'analytics') in a result's logs
 * into persisted fact rows — one row per result × Canonical Metric Key.
 */
export function normalizeSummaryFacts(
  logs: readonly SummaryFactSourceOutput[],
  identity: SummaryFactIdentity,
): AnalyticsDataPoint[] {
  const now = Date.now();
  return Array.from(foldSummaryOutputs(logs).values(), (f) => ({
    id: `${identity.resultId}-${f.rowKey}-${now}`,
    noteId: identity.noteId,
    blockContentId: identity.blockContentId,
    origin: identity.origin,
    pageId: identity.pageId,
    grain: 'summary' as const,
    segmentId: identity.segmentId ?? '',
    segmentVersion: identity.segmentVersion ?? 0,
    resultId: identity.resultId,
    type: f.metricKey,
    value: f.value,
    unit: f.unit,
    label: f.projectionName,
    metricKey: f.metricKey,
    metricLabel: f.projectionName,
    metricUnit: f.unit,
    ...(f.effortSlug ? { effortSlug: f.effortSlug } : {}),
    ...(f.discipline ? { discipline: f.discipline } : {}),
    ...(f.intensityTier ? { intensityTier: f.intensityTier } : {}),
    ...(f.grade ? { grade: f.grade } : {}),
    timestamp: identity.workoutTimestamp ?? f.started ?? now,
    createdAt: now,
  }));
}

/** Identity for unified event-row emission — same fields as the fact identity. */
export type EventRowIdentity = SummaryFactIdentity;

function firstEffortSlug(metrics: StoredOutputStatement['metrics']): string | undefined {
  const loose = metrics as readonly { type?: string; value?: unknown; metadata?: Record<string, unknown> }[];
  for (const m of loose) {
    const slug = metadataString(m.metadata, 'effortSlug');
    if (slug) return slug;
    if (m.type === 'effort' || m.type === MetricType.Effort) {
      if (typeof m.value === 'string' && m.value) return m.value;
    }
  }
  return undefined;
}

/**
 * Logs → event rows, 1:1 per statement (ticket 002). Deterministic ids
 * `${resultId}:${seq}`; canonical workout time wins over the statement's own
 * timeSpan; query-critical scalars promoted top-level.
 */
export function toEventRows(
  logs: readonly StoredOutputStatement[],
  identity: SummaryFactIdentity,
): UnifiedEventRecord[] {
  return logs.map((output, seq) => ({
    id: `${identity.resultId}:${seq}`,
    resultId: identity.resultId,
    noteId: identity.noteId,
    blockContentId: identity.blockContentId,
    pageId: identity.pageId,
    origin: identity.origin,
    timestamp: identity.workoutTimestamp ?? output.timeSpan?.started ?? Date.now(),
    grain: 'event' as const,
    outputType: output.outputType ?? 'segment',
    effortSlug: firstEffortSlug(output.metrics),
    metrics: output.metrics,
    timeSpan: output.timeSpan?.started !== undefined
      ? { started: output.timeSpan.started, ended: output.timeSpan.ended }
      : undefined,
    sourceBlockKey: output.sourceBlockKey,
    stackLevel: output.stackLevel,
    completionReason: output.completionReason,
    segmentId: identity.segmentId,
    segmentVersion: identity.segmentVersion,
  }));
}

/**
 * Tier-2 analytics outputs → deterministic summary event rows (tickets
 * 002/004): id `${resultId}:summary:${rowKey}` — no timestamp salt, so
 * re-finalize overwrites cleanly. Fold identity lives in metrics[0].metadata
 * (canonicalKey, effort metadata, groupTags) — shape-uniform with events.
 */
export function toSummaryEventRows(
  logs: readonly StoredOutputStatement[],
  identity: SummaryFactIdentity,
): UnifiedEventRecord[] {
  const now = Date.now();
  return Array.from(foldSummaryOutputs(logs).values(), (f) => ({
    id: `${identity.resultId}:summary:${f.rowKey}`,
    resultId: identity.resultId,
    noteId: identity.noteId,
    blockContentId: identity.blockContentId,
    pageId: identity.pageId,
    origin: identity.origin,
    timestamp: identity.workoutTimestamp ?? f.started ?? now,
    grain: 'summary' as const,
    outputType: 'analytics',
    effortSlug: f.effortSlug,
    metrics: [{
      type: f.metricKey,
      value: f.value,
      ...(f.unit ? { unit: f.unit } : {}),
      metadata: {
        canonicalKey: f.metricKey,
        ...(f.effortSlug ? { effortSlug: f.effortSlug } : {}),
        ...(f.discipline ? { effortDiscipline: f.discipline } : {}),
        ...(f.intensityTier ? { effortIntensityTier: f.intensityTier } : {}),
        ...(f.groupTags ? { groupTags: f.groupTags } : {}),
        ...(f.grade ? { grade: f.grade } : {}),
      },
    }],
    segmentId: identity.segmentId,
    segmentVersion: identity.segmentVersion,
  }));
}

/**
 * Event row → flat fact currency for the four-stage plan (ticket 003):
 * one AnalyticsDataPoint per numeric metric. Canonical key resolution
 * mirrors the summary fold — metadata.canonicalKey first, name-derived
 * from the row's label metric as fallback. Deterministic fact ids:
 * `${record.id}:${factOrdinal}`.
 */
export function projectEventToFacts(record: UnifiedEventRecord): AnalyticsDataPoint[] {
  const metrics = record.metrics as readonly {
    type?: string; value?: unknown; unit?: string; image?: string;
    metadata?: Record<string, unknown>;
  }[];

  if (record.grain === 'summary') {
    const m = metrics[0];
    if (!m || typeof m.value !== 'number') return [];
    const metricKey = metadataString(m.metadata, 'canonicalKey') ?? (m.type ?? '');
    return [{
      id: `${record.id}:0`,
      noteId: record.noteId,
      blockContentId: record.blockContentId,
      origin: record.origin,
      pageId: record.pageId,
      grain: 'summary',
      segmentId: record.segmentId ?? '',
      segmentVersion: record.segmentVersion ?? 0,
      resultId: record.resultId,
      type: metricKey,
      value: m.value,
      unit: m.unit,
      label: metricKey,
      metricKey,
      metricLabel: metricKey,
      metricUnit: m.unit,
      effortSlug: metadataString(m.metadata, 'effortSlug') ?? record.effortSlug,
      discipline: metadataString(m.metadata, 'effortDiscipline'),
      intensityTier: metadataString(m.metadata, 'effortIntensityTier'),
      grade: metadataString(m.metadata, 'grade'),
      timestamp: record.timestamp,
      createdAt: record.timestamp,
    }];
  }

  const label = metrics.find(m => m.type === MetricType.Label);
  const labelName = label ? String(label.value ?? label.image ?? '') : '';
  const effortMetric = metrics.find(m => m.type === MetricType.Effort || m.type === 'effort');
  const effortSlug = metadataString(record.metrics[0]?.metadata, 'effortSlug')
    ?? record.effortSlug
    ?? (effortMetric && typeof effortMetric.value === 'string' ? effortMetric.value : undefined);

  const facts: AnalyticsDataPoint[] = [];
  metrics.forEach((m) => {
    if (m.type === MetricType.Label || m.type === 'label' || typeof m.value !== 'number') return;
    const metricKey = metadataString(m.metadata, 'canonicalKey')
      ?? (labelName ? resolveCanonicalMetricKey(labelName) : (m.type === MetricType.Rep || m.type === 'rep' ? 'reps' : (m.type ?? 'metric')));
    const ordinal = facts.length;
    facts.push({
      id: `${record.id}:${ordinal}`,
      noteId: record.noteId,
      blockContentId: record.blockContentId,
      origin: record.origin,
      pageId: record.pageId,
      grain: 'event',
      segmentId: record.segmentId ?? '',
      segmentVersion: record.segmentVersion ?? 0,
      resultId: record.resultId,
      type: metricKey,
      value: m.value,
      unit: m.unit,
      label: labelName || metricKey,
      metricKey,
      metricLabel: labelName || metricKey,
      metricUnit: m.unit,
      effortSlug: metadataString(m.metadata, 'effortSlug') ?? effortSlug,
      discipline: metadataString(m.metadata, 'effortDiscipline'),
      intensityTier: metadataString(m.metadata, 'effortIntensityTier'),
      grade: metadataString(m.metadata, 'grade'),
      timestamp: record.timestamp,
      createdAt: record.timestamp,
    });
  });
  return facts;
}
