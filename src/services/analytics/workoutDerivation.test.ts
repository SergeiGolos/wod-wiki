/**
 * workoutDerivation tests — the unified derivation + replay seam (C4/C5),
 * single-stream shape (CONTEXT.md 2026-07-20: no data.analytics split;
 * Tier 2 lives in logs, discriminated by outputType).
 *
 * Defends the observable contracts:
 *   1. Stale Tier-2 ('analytics') outputs in the input are DISCARDED and
 *      regenerated — appended to the same logs stream.
 *   2. Tier-1 annotations (origin 'analyzed') are stripped before re-run so
 *      processors never double-apply; runtime/parser metrics and predictions
 *      ('analyzed-estimated') are preserved (frozen at recording time).
 *   3. Replay produces summary projections headlessly — no runtime, no
 *      OutputEmitter.
 *   4. resolveCanonicalMetricKey maps projection names to canonical keys.
 */
import { describe, expect, it } from 'bun:test';

import {
  deriveWorkoutFromLogs,
  normalizeSummaryFacts,
  replayResultAnalytics,
  resolveCanonicalMetricKey,
} from './workoutDerivation';
import type { ScriptBlock, StoredOutputStatement } from '@/components/Editor/types';
import type { WorkoutResult } from '@/types/storage';
import { MetricType } from '@/core/models/Metric';

const T0 = 1_700_000_000_000;

const BLOCK: ScriptBlock = {
  id: 'wod-2-test',
  contentId: 'bc-test',
  dialect: 'wod',
  startLine: 2,
  endLine: 5,
  content: '21 Deadlift 60kg',
  state: 'idle',
  version: 1,
  createdAt: 0,
  widgetIds: {},
};

function segmentLog(extraMetrics: StoredOutputStatement['metrics'] = []): StoredOutputStatement {
  return {
    id: 1,
    outputType: 'segment',
    timeSpan: { started: T0, ended: T0 + 60_000 },
    metrics: [
      { type: MetricType.Rep, value: 21, image: '21', origin: 'runtime' },
      { type: MetricType.Resistance, value: 60, image: '60 kg', origin: 'parser' },
      { type: MetricType.Effort, value: 'Deadlift', image: 'Deadlift', origin: 'parser' },
      { type: MetricType.Elapsed, value: 60_000, origin: 'runtime' },
      { type: MetricType.Total, value: 60_000, origin: 'runtime' },
      ...extraMetrics,
    ],
    sourceBlockKey: 'block-1',
    stackLevel: 0,
  };
}

const STALE_SUMMARY: StoredOutputStatement = {
  id: 99,
  outputType: 'analytics',
  timeSpan: { started: T0, ended: T0 },
  metrics: [{ type: MetricType.Label, value: 'Stale Projection', image: 'Stale Projection', origin: 'analyzed' }],
  sourceBlockKey: 'analytics-summary',
  stackLevel: 0,
};

describe('deriveWorkoutFromLogs', () => {
  it('discards stale Tier-2 outputs and appends regenerated summaries to the same stream', () => {
    const derived = deriveWorkoutFromLogs([segmentLog(), STALE_SUMMARY], { block: BLOCK });

    // No stale output survives; everything lives in one logs array.
    expect(derived.some(o => o.id === 99)).toBe(false);
    const summaries = derived.filter(o => o.outputType === 'analytics');
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.every(o => o.sourceBlockKey === 'analytics-summary')).toBe(true);
    // Tier 2 comes after the segment stream.
    expect(derived[derived.length - 1]!.outputType).toBe('analytics');
  });

  it('strips analyzed annotations but preserves runtime/parser metrics and predictions', () => {
    const annotated = segmentLog([
      { type: 'power' as MetricType, value: 500, unit: 'W', origin: 'analyzed' },
      { type: 'est.totalReps' as MetricType, value: 21, origin: 'analyzed-estimated' },
    ]);
    const derived = deriveWorkoutFromLogs([annotated], { block: BLOCK });

    const segment = derived.find(o => o.outputType === 'segment')!;
    // Runtime + parser metrics survive untouched.
    expect(segment.metrics.some(m => m.type === MetricType.Rep && m.value === 21)).toBe(true);
    expect(segment.metrics.some(m => m.type === MetricType.Effort && m.value === 'Deadlift')).toBe(true);
    // Predictions are frozen — preserved as recorded, never re-derived.
    expect(segment.metrics.some(m => m.type === 'est.totalReps' && m.value === 21 && m.origin === 'analyzed-estimated')).toBe(true);
    // The stale analyzed power metric does not double up: at most one power
    // entry, and only if a realtime processor re-derived it.
    const powerMetrics = segment.metrics.filter(m => m.type === 'power');
    expect(powerMetrics.length).toBeLessThanOrEqual(1);
    expect(powerMetrics.every(m => m.value !== 500 || m.origin === 'analyzed')).toBe(true);
  });

  it('passes non-segment outputs through untouched', () => {
    const milestone: StoredOutputStatement = {
      id: 7,
      outputType: 'milestone',
      timeSpan: { started: T0 + 1000 },
      metrics: [],
      sourceBlockKey: 'block-1',
      stackLevel: 0,
    };
    const derived = deriveWorkoutFromLogs([segmentLog(), milestone], { block: BLOCK });
    expect(derived).toContainEqual(milestone);
  });
});

describe('replayResultAnalytics', () => {
  it('re-derives a persisted result from its canonical logs', () => {
    const result: WorkoutResult = {
      id: 'r1',
      noteId: 'n1',
      segmentId: 'wod-2-test',
      segmentVersion: 1,
      blockContentId: 'bc-test',
      origin: 'journal',
      data: { startTime: T0, endTime: T0 + 60_000, duration: 60_000, completed: true, logs: [segmentLog(), STALE_SUMMARY] },
      createdAt: T0 + 60_000,
    };

    const derived = replayResultAnalytics(result, BLOCK);
    expect(derived.some(o => o.id === 99)).toBe(false);
    expect(derived.filter(o => o.outputType === 'analytics').length).toBeGreaterThan(0);
  });

  it('preserves user-origin SessionRPE and re-derives SessionLoad from it', () => {
    const rpeStatement: StoredOutputStatement = {
      id: 2,
      outputType: 'segment',
      timeSpan: { started: T0 + 60_000, ended: T0 + 60_000 },
      metrics: [{ type: MetricType.SessionRPE, value: 9, origin: 'user', image: 'rpe: 9' }],
      sourceBlockKey: 'block-1',
      stackLevel: 0,
    };
    const result: WorkoutResult = {
      id: 'r1',
      noteId: 'n1',
      segmentId: 'wod-2-test',
      segmentVersion: 1,
      blockContentId: 'bc-test',
      origin: 'journal',
      data: {
        startTime: T0,
        endTime: T0 + 60_000,
        duration: 60_000,
        completed: true,
        logs: [segmentLog(), rpeStatement],
      },
      createdAt: T0 + 60_000,
    };

    const derived = replayResultAnalytics(result, BLOCK);

    // User-origin SessionRPE survives the replay strip (only 'analyzed' is removed).
    const userRpe = derived
      .flatMap((o) => o.metrics)
      .find((m) => m.type === MetricType.SessionRPE && m.origin === 'user');
    expect(userRpe).toBeDefined();
    expect(userRpe!.value).toBe(9);

    // SessionLoad uses the user RPE (9) × 1 minute = 9 AU.
    const sessionLoad = derived
      .filter((o) => o.outputType === 'analytics')
      .flatMap((o) => o.metrics)
      .find((m) => m.type === MetricType.Load);
    expect(sessionLoad).toBeDefined();
    expect(sessionLoad!.value).toBe(9);
  });
});

describe('resolveCanonicalMetricKey', () => {
  it('maps projection names to canonical keys', () => {
    expect(resolveCanonicalMetricKey('Total Volume')).toBe('totalVolume');
    expect(resolveCanonicalMetricKey('TIS')).toBe('tis');
    expect(resolveCanonicalMetricKey('Total Reps')).toBe('totalReps');
    expect(resolveCanonicalMetricKey('Session Load')).toBe('sessionLoad');
  });
});

describe('normalizeSummaryFacts', () => {
  it('carries summary-processor effort metadata onto the fact row', () => {
    const points = normalizeSummaryFacts([
      {
        outputType: 'analytics',
        timeSpan: { started: T0, ended: T0 },
        metrics: [
          { type: MetricType.Label, value: 'Training Intensity Score', image: 'Training Intensity Score' },
          {
            type: MetricType.TIS,
            value: 72,
            unit: 'pts',
            metadata: {
              effortSlug: 'deadlift',
              effortDiscipline: 'strength',
              effortIntensityTier: 'high',
              // Non-string / unrelated metadata never leaks onto the row.
              metScore: 5.4,
            },
          },
        ],
      },
    ], { noteId: 'n1', resultId: 'r1' });

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      metricKey: 'trainingIntensityScore',
      effortSlug: 'deadlift',
      discipline: 'strength',
      intensityTier: 'high',
    });
  });

  it('omits effort fields when the projection carries no effort metadata', () => {
    const points = normalizeSummaryFacts([
      {
        outputType: 'analytics',
        timeSpan: { started: T0, ended: T0 },
        metrics: [
          { type: MetricType.Label, value: 'Total Reps', image: 'Total Reps' },
          { type: MetricType.Rep, value: 90, unit: 'reps' },
        ],
      },
    ], { noteId: 'n1', resultId: 'r1' });

    expect(points).toHaveLength(1);
    expect(points[0].effortSlug).toBeUndefined();
    expect(points[0].discipline).toBeUndefined();
    expect(points[0].intensityTier).toBeUndefined();
  });

  it('stamps the canonical workout time, not the derivation-time output stamp', () => {
    const workoutEnd = T0 + 60_000;
    const points = normalizeSummaryFacts([
      {
        outputType: 'analytics',
        // The engine stamps outputs at derivation time — must NOT win.
        timeSpan: { started: T0 + 999_000, ended: T0 + 999_000 },
        metrics: [
          { type: MetricType.Label, value: 'Total Reps', image: 'Total Reps' },
          { type: MetricType.Rep, value: 90, unit: 'reps' },
        ],
      },
    ], { noteId: 'n1', resultId: 'r1', workoutTimestamp: workoutEnd });

    expect(points[0].timestamp).toBe(workoutEnd);
  });

  it('falls back to the output timeSpan when no canonical time is supplied', () => {
    const points = normalizeSummaryFacts([
      {
        outputType: 'analytics',
        timeSpan: { started: T0, ended: T0 },
        metrics: [
          { type: MetricType.Label, value: 'Total Reps', image: 'Total Reps' },
          { type: MetricType.Rep, value: 90, unit: 'reps' },
        ],
      },
    ], { noteId: 'n1', resultId: 'r1' });

    expect(points[0].timestamp).toBe(T0);
  });

  it('deduplicates duplicate analytics outputs by metricKey, keeping the last occurrence', () => {
    const points = normalizeSummaryFacts([
      {
        outputType: 'analytics',
        timeSpan: { started: T0, ended: T0 },
        metrics: [
          { type: MetricType.Label, value: 'Total Reps', image: 'Total Reps' },
          { type: MetricType.Rep, value: 42, unit: 'reps' },
        ],
      },
      {
        outputType: 'analytics',
        timeSpan: { started: T0 + 1000, ended: T0 + 1000 },
        metrics: [
          { type: MetricType.Label, value: 'Total Reps', image: 'Total Reps' },
          { type: MetricType.Rep, value: 90, unit: 'reps' },
        ],
      },
      {
        outputType: 'analytics',
        timeSpan: { started: T0, ended: T0 },
        metrics: [
          { type: MetricType.Label, value: 'Training Load', image: 'Training Load' },
          { type: MetricType.Load, value: 100, unit: 'au' },
        ],
      },
    ], { noteId: 'n1', resultId: 'r1' });

    expect(points).toHaveLength(2);
    const totalReps = points.find(p => p.metricKey === 'totalReps');
    expect(totalReps).toBeDefined();
    expect(totalReps!.value).toBe(90);
    const trainingLoad = points.find(p => p.metricKey === 'trainingLoad');
    expect(trainingLoad).toBeDefined();
    expect(trainingLoad!.value).toBe(100);
  });
});
