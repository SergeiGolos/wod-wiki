import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { IRuntimeAction } from '@/runtime/contracts';
import { IScriptRuntime } from '@/runtime/contracts';
import { BlockLifecycleOptions } from '@/runtime/contracts';

// We can test lifecycle methods by observing when behaviors are called
// Since we are using MockBlock, we can spy on behaviors,
// OR we can test the specific Lifecycle behaviors if they exist (e.g. MountBehavior).
// But "MountBehavior" isn't a standard behavior class usually, it's a phase.
// However, some strategies add specific behaviors for specific phases.

// If the plan means "Test the lifecycle PHASES of the Runtime/Block interaction",
// we can do that using the Harness and custom behaviors.

class LifecycleSpyBehavior {
    mountCalled = false;
    nextCalled = false;
    unmountCalled = false;

    onPush() { this.mountCalled = true; return []; }
    onNext() { this.nextCalled = true; return []; }
    onPop() { this.unmountCalled = true; return []; }
}

describe('Lifecycle Phases', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should trigger onPush during mount phase', () => {
        const spy = new LifecycleSpyBehavior();
        const block = new MockBlock('lifecycle-test', [spy]);

        harness.push(block);
        harness.mount();

        expect(spy.mountCalled).toBe(true);
    });

    it('should trigger onNext during next phase', () => {
        const spy = new LifecycleSpyBehavior();
        const block = new MockBlock('lifecycle-test', [spy]);

        harness.push(block);
        harness.mount();
        harness.next();

        expect(spy.nextCalled).toBe(true);
    });

    it('should trigger onPop during unmount phase', () => {
        const spy = new LifecycleSpyBehavior();
        const block = new MockBlock('lifecycle-test', [spy]);

        harness.push(block);
        harness.mount();
        harness.unmount();

        expect(spy.unmountCalled).toBe(true);
    });
});
