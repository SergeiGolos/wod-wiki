/**
 * CardioDialect Tests
 *
 * These tests validate the Cardio dialect's ability to recognize endurance
 * and aerobic workout patterns and produce the correct semantic hints.
 *
 * Test pattern:
 *   1. Parse the input with MdTimerRuntime → CodeStatement
 *   2. Inspect the raw parser metrics (the "compounded" data)
 *   3. Apply the dialect's analyze()
 *   4. Assert hints
 *
 * The describeMetrics() helper prints the full metric payload so you can see
 * exactly what the parser produced for each workout expression.
 */
import { describe, it, expect } from 'bun:test';
import { CardioDialect } from './CardioDialect';
import { MdTimerRuntime } from '../parser/md-timer';
import { ICodeStatement } from '../core/models/CodeStatement';
import { MetricType } from '../core/models/Metric';

describe('CardioDialect', () => {
  const dialect = new CardioDialect();
  const runtime = new MdTimerRuntime();

  // ── Helpers ──────────────────────────────────────────────────────────────

  function parseStatement(text: string): ICodeStatement {
    const script = runtime.read(text);
    if (!script.statements.length) {
      throw new Error(`No statements parsed from: "${text}"`);
    }
    return script.statements[0] as ICodeStatement;
  }

  function describeMetrics(stmt: ICodeStatement): string {
    return (
      '[ ' +
      (stmt.metrics ?? [])
        .map(m => `${m.type}=${JSON.stringify(m.value)}${m.unit ? m.unit : ''}`)
        .join(', ') +
      ' ]'
    );
  }

  // ── Dialect metadata ───────────────────────────────────────────────────

  describe('dialect metadata', () => {
    it('should have id "cardio"', () => {
      expect(dialect.id).toBe('cardio');
    });

    it('should have correct display name', () => {
      expect(dialect.name).toBe('Cardio Dialect');
    });
  });

  // ── Running detection ─────────────────────────────────────────────────

  describe('running detection', () => {
    it('should detect "Run" keyword and emit workout.run hint', () => {
      const stmt = parseStatement('400m Run');
      console.log('[CardioDialect] "400m Run" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('workout.run');
      expect(analysis.hints).toContain('behavior.aerobic');
    });

    it('should detect "Jog" keyword', () => {
      const stmt = parseStatement('1 mile Jog');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.run');
    });

    it('should detect "Sprint" keyword', () => {
      const stmt = parseStatement('100m Sprint');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.run');
      expect(analysis.hints).toContain('domain.cardio');
    });

    it('parser should produce a Distance metric for "400m Run"', () => {
      const stmt = parseStatement('400m Run');
      console.log('[CardioDialect] Distance-bearing statement:', describeMetrics(stmt));

      expect(stmt.metrics.some(m => m.type === MetricType.Distance)).toBe(true);
    });

    it('should add behavior.distance_based and behavior.pace_based when distance metric is present', () => {
      const stmt = parseStatement('5km Run');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('behavior.distance_based');
      expect(analysis.hints).toContain('behavior.pace_based');
    });
  });

  // ── Rowing detection ──────────────────────────────────────────────────

  describe('rowing detection', () => {
    it('should detect "Row" keyword and emit workout.row hint', () => {
      const stmt = parseStatement('500m Row');
      console.log('[CardioDialect] "500m Row" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('workout.row');
      expect(analysis.hints).toContain('behavior.aerobic');
    });

    it('should detect "Rowing" keyword', () => {
      const stmt = parseStatement('2000m Rowing');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.row');
    });
  });

  // ── Cycling detection ─────────────────────────────────────────────────

  describe('cycling detection', () => {
    it('should detect "Bike" keyword and emit workout.bike hint', () => {
      const stmt = parseStatement('5km Bike');
      console.log('[CardioDialect] "5km Bike" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('workout.bike');
    });

    it('should detect "Cycle" keyword', () => {
      const stmt = parseStatement('20 min Cycle');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.bike');
    });
  });

  // ── Swimming detection ────────────────────────────────────────────────

  describe('swimming detection', () => {
    it('should detect "Swim" keyword and emit workout.swim hint', () => {
      const stmt = parseStatement('200m Swim');
      console.log('[CardioDialect] "200m Swim" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('workout.swim');
      expect(analysis.hints).toContain('behavior.aerobic');
    });
  });

  // ── Walking detection ─────────────────────────────────────────────────

  describe('walking detection', () => {
    it('should detect "Walk" keyword and emit workout.walk hint', () => {
      const stmt = parseStatement('1km Walk');
      console.log('[CardioDialect] "1km Walk" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('workout.walk');
    });
  });

  // ── Distance-only detection ───────────────────────────────────────────

  describe('distance-only detection', () => {
    it('should emit domain.cardio and behavior.distance_based for a distance-only statement', () => {
      // "400m" with no explicit activity keyword
      const stmt = parseStatement('400m');
      console.log('[CardioDialect] "400m" (distance-only) metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('behavior.distance_based');
    });
  });

  // ── No hints for non-cardio statements ───────────────────────────────

  describe('no hints for non-cardio statements', () => {
    it('should return empty hints for a strength exercise', () => {
      const stmt = parseStatement('10 Pullups');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toHaveLength(0);
    });

    it('should return empty hints for a timer with no cardio cue', () => {
      const stmt = parseStatement('5:00');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toHaveLength(0);
    });

    it('should handle a statement with no metrics gracefully', () => {
      const analysis = dialect.analyze({ id: 1 } as any);
      expect(analysis.hints).toHaveLength(0);
    });
  });
});
