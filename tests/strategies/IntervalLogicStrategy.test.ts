import { describe, it, expect, beforeEach } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { TimerBehavior, ReEntryBehavior, SoundCueBehavior } from '@/runtime/behaviors';

describe('IntervalLogicStrategy', () => {
  it('should compile "1:00 EMOM 10" to an Interval block', () => {
    // "1:00 EMOM 10" implies 10 rounds of 1 minute intervals
    const harness = new RuntimeTestBuilder()
      .withScript('1:00 EMOM 10')
      .withStrategy(new IntervalLogicStrategy())
      .build();

    const block = harness.pushStatement(0);

    expect(block).toBeDefined();
    expect(block.blockType).toBe('EMOM');
    expect(block.label).toBe('EMOM 10');

    // Now uses aspect-based behaviors
    expect(block.getBehavior(TimerBehavior)).toBeDefined();
    expect(block.getBehavior(ReEntryBehavior)).toBeDefined();
    expect(block.getBehavior(SoundCueBehavior)).toBeDefined();
  });
});
