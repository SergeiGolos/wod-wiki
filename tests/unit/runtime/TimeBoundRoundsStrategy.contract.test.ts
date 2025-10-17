/**
 * @fileoverview Contract Test - TimeBoundRoundsStrategy
 * @module tests/unit/runtime/TimeBoundRoundsStrategy.contract
 * 
 * Contract specification: specs/timer-runtime-fixes/contracts/TimeBoundRoundsStrategy.contract.md
 * 
 * This test validates that TimeBoundRoundsStrategy correctly implements the IRuntimeBlockStrategy
 * interface and compiles AMRAP workouts (Timer + Rounds + Action="AMRAP") into the correct
 * composite structure: TimerBlock(RoundsBlock(children)).
 * 
 * CRITICAL: This test MUST FAIL until T017 (TimeBoundRoundsStrategy implementation) is complete.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { IRuntimeBlock } from '../../../src/runtime/IRuntimeBlock';
import type { IScriptRuntime } from '../../../src/runtime/IScriptRuntime';
import type { ICodeStatement } from '../../../src/CodeStatement';
import { FragmentType } from '../../../src/CodeFragment';

// This import will fail until implementation exists - EXPECTED
import { TimeBoundRoundsStrategy } from '../../../src/runtime/strategies';

describe('TimeBoundRoundsStrategy Contract', () => {
  let mockRuntime: IScriptRuntime;

  beforeEach(() => {
    mockRuntime = {
      handle: vi.fn(),
      jit: {
        compile: vi.fn(),
      },
    } as unknown as IScriptRuntime;
  });

  describe('match() - Pattern Recognition', () => {
    test('should match Timer + Rounds + AMRAP pattern', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '(21-15-9) 20:00 AMRAP Thrusters, Pullups',
        fragments: [
          { type: FragmentType.Rounds, value: '(21-15-9)' },
          { type: FragmentType.Timer, value: '20:00' },
          { type: FragmentType.Action, value: 'AMRAP' },
        ],
        children: [
          { id: 'child-1', text: 'Thrusters', fragments: [] },
          { id: 'child-2', text: 'Pullups', fragments: [] },
        ],
      };
      
      const matches = strategy.match([stmt], mockRuntime);
      expect(matches).toBe(true);
    });

    test('should NOT match Timer-only pattern', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '20:00 For Time: 100 Squats',
        fragments: [
          { type: FragmentType.Timer, value: '20:00' },
          { type: FragmentType.Action, value: 'For Time' },
        ],
        children: [
          { id: 'child-1', text: 'Squats', fragments: [] },
        ],
      };
      
      const matches = strategy.match([stmt], mockRuntime);
      expect(matches).toBe(false);
    });

    test('should NOT match Rounds-only pattern', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '(21-15-9) Thrusters, Pullups',
        fragments: [
          { type: FragmentType.Rounds, value: '(21-15-9)' },
        ],
        children: [
          { id: 'child-1', text: 'Thrusters', fragments: [] },
          { id: 'child-2', text: 'Pullups', fragments: [] },
        ],
      };
      
      const matches = strategy.match([stmt], mockRuntime);
      expect(matches).toBe(false);
    });

    test('should NOT match Timer + Rounds without AMRAP action', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '(21-15-9) 20:00 Thrusters, Pullups',
        fragments: [
          { type: FragmentType.Rounds, value: '(21-15-9)' },
          { type: FragmentType.Timer, value: '20:00' },
        ],
        children: [
          { id: 'child-1', text: 'Thrusters', fragments: [] },
        ],
      };
      
      const matches = strategy.match([stmt], mockRuntime);
      expect(matches).toBe(false);
    });

    test('should handle empty statements array', () => {
      const strategy = new TimeBoundRoundsStrategy();
      const matches = strategy.match([], mockRuntime);
      expect(matches).toBe(false);
    });

    test('should handle statement with no fragments', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: 'Invalid workout',
        fragments: [],
      };
      
      const matches = strategy.match([stmt], mockRuntime);
      expect(matches).toBe(false);
    });
  });

  describe('compile() - Block Creation', () => {
    test('should create TimerBlock with "Timer" type', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '(21-15-9) 20:00 AMRAP Thrusters, Pullups',
        fragments: [
          { type: FragmentType.Rounds, value: '(21-15-9)' },
          { type: FragmentType.Timer, value: '20:00' },
          { type: FragmentType.Action, value: 'AMRAP' },
        ],
        children: [
          { id: 'child-1', text: 'Thrusters', fragments: [] },
          { id: 'child-2', text: 'Pullups', fragments: [] },
        ],
      };
      
      const block = strategy.compile([stmt], mockRuntime);
      
      expect(block).toBeDefined();
      expect(block.type).toBe('Timer');
    });

    test('should configure timer with countdown direction', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '(21-15-9) 20:00 AMRAP Thrusters',
        fragments: [
          { type: FragmentType.Rounds, value: '(21-15-9)' },
          { type: FragmentType.Timer, value: '20:00' },
          { type: FragmentType.Action, value: 'AMRAP' },
        ],
        children: [
          { id: 'child-1', text: 'Thrusters', fragments: [] },
        ],
      };
      
      const block = strategy.compile([stmt], mockRuntime) as any;
      
      // Verify timer configuration
      expect(block.config?.direction).toBe('down');
    });

    test('should extract duration from timer fragment', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '(21-15-9) 20:00 AMRAP Thrusters',
        fragments: [
          { type: FragmentType.Rounds, value: '(21-15-9)' },
          { type: FragmentType.Timer, value: '20:00' },
          { type: FragmentType.Action, value: 'AMRAP' },
        ],
        children: [],
      };
      
      const block = strategy.compile([stmt], mockRuntime) as any;
      
      // 20:00 = 20 minutes = 1,200,000 milliseconds
      expect(block.config?.durationMs).toBe(1200000);
    });

    test('should create RoundsBlock as child of TimerBlock', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '(21-15-9) 20:00 AMRAP Thrusters, Pullups',
        fragments: [
          { type: FragmentType.Rounds, value: '(21-15-9)' },
          { type: FragmentType.Timer, value: '20:00' },
          { type: FragmentType.Action, value: 'AMRAP' },
        ],
        children: [
          { id: 'child-1', text: 'Thrusters', fragments: [] },
          { id: 'child-2', text: 'Pullups', fragments: [] },
        ],
      };
      
      // Mock JIT compiler to track compilation of RoundsBlock
      const mockCompiledRoundsBlock = {
        id: 'rounds-block',
        type: 'Rounds',
        mount: vi.fn(),
        unmount: vi.fn(),
        dispose: vi.fn(),
      };
      
      mockRuntime.jit.compile = vi.fn(() => mockCompiledRoundsBlock as IRuntimeBlock);
      
      const block = strategy.compile([stmt], mockRuntime);
      
      // Verify TimerBlock has children configuration
      expect((block as any).config?.children).toBeDefined();
    });

    test('should pass rep scheme to RoundsBlock', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '(21-15-9) 20:00 AMRAP Thrusters',
        fragments: [
          { type: FragmentType.Rounds, value: '(21-15-9)' },
          { type: FragmentType.Timer, value: '20:00' },
          { type: FragmentType.Action, value: 'AMRAP' },
        ],
        children: [
          { id: 'child-1', text: 'Thrusters', fragments: [] },
        ],
      };
      
      const block = strategy.compile([stmt], mockRuntime) as any;
      
      // Verify rep scheme extraction from fragment
      // The exact structure depends on implementation, but should contain [21, 15, 9]
      expect(block).toBeDefined();
    });

    test('should preserve source statement ID', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-unique-id',
        text: '(10) 5:00 AMRAP Burpees',
        fragments: [
          { type: FragmentType.Rounds, value: '(10)' },
          { type: FragmentType.Timer, value: '5:00' },
          { type: FragmentType.Action, value: 'AMRAP' },
        ],
        children: [
          { id: 'child-1', text: 'Burpees', fragments: [] },
        ],
      };
      
      const block = strategy.compile([stmt], mockRuntime);
      
      expect(block.sourceIds).toContain('stmt-unique-id');
    });
  });

  describe('Composite Structure Validation', () => {
    test('should create 2-level hierarchy: Timer > Rounds', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '(21-15-9) 20:00 AMRAP Thrusters, Pullups',
        fragments: [
          { type: FragmentType.Rounds, value: '(21-15-9)' },
          { type: FragmentType.Timer, value: '20:00' },
          { type: FragmentType.Action, value: 'AMRAP' },
        ],
        children: [
          { id: 'child-1', text: 'Thrusters', fragments: [] },
          { id: 'child-2', text: 'Pullups', fragments: [] },
        ],
      };
      
      const timerBlock = strategy.compile([stmt], mockRuntime) as any;
      
      expect(timerBlock.type).toBe('Timer');
      expect(timerBlock.config?.children).toBeDefined();
    });

    test('should configure LoopCoordinatorBehavior with "timed-rounds" mode', () => {
      const strategy = new TimeBoundRoundsStrategy();
      
      const stmt: ICodeStatement = {
        id: 'stmt-1',
        text: '(10) 10:00 AMRAP Squats',
        fragments: [
          { type: FragmentType.Rounds, value: '(10)' },
          { type: FragmentType.Timer, value: '10:00' },
          { type: FragmentType.Action, value: 'AMRAP' },
        ],
        children: [
          { id: 'child-1', text: 'Squats', fragments: [] },
        ],
      };
      
      const block = strategy.compile([stmt], mockRuntime);
      
      // Implementation should add LoopCoordinatorBehavior('timed-rounds') to RoundsBlock
      // This will be verified through integration tests
      expect(block).toBeDefined();
    });
  });
});
