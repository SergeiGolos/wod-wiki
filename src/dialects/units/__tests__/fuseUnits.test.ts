import { describe, it, expect } from 'bun:test';
import { fuseUnitsInMetrics } from '../fuseUnits';
import { UnitRegistry } from '../../../core/metrics/units';
import { MetricType } from '../../../core/models/Metric';
import { RepMetric } from '../../../runtime/compiler/metrics/RepMetric';
import { EffortMetric } from '../../../runtime/compiler/metrics/EffortMetric';
import { ResistanceMetric } from '../../../runtime/compiler/metrics/ResistanceMetric';
import { SlashMetric } from '../../../runtime/compiler/metrics/SlashMetric';
import { ChoiceGroupMetric } from '../../../runtime/compiler/metrics/ChoiceGroupMetric';

const std = UnitRegistry.standard();

function amountUnit(m: any) {
  return { type: m.type, amount: m.value?.amount, unit: m.value?.unit };
}

function choiceAlts(m: any): { type: string; amount?: number; unit?: string }[] {
  const group = m as ChoiceGroupMetric;
  return group.alternatives.map((a: any) => ({
    type: a.type,
    amount: a.value?.amount,
    unit: a.value?.unit ?? a.value,
  }));
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

  describe('{number}/{number} {unit} → ChoiceGroupMetric (homogeneous)', () => {
    it('emits a single ChoiceGroupMetric for N/N resistance', () => {
      const out = fuseUnitsInMetrics(
        [new RepMetric(135), new SlashMetric(), new RepMetric(185), new EffortMetric('lbs')],
        std,
      );
      expect(out).toHaveLength(1);
      expect(out[0].type).toBe(MetricType.Choice);
      expect(choiceAlts(out[0])).toEqual([
        { type: MetricType.Resistance, amount: 135, unit: 'lbs' },
        { type: MetricType.Resistance, amount: 185, unit: 'lbs' },
      ]);
    });

    it('emits ChoiceGroupMetric + residual effort for N/N distance with label', () => {
      const out = fuseUnitsInMetrics(
        [new RepMetric(200), new SlashMetric(), new RepMetric(400), new EffortMetric('m Run')],
        std,
      );
      expect(out).toHaveLength(2);
      expect(out[0].type).toBe(MetricType.Choice);
      expect(choiceAlts(out[0])).toEqual([
        { type: MetricType.Distance, amount: 200, unit: 'm' },
        { type: MetricType.Distance, amount: 400, unit: 'm' },
      ]);
      expect(out[1].value).toBe('Run');
    });

    it('emits ChoiceGroupMetric for @-resistance N/N', () => {
      const out = fuseUnitsInMetrics(
        [new ResistanceMetric(95, ''), new SlashMetric(), new ResistanceMetric(135, ''), new EffortMetric('lb')],
        std,
      );
      expect(out).toHaveLength(1);
      expect(out[0].type).toBe(MetricType.Choice);
      expect(choiceAlts(out[0])).toEqual([
        { type: MetricType.Resistance, amount: 95, unit: 'lb' },
        { type: MetricType.Resistance, amount: 135, unit: 'lb' },
      ]);
    });

    it('does NOT emit ChoiceGroup when the separator is not a slash', () => {
      const out = fuseUnitsInMetrics(
        [new RepMetric(135), new EffortMetric('+'), new RepMetric(185), new EffortMetric('lbs')],
        std,
      );
      expect(out).toHaveLength(3);
      expect(out[0].type).toBe(MetricType.Rep);
      expect(out[1].type).toBe(MetricType.Effort);
      expect(amountUnit(out[2])).toEqual({ type: MetricType.Resistance, amount: 185, unit: 'lbs' });
    });

    it('is idempotent: re-running on ChoiceGroupMetric output is a no-op', () => {
      const once = fuseUnitsInMetrics(
        [new RepMetric(135), new SlashMetric(), new RepMetric(185), new EffortMetric('kg')],
        std,
      );
      expect(once[0].type).toBe(MetricType.Choice);
      const twice = fuseUnitsInMetrics(once, std);
      // ChoiceGroupMetric has type 'choice', not effort/number — no pattern fires
      expect(twice[0].type).toBe(MetricType.Choice);
      expect((twice[0] as ChoiceGroupMetric).alternatives.length).toBe(
        (once[0] as ChoiceGroupMetric).alternatives.length
      );
    });
  });

  describe('effort/effort choice: Effort(A) Slash Effort(B) → ChoiceGroupMetric', () => {
    it('emits a ChoiceGroupMetric for two efforts', () => {
      const out = fuseUnitsInMetrics(
        [new EffortMetric('Run'), new SlashMetric(), new EffortMetric('Walk')],
        std,
      );
      expect(out).toHaveLength(1);
      expect(out[0].type).toBe(MetricType.Choice);
      const alts = (out[0] as ChoiceGroupMetric).alternatives;
      expect(alts).toHaveLength(2);
      expect(alts[0].value).toBe('Run');
      expect(alts[1].value).toBe('Walk');
    });

    it('collects three consecutive slash-separated efforts into one group', () => {
      const out = fuseUnitsInMetrics(
        [
          new EffortMetric('Run'),
          new SlashMetric(),
          new EffortMetric('Walk'),
          new SlashMetric(),
          new EffortMetric('Rest'),
        ],
        std,
      );
      expect(out).toHaveLength(1);
      expect(out[0].type).toBe(MetricType.Choice);
      const alts = (out[0] as ChoiceGroupMetric).alternatives;
      expect(alts).toHaveLength(3);
      expect(alts.map((a: any) => a.value)).toEqual(['Run', 'Walk', 'Rest']);
    });

    it('number/slash/number/unit produces ChoiceGroupMetric, not effort split', () => {
      const out = fuseUnitsInMetrics(
        [new RepMetric(135), new SlashMetric(), new RepMetric(185), new EffortMetric('kg')],
        std,
      );
      expect(out).toHaveLength(1);
      expect(out[0].type).toBe(MetricType.Choice);
    });

    it('heterogeneous slash (Effort + Rep) silently drops the slash', () => {
      // "Run/5" — Effort + slash + Rep — different types, no ChoiceGroup
      const out = fuseUnitsInMetrics(
        [new EffortMetric('Run'), new SlashMetric(), new RepMetric(5)],
        std,
      );
      // Slash is consumed; Effort('Run') and Rep(5) remain
      expect(out).toHaveLength(2);
      expect(out[0].type).toBe(MetricType.Effort);
      expect(out[1].type).toBe(MetricType.Rep);
    });
  });
});
