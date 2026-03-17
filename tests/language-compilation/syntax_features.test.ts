import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from '../../src/parser/md-timer';
import { MetricType } from '../../src/core/models/Metric';
import { RoundsMetric } from '../../src/runtime/compiler/metrics/RoundsMetric';

describe('Syntax Features Regression Tests', () => {
  const parser = new MdTimerRuntime();

  const parse = (code: string) => {
    return parser.read(code);
  };

  const metricTypeOf = (metric: { metricType?: MetricType; type?: MetricType }) => {
    return metric.metricType ?? metric.type;
  };

  describe('Actions', () => {
    it('parses action with colon [:Rest]', () => {
      const result = parse('[:Rest]');
      expect(result.errors).toHaveLength(0);
      expect(metricTypeOf(result.statements[0].metrics[0])).toBe(MetricType.Action);
      expect(result.statements[0].metrics[0].value).toBe('Rest');
    });

    it('parses action with space [: Rest]', () => {
      const result = parse('[: Rest]');
      expect(result.errors).toHaveLength(0);
      expect(result.statements[0].metrics[0].value).toBe('Rest');
    });

    it('parses bracketed effort without colon [Rest]', () => {
      const result = parse('[Rest]');
      expect(result.errors).toHaveLength(0);
      expect(metricTypeOf(result.statements[0].metrics[0])).toBe(MetricType.Effort);
      expect(result.statements[0].metrics[0].value).toBe('Rest');
    });
  });

  describe('Timers', () => {
    it('parses simple timer 20:00', () => {
      const result = parse('20:00');
      expect(result.errors).toHaveLength(0);
      expect(metricTypeOf(result.statements[0].metrics[0])).toBe(MetricType.Duration);
      // 20 minutes = 1200000 ms
      expect(result.statements[0].metrics[0].value).toBe(1200000);
    });

    it('parses timer with text', () => {
      const result = parse('20:00 Run');
      expect(result.errors).toHaveLength(0);
      const metrics = result.statements[0].metrics;
      expect(metrics.some(f => metricTypeOf(f) === MetricType.Duration)).toBe(true);
      expect(metrics.some(f => metricTypeOf(f) === MetricType.Effort && f.value === 'Run')).toBe(true);
    });
  });

  describe('Groupings & Rounds', () => {
    it('parses simple rounds (3 rounds)', () => {
      const result = parse('(3 rounds)');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0] as RoundsMetric;
      expect(metricTypeOf(metric)).toBe(MetricType.Rounds);
      expect(metric.count).toBe(3);
    });

    it('parses rep schemes (21-15-9)', () => {
      const result = parse('(21-15-9)');
      expect(result.errors).toHaveLength(0);
      const metrics = result.statements[0].metrics;
      const roundFrag = metrics.find(f => metricTypeOf(f) === MetricType.Rounds) as RoundsMetric;
      expect(roundFrag).toBeDefined();
      expect(roundFrag.count).toBe(3);

      const repFrags = metrics.filter(f => metricTypeOf(f) === MetricType.Rep);
      expect(repFrags).toHaveLength(3);
      expect(repFrags[0].value).toBe(21);
      expect(repFrags[1].value).toBe(15);
      expect(repFrags[2].value).toBe(9);
    });

    it('parses named rounds (EMOM)', () => {
      const result = parse('(EMOM)');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0] as RoundsMetric;
      expect(metricTypeOf(metric)).toBe(MetricType.Rounds);
      expect(metric.value).toBe('EMOM');
    });

    it('parses named rounds (AMRAP)', () => {
      const result = parse('(AMRAP)');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0] as RoundsMetric;
      expect(metricTypeOf(metric)).toBe(MetricType.Rounds);
      expect(metric.value).toBe('AMRAP');
    });
  });

  describe('Metrics', () => {
    it('parses weight 135lb', () => {
      const result = parse('135lb');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0];
      expect(metricTypeOf(metric)).toBe(MetricType.Resistance);
      expect(metric.value).toEqual({ amount: 135, units: "lb" });
    });

    it('parses weight with at-sign @135lb', () => {
      const result = parse('@135lb');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0];
      expect(metricTypeOf(metric)).toBe(MetricType.Resistance);
    });

    it('parses distance 400m', () => {
      const result = parse('400m');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0];
      expect(metricTypeOf(metric)).toBe(MetricType.Distance);
      expect(metric.value).toEqual({ amount: 400, units: "m" });
    });

    it('parses trend ^', () => {
      const result = parse('^');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0];
      expect(metricTypeOf(metric)).toBe(MetricType.Increment);
    });
  });

  describe('Collectible Fragments (? placeholder)', () => {
    it('parses collectible reps ?', () => {
      const result = parse('? Pushups');
      expect(result.errors).toHaveLength(0);
      const metrics = result.statements[0].metrics;
      const repFragment = metrics.find(f => metricTypeOf(f) === MetricType.Rep);
      expect(repFragment).toBeDefined();
      expect(repFragment?.value).toBeUndefined();
      expect(repFragment?.origin).toBe('user');
      expect(repFragment?.image).toBe('?');
    });

    it('parses collectible weight ? lb', () => {
      const result = parse('? lb');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0];
      expect(metricTypeOf(metric)).toBe(MetricType.Resistance);
      expect(metric.value).toEqual({ amount: undefined, units: 'lb' });
      expect(metric.origin).toBe('user');
      expect(metric.image).toBe('? lb');
    });

    it('parses collectible distance ? m', () => {
      const result = parse('? m');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0];
      expect(metricTypeOf(metric)).toBe(MetricType.Distance);
      expect(metric.value).toEqual({ amount: undefined, units: 'm' });
      expect(metric.origin).toBe('user');
      expect(metric.image).toBe('? m');
    });

    it('parses collectible duration :?', () => {
      const result = parse(':?');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0];
      expect(metricTypeOf(metric)).toBe(MetricType.Duration);
      expect(metric.value).toBeUndefined();
      expect(metric.origin).toBe('runtime');
      expect(metric.image).toBe(':?');
    });

    it('parses collectible duration :? with exercise', () => {
      const result = parse(':? Run');
      expect(result.errors).toHaveLength(0);
      const metrics = result.statements[0].metrics;
      const timerFragment = metrics.find(f => metricTypeOf(f) === MetricType.Duration);
      const effortFragment = metrics.find(f => metricTypeOf(f) === MetricType.Effort);
      expect(timerFragment).toBeDefined();
      expect(timerFragment?.value).toBeUndefined();
      expect(timerFragment?.origin).toBe('runtime');
      expect(effortFragment).toBeDefined();
      expect(effortFragment?.value).toBe('Run');
    });

    it('parses defined reps with parser origin', () => {
      const result = parse('10 Pushups');
      expect(result.errors).toHaveLength(0);
      const metrics = result.statements[0].metrics;
      const repFragment = metrics.find(f => metricTypeOf(f) === MetricType.Rep);
      expect(repFragment).toBeDefined();
      expect(repFragment?.value).toBe(10);
      expect(repFragment?.origin).toBe('parser');
    });

    it('parses defined weight with parser origin', () => {
      const result = parse('135 lb');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0];
      expect(metricTypeOf(metric)).toBe(MetricType.Resistance);
      expect(metric.value).toEqual({ amount: 135, units: 'lb' });
      expect(metric.origin).toBe('parser');
    });

    it('parses defined distance with parser origin', () => {
      const result = parse('400 m');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0];
      expect(metricTypeOf(metric)).toBe(MetricType.Distance);
      expect(metric.value).toEqual({ amount: 400, units: 'm' });
      expect(metric.origin).toBe('parser');
    });

    it('parses defined timer with parser origin', () => {
      const result = parse('20:00');
      expect(result.errors).toHaveLength(0);
      const metric = result.statements[0].metrics[0];
      expect(metricTypeOf(metric)).toBe(MetricType.Duration);
      expect(metric.value).toBe(1200000);
      expect(metric.origin).toBe('parser');
    });
  });
});
