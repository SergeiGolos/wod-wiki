import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { EffortFallbackStrategy } from '@bitcobblers/wod-wiki-engine';
import { CountupTimerBehavior, ExitBehavior } from '@bitcobblers/wod-wiki-engine';

describe('EffortFallbackStrategy', () => {
  it('should compile "Run" to an Effort block', () => {
    // EffortFallbackStrategy matches when NO Timer and NO Rounds are present.
    const harness = new RuntimeTestBuilder()
      .withScript('Run')
      .withStrategy(new EffortFallbackStrategy())
      .build();

    const block = harness.pushStatement(0);

    expect(block).toBeDefined();
    expect(block.blockType).toBe('effort');
    // Uses aspect-based behaviors
    expect(block.getBehavior(CountupTimerBehavior)).toBeDefined();
    expect(block.getBehavior(ExitBehavior)).toBeDefined();
  });
});
