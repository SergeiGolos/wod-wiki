// Grouping algorithm unit tests for groupChildrenByLapFragments() method
// CRITICAL: These tests MUST FAIL initially (TDD requirement)

import { describe, it, expect, beforeEach } from 'vitest';
import { MdTimerInterpreter } from './timer.visitor';
import { ICodeStatement } from '../CodeStatement';
import { CodeMetadata } from '../CodeMetadata';
import { LapFragment } from '../fragments/LapFragment';

describe('MdTimerInterpreter - Grouping Algorithm Unit Tests', () => {
  let visitor: MdTimerInterpreter;

  beforeEach(() => {
    visitor = new MdTimerInterpreter();
  });
  
  describe('groupChildrenByLapFragments() method', () => {
    it('should exist as a method', () => {
      // This test will FAIL initially until method is implemented
      expect(typeof visitor.groupChildrenByLapFragments).toBe('function');
    });

    it('should return empty array for empty input', () => {
      // This test will FAIL initially - method doesn't exist
      const result = visitor.groupChildrenByLapFragments([], []);
      expect(result).toEqual([]);
    });

    it('should group consecutive compose fragments together', () => {
      // Test case per contracts/visitor-grouping.md
      // Input: [round, repeat, compose, compose, repeat] 
      // Expected: [[1], [2], [3, 4], [5]]
      
      const mockStatements: ICodeStatement[] = [
        { id: 0, children: [], fragments: [], meta: {} as CodeMetadata }, // parent
        { 
          id: 1, 
          children: [], 
          fragments: [new LapFragment('round', '-', {} as CodeMetadata)], 
          meta: {} as CodeMetadata 
        },
        { 
          id: 2, 
          children: [], 
          fragments: [new LapFragment('repeat', '', {} as CodeMetadata)], 
          meta: {} as CodeMetadata 
        },
        { 
          id: 3, 
          children: [], 
          fragments: [new LapFragment('compose', '+', {} as CodeMetadata)], 
          meta: {} as CodeMetadata 
        },
        { 
          id: 4, 
          children: [], 
          fragments: [new LapFragment('compose', '+', {} as CodeMetadata)], 
          meta: {} as CodeMetadata 
        },
        { 
          id: 5, 
          children: [], 
          fragments: [new LapFragment('repeat', '', {} as CodeMetadata)], 
          meta: {} as CodeMetadata 
        }
      ];
      
      // This test will FAIL initially - method doesn't exist
      const childIds = [1, 2, 3, 4, 5];
      const result = visitor.groupChildrenByLapFragments(childIds, mockStatements);
      
      expect(result).toEqual([[1], [2], [3, 4], [5]]);
    });

    it('should handle all compose fragments as single group', () => {
      // Test case: all consecutive compose
      const mockStatements: ICodeStatement[] = [
        { id: 0, children: [], fragments: [], meta: {} as CodeMetadata },
        { 
          id: 1, 
          children: [], 
          fragments: [new LapFragment('compose', '+', {} as CodeMetadata)], 
          meta: {} as CodeMetadata 
        },
        { 
          id: 2, 
          children: [], 
          fragments: [new LapFragment('compose', '+', {} as CodeMetadata)], 
          meta: {} as CodeMetadata 
        },
        { 
          id: 3, 
          children: [], 
          fragments: [new LapFragment('compose', '+', {} as CodeMetadata)], 
          meta: {} as CodeMetadata 
        }
      ];
      
      // This will FAIL initially
      const childIds = [1, 2, 3];
      const result = visitor.groupChildrenByLapFragments(childIds, mockStatements);
      
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should handle no compose fragments as individual groups', () => {
      // Test case: no compose fragments
      const mockStatements: ICodeStatement[] = [
        { id: 0, children: [], fragments: [], meta: {} as CodeMetadata },
        { 
          id: 1, 
          children: [], 
          fragments: [new LapFragment('round', '-', {} as CodeMetadata)], 
          meta: {} as CodeMetadata 
        },
        { 
          id: 2, 
          children: [], 
          fragments: [new LapFragment('repeat', '', {} as CodeMetadata)], 
          meta: {} as CodeMetadata 
        }
      ];
      
      // This will FAIL initially
      const childIds = [1, 2];
      const result = visitor.groupChildrenByLapFragments(childIds, mockStatements);
      
      expect(result).toEqual([[1], [2]]);
    });
  });
});