import { describe, it, expect } from 'bun:test';
import { TimerFragment } from '@/runtime/compiler/fragments/TimerFragment';
import { DurationFragment } from '@/runtime/compiler/fragments/DurationFragment';
import { RepFragment } from '@/runtime/compiler/fragments/RepFragment';
import { DistanceFragment } from '@/runtime/compiler/fragments/DistanceFragment';
import { ResistanceFragment } from '@/runtime/compiler/fragments/ResistanceFragment';
import { SpansFragment } from '@/runtime/compiler/fragments/SpansFragment';
import { ElapsedFragment } from '@/runtime/compiler/fragments/ElapsedFragment';
import { TotalFragment } from '@/runtime/compiler/fragments/TotalFragment';
import { SystemTimeFragment } from '@/runtime/compiler/fragments/SystemTimeFragment';
import { SoundFragment } from '@/runtime/compiler/fragments/SoundFragment';
import { MetricBehavior } from '@/types/MetricBehavior';

const meta = { line: 1, startOffset: 0, endOffset: 1, columnStart: 0, columnEnd: 1, length: 1 } as any;

describe('Fragment behavior & metadata', () => {
  it('TimerFragment (defined) -> behavior=Defined and type=timer', () => {
    const t = new TimerFragment('5:00', meta);
    expect(t.type).toBe('timer');
    expect(t.behavior).toBe(MetricBehavior.Defined);
    expect(t.origin).toBe('parser');
  });

  it('TimerFragment (collectible :?) -> behavior=Hint and origin=runtime', () => {
    const t = new TimerFragment(':?', meta);
    expect(t.value).toBeUndefined();
    expect(t.behavior).toBe(MetricBehavior.Hint);
    expect(t.origin).toBe('runtime');
  });

  it('DurationFragment sets behavior=Defined for parser durations', () => {
    const d = new DurationFragment('2:00', meta);
    expect(d.behavior).toBe(MetricBehavior.Defined);
    expect(d.origin).toBe('parser');
  });

  it('RepFragment defined vs collectible behavior', () => {
    const r1 = new RepFragment(10, meta);
    const r2 = new RepFragment(undefined, meta);
    expect(r1.behavior).toBe(MetricBehavior.Defined);
    expect(r2.behavior).toBe(MetricBehavior.Hint);
  });

  it('Distance/Resistance collectible -> Hint; defined -> Defined', () => {
    const d1 = new DistanceFragment(400, 'm', meta);
    const d2 = new DistanceFragment(undefined, 'm', meta);
    expect(d1.behavior).toBe(MetricBehavior.Defined);
    expect(d2.behavior).toBe(MetricBehavior.Hint);

    const w1 = new ResistanceFragment(135, 'lb', meta);
    const w2 = new ResistanceFragment(undefined, 'lb', meta);
    expect(w1.behavior).toBe(MetricBehavior.Defined);
    expect(w2.behavior).toBe(MetricBehavior.Hint);
  });

  it('SpansFragment is Recorded; Elapsed/Total are Calculated', () => {
    const spans = [{ started: 0, ended: 100 }, { started: 200, ended: 350 }];
    const s = new SpansFragment(spans as any, 'block-1', new Date());
    const e = new ElapsedFragment(250, 'block-1', new Date());
    const t = new TotalFragment(350, 'block-1', new Date());

    expect(s.behavior).toBe(MetricBehavior.Recorded);
    expect(e.behavior).toBe(MetricBehavior.Calculated);
    expect(t.behavior).toBe(MetricBehavior.Calculated);
  });

  it('SystemTimeFragment is Recorded', () => {
    const now = new Date();
    const st = new SystemTimeFragment(now, 'block-1');
    expect(st.behavior).toBe(MetricBehavior.Recorded);
  });

  it('SoundFragment persists meta and is Recorded', () => {
    const s = new SoundFragment('beep', 'countdown', { atSecond: 3, meta });
    expect(s.behavior).toBe(MetricBehavior.Recorded);
    expect(s.meta).toEqual(meta);
  });
});