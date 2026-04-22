/**
 * WodDialect Tests
 *
 * These tests validate the WOD dialect's ability to recognize structured
 * workout-of-the-day patterns and produce the correct semantic hints.
 *
 * Test pattern used throughout:
 *   1. Parse the input text with MdTimerRuntime to produce a CodeStatement
 *   2. Inspect the raw metrics the parser produced (the "compounded" metrics)
 *   3. Run the dialect's analyze() method
 *   4. Assert the expected hints are present
 *
 * This dual inspection (metrics + hints) lets you see exactly what information
 * flows from the parser into the dialect and what the dialect emits in return.
 */
import { describe, it, expect } from 'bun:test';
import { WodDialect } from './WodDialect';
import { MdTimerRuntime } from '../parser/md-timer';
import { ICodeStatement } from '../core/models/CodeStatement';
import { MetricType } from '../core/models/Metric';

describe('WodDialect', () => {
  const dialect = new WodDialect();
  const runtime = new MdTimerRuntime();

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Parse a single-line script and return the first CodeStatement. */
  function parseStatement(text: string): ICodeStatement {
    const script = runtime.read(text);
    if (!script.statements.length) {
      throw new Error(`No statements parsed from: "${text}"`);
    }
    return script.statements[0] as ICodeStatement;
  }

  /**
   * Returns a human-readable summary of the metrics on a statement.
   * Useful for debugging what the parser produced for a given input.
   *
   * @example
   * // console.log(describeMetrics(stmt));
   * // → [ duration=300000ms, effort="Back Squat", rep=5 ]
   */
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
    it('should have id "wod"', () => {
      expect(dialect.id).toBe('wod');
    });

    it('should have correct display name', () => {
      expect(dialect.name).toBe('WOD Dialect');
    });
  });

  // ── STRENGTH detection ─────────────────────────────────────────────────

  describe('STRENGTH block detection', () => {
    it('should detect "Strength" keyword and emit workout.strength hint', () => {
      // Parser produces: action="Strength", effort="Back Squat", rep=5
      const stmt = parseStatement('Strength Back Squat');
      console.log('[WodDialect] "Strength Back Squat" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.wod');
      expect(analysis.hints).toContain('workout.strength');
      expect(analysis.hints).toContain('behavior.load_bearing');
    });

    it('should detect "STRENGTH" in upper case', () => {
      const stmt = parseStatement('STRENGTH');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.strength');
    });
  });

  // ── METCON detection ──────────────────────────────────────────────────

  describe('METCON block detection', () => {
    it('should detect "Metcon" keyword and emit workout.metcon hint', () => {
      const stmt = parseStatement('Metcon');
      console.log('[WodDialect] "Metcon" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.wod');
      expect(analysis.hints).toContain('workout.metcon');
    });

    it('should detect mixed-case "MetCon"', () => {
      const stmt = parseStatement('MetCon 20 mins');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.metcon');
    });

    it('parser produces a Duration metric for "Metcon 20:00" (time syntax)', () => {
      // NOTE: "Metcon 20 mins" is ambiguous — the parser interprets "20" as distance (20m).
      // Use explicit time syntax "20:00" to reliably produce a Duration metric.
      const stmt = parseStatement('Metcon 20:00');
      console.log('[WodDialect] "Metcon 20:00" metrics:', describeMetrics(stmt));

      // Confirm parser attached a duration — key for strategy matching downstream
      expect(stmt.metrics.some(m => m.type === MetricType.Duration)).toBe(true);
    });
  });

  // ── SKILLS detection ──────────────────────────────────────────────────

  describe('SKILLS block detection', () => {
    it('should detect "Skills" keyword and emit workout.skills hint', () => {
      const stmt = parseStatement('Skills Double Unders');
      console.log('[WodDialect] "Skills Double Unders" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.wod');
      expect(analysis.hints).toContain('workout.skills');
    });

    it('should detect "Technique" as a skills block', () => {
      const stmt = parseStatement('Technique Muscle Ups');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.skills');
    });
  });

  // ── WOD keyword detection ─────────────────────────────────────────────

  describe('WOD keyword detection', () => {
    it('should detect explicit "WOD" keyword', () => {
      const stmt = parseStatement('WOD');
      console.log('[WodDialect] "WOD" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.wod');
    });
  });

  // ── SUPERSET detection ────────────────────────────────────────────────

  describe('SUPERSET detection', () => {
    it('should detect "Superset" keyword and emit workout.superset hint', () => {
      const stmt = parseStatement('Superset Bench Press Rows');
      console.log('[WodDialect] "Superset" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.wod');
      expect(analysis.hints).toContain('workout.superset');
    });
  });

  // ── No hints for non-matching statements ─────────────────────────────

  describe('no hints for non-matching statements', () => {
    it('should return empty hints for a plain exercise', () => {
      const stmt = parseStatement('10 Pullups');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toHaveLength(0);
    });

    it('should return empty hints for a timer-only statement', () => {
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
