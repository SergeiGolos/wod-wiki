// Parser interface contract test for consecutive compose grouping behavior
// CRITICAL: This test MUST FAIL initially (TDD requirement)

import { describe, it, expect, beforeEach } from 'vitest';
import { MdTimerInterpreter } from './timer.visitor';
import { ICodeStatement } from '../CodeStatement';

describe('Parser Interface - Consecutive Compose Grouping Contract', () => {
  let parser: MdTimerInterpreter;

  beforeEach(() => {
    parser = new MdTimerInterpreter();
  });

  describe('consecutive compose fragments grouping behavior', () => {
    it('should group consecutive compose fragments (+) together', () => {
      // Test input with mixed lap fragments as per contracts/parser-interface.md
      const input = `parent workout
  - round child 1
  regular child 2  
  + compose child 3
  + compose child 4
  regular child 5`;
      
      // This will FAIL initially because:
      // 1. groupChildrenByLapFragments() method doesn't exist yet
      // 2. children is number[] not number[][]
      const result = parser.wodMarkdown({ text: input });
      const parent = result.find(stmt => stmt.children && stmt.children.length > 0);
      
      expect(parent).toBeDefined();
      expect(parent!.children).toEqual([[1], [2], [3, 4], [5]]);
    });

    it('should handle all compose fragments as one group', () => {
      // Test case: all consecutive compose fragments
      const input = `parent workout
  + compose child 1
  + compose child 2
  + compose child 3`;
      
      // This will FAIL initially
      const result = parser.wodMarkdown({ text: input });
      const parent = result.find(stmt => stmt.children && stmt.children.length > 0);
      
      expect(parent!.children).toEqual([[1, 2, 3]]);
    });

    it('should handle mixed round (-) and repeat (no prefix) fragments individually', () => {
      // Test case: no consecutive compose fragments
      const input = `parent workout
  - round child 1
  regular child 2
  - round child 3`;
      
      // This will FAIL initially due to interface mismatch
      const result = parser.wodMarkdown({ text: input });
      const parent = result.find(stmt => stmt.children && stmt.children.length > 0);
      
      expect(parent!.children).toEqual([[1], [2], [3]]);
    });

    it('should preserve sequential order in grouping', () => {
      // Complex test case mixing all fragment types
      const input = `parent workout
  - round child 1
  + compose child 2
  + compose child 3
  regular child 4
  + compose child 5
  - round child 6`;
      
      // This will FAIL initially
      const result = parser.wodMarkdown({ text: input });
      const parent = result.find(stmt => stmt.children && stmt.children.length > 0);
      
      // Expected: [[1], [2, 3], [4], [5], [6]]
      expect(parent!.children).toEqual([[1], [2, 3], [4], [5], [6]]);
    });
  });
});