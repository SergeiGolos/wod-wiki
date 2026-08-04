/**
 * Known atom vocabulary for the composed calculations layer.
 *
 * Stream atoms name metrics on the log stream that aggregates scan
 * (`sum(metMinutes)` reads `metMinutes` segment annotations). Context atoms
 * are engine-provided nodes (`session.duration`, `effort`, …). Registration
 * uses these tables for static dimension checking; evaluation uses them to
 * resolve refs and stamp units.
 */

import { DimVector, DIM_ZERO, DIM_TIME, DIM_LENGTH, DIM_MASS, DIM_COUNT } from './dimensions';

export interface StreamAtomDef {
  dim: DimVector;
  /** Metric type scanned on the log stream. */
  metricType: string;
  /** Unit stamped on aggregate values (last-seen source unit wins for distance/volume). */
  unit?: string;
}

export const STREAM_ATOMS: Record<string, StreamAtomDef> = {
  reps: { dim: DIM_COUNT, metricType: 'rep', unit: 'reps' },
  elapsed: { dim: DIM_TIME, metricType: 'elapsed', unit: 'ms' },
  distance: { dim: DIM_LENGTH, metricType: 'distance', unit: 'm' },
  resistance: { dim: DIM_MASS, metricType: 'resistance', unit: 'kg' },
  segmentVolume: { dim: [0, 1, 0, 1, 0], metricType: 'segmentVolume', unit: 'kg' },
  metMinutes: { dim: DIM_TIME, metricType: 'metMinutes', unit: 'min' },
  effortRpe: { dim: DIM_ZERO, metricType: 'effortRpe' },
  metMinutesEstimated: { dim: DIM_ZERO, metricType: 'metMinutesEstimated' },
  sessionRpe: { dim: DIM_ZERO, metricType: 'session-rpe' },
};

/** Engine-provided context nodes (both scopes, where meaningful). */
export const CONTEXT_ATOMS: Record<string, DimVector> = {
  effort: DIM_ZERO,
  effortLabel: DIM_ZERO,
  sessionRpe: DIM_ZERO,
  'session.duration': DIM_TIME,
  'profile.vo2max': DIM_ZERO,
};

/** Stream aggregate builtins (workout scope). `count` is dimensionless. */
export const AGGREGATE_BUILTINS: Record<string, true> = {
  sum: true,
  max: true,
  min: true,
  avg: true,
  count: true,
  last: true,
};
