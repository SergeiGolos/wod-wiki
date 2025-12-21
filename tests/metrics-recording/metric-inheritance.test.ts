import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { RoundsBlock } from '../../src/runtime/blocks/RoundsBlock';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { JitCompiler } from '../../src/runtime/JitCompiler';
import { WodScript } from '../../src/parser/WodScript';
import { BlockKey } from '../../src/core/models/BlockKey';
import { ICodeStatement } from '../../src/core/models/CodeStatement';
import { FragmentType } from '../../src/core/models/CodeFragment';
import { MemoryTypeEnum } from '../../src/runtime/MemoryTypeEnum';
import { RuntimeMemory } from '../../src/runtime/RuntimeMemory';
import { RuntimeStack } from '../../src/runtime/RuntimeStack';
import { RuntimeClock } from '../../src/runtime/RuntimeClock';
import { EventBus } from '../../src/runtime/EventBus';

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
      meta: { line: 1, startOffset: 0, endOffset: 10, columnStart: 0, columnEnd: 10, length: 10 }
    };

    // Create mock script with proper ID resolution
    mockScript = new WodScript('mock source', [childStatement], []);
    const jitCompiler = new JitCompiler([]);
    const dependencies = {
      memory: new RuntimeMemory(),
      stack: new RuntimeStack(),
      clock: new RuntimeClock(),
      eventBus: new EventBus(),
    };
    runtime = new ScriptRuntime(mockScript, jitCompiler, dependencies);
  });

  it('should allocate public METRICS_CURRENT when rep scheme is configured', () => {
    // Create RoundsBlock with rep scheme [21, 15, 9]
    // Pass child IDs as number[][] format
    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [[1]] // Single group containing statement ID 1
    });

    // Mount to trigger metric allocation
    roundsBlock.mount(runtime);

    // Search for public METRICS_CURRENT in memory
    const metricsRefs = runtime.memory.search({
      type: MemoryTypeEnum.METRICS_CURRENT,
      visibility: 'public',
      id: null,
      ownerId: null
    });

    // Verify metric was allocated
    expect(metricsRefs.length).toBeGreaterThan(0);

    // Verify initial value is 21 (first round)
    const metrics = runtime.memory.get(metricsRefs[0] as any);
    expect(metrics).toBeDefined();
    expect(metrics['reps']).toBeDefined();
    expect(metrics['reps'].value).toBe(21);
  });

  it('should update public METRIC_REPS when rounds advance', () => {
    // Child statement already created in beforeEach
    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [[1]] // Single group containing statement ID 1
    });

    // Get the metric reference (allocate first)
    // Push block to stack and mount
    runtime.stack.push(roundsBlock);
    const mountActions = roundsBlock.mount(runtime);

    // Execute mount actions (pushes first child)
    for (const action of mountActions) {
      action.do(runtime);
    }

    const metricsRefs = runtime.memory.search({
      type: MemoryTypeEnum.METRICS_CURRENT,
      visibility: 'public',
      id: null,
      ownerId: null
    });

    expect(metricsRefs.length).toBe(1);
    const metricsRef = metricsRefs[0];

    // Initial value should be 21
    expect((runtime.memory.get(metricsRef as any) as any).reps.value).toBe(21);

    // Pop first child
    runtime.stack.pop();

    // Call next() to advance to round 2
    const nextActions = roundsBlock.next(runtime);

    // Verify reps updated to 15
    expect((runtime.memory.get(metricsRef as any) as any).reps.value).toBe(15);

    // Execute next actions
    for (const action of nextActions) {
      action.do(runtime);
    }

    // Pop second child
    runtime.stack.pop();

    // Call next() to advance to round 3
    const round3Actions = roundsBlock.next(runtime);

    // Verify reps updated to 9
    expect((runtime.memory.get(metricsRef as any) as any).reps.value).toBe(9);
  });

  it('should NOT allocate METRIC_REPS when no rep scheme is configured', () => {
    // Child statement already created in beforeEach

    // Create RoundsBlock with fixed rounds (no rep scheme)
    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      children: [[1]] // Single group containing statement ID 1
    });

    // Mount to trigger allocation check
    roundsBlock.mount(runtime);

    // Search for public METRICS_CURRENT
    const metricsRefs = runtime.memory.search({
      type: MemoryTypeEnum.METRICS_CURRENT,
      visibility: 'public',
      id: null,
      ownerId: null
    });

    // Should NOT allocate metric for fixed rounds (or at least reps shouldn't be set)
    if (metricsRefs.length > 0) {
      const metrics = runtime.memory.get(metricsRefs[0] as any) as any;
      expect(metrics['reps']).toBeUndefined();
    } else {
      expect(metricsRefs.length).toBe(0);
    }
  });
});
