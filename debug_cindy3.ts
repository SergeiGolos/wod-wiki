import { WorkoutTestBuilder } from '@/testing/harness/WorkoutTestHarness';
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';
import { TimerCompletionBehavior } from '@/runtime/behaviors/TimerCompletionBehavior';

const harness = new WorkoutTestBuilder()
  .withScript('20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats')
  .withStrategy(new AmrapLogicStrategy())
  .withStrategy(new ChildrenStrategy())
  .withStrategy(new EffortFallbackStrategy())
  .build();

harness.mount();
const blocks = harness.runtime.stack.blocks;
const root = blocks[blocks.length - 1];
const child = blocks[0]; // top of stack

console.log('Stack keys:', harness.runtime.stack.keys.map(k => k.toString()));
console.log('Root key:', root.key?.toString());
console.log('Child key:', child.key?.toString());
console.log('Root behaviors:', (root as any).behaviors?.map((b: any) => b.constructor.name));

// Check what event bus handlers exist for 'tick'
const bus = harness.runtime.eventBus as any;
const tickHandlers = bus.handlersByEvent?.get('tick') || [];
console.log('Tick handler count:', tickHandlers.length);
for (const h of tickHandlers) {
    const stackKeys = new Set(harness.runtime.stack.keys.map(k => k.toString()));
    console.log('  Handler:', h.handler?.name, 'owner:', h.ownerId, 'scope:', h.scope, 'onStack:', stackKeys.has(h.ownerId));
}

// Advance and dispatch tick manually
(harness as any)._mockClock.advance(20 * 60 * 1000);

// Manually dispatch and trace each handler
const event = { name: 'tick', timestamp: harness.runtime.clock.now, data: {} };
for (const h of tickHandlers) {
    const stackKeys = new Set(harness.runtime.stack.keys.map(k => k.toString()));
    const eligible = h.scope === 'bubble' ? stackKeys.has(h.ownerId) : h.scope === 'global';
    if (eligible) {
        console.log('Firing handler:', h.handler?.name, 'result:');
        try {
            const result = h.handler.handler(event, harness.runtime);
            console.log('  Actions returned:', result?.length || 0);
        } catch(e) {
            console.log('  ERROR:', e);
        }
    }
}

console.log('Root isComplete after manual dispatch:', root.isComplete);

harness.dispose();
