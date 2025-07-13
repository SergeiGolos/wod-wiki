import { describe, it, expect, beforeEach } from 'vitest';
import { FragmentCompilationManager, FragmentCompilationContext } from './FragmentCompilationManager';
import { RuntimeMetric } from './RuntimeMetric';

describe('FragmentCompilationManager', () => {
  let manager: FragmentCompilationManager;
  let context: FragmentCompilationContext;

  beforeEach(() => {
    manager = new FragmentCompilationManager();
    context = FragmentCompilationManager.createContext({
      isActive: false,
      isPaused: false,
      elapsedTime: 0,
      currentRep: 1,
      currentRound: 1
    });
  });

  describe('compileStatementFragments', () => {
    it('should compile repetition fragments correctly', () => {
      const statement = {
        id: 'test-statement',
        fragments: [
          { type: 'action', value: 'Pullups' },
          { type: 'rep', value: 21 }
        ]
      };

      const result = manager.compileStatementFragments(statement, context);

      expect(result.sourceId).toBe('test-statement');
      expect(result.effort).toBe('Pullups');
      expect(result.values).toHaveLength(1);
      expect(result.values[0]).toEqual({
        type: 'repetitions',
        value: 21,
        unit: 'reps'
      });
    });

    it('should compile resistance fragments correctly', () => {
      const statement = {
        id: 'test-statement',
        fragments: [
          { type: 'action', value: 'Thrusters' },
          { type: 'resistance', value: '95lb' }
        ]
      };

      const result = manager.compileStatementFragments(statement, context);

      expect(result.effort).toBe('Thrusters');
      expect(result.values).toHaveLength(1);
      expect(result.values[0]).toEqual({
        type: 'resistance',
        value: 95,
        unit: 'lb'
      });
    });

    it('should compile distance fragments correctly', () => {
      const statement = {
        id: 'test-statement',
        fragments: [
          { type: 'action', value: 'Run' },
          { type: 'distance', value: '400m' }
        ]
      };

      const result = manager.compileStatementFragments(statement, context);

      expect(result.effort).toBe('Run');
      expect(result.values).toHaveLength(1);
      expect(result.values[0]).toEqual({
        type: 'distance',
        value: 400,
        unit: 'm'
      });
    });

    it('should compile timer fragments correctly', () => {
      const statement = {
        id: 'test-statement',
        fragments: [
          { type: 'timer', value: '20:00' }
        ]
      };

      const result = manager.compileStatementFragments(statement, context);

      expect(result.values).toHaveLength(1);
      expect(result.values[0]).toEqual({
        type: 'time',
        value: 20,
        unit: 'min'
      });
    });

    it('should compile multiple fragments correctly', () => {
      const statement = {
        id: 'test-statement',
        fragments: [
          { type: 'action', value: 'Deadlifts' },
          { type: 'rep', value: 5 },
          { type: 'resistance', value: '225lb' }
        ]
      };

      const result = manager.compileStatementFragments(statement, context);

      expect(result.effort).toBe('Deadlifts');
      expect(result.values).toHaveLength(2);
      
      const repValue = result.values.find(v => v.type === 'repetitions');
      expect(repValue).toEqual({ type: 'repetitions', value: 5, unit: 'reps' });
      
      const resistanceValue = result.values.find(v => v.type === 'resistance');
      expect(resistanceValue).toEqual({ type: 'resistance', value: 225, unit: 'lb' });
    });

    it('should handle unknown fragment types gracefully', () => {
      const statement = {
        id: 'test-statement',
        fragments: [
          { type: 'action', value: 'Test' },
          { type: 'unknown', value: 'something' }
        ]
      };

      const result = manager.compileStatementFragments(statement, context);

      expect(result.effort).toBe('Test');
      expect(result.values).toHaveLength(0); // Unknown fragment should be ignored
    });

    it('should handle missing action fragment', () => {
      const statement = {
        id: 'test-statement',
        fragments: [
          { type: 'rep', value: 10 }
        ]
      };

      const result = manager.compileStatementFragments(statement, context);

      expect(result.effort).toBe('Unknown Exercise');
      expect(result.values).toHaveLength(1);
    });
  });

  describe('unit extraction', () => {
    it('should extract correct resistance units', () => {
      const statements = [
        { type: 'resistance', value: '95lb', expectedUnit: 'lb' },
        { type: 'resistance', value: '50kg', expectedUnit: 'kg' },
        { type: 'resistance', value: '100', expectedUnit: 'lb' } // default
      ];

      statements.forEach(({ type, value, expectedUnit }) => {
        const statement = {
          id: 'test',
          fragments: [{ type, value }]
        };

        const result = manager.compileStatementFragments(statement, context);
        expect(result.values[0].unit).toBe(expectedUnit);
      });
    });

    it('should extract correct distance units', () => {
      const statements = [
        { type: 'distance', value: '400m', expectedUnit: 'm' },
        { type: 'distance', value: '5km', expectedUnit: 'km' },
        { type: 'distance', value: '100ft', expectedUnit: 'ft' },
        { type: 'distance', value: '50yd', expectedUnit: 'yd' },
        { type: 'distance', value: '1mi', expectedUnit: 'mi' },
        { type: 'distance', value: '200', expectedUnit: 'm' } // default
      ];

      statements.forEach(({ type, value, expectedUnit }) => {
        const statement = {
          id: 'test',
          fragments: [{ type, value }]
        };

        const result = manager.compileStatementFragments(statement, context);
        expect(result.values[0].unit).toBe(expectedUnit);
      });
    });
  });

  describe('createContext', () => {
    it('should create valid context with defaults', () => {
      const context = FragmentCompilationManager.createContext({});

      expect(context.runtimeState.isActive).toBe(false);
      expect(context.runtimeState.currentRep).toBe(1);
      expect(context.executionDepth).toBe(0);
      expect(context.parentMetrics).toEqual([]);
    });

    it('should create context with provided runtime state', () => {
      const runtimeState = {
        isActive: true,
        isPaused: false,
        elapsedTime: 1000,
        currentRep: 5,
        currentRound: 2
      };

      const context = FragmentCompilationManager.createContext(runtimeState, 3);

      expect(context.runtimeState.isActive).toBe(true);
      expect(context.runtimeState.elapsedTime).toBe(1000);
      expect(context.runtimeState.currentRep).toBe(5);
      expect(context.executionDepth).toBe(3);
    });
  });
});