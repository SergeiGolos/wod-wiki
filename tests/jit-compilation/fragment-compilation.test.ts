/**
 * Fragment Compilation System - Comprehensive Test Suite
 * 
 * Tests all 10 fragment compilers that transform parsed fragments into MetricValue[] arrays.
 * 
 * Test Coverage:
 * 1. Individual compiler outputs for each fragment type
 * 2. Metric value format validation (type, value, unit)
 * 3. Compiler registration and lookup in FragmentCompilationManager
 * 4. Fragment → MetricValue[] transformation accuracy
 * 5. Edge cases (null values, invalid units, empty strings, etc.)
 * 6. Statement-level compilation with multiple fragments
 * 7. Effort label extraction from mixed fragments
 * 
 * Test Data Categories:
 * - Valid inputs with expected outputs
 * - Edge cases (empty, null, undefined)
 * - Boundary values (zero, negative, max)
 * - Type conversions (string to number)
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { 
  ActionFragmentCompiler,
  DistanceFragmentCompiler,
  EffortFragmentCompiler,
  IncrementFragmentCompiler,
  LapFragmentCompiler,
  RepFragmentCompiler,
  ResistanceFragmentCompiler,
  RoundsFragmentCompiler,
  TextFragmentCompiler,
  TimerFragmentCompiler
} from '@/runtime/compiler/FragmentCompilers';
import { FragmentCompilationManager } from '@/runtime/compiler/FragmentCompilationManager';
import { ActionFragment } from '@/runtime/compiler/fragments/ActionFragment';
import { DistanceFragment } from '@/runtime/compiler/fragments/DistanceFragment';
import { EffortFragment } from '@/runtime/compiler/fragments/EffortFragment';
import { IncrementFragment } from '@/runtime/compiler/fragments/IncrementFragment';
import { LapFragment } from '@/runtime/compiler/fragments/LapFragment';
import { RepFragment } from '@/runtime/compiler/fragments/RepFragment';
import { ResistanceFragment } from '@/runtime/compiler/fragments/ResistanceFragment';
import { RoundsFragment } from '@/runtime/compiler/fragments/RoundsFragment';
import { TextFragment } from '@/runtime/compiler/fragments/TextFragment';
import { TimerFragment } from '@/runtime/compiler/fragments/TimerFragment';
import { ICodeStatement } from '@/core/models/CodeStatement';
import { createMockRuntime } from '../helpers/test-utils';
import { MetricValue } from '@/runtime/models/RuntimeMetric';
import { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime';
import { CodeMetadata } from '@/core/models/CodeMetadata';

describe('Fragment Compilation System', () => {
  
  // ============================================================================
  // 1. ActionFragmentCompiler Tests
  // ============================================================================
  
  describe('ActionFragmentCompiler', () => {
    let compiler: ActionFragmentCompiler;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      compiler = new ActionFragmentCompiler();
      runtime = createMockRuntime();
    });

    it('should have correct type identifier', () => {
      expect(compiler.type).toBe('action');
    });

    it('should compile action fragment', () => {
      const fragment = new ActionFragment('AMRAP'); // Parsed from [:AMRAP]
      const result = compiler.compile(fragment, runtime);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'action',
        value: undefined,
        unit: 'action:AMRAP'
      });
    });

    it('should trim whitespace from action labels', () => {
      const fragment = new ActionFragment('  For Time  ');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].unit).toBe('action:For Time');
    });

    it('should return empty array for empty action string', () => {
      const fragment = new ActionFragment('');
      const result = compiler.compile(fragment, runtime);

      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only action string', () => {
      const fragment = new ActionFragment('   ');
      const result = compiler.compile(fragment, runtime);

      expect(result).toEqual([]);
    });

    it('should handle various action types', () => {
      // Actions are parsed from [:action_name] syntax
      const actions = ['AMRAP', 'EMOM', 'For Time', 'Tabata', 'RFT'];

      actions.forEach(action => {
        const fragment = new ActionFragment(action); // e.g., from [:AMRAP]
        const result = compiler.compile(fragment, runtime);
        
        expect(result).toHaveLength(1);
        expect(result[0].unit).toBe(`action:${action}`);
      });
    });
  });

  // ============================================================================
  // 2. DistanceFragmentCompiler Tests
  // ============================================================================
  
  describe('DistanceFragmentCompiler', () => {
    let compiler: DistanceFragmentCompiler;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      compiler = new DistanceFragmentCompiler();
      runtime = createMockRuntime();
    });

    it('should have correct type identifier', () => {
      expect(compiler.type).toBe('distance');
    });

    it('should compile distance fragment with meters', () => {
      const fragment = new DistanceFragment(100, 'm');
      const result = compiler.compile(fragment, runtime);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'distance',
        value: 100,
        unit: 'm'
      });
    });

    it('should compile distance fragment with kilometers', () => {
      const fragment = new DistanceFragment(5, 'km');
      const result = compiler.compile(fragment, runtime);

      expect(result[0]).toEqual({
        type: 'distance',
        value: 5,
        unit: 'km'
      });
    });

    it('should compile distance fragment with miles', () => {
      const fragment = new DistanceFragment(1, 'mi');
      const result = compiler.compile(fragment, runtime);

      expect(result[0]).toEqual({
        type: 'distance',
        value: 1,
        unit: 'mi'
      });
    });

    it('should handle zero distance', () => {
      const fragment = new DistanceFragment(0, 'm');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(0);
    });

    it('should handle decimal distances', () => {
      const fragment = new DistanceFragment(2.5, 'km');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(2.5);
    });

    it('should handle large distances', () => {
      const fragment = new DistanceFragment(42195, 'm');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(42195);
    });

    it('should convert string amounts to numbers', () => {
      // Create fragment with string value (simulating parser output)
      const fragment = new DistanceFragment(100, 'm');
      (fragment.value as any).amount = '500';
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(500);
      expect(typeof result[0].value).toBe('number');
    });
  });

  // ============================================================================
  // 3. EffortFragmentCompiler Tests
  // ============================================================================
  
  describe('EffortFragmentCompiler', () => {
    let compiler: EffortFragmentCompiler;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      compiler = new EffortFragmentCompiler();
      runtime = createMockRuntime();
    });

    it('should have correct type identifier', () => {
      expect(compiler.type).toBe('effort');
    });

    it('should compile effort fragment', () => {
      const fragment = new EffortFragment('Pull-ups');
      const result = compiler.compile(fragment, runtime);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'effort',
        value: undefined,
        unit: 'effort:Pull-ups'
      });
    });

    it('should trim whitespace from effort labels', () => {
      const fragment = new EffortFragment('  Thrusters  ');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].unit).toBe('effort:Thrusters');
    });

    it('should return empty array for empty effort string', () => {
      const fragment = new EffortFragment('');
      const result = compiler.compile(fragment, runtime);

      expect(result).toEqual([]);
    });

    it('should handle complex exercise names', () => {
      const exercises = [
        'Double-Unders',
        'Muscle-ups',
        'Ring Dips',
        'Box Jumps (24")',
        'Turkish Get-up'
      ];

      exercises.forEach(exercise => {
        const fragment = new EffortFragment(exercise);
        const result = compiler.compile(fragment, runtime);
        
        expect(result).toHaveLength(1);
        expect(result[0].unit).toBe(`effort:${exercise}`);
      });
    });
  });

  // ============================================================================
  // 4. IncrementFragmentCompiler Tests
  // ============================================================================
  
  describe('IncrementFragmentCompiler', () => {
    let compiler: IncrementFragmentCompiler;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      compiler = new IncrementFragmentCompiler();
      runtime = createMockRuntime();
    });

    it('should have correct type identifier', () => {
      expect(compiler.type).toBe('increment');
    });

    it('should return empty array for increment fragments', () => {
      const fragment = new IncrementFragment('^');
      const result = compiler.compile(fragment, runtime);

      expect(result).toEqual([]);
    });

    it('should return empty array for decrement fragments', () => {
      const fragment = new IncrementFragment('v');
      const result = compiler.compile(fragment, runtime);

      expect(result).toEqual([]);
    });

    it('should not emit metrics (handled at behavior level)', () => {
      // Increment/decrement logic is handled by behaviors, not fragment compilation
      const fragment = new IncrementFragment('^');
      const result = compiler.compile(fragment, runtime);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // 5. LapFragmentCompiler Tests
  // ============================================================================
  
  describe('LapFragmentCompiler', () => {
    let compiler: LapFragmentCompiler;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      compiler = new LapFragmentCompiler();
      runtime = createMockRuntime();
    });

    it('should have correct type identifier', () => {
      expect(compiler.type).toBe('lap');
    });

    it('should return empty array for lap fragments', () => {
      const fragment = new LapFragment('or', '[', undefined);
      const result = compiler.compile(fragment, runtime);

      expect(result).toEqual([]);
    });

    it('should not emit metrics (structural grouping)', () => {
      // Lap fragments define grouping, not measurable metrics
      const fragment = new LapFragment('and', ',', undefined);
      const result = compiler.compile(fragment, runtime);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // 6. RepFragmentCompiler Tests
  // ============================================================================
  
  describe('RepFragmentCompiler', () => {
    let compiler: RepFragmentCompiler;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      compiler = new RepFragmentCompiler();
      runtime = createMockRuntime();
    });

    it('should have correct type identifier', () => {
      expect(compiler.type).toBe('rep');
    });

    it('should compile rep fragment with value', () => {
      const fragment = new RepFragment(21);
      const result = compiler.compile(fragment, runtime);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'repetitions',
        value: 21,
        unit: ''
      });
    });

    it('should handle zero reps', () => {
      const fragment = new RepFragment(0);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(0);
    });

    it('should handle large rep counts', () => {
      const fragment = new RepFragment(1000);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(1000);
    });

    it('should handle undefined reps', () => {
      const fragment = new RepFragment(undefined);
      const result = compiler.compile(fragment, runtime);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBeUndefined();
    });

    it('should have empty unit string', () => {
      const fragment = new RepFragment(10);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].unit).toBe('');
    });
  });

  // ============================================================================
  // 7. ResistanceFragmentCompiler Tests
  // ============================================================================
  
  describe('ResistanceFragmentCompiler', () => {
    let compiler: ResistanceFragmentCompiler;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      compiler = new ResistanceFragmentCompiler();
      runtime = createMockRuntime();
    });

    it('should have correct type identifier', () => {
      expect(compiler.type).toBe('resistance');
    });

    it('should compile resistance fragment with pounds', () => {
      const fragment = new ResistanceFragment(135, '#');
      const result = compiler.compile(fragment, runtime);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'resistance',
        value: 135,
        unit: '#'
      });
    });

    it('should compile resistance fragment with kilograms', () => {
      const fragment = new ResistanceFragment(100, 'kg');
      const result = compiler.compile(fragment, runtime);

      expect(result[0]).toEqual({
        type: 'resistance',
        value: 100,
        unit: 'kg'
      });
    });

    it('should handle zero resistance', () => {
      const fragment = new ResistanceFragment(0, '#');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(0);
    });

    it('should handle decimal weights', () => {
      const fragment = new ResistanceFragment(52.5, 'kg');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(52.5);
    });

    it('should convert string amounts to numbers', () => {
      const fragment = new ResistanceFragment(135, '#');
      (fragment.value as any).amount = '225';
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(225);
      expect(typeof result[0].value).toBe('number');
    });

    it('should handle bodyweight notation', () => {
      const fragment = new ResistanceFragment(1, 'bw');
      const result = compiler.compile(fragment, runtime);

      expect(result[0]).toEqual({
        type: 'resistance',
        value: 1,
        unit: 'bw'
      });
    });
  });

  // ============================================================================
  // 8. RoundsFragmentCompiler Tests
  // ============================================================================
  
  describe('RoundsFragmentCompiler', () => {
    let compiler: RoundsFragmentCompiler;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      compiler = new RoundsFragmentCompiler();
      runtime = createMockRuntime();
    });

    it('should have correct type identifier', () => {
      expect(compiler.type).toBe('rounds');
    });

    it('should compile rounds fragment', () => {
      const fragment = new RoundsFragment(3);
      const result = compiler.compile(fragment, runtime);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'rounds',
        value: 3,
        unit: ''
      });
    });

    it('should handle single round', () => {
      const fragment = new RoundsFragment(1);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(1);
    });

    it('should handle large round counts', () => {
      const fragment = new RoundsFragment(50);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(50);
    });

    it('should have empty unit string', () => {
      const fragment = new RoundsFragment(5);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].unit).toBe('');
    });
  });

  // ============================================================================
  // 9. TextFragmentCompiler Tests
  // ============================================================================
  
  describe('TextFragmentCompiler', () => {
    let compiler: TextFragmentCompiler;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      compiler = new TextFragmentCompiler();
      runtime = createMockRuntime();
    });

    it('should have correct type identifier', () => {
      expect(compiler.type).toBe('text');
    });

    it('should return empty array for text fragments', () => {
      const fragment = new TextFragment('Rest 2 minutes');
      const result = compiler.compile(fragment, runtime);

      expect(result).toEqual([]);
    });

    it('should not emit metrics for notes', () => {
      const fragment = new TextFragment('Scale as needed', 'note');
      const result = compiler.compile(fragment, runtime);

      expect(result).toEqual([]);
    });

    it('should not emit metrics for any text level', () => {
      const levels = ['note', 'warning', 'info', undefined];
      
      levels.forEach(level => {
        const fragment = new TextFragment('Some text', level);
        const result = compiler.compile(fragment, runtime);
        expect(result).toEqual([]);
      });
    });
  });

  // ============================================================================
  // 10. TimerFragmentCompiler Tests
  // ============================================================================
  
  describe('TimerFragmentCompiler', () => {
    let compiler: TimerFragmentCompiler;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      compiler = new TimerFragmentCompiler();
      runtime = createMockRuntime();
    });

    it('should have correct type identifier', () => {
      expect(compiler.type).toBe('duration');
    });

    it('should compile timer fragment in seconds', () => {
      const meta: CodeMetadata = { line: 1, startOffset: 0, endOffset: 3, columnStart: 1, columnEnd: 4, length: 3 };
      const fragment = new TimerFragment('30', meta);
      const result = compiler.compile(fragment, runtime);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'time',
        value: 30000, // 30 seconds in ms
        unit: 'ms'
      });
    });

    it('should compile timer fragment in minutes:seconds', () => {
      const meta: CodeMetadata = { line: 1, startOffset: 0, endOffset: 5, columnStart: 1, columnEnd: 6, length: 5 };
      const fragment = new TimerFragment('5:00', meta);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(300000); // 5 minutes in ms
    });

    it('should compile timer fragment in hours:minutes:seconds', () => {
      const meta: CodeMetadata = { line: 1, startOffset: 0, endOffset: 8, columnStart: 1, columnEnd: 9, length: 8 };
      const fragment = new TimerFragment('1:30:00', meta);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(5400000); // 1.5 hours in ms
    });

    it('should handle zero duration', () => {
      const meta: CodeMetadata = { line: 1, startOffset: 0, endOffset: 1, columnStart: 1, columnEnd: 2, length: 1 };
      const fragment = new TimerFragment('0', meta);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].value).toBe(0);
    });

    it('should handle complex time formats', () => {
      const testCases = [
        { input: '45', expected: 45000 },        // 45 seconds
        { input: '1:00', expected: 60000 },      // 1 minute
        { input: '12:30', expected: 750000 },    // 12.5 minutes
        { input: '1:00:00', expected: 3600000 }, // 1 hour
        { input: '2:15:30', expected: 8130000 }, // 2h 15m 30s
      ];

      testCases.forEach(({ input, expected }) => {
        const meta: CodeMetadata = { line: 1, startOffset: 0, endOffset: input.length, columnStart: 1, columnEnd: input.length + 1, length: input.length };
        const fragment = new TimerFragment(input, meta);
        const result = compiler.compile(fragment, runtime);
        
        expect(result[0].value).toBe(expected);
      });
    });

    it('should always use milliseconds as unit', () => {
      const meta: CodeMetadata = { line: 1, startOffset: 0, endOffset: 3, columnStart: 1, columnEnd: 4, length: 3 };
      const fragment = new TimerFragment('10', meta);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].unit).toBe('ms');
    });
  });

  // ============================================================================
  // 11. FragmentCompilationManager Tests
  // ============================================================================
  
  describe('FragmentCompilationManager', () => {
    let manager: FragmentCompilationManager;
    let runtime: IScriptRuntime;

    beforeEach(() => {
      const compilers = [
        new ActionFragmentCompiler(),
        new DistanceFragmentCompiler(),
        new EffortFragmentCompiler(),
        new IncrementFragmentCompiler(),
        new LapFragmentCompiler(),
        new RepFragmentCompiler(),
        new ResistanceFragmentCompiler(),
        new RoundsFragmentCompiler(),
        new TextFragmentCompiler(),
        new TimerFragmentCompiler(),
      ];
      manager = new FragmentCompilationManager(compilers);
      runtime = createMockRuntime();
    });

    describe('Compiler Registration', () => {
      it('should register all compilers', () => {
        // Create manager with all compilers
        expect(manager).toBeDefined();
      });

      it('should compile statement with effort fragment', () => {
        const statement: ICodeStatement = {
          id: 1,
          position: 0,
          fragments: [
            new RepFragment(21),
            new EffortFragment('Thrusters'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.sourceId).toBe('1');
        expect(result.effort).toBe('Thrusters');
        expect(result.values).toHaveLength(2); // rep + effort tag
      });

      it('should compile statement with multiple fragments', () => {
        const statement: ICodeStatement = {
          id: 2,
          position: 0,
          fragments: [
            new RepFragment(10),
            new ResistanceFragment(135, '#'),
            new EffortFragment('Thrusters'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.values).toHaveLength(3);
        expect(result.values).toContainEqual({ type: 'repetitions', value: 10, unit: '' });
        expect(result.values).toContainEqual({ type: 'resistance', value: 135, unit: '#' });
        expect(result.values).toContainEqual({ type: 'effort', value: undefined, unit: 'effort:Thrusters' });
      });

      it('should extract effort label from statement', () => {
        const statement: ICodeStatement = {
          id: 3,
          position: 0,
          fragments: [
            new EffortFragment('Pull-ups'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.effort).toBe('Pull-ups');
      });

      it('should combine multiple effort fragments with commas', () => {
        const statement: ICodeStatement = {
          id: 4,
          position: 0,
          fragments: [
            new EffortFragment('Thrusters'),
            new EffortFragment('Pull-ups'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.effort).toBe('Thrusters, Pull-ups');
      });

      it('should include text fragments in effort label', () => {
        const statement: ICodeStatement = {
          id: 5,
          position: 0,
          fragments: [
            new EffortFragment('Thrusters'),
            new TextFragment('then'),
            new EffortFragment('Pull-ups'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.effort).toBe('Thrusters, then, Pull-ups');
      });

      it('should handle statement with no effort fragments', () => {
        const statement: ICodeStatement = {
          id: 6,
          position: 0,
          fragments: [
            new RepFragment(50),
            new DistanceFragment(100, 'm'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.effort).toBeUndefined();
        expect(result.values).toHaveLength(2);
      });

      it('should skip fragments with no registered compiler', () => {
        const statement: ICodeStatement = {
          id: 7,
          position: 0,
          fragments: [
            new RepFragment(10),
            { type: 'unknown', fragmentType: 'unknown' as any, value: 'test' } as any,
            new EffortFragment('Squats'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        // Should compile known fragments, skip unknown
        expect(result.values.length).toBeGreaterThanOrEqual(2);
      });

      it('should handle empty statement', () => {
        const statement: ICodeStatement = {
          id: 8,
          position: 0,
          fragments: [],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.values).toEqual([]);
        expect(result.effort).toBeUndefined();
      });

      it('should convert statement ID to string for sourceId', () => {
        const statement: ICodeStatement = {
          id: 42,
          position: 0,
          fragments: [new RepFragment(10)],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.sourceId).toBe('42');
        expect(typeof result.sourceId).toBe('string');
      });
    });

    describe('Complex Compilation Scenarios', () => {
      it('should compile Fran workout statement', () => {
        // 21 Thrusters 95#
        const statement: ICodeStatement = {
          id: 100,
          position: 0,
          fragments: [
            new RepFragment(21),
            new EffortFragment('Thrusters'),
            new ResistanceFragment(95, '#'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.effort).toBe('Thrusters');
        expect(result.values).toContainEqual({ type: 'repetitions', value: 21, unit: '' });
        expect(result.values).toContainEqual({ type: 'resistance', value: 95, unit: '#' });
      });

      it('should compile distance workout statement', () => {
        // 400m Run
        const statement: ICodeStatement = {
          id: 101,
          position: 0,
          fragments: [
            new DistanceFragment(400, 'm'),
            new EffortFragment('Run'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.effort).toBe('Run');
        expect(result.values).toContainEqual({ type: 'distance', value: 400, unit: 'm' });
      });

      it('should compile timed workout statement', () => {
        // :60 AMRAP 10 Burpees
        const meta: CodeMetadata = { line: 1, startOffset: 0, endOffset: 3, columnStart: 1, columnEnd: 4, length: 3 };
        const statement: ICodeStatement = {
          id: 102,
          position: 0,
          fragments: [
            new TimerFragment('60', meta),
            new ActionFragment('AMRAP'),
            new RepFragment(10),
            new EffortFragment('Burpees'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.effort).toBe('Burpees');
        expect(result.values).toContainEqual({ type: 'time', value: 60000, unit: 'ms' });
        expect(result.values).toContainEqual({ type: 'action', value: undefined, unit: 'action:AMRAP' });
        expect(result.values).toContainEqual({ type: 'repetitions', value: 10, unit: '' });
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle fragment with string numeric value', () => {
        const fragment = new ResistanceFragment(100, 'kg');
        (fragment.value as any).amount = '150';
        
        const statement: ICodeStatement = {
          id: 200,
          position: 0,
          fragments: [fragment],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.values[0].value).toBe(150);
        expect(typeof result.values[0].value).toBe('number');
      });

      it('should handle mixed valid and empty fragments', () => {
        const statement: ICodeStatement = {
          id: 201,
          position: 0,
          fragments: [
            new RepFragment(10),
            new EffortFragment(''), // Empty - should not appear in effort
            new TextFragment('Rest'),
            new IncrementFragment('^'), // No metrics emitted
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.effort).toBe('Rest'); // Only text fragment
        expect(result.values).toHaveLength(1); // Only rep (empty effort returns no metric)
      });

      it('should preserve metric order from fragment order', () => {
        const statement: ICodeStatement = {
          id: 202,
          position: 0,
          fragments: [
            new RoundsFragment(3),
            new RepFragment(10),
            new DistanceFragment(100, 'm'),
          ],
          children: []
        };

        const result = manager.compileStatementFragments(statement, runtime);

        expect(result.values[0].type).toBe('rounds');
        expect(result.values[1].type).toBe('repetitions');
        expect(result.values[2].type).toBe('distance');
      });
    });
  });

  // ============================================================================
  // 12. MetricValue Format Validation Tests
  // ============================================================================
  
  describe('MetricValue Format Validation', () => {
    let runtime: IScriptRuntime;

    beforeEach(() => {
      runtime = createMockRuntime();
    });

    it('should validate repetitions metric format', () => {
      const compiler = new RepFragmentCompiler();
      const fragment = new RepFragment(21);
      const result = compiler.compile(fragment, runtime);

      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('unit');
      expect(result[0].type).toBe('repetitions');
    });

    it('should validate resistance metric format', () => {
      const compiler = new ResistanceFragmentCompiler();
      const fragment = new ResistanceFragment(135, '#');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].type).toBe('resistance');
      expect(typeof result[0].value).toBe('number');
      expect(typeof result[0].unit).toBe('string');
    });

    it('should validate distance metric format', () => {
      const compiler = new DistanceFragmentCompiler();
      const fragment = new DistanceFragment(400, 'm');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].type).toBe('distance');
      expect(typeof result[0].value).toBe('number');
      expect(result[0].unit).toBe('m');
    });

    it('should validate time metric format', () => {
      const compiler = new TimerFragmentCompiler();
      const meta: CodeMetadata = { line: 1, startOffset: 0, endOffset: 3, columnStart: 1, columnEnd: 4, length: 3 };
      const fragment = new TimerFragment('60', meta);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].type).toBe('time');
      expect(typeof result[0].value).toBe('number');
      expect(result[0].unit).toBe('ms');
    });

    it('should validate rounds metric format', () => {
      const compiler = new RoundsFragmentCompiler();
      const fragment = new RoundsFragment(3);
      const result = compiler.compile(fragment, runtime);

      expect(result[0].type).toBe('rounds');
      expect(typeof result[0].value).toBe('number');
      expect(result[0].unit).toBe('');
    });

    it('should validate action metric format', () => {
      const compiler = new ActionFragmentCompiler();
      const fragment = new ActionFragment('AMRAP');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].type).toBe('action');
      expect(result[0].value).toBeUndefined();
      expect(result[0].unit).toMatch(/^action:/);
    });

    it('should validate effort metric format', () => {
      const compiler = new EffortFragmentCompiler();
      const fragment = new EffortFragment('Pull-ups');
      const result = compiler.compile(fragment, runtime);

      expect(result[0].type).toBe('effort');
      expect(result[0].value).toBeUndefined();
      expect(result[0].unit).toMatch(/^effort:/);
    });

    it('should ensure all metrics are MetricValue type', () => {
      const compilers = [
        { compiler: new RepFragmentCompiler(), fragment: new RepFragment(10) },
        { compiler: new ResistanceFragmentCompiler(), fragment: new ResistanceFragment(100, 'kg') },
        { compiler: new DistanceFragmentCompiler(), fragment: new DistanceFragment(200, 'm') },
        { compiler: new RoundsFragmentCompiler(), fragment: new RoundsFragment(5) },
      ];

      compilers.forEach(({ compiler, fragment }) => {
        const result = compiler.compile(fragment as any, runtime);
        result.forEach((metric: MetricValue) => {
          expect(metric).toHaveProperty('type');
          expect(metric).toHaveProperty('value');
          expect(metric).toHaveProperty('unit');
        });
      });
    });
  });
});
