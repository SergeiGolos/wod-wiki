import { describe, expect, it } from 'bun:test';

import { MetricType } from '../../core/models/Metric';
import { DistanceMetric } from '../../runtime/compiler/metrics/DistanceMetric';
import { DurationMetric } from '../../runtime/compiler/metrics/DurationMetric';
import { EffortMetric } from '../../runtime/compiler/metrics/EffortMetric';
import { GroupMetric } from '../../runtime/compiler/metrics/GroupMetric';
import { ResistanceMetric } from '../../runtime/compiler/metrics/ResistanceMetric';
import { classifyStatements } from '../semantic-classifier';
import { SyntaxFacts, SyntaxMeta, SyntaxPrimitive, SyntaxStatement } from '../syntax-facts';

const meta = (startOffset: number, endOffset: number, raw: string): SyntaxMeta => ({
  line: 1,
  startOffset,
  endOffset,
  columnStart: startOffset,
  columnEnd: endOffset,
  length: endOffset - startOffset,
  raw,
});

const statement = (primitives: SyntaxPrimitive[]): SyntaxStatement => ({
  id: 1,
  line: 1,
  meta: meta(0, 20, '- sample'),
  primitives,
  children: [],
  isLeaf: true,
});

describe('classifyStatements', () => {
  it('classifies quantity primitives into resistance/distance/rep metrics', () => {
    const facts: SyntaxFacts = {
      statements: [
        statement([
          {
            kind: 'quantity',
            raw: '95',
            meta: meta(0, 2, '95'),
            value: 95,
            unit: '',
            hasAtSign: false,
            hasWeightUnit: false,
            hasDistanceUnit: false,
          },
          {
            kind: 'quantity',
            raw: 'kg',
            meta: meta(3, 5, 'kg'),
            value: undefined,
            unit: 'kg',
            hasAtSign: false,
            hasWeightUnit: true,
            hasDistanceUnit: false,
          },
          {
            kind: 'quantity',
            raw: '400',
            meta: meta(6, 9, '400'),
            value: 400,
            unit: '',
            hasAtSign: false,
            hasWeightUnit: false,
            hasDistanceUnit: false,
          },
          {
            kind: 'quantity',
            raw: 'm',
            meta: meta(10, 11, 'm'),
            value: undefined,
            unit: 'm',
            hasAtSign: false,
            hasWeightUnit: false,
            hasDistanceUnit: true,
          },
          {
            kind: 'quantity',
            raw: '@20',
            meta: meta(12, 15, '@20'),
            value: 20,
            unit: '',
            hasAtSign: true,
            hasWeightUnit: false,
            hasDistanceUnit: false,
          },
        ]),
      ],
    };

    const [result] = classifyStatements(facts);

    const resistance = result.getAllMetricsByType(MetricType.Resistance) as ResistanceMetric[];
    const distance = result.getAllMetricsByType(MetricType.Distance) as DistanceMetric[];

    expect(resistance).toHaveLength(2);
    expect(resistance[0].value).toEqual({ amount: 95, unit: 'kg' });
    expect(resistance[1].value).toEqual({ amount: 20, unit: '' });

    expect(distance).toHaveLength(1);
    expect(distance[0].value).toEqual({ amount: 400, unit: 'm' });
  });

  it('adds required timer behavior hint from duration primitives', () => {
    const facts: SyntaxFacts = {
      statements: [
        statement([
          {
            kind: 'duration',
            raw: '*5:00',
            meta: meta(0, 5, '*5:00'),
            timerRaw: '5:00',
            hasTrend: false,
            isRequired: true,
          },
        ]),
      ],
    };

    const [result] = classifyStatements(facts);
    const duration = result.getMetric(MetricType.Duration) as DurationMetric;

    expect(duration).toBeInstanceOf(DurationMetric);
    expect(duration.required).toBe(true);
    expect(result.hints?.has('behavior.required_timer')).toBe(true);
  });

  it('merges contiguous fragments and preserves separated fragments', () => {
    const facts: SyntaxFacts = {
      statements: [
        statement([
          {
            kind: 'effort',
            raw: 'hard',
            meta: meta(0, 4, 'hard'),
          },
          {
            kind: 'effort',
            raw: 'fast',
            meta: meta(5, 9, 'fast'),
          },
          {
            kind: 'effort',
            raw: 'clean',
            meta: meta(12, 17, 'clean'),
          },
        ]),
      ],
    };

    const [result] = classifyStatements(facts);
    const effort = result.getAllMetricsByType(MetricType.Effort) as EffortMetric[];

    expect(effort).toHaveLength(2);
    expect(effort[0].effort).toBe('hard fast');
    expect(effort[1].effort).toBe('clean');
  });

  it('maps lap primitives and keeps child grouping semantics from syntax facts', () => {
    const facts: SyntaxFacts = {
      statements: [
        {
          id: 1,
          line: 1,
          meta: meta(0, 10, '- parent'),
          primitives: [
            {
              kind: 'lap',
              raw: '+',
              meta: meta(0, 1, '+'),
              lapType: 'compose',
            },
          ],
          children: [[2, 3], [4]],
          isLeaf: false,
        },
      ],
    };

    const [result] = classifyStatements(facts);
    const group = result.getMetric(MetricType.Group) as GroupMetric;

    expect(group).toBeInstanceOf(GroupMetric);
    expect(group.group).toBe('compose');
    expect(result.children).toEqual([[2, 3], [4]]);
    expect(result.isLeaf).toBe(false);
  });
});
