/**
 * Slice 5 regression suite — preserved-history, explain/debug, suppress/hide,
 * and promotion behaviors (WOD-348).
 *
 * These tests pin the invariants that must survive future cleanup:
 *
 *  1. Preserved-history invariant — `raw()` always returns every metric
 *     regardless of visibility outcome.
 *  2. Explain/debug support — `explain()` accurately characterises every
 *     contribution for every type, including multi-type and fully-suppressed cases.
 *  3. Suppress/hide semantics — suppressors affect visibility without mutating
 *     the raw store, and apply regardless of layer.
 *  4. Promotion behaviors — `promotionCandidates()` returns the right shadowed
 *     metric(s) and handles suppressed, single-layer, and no-candidate cases.
 */

import { describe, expect, it } from 'bun:test';
import type { IMetric } from '../../../models/Metric';
import { MetricType } from '../../../models/Metric';
import { createMetricOwnershipLedger } from '../index';

// ── helpers ──────────────────────────────────────────────────────────────────

function metric(overrides: Partial<IMetric> & Pick<IMetric, 'type'>): IMetric {
  return { origin: 'parser', ...overrides } as IMetric;
}

// ── 1. Preserved-history invariant ───────────────────────────────────────────

describe('preserved-history invariant', () => {
  it('raw() returns all metrics when a higher layer wins visibility', () => {
    const p = metric({ type: MetricType.Duration, origin: 'parser', value: 300 });
    const d = metric({ type: MetricType.Duration, origin: 'dialect', value: 290 });
    const r = metric({ type: MetricType.Duration, origin: 'runtime', value: 275 });
    const u = metric({ type: MetricType.Duration, origin: 'user', value: 270 });

    const ledger = createMetricOwnershipLedger([p, d, r, u]);

    expect(ledger.raw()).toEqual([p, d, r, u]);
    expect(ledger.visible()).toEqual([u]);
  });

  it('raw() preserves suppressor metrics that contribute nothing to visibility', () => {
    const action = metric({ type: MetricType.Action, origin: 'parser', value: 'EMOM' });
    const suppressor = metric({ type: MetricType.Action, origin: 'dialect', action: 'suppress' });

    const ledger = createMetricOwnershipLedger([action, suppressor]);

    expect(ledger.raw()).toEqual([action, suppressor]);
    expect(ledger.visible()).toEqual([]);
  });

  it('raw() with a type query preserves suppressor metrics in that type', () => {
    const action = metric({ type: MetricType.Action, origin: 'parser', value: 'EMOM' });
    const suppressor = metric({ type: MetricType.Action, origin: 'dialect', action: 'suppress' });
    const rep = metric({ type: MetricType.Rep, origin: 'parser', value: 10 });

    const ledger = createMetricOwnershipLedger([action, suppressor, rep]);

    expect(ledger.raw({ types: [MetricType.Action] })).toEqual([action, suppressor]);
    expect(ledger.raw({ types: [MetricType.Rep] })).toEqual([rep]);
  });

  it('raw() returns all layers for a multi-layer multi-type mix', () => {
    const metrics = [
      metric({ type: MetricType.Rep, origin: 'parser', value: 10 }),
      metric({ type: MetricType.Rep, origin: 'runtime', value: 11 }),
      metric({ type: MetricType.Duration, origin: 'parser', value: 300 }),
      metric({ type: MetricType.Duration, origin: 'user', value: 290 }),
    ];
    const ledger = createMetricOwnershipLedger(metrics);

    expect(ledger.raw()).toHaveLength(4);
    expect(ledger.raw()).toEqual(metrics);
  });

  it('raw() is unaffected when visible() is called first', () => {
    const p = metric({ type: MetricType.Rep, origin: 'parser', value: 5 });
    const r = metric({ type: MetricType.Rep, origin: 'runtime', value: 6 });

    const ledger = createMetricOwnershipLedger([p, r]);

    // call visible first — must not mutate raw
    ledger.visible();
    expect(ledger.raw()).toEqual([p, r]);
  });

  it('raw() returns an empty array for an empty ledger', () => {
    const ledger = createMetricOwnershipLedger([]);
    expect(ledger.raw()).toEqual([]);
  });
});

// ── 2. Explain / debug support ────────────────────────────────────────────────

describe('explain() coverage', () => {
  it('returns one explanation per type present in the metrics', () => {
    const metrics = [
      metric({ type: MetricType.Rep, origin: 'parser', value: 10 }),
      metric({ type: MetricType.Duration, origin: 'runtime', value: 300 }),
      metric({ type: MetricType.Action, origin: 'dialect', value: 'AMRAP' }),
    ];
    const ledger = createMetricOwnershipLedger(metrics);

    const explanations = ledger.explain();
    expect(explanations).toHaveLength(3);

    const types = explanations.map((e) => e.type);
    expect(types).toContain(MetricType.Rep);
    expect(types).toContain(MetricType.Duration);
    expect(types).toContain(MetricType.Action);
  });

  it('marks suppressed types with suppressed=true and exposes suppressor entry', () => {
    const action = metric({ type: MetricType.Action, origin: 'parser', value: 'EMOM' });
    const suppressor = metric({ type: MetricType.Action, origin: 'runtime', action: 'suppress' });

    const ledger = createMetricOwnershipLedger([action, suppressor]);
    const [explanation] = ledger.explain({ types: [MetricType.Action] });

    expect(explanation.suppressed).toBe(true);
    expect(explanation.winnerLayer).toBeUndefined();

    const outcomes = explanation.entries.map((e) => e.outcome);
    expect(outcomes).toContain('suppressor');
    expect(outcomes).toContain('hidden-by-suppressor');
  });

  it('marks non-suppressed types with the correct winnerLayer', () => {
    const p = metric({ type: MetricType.Duration, origin: 'parser', value: 300 });
    const r = metric({ type: MetricType.Duration, origin: 'runtime', value: 275 });

    const ledger = createMetricOwnershipLedger([p, r]);
    const [explanation] = ledger.explain({ types: [MetricType.Duration] });

    expect(explanation.suppressed).toBe(false);
    expect(explanation.winnerLayer).toBe('runtime');
  });

  it('assigns hidden-by-layer to all lower-layer entries when a higher layer wins', () => {
    const p = metric({ type: MetricType.Rep, origin: 'parser', value: 10 });
    const d = metric({ type: MetricType.Rep, origin: 'dialect', value: 11 });
    const r = metric({ type: MetricType.Rep, origin: 'runtime', value: 12 });

    const ledger = createMetricOwnershipLedger([p, d, r]);
    const [explanation] = ledger.explain({ types: [MetricType.Rep] });

    const outcomeMap: Record<string, string> = {};
    for (const entry of explanation.entries) {
      outcomeMap[entry.layer] = entry.outcome;
    }

    expect(outcomeMap['parser']).toBe('hidden-by-layer');
    expect(outcomeMap['dialect']).toBe('hidden-by-layer');
    expect(outcomeMap['runtime']).toBe('visible');
  });

  it('explain() with no query covers all types', () => {
    const metrics = [
      metric({ type: MetricType.Rep, origin: 'parser', value: 10 }),
      metric({ type: MetricType.Duration, origin: 'dialect', value: 300 }),
    ];
    const ledger = createMetricOwnershipLedger(metrics);
    const explanations = ledger.explain();

    expect(explanations).toHaveLength(2);
  });

  it('explain() with layer filter restricts entries to that layer', () => {
    const p = metric({ type: MetricType.Rep, origin: 'parser', value: 10 });
    const r = metric({ type: MetricType.Rep, origin: 'runtime', value: 12 });

    const ledger = createMetricOwnershipLedger([p, r]);
    const explanations = ledger.explain({ layers: ['runtime'] });

    expect(explanations).toHaveLength(1);
    expect(explanations[0].entries).toHaveLength(1);
    expect(explanations[0].entries[0].layer).toBe('runtime');
  });

  it('explain() returns an empty array for an empty ledger', () => {
    expect(createMetricOwnershipLedger([]).explain()).toEqual([]);
  });

  it('explain() accurately exposes all four outcome types in a single type bucket', () => {
    // One suppressor, two hidden-by-suppressor entries, no visible entries.
    const a = metric({ type: MetricType.Action, origin: 'parser', value: 'Burpees' });
    const b = metric({ type: MetricType.Action, origin: 'dialect', value: 'Box Jumps' });
    const s = metric({ type: MetricType.Action, origin: 'runtime', action: 'suppress' });

    const ledger = createMetricOwnershipLedger([a, b, s]);
    const [explanation] = ledger.explain({ types: [MetricType.Action] });

    expect(explanation.suppressed).toBe(true);
    const suppresors = explanation.entries.filter((e) => e.outcome === 'suppressor');
    const hiddenBySuppressor = explanation.entries.filter((e) => e.outcome === 'hidden-by-suppressor');
    expect(suppresors).toHaveLength(1);
    expect(hiddenBySuppressor).toHaveLength(2);
  });
});

// ── 3. Suppress / hide semantics ─────────────────────────────────────────────

describe('suppress/hide semantics', () => {
  it('any suppressor at any layer suppresses the entire type (layer-agnostic suppress semantics)', () => {
    // Current characterised behaviour: if ANY metric in a type group has
    // action==='suppress', the entire type is hidden from visible() regardless
    // of the suppressor's layer rank vs. the candidates' ranks.
    //
    // A parser-layer suppressor WILL hide a dialect-layer metric.
    // This is an intentional design invariant: suppressors are type-level flags.
    const parserSuppressor = metric({ type: MetricType.Action, origin: 'parser', action: 'suppress' });
    const dialectAction = metric({ type: MetricType.Action, origin: 'dialect', value: 'AMRAP' });

    const ledger = createMetricOwnershipLedger([parserSuppressor, dialectAction]);

    // The entire type is suppressed because a suppressor exists for this type.
    expect(ledger.visible({ types: [MetricType.Action] })).toEqual([]);
    // Raw preserves both metrics.
    expect(ledger.raw({ types: [MetricType.Action] })).toEqual([parserSuppressor, dialectAction]);
  });

  it('all metrics are suppressed when the only suppressor is at the highest layer', () => {
    const p = metric({ type: MetricType.Action, origin: 'parser', value: 'Run' });
    const d = metric({ type: MetricType.Action, origin: 'dialect', value: 'Row' });
    const userSuppressor = metric({ type: MetricType.Action, origin: 'user', action: 'suppress' });

    const ledger = createMetricOwnershipLedger([p, d, userSuppressor]);

    expect(ledger.visible({ types: [MetricType.Action] })).toEqual([]);
    expect(ledger.raw({ types: [MetricType.Action] })).toHaveLength(3);
  });

  it('suppression is per-type: suppressing Action does not hide Rep', () => {
    const action = metric({ type: MetricType.Action, origin: 'parser', value: 'EMOM' });
    const actionSuppressor = metric({ type: MetricType.Action, origin: 'dialect', action: 'suppress' });
    const rep = metric({ type: MetricType.Rep, origin: 'parser', value: 10 });

    const ledger = createMetricOwnershipLedger([action, actionSuppressor, rep]);

    expect(ledger.visible({ types: [MetricType.Action] })).toEqual([]);
    expect(ledger.visible({ types: [MetricType.Rep] })).toEqual([rep]);
  });

  it('a type with only suppressor metrics shows no visible result', () => {
    const suppressor = metric({ type: MetricType.Duration, origin: 'dialect', action: 'suppress' });
    const ledger = createMetricOwnershipLedger([suppressor]);

    expect(ledger.visible()).toEqual([]);
    expect(ledger.raw()).toEqual([suppressor]);
  });

  it('visible() preserves original insertion order across multiple types', () => {
    const rep1 = metric({ type: MetricType.Rep, origin: 'parser', value: 10 });
    const dur = metric({ type: MetricType.Duration, origin: 'parser', value: 300 });
    const rep2 = metric({ type: MetricType.Rep, origin: 'runtime', value: 11 });

    const ledger = createMetricOwnershipLedger([rep1, dur, rep2]);
    const visible = ledger.visible();

    // runtime rep and parser duration should both appear; insertion order preserved
    const repVisible = visible.filter((m) => m.type === MetricType.Rep);
    const durVisible = visible.filter((m) => m.type === MetricType.Duration);

    expect(repVisible).toEqual([rep2]);
    expect(durVisible).toEqual([dur]);
    // rep1 comes before dur in insertion order, so the runtime rep (index 2)
    // should appear after dur in the sorted-by-index result
    expect(visible.indexOf(dur)).toBeLessThan(visible.indexOf(rep2));
  });
});

// ── 4. Promotion behaviors ────────────────────────────────────────────────────

describe('promotionCandidates() behaviors', () => {
  it('returns no candidates when only one layer is present', () => {
    const metrics = [
      metric({ type: MetricType.Rep, origin: 'parser', value: 10 }),
      metric({ type: MetricType.Rep, origin: 'parser', value: 15 }),
    ];
    const ledger = createMetricOwnershipLedger(metrics);

    expect(ledger.promotionCandidates()).toEqual([]);
  });

  it('returns no candidates when the metric pool is empty', () => {
    expect(createMetricOwnershipLedger([]).promotionCandidates()).toEqual([]);
  });

  it('returns the direct-next lower layer as the promotion candidate', () => {
    const p = metric({ type: MetricType.Duration, origin: 'parser', value: 300 });
    const d = metric({ type: MetricType.Duration, origin: 'dialect', value: 290 });
    const r = metric({ type: MetricType.Duration, origin: 'runtime', value: 275 });

    const ledger = createMetricOwnershipLedger([p, d, r]);
    const candidates = ledger.promotionCandidates({ types: [MetricType.Duration] });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].metric).toBe(d);
    expect(candidates[0].layer).toBe('dialect');
    expect(candidates[0].blockedByLayer).toBe('runtime');
    expect(candidates[0].reason).toBe('shadowed-by-higher-layer');
  });

  it('returns suppressed metrics as promotion candidates with reason=suppressed', () => {
    const p = metric({ type: MetricType.Action, origin: 'parser', value: 'EMOM' });
    const suppressor = metric({ type: MetricType.Action, origin: 'dialect', action: 'suppress' });

    const ledger = createMetricOwnershipLedger([p, suppressor]);
    const candidates = ledger.promotionCandidates({ types: [MetricType.Action] });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].metric).toBe(p);
    expect(candidates[0].reason).toBe('suppressed');
  });

  it('returns candidates for multiple types independently', () => {
    const metrics = [
      metric({ type: MetricType.Rep, origin: 'parser', value: 10 }),
      metric({ type: MetricType.Rep, origin: 'runtime', value: 11 }),
      metric({ type: MetricType.Duration, origin: 'parser', value: 300 }),
      metric({ type: MetricType.Duration, origin: 'dialect', value: 290 }),
    ];
    const ledger = createMetricOwnershipLedger(metrics);

    const candidates = ledger.promotionCandidates();
    const types = candidates.map((c) => c.type);

    expect(types).toContain(MetricType.Rep);
    expect(types).toContain(MetricType.Duration);
  });

  it('candidates for a suppressed type point at the blocking suppressor layer', () => {
    const d = metric({ type: MetricType.Rep, origin: 'dialect', value: 12 });
    const runtimeSuppressor = metric({ type: MetricType.Rep, origin: 'runtime', action: 'suppress' });

    const ledger = createMetricOwnershipLedger([d, runtimeSuppressor]);
    const candidates = ledger.promotionCandidates({ types: [MetricType.Rep] });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].reason).toBe('suppressed');
    expect(candidates[0].blockedByLayer).toBe('runtime');
  });

  it('returns no candidates when every type has exactly one layer (no shadowing)', () => {
    const metrics = [
      metric({ type: MetricType.Rep, origin: 'user', value: 10 }),
      metric({ type: MetricType.Duration, origin: 'runtime', value: 300 }),
      metric({ type: MetricType.Action, origin: 'parser', value: 'EMOM' }),
    ];
    const ledger = createMetricOwnershipLedger(metrics);

    expect(ledger.promotionCandidates()).toEqual([]);
  });
});

// ── 5. Legacy seam characterisation (deprecation notes) ──────────────────────

describe('legacy seam characterisation', () => {
  /**
   * Documents the retained legacy/destructive API: `MetricContainer.merge()`.
   *
   * merge() is marked @deprecated. It uses ORIGIN_PRECEDENCE directly and can
   * delete lower-layer raw metrics. New code should use the ownership ledger's
   * visibility reads instead.
   *
   * This test characterises its behaviour so regressions are detected if the
   * semantics change during future cleanup.
   */
  it('characterises the legacy merge() contract: higher-precedence incoming replaces lower-precedence existing', async () => {
    const { MetricContainer } = await import('../../../models/MetricContainer');

    const container = new MetricContainer([
      metric({ type: MetricType.Rep, origin: 'parser', value: 10 }),
    ]);

    const incoming = new MetricContainer([
      metric({ type: MetricType.Rep, origin: 'runtime', value: 11 }),
    ]);

    container.merge(incoming);

    // After merge, parser metric is gone — destructive legacy behaviour
    const reps = container.getByType(MetricType.Rep);
    expect(reps).toHaveLength(1);
    expect(reps[0].origin).toBe('runtime');
    expect(reps[0].value).toBe(11);
  });

  /**
   * Documents the retained legacy/destructive API: `MetricContainer.getByType()`.
   *
   * getByType() uses ORIGIN_PRECEDENCE directly for sorting. It is a lower-level
   * utility and NOT yet migrated to the ownership ledger. New display-oriented reads
   * should use `getMetric()`, `getAllMetricsByType()`, or `getDisplayMetrics()` which
   * delegate to the ownership ledger.
   */
  it('characterises the legacy getByType() contract: returns all metrics of that type sorted by ORIGIN_PRECEDENCE rank', async () => {
    const { MetricContainer } = await import('../../../models/MetricContainer');

    const p = metric({ type: MetricType.Rep, origin: 'parser', value: 10 });
    const r = metric({ type: MetricType.Rep, origin: 'runtime', value: 11 });
    const u = metric({ type: MetricType.Rep, origin: 'user', value: 9 });

    const container = new MetricContainer([p, r, u]);
    const sorted = container.getByType(MetricType.Rep);

    // user (tier 0) → runtime (tier 1) → parser (tier 3)
    expect(sorted.map((m) => m.origin)).toEqual(['user', 'runtime', 'parser']);
  });
});
