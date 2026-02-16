import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { TimerBehavior, RoundInitBehavior, HistoryRecordBehavior } from '@/runtime/behaviors';

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

    // Now uses aspect-based behaviors
    expect(block.getBehavior(TimerBehavior)).toBeDefined();
    expect(block.getBehavior(RoundInitBehavior)).toBeDefined();
    expect(block.getBehavior(HistoryRecordBehavior)).toBeDefined();
  });
});
