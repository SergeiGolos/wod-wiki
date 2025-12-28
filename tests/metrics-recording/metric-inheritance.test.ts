import { describe, it, expect, beforeEach } from 'bun:test';
import { RoundsBlock } from '../../src/runtime/blocks/RoundsBlock';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { JitCompiler } from '../../src/runtime/JitCompiler';
import { WodScript } from '../../src/parser/WodScript';
import { ParsedCodeStatement } from '../../src/core/models/CodeStatement';
import { FragmentType } from '../../src/core/models/CodeFragment';
import { RuntimeMemory } from '../../src/runtime/RuntimeMemory';
import { RuntimeStack } from '../../src/runtime/RuntimeStack';
import { RuntimeClock } from '../../src/runtime/RuntimeClock';
import { EventBus } from '../../src/runtime/EventBus';
import { EffortStrategy } from '../../src/runtime/strategies/EffortStrategy';

/**
 * Tests for RoundsBlock metric inheritance.
 * 
 * Architecture Note (Phase 3):
 * - METRICS_CURRENT memory slot was removed in Phase 3
 * - Rep scheme information is now available via:
 *   1. block.getRepsForCurrentRound() - direct access
 *   2. block.fragments - fragment data
 *   3. rounds:changed events - reactive updates
 */
describe('RoundsBlock - Metric Inheritance', () => {
  let runtime: ScriptRuntime;
  let mockScript: WodScript;

  beforeEach(() => {
    // Create child statement (Push-ups without explicit reps)
    const childStatement = new ParsedCodeStatement({
      id: 1,
      fragments: [
        { fragmentType: FragmentType.Effort, value: undefined, type: 'effort' }
      ],
      children: [],
      meta: { line: 1, startOffset: 0, endOffset: 10, columnStart: 0, columnEnd: 10, length: 10 } as any
    });

    // Create mock script with proper ID resolution
    mockScript = new WodScript('mock source', [childStatement], []);

    // Create JitCompiler with EffortStrategy so it can compile child statements
    const jitCompiler = new JitCompiler([]);
    jitCompiler.registerStrategy(new EffortStrategy());

    const dependencies = {
      memory: new RuntimeMemory(),
      stack: new RuntimeStack(),
      clock: new RuntimeClock(),
      eventBus: new EventBus(),
    };
    runtime = new ScriptRuntime(mockScript, jitCompiler, dependencies);
  });

  it('should provide reps for current round via getRepsForCurrentRound() when rep scheme is configured', () => {
    // Create RoundsBlock with rep scheme [21, 15, 9]
    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [[1]] // Single group containing statement ID 1
    });

    // Mount the block
    roundsBlock.mount(runtime);

    // Verify initial value is 21 (first round) via direct method access
    const reps = roundsBlock.getRepsForCurrentRound();
    expect(reps).toBe(21);
  });

  it('should return undefined from getRepsForCurrentRound() when no rep scheme is configured', () => {
    // Create RoundsBlock with fixed rounds (no rep scheme)
    const roundsBlock = new RoundsBlock(runtime, [], {
      totalRounds: 3,
      children: [[1]] // Single group containing statement ID 1
    });

    // Mount the block
    roundsBlock.mount(runtime);

    // Should return undefined for fixed rounds (no rep scheme)
    const reps = roundsBlock.getRepsForCurrentRound();
    expect(reps).toBeUndefined();
  });
});
