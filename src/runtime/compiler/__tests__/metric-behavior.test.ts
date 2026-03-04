import { describe, it, expect } from 'bun:test';
import { TimerMetric } from '@/runtime/compiler/metrics/TimerMetric';
import { DurationMetric } from '@/runtime/compiler/metrics/DurationMetric';
import { RepMetric } from '@/runtime/compiler/metrics/RepMetric';
import { DistanceMetric } from '@/runtime/compiler/metrics/DistanceMetric';
import { ResistanceMetric } from '@/runtime/compiler/metrics/ResistanceMetric';
import { SpansMetric } from '@/runtime/compiler/metrics/SpansMetric';
import { ElapsedMetric } from '@/runtime/compiler/metrics/ElapsedMetric';
import { TotalMetric } from '@/runtime/compiler/metrics/TotalMetric';
import { SystemTimeMetric } from '@/runtime/compiler/metrics/SystemTimeMetric';
import { SoundMetric } from '@/runtime/compiler/metrics/SoundMetric';
import { CurrentRoundMetric } from '@/runtime/compiler/metrics/CurrentRoundMetric';
import { MetricBehavior } from '@/types/MetricBehavior';
import { MetricType } from '@/core/models/Metric';

describe('Fragment behavior & metadata', () => {
  it('TimerMetric (defined) -> behavior=Defined and type=duration', () => {
    const t = new TimerMetric('5:00');
    expect(t.type).toBe('duration');
    expect(t.behavior).toBe(MetricBehavior.Defined);
    expect(t.origin).toBe('parser');
  });

  it('TimerMetric (collectible :?) -> behavior=Hint and origin=runtime', () => {
    const t = new TimerMetric(':?');
    expect(t.value).toBeUndefined();
    expect(t.behavior).toBe(MetricBehavior.Hint);
    expect(t.origin).toBe('runtime');
  });

  it('DurationMetric sets behavior=Defined for parser durations', () => {
    const d = new DurationMetric('2:00');
    expect(d.behavior).toBe(MetricBehavior.Defined);
    expect(d.origin).toBe('parser');
  });

  it('RepMetric defined vs collectible behavior', () => {
    const r1 = new RepMetric(10);
    const r2 = new RepMetric(undefined);
    expect(r1.behavior).toBe(MetricBehavior.Defined);
    expect(r2.behavior).toBe(MetricBehavior.Hint);
  });

  it('Distance/Resistance collectible -> Hint; defined -> Defined', () => {
    const d1 = new DistanceMetric(400, 'm');
    const d2 = new DistanceMetric(undefined, 'm');
    expect(d1.behavior).toBe(MetricBehavior.Defined);
    expect(d2.behavior).toBe(MetricBehavior.Hint);

    const w1 = new ResistanceMetric(135, 'lb');
    const w2 = new ResistanceMetric(undefined, 'lb');
    expect(w1.behavior).toBe(MetricBehavior.Defined);
    expect(w2.behavior).toBe(MetricBehavior.Hint);
  });

  it('SpansMetric is Recorded; Elapsed/Total are Calculated', () => {
    const spans = [{ started: 0, ended: 100 }, { started: 200, ended: 350 }];
    const s = new SpansMetric(spans as any, 'block-1', new Date());
    const e = new ElapsedMetric(250, 'block-1', new Date());
    const t = new TotalMetric(350, 'block-1', new Date());

    expect(s.behavior).toBe(MetricBehavior.Recorded);
    expect(e.behavior).toBe(MetricBehavior.Calculated);
    expect(t.behavior).toBe(MetricBehavior.Calculated);
  });

  it('SystemTimeMetric is Recorded', () => {
    const now = new Date();
    const st = new SystemTimeMetric(now, 'block-1');
    expect(st.behavior).toBe(MetricBehavior.Recorded);
  });

  it('SoundMetric is Recorded', () => {
    const s = new SoundMetric('beep', 'countdown', { atSecond: 3 });
    expect(s.behavior).toBe(MetricBehavior.Recorded);
  });

  it('CurrentRoundMetric is Recorded with runtime origin', () => {
    const cr = new CurrentRoundMetric(2, 5, 'block-1', new Date());
    expect(cr.type).toBe('current-round');
    expect(cr.metricType).toBe(MetricType.CurrentRound);
    expect(cr.behavior).toBe(MetricBehavior.Recorded);
    expect(cr.origin).toBe('runtime');
    expect(cr.value).toBe(2);
    expect(cr.image).toBe('Round 2 of 5');
  });

  it('CurrentRoundMetric handles unbounded rounds', () => {
    const cr = new CurrentRoundMetric(3, undefined, 'block-1', new Date());
    expect(cr.value).toBe(3);
    expect(cr.image).toBe('Round 3');
  });
});