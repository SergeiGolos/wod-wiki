import { describe, it, expect } from 'bun:test';
import { WodDialect } from './WodDialect';
import { MdTimerRuntime } from '../parser/md-timer';
import { ICodeStatement } from '../core/models/CodeStatement';
import { MetricType } from '../core/models/Metric';

describe('WodDialect', () => {
  const dialect = new WodDialect();
  const runtime = new MdTimerRuntime();

  function parseStatement(text: string): ICodeStatement {
    const script = runtime.read(text);
    if (!script.statements.length) {
      throw new Error(`Failed to parse statement from text: "${text}"`);
    }
    return script.statements[0] as ICodeStatement;
  }

  describe('strength block detection', () => {
    it('should detect "Strength" keyword and emit workout.strength hint', () => {
      const statement = parseStatement('Strength Back Squat');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.wod');
      expect(analysis.hints).toContain('workout.strength');
      expect(analysis.hints).toContain('behavior.load_bearing');
    });

    it('should detect "STRENGTH" in upper case', () => {
      const statement = parseStatement('STRENGTH');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.strength');
    });
  });

  describe('metcon block detection', () => {
    it('should detect "Metcon" keyword and emit workout.metcon hint', () => {
      const statement = parseStatement('Metcon');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.wod');
      expect(analysis.hints).toContain('workout.metcon');
    });

    it('should detect mixed-case "MetCon"', () => {
      const statement = parseStatement('MetCon 20 mins');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.metcon');
    });

    it('parser produces a Duration metric for "Metcon 20:00"', () => {
      const statement = parseStatement('Metcon 20:00');

      expect(statement.metrics.some(m => m.type === MetricType.Duration)).toBe(true);
    });
  });

  describe('skills block detection', () => {
    it('should detect "Skills" keyword and emit workout.skills hint', () => {
      const statement = parseStatement('Skills Double Unders');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.wod');
      expect(analysis.hints).toContain('workout.skills');
    });

    it('should detect "Technique" as a skills block', () => {
      const statement = parseStatement('Technique Muscle Ups');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('workout.skills');
    });
  });

  describe('wod keyword detection', () => {
    it('should detect explicit "WOD" keyword', () => {
      const statement = parseStatement('WOD');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.wod');
    });
  });

  describe('superset detection', () => {
    it('should detect "Superset" keyword and emit workout.superset hint', () => {
      const statement = parseStatement('Superset Bench Press Rows');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('domain.wod');
      expect(analysis.hints).toContain('workout.superset');
    });
  });

  describe('no hints for non-matching statements', () => {
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
    it('should have id "wod"', () => {
      expect(dialect.id).toBe('wod');
    });

    it('should have correct display name', () => {
      expect(dialect.name).toBe('WOD Dialect');
    });
  });
});
