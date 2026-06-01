import { describe, it, expect } from 'bun:test';
import { fuseUnitsInMetrics } from '../fuseUnits';
import { UnitRegistry } from '../../../core/metrics/units';
import { MetricType } from '../../../core/models/Metric';
import { RepMetric } from '../../../runtime/compiler/metrics/RepMetric';
import { EffortMetric } from '../../../runtime/compiler/metrics/EffortMetric';
import { ResistanceMetric } from '../../../runtime/compiler/metrics/ResistanceMetric';

const std = UnitRegistry.standard();

function amountUnit(m: any) {
  return { type: m.type, amount: m.value?.amount, unit: m.value?.unit };
}

describe('fuseUnitsInMetrics', () => {
  it('fuses Rep + contiguous unit into a dimensioned metric', () => {
    const out = fuseUnitsInMetrics([new RepMetric(24), new EffortMetric('kg')], std);
    expect(out).toHaveLength(1);
    expect(amountUnit(out[0])).toEqual({ type: MetricType.Resistance, amount: 24, unit: 'kg' });
  });

  it('fuses Rep + leading unit word and keeps the residual effort', () => {
    const out = fuseUnitsInMetrics([new RepMetric(100), new EffortMetric('m Run')], std);
    expect(out).toHaveLength(2);
    expect(amountUnit(out[0])).toEqual({ type: MetricType.Distance, amount: 100, unit: 'm' });
    expect(out[1].type).toBe(MetricType.Effort);
    expect(out[1].value).toBe('Run');
  });

  it('preserves the as-written token (miles, not mi)', () => {
    const out = fuseUnitsInMetrics([new RepMetric(4), new EffortMetric('miles Run')], std);
    expect(amountUnit(out[0])).toEqual({ type: MetricType.Distance, amount: 4, unit: 'miles' });
    expect(out[1].value).toBe('Run');
  });

  it('recognizes units the grammar misses (in, lbs, cal)', () => {
    expect(amountUnit(fuseUnitsInMetrics([new RepMetric(24), new EffortMetric('in')], std)[0]))
      .toEqual({ type: MetricType.Distance, amount: 24, unit: 'in' });
    expect(amountUnit(fuseUnitsInMetrics([new RepMetric(95), new EffortMetric('lbs')], std)[0]))
      .toEqual({ type: MetricType.Resistance, amount: 95, unit: 'lbs' });
    // energy has no dedicated class → MeasuredMetric with string type 'energy'
    const cal = fuseUnitsInMetrics([new RepMetric(20), new EffortMetric('cal Row')], std);
    expect((cal[0] as any).type).toBe('energy');
    expect((cal[0] as any).value).toEqual({ amount: 20, unit: 'cal' });
    expect(cal[1].value).toBe('Row');
  });

  it('does NOT fuse a number + non-unit word', () => {
    const out = fuseUnitsInMetrics([new RepMetric(5), new EffortMetric('Burpees')], std);
    expect(out).toHaveLength(2);
    expect(out[0].type).toBe(MetricType.Rep);
    expect(out[1].value).toBe('Burpees');
  });

  it('fills an empty unit on an @-resistance followed by a unit word', () => {
    const out = fuseUnitsInMetrics([new ResistanceMetric(95, ''), new EffortMetric('lb')], std);
    expect(out).toHaveLength(1);
    expect(amountUnit(out[0])).toEqual({ type: MetricType.Resistance, amount: 95, unit: 'lb' });
  });

  it('is idempotent', () => {
    const once = fuseUnitsInMetrics([new RepMetric(100), new EffortMetric('m Run')], std);
    const twice = fuseUnitsInMetrics(once, std);
    expect(twice.map(amountUnit)).toEqual(once.map(amountUnit));
  });

  it('honors dialect override sets (later wins)', () => {
    const poodSet = std.extend({ canonical: 'pood', dimension: 'mass', aliases: ['poods'] });
    const out = fuseUnitsInMetrics([new RepMetric(1.5), new EffortMetric('pood Swings')], poodSet);
    expect(amountUnit(out[0])).toEqual({ type: MetricType.Resistance, amount: 1.5, unit: 'pood' });
    expect(out[1].value).toBe('Swings');
  });
});
