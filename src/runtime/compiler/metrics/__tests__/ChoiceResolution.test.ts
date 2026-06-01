import { describe, it, expect } from 'bun:test';
import { MetricContainer } from '../../../../core/models/MetricContainer';
import { MetricType, type IMetric } from '../../../../core/models/Metric';
import { ChoiceGroupMetric } from '../ChoiceGroupMetric';
import {
  findUnresolvedChoices,
  isChoiceResolved,
  writeChoiceSelection,
  collapseUnresolvedChoices,
} from '../ChoiceResolution';
import { ResistanceMetric } from '../ResistanceMetric';

/** Minimal ICodeStatement stand-in: only `id` and `metrics` are read. */
function stmt(id: number, metrics: IMetric[]): any {
  return { id, metrics: new MetricContainer(metrics) };
}

function resistance(amount: number): IMetric {
  return new ResistanceMetric(amount, 'lb');
}

describe('ChoiceResolution', () => {
  it('detects an unresolved Choice Group', () => {
    const s = stmt(1, [new ChoiceGroupMetric([resistance(185), resistance(125)])]);
    const refs = findUnresolvedChoices([s]);
    expect(refs).toHaveLength(1);
    expect(refs[0].statementIndex).toBe(0);
    expect(isChoiceResolved(s, refs[0].choice)).toBe(false);
  });

  it('writeChoiceSelection collapses the chosen alternative at origin user-plan', () => {
    const choice = new ChoiceGroupMetric([resistance(185), resistance(125)]);
    const s = stmt(1, [choice]);

    writeChoiceSelection(s, choice.alternatives, 1);

    const userPlan = s.metrics.filter((m: IMetric) => m.origin === 'user-plan');
    expect(userPlan).toHaveLength(1);
    expect(userPlan[0].type).toBe(MetricType.Resistance);
    expect((userPlan[0].value as any).amount).toBe(125);
    // The Choice Group itself is removed; runtime code only sees the concrete pick.
    expect(s.metrics.some((m: IMetric) => m.type === MetricType.Choice)).toBe(false);
    expect(isChoiceResolved(s, choice)).toBe(true);
  });

  it('writeChoiceSelection is idempotent — re-selecting never accumulates duplicates', () => {
    const choice = new ChoiceGroupMetric([resistance(185), resistance(125)]);
    const s = stmt(1, [choice]);

    writeChoiceSelection(s, choice.alternatives, 0); // default
    writeChoiceSelection(s, choice.alternatives, 1); // user changes pick

    const userPlan = s.metrics.filter((m: IMetric) => m.origin === 'user-plan');
    expect(userPlan).toHaveLength(1);
    expect((userPlan[0].value as any).amount).toBe(125);
    expect(s.metrics.some((m: IMetric) => m.type === MetricType.Choice)).toBe(false);
  });

  it('out-of-range selection falls back to the first alternative', () => {
    const choice = new ChoiceGroupMetric([resistance(185), resistance(125)]);
    const s = stmt(1, [choice]);
    writeChoiceSelection(s, choice.alternatives, 99);
    const userPlan = s.metrics.find((m: IMetric) => m.origin === 'user-plan');
    expect((userPlan!.value as any).amount).toBe(185);
  });

  it('collapseUnresolvedChoices defaults every unresolved group and returns the count', () => {
    const s1 = stmt(1, [new ChoiceGroupMetric([resistance(185), resistance(125)])]);
    const s2 = stmt(2, [new ChoiceGroupMetric([resistance(95), resistance(65)])]);

    const collapsed = collapseUnresolvedChoices([s1, s2]);
    expect(collapsed).toBe(2);
    expect(findUnresolvedChoices([s1, s2])).toHaveLength(0);
    expect(s1.metrics.some((m: IMetric) => m.type === MetricType.Choice)).toBe(false);
    expect(s2.metrics.some((m: IMetric) => m.type === MetricType.Choice)).toBe(false);
    expect((s1.metrics.find((m: IMetric) => m.origin === 'user-plan')!.value as any).amount).toBe(185);
  });

  it('collapseUnresolvedChoices removes stale Choice groups without resetting an existing pick', () => {
    const choice = new ChoiceGroupMetric([resistance(185), resistance(125)]);
    const s = stmt(1, [choice]);
    s.metrics.add({ ...resistance(125), origin: 'user-plan' });

    const collapsed = collapseUnresolvedChoices([s]);

    expect(collapsed).toBe(1);
    expect(s.metrics.some((m: IMetric) => m.type === MetricType.Choice)).toBe(false);
    const userPlan = s.metrics.filter((m: IMetric) => m.origin === 'user-plan');
    expect(userPlan).toHaveLength(1);
    expect((userPlan[0].value as any).amount).toBe(125);
  });
});
