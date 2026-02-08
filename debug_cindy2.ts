import { WorkoutTestBuilder } from '@/testing/harness/WorkoutTestHarness';
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

const harness = new WorkoutTestBuilder()
  .withScript('20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats')
  .withStrategy(new AmrapLogicStrategy())
  .withStrategy(new ChildrenStrategy())
  .withStrategy(new EffortFallbackStrategy())
  .build();

harness.mount();
const blocks = harness.runtime.stack.blocks;
const root = blocks[blocks.length - 1];

// Check timer memory
const timerEntry = root.getMemory?.('timer');
const timer = timerEntry?.value;
console.log('Timer spans:', JSON.stringify(timer?.spans));
console.log('Timer durationMs:', timer?.durationMs);
console.log('Timer direction:', timer?.direction);
console.log('Clock now before advance:', harness.runtime.clock.now.getTime());

// Manually calculate what the handler would see
const spanStart = timer?.spans?.[0]?.started;
console.log('Span started:', spanStart);

// Advance clock
(harness as any)._mockClock.advance(20 * 60 * 1000);
const nowAfter = harness.runtime.clock.now.getTime();
console.log('Clock now after advance:', nowAfter);

// Calculate elapsed as TimerCompletionBehavior would
let elapsed = 0;
for (const span of timer?.spans || []) {
    const end = span.ended ?? nowAfter;
    elapsed += end - span.started;
}
console.log('Calculated elapsed:', elapsed, 'durationMs:', timer?.durationMs, 'expired:', elapsed >= (timer?.durationMs || 0));

// Now dispatch tick manually and check
harness.runtime.handle({ name: 'tick', timestamp: harness.runtime.clock.now, data: {} });
console.log('Root isComplete after tick:', root.isComplete);
console.log('Completion reason:', (root as any)._completionReason);

harness.dispose();
