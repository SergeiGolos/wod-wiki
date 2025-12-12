import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { RoundsBlock } from '../../src/runtime/blocks/RoundsBlock';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { JitCompiler } from '../../src/runtime/JitCompiler';
import { WodScript } from '../../src/WodScript';
import { BlockKey } from '../../src/BlockKey';
import { ICodeStatement } from '../../src/CodeStatement';
import { FragmentType } from '../../src/CodeFragment';
import { MemoryTypeEnum } from '../../src/runtime/MemoryTypeEnum';

describe('RoundsBlock - Metric Inheritance', () => {
  let runtime: ScriptRuntime;
  let mockScript: WodScript;

  beforeEach(() => {
    // Create child statement (Push-ups without explicit reps)
    const childStatement: ICodeStatement = {
      id: 1,
      fragments: [
        { fragmentType: FragmentType.Effort, value: undefined, type: 'effort' }
      ],
      children: [],
      meta: {}
    };

    // Create mock script with proper ID resolution
    mockScript = new WodScript('mock source', [childStatement], []);
    const jitCompiler = new JitCompiler([]);
    runtime = new ScriptRuntime(mockScript, jitCompiler);
  });

  it('should allocate public METRIC_REPS when rep scheme is configured', () => {
    // Create RoundsBlock with rep scheme [21, 15, 9]
    // Pass child IDs as number[][] format
    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [[1]] // Single group containing statement ID 1
    });

    // Search for public METRIC_REPS in memory
    const publicRepsRefs = runtime.memory.search({
      type: MemoryTypeEnum.METRIC_REPS,
      visibility: 'public',
      id: null,
      ownerId: null
    });

    // Verify metric was allocated
    expect(publicRepsRefs.length).toBeGreaterThan(0);

    // Verify initial value is 21 (first round)
    const repsValue = runtime.memory.get(publicRepsRefs[0] as any);
    expect(repsValue).toBe(21);
  });

  it('should update public METRIC_REPS when rounds advance', () => {
    // Child statement already created in beforeEach
    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [[1]] // Single group containing statement ID 1
    });

    // Get the metric reference
    const publicRepsRefs = runtime.memory.search({
      type: MemoryTypeEnum.METRIC_REPS,
      visibility: 'public',
      id: null,
      ownerId: null
    });

    expect(publicRepsRefs.length).toBe(1);
    const repsRef = publicRepsRefs[0];

    // Initial value should be 21
    expect(runtime.memory.get(repsRef as any)).toBe(21);

    // Push block to stack and mount
    runtime.stack.push(roundsBlock);
    const mountActions = roundsBlock.mount(runtime);
    
    // Execute mount actions (pushes first child)
    for (const action of mountActions) {
      action.do(runtime);
    }

    // Pop first child
    runtime.stack.pop();

    // Call next() to advance to round 2
    const nextActions = roundsBlock.next(runtime);
    
    // Verify reps updated to 15
    expect(runtime.memory.get(repsRef as any)).toBe(15);

    // Execute next actions
    for (const action of nextActions) {
      action.do(runtime);
    }

    // Pop second child
    runtime.stack.pop();

    // Call next() to advance to round 3
    const round3Actions = roundsBlock.next(runtime);

    // Verify reps updated to 9
    expect(runtime.memory.get(repsRef as any)).toBe(9);
  });

  it('should NOT allocate METRIC_REPS when no rep scheme is configured', () => {
    // Child statement already created in beforeEach
    
    // Create RoundsBlock with fixed rounds (no rep scheme)
    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      children: [[1]] // Single group containing statement ID 1
    });

    // Search for public METRIC_REPS
    const publicRepsRefs = runtime.memory.search({
      type: MemoryTypeEnum.METRIC_REPS,
      visibility: 'public',
      id: null,
      ownerId: null
    });

    // Should NOT allocate metric for fixed rounds
    expect(publicRepsRefs.length).toBe(0);
  });
});
