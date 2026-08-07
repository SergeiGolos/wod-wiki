import { describe, expect, it } from 'bun:test';
import { runCalcPreview } from './calcPreview';
import { compileLineForm } from '../../../core/analytics/calc/lineform';
import { previewWorkoutLogs, previewBlock } from './previewWorkout';

const def = (src: string, scope: 'segment' | 'workout' | 'store') =>
  compileLineForm(src, { scope }).defs[0];

describe('runCalcPreview', () => {
  it('evaluates a segment-scope calc per segment via the headless engine', () => {
    const r = runCalcPreview({
      logs: previewWorkoutLogs,
      block: previewBlock,
      defs: [def('pace = reps / convert(elapsed, min) -> reps/min when has(reps)', 'segment')],
      scope: 'segment',
    });
    expect(r.rows.length).toBe(previewWorkoutLogs.length);
    // 21 reps / 2.5 min = 8.4 reps/min
    expect(r.rows[0]).toMatchObject({ text: '8.4', unit: 'reps/min' });
    expect(r.errors).toEqual([]);
  });

  it('skips inapplicable segments (when predicate) with a null row', () => {
    // Only applies when distance present — none in fixture → all null.
    const r = runCalcPreview({
      logs: previewWorkoutLogs,
      block: previewBlock,
      defs: [def('speed = distance / convert(elapsed, s) -> m/s when has(distance)', 'segment')],
      scope: 'segment',
    });
    expect(r.rows.every((row) => row === null)).toBe(true);
  });

  it('computes workout-scope running totals after each line', () => {
    const r = runCalcPreview({
      logs: previewWorkoutLogs,
      block: previewBlock,
      defs: [def('total = sum(reps) -> reps key reps when has(sum(reps)) and sum(reps) > 0', 'workout')],
      scope: 'workout',
    });
    expect(r.rows.length).toBe(previewWorkoutLogs.length);
    // After the first thruster (21 reps) and pull-up (21) -> 42, ... total 90.
    const last = r.rows[r.rows.length - 1];
    expect(last?.text).toBe('90');
    expect(r.errors).toEqual([]);
  });

  it('returns a store-scope trailing-window series', () => {
    const r = runCalcPreview({
      logs: previewWorkoutLogs,
      block: previewBlock,
      defs: [def('acwr = windowMean(daily, 7d) / windowMean(daily, 28d) -> ratio key calc.acwr where daily = sum:sessionLoad{} by {day}', 'store')],
      scope: 'store',
    });
    expect(r.series).toBeDefined();
    expect(r.series!.length).toBe(7);
  });
});
