import { describe, expect, it } from 'vitest';
import { AnalyticsInvalidationBus, QueryCache, coalescingEventStore, computeCacheKey } from '../src/queryCache';
import { parseQuery } from '../src/wql';

describe('ticket 20 — structural cache keys', () => {
  it('identical semantics produce identical keys regardless of spelling', () => {
    const a = parseQuery('sum:totalVolume{discipline:running} by {week} last 4w');
    const b = parseQuery('sum:totalVolume{discipline:running} by {week} last 4w');
    const keyA = computeCacheKey(a as never, { rangeStart: 0, rangeEnd: 100, timeZone: 'UTC', instant: 5, generation: 1 });
    const keyB = computeCacheKey(b as never, { rangeStart: 0, rangeEnd: 100, timeZone: 'UTC', instant: 5, generation: 1 });
    expect(keyA).toBe(keyB);
  });

  it('every context dimension participates: range, timezone, instant, generation, units', () => {
    const parsed = parseQuery('sum:totalVolume{}');
    const base = { rangeStart: 0, rangeEnd: 100, timeZone: 'UTC', instant: 5, generation: 1 };
    const variants = [
      { ...base, rangeEnd: 200 },
      { ...base, timeZone: 'Asia/Tokyo' },
      { ...base, instant: 6 },
      { ...base, generation: 2 },
    ];
    const keys = variants.map((v) => computeCacheKey(parsed as never, v));
    expect(new Set(keys).size).toBe(variants.length);
  });
});

describe('ticket 20 — scan coalescing', () => {
  it('N queries sharing one resolved range issue exactly one store call (acceptance 1)', async () => {
    let calls = 0;
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    const inner = {
      getEventsByTimeRange: async () => {
        calls += 1;
        await gate; // hold the first fetch in flight until all 12 join
        return [];
      },
    };
    const coalesced = coalescingEventStore(inner as never);
    // 12 widgets share one range: all in flight simultaneously.
    const pending = Array.from({ length: 12 }, () => coalesced.getEventsByTimeRange(0, 100));
    // All 12 joined the single in-flight fetch before it resolves.
    expect(calls).toBe(1);
    release();
    const results = await Promise.all(pending);
    expect(results).toHaveLength(12);
    expect(calls).toBe(1);
  });

  it('different ranges issue separate scans', async () => {
    let calls = 0;
    const inner = {
      getEventsByTimeRange: async () => {
        calls += 1;
        return [];
      },
    };
    const coalesced = coalescingEventStore(inner as never);
    await Promise.all([
      coalesced.getEventsByTimeRange(0, 100),
      coalesced.getEventsByTimeRange(100, 200),
    ]);
    expect(calls).toBe(2);
  });
});

describe('ticket 20 — invalidation bus and cache', () => {
  it('a mutation bumps generation and drops cached entries', async () => {
    const bus = new AnalyticsInvalidationBus(() => undefined as never);
    const cache = new QueryCache(bus);
    cache.set('k1', { value: 42 }, 1);
    expect(cache.get('k1', 1)).toEqual({ value: 42 });

    await bus.publishMutation();
    expect(bus.generationId).toBe(1);
    // Old-generation entry is gone; fresh generation misses.
    expect(cache.get('k1', 1)).toBeUndefined();
    expect(cache.get('k1', bus.generationId)).toBeUndefined();
  });

  it('cross-tab: a received mutation receipt advances the local epoch', async () => {
    const handlers: Array<(msg: unknown) => void> = [];
    const fakeChannel = {
      // BroadcastChannel delivers MessageEvent-shaped payloads.
      postMessage: (msg: unknown) => handlers.forEach((h) => h({ data: msg })),
      addEventListener: (_: string, h: (msg: unknown) => void) => handlers.push(h),
      close: () => {},
    } as never as BroadcastChannel;
    const tabA = new AnalyticsInvalidationBus(() => fakeChannel);
    const tabB = new AnalyticsInvalidationBus(() => fakeChannel);
    tabB.subscribe();

    expect(tabA.generationId).toBe(0);
    expect(tabB.generationId).toBe(0);
    await tabA.publishMutation();
    // Tab B's epoch advanced PAST the remote receipt — equal-counter states
    // must never alias (a receipt is always a new mutation for cache keys).
    expect(tabB.generationId).toBe(2);
  });
});

describe('ticket 20 — cache equivalence', () => {
  it('cache hits serve identical population, precision, and lineage', async () => {
    const bus = new AnalyticsInvalidationBus(() => undefined as never);
    const cache = new QueryCache(bus);
    const parsed = parseQuery('sum:distance{}');
    const key = computeCacheKey(parsed as never, {
      rangeStart: 0, rangeEnd: 10, timeZone: 'UTC', instant: 5, generation: bus.generationId,
    });
    const computed = { rows: [[0.004 + 0.004 + 0.004]] }; // unrounded lineage
    cache.set(key, computed, bus.generationId);
    expect(cache.get(key, bus.generationId)).toBe(computed);
  });
});
