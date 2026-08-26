import { describe, expect, it } from 'bun:test';
import { analyzeCalcLine } from './calcDiagnostics';

describe('analyzeCalcLine', () => {
  it('infers a dimension vector for a valid calc line', () => {
    const r = analyzeCalcLine('segment:\n  pace = reps / convert(elapsed, min) -> reps/min', 'segment');
    expect(r.diagnostics).toEqual([]);
    expect(r.dim).toEqual([0, 0, -1, 1, 0]); // reps/min
    expect(r.compound).toBeUndefined();
  });

  it('flags a dimension mismatch between computed vector and declared unit', () => {
    const r = analyzeCalcLine('bad = reps / convert(elapsed, min) -> kg', 'segment');
    expect(r.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(r.dim).toBeUndefined();
  });

  it('flags an unknown symbol as a registration error', () => {
    const r = analyzeCalcLine('x = notAThing', 'segment');
    expect(r.diagnostics.some((d) => /Unknown symbol|notAThing/.test(d.message))).toBe(true);
  });

  it('reports a syntax error for a malformed line', () => {
    const r = analyzeCalcLine('x = reps +', 'segment');
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });

  it('resolves library node references against the seeded built-ins', () => {
    const r = analyzeCalcLine('workout:\n  load = round(rpeSource.rpe * convert(session.duration, min)) -> AU', 'workout');
    expect(r.diagnostics).toEqual([]);
  });
});
