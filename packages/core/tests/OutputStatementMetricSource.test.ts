import { describe, expect, it, beforeEach } from 'vitest';
import { OutputStatement, OutputStatementOptions } from '../src/models/OutputStatement';
import { IMetric, MetricType, MetricOrigin } from '../src/models/Metric';
import { IMetricSource } from '../src/contracts/IMetricSource';
import { TimeSpan } from '../src/models/TimeSpan';

/**
 * Helper to create a minimal IMetric for testing.
 */
function frag(
  metricType: MetricType,
  origin: MetricOrigin = 'parser',
  value?: unknown,
): IMetric {
  return {
    type: metricType,
    metricType,
    origin,
    value,
  };
}

/**
 * Helper to create a minimal TimeSpan for testing.
 */
function makeTimeSpan(): TimeSpan {
  const start = new Date('2024-01-01T12:00:00Z').getTime();
  const end = new Date('2024-01-01T12:10:00Z').getTime();
  return { started: start, ended: end };
}

/**
 * Helper to create valid OutputStatementOptions.
 */
function makeOptions(metrics?: IMetric[]): OutputStatementOptions {
  return {
    outputType: 'segment',
    timeSpan: makeTimeSpan(),
    sourceBlockKey: 'block-test-123',
    stackLevel: 0,
    metrics,
  };
}

beforeEach(() => {
  OutputStatement.resetIdCounter();
});

describe('OutputStatement implements IMetricSource', () => {
  it('should implement IMetricSource interface', () => {
    const output = new OutputStatement(
      makeOptions([frag(MetricType.Duration, 'runtime', 45000)]),
    );
    const source: IMetricSource = output;
    expect(source.id).toBe(1000000);
    expect(source.getDisplayMetrics()).toHaveLength(1);
  });

  describe('getDisplayMetrics', () => {
    it('should return all metrics with precedence resolution', () => {
      const output = new OutputStatement(
        makeOptions([
          frag(MetricType.Duration, 'parser', 600000),
          frag(MetricType.Duration, 'runtime', 432000),
          frag(MetricType.Action, 'parser', 'Run'),
        ]),
      );
      const result = output.getDisplayMetrics();

      expect(result).toHaveLength(2);
      const timer = result.find((f) => f.type === MetricType.Duration);
      expect(timer?.origin).toBe('runtime');
      expect(timer?.value).toBe(432000);
      const action = result.find((f) => f.type === MetricType.Action);
      expect(action?.origin).toBe('parser');
    });

    it('should return empty array for no metrics', () => {
      const output = new OutputStatement(makeOptions());
      expect(output.getDisplayMetrics()).toHaveLength(0);
    });

    it('should apply type filter', () => {
      const output = new OutputStatement(
        makeOptions([
          frag(MetricType.Duration, 'runtime'),
          frag(MetricType.Rep, 'runtime'),
          frag(MetricType.Action, 'parser'),
        ]),
      );
      const result = output.getDisplayMetrics({ types: [MetricType.Rep] });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(MetricType.Rep);
    });

    it('should apply excludeTypes filter', () => {
      const output = new OutputStatement(
        makeOptions([
          frag(MetricType.Duration, 'runtime'),
          frag(MetricType.Rep, 'runtime'),
          frag(MetricType.Action, 'parser'),
        ]),
      );
      const result = output.getDisplayMetrics({
        excludeTypes: [MetricType.Duration],
      });
      expect(result).toHaveLength(2);
      expect(result.every((f) => f.type !== MetricType.Duration)).toBe(true);
    });

    it('should apply origin filter', () => {
      const output = new OutputStatement(
        makeOptions([
          frag(MetricType.Duration, 'parser', 'plan'),
          frag(MetricType.Duration, 'runtime', 'live'),
        ]),
      );
      const result = output.getDisplayMetrics({ origins: ['parser'] });
      expect(result).toHaveLength(1);
      expect(result[0].origin).toBe('parser');
    });

    it('should handle user origin overriding runtime', () => {
      const output = new OutputStatement(
        makeOptions([
          frag(MetricType.Rep, 'parser', 10),
          frag(MetricType.Rep, 'runtime', 8),
          frag(MetricType.Rep, 'user', 9),
        ]),
      );
      const result = output.getDisplayMetrics();
      expect(result).toHaveLength(1);
      expect(result[0].origin).toBe('user');
      expect(result[0].value).toBe(9);
    });
  });

  describe('getFragment', () => {
    it('should return highest precedence metrics for a type', () => {
      const output = new OutputStatement(
        makeOptions([
          frag(MetricType.Duration, 'parser', 'original'),
          frag(MetricType.Duration, 'runtime', 'elapsed'),
        ]),
      );
      const result = output.getMetric(MetricType.Duration);
      expect(result?.origin).toBe('runtime');
      expect(result?.value).toBe('elapsed');
    });

    it('should return undefined when no metrics of type exists', () => {
      const output = new OutputStatement(
        makeOptions([frag(MetricType.Duration, 'runtime')]),
      );
      expect(output.getMetric(MetricType.Rep)).toBeUndefined();
    });

    it('should return parser metrics as fallback', () => {
      const output = new OutputStatement(
        makeOptions([frag(MetricType.Action, 'parser', 'Run')]),
      );
      const result = output.getMetric(MetricType.Action);
      expect(result?.origin).toBe('parser');
      expect(result?.value).toBe('Run');
    });
  });

  describe('getAllMetricsByType', () => {
    it('returns all metrics of the type sorted by origin precedence', () => {
      const output = new OutputStatement(
        makeOptions([
          frag(MetricType.Rep, 'parser', 21),
          frag(MetricType.Rep, 'user', 19),
          frag(MetricType.Rep, 'compiler', 20),
        ]),
      );
      const result = output.getAllMetricsByType(MetricType.Rep);
      expect(result).toHaveLength(3);
      expect(result[0].origin).toBe('user');
      expect(result[0].value).toBe(19);
      expect(result[1].origin).toBe('compiler');
      expect(result[2].origin).toBe('parser');
      expect(output.rawMetrics.filter((m) => m.type === MetricType.Rep)).toHaveLength(3);
    });

    it('should return empty array when type not found', () => {
      const output = new OutputStatement(
        makeOptions([frag(MetricType.Duration, 'runtime')]),
      );
      expect(output.getAllMetricsByType(MetricType.Action)).toHaveLength(0);
    });

    it('should preserve multiple same-tier metrics in order', () => {
      const output = new OutputStatement(
        makeOptions([
          frag(MetricType.Rep, 'runtime', 21),
          frag(MetricType.Rep, 'runtime', 15),
          frag(MetricType.Rep, 'runtime', 9),
        ]),
      );
      const result = output.getAllMetricsByType(MetricType.Rep);
      expect(result).toHaveLength(3);
      expect(result.every((f) => f.origin === 'runtime')).toBe(true);
    });
  });

  describe('hasFragment', () => {
    it('should return true when metrics type exists', () => {
      const output = new OutputStatement(
        makeOptions([frag(MetricType.Duration, 'runtime')]),
      );
      expect(output.hasMetric(MetricType.Duration)).toBe(true);
    });

    it('should return false when metrics type is absent', () => {
      const output = new OutputStatement(
        makeOptions([frag(MetricType.Duration, 'runtime')]),
      );
      expect(output.hasMetric(MetricType.Rep)).toBe(false);
    });
  });

  describe('rawMetrics', () => {
    it('should return all metrics unfiltered', () => {
      const metrics = [
        frag(MetricType.Duration, 'runtime'),
        frag(MetricType.Rep, 'user'),
        frag(MetricType.Action, 'parser'),
      ];
      const output = new OutputStatement(makeOptions(metrics));
      expect(output.rawMetrics).toHaveLength(3);
    });

    it('should return a copy, not the original array', () => {
      const output = new OutputStatement(
        makeOptions([frag(MetricType.Duration, 'runtime')]),
      );
      const raw = output.rawMetrics;
      raw.push(frag(MetricType.Rep, 'parser'));
      expect(output.rawMetrics).toHaveLength(1);
    });

    it('should return empty array when no metrics', () => {
      const output = new OutputStatement(makeOptions());
      expect(output.rawMetrics).toHaveLength(0);
    });
  });

  describe('id property', () => {
    it('should expose auto-incremented id', () => {
      const output1 = new OutputStatement(makeOptions());
      const output2 = new OutputStatement(makeOptions());
      const source1: IMetricSource = output1;
      const source2: IMetricSource = output2;
      expect(source2.id).toBe((source1.id as number) + 1);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle segment output with mixed origins', () => {
      const output = new OutputStatement({
        outputType: 'segment',
        timeSpan: makeTimeSpan(),
        sourceBlockKey: 'timer-block-1',
        stackLevel: 1,
        metrics: [
          frag(MetricType.Duration, 'parser', 600000),
          frag(MetricType.Duration, 'runtime', 443000),
          frag(MetricType.Action, 'parser', 'Run'),
          frag(MetricType.Distance, 'parser', 2000),
          frag(MetricType.Distance, 'runtime', 1850),
        ],
      });

      const display = output.getDisplayMetrics();
      expect(display).toHaveLength(3);

      const timer = output.getMetric(MetricType.Duration);
      expect(timer?.value).toBe(443000);

      const action = output.getMetric(MetricType.Action);
      expect(action?.value).toBe('Run');

      const distance = output.getMetric(MetricType.Distance);
      expect(distance?.value).toBe(1850);
    });

    it('should handle completion output with user overrides', () => {
      const output = new OutputStatement({
        outputType: 'completion',
        timeSpan: makeTimeSpan(),
        sourceBlockKey: 'rep-block-1',
        stackLevel: 0,
        metrics: [
          frag(MetricType.Rep, 'parser', 21),
          frag(MetricType.Rep, 'runtime', 21),
          frag(MetricType.Rep, 'user', 19),
          frag(MetricType.Action, 'parser', 'Thrusters'),
        ],
      });

      const display = output.getDisplayMetrics();
      expect(display).toHaveLength(2);

      const rep = output.getMetric(MetricType.Rep);
      expect(rep?.value).toBe(19);
    });
  });
});
