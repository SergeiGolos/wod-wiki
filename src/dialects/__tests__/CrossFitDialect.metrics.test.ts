/**
 * CrossFitDialect — metric-level tests
 *
 * These tests verify the full pipeline:
 *   parser → dialect → statement.metrics → display resolution
 *
 * Tests are grouped by workout type.
 * Tests marked `it.failing` document currently broken or unimplemented behavior.
 * Remove the `.failing` when the feature is implemented.
 *
 * Generate a new fixture snapshot:
 *   bun run src/dialects/__tests__/capture-fixture.ts --dialect crossfit --block "(20) EMOM"
 */

import { describe, it, expect } from 'bun:test';
import { MetricType } from '../../core/models/Metric';
import {
  parseWithDialect,
  rawMetricsOfType,
  expectRawMetric,
  expectDisplayMetric,
  expectNotDisplayed,
  snapshotMetrics,
} from './dialect-test-helpers';

// ──────────────────────────────────────────────────────────
// EMOM
// ──────────────────────────────────────────────────────────

describe('CrossFitDialect — EMOM metrics', () => {
  describe('(20) EMOM — rounds present, no duration', () => {
    it('should emit hint workout.emom', () => {
      const { statement } = parseWithDialect('(20) EMOM', 'crossfit');
      expect(statement.hints?.has('workout.emom')).toBe(true);
    });

    it.failing('should synthesize Duration=60000ms at dialect origin', () => {
      const { statement } = parseWithDialect('(20) EMOM', 'crossfit');
      expectRawMetric(statement, MetricType.Duration, 'dialect', 60000);
    });

    it.failing('should suppress the EMOM Action label from display', () => {
      const { statement } = parseWithDialect('(20) EMOM', 'crossfit');
      // Raw still has it (so tests can inspect it), but display hides it
      const rawActions = rawMetricsOfType(statement, MetricType.Action);
      expect(rawActions.some(m => String(m.value).toUpperCase() === 'EMOM')).toBe(true);
      expectNotDisplayed(statement, MetricType.Action);
    });

    it('should show Rounds=20 in display (parser origin)', () => {
      const { statement } = parseWithDialect('(20) EMOM', 'crossfit');
      expectDisplayMetric(statement, MetricType.Rounds, 20);
    });

    it.failing('should show synthesized Duration=60000 in display', () => {
      const { statement } = parseWithDialect('(20) EMOM', 'crossfit');
      expectDisplayMetric(statement, MetricType.Duration, 60000);
    });
  });

  describe('(20) EMOM :30 — both rounds and duration present', () => {
    it('should emit hint workout.emom', () => {
      const { statement } = parseWithDialect('(20) EMOM :30', 'crossfit');
      expect(statement.hints?.has('workout.emom')).toBe(true);
    });

    it('should NOT synthesize a Duration (one already exists)', () => {
      const { statement } = parseWithDialect('(20) EMOM :30', 'crossfit');
      const dialectDurations = rawMetricsOfType(statement, MetricType.Duration)
        .filter(m => m.origin === 'dialect');
      expect(dialectDurations).toHaveLength(0);
    });

    it('should preserve parser Duration=30000 in display', () => {
      const { statement } = parseWithDialect('(20) EMOM :30', 'crossfit');
      expectDisplayMetric(statement, MetricType.Duration, 30000);
    });

    it('should suppress the EMOM Action label from display', () => {
      const { statement } = parseWithDialect('(20) EMOM :30', 'crossfit');
      expectNotDisplayed(statement, MetricType.Action);
    });
  });

  describe('EMOM 20 mins — total duration present, no explicit rounds', () => {
    it('should emit hint workout.emom', () => {
      const { statement } = parseWithDialect('EMOM 20 mins', 'crossfit');
      expect(statement.hints?.has('workout.emom')).toBe(true);
    });

    it.failing('should synthesize Rounds = total_duration_ms / 60000', () => {
      const { statement } = parseWithDialect('EMOM 20 mins', 'crossfit');
      // 20 mins = 1200000ms → 20 rounds
      expectRawMetric(statement, MetricType.Rounds, 'dialect', 20);
    });

    it('should suppress the EMOM Action label from display', () => {
      const { statement } = parseWithDialect('EMOM 20 mins', 'crossfit');
      expectNotDisplayed(statement, MetricType.Action);
    });
  });

  describe('implicit EMOM — rounds + timer + children (no label)', () => {
    const block = `(20) :60
  5 pullups
  10 pushups`;

    it('should detect implicit EMOM hint', () => {
      const { statement } = parseWithDialect(block, 'crossfit');
      expect(statement.hints?.has('workout.emom')).toBe(true);
      expect(statement.hints?.has('workout.implicit_emom')).toBe(true);
    });

    it('should NOT emit implicit EMOM for rounds + timer WITHOUT children', () => {
      const { statement } = parseWithDialect('(5) :60', 'crossfit');
      expect(statement.hints?.has('workout.emom')).toBe(false);
    });

    it('should NOT synthesize Duration when :60 is already present', () => {
      const { statement } = parseWithDialect(block, 'crossfit');
      const dialectDurations = rawMetricsOfType(statement, MetricType.Duration)
        .filter(m => m.origin === 'dialect');
      expect(dialectDurations).toHaveLength(0);
    });
  });
});

// ──────────────────────────────────────────────────────────
// AMRAP
// ──────────────────────────────────────────────────────────

describe('CrossFitDialect — AMRAP metrics', () => {
  it('should emit hint workout.amrap', () => {
    const { statement } = parseWithDialect('AMRAP 20 mins', 'crossfit');
    expect(statement.hints?.has('workout.amrap')).toBe(true);
    expect(statement.hints?.has('behavior.time_bound')).toBe(true);
  });

  it('should suppress the AMRAP Action label from display', () => {
    const { statement } = parseWithDialect('AMRAP 20 mins', 'crossfit');
    expectNotDisplayed(statement, MetricType.Action);
  });

  it.failing('should preserve Duration in display', () => {
    const { statement } = parseWithDialect('AMRAP 20 mins', 'crossfit');
    // 20 mins = 1200000ms
    expectDisplayMetric(statement, MetricType.Duration, 1200000);
  });
});

// ──────────────────────────────────────────────────────────
// TABATA
// ──────────────────────────────────────────────────────────

describe('CrossFitDialect — TABATA metrics', () => {
  it('should emit hint workout.tabata', () => {
    const { statement } = parseWithDialect('Tabata Squats', 'crossfit');
    expect(statement.hints?.has('workout.tabata')).toBe(true);
    expect(statement.hints?.has('behavior.repeating_interval')).toBe(true);
  });

  it.failing('should synthesize interval Duration=20000ms (20s work)', () => {
    const { statement } = parseWithDialect('Tabata Squats', 'crossfit');
    expectRawMetric(statement, MetricType.Duration, 'dialect', 20000);
  });

  it('should suppress the Tabata Action label from display', () => {
    const { statement } = parseWithDialect('Tabata Squats', 'crossfit');
    expectNotDisplayed(statement, MetricType.Action);
  });
});

// ──────────────────────────────────────────────────────────
// FOR TIME
// ──────────────────────────────────────────────────────────

describe('CrossFitDialect — FOR TIME metrics', () => {
  it('should emit hint workout.for_time', () => {
    const { statement } = parseWithDialect('For Time', 'crossfit');
    expect(statement.hints?.has('workout.for_time')).toBe(true);
    expect(statement.hints?.has('behavior.time_bound')).toBe(true);
  });

  it('should suppress the "For Time" Action label from display', () => {
    const { statement } = parseWithDialect('For Time', 'crossfit');
    expectNotDisplayed(statement, MetricType.Action);
  });
});

// ──────────────────────────────────────────────────────────
// No-op cases — dialect should not touch plain exercises
// ──────────────────────────────────────────────────────────

describe('CrossFitDialect — plain exercises (no dialect metrics)', () => {
  it('should not add any hints for 10 Pullups', () => {
    const { statement } = parseWithDialect('10 Pullups', 'crossfit');
    expect(statement.hints?.size ?? 0).toBe(0);
  });

  it('should not add any dialect metrics for 10 Pullups', () => {
    const { statement } = parseWithDialect('10 Pullups', 'crossfit');
    const dialectMetrics = statement.metrics.filter(m => m.origin === 'dialect');
    expect(dialectMetrics).toHaveLength(0);
  });

  it('should not add any hints for a timer-only statement', () => {
    const { statement } = parseWithDialect('1 min', 'crossfit');
    expect(statement.hints?.size ?? 0).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────
// MetricAction origin purity
// ──────────────────────────────────────────────────────────

describe('CrossFitDialect — metric origin purity', () => {
  it('parser metrics should never have action set (origin: parser, action: undefined)', () => {
    const { statement } = parseWithDialect('(20) EMOM :30', 'crossfit');
    const parserMetrics = statement.metrics.filter(m => m.origin === 'parser');
    parserMetrics.forEach(m => {
      expect(m.action).toBeUndefined();
    });
  });

  it.failing('dialect metrics should always have an action field', () => {
    const { statement } = parseWithDialect('(20) EMOM', 'crossfit');
    const dialectMetrics = statement.metrics.filter(m => m.origin === 'dialect');
    // If the dialect ran, we should have at least one dialect metric
    expect(dialectMetrics.length).toBeGreaterThan(0);
    dialectMetrics.forEach(m => {
      expect(m.action).toBeDefined();
      expect(['set', 'suppress', 'inherit']).toContain(m.action);
    });
  });
});
