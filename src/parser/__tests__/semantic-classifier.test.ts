import { describe, expect, it } from 'bun:test';

import { hasHint } from '../../core/metrics/hints';
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
  it('classifies bare quantities as Rep and @-quantities as Resistance (units fused later)', () => {
    const facts: SyntaxFacts = {
      statements: [
        statement([
          {
            kind: 'quantity',
            raw: '95',
            meta: meta(0, 2, '95'),
            value: 95,
            hasAtSign: false,
          },
          {
            kind: 'quantity',
            raw: '400',
            meta: meta(6, 9, '400'),
            value: 400,
            hasAtSign: false,
          },
          {
            kind: 'quantity',
            raw: '@20',
            meta: meta(12, 15, '@20'),
            value: 20,
            hasAtSign: true,
          },
        ]),
      ],
    };

    const [result] = classifyStatements(facts);

    // The classifier is unit-agnostic now: bare numbers are Reps; only the `@`
    // load marker yields a Resistance (with an empty unit, filled by fusion).
    const reps = result.getAllMetricsByType(MetricType.Rep);
    const resistance = result.getAllMetricsByType(MetricType.Resistance) as ResistanceMetric[];
    const distance = result.getAllMetricsByType(MetricType.Distance) as DistanceMetric[];

    expect(reps.map((m) => m.value)).toEqual([95, 400]);
    expect(distance).toHaveLength(0);
    expect(resistance).toHaveLength(1);
    expect(resistance[0].value).toEqual({ amount: 20, unit: '' });
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
    expect(hasHint(result, 'behavior.required_timer')).toBe(true);
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

  it('maps property primitives into known and custom metrics', () => {
    const facts: SyntaxFacts = {
      statements: [
        statement([
          {
            kind: 'property',
            raw: 'rpe: 8',
            meta: meta(0, 6, 'rpe: 8'),
            key: 'rpe',
            valueRaw: '8',
            value: 8,
          },
          {
            kind: 'property',
            raw: 'location: Sender One',
            meta: meta(7, 27, 'location: Sender One'),
            key: 'location',
            valueRaw: 'Sender One',
            value: 'Sender One',
          },
        ]),
      ],
    };

    const [result] = classifyStatements(facts);

    expect(result.getMetric(MetricType.SessionRPE)).toMatchObject({
      value: 8,
      image: 'rpe: 8',
      origin: 'parser',
    });

    const custom = result.getAllMetricsByType(MetricType.Custom);
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({
      value: 'Sender One',
      image: 'location: Sender One',
      origin: 'parser',
    });
    expect((custom[0] as any).key).toBe('location');
  });

  it('maps metric_object primitives into known and custom property metrics', () => {
    const facts: SyntaxFacts = {
      statements: [
        statement([
          {
            kind: 'metric_object',
            raw: '{"intensity": 80, "rpe": 8, "focus": "hamstrings"}',
            meta: meta(0, 45, '{"intensity": 80, "rpe": 8, "focus": "hamstrings"}'),
            pairs: [
              { key: 'intensity', value: 80 },
              { key: 'rpe', value: 8 },
              { key: 'focus', value: 'hamstrings' },
            ],
          },
        ]),
      ],
    };

    const [result] = classifyStatements(facts);

    expect(result.getMetric(MetricType.Intensity)).toMatchObject({
      key: 'intensity',
      value: 80,
      type: 'intensity',
    });

    expect(result.getMetric(MetricType.SessionRPE)).toMatchObject({
      key: 'rpe',
      value: 8,
      type: 'session-rpe',
    });

    const custom = result.getAllMetricsByType(MetricType.Custom);
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({
      key: 'focus',
      value: 'hamstrings',
      type: 'custom',
    });
  });

  it('maps metric_object primitives alongside other primitives on the same statement', () => {
    const facts: SyntaxFacts = {
      statements: [
        statement([
          {
            kind: 'quantity',
            raw: '5',
            meta: meta(0, 1, '5'),
            value: 5,
            hasAtSign: false,
          },
          {
            kind: 'effort',
            raw: 'Back Squat',
            meta: meta(2, 12, 'Back Squat'),
          },
          {
            kind: 'metric_object',
            raw: '{"rpe": 8}',
            meta: meta(13, 23, '{"rpe": 8}'),
            pairs: [{ key: 'rpe', value: 8 }],
          },
        ]),
      ],
    };

    const [result] = classifyStatements(facts);

    expect(result.getMetric(MetricType.Rep)).toMatchObject({ value: 5 });
    expect(result.getMetric(MetricType.Effort)).toMatchObject({ effort: 'Back Squat' });
    expect(result.getMetric(MetricType.SessionRPE)).toMatchObject({ value: 8 });
  });

  it('handles empty metric_object primitives', () => {
    const facts: SyntaxFacts = {
      statements: [
        statement([
          {
            kind: 'metric_object',
            raw: '{}',
            meta: meta(0, 2, '{}'),
            pairs: [],
          },
        ]),
      ],
    };

    const [result] = classifyStatements(facts);
    expect(result.metrics).toHaveLength(0);
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

  describe('Slash and Pipe tokens — ride as effort primitives', () => {
    it('emits an EffortMetric("/") for a slash primitive (no dedicated SlashMetric)', () => {
      const facts: SyntaxFacts = {
        statements: [{
          id: 1, line: 1,
          meta: meta(0, 1, '/'),
          primitives: [{ kind: 'effort', raw: '/', meta: meta(0, 1, '/') }],
          children: [], isLeaf: true,
        }],
      };
      const [result] = classifyStatements(facts);
      const arr = result.metrics.toArray();
      expect(arr).toHaveLength(1);
      expect(arr[0].type).toBe(MetricType.Effort);
      expect(arr[0].value).toBe('/');
    });

    it('leaves "Run" slash "Walk" as three separate effort metrics (no merge)', () => {
      const facts: SyntaxFacts = {
        statements: [{
          id: 1, line: 1,
          meta: meta(0, 8, 'Run/Walk'),
          primitives: [
            { kind: 'effort', raw: 'Run',  meta: meta(0, 3, 'Run') },
            { kind: 'effort', raw: '/',    meta: meta(3, 4, '/') },
            { kind: 'effort', raw: 'Walk', meta: meta(4, 8, 'Walk') },
          ],
          children: [], isLeaf: true,
        }],
      };
      const [result] = classifyStatements(facts);
      const arr = result.metrics.toArray();
      // Three efforts ride through; fuseUnits handles slash consumption.
      expect(arr).toHaveLength(3);
      expect(arr[0].type).toBe(MetricType.Effort);
      expect(arr[0].value).toBe('Run');
      expect(arr[1].type).toBe(MetricType.Effort);
      expect(arr[1].value).toBe('/');
      expect(arr[2].type).toBe(MetricType.Effort);
      expect(arr[2].value).toBe('Walk');
    });

    it('pipe "|" rides as an effort primitive (distinct from "/")', () => {
      const facts: SyntaxFacts = {
        statements: [{
          id: 1, line: 1,
          meta: meta(0, 9, 'Run | Walk'),
          primitives: [
            { kind: 'effort', raw: 'Run',  meta: meta(0, 3, 'Run') },
            { kind: 'effort', raw: '|',    meta: meta(4, 5, '|') },
            { kind: 'effort', raw: 'Walk', meta: meta(6, 10, 'Walk') },
          ],
          children: [], isLeaf: true,
        }],
      };
      const [result] = classifyStatements(facts);
      const arr = result.metrics.toArray();
      expect(arr).toHaveLength(3);
      expect(arr[1].type).toBe(MetricType.Effort);
      expect(arr[1].value).toBe('|');
      const pipeMeta = result.metricMeta?.get(arr[1]);
      expect(pipeMeta?.raw).toBe('|');
    });
  });
});