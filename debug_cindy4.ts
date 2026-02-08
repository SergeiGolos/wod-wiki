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

// Monkey-patch markComplete to add logging
const origMarkComplete = root.markComplete.bind(root);
root.markComplete = (reason?: string) => {
    console.log('!!! markComplete called with reason:', reason);
    origMarkComplete(reason);
};

// Also check what the BehaviorContext sees
const ctx = (root as any)._behaviorContext;
console.log('BehaviorContext clock type:', ctx?.clock?.constructor?.name);
console.log('BehaviorContext clock.now:', ctx?.clock?.now?.getTime());

// Advance clock
(harness as any)._mockClock.advance(20 * 60 * 1000);
console.log('After advance - ctx.clock.now:', ctx?.clock?.now?.getTime());

// Get timer state
const timerMem = ctx?.getMemory?.('timer');
console.log('Timer from ctx:', timerMem ? JSON.stringify({ direction: timerMem.direction, durationMs: timerMem.durationMs, spans: timerMem.spans?.map((s: any) => ({started: s.started, ended: s.ended})) }) : 'NOT FOUND');

// Calculate as the behavior would
if (timerMem) {
    const now = ctx.clock.now.getTime();
    let elapsed = 0;
    for (const span of timerMem.spans) {
        const end = span.ended ?? now;
        elapsed += end - span.started;
    }
    console.log('Manual elapsed calc:', elapsed, '>= durationMs:', elapsed >= timerMem.durationMs);
}

// Dispatch tick
harness.runtime.handle({ name: 'tick', timestamp: harness.runtime.clock.now, data: {} });
console.log('Root isComplete:', root.isComplete);

harness.dispose();
