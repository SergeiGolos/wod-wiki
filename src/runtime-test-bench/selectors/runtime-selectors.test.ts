/**
 * RuntimeSelectors Unit Tests
 * 
 * Tests selector methods for transforming ScriptRuntime state into UI-friendly structures.
 * 
 * Test Strategy:
 * - Focus on data transformation logic (blocks, memory, status)
 * - Mock minimal ScriptRuntime structure needed for each selector
 * - Verify correct mapping of types, labels, colors, icons
 * - Test edge cases (empty stack, undefined values)
 */

import { describe, it, expect } from 'bun:test';
import { RuntimeSelectors, runtimeSelectors } from './runtime-selectors';
import type { ScriptRuntime } from '../../runtime/ScriptRuntime';
import type { IRuntimeBlock } from '../../runtime/contracts/IRuntimeBlock';
import type { IMemoryReference } from '../../runtime/contracts/IMemoryReference';

describe('RuntimeSelectors', () => {
  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(runtimeSelectors).toBeInstanceOf(RuntimeSelectors);
    });

    it('should return same instance on multiple accesses', () => {
      const instance1 = runtimeSelectors;
      const instance2 = runtimeSelectors;
      expect(instance1).toBe(instance2);
    });
  });

  describe('selectBlocks()', () => {
    it('should return empty array when stack is empty', () => {
      const mockRuntime = createMockRuntime([]);
      const blocks = runtimeSelectors.selectBlocks(mockRuntime);
      expect(blocks).toEqual([]);
    });

    it('should transform single block into RuntimeStackBlock', () => {
      const mockBlock: IRuntimeBlock = {
        key: 'block-1',
        blockType: 'workout',
        sourceIds: [1, 2, 3]
      };

      const mockRuntime = createMockRuntime([mockBlock]);
      const blocks = runtimeSelectors.selectBlocks(mockRuntime);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        key: 'block-1',
        blockType: 'workout',
        label: 'Workout Block',
        color: '#3B82F6',
        icon: '🏋️',
        isActive: true,
        status: 'active',
        depth: 0,
        lineNumber: 1
      });
    });

    it('should mark only the last block as active', () => {
      const mockBlocks: IRuntimeBlock[] = [
        { key: 'block-1', blockType: 'workout', sourceIds: [1] },
        { key: 'block-2', blockType: 'timer', sourceIds: [2] },
        { key: 'block-3', blockType: 'exercise', sourceIds: [3] }
      ];

      const mockRuntime = createMockRuntime(mockBlocks);
      const blocks = runtimeSelectors.selectBlocks(mockRuntime);

      expect(blocks[0].isActive).toBe(false);
      expect(blocks[1].isActive).toBe(false);
      expect(blocks[2].isActive).toBe(true);
    });

    it('should assign parent keys correctly', () => {
      const mockBlocks: IRuntimeBlock[] = [
        { key: 'block-1', blockType: 'workout', sourceIds: [1] },
        { key: 'block-2', blockType: 'timer', sourceIds: [2] },
        { key: 'block-3', blockType: 'exercise', sourceIds: [3] }
      ];

      const mockRuntime = createMockRuntime(mockBlocks);
      const blocks = runtimeSelectors.selectBlocks(mockRuntime);

      expect(blocks[0].parentKey).toBeUndefined();
      expect(blocks[1].parentKey).toBe('block-1');
      expect(blocks[2].parentKey).toBe('block-2');
    });

    it('should map all block types correctly', () => {
      const blockTypes: Array<[string, string, string]> = [
        ['workout', '#3B82F6', '🏋️'],
        ['timer', '#F59E0B', '⏱️'],
        ['rounds', '#8B5CF6', '🔄'],
        ['exercise', '#06B6D4', '💪'],
        ['group', '#10B981', undefined],
        ['effort', '#EF4444', undefined],
        ['unknown', '#6B7280', undefined]
      ];

      for (const [type, expectedColor, expectedIcon] of blockTypes) {
        const mockBlock: IRuntimeBlock = {
          key: `block-${type}`,
          blockType: type,
          sourceIds: []
        };

        const mockRuntime = createMockRuntime([mockBlock]);
        const blocks = runtimeSelectors.selectBlocks(mockRuntime);

        expect(blocks[0].color).toBe(expectedColor);
        expect(blocks[0].icon).toBe(expectedIcon);
      }
    });
  });

  describe('selectMemory()', () => {
    it('should return empty array when memory is empty', () => {
      const mockRuntime = createMockRuntimeWithMemory([]);
      const memory = runtimeSelectors.selectMemory(mockRuntime);
      expect(memory).toEqual([]);
    });

    it('should transform single memory reference into MemoryEntry', () => {
      const mockRef: IMemoryReference = {
        id: 'mem-1',
        ownerId: 'owner-1',
        type: 'metric',
        value: () => 42,
        visibility: 'public'
      };

      const mockRuntime = createMockRuntimeWithMemory([mockRef]);
      const memory = runtimeSelectors.selectMemory(mockRuntime);

      expect(memory).toHaveLength(1);
      expect(memory[0]).toMatchObject({
        id: 'mem-1',
        ownerId: 'owner-1',
        type: 'metric',
        value: 42,
        valueFormatted: '42',
        label: 'metric: mem-1',
        icon: '📊',
        isValid: true,
        isHighlighted: false
      });
    });

    it('should format different value types correctly', () => {
      const testCases: Array<[any, string]> = [
        [undefined, 'undefined'],
        [null, 'undefined'],
        ['hello', '"hello"'],
        [42, '42'],
        [true, 'true'],
        [[1, 2, 3], 'Array(3)'],
        [{ a: 1, b: 2 }, '{2 properties}']
      ];

      for (const [value, expectedFormatted] of testCases) {
        const mockRef: IMemoryReference = {
          id: 'mem-test',
          ownerId: 'owner-test',
          type: 'metric',
          value: () => value,
          visibility: 'public'
        };

        const mockRuntime = createMockRuntimeWithMemory([mockRef]);
        const memory = runtimeSelectors.selectMemory(mockRuntime);

        expect(memory[0].valueFormatted).toBe(expectedFormatted);
      }
    });

    it('should map memory types correctly', () => {
      const typeTests: Array<[string, string, string]> = [
        ['metric', 'metric', '📊'],
        ['MetricValue', 'metric', '📊'],
        ['timer-state', 'timer-state', '⏱️'],
        ['TimerState', 'timer-state', '⏱️'],
        ['loop-state', 'loop-state', '🔄'],
        ['group-state', 'group-state', '📁'],
        ['handler', 'handler', '⚙️'],
        ['span', 'span', '📏'],
        ['unknown-type', 'unknown', '❓']
      ];

      for (const [inputType, expectedType, expectedIcon] of typeTests) {
        const mockRef: IMemoryReference = {
          id: 'mem-test',
          ownerId: 'owner-test',
          type: inputType,
          value: () => 0,
          visibility: 'public'
        };

        const mockRuntime = createMockRuntimeWithMemory([mockRef]);
        const memory = runtimeSelectors.selectMemory(mockRuntime);

        expect(memory[0].type).toBe(expectedType);
        expect(memory[0].icon).toBe(expectedIcon);
      }
    });

    it('should mark memory as invalid when value is undefined', () => {
      const mockRef: IMemoryReference = {
        id: 'mem-invalid',
        ownerId: 'owner-test',
        type: 'metric',
        value: () => undefined,
        visibility: 'public'
      };

      const mockRuntime = createMockRuntimeWithMemory([mockRef]);
      const memory = runtimeSelectors.selectMemory(mockRuntime);

      expect(memory[0].isValid).toBe(false);
    });
  });

  describe('selectStatus()', () => {
    it('should return "idle" when stack is empty', () => {
      const mockRuntime = createMockRuntime([]);
      const status = runtimeSelectors.selectStatus(mockRuntime);
      expect(status).toBe('idle');
    });

    it('should return "executing" when stack has blocks', () => {
      const mockBlock: IRuntimeBlock = {
        key: 'block-1',
        blockType: 'workout',
        sourceIds: [1]
      };

      const mockRuntime = createMockRuntime([mockBlock]);
      const status = runtimeSelectors.selectStatus(mockRuntime);
      expect(status).toBe('executing');
    });

    it('should return "executing" when stack has multiple blocks', () => {
      const mockBlocks: IRuntimeBlock[] = [
        { key: 'block-1', blockType: 'workout', sourceIds: [1] },
        { key: 'block-2', blockType: 'timer', sourceIds: [2] }
      ];

      const mockRuntime = createMockRuntime(mockBlocks);
      const status = runtimeSelectors.selectStatus(mockRuntime);
      expect(status).toBe('executing');
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a minimal mock ScriptRuntime for testing selectBlocks() and selectStatus()
 */
function createMockRuntime(blocks: IRuntimeBlock[]): ScriptRuntime {
  return {
    stack: {
      blocks: blocks as readonly IRuntimeBlock[]
    }
  } as unknown as ScriptRuntime;
}

/**
 * Creates a minimal mock ScriptRuntime for testing selectMemory()
 * Memory is now accessed via block.context.references (stack-based memory)
 */
function createMockRuntimeWithMemory(memoryRefs: IMemoryReference[]): ScriptRuntime {
  // Create a mock block with the memory references attached
  const mockBlock = {
    key: 'mock-block',
    blockType: 'workout',
    sourceIds: [],
    context: {
      references: memoryRefs
    }
  };
  
  return {
    stack: {
      blocks: [mockBlock] as readonly IRuntimeBlock[]
    }
  } as unknown as ScriptRuntime;
}
