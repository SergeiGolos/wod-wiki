import { describe, expect, it } from 'vitest';

import type { IMetric } from '@bitcobblers/wod-wiki-core';
import { parseMetricLine } from '../../../src/parser-fixture/metricLine';
import { compareStatement, renderMetric } from '../../../src/parser-fixture/compare';

const metric = (partial: Partial<IMetric> & { type: string }): IMetric =>
  ({ origin: 'parser', ...partial }) as IMetric;

describe('parseMetricLine', () => {
  it('parses type + bare token value', () => {
    const line = parseMetricLine('- Hint domain.cardio @dialect', 'f.md', 3);
    expect(line).toMatchObject({ type: 'hint', value: 'domain.cardio', origin: 'dialect' });
    expect(line.kind).toBe('string');
  });

  it('canonicalizes PascalCase types to kebab', () => {
    expect(parseMetricLine('- ClimbSendType "flash"', 'f.md', 1).type).toBe('climb-send-type');
    expect(parseMetricLine('- climb-send-type "flash"', 'f.md', 1).type).toBe('climb-send-type');
  });

  it('parses time literals to milliseconds', () => {
    expect(parseMetricLine('- Duration 5:00', 'f.md', 1)).toMatchObject({ kind: 'number', value: 300000 });
    expect(parseMetricLine('- Duration 1:30:00', 'f.md', 1)).toMatchObject({ value: 5400000 });
  });

  it('parses plain numbers, quoted strings, and dots in bare tokens', () => {
    expect(parseMetricLine('- Rep 20', 'f.md', 1)).toMatchObject({ kind: 'number', value: 20 });
    expect(parseMetricLine('- Effort "Back Squat"', 'f.md', 1)).toMatchObject({ kind: 'string', value: 'Back Squat' });
  });

  it('parses amount+unit sugar into a structured assertion', () => {
    expect(parseMetricLine('- Resistance 225 lb', 'f.md', 1)).toMatchObject({
      kind: 'amountUnit', amount: 225, unit: 'lb',
    });
  });

  it('parses ? as the undefined-value literal', () => {
    expect(parseMetricLine('- Rep ? @hinted', 'f.md', 1)).toMatchObject({ kind: 'undefined', origin: 'hinted' });
  });

  it('parses quoted tail values containing spaces', () => {
    const line = parseMetricLine('- Text text:"last set heavy"', 'f.md', 1);
    expect(line.kind).toBe('object');
    expect(line.fields).toEqual({ text: 'last set heavy' });
  });

  it('keeps @-containing quoted values intact', () => {
    const line = parseMetricLine('- Effort "five @ten"', 'f.md', 1);
    expect(line.kind).toBe('string');
    expect(line.value).toBe('five @ten');
    expect(line.origin).toBeUndefined();
  });

  it('rejects quoted primary combined with object tails', () => {
    expect(() => parseMetricLine('- Text "x" text:"y"', 'f.md', 4)).toThrow(/cannot combine with object tails/i);
  });

  it('parses object tails key:value pairs', () => {
    const line = parseMetricLine('- ClimbGrade raw:V5 system:v-scale @dialect', 'f.md', 7);
    expect(line.kind).toBe('object');
    expect(line.fields).toEqual({ raw: 'V5', system: 'v-scale' });
    expect(line.origin).toBe('dialect');
  });

  it('diagnoses malformed lines with file + line', () => {
    expect(() => parseMetricLine('- Duration', 'timers.md', 12)).toThrow(/timers\.md.*line 12.*is missing a value/i);
    expect(() => parseMetricLine('Duration 5:00', 'timers.md', 13)).toThrow(/timers\.md.*line 13.*must start with/i);
  });
});

describe('compareStatement', () => {
  it('closed mode: exact multiset passes; extra actual metric fails', () => {
    const exp = [parseMetricLine('- Rep 5', 'f.md', 1), parseMetricLine('- Effort "Pull-ups"', 'f.md', 2)];
    expect(compareStatement(exp, [metric({ type: 'rep', value: 5 }), metric({ type: 'effort', value: 'Pull-ups' })], 'closed')).toEqual([]);
    const diffs = compareStatement(exp, [metric({ type: 'rep', value: 5 })], 'closed');
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toMatch(/unmatched expectation.*Effort "Pull-ups"/i);
  });

  it('closed mode: unmatched actual metric is reported in DSL form', () => {
    const exp = [parseMetricLine('- Rep 5', 'f.md', 1)];
    const diffs = compareStatement(exp, [metric({ type: 'rep', value: 5 }), metric({ type: 'hint', value: 'workout.amrap', origin: 'dialect' })], 'closed');
    expect(diffs[0]).toMatch(/unexpected metric.*Hint workout\.amrap/i);
  });

  it('subset mode ignores extra actual metrics', () => {
    const exp = [parseMetricLine('- Rep 5', 'f.md', 1)];
    expect(compareStatement(exp, [metric({ type: 'rep', value: 5 }), metric({ type: 'hint', value: 'x', origin: 'dialect' })], 'subset')).toEqual([]);
  });

  it('origin pin mismatches fail; unpinned origins pass', () => {
    const exp = parseMetricLine('- Hint workout.amrap @dialect', 'f.md', 1);
    expect(compareStatement([exp], [metric({ type: 'hint', value: 'workout.amrap', origin: 'parser' })], 'closed')).toHaveLength(1);
    expect(compareStatement([exp], [metric({ type: 'hint', value: 'workout.amrap', origin: 'dialect' })], 'closed')).toEqual([]);
    const unpinned = parseMetricLine('- Hint workout.amrap', 'f.md', 1);
    expect(compareStatement([unpinned], [metric({ type: 'hint', value: 'workout.amrap', origin: 'parser' })], 'closed')).toEqual([]);
  });

  it('amount+unit sugar asserts value.amount, value.unit and metric.unit', () => {
    const exp = parseMetricLine('- Resistance 225 lb', 'f.md', 1);
    const good = metric({ type: 'resistance', value: { amount: 225, unit: 'lb' }, unit: 'lb' });
    expect(compareStatement([exp], [good], 'closed')).toEqual([]);
    const noTopUnit = metric({ type: 'resistance', value: { amount: 225, unit: 'lb' } });
    expect(compareStatement([exp], [noTopUnit], 'closed')).toHaveLength(1);
  });

  it('object tails compare field-wise and ignore unlisted fields', () => {
    const exp = parseMetricLine('- ClimbGrade raw:V5 system:v-scale', 'f.md', 1);
    const good = metric({ type: 'climb-grade', value: { raw: 'V5', system: 'v-scale', normalizedRank: 5 }, origin: 'dialect' });
    expect(compareStatement([exp], [good], 'closed')).toEqual([]);
    const bad = metric({ type: 'climb-grade', value: { raw: 'V6', system: 'v-scale' }, origin: 'dialect' });
    expect(compareStatement([exp], [bad], 'closed')).toHaveLength(1);
  });

  it('numeric object fields compare numerically', () => {
    const exp = parseMetricLine('- ClimbGrade normalizedRank:5', 'f.md', 1);
    const good = metric({ type: 'climb-grade', value: { normalizedRank: 5 }, origin: 'dialect' });
    expect(compareStatement([exp], [good], 'closed')).toEqual([]);
  });

  it('value kind mismatch reports expected vs actual', () => {
    const exp = parseMetricLine('- Duration 5:00', 'f.md', 1);
    const diffs = compareStatement([exp], [metric({ type: 'duration', value: 299000 })], 'closed');
    expect(diffs[0]).toMatch(/Duration 5:00.*299000|299000.*Duration 5:00/);
  });
});

describe('renderMetric', () => {
  it('renders DSL-like form for diagnostics', () => {
    expect(renderMetric(metric({ type: 'effort', value: 'Row' }))).toBe('Effort Row @parser');
    expect(renderMetric(metric({ type: 'hint', value: 'workout.run', origin: 'dialect' }))).toBe('Hint workout.run @dialect');
    expect(renderMetric(metric({ type: 'duration', value: 300000 }))).toBe('Duration 300000 @parser');
  });
});
