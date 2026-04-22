/**
 * YogaDialect Tests
 *
 * These tests validate the Yoga dialect's ability to recognize yoga poses,
 * flows, breathing, and meditation patterns from parsed workout statements.
 *
 * Test pattern:
 *   1. Parse the input with MdTimerRuntime → CodeStatement
 *   2. Inspect the raw parser metrics (the "compounded" data)
 *   3. Apply the dialect's analyze()
 *   4. Assert hints
 *
 * Use describeMetrics() to see exactly what metric types the parser produced.
 */
import { describe, it, expect } from 'bun:test';
import { YogaDialect } from './YogaDialect';
import { MdTimerRuntime } from '../parser/md-timer';
import { ICodeStatement } from '../core/models/CodeStatement';
import { MetricType } from '../core/models/Metric';

describe('YogaDialect', () => {
  const dialect = new YogaDialect();
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
    it('should have id "yoga"', () => {
      expect(dialect.id).toBe('yoga');
    });

    it('should have correct display name', () => {
      expect(dialect.name).toBe('Yoga Dialect');
    });
  });

  // ── Pose hold detection ───────────────────────────────────────────────

  describe('pose hold detection', () => {
    it('should detect "Warrior" pose and emit workout.pose hint', () => {
      const stmt = parseStatement('Warrior II');
      console.log('[YogaDialect] "Warrior II" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.pose');
    });

    it('should add behavior.hold when pose has a duration', () => {
      // "Warrior II :60" — a 60-second timed hold
      const stmt = parseStatement('Warrior II :60');
      console.log('[YogaDialect] "Warrior II :60" metrics:', describeMetrics(stmt));

      // Confirm the parser produced a Duration metric
      expect(stmt.metrics.some(m => m.type === MetricType.Duration)).toBe(true);

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.pose');
      expect(analysis.hints).toContain('behavior.hold');
    });

    it('should detect "Downward" (Downward Dog) as a pose', () => {
      const stmt = parseStatement('Downward Dog :30');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.pose');
      expect(analysis.hints).toContain('behavior.hold');
    });

    it('should detect "Cobra" pose', () => {
      const stmt = parseStatement('Cobra Pose :45');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.pose');
    });

    it('should detect "Savasana" (corpse pose)', () => {
      const stmt = parseStatement('Savasana 5:00');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.pose');
      expect(analysis.hints).toContain('behavior.hold');
    });
  });

  // ── Flow / sequence detection ─────────────────────────────────────────

  describe('flow / sequence detection', () => {
    it('should detect "Sun Salutation" and emit workout.flow hint', () => {
      const stmt = parseStatement('Sun Salutation x5');
      console.log('[YogaDialect] "Sun Salutation x5" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.flow');
    });

    it('should detect "Vinyasa" flow', () => {
      const stmt = parseStatement('Vinyasa Flow 30 mins');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.flow');
    });

    it('should detect generic "Flow" keyword', () => {
      const stmt = parseStatement('Flow Sequence');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.flow');
    });
  });

  // ── Breathing exercise detection ──────────────────────────────────────

  describe('breathing exercise detection', () => {
    it('should detect "Breathing" and emit workout.breathing and behavior.mindful hints', () => {
      const stmt = parseStatement('Breathing Exercises 5:00');
      console.log('[YogaDialect] "Breathing Exercises 5:00" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.breathing');
      expect(analysis.hints).toContain('behavior.mindful');
    });

    it('should detect "Pranayama"', () => {
      const stmt = parseStatement('Pranayama 10:00');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.breathing');
      expect(analysis.hints).toContain('behavior.mindful');
    });

    it('should detect "Box Breath"', () => {
      const stmt = parseStatement('Box Breath');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.breathing');
    });
  });

  // ── Meditation detection ──────────────────────────────────────────────

  describe('meditation detection', () => {
    it('should detect "Meditation" and emit workout.meditation and behavior.mindful hints', () => {
      const stmt = parseStatement('Meditation 10:00');
      console.log('[YogaDialect] "Meditation 10:00" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.meditation');
      expect(analysis.hints).toContain('behavior.mindful');
    });

    it('should detect "Mindfulness"', () => {
      const stmt = parseStatement('Mindfulness 5:00');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.meditation');
      expect(analysis.hints).toContain('behavior.mindful');
    });

    it('should detect "Body Scan"', () => {
      const stmt = parseStatement('Body Scan');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.meditation');
    });
  });

  // ── No hints for non-yoga statements ─────────────────────────────────

  describe('no hints for non-yoga statements', () => {
    it('should return empty hints for a strength exercise', () => {
      const stmt = parseStatement('10 Pullups');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toHaveLength(0);
    });

    it('should return empty hints for a plain timer', () => {
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
