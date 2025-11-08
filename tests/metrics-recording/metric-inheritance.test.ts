import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoundsBlock } from '../../src/runtime/blocks/RoundsBlock';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { JitCompiler } from '../../../src/runtime/JitCompiler';
import { WodScript } from '../../../src/WodScript';
import { BlockKey } from '../../../src/BlockKey';
import { ICodeStatement } from '../../../src/CodeStatement';
import { FragmentType } from '../../../src/CodeFragment';
import { MemoryTypeEnum } from '../../../src/runtime/MemoryTypeEnum';

describe('RoundsBlock - Metric Inheritance', () => {
  let runtime: ScriptRuntime;

  beforeEach(() => {
    const emptyScript = {
      statements: [],
      errors: []
    } as unknown as WodScript;
    const jitCompiler = new JitCompiler([]);
    runtime = new ScriptRuntime(emptyScript, jitCompiler);
  });

  it('should allocate public METRIC_REPS when rep scheme is configured', () => {
    // Create child statement (Push-ups without explicit reps)
    const childStatement = {
      id: 1,
      fragments: [
        { fragmentType: FragmentType.Effort, value: undefined, type: 'effort' }
      ],
      children: [],
      meta: {}
    } as unknown as ICodeStatement;

    // Create RoundsBlock with rep scheme [21, 15, 9]
    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [childStatement]
    });

    console.log('✅ Created RoundsBlock');

    // Search for public METRIC_REPS in memory
    const publicRepsRefs = runtime.memory.search({
      type: MemoryTypeEnum.METRIC_REPS,
      visibility: 'public',
      id: null,
      ownerId: null
    });

    // Verify metric was allocated
    expect(publicRepsRefs.length).toBeGreaterThan(0);
    console.log(`✅ Found ${publicRepsRefs.length} public METRIC_REPS`);

    // Verify initial value is 21 (first round)
    const repsValue = runtime.memory.get(publicRepsRefs[0] as any);
    expect(repsValue).toBe(21);
    console.log(`✅ Initial reps value: ${repsValue}`);
  });

  it('should update public METRIC_REPS when rounds advance', () => {
    const childStatement = {
      id: 1,
      fragments: [{ fragmentType: FragmentType.Effort, value: undefined, type: 'effort' }],
      children: [],
      meta: {}
    } as unknown as ICodeStatement;

    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [childStatement]
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
    console.log('✅ Round 1 reps: 21');

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
    console.log('✅ Round 2 reps: 15');

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
    console.log('✅ Round 3 reps: 9');
  });

  it('should NOT allocate METRIC_REPS when no rep scheme is configured', () => {
    const childStatement = {
      id: 1,
      fragments: [{ fragmentType: FragmentType.Effort, value: undefined, type: 'effort' }],
      children: [],
      meta: {}
    } as unknown as ICodeStatement;

    // Create RoundsBlock with fixed rounds (no rep scheme)
    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      children: [childStatement]
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
    console.log('✅ No METRIC_REPS allocated for fixed rounds');
  });
});
