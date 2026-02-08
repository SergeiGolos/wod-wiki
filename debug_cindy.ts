import { WorkoutTestBuilder, WorkoutTestHarness } from '@/testing/harness/WorkoutTestHarness';
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
console.log('After mount - stackDepth:', harness.stackDepth);
console.log('Current block:', harness.currentBlock?.label);

// Get root block (AMRAP)
const blocks = harness.runtime.stack.blocks;
const root = blocks[blocks.length - 1];
console.log('Root block key:', root.key?.toString());
console.log('Root isComplete BEFORE tick:', root.isComplete);

// Check timer memory on root
const timer = root.getMemory?.('timer');
console.log('Timer memory:', timer ? JSON.stringify({ direction: timer.value?.direction, durationMs: timer.value?.durationMs, spansCount: timer.value?.spans?.length }) : 'NOT FOUND');

// Check event bus handlers
const bus = harness.runtime.eventBus as any;
console.log('Tick handlers:', bus.handlersByEvent?.get('tick')?.length ?? 0);

// Advance clock
harness.advanceClock(20 * 60 * 1000);
console.log('Root isComplete AFTER advanceClock+tick:', root.isComplete);
console.log('isComplete():', harness.isComplete());

harness.dispose();
