import { describe, expect, it } from 'vitest';
import { evaluate, EvalContext, CalcEvalError } from '../../src/analytics/calc/evaluator';
import { parseExpression } from '../../src/analytics/calc/parser';
import { ABSENT, num, str, Val } from '../../src/analytics/calc/values';
import { DIM_TIME, DIM_LENGTH, DIM_COUNT, DIM_MASS, DIM_ZERO } from '../../src/analytics/calc/dimensions';

const METRICS: Record<string, Val> = {
  reps: num(21, DIM_COUNT, 'reps'),
  elapsed: num(120_000, DIM_TIME, 'ms'),
  distance: num(400, DIM_LENGTH, 'm'),
  resistance: num(60, DIM_MASS, 'kg'),
  effortLabel: str('hard'),
};

const ctx: EvalContext = {
  resolveRef: (name) => METRICS[name] ?? ABSENT,
};

const run = (src: string, c: EvalContext = ctx) => evaluate(parseExpression(src), c);

describe('evaluator: arithmetic with dimensions', () => {
  it('evaluates scalar math', () => {
    expect(run('1 + 2 * 3')).toMatchObject({ value: 7 });
    expect(run('(1 + 2) * 3')).toMatchObject({ value: 9 });
    expect(run('-4 + 1')).toMatchObject({ value: -3 });
  });

  it('tracks vectors through * and /', () => {
    // reps * resistance → mass×count (volume)
    expect(run('reps * resistance')).toMatchObject({ value: 1260, dim: [0, 1, 0, 1, 0] });
    // volume / time → power vector
    expect(run('reps * resistance / elapsed')).toMatchObject({ dim: [0, 1, -1, 1, 0] });
  });

  it('rejects adding mismatched dimensions', () => {
    expect(() => run('reps + elapsed')).toThrow(CalcEvalError);
  });

  it('division by zero yields absent, not Infinity', () => {
    expect(run('reps / (1 - 1)').kind).toBe('absent');
  });

  it('propagates absent through arithmetic', () => {
    expect(run('missing + 1').kind).toBe('absent');
  });
});

describe('evaluator: convert()', () => {
  it('converts elapsed ms to minutes', () => {
    expect(run('convert(elapsed, min)')).toMatchObject({ value: 2, unit: 'min', dim: DIM_TIME });
  });

  it('computes runner pace in min/km', () => {
    const v = run('convert(elapsed, min) / convert(distance, km)');
    expect(v).toMatchObject({ dim: [-1, 0, 1, 0, 0] });
    if (v.kind === 'number') expect(v.value).toBeCloseTo(5); // 2 min / 0.4 km
  });

  it('rejects cross-dimension conversion', () => {
    expect(() => run('convert(elapsed, km)')).toThrow(CalcEvalError);
  });
});

describe('evaluator: scalar functions', () => {
  it('min/max/clamp/abs', () => {
    expect(run('min(100, 250)')).toMatchObject({ value: 100 });
    expect(run('max(1, 2, 3)')).toMatchObject({ value: 3 });
    expect(run('clamp(250, 0, 100)')).toMatchObject({ value: 100 });
    expect(run('abs(0 - 5)')).toMatchObject({ value: 5 });
  });

  it('round with two-arg form (TIS requirement §10.5)', () => {
    expect(run('round(73.26, 1)')).toMatchObject({ value: 73.3 });
    expect(run('round(73.26)')).toMatchObject({ value: 73 });
  });

  it('floor/ceil preserve unit', () => {
    expect(run('floor(1.9)')).toMatchObject({ value: 1 });
    expect(run('ceil(1.1)')).toMatchObject({ value: 2 });
  });
});

describe('evaluator: predicates', () => {
  it('compares across compatible units in base values', () => {
    expect(run('elapsed > 0')).toMatchObject({ value: 1 });
    const c: EvalContext = { resolveRef: (n) => (n === 'a' ? num(90, DIM_TIME, 's') : n === 'b' ? num(1.5, DIM_TIME, 'min') : ABSENT) };
    expect(run('a == b', c)).toMatchObject({ value: 1 });
    expect(run('a >= b', c)).toMatchObject({ value: 1 });
  });

  it('missing data evaluates comparisons to false (#848)', () => {
    expect(run('missing > 5')).toMatchObject({ value: 0 });
    expect(run('has(missing) and true')).toMatchObject({ value: 0 });
  });

  it('string equality for lookup predicates', () => {
    expect(run('effortLabel == "hard"')).toMatchObject({ value: 1 });
    expect(run('effortLabel != "easy"')).toMatchObject({ value: 1 });
  });

  it('and/or short-circuit with truthiness', () => {
    expect(run('1 or (1 / 0 > 0)')).toMatchObject({ value: 1 });
    expect(run('0 and (1 / 0 > 0)')).toMatchObject({ value: 0 });
  });
});

describe('evaluator: has()', () => {
  it('probes presence', () => {
    expect(run('has(reps)')).toMatchObject({ value: 1 });
    expect(run('has(missing)')).toMatchObject({ value: 0 });
  });
});

describe('evaluator: extension seams', () => {
  it('delegates unknown functions to context', () => {
    const c: EvalContext = {
      ...ctx,
      callFunction: (name, args) => (name === 'sum' ? num(42, args[0].kind === 'number' ? args[0].dim : DIM_ZERO) : undefined),
    };
    expect(run('sum(reps)', c)).toMatchObject({ value: 42, dim: DIM_COUNT });
  });

  it('throws on truly unknown functions', () => {
    expect(() => run('frobnicate(1)')).toThrow(CalcEvalError);
  });

  it('rejects WQL atoms without a store-scope resolver', () => {
    expect(() => run('sum:sessionLoad{}')).toThrow(CalcEvalError);
  });

  it('delegates WQL atoms to the store resolver', () => {
    const c: EvalContext = { ...ctx, resolveWql: () => num(7) };
    expect(run('sum:sessionLoad{}', c)).toMatchObject({ value: 7 });
  });
});
