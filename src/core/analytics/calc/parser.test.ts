import { describe, expect, it } from 'bun:test';
import { parseCalcLine, parseExpression, CalcParseError } from './parser';

describe('calc parser', () => {
  it('parses arithmetic with precedence', () => {
    const ast = parseExpression('1 + 2 * 3');
    expect(ast).toEqual({
      kind: 'binary', op: '+',
      left: { kind: 'literal', value: 1 },
      right: {
        kind: 'binary', op: '*',
        left: { kind: 'literal', value: 2 },
        right: { kind: 'literal', value: 3 },
      },
    });
  });

  it('parses parentheses and unary minus', () => {
    const ast = parseExpression('-(a + b) * 2');
    expect(ast.kind).toBe('binary');
    expect((ast as { op: string }).op).toBe('*');
  });

  it('parses dotted refs (context nodes, library refs)', () => {
    expect(parseExpression('session.duration')).toEqual({ kind: 'ref', name: 'session.duration' });
    expect(parseExpression('profile.vo2max / 3.5').kind).toBe('binary');
  });

  it('parses comparison and logic keywords', () => {
    const ast = parseExpression('elapsed > 0 and not has(reps) or x == 1');
    expect(ast.kind).toBe('binary');
    expect((ast as { op: string }).op).toBe('or');
  });

  it('parses function calls with multiple args', () => {
    const ast = parseExpression('clamp(x, 1, 10)');
    expect(ast).toMatchObject({ kind: 'call', name: 'clamp' });
  });

  it('parses WQL atoms with filters and group-by', () => {
    const ast = parseExpression('sum:sessionLoad{} by {day}');
    expect(ast).toEqual({ kind: 'wql', aggregator: 'sum', metric: 'sessionLoad', filters: '', groupBy: ['day'] });
  });

  it('parses WQL atoms with effort-negation filters', () => {
    const ast = parseExpression('sum:reps{!effort:rest|pause|rest-*}');
    expect(ast).toMatchObject({ kind: 'wql', aggregator: 'sum', metric: 'reps', filters: '!effort:rest|pause|rest-*' });
  });

  it('parses without: exclusion filters as aggregate args', () => {
    const ast = parseExpression('sum(reps, without: rest|pause|rest-*)');
    expect(ast).toEqual({
      kind: 'call', name: 'sum',
      args: [{ kind: 'ref', name: 'reps' }, { kind: 'filter', value: 'rest|pause|rest-*' }],
    });
  });

  it('parses lookup calls with string args', () => {
    const ast = parseExpression('lookup("effort", effort, "met")');
    expect(ast).toMatchObject({ kind: 'call', name: 'lookup' });
  });

  it('parses a full calc line with unit and predicate', () => {
    const line = parseCalcLine('pace.runner = convert(elapsed, min) / convert(distance, km) -> min/km when has(distance)');
    expect(line.name).toBe('pace.runner');
    expect(line.unit).toBe('min/km');
    expect(line.when).toBeDefined();
    expect(line.expr.kind).toBe('binary');
  });

  it('parses a calc line without unit or predicate', () => {
    const line = parseCalcLine('segmentVolume = reps * resistance');
    expect(line.unit).toBeUndefined();
    expect(line.when).toBeUndefined();
  });

  it('keeps -> and when out of the expression when nested in calls', () => {
    const line = parseCalcLine('x = convert(a, min) -> min when b > 0');
    expect(line.unit).toBe('min');
    expect(line.expr.kind).toBe('call');
  });

  it('rejects garbage', () => {
    expect(() => parseExpression('1 +')).toThrow(CalcParseError);
    expect(() => parseCalcLine('= 5')).toThrow(CalcParseError);
  });
});
