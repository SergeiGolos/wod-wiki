import { describe, expect, it } from 'bun:test';
import { getMetricColorClasses, getMetricIcon } from '../metricColorMap';

describe('metricColorMap ADR-0009 regressions', () => {
  it('returns explicit color classes for custom metric type', () => {
    const classes = getMetricColorClasses('custom');
    expect(classes).toContain('bg-muted');
    expect(classes).toContain('text-muted-foreground');
    expect(classes).not.toContain('bg-gray-200'); // not the unknown fallback
  });

  it('returns explicit color classes for calculated metric type', () => {
    const classes = getMetricColorClasses('calculated');
    expect(classes).toContain('bg-metric-effort');
    expect(classes).toContain('text-metric-effort');
    expect(classes).not.toContain('bg-gray-200');
  });

  it('returns icon for custom metric type', () => {
    expect(getMetricIcon('custom')).toBe('✳️');
  });

  it('returns icon for calculated metric type', () => {
    expect(getMetricIcon('calculated')).toBe('🧮');
  });

  it('falls back to generic grey for unknown metric types', () => {
    const classes = getMetricColorClasses('totally-unknown-type');
    expect(classes).toContain('bg-gray-200');
  });

  it('returns null icon for unknown metric types', () => {
    expect(getMetricIcon('totally-unknown-type')).toBeNull();
  });

  it('is case-insensitive for custom', () => {
    expect(getMetricColorClasses('CUSTOM')).toContain('bg-muted');
    expect(getMetricIcon('CUSTOM')).toBe('✳️');
  });

  it('is case-insensitive for calculated', () => {
    expect(getMetricColorClasses('CALCULATED')).toContain('bg-metric-effort');
    expect(getMetricIcon('CALCULATED')).toBe('🧮');
  });

  it('preserves canonical metric styling alongside custom/calculated', () => {
    expect(getMetricColorClasses('rep')).toContain('bg-metric-rep');
    expect(getMetricColorClasses('duration')).toContain('bg-metric-time');
    expect(getMetricColorClasses('effort')).toContain('bg-metric-effort');
  });
});
