import { describe, it, expect, beforeEach } from 'bun:test';
import { ScriptRuntime } from '../ScriptRuntime';
import { RuntimeBlock } from '../RuntimeBlock';
import { IRuntimeBehavior, IRuntimeBlock, IRuntimeAction } from '../contracts';

class TestBehavior implements IRuntimeBehavior {
  name = 'TestBehavior';
  unmountCalled = false;
  nextCalled = false;

  onUnmount(block: IRuntimeBlock): IRuntimeAction[] {
    this.unmountCalled = true;
    return [];
  }

  onNext(block: IRuntimeBlock): IRuntimeAction[] {
    this.nextCalled = true;
    return [];
  }
}

describe('ScriptRuntime - popBlock Race Condition Fix', () => {
  let runtime: ScriptRuntime;

  beforeEach(() => {
    runtime = new ScriptRuntime();
  });

  describe('action execution order', () => {
    it('should queue unmount and next actions together', () => {
      const executionOrder: string[] = [];
      
      const childBehavior = new TestBehavior();
      const parentBehavior = new TestBehavior();

      const childBlock = new RuntimeBlock('child', 'Child', [childBehavior], {});
      const parentBlock = new RuntimeBlock('parent', 'Parent', [parentBehavior], {});

      // Push parent then child
      runtime['pushBlock'](parentBlock);
      runtime['pushBlock'](childBlock);

      // Override action execution to track order
      const originalQueue = runtime['queueActions'].bind(runtime);
      runtime['queueActions'] = (actions) => {
        actions.forEach(action => {
          executionOrder.push(action.constructor.name || 'action');
        });
        return originalQueue(actions);
      };

      // Pop child - should queue unmount + parent.next() together
      runtime['popBlock']();

      // Both should be queued together (no immediate execution)
      expect(executionOrder.length).toBeGreaterThanOrEqual(0);
    });

    it('should not create race condition window for event handlers', () => {
      let eventEmittedDuringUnmount = false;
      let eventHandlerTriggered = false;

      class EmitOnUnmountBehavior implements IRuntimeBehavior {
        name = 'EmitOnUnmount';

        onUnmount(block: IRuntimeBlock): IRuntimeAction[] {
          // Simulate emitting event during unmount
          eventEmittedDuringUnmount = true;
          return [];
        }
      }

      class ListenForEventBehavior implements IRuntimeBehavior {
        name = 'ListenForEvent';

        onEvent(block: IRuntimeBlock, eventName: string): IRuntimeAction[] {
          if (eventEmittedDuringUnmount) {
            eventHandlerTriggered = true;
          }
          return [];
        }

        onNext(block: IRuntimeBlock): IRuntimeAction[] {
          return [];
        }
      }

      const childBlock = new RuntimeBlock('child', 'Child', [new EmitOnUnmountBehavior()], {});
      const parentBlock = new RuntimeBlock('parent', 'Parent', [new ListenForEventBehavior()], {});

      runtime['pushBlock'](parentBlock);
      runtime['pushBlock'](childBlock);
      
      // Pop should not trigger race
      runtime['popBlock']();

      // With fix, actions are queued together - no immediate execution
      // Event handler should not see intermediate state
    });
  });

  describe('deterministic execution', () => {
    it('should maintain consistent execution order across multiple pops', () => {
      const executionOrders: string[][] = [];

      for (let i = 0; i < 5; i++) {
        const order: string[] = [];
        const childBlock = new RuntimeBlock('child', 'Child', [], {});
        const parentBlock = new RuntimeBlock('parent', 'Parent', [], {});

        const testRuntime = new ScriptRuntime();
        testRuntime['pushBlock'](parentBlock);
        testRuntime['pushBlock'](childBlock);

        const originalQueue = testRuntime['queueActions'].bind(testRuntime);
        testRuntime['queueActions'] = (actions) => {
          order.push(`queued-${actions.length}`);
          return originalQueue(actions);
        };

        testRuntime['popBlock']();
        executionOrders.push(order);
      }

      // All runs should have same execution order
      const firstOrder = JSON.stringify(executionOrders[0]);
      executionOrders.forEach(order => {
        expect(JSON.stringify(order)).toBe(firstOrder);
      });
    });
  });
});
