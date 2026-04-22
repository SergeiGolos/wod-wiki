/**
 * HabitsDialect Tests
 *
 * These tests validate the Habits dialect's ability to recognize daily habit
 * tracking patterns from parsed workout/log statements.
 *
 * Test pattern:
 *   1. Parse the input with MdTimerRuntime → CodeStatement
 *   2. Inspect the raw parser metrics (the "compounded" data)
 *   3. Apply the dialect's analyze()
 *   4. Assert hints
 *
 * Use describeMetrics() to see exactly what metric types the parser produced
 * for each habit expression, so you know what data the dialect has to work with.
 */
import { describe, it, expect } from 'bun:test';
import { HabitsDialect } from './HabitsDialect';
import { MdTimerRuntime } from '../parser/md-timer';
import { ICodeStatement } from '../core/models/CodeStatement';
import { MetricType } from '../core/models/Metric';

describe('HabitsDialect', () => {
  const dialect = new HabitsDialect();
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
    it('should have id "habits"', () => {
      expect(dialect.id).toBe('habits');
    });

    it('should have correct display name', () => {
      expect(dialect.name).toBe('Habits Dialect');
    });
  });

  // ── Daily check-off habit detection ───────────────────────────────────

  describe('daily check-off habit detection', () => {
    it('should detect "Daily" keyword and emit domain.habits + behavior.completable hints', () => {
      const stmt = parseStatement('Morning Journaling Daily');
      console.log('[HabitsDialect] "Morning Journaling Daily" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.habits');
      expect(analysis.hints).toContain('behavior.completable');
    });

    it('should emit workout.habit_check for a check-off habit with no reps or duration', () => {
      const stmt = parseStatement('Habit Daily');
      console.log('[HabitsDialect] "Habit Daily" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.habit_check');
      expect(analysis.hints).toContain('behavior.daily');
    });

    it('should detect "Morning" routine keyword', () => {
      const stmt = parseStatement('Morning Routine');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.habits');
    });

    it('should detect "Evening" routine keyword', () => {
      const stmt = parseStatement('Evening Routine');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.habits');
    });
  });

  // ── Timed habit detection ──────────────────────────────────────────────

  describe('timed habit detection', () => {
    it('should emit workout.habit_timed when a habit has a duration', () => {
      // e.g. "Meditate :10:00 daily" — daily meditation for 10 minutes
      const stmt = parseStatement('Meditation Daily 10:00');
      console.log('[HabitsDialect] "Meditation Daily 10:00" metrics:', describeMetrics(stmt));

      // Confirm parser produced a Duration metric
      expect(stmt.metrics.some(m => m.type === MetricType.Duration)).toBe(true);

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.habits');
      expect(analysis.hints).toContain('workout.habit_timed');
    });

    it('should emit workout.habit_timed for a "Morning" routine with a duration', () => {
      const stmt = parseStatement('Morning Routine 5:00');
      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('workout.habit_timed');
    });
  });

  // ── Rep-based habit detection ─────────────────────────────────────────

  describe('rep-based habit detection', () => {
    it('should emit workout.habit_rep when a habit has a rep count', () => {
      // e.g. "10 Pushups daily"
      const stmt = parseStatement('10 Pushups Daily');
      console.log('[HabitsDialect] "10 Pushups Daily" metrics:', describeMetrics(stmt));

      // Confirm parser produced a Rep metric
      expect(stmt.metrics.some(m => m.type === MetricType.Rep)).toBe(true);

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.habits');
      expect(analysis.hints).toContain('workout.habit_rep');
    });
  });

  // ── Streak detection ──────────────────────────────────────────────────

  describe('streak detection', () => {
    it('should detect "Streak" keyword and emit behavior.streak + behavior.recurring hints', () => {
      const stmt = parseStatement('Streak Running');
      console.log('[HabitsDialect] "Streak Running" metrics:', describeMetrics(stmt));

      const analysis = dialect.analyze(stmt);

      expect(analysis.hints).toContain('domain.habits');
      expect(analysis.hints).toContain('behavior.streak');
      expect(analysis.hints).toContain('behavior.recurring');
    });
  });

  // ── No hints for non-habit statements ────────────────────────────────

  describe('no hints for non-habit statements', () => {
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
