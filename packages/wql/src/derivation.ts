/**
 * Workout derivation helpers for WQL QueryService and cross-store joins.
 */

import { MetricType, type AnalyticsDataPoint, type ResultOrigin } from '@bitcobblers/wod-wiki-core';

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
 * Convert Tier-2 summary outputs (outputType 'analytics') in a result's logs
 * into persisted fact rows — one row per result × Canonical Metric Key.
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
    // Composed calcs carry their Canonical Metric Key explicitly (#878);
    // legacy projections fall back to name-derived keys during cutover.
    const metricKey = metadataString(value.metadata, 'canonicalKey') ?? resolveCanonicalMetricKey(projectionName);

    const effortSlug = metadataString(value.metadata, 'effortSlug');
    const discipline = metadataString(value.metadata, 'effortDiscipline');
    const intensityTier = metadataString(value.metadata, 'effortIntensityTier');
    const grade = metadataString(value.metadata, 'grade');

    // Row key = metricKey + sorted group-tag pairs (spec §7.1:
    // `totalVolume:effort=thruster`). Grouped dims auto-tag; legacy
    // per-effort projections tag `effort` from their effortSlug metadata.
    const groupTags = readGroupTags(value.metadata) ?? (effortSlug ? { effort: effortSlug } : undefined);
    const rowKey = groupTags
      ? `${metricKey}:${Object.entries(groupTags).map(([k, v]) => `${k}=${v}`).join(':')}`
      : metricKey;

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
      ...(grade ? { grade } : {}),
      timestamp: identity.workoutTimestamp ?? output.timeSpan?.started ?? now,
      createdAt: now,
    });
  }

  return Array.from(rowsByKey.values());
}
