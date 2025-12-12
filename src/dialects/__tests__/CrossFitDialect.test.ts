import { describe, it, expect } from 'bun:test';
import { CrossFitDialect } from '../CrossFitDialect';
import { ICodeStatement } from '../../core/models/CodeStatement';
import { FragmentType } from '../../core/models/CodeFragment';

describe('CrossFitDialect', () => {
  const dialect = new CrossFitDialect();

  describe('AMRAP detection', () => {
    it('should detect AMRAP in Action fragment', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' }
        ]
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toContain('behavior.time_bound');
      expect(analysis.hints).toContain('workout.amrap');
    });

    it('should detect AMRAP in mixed case', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'amrap workout', type: 'action' }
        ]
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toContain('behavior.time_bound');
      expect(analysis.hints).toContain('workout.amrap');
    });

    it('should detect AMRAP in Effort fragment', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Effort, value: '20 min AMRAP', type: 'effort' }
        ]
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toContain('behavior.time_bound');
      expect(analysis.hints).toContain('workout.amrap');
    });
  });

  describe('EMOM detection', () => {
    it('should detect EMOM in Action fragment', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ]
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toContain('behavior.repeating_interval');
      expect(analysis.hints).toContain('workout.emom');
    });

    it('should detect EMOM in mixed case', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'emom for 10 mins', type: 'action' }
        ]
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toContain('behavior.repeating_interval');
      expect(analysis.hints).toContain('workout.emom');
    });
  });

  describe('FOR TIME detection', () => {
    it('should detect FOR TIME in Action fragment', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'For Time', type: 'action' }
        ]
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toContain('behavior.time_bound');
      expect(analysis.hints).toContain('workout.for_time');
    });
  });

  describe('TABATA detection', () => {
    it('should detect TABATA in Action fragment', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'Tabata Squats', type: 'action' }
        ]
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toContain('behavior.repeating_interval');
      expect(analysis.hints).toContain('workout.tabata');
    });
  });

  describe('no hints for non-matching statements', () => {
    it('should return empty hints for regular exercise', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Effort, value: '10 Pullups', type: 'effort' }
        ]
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toHaveLength(0);
    });

    it('should return empty hints for timer-only statement', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ]
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toHaveLength(0);
    });

    it('should handle statement with no fragments', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: []
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toHaveLength(0);
    });

    it('should handle statement with undefined fragments', () => {
      const statement: ICodeStatement = {
        id: 1
      } as any;

      const analysis = dialect.analyze(statement);
      
      expect(analysis.hints).toHaveLength(0);
    });
  });

  describe('dialect metadata', () => {
    it('should have correct id', () => {
      expect(dialect.id).toBe('crossfit');
    });

    it('should have correct name', () => {
      expect(dialect.name).toBe('CrossFit Dialect');
    });
  });
});
