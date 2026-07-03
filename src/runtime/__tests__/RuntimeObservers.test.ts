/**
 * RuntimeObservers — direct unit tests for the shared observer collaborator.
 *
 * The collaborator is the seam that both ScriptRuntime and
 * ChromecastProxyRuntime compose. These tests pin its contract in
 * isolation (no runtime, no clock, no stack) so a regression is
 * attributable to the collaborator itself.
 *
 * Output emission semantics (buffer, analytics, GC guard, deferred
 * catch-up) live in OutputEmitter and are tested there. This
 * collaborator only owns the stack subscriber set.
 *
 * Initial-snapshot timing is the adapter's responsibility, not the
 * collaborator's: ScriptRuntime defers via setTimeout, the proxy
 * fires synchronously. Tests for the collaborator cover the fan-out
 * only.
 */
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { RuntimeObservers } from '../RuntimeObservers';
import type { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import type { StackSnapshot } from '../contracts/IRuntimeStack';

function makeBlock(label: string): IRuntimeBlock {
    return { label, key: { toString: () => label } } as unknown as IRuntimeBlock;
}

const BLOCK_A = makeBlock('A');
const BLOCK_B = makeBlock('B');

function snapshot(type: StackSnapshot['type'], depth: number, blocks: readonly IRuntimeBlock[] = [BLOCK_A]): StackSnapshot {
    return { type, depth, blocks, clockTime: new Date(0) };
}

describe('RuntimeObservers', () => {
    let observers: RuntimeObservers;

    beforeEach(() => {
        observers = new RuntimeObservers();
    });

    afterEach(() => {
        observers.dispose();
    });

    describe('stack observers', () => {
        it('does NOT emit an initial snapshot at subscribe time (adapter-owned)', () => {
            const received: StackSnapshot[] = [];
            observers.subscribeToStack(s => received.push(s));
            // Synchronously: zero snapshots. The adapter must call
            // emitStack(initialSnapshot) itself to deliver the initial.
            expect(received).toHaveLength(0);
        });

        it('emits snapshots synchronously to all current subscribers via emitStack', () => {
            const a: StackSnapshot[] = [];
            const b: StackSnapshot[] = [];
            observers.subscribeToStack(s => a.push(s));
            observers.subscribeToStack(s => b.push(s));

            observers.emitStack(snapshot('push', 1));

            expect(a).toHaveLength(1);
            expect(b).toHaveLength(1);
            expect(a[0].type).toBe('push');
            expect(b[0].type).toBe('push');
        });

        it('stops delivering snapshots after unsubscribe', () => {
            const received: StackSnapshot[] = [];
            const unsub = observers.subscribeToStack(s => received.push(s));
            observers.emitStack(snapshot('push', 1));
            expect(received).toHaveLength(1);

            unsub();
            observers.emitStack(snapshot('push', 2));
            expect(received).toHaveLength(1);
        });

        it('skips fan-out when no subscribers are registered', () => {
            // No panic, no listeners to call
            expect(() => observers.emitStack(snapshot('push', 1))).not.toThrow();
        });

        it('isolates listener errors so other subscribers still receive the snapshot', () => {
            const received: StackSnapshot[] = [];
            const consoleError = mock(() => {});
            const originalError = console.error;
            console.error = consoleError;

            try {
                observers.subscribeToStack(() => { throw new Error('boom'); });
                observers.subscribeToStack(s => received.push(s));

                observers.emitStack(snapshot('push', 1));

                expect(received).toHaveLength(1);
                expect(consoleError).toHaveBeenCalled();
            } finally {
                console.error = originalError;
            }
        });

        it('emits a post-mount settle snapshot via emitSettled', () => {
            const received: StackSnapshot[] = [];
            observers.subscribeToStack(s => received.push(s));
            observers.emitSettled([BLOCK_A, BLOCK_B], 2, new Date(100));
            expect(received).toHaveLength(1);
            expect(received[0].type).toBe('initial');
            expect(received[0].blocks).toEqual([BLOCK_A, BLOCK_B]);
            expect(received[0].depth).toBe(2);
        });

        it('skips emitSettled when stack is empty', () => {
            const received: StackSnapshot[] = [];
            observers.subscribeToStack(s => received.push(s));
            observers.emitSettled([], 0, new Date(100));
            expect(received).toHaveLength(0);
        });
    });

    describe('dispose', () => {
        it('clears all stack subscribers', () => {
            observers.subscribeToStack(() => {});
            expect(observers.stackObserverCount).toBe(1);
            observers.dispose();
            expect(observers.stackObserverCount).toBe(0);
        });

        it('makes emit calls no-ops after dispose', () => {
            const received: StackSnapshot[] = [];
            observers.subscribeToStack(s => received.push(s));
            observers.dispose();
            observers.emitStack(snapshot('push', 1));
            expect(received).toHaveLength(0);
        });
    });
});
