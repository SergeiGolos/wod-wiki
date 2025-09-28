// Interface contract test for ICodeStatement children property change
// CRITICAL: This test MUST FAIL initially (TDD requirement)

import { describe, it, expect } from 'vitest';
import { ICodeStatement } from './CodeStatement';
import { CodeMetadata } from './CodeMetadata';

describe('ICodeStatement Interface Contract', () => {
  describe('children property', () => {
    it('should have children as number[][] type (grouped structure)', () => {
      // This test will FAIL initially because children is currently number[]
      // It must fail before implementation to satisfy TDD requirements
      
      const mockStatement: ICodeStatement = {
        id: 1,
        parent: undefined,
        children: [[1, 2], [3], [4, 5]], // This should be the target structure
        fragments: [],
        isLeaf: false,
        meta: {} as CodeMetadata
      };

      // Verify structure is number[][]
      expect(Array.isArray(mockStatement.children)).toBe(true);
      expect(Array.isArray(mockStatement.children[0])).toBe(true);
      expect(typeof mockStatement.children[0][0]).toBe('number');
      
      // Verify grouped structure works
      expect(mockStatement.children).toEqual([[1, 2], [3], [4, 5]]);
    });

    it('should support empty groups and single element groups', () => {
      // This test will FAIL initially - children is number[] not number[][]
      const mockStatement: ICodeStatement = {
        id: 2,
        parent: 1,
        children: [[], [1], [2, 3, 4]], // Mixed group sizes
        fragments: [],
        isLeaf: false,
        meta: {} as CodeMetadata
      };

      expect(mockStatement.children.length).toBe(3);
      expect(mockStatement.children[0]).toEqual([]);
      expect(mockStatement.children[1]).toEqual([1]);
      expect(mockStatement.children[2]).toEqual([2, 3, 4]);
    });

    it('should maintain backward compatibility for single child access', () => {
      // This test ensures migration path is clear
      // Will FAIL initially because of type mismatch
      const mockStatement: ICodeStatement = {
        id: 3,
        parent: undefined,
        children: [[5]], // Single child in group
        fragments: [],
        isLeaf: false,
        meta: {} as CodeMetadata
      };

      // Access pattern for migrated consumers
      const firstGroup = mockStatement.children[0];
      const firstChild = firstGroup[0];
      
      expect(firstChild).toBe(5);
      expect(firstGroup).toEqual([5]);
    });
  });
});