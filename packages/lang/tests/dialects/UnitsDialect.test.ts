import { describe, it, expect } from 'vitest';
import { UnitsDialect } from '../../src/dialects/UnitsDialect';
import { UnitRegistry } from '../../src/metrics/units';
import { MetricType } from '@wod-wiki/core';
import { MetricContainer } from '@wod-wiki/core';
import { RepMetric } from '../../src/runtime/compiler/metrics/RepMetric';
import { EffortMetric } from '../../src/runtime/compiler/metrics/EffortMetric';
import { ICodeStatement } from '@wod-wiki/core';
import { IMetric } from '@wod-wiki/core';

function makeStatement(metrics: IMetric[]): ICodeStatement {
  return {
    metrics: MetricContainer.from(metrics),
    metricMeta: new Map(),
  } as unknown as ICodeStatement;
}

describe('UnitsDialect', () => {
  it('fuses Number + unit-word via transform', () => {
    const stmt = makeStatement([new RepMetric(100), new EffortMetric('m Run')]);
    new UnitsDialect().transform(stmt);
    const arr = stmt.metrics.toArray();
    expect(arr).toHaveLength(2);
    expect(arr[0].type).toBe(MetricType.Distance);
    expect((arr[0].value as any).unit).toBe('m');
    expect(arr[1].value).toBe('Run');
  });

  it('contributes no hints (analyze is empty)', () => {
    const stmt = makeStatement([new RepMetric(5), new EffortMetric('Burpees')]);
    expect(new UnitsDialect().analyze(stmt)).toEqual({});
  });

  it('accepts an extended unit set (dialect override / addition)', () => {
    const poodSet = UnitRegistry.standard().extend({ canonical: 'pood', dimension: 'mass', aliases: ['poods'] });
    const stmt = makeStatement([new RepMetric(2), new EffortMetric('pood Swings')]);
    new UnitsDialect(poodSet).transform(stmt);
    const arr = stmt.metrics.toArray();
    expect(arr[0].type).toBe(MetricType.Resistance);
    expect((arr[0].value as any).unit).toBe('pood');
  });

  it('is idempotent across repeated transforms', () => {
    const stmt = makeStatement([new RepMetric(24), new EffortMetric('in')]);
    const d = new UnitsDialect();
    d.transform(stmt);
    d.transform(stmt);
    const arr = stmt.metrics.toArray();
    expect(arr).toHaveLength(1);
    expect(arr[0].type).toBe(MetricType.Distance);
  });
});
