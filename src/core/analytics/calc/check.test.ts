import { describe, expect, it } from 'bun:test';
import { checkCalcLine, inferDim, CalcRegistrationError, StaticEnv } from './check';
import { parseCalcLine, parseExpression } from './parser';
import { DIM_TIME, DIM_LENGTH, DIM_COUNT, DIM_MASS, DIM_ZERO } from './dimensions';
import type { DimVector } from './dimensions';

const env: StaticEnv = {
  refDim: (name) =>
    ({
      reps: DIM_COUNT,
      elapsed: DIM_TIME,
      distance: DIM_LENGTH,
      resistance: DIM_MASS,
      sessionRpe: DIM_ZERO,
      'session.duration': DIM_TIME,
      effortLabel: DIM_ZERO,
    } as Record<string, DimVector>)[name],
  callDim: (name, argDims) => (name === 'sum' || name === 'max' ? argDims[0] : undefined),
};

const check = (src: string) => checkCalcLine(parseCalcLine(src), env);

describe('static dimension checking', () => {
  it('accepts the built-in segment calcs', () => {
    expect(check('pace.reps = reps / convert(elapsed, min) -> reps/min when has(reps)')).toEqual([0, 0, -1, 1, 0]);
    expect(check('pace.speed = distance / convert(elapsed, s) -> m/s when has(distance)')).toEqual([1, 0, -1, 0, 0]);
    expect(check('pace.runner = convert(elapsed, min) / convert(distance, km) -> min/km')).toEqual([-1, 0, 1, 0, 0]);
    expect(check('power = reps * resistance / convert(elapsed, s) -> auto')).toEqual([0, 1, -1, 1, 0]);
  });

  it('accepts authoritative casts over mismatched vectors (sessionLoad: time → AU)', () => {
    expect(check('sessionLoad = round(sessionRpe * convert(session.duration, min)) -> AU')).toEqual(DIM_TIME);
    expect(check('metMinutes = elapsed -> MET-min')).toEqual(DIM_TIME);
    expect(check('tis = sessionRpe -> pts')).toEqual(DIM_ZERO);
  });

  it('rejects non-cast unit mismatches at registration', () => {
    expect(() => check('x = elapsed -> kg')).toThrow(CalcRegistrationError);
    expect(() => check('x = reps * resistance -> min')).toThrow(CalcRegistrationError);
    expect(() => check('x = reps -> bogus-unit')).toThrow(CalcRegistrationError);
  });

  it('rejects dimension-mismatched arithmetic', () => {
    expect(() => check('x = reps + elapsed')).toThrow(CalcRegistrationError);
    expect(() => check('x = reps - distance')).toThrow(CalcRegistrationError);
  });

  it('allows zero-literal comparisons against any vector', () => {
    expect(() => check('x = reps when elapsed > 0')).not.toThrow();
    expect(() => check('x = reps when elapsed > distance')).toThrow(CalcRegistrationError);
  });

  it('rejects bad convert targets statically', () => {
    expect(() => check('x = convert(elapsed, kg)')).toThrow(CalcRegistrationError);
    expect(() => check('x = convert(elapsed, frobnicate)')).toThrow(CalcRegistrationError);
  });

  it('rejects unknown symbols and functions', () => {
    expect(() => check('x = nope + 1')).toThrow(CalcRegistrationError);
    expect(() => check('x = frobnicate(reps)')).toThrow(CalcRegistrationError);
  });

  it('propagates aggregate argument dimensions through callDim', () => {
    expect(check('totalReps = sum(reps) -> reps')).toEqual(DIM_COUNT);
  });

  it('infers dimensions for bare expressions', () => {
    expect(inferDim(parseExpression('reps * resistance'), env)).toEqual([0, 1, 0, 1, 0]);
  });
});
