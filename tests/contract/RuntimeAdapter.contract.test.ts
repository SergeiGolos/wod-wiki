import { describe, test, expect, vi } from 'vitest';
import { RuntimeAdapter } from '../../../src/runtime-test-bench/adapters/RuntimeAdapter';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import type { ExecutionSnapshot, RuntimeStackBlock, MemoryEntry } from '../../../src/runtime-test-bench/types/interfaces';

// Mock factories for test data
const createEmptyRuntime = (): ScriptRuntime => {
  // Create a mock ScriptRuntime for testing
  const mockRuntime = {
    stack: {
      blocks: []
    },
    memory: {
      search: vi.fn().mockReturnValue([])
    }
  } as any;
  return mockRuntime;
};

const mockWorkoutBlock = () => ({
  key: 'workout-1',
  blockType: 'workout' as const,
  label: 'Workout',
  color: '#3b82f6',
  isActive: true,
  isComplete: false,
  status: 'active' as const,
  children: [] as string[],
  depth: 0,
  sourceIds: [1]
});

const mockGroupBlock = () => ({
  key: 'group-1',
  blockType: 'group' as const,
  label: 'Group',
  color: '#10b981',
  isActive: false,
  isComplete: false,
  status: 'pending' as const,
  children: [] as string[],
  depth: 1,
  sourceIds: [2]
});

const mockExerciseBlock = () => ({
  key: 'exercise-1',
  blockType: 'exercise' as const,
  label: 'Pull-ups x 10',
  color: '#f59e0b',
  isActive: false,
  isComplete: false,
  status: 'pending' as const,
  children: [] as string[],
  depth: 2,
  sourceIds: [3]
});

const createRuntimeWithBlocks = (blocks: any[]): ScriptRuntime => {
  const runtime = new ScriptRuntime();
  // Mock the stack property
  (runtime as any).stack = blocks;
  return runtime;
};

const createNestedRuntime = (): ScriptRuntime => {
  const workout = mockWorkoutBlock();
  const group = { ...mockGroupBlock(), parentKey: workout.key };
  const exercise = { ...mockExerciseBlock(), parentKey: group.key };

  workout.children = [group.key];
  group.children = [exercise.key];

  return createRuntimeWithBlocks([workout, group, exercise]);
};

const createRuntimeWithMemory = (): ScriptRuntime => {
  const runtime = new ScriptRuntime();
  // Mock memory with 5 entries
  (runtime as any).memory = {
    search: vi.fn().mockReturnValue([
      { id: '1', type: 'metric', value: 10 },
      { id: '2', type: 'timer-state', value: 300 },
      { id: '3', type: 'loop-state', value: 2 },
      { id: '4', type: 'group-state', value: {} },
      { id: '5', type: 'handler', value: () => {} }
    ])
  };
  return runtime;
};

const mockMemoryEntry = (id: string, ownerId: string, type: string = 'metric'): MemoryEntry => ({
  id,
  ownerId,
  type: type as any,
  value: 10,
  valueFormatted: '10',
  label: `Entry ${id}`,
  isValid: true,
  isHighlighted: false
});

const createLargeRuntime = (blockCount: number, memoryCount: number): ScriptRuntime => {
  const runtime = new ScriptRuntime();

  // Create blocks
  const blocks = [];
  for (let i = 0; i < blockCount; i++) {
    blocks.push({
      key: `block-${i}`,
      blockType: 'workout' as const,
      label: `Block ${i}`,
      color: '#3b82f6',
      isActive: i === 0,
      isComplete: false,
      status: 'pending' as const,
      children: [] as string[],
      depth: 0,
      sourceIds: [i + 1]
    });
  }
  (runtime as any).stack = blocks;

  // Create memory entries
  const memoryEntries = [];
  for (let i = 0; i < memoryCount; i++) {
    memoryEntries.push({
      id: `mem-${i}`,
      type: 'metric',
      value: i,
      ownerId: `block-${i % blockCount}`
    });
  }
  (runtime as any).memory = {
    search: vi.fn().mockReturnValue(memoryEntries)
  };

  return runtime;
};

const mockRuntimeStackBlock = (): RuntimeStackBlock => ({
  key: 'mock-block',
  blockType: 'workout',
  label: 'Mock Block',
  color: '#3b82f6',
  isActive: false,
  isComplete: false,
  status: 'pending',
  children: [],
  depth: 0,
  sourceIds: [1]
});

describe('RuntimeAdapter Contract Tests', () => {
  test('createSnapshot with empty runtime', () => {
    const runtime = createEmptyRuntime();
    const adapter = new RuntimeAdapter();

    const snapshot = adapter.createSnapshot(runtime);

    expect(snapshot.stack.blocks).toEqual([]);
    expect(snapshot.stack.activeIndex).toBe(0);
    expect(snapshot.memory.entries).toEqual([]);
    expect(snapshot.status).toBe('idle');
  });

  test('createSnapshot with active runtime', () => {
    const runtime = createRuntimeWithBlocks([
      mockWorkoutBlock(),
      mockGroupBlock(),
      mockExerciseBlock()
    ]);
    const adapter = new RuntimeAdapter();

    const snapshot = adapter.createSnapshot(runtime);

    expect(snapshot.stack.blocks).toHaveLength(3);
    expect(snapshot.stack.blocks[0].depth).toBe(0);
    expect(snapshot.stack.blocks[1].depth).toBe(1);
    expect(snapshot.stack.blocks[1].parentKey).toBe(snapshot.stack.blocks[0].key);
  });

  test('extractStackBlocks preserves hierarchy', () => {
    const runtime = createNestedRuntime();
    const adapter = new RuntimeAdapter();

    const blocks = adapter.extractStackBlocks(runtime);

    const workout = blocks.find((b: any) => b.blockType === 'workout');
    const group = blocks.find((b: any) => b.blockType === 'group');
    const exercise = blocks.find((b: any) => b.blockType === 'exercise');

    expect(workout.children).toContain(group.key);
    expect(group.parentKey).toBe(workout.key);
    expect(exercise.parentKey).toBe(group.key);
  });

  test('extractMemoryEntries maps runtime memory', () => {
    const runtime = createRuntimeWithMemory();
    const adapter = new RuntimeAdapter();

    const entries = adapter.extractMemoryEntries(runtime);

    expect(entries).toHaveLength(5);
    entries.forEach((entry: any) => {
      expect(entry.id).toBeDefined();
      expect(entry.ownerId).toBeDefined();
      expect(entry.type).toBeDefined();
      expect(entry.valueFormatted).toBeDefined();
    });
  });

  test('groupMemoryEntries by owner', () => {
    const entries = [
      mockMemoryEntry('1', 'owner-A'),
      mockMemoryEntry('2', 'owner-A'),
      mockMemoryEntry('3', 'owner-B'),
      mockMemoryEntry('4', 'owner-B'),
      mockMemoryEntry('5', 'owner-C'),
      mockMemoryEntry('6', 'owner-C'),
    ];
    const adapter = new RuntimeAdapter();

    const grouped = adapter.groupMemoryEntries(entries, 'owner');

    expect(grouped.size).toBe(3);
    expect(grouped.get('owner-A')).toHaveLength(2);
    expect(grouped.get('owner-B')).toHaveLength(2);
    expect(grouped.get('owner-C')).toHaveLength(2);
  });

  test('groupMemoryEntries by type', () => {
    const entries = [
      mockMemoryEntry('1', 'owner-A', 'metric'),
      mockMemoryEntry('2', 'owner-B', 'metric'),
      mockMemoryEntry('3', 'owner-A', 'timer-state'),
      mockMemoryEntry('4', 'owner-B', 'timer-state'),
    ];
    const adapter = new RuntimeAdapter();

    const grouped = adapter.groupMemoryEntries(entries, 'type');

    expect(grouped.size).toBe(2);
    expect(grouped.get('metric')).toHaveLength(2);
    expect(grouped.get('timer-state')).toHaveLength(2);
  });

  test('Performance - snapshot creation <10ms', () => {
    const runtime = createLargeRuntime(50, 100);
    const adapter = new RuntimeAdapter();

    const start = performance.now();
    const snapshot = adapter.createSnapshot(runtime);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
    expect(snapshot.stack.blocks).toHaveLength(50);
    expect(snapshot.memory.entries).toHaveLength(100);
  });

  test('Immutability - snapshot modification doesnt affect runtime', () => {
    const runtime = createRuntimeWithBlocks([mockWorkoutBlock()]);
    const adapter = new RuntimeAdapter();

    const snapshot = adapter.createSnapshot(runtime);
    const originalStackLength = runtime.stack.length;

    // Attempt to modify snapshot
    snapshot.stack.blocks.push(mockRuntimeStackBlock());

    // Runtime unchanged
    expect(runtime.stack.length).toBe(originalStackLength);
  });
});