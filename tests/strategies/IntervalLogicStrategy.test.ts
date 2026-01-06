import { describe, it, expect, beforeEach } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { BoundTimerBehavior } from '@/runtime/behaviors/BoundTimerBehavior';
import { BoundLoopBehavior } from '@/runtime/behaviors/BoundLoopBehavior';
import { IntervalWaitingBehavior } from '@/runtime/behaviors/IntervalWaitingBehavior';
import { TimerFragment } from '@/runtime/fragments/TimerFragment';

describe('IntervalLogicStrategy', () => {
  it('should compile "1:00 EMOM 10" to an Interval block', () => {
    // "1:00 EMOM 10" implies 10 rounds of 1 minute intervals
    const harness = new RuntimeTestBuilder()
      .withScript('1:00 EMOM 10')
      .withStrategy(new IntervalLogicStrategy())
      .build();

    const block = harness.pushStatement(0);

    expect(block).toBeDefined();
    expect(block.blockType).toBe('Interval');
    expect(block.label).toBe('EMOM');

    // Check behaviors
    expect(block.getBehavior(BoundTimerBehavior)).toBeDefined();
    expect(block.getBehavior(BoundLoopBehavior)).toBeDefined();
    expect(block.getBehavior(IntervalWaitingBehavior)).toBeDefined();

    // Check Timer Duration (should be 60000ms for 1:00)
    const timer = block.getBehavior(BoundTimerBehavior);
    expect(timer?.durationMs).toBe(60000);
  });
});
