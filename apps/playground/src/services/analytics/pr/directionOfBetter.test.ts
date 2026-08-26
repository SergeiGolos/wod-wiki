import { describe, it, expect } from 'vitest';
import {
  getMetricDirection,
  isBetterValue,
  registerMetricDirection,
} from './directionOfBetter';

describe('directionOfBetter', () => {
  it('identifies higher-is-better metrics correctly', () => {
    expect(getMetricDirection('tis')).toBe('higher');
    expect(getMetricDirection('totalVolume')).toBe('higher');
    expect(getMetricDirection('totalReps')).toBe('higher');
    expect(getMetricDirection('totalDistance')).toBe('higher');
    expect(getMetricDirection('metMinutes')).toBe('higher');
    expect(getMetricDirection('power')).toBe('higher');
  });

  it('identifies lower-is-better metrics correctly', () => {
    expect(getMetricDirection('elapsed')).toBe('lower');
    expect(getMetricDirection('pace')).toBe('lower');
  });

  it('correctly compares new values against previous best for higher-is-better', () => {
    expect(isBetterValue('totalVolume', 4500, 4200)).toBe(true);
    expect(isBetterValue('totalVolume', 4000, 4200)).toBe(false);
    expect(isBetterValue('totalVolume', 4200, 4200)).toBe(false);
  });

  it('correctly compares new values against previous best for lower-is-better', () => {
    expect(isBetterValue('elapsed', 120, 150)).toBe(true);
    expect(isBetterValue('elapsed', 180, 150)).toBe(false);
    expect(isBetterValue('elapsed', 150, 150)).toBe(false);
  });

  it('allows registering custom metric direction overrides', () => {
    registerMetricDirection('customGolfScore', 'lower');
    expect(getMetricDirection('customGolfScore')).toBe('lower');
    expect(isBetterValue('customGolfScore', 68, 72)).toBe(true);
  });
});
