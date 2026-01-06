import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { BoundTimerBehavior } from '@/runtime/behaviors/BoundTimerBehavior';
import { UnboundLoopBehavior } from '@/runtime/behaviors/UnboundLoopBehavior';
import { CompletionBehavior } from '@/runtime/behaviors/CompletionBehavior';

describe('AmrapLogicStrategy', () => {
  it('should compile "10:00 AMRAP" to an AMRAP block', () => {
    // Strategy matches Timer + (Rounds OR "AMRAP" keyword)
    const harness = new RuntimeTestBuilder()
      .withScript('10:00 AMRAP')
      .withStrategy(new AmrapLogicStrategy())
      .build();

    const block = harness.pushStatement(0);

    expect(block).toBeDefined();
    expect(block.blockType).toBe('AMRAP');

    expect(block.getBehavior(BoundTimerBehavior)).toBeDefined();
    expect(block.getBehavior(UnboundLoopBehavior)).toBeDefined();
    expect(block.getBehavior(CompletionBehavior)).toBeDefined();
  });
});
