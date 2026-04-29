import { describe, it, expect } from 'bun:test';
import { YogaDialect } from './YogaDialect';
import { MdTimerRuntime } from '../parser/md-timer';
import { ICodeStatement } from '../core/models/CodeStatement';
import { MetricType } from '../core/models/Metric';

describe('YogaDialect', () => {
  const dialect = new YogaDialect();
  const runtime = new MdTimerRuntime();

  function parseStatement(text: string): ICodeStatement {
    const script = runtime.read(text);
    if (!script.statements.length) {
      throw new Error(`Failed to parse statement from text: "${text}"`);
    }
    return script.statements[0] as ICodeStatement;
  }

  describe('pose hold detection', () => {
    it('should detect "Warrior" pose and emit workout.pose hint', () => {
      const statement = parseStatement('Warrior II');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.pose');
    });

    it('should add behavior.hold when pose has a duration', () => {
      const statement = parseStatement('Warrior II :60');
      const analysis = dialect.analyze(statement);

      expect(statement.metrics.some(m => m.type === MetricType.Duration)).toBe(true);
      expect(analysis.hints).toContain('workout.pose');
      expect(analysis.hints).toContain('behavior.hold');
    });

    it('should detect "Downward" (Downward Dog) as a pose', () => {
      const statement = parseStatement('Downward Dog :30');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.pose');
      expect(analysis.hints).toContain('behavior.hold');
    });

    it('should detect "Cobra" pose', () => {
      const statement = parseStatement('Cobra Pose :45');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.pose');
    });

    it('should detect "Savasana" (corpse pose)', () => {
      const statement = parseStatement('Savasana 5:00');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.pose');
      expect(analysis.hints).toContain('behavior.hold');
    });
  });

  describe('flow detection', () => {
    it('should detect "Sun Salutation" and emit workout.flow hint', () => {
      const statement = parseStatement('Sun Salutation x5');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.flow');
    });

    it('should detect "Vinyasa" flow', () => {
      const statement = parseStatement('Vinyasa Flow 30 mins');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.flow');
    });

    it('should detect generic "Flow" keyword', () => {
      const statement = parseStatement('Flow Sequence');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.flow');
    });
  });

  describe('breathing exercise detection', () => {
    it('should detect "Breathing" and emit workout.breathing and behavior.mindful hints', () => {
      const statement = parseStatement('Breathing Exercises 5:00');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.breathing');
      expect(analysis.hints).toContain('behavior.mindful');
    });

    it('should detect "Pranayama"', () => {
      const statement = parseStatement('Pranayama 10:00');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.breathing');
      expect(analysis.hints).toContain('behavior.mindful');
    });

    it('should detect "Box Breath"', () => {
      const statement = parseStatement('Box Breath');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.breathing');
    });
  });

  describe('meditation detection', () => {
    it('should detect "Meditation" and emit workout.meditation and behavior.mindful hints', () => {
      const statement = parseStatement('Meditation 10:00');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.yoga');
      expect(analysis.hints).toContain('workout.meditation');
      expect(analysis.hints).toContain('behavior.mindful');
    });

    it('should detect "Mindfulness"', () => {
      const statement = parseStatement('Mindfulness 5:00');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.meditation');
      expect(analysis.hints).toContain('behavior.mindful');
    });

    it('should detect "Body Scan"', () => {
      const statement = parseStatement('Body Scan');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.meditation');
    });
  });

  describe('no hints for non-yoga statements', () => {
    it('should return empty hints for a strength exercise', () => {
      const statement = parseStatement('10 Pullups');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toHaveLength(0);
    });

    it('should return empty hints for a plain timer', () => {
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
    it('should have id "yoga"', () => {
      expect(dialect.id).toBe('yoga');
    });

    it('should have correct display name', () => {
      expect(dialect.name).toBe('Yoga Dialect');
    });
  });
});
