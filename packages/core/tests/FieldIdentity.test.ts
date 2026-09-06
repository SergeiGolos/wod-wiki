import { describe, expect, it } from 'vitest';
import {
  fieldRefKey,
  flattenFieldLeaves,
  normalizeFieldPath,
  valueKindOf,
  type FieldRef,
} from '../src/fields/fieldIdentity';

describe('normalizeFieldPath', () => {
  it('collapses equivalent spellings to one identity', () => {
    expect(normalizeFieldPath('heart rate')).toBe('heartRate');
    expect(normalizeFieldPath('heart_rate')).toBe('heartRate');
    expect(normalizeFieldPath('HeartRate')).toBe('heartRate');
    expect(normalizeFieldPath('HRV')).toBe('hrv');
    expect(normalizeFieldPath('  heart   rate ')).toBe('heartRate');
    expect(normalizeFieldPath('heart-rate')).toBe('heartRate');
  });

  it('keeps no-boundary spellings distinct (no synonym inference)', () => {
    expect(normalizeFieldPath('heartrate')).toBe('heartrate');
    expect(normalizeFieldPath('heartrate')).not.toBe(normalizeFieldPath('heartRate'));
  });

  it('normalizes per path component; dots delimit paths', () => {
    expect(normalizeFieldPath('sleep_quality.score_value')).toBe('sleepQuality.scoreValue');
    expect(normalizeFieldPath('Sleep Score')).toBe('sleepScore');
    expect(normalizeFieldPath('sleep.score')).toBe('sleep.score');
  });

  it('is idempotent', () => {
    const once = normalizeFieldPath('Heart Rate Variability');
    expect(normalizeFieldPath(once)).toBe(once);
  });

  it('empty components collapse to nothing between dots', () => {
    expect(normalizeFieldPath('sleep..score')).toBe('sleep.score');
    expect(normalizeFieldPath('.score.')).toBe('score');
  });
});

describe('valueKindOf', () => {
  it('classifies the typed value kinds', () => {
    expect(valueKindOf(48)).toBe('number');
    expect(valueKindOf('deep')).toBe('string');
    expect(valueKindOf(true)).toBe('boolean');
    expect(valueKindOf([100, 90])).toBe('array');
  });

  it('objects and null are not value kinds', () => {
    expect(valueKindOf({ a: 1 })).toBe('object');
    expect(valueKindOf(null)).toBe('null');
    expect(valueKindOf(undefined)).toBe('undefined');
  });
});

describe('flattenFieldLeaves', () => {
  it('treats flat dotted keys and nested objects as one identity', () => {
    const flat = flattenFieldLeaves({ 'sleep.score': 85 });
    const nested = flattenFieldLeaves({ sleep: { score: 85 } });
    expect(flat).toEqual([{ path: 'sleep.score', kind: 'number', value: 85, originalPath: 'sleep.score' }]);
    expect(nested).toEqual([{ path: 'sleep.score', kind: 'number', value: 85, originalPath: 'sleep.score' }]);
  });

  it('objects contribute nested leaves; empty objects contribute nothing', () => {
    expect(flattenFieldLeaves({ sleep: {}, wake: 7 })).toEqual([
      { path: 'wake', kind: 'number', value: 7, originalPath: 'wake' },
    ]);
  });

  it('arrays stay collection-valued — one leaf, not per-element observations', () => {
    expect(flattenFieldLeaves({ heartRates: [100, 100, 100] })).toEqual([
      { path: 'heartRates', kind: 'array', value: [100, 100, 100], originalPath: 'heartRates' },
    ]);
  });

  it('null records presence without a value kind', () => {
    expect(flattenFieldLeaves({ hrv: null })).toEqual([
      { path: 'hrv', kind: 'null', value: null, originalPath: 'hrv' },
    ]);
  });

  it('keeps the original spelling as provenance', () => {
    expect(flattenFieldLeaves({ 'Heart Rate': 60 })[0]!.originalPath).toBe('Heart Rate');
    expect(flattenFieldLeaves({ 'Heart Rate': 60 })[0]!.path).toBe('heartRate');
  });
});

describe('fieldRefKey', () => {
  it('is stable across construction orders and collision-free', () => {
    const a: FieldRef = { path: 'sleep.score', kind: 'number' };
    const b: FieldRef = { path: 'sleep.score', kind: 'number', dimension: 'mass' };
    expect(fieldRefKey(a)).toBe(fieldRefKey({ path: 'sleep.score', kind: 'number' }));
    expect(fieldRefKey(a)).not.toBe(fieldRefKey(b));
    expect(fieldRefKey(a)).not.toBe(fieldRefKey({ path: 'sleep.score', kind: 'string' }));
    // A path containing the separator cannot collide with a different identity.
    expect(fieldRefKey({ path: 'a|number', kind: 'string' })).not.toBe(
      fieldRefKey({ path: 'a', kind: 'string', dimension: 'number' }),
    );
  });
});
