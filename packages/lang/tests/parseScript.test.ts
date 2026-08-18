import { describe, it, expect } from 'vitest';
import { parseScript, WhiteboardScript, ClimbMetricType } from '../src/index';
import { MetricType } from '@bitcobblers/wod-wiki-core';

describe('parseScript (Headless Lezer Parser Seam)', () => {
  it('parses empty or whitespace-only source into empty WhiteboardScript', () => {
    const empty1 = parseScript('');
    expect(empty1).toBeInstanceOf(WhiteboardScript);
    expect(empty1.statements).toHaveLength(0);
    expect(empty1.errors).toHaveLength(0);

    const empty2 = parseScript('   \n\n  \t  \n');
    expect(empty2).toBeInstanceOf(WhiteboardScript);
    expect(empty2.statements).toHaveLength(0);
  });

  it('parses single-line and multi-line workouts into statements', () => {
    const script = parseScript('5:00 Run\n10:00 Row');
    expect(script.statements).toHaveLength(2);
    expect(script.statements[0].id).toBe(1);
    expect(script.statements[0].line).toBe(1);
    expect(script.statements[1].id).toBe(2);
    expect(script.statements[1].line).toBe(2);

    // First statement has Duration and Effort
    const s1Metrics = script.statements[0].metrics;
    expect(s1Metrics.hasMetric(MetricType.Duration)).toBe(true);
    expect(s1Metrics.hasMetric(MetricType.Effort)).toBe(true);
  });

  it('runs the built-in dialect stack by default', () => {
    const script = parseScript('AMRAP 20\n5 Pull-ups\n10 Push-ups\n15 Squats');
    expect(script.statements).toHaveLength(4);

    // AMRAP statement gets CrossFit hints
    const s1 = script.statements[0];
    expect(s1.metrics.some((m) => m.type === MetricType.Hint && m.value === 'workout.amrap')).toBe(true);
    expect(s1.metrics.some((m) => m.type === MetricType.Hint && m.value === 'behavior.time_bound')).toBe(true);
  });

  it('fuses units via base UnitsDialect', () => {
    const script = parseScript('5 km Run\n225 lb Back Squat');
    expect(script.statements).toHaveLength(2);

    // Distance metric fused
    const dist = script.statements[0].metrics.getMetric(MetricType.Distance);
    expect(dist).toBeDefined();
    expect(dist?.value).toEqual({ amount: 5, unit: 'km' });
    expect(dist?.unit).toBe('km');

    // Resistance metric fused
    const res = script.statements[1].metrics.getMetric(MetricType.Resistance);
    expect(res).toBeDefined();
    expect(res?.value).toEqual({ amount: 225, unit: 'lb' });
    expect(res?.unit).toBe('lb');
  });

  it('respects sport option to activate sport dialect (e.g. climb)', () => {
    const script = parseScript('v5 flash\n5.12a redpoint', { sport: 'climb' });
    expect(script.statements).toHaveLength(2);

    const s1 = script.statements[0];
    expect(s1.metrics.some((m) => m.type === ClimbMetricType.Grade || m.type === ClimbMetricType.SendType)).toBe(true);
  });

  it('respects withoutDialects option to skip dialect stack', () => {
    const scriptWith = parseScript('AMRAP 20');
    expect(scriptWith.statements[0].metrics.some((m) => m.type === MetricType.Hint)).toBe(true);

    const scriptWithout = parseScript('AMRAP 20', { withoutDialects: true });
    expect(scriptWithout.statements[0].metrics.some((m) => m.type === MetricType.Hint)).toBe(false);
  });

  it('supports IScript navigation methods (getId, getIds, getAt)', () => {
    const script = parseScript('Line 1\nLine 2\nLine 3');
    expect(script.getAt(0)?.id).toBe(1);
    expect(script.getId(2)?.id).toBe(2);
    expect(script.getIds([1, 3])).toHaveLength(2);
  });

  it('handles property lines and syntax structures', () => {
    const script = parseScript('Title: Morning Workout\nTimer: 10:00\n5:00 Jog');
    expect(script.statements.length).toBeGreaterThanOrEqual(1);
  });
});
