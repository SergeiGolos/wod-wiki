import { describe, it, expect } from 'bun:test';
import { CardioDialect } from './CardioDialect';
import { MdTimerRuntime } from '../parser/md-timer';
import { ICodeStatement } from '../core/models/CodeStatement';
import { MetricType } from '../core/models/Metric';

describe('CardioDialect', () => {
  const dialect = new CardioDialect();
  const runtime = new MdTimerRuntime();

  function parseStatement(text: string): ICodeStatement {
    const script = runtime.read(text);
    if (!script.statements.length) {
      throw new Error(`Failed to parse statement from text: "${text}"`);
    }
    return script.statements[0] as ICodeStatement;
  }

  describe('running detection', () => {
    it('should detect "Run" keyword and emit workout.run hint', () => {
      const statement = parseStatement('400m Run');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('workout.run');
      expect(analysis.hints).toContain('behavior.aerobic');
    });

    it('should detect "Jog" keyword', () => {
      const statement = parseStatement('1 mile Jog');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.run');
    });

    it('should detect "Sprint" keyword', () => {
      const statement = parseStatement('100m Sprint');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.run');
      expect(analysis.hints).toContain('domain.cardio');
    });

    it('parser should produce a Distance metric for "400m Run"', () => {
      const statement = parseStatement('400m Run');

      expect(statement.metrics.some(m => m.type === MetricType.Distance)).toBe(true);
    });

    it('should add behavior.distance_based and behavior.pace_based when distance metric is present', () => {
      const statement = parseStatement('5km Run');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('behavior.distance_based');
      expect(analysis.hints).toContain('behavior.pace_based');
    });
  });

  describe('rowing detection', () => {
    it('should detect "Row" keyword and emit workout.row hint', () => {
      const statement = parseStatement('500m Row');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('workout.row');
      expect(analysis.hints).toContain('behavior.aerobic');
    });

    it('should detect "Rowing" keyword', () => {
      const statement = parseStatement('2000m Rowing');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.row');
    });
  });

  describe('cycling detection', () => {
    it('should detect "Bike" keyword and emit workout.bike hint', () => {
      const statement = parseStatement('5km Bike');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('workout.bike');
    });

    it('should detect "Cycle" keyword', () => {
      const statement = parseStatement('20 min Cycle');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.bike');
    });
  });

  describe('swimming detection', () => {
    it('should detect "Swim" keyword and emit workout.swim hint', () => {
      const statement = parseStatement('200m Swim');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('workout.swim');
      expect(analysis.hints).toContain('behavior.aerobic');
    });
  });

  describe('walking detection', () => {
    it('should detect "Walk" keyword and emit workout.walk hint', () => {
      const statement = parseStatement('1km Walk');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('workout.walk');
    });
  });

  describe('distance-only detection', () => {
    it('should emit domain.cardio and behavior.distance_based for a distance-only statement', () => {
      const statement = parseStatement('400m');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.cardio');
      expect(analysis.hints).toContain('behavior.distance_based');
    });
  });

  describe('no hints for non-cardio statements', () => {
    it('should return empty hints for a strength exercise', () => {
      const statement = parseStatement('10 Pullups');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toHaveLength(0);
    });

    it('should return empty hints for a timer with no cardio cue', () => {
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
    it('should have id "cardio"', () => {
      expect(dialect.id).toBe('cardio');
    });

    it('should have correct display name', () => {
      expect(dialect.name).toBe('Cardio Dialect');
    });
  });
});
