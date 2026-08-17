import { describe, it, expect } from 'vitest';
import { Metric, MetricContainer, TimeSpan, CodeStatement, OutputStatement } from '../src/index';

describe('@wod-wiki/core', () => {
  describe('Metric', () => {
    it('creates a metric and resolves numeric value', () => {
      const reps = new Metric('pullups', 'reps', 21, 'reps', 'parsed', 'set');
      expect(reps.name).toBe('pullups');
      expect(reps.type).toBe('reps');
      expect(reps.value).toBe(21);
      expect(reps.toNumber()).toBe(21);
    });

    it('parses string values to number', () => {
      const weight = new Metric('thruster', 'weight', '95', 'lbs', 'parsed', 'set');
      expect(weight.toNumber()).toBe(95);
    });

    it('returns 0 for unparseable string values', () => {
      const custom = new Metric('custom', 'custom', 'invalid', undefined, 'parsed', 'none');
      expect(custom.toNumber()).toBe(0);
    });
  });

  describe('MetricContainer', () => {
    it('stores and retrieves metrics', () => {
      const container = new MetricContainer('note-123');
      const m1 = new Metric('reps', 'reps', 10);
      const m2 = new Metric('weight', 'weight', 135, 'lbs');

      container.add(m1);
      container.add(m2);

      expect(container.size).toBe(2);
      expect(container.has('reps')).toBe(true);
      expect(container.get('reps')).toBe(m1);
      expect(container.getAll()).toEqual([m1, m2]);

      container.clear();
      expect(container.size).toBe(0);
    });
  });

  describe('TimeSpan', () => {
    it('formats minutes and seconds correctly', () => {
      const span = TimeSpan.fromSeconds(125);
      expect(span.minutes).toBe(2);
      expect(span.seconds).toBe(5);
      expect(span.toString()).toBe('02:05');
    });

    it('creates from minutes', () => {
      const span = TimeSpan.fromMinutes(5);
      expect(span.totalSeconds).toBe(300);
      expect(span.toString()).toBe('05:00');
    });
  });

  describe('OutputStatement', () => {
    it('holds statements and metrics', () => {
      const stmt = new CodeStatement(1, '21 pullups', '21 pullups', 'wod');
      const metric = new Metric('pullups', 'reps', 21);
      const output = new OutputStatement(stmt, [metric], 1700000000000);

      expect(output.statement.line).toBe(1);
      expect(output.metrics.length).toBe(1);
      expect(output.timestamp).toBe(1700000000000);
    });
  });
});
