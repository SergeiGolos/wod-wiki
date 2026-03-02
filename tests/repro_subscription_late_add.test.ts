import { describe, it, expect } from 'bun:test';
import { SubscriptionManager } from '../src/runtime/subscriptions/SubscriptionManager';
import { IScriptRuntime } from '../src/runtime/contracts/IScriptRuntime';
import { StackSnapshot } from '../src/runtime/contracts/IRuntimeStack';
import { IOutputStatement } from '../src/core/models/OutputStatement';

function createMockRuntime(): IScriptRuntime {
    const stackObservers = new Set<any>();
    return {
        subscribeToStack(observer: any) {
            stackObservers.add(observer);
            // Simulate ScriptRuntime's async initial snapshot
            setTimeout(() => {
                if (stackObservers.has(observer)) {
                    observer({
                        type: 'initial',
                        blocks: [{ key: 'root', label: 'Root' }],
                        depth: 1,
                        clockTime: new Date()
                    });
                }
            }, 0);
            return () => stackObservers.delete(observer);
        },
        subscribeToOutput: () => () => {},
        stack: { blocks: [{ key: 'root', label: 'Root' }], count: 1 } as any,
        clock: { now: new Date() } as any,
        getOutputStatements: () => [],
    } as any;
}

describe('SubscriptionManager Repro', () => {
    it('late-added subscription should receive initial state', async () => {
        const runtime = createMockRuntime();
        const manager = new SubscriptionManager(runtime);

        // Wait for the async initial snapshot from runtime to manager to fire
        await new Promise(r => setTimeout(r, 10));

        const received: StackSnapshot[] = [];
        const lateSub = {
            id: 'late',
            onStackSnapshot: (s: StackSnapshot) => received.push(s),
            onOutput: () => {},
            dispose: () => {},
        };

        manager.add(lateSub as any);

        // This should pass after we fix SubscriptionManager
        expect(received).toHaveLength(1);
    });
});
