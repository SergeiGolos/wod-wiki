import { describe, it, expect } from 'bun:test';
import { HabitsDialect } from './HabitsDialect';
import { MdTimerRuntime } from '../parser/md-timer';
import { ICodeStatement } from '../core/models/CodeStatement';
import { MetricType } from '../core/models/Metric';

describe('HabitsDialect', () => {
  const dialect = new HabitsDialect();
  const runtime = new MdTimerRuntime();

  function parseStatement(text: string): ICodeStatement {
    const script = runtime.read(text);
    if (!script.statements.length) {
      throw new Error(`Failed to parse statement from text: "${text}"`);
    }
    return script.statements[0] as ICodeStatement;
  }

  describe('daily check-off habit detection', () => {
    it('should detect "Daily" keyword and emit domain.habits + behavior.completable hints', () => {
      const statement = parseStatement('Morning Journaling Daily');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.habits');
      expect(analysis.hints).toContain('behavior.completable');
    });

    it('should emit workout.habit_check for a check-off habit with no reps or duration', () => {
      const statement = parseStatement('Habit Daily');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.habit_check');
      expect(analysis.hints).toContain('behavior.daily');
    });

    it('should detect "Morning" routine keyword', () => {
      const statement = parseStatement('Morning Routine');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.habits');
    });

    it('should detect "Evening" routine keyword', () => {
      const statement = parseStatement('Evening Routine');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.habits');
    });
  });

  describe('timed habit detection', () => {
    it('should emit workout.habit_timed when a habit has a duration', () => {
      const statement = parseStatement('Meditation Daily 10:00');
      const analysis = dialect.analyze(statement);

      expect(statement.metrics.some(m => m.type === MetricType.Duration)).toBe(true);
      expect(analysis.hints).toContain('domain.habits');
      expect(analysis.hints).toContain('workout.habit_timed');
    });

    it('should emit workout.habit_timed for a "Morning" routine with a duration', () => {
      const statement = parseStatement('Morning Routine 5:00');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.habit_timed');
    });
  });

  describe('rep-based habit detection', () => {
    it('should emit workout.habit_rep when a habit has a rep count', () => {
      const statement = parseStatement('10 Pushups Daily');
      const analysis = dialect.analyze(statement);

      expect(statement.metrics.some(m => m.type === MetricType.Rep)).toBe(true);
      expect(analysis.hints).toContain('domain.habits');
      expect(analysis.hints).toContain('workout.habit_rep');
    });
  });

  describe('streak detection', () => {
    it('should detect "Streak" keyword and emit behavior.streak + behavior.recurring hints', () => {
      const statement = parseStatement('Streak Running');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.habits');
      expect(analysis.hints).toContain('behavior.streak');
      expect(analysis.hints).toContain('behavior.recurring');
    });
  });

  describe('no hints for non-habit statements', () => {
    it('should return empty hints for a plain exercise', () => {
      const statement = parseStatement('10 Pullups');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toHaveLength(0);
    });

    it('should return empty hints for a timer-only statement', () => {
      const statement = parseStatement('5:00');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toHaveLength(0);
    });

    it('should handle a statement with no metrics gracefully', () => {
      const analysis = dialect.analyze({ id: 1 } as any);

      expect(analysis.hints).toHaveLength(0);
    });
  });

  describe('dialect metadata', () => {
    it('should have id "habits"', () => {
      expect(dialect.id).toBe('habits');
    });

    it('should have correct display name', () => {
      expect(dialect.name).toBe('Habits Dialect');
    });
  });
});
