// Integration test for mixed lap fragments end-to-end parsing with grouping validation
// CRITICAL: This test MUST FAIL initially (TDD requirement)

import { describe, it, expect, beforeEach } from 'vitest';
import { MdTimerRuntime } from './md-timer';

describe('MdTimerInterpreter - Integration Test for Grouping', () => {
  let runtime: MdTimerRuntime;

  beforeEach(() => {
    runtime = new MdTimerRuntime();
  });

  describe('end-to-end parsing with grouping validation', () => {
    it('should parse and group complex workout with mixed lap fragments', () => {
      // Complex workout from quickstart.md test scenario
      const workoutInput = `parent workout
  - round child 1 [3:00]
  regular child 2 10x burpees  
  + compose child 3 moderate effort
  + compose child 4 high intensity
  regular child 5 rest [1:00]
  + final compose child 6 cool down`;

      // This will FAIL initially because:
      // 1. groupChildrenByLapFragments method doesn't exist
      // 2. children interface is number[] not number[][]
      // 3. Grouping logic not implemented in wodMarkdown()
      const result = runtime.read(workoutInput);
      const parentStatement = result.statements.find(stmt => 
        stmt.fragments?.some(f => f.value?.includes('parent workout'))
      );

      expect(parentStatement).toBeDefined();
      
      // Expected grouping: [[2], [3], [4, 5], [6], [7]]
      // - child 1 on line 2 (round '-') → individual group [2]
      // - child 2 on line 3 (regular/repeat) → individual group [3]  
      // - child 3, 4 on lines 4-5 (consecutive '+') → grouped [4, 5]
      // - child 5 on line 6 (regular/repeat) → individual group [6]
      // - child 6 on line 7 ('+' but not consecutive) → individual group [7]
      expect(parentStatement!.children).toEqual([[2], [3], [4, 5], [6], [7]]);
    });

    it('should handle workout with only compose fragments', () => {
      const allComposeInput = `workout
  + child 1 push ups
  + child 2 pull ups  
  + child 3 sit ups
  + child 4 squats`;

      // This will FAIL initially
      const result = runtime.read(allComposeInput);
      const parentStatement = result.statements.find(stmt => stmt.children && stmt.children.length > 0);

      expect(parentStatement).toBeDefined();
      // All consecutive compose should be in one group (lines 2-5)
      expect(parentStatement!.children).toEqual([[2, 3, 4, 5]]);
    });

    it('should handle workout with no compose fragments', () => {
      const noComposeInput = `workout
  - round 1 [5:00]
  round 2 10x burpees
  - round 3 [2:00] rest`;

      // This will FAIL initially
      const result = runtime.read(noComposeInput);
      const parentStatement = result.statements.find(stmt => stmt.children && stmt.children.length > 0);

      expect(parentStatement).toBeDefined();
      // All individual groups (lines 2, 3, 4)
      expect(parentStatement!.children).toEqual([[2], [3], [4]]);
    });

    it('should maintain parent-child relationships while grouping', () => {
      const nestedInput = `parent
  - round 1
    + nested compose 1
    + nested compose 2
  regular 2`;

      // This will FAIL initially - complex hierarchy with grouping
      const result = runtime.read(nestedInput);
      const parentStatement = result.statements.find(stmt => 
        stmt.fragments?.some(f => f.value?.includes('parent'))
      );
      
      expect(parentStatement).toBeDefined();
      expect(parentStatement!.children).toEqual([[2], [5]]);
      
      // Check that round 1 (line 2) has its own children grouped
      const roundStatement = result.statements.find(stmt => stmt.id === 2);
      expect(roundStatement!.children).toEqual([[3, 4]]); // nested compose fragments grouped on lines 3-4
    });
  });
});