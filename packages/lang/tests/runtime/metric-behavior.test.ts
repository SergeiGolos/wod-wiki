import { describe, it, expect } from 'vitest';
import { DurationMetric } from '../../src/runtime/compiler/metrics/DurationMetric';
import { RepMetric } from '../../src/runtime/compiler/metrics/RepMetric';
import { DistanceMetric } from '../../src/runtime/compiler/metrics/DistanceMetric';
import { ResistanceMetric } from '../../src/runtime/compiler/metrics/ResistanceMetric';
import { SpansMetric } from '../../src/runtime/compiler/metrics/SpansMetric';
import { ElapsedMetric } from '../../src/runtime/compiler/metrics/ElapsedMetric';
import { TotalMetric } from '../../src/runtime/compiler/metrics/TotalMetric';
import { SystemTimeMetric } from '../../src/runtime/compiler/metrics/SystemTimeMetric';
import { SoundMetric } from '../../src/runtime/compiler/metrics/SoundMetric';
import { CurrentRoundMetric } from '../../src/runtime/compiler/metrics/CurrentRoundMetric';
import { MetricType } from '@bitcobblers/wod-wiki-core';
import { TimeSpan } from '../../src/runtime/models/TimeSpan';

describe('Fragment behavior & metadata', () => {
  it('DurationMetric sets origin=parser for parser durations', () => {
    const d = new DurationMetric('2:00');
    expect(d.origin).toBe('parser');
  });

  it('RepMetric parser vs hinted origins', () => {
    const r1 = new RepMetric(10);
    const r2 = new RepMetric(undefined);
    expect(r1.origin).toBe('parser');
    expect(r2.origin).toBe('hinted');
  });

  it('Distance/Resistance collectible -> hinted; defined -> parser', () => {
    const d1 = new DistanceMetric(400, 'm');
    const d2 = new DistanceMetric(undefined, 'm');
    expect(d1.origin).toBe('parser');
    expect(d2.origin).toBe('hinted');

    const w1 = new ResistanceMetric(135, 'lb');
    const w2 = new ResistanceMetric(undefined, 'lb');
    expect(w1.origin).toBe('parser');
    expect(w2.origin).toBe('hinted');
  });

  it('SpansMetric is tracked; Elapsed/Total are analyzed', () => {
    const spans = [new TimeSpan(0, 100), new TimeSpan(200, 350)];
    const s = new SpansMetric(spans, 'block-1', new Date());
    const e = new ElapsedMetric(250, 'block-1', new Date());
    const t = new TotalMetric(350, 'block-1', new Date());

    expect(s.origin).toBe('tracked');
    expect(e.origin).toBe('analyzed');
    expect(t.origin).toBe('analyzed');
  });

  it('SystemTimeMetric is tracked', () => {
    const now = new Date();
    const st = new SystemTimeMetric(now, 'block-1');
    expect(st.origin).toBe('tracked');
  });

  it('SoundMetric is tracked', () => {
    const s = new SoundMetric('beep', 'countdown', { atSecond: 3 });
    expect(s.origin).toBe('tracked');
  });

  it('CurrentRoundMetric is tracked with runtime origin', () => {
    const cr = new CurrentRoundMetric(2, 5, 'block-1', new Date());
    expect(cr.type).toBe('current-round');
    expect(cr.type).toBe(MetricType.CurrentRound);
    expect(cr.origin).toBe('tracked');
    expect(cr.value).toBe(2);
    expect(cr.image).toBe('Round 2 of 5');
  });

  it('CurrentRoundMetric handles unbounded rounds', () => {
    const cr = new CurrentRoundMetric(3, undefined, 'block-1', new Date());
    expect(cr.value).toBe(3);
    expect(cr.image).toBe('Round 3');
  });
});