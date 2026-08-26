import { describe, it, expect, beforeEach } from 'vitest';
import { MetricContainer } from '../src/models/MetricContainer';
import { IMetric, MetricType } from '../src/models/Metric';
import { getMetricOwnershipLayer } from '../src/ownership';

// ── Helpers ──────────────────────────────────────────────────

function makeMetric(
  metricType: MetricType,
  value: unknown = undefined,
  origin: 'parser' | 'compiler' | 'dialect' | 'runtime' | 'user' = 'parser',
  image?: string,
): IMetric {
  return {
    metricType,
    type: metricType,
    value,
    origin,
    image: image ?? String(value ?? metricType),
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('MetricContainer', () => {
  // ── Construction ───────────────────────────────────────────

  describe('construction', () => {
    it('should create an empty container', () => {
      const c = MetricContainer.empty();
      expect(c.length).toBe(0);
      expect(c.isEmpty).toBe(true);
      expect(c.all).toEqual([]);
    });

    it('should create from an array (defensive copy)', () => {
      const arr: IMetric[] = [makeMetric(MetricType.Rep, 10)];
      const c = MetricContainer.from(arr);
      expect(c.length).toBe(1);

      // Modifying original array should not affect container
      arr.push(makeMetric(MetricType.Effort, 'Run'));
      expect(c.length).toBe(1);
    });

    it('should create via constructor', () => {
      const c = new MetricContainer([
        makeMetric(MetricType.Rep, 10),
        makeMetric(MetricType.Effort, 'Run'),
      ]);
      expect(c.length).toBe(2);
    });

    it('should default to empty when no args', () => {
      const c = new MetricContainer();
      expect(c.isEmpty).toBe(true);
    });
  });

  // ── Read ───────────────────────────────────────────────────

  describe('read operations', () => {
    let container: MetricContainer;

    beforeEach(() => {
      container = new MetricContainer([
        makeMetric(MetricType.Rep, 10, 'parser'),
        makeMetric(MetricType.Rep, 10, 'runtime'),
        makeMetric(MetricType.Effort, 'Run', 'parser'),
        makeMetric(MetricType.Distance, 400, 'compiler'),
      ]);
    });

    it('all returns defensive copy', () => {
      const a = container.all;
      const b = container.all;
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    it('getByType returns matching metrics sorted by precedence', () => {
      const reps = container.getByType(MetricType.Rep);
      expect(reps).toHaveLength(2);
      expect(reps[0].origin).toBe('runtime');
      expect(reps[1].origin).toBe('parser');
    });

    it('getByType returns empty for non-existent type', () => {
      expect(container.getByType(MetricType.Sound)).toEqual([]);
    });

    it('getFirst returns best-precedence metric', () => {
      const rep = container.getFirst(MetricType.Rep);
      expect(rep).toBeDefined();
      expect(rep!.origin).toBe('runtime');
    });

    it('getFirst returns undefined for missing type', () => {
      expect(container.getFirst(MetricType.Sound)).toBeUndefined();
    });

    it('has returns true for existing type', () => {
      expect(container.has(MetricType.Rep)).toBe(true);
      expect(container.has(MetricType.Distance)).toBe(true);
    });

    it('has returns false for missing type', () => {
      expect(container.has(MetricType.Sound)).toBe(false);
    });

    it('getByOrigin returns matching metrics', () => {
      const parsed = container.getByOrigin('parser');
      expect(parsed).toHaveLength(2);
    });

    it('resolve applies precedence resolution', () => {
      const resolved = container.resolve();
      const reps = resolved.filter((m) => m.type === MetricType.Rep);
      expect(reps).toHaveLength(1);
      expect(reps[0].origin).toBe('runtime');
    });

    it('resolve with filter restricts by type', () => {
      const resolved = container.resolve({ types: [MetricType.Rep] });
      expect(resolved).toHaveLength(1);
      expect(resolved[0].type).toBe(MetricType.Rep);
    });

    it('getMetric routes visible reads through ownership compatibility', () => {
      const c = new MetricContainer([
        makeMetric(MetricType.Distance, 1000, 'dialect'),
        {
          ...makeMetric(MetricType.Distance, 1200, 'parser'),
          ownershipLayer: 'user-plan' as const,
        } as IMetric & { ownershipLayer: 'user-plan' },
      ]);

      const distance = c.getMetric(MetricType.Distance);
      expect(distance?.value).toBe(1200);
    });

    it('getAllMetricsByType returns all metrics of the type sorted by origin precedence', () => {
      const c = new MetricContainer([
        makeMetric(MetricType.Rep, 10, 'parser'),
        makeMetric(MetricType.Rep, 12, 'dialect'),
        makeMetric(MetricType.Rep, 11, 'runtime'),
      ]);

      const reps = c.getAllMetricsByType(MetricType.Rep);
      expect(reps).toHaveLength(3);
      expect(reps[0].origin).toBe('runtime');
      expect(reps[1].origin).toBe('dialect');
      expect(reps[2].origin).toBe('parser');
    });
  });

  // ── Write ──────────────────────────────────────────────────

  describe('write operations', () => {
    let container: MetricContainer;

    beforeEach(() => {
      container = new MetricContainer([
        makeMetric(MetricType.Rep, 10, 'parser'),
        makeMetric(MetricType.Effort, 'Run', 'parser'),
      ]);
    });

    it('add appends metrics and returns this', () => {
      const result = container.add(makeMetric(MetricType.Distance, 400));
      expect(result).toBe(container);
      expect(container.length).toBe(3);
      expect(container.has(MetricType.Distance)).toBe(true);
    });

    it('add supports multiple metrics', () => {
      container.add(
        makeMetric(MetricType.Distance, 400),
        makeMetric(MetricType.Sound, 'beep'),
      );
      expect(container.length).toBe(4);
    });

    it('remove removes matching metrics and returns them', () => {
      const removed = container.remove((m) => m.type === MetricType.Rep);
      expect(removed).toHaveLength(1);
      expect(removed[0].value).toBe(10);
      expect(container.length).toBe(1);
      expect(container.has(MetricType.Rep)).toBe(false);
    });

    it('remove returns empty array when nothing matches', () => {
      const removed = container.remove((m) => m.type === MetricType.Sound);
      expect(removed).toHaveLength(0);
      expect(container.length).toBe(2);
    });

    it('removeByType removes all of a type', () => {
      container.add(makeMetric(MetricType.Rep, 15, 'runtime'));
      const removed = container.removeByType(MetricType.Rep);
      expect(removed).toHaveLength(2);
      expect(container.has(MetricType.Rep)).toBe(false);
    });

    it('clear removes all metrics', () => {
      const result = container.clear();
      expect(result).toBe(container);
      expect(container.isEmpty).toBe(true);
    });

    it('replaceByType removes existing and adds new', () => {
      const removed = container.replaceByType(
        MetricType.Rep,
        makeMetric(MetricType.Rep, 21, 'runtime'),
        makeMetric(MetricType.Rep, 15, 'runtime'),
        makeMetric(MetricType.Rep, 9, 'runtime'),
      );
      expect(removed).toHaveLength(1);
      expect(removed[0].value).toBe(10);

      const reps = container.getByType(MetricType.Rep);
      expect(reps).toHaveLength(3);
      expect(reps.map((r) => r.value)).toEqual([21, 15, 9]);
    });
  });

  // ── Merge ──────────────────────────────────────────────────

  describe('merge', () => {
    it('characterizes current behavior: higher-precedence merge deletes lower-layer raw history', () => {
      const c = new MetricContainer([makeMetric(MetricType.Duration, 600000, 'parser')]);

      c.merge([makeMetric(MetricType.Duration, 540000, 'runtime')]);

      const durationMetrics = c.getAllMetricsByType(MetricType.Duration);
      expect(durationMetrics).toHaveLength(1);
      expect(durationMetrics[0].origin).toBe('runtime');
      expect(getMetricOwnershipLayer(durationMetrics[0].origin)).toBe('runtime');
    });

    it('adds new types not present in container', () => {
      const c = new MetricContainer([makeMetric(MetricType.Rep, 10, 'parser')]);
      c.merge([makeMetric(MetricType.Effort, 'Run', 'parser')]);
      expect(c.length).toBe(2);
      expect(c.has(MetricType.Effort)).toBe(true);
    });

    it('replaces when incoming has higher precedence', () => {
      const c = new MetricContainer([makeMetric(MetricType.Rep, 10, 'parser')]);
      c.merge([makeMetric(MetricType.Rep, 15, 'runtime')]);
      expect(c.length).toBe(1);
      expect(c.getFirst(MetricType.Rep)!.value).toBe(15);
      expect(c.getFirst(MetricType.Rep)!.origin).toBe('runtime');
    });

    it('appends when incoming has equal precedence', () => {
      const c = new MetricContainer([makeMetric(MetricType.Rep, 21, 'runtime')]);
      c.merge([makeMetric(MetricType.Rep, 15, 'runtime')]);
      expect(c.length).toBe(2);
      expect(c.getByType(MetricType.Rep).map((m) => m.value)).toEqual([21, 15]);
    });

    it('ignores when incoming has lower precedence', () => {
      const c = new MetricContainer([makeMetric(MetricType.Rep, 10, 'runtime')]);
      c.merge([makeMetric(MetricType.Rep, 20, 'parser')]);
      expect(c.length).toBe(1);
      expect(c.getFirst(MetricType.Rep)!.value).toBe(10);
    });

    it('accepts a MetricContainer as argument', () => {
      const c = new MetricContainer([makeMetric(MetricType.Rep, 10, 'parser')]);
      const other = new MetricContainer([makeMetric(MetricType.Effort, 'Run', 'runtime')]);
      c.merge(other);
      expect(c.length).toBe(2);
    });

    it('returns this for chaining', () => {
      const c = MetricContainer.empty();
      const result = c.merge([makeMetric(MetricType.Rep, 10)]);
      expect(result).toBe(c);
    });

    it('handles multi-type incoming merge', () => {
      const c = new MetricContainer([
        makeMetric(MetricType.Rep, 10, 'parser'),
        makeMetric(MetricType.Effort, 'Run', 'compiler'),
      ]);
      c.merge([
        makeMetric(MetricType.Rep, 15, 'runtime'),
        makeMetric(MetricType.Effort, 'Bike', 'parser'),
        makeMetric(MetricType.Distance, 400, 'parser'),
      ]);
      expect(c.length).toBe(3);
      expect(c.getFirst(MetricType.Rep)!.value).toBe(15);
      expect(c.getFirst(MetricType.Effort)!.value).toBe('Run');
      expect(c.has(MetricType.Distance)).toBe(true);
    });
  });

  // ── Iteration / Projection ─────────────────────────────────

  describe('iteration', () => {
    it('supports for-of iteration', () => {
      const c = new MetricContainer([
        makeMetric(MetricType.Rep, 10),
        makeMetric(MetricType.Effort, 'Run'),
      ]);
      const values: unknown[] = [];
      for (const m of c) {
        values.push(m.value);
      }
      expect(values).toEqual([10, 'Run']);
    });

    it('supports spread into array', () => {
      const c = new MetricContainer([makeMetric(MetricType.Rep, 10)]);
      const arr = [...c];
      expect(arr).toHaveLength(1);
    });

    it('filter returns matching metrics', () => {
      const c = new MetricContainer([
        makeMetric(MetricType.Rep, 10),
        makeMetric(MetricType.Effort, 'Run'),
      ]);
      expect(c.filter((m) => m.type === MetricType.Rep)).toHaveLength(1);
    });

    it('map transforms metrics', () => {
      const c = new MetricContainer([
        makeMetric(MetricType.Rep, 10),
        makeMetric(MetricType.Rep, 15),
      ]);
      expect(c.map((m) => m.value)).toEqual([10, 15]);
    });

    it('find returns first matching metric', () => {
      const c = new MetricContainer([
        makeMetric(MetricType.Rep, 10),
        makeMetric(MetricType.Rep, 15),
      ]);
      expect(c.find((m) => m.value === 15)?.value).toBe(15);
    });

    it('some returns true if any match', () => {
      const c = new MetricContainer([makeMetric(MetricType.Rep, 10)]);
      expect(c.some((m) => m.type === MetricType.Rep)).toBe(true);
      expect(c.some((m) => m.type === MetricType.Sound)).toBe(false);
    });

    it('every returns true if all match', () => {
      const c = new MetricContainer([
        makeMetric(MetricType.Rep, 10),
        makeMetric(MetricType.Rep, 15),
      ]);
      expect(c.every((m) => m.type === MetricType.Rep)).toBe(true);
      expect(c.every((m) => m.value === 10)).toBe(false);
    });

    it('every returns true for empty container', () => {
      expect(MetricContainer.empty().every(() => false)).toBe(true);
    });
  });

  // ── Conversion ─────────────────────────────────────────────

  describe('conversion', () => {
    it('toArray returns a mutable copy', () => {
      const c = new MetricContainer([makeMetric(MetricType.Rep, 10)]);
      const arr = c.toArray();
      arr.push(makeMetric(MetricType.Effort, 'Run'));
      expect(c.length).toBe(1);
    });

    it('raw returns the underlying array (no copy)', () => {
      const c = new MetricContainer([makeMetric(MetricType.Rep, 10)]);
      const raw = c.raw;
      expect(raw).toHaveLength(1);
      raw.push(makeMetric(MetricType.Sound, 'beep'));
      expect(c.length).toBe(2);
    });

    it('toString shows type summary', () => {
      const c = new MetricContainer([
        makeMetric(MetricType.Rep, 10),
        makeMetric(MetricType.Effort, 'Run'),
      ]);
      expect(c.toString()).toBe('MetricContainer(2)[rep, effort]');
    });
  });

  // ── IndexedDB round-trip (deserialization) ─────────────────

  describe('IndexedDB deserialization', () => {
    it('MetricContainer.from handles a JSON-serialized MetricContainer (plain object with _metrics)', () => {
      const original = new MetricContainer([
        makeMetric(MetricType.Rep, 21),
        makeMetric(MetricType.Effort, 'Pull-ups'),
      ]);
      const serialized = JSON.parse(JSON.stringify(original));
      expect(typeof serialized[Symbol.iterator]).toBe('undefined');

      const recovered = MetricContainer.from(serialized);
      expect(recovered).toBeInstanceOf(MetricContainer);
      expect(recovered.length).toBe(2);
      expect(recovered.find((m) => m.type === 'rep')?.value).toBe(21);
      expect(recovered.find((m) => m.type === 'effort')?.value).toBe('Pull-ups');
    });

    it('MetricContainer.from handles undefined gracefully', () => {
      const c = MetricContainer.from(undefined);
      expect(c.length).toBe(0);
    });

    it('MetricContainer.from handles null gracefully', () => {
      const c = MetricContainer.from(null);
      expect(c.length).toBe(0);
    });

    it('MetricContainer.from handles an empty plain object gracefully', () => {
      const c = MetricContainer.from({});
      expect(c.length).toBe(0);
    });

    it('constructor does not throw on non-iterable truthy value', () => {
      expect(() => new MetricContainer({} as unknown as IMetric[])).not.toThrow();
      const c = new MetricContainer({} as unknown as IMetric[]);
      expect(c.length).toBe(0);
    });

    it('full IDB round-trip: serialize then deserialize preserves all metrics', () => {
      const metrics = [
        makeMetric(MetricType.Rep, 21),
        makeMetric(MetricType.Rep, 15),
        makeMetric(MetricType.Rep, 9),
      ];
      const container = new MetricContainer(metrics);

      const asStored = JSON.parse(JSON.stringify(container)) as unknown;

      const restored = MetricContainer.from(asStored);
      expect(restored.length).toBe(3);
      const reps = restored.filter((m) => m.type === 'rep');
      expect(reps.map((m) => m.value)).toEqual([21, 15, 9]);
    });
  });
});
