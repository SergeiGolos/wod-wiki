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
 * collaborator only owns stack + tracker subscriber sets.
 *
 * Initial-snapshot timing is the adapter's responsibility, not the
 * collaborator's: ScriptRuntime defers via setTimeout, the proxy
 * fires synchronously. Tests for the collaborator cover the fan-out
 * only.
 */
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { RuntimeObservers, type RuntimeObserversTrackerSource } from '../RuntimeObservers';
import type { TrackerUpdate } from '../contracts/IRuntimeOptions';
import type { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import type { StackSnapshot } from '../contracts/IRuntimeStack';

function makeBlock(label: string): IRuntimeBlock {
    return { label, key: { toString: () => label } } as unknown as IRuntimeBlock;
}

const BLOCK_A = makeBlock('A');
const BLOCK_B = makeBlock('B');

const TRACKER_UPDATE: TrackerUpdate = {
    type: 'metric',
    blockId: 'b1',
    key: 'reps',
    value: 5,
    unit: 'reps',
    timestamp: 0,
};

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

    describe('tracker listeners (auto-wired upstream source)', () => {
        it('wires the upstream source on the first listener and tears it down on last unsubscribe', () => {
            const upstreamUnsub = mock(() => {});
            const onUpdate = mock((_cb: (u: TrackerUpdate) => void) => upstreamUnsub);
            const source: RuntimeObserversTrackerSource = { onUpdate };
            const obs = new RuntimeObservers(source);

            // No source wire yet
            expect(onUpdate).not.toHaveBeenCalled();

            // First listener triggers the upstream wire
            const received1: TrackerUpdate[] = [];
            const unsub1 = obs.subscribeToTracker(u => received1.push(u));
            expect(onUpdate).toHaveBeenCalledTimes(1);

            // Second listener does NOT re-wire
            const received2: TrackerUpdate[] = [];
            const unsub2 = obs.subscribeToTracker(u => received2.push(u));
            expect(onUpdate).toHaveBeenCalledTimes(1);

            // Adapter-issued emit goes to both
            obs.emitTracker(TRACKER_UPDATE);
            expect(received1).toEqual([TRACKER_UPDATE]);
            expect(received2).toEqual([TRACKER_UPDATE]);

            // First unsubscribe — upstream still wired (one listener left)
            unsub1();
            expect(upstreamUnsub).not.toHaveBeenCalled();
            obs.emitTracker(TRACKER_UPDATE);
            expect(received2).toHaveLength(2);

            // Second unsubscribe — upstream torn down
            unsub2();
            expect(upstreamUnsub).toHaveBeenCalledTimes(1);
        });

        it('does not wire a missing upstream source', () => {
            const obs = new RuntimeObservers(null);
            // Should not throw even though there is no upstream
            const unsub = obs.subscribeToTracker(() => {});
            expect(typeof unsub).toBe('function');
            unsub();
        });

        it('isolates listener errors', () => {
            const received: TrackerUpdate[] = [];
            const consoleError = mock(() => {});
            const originalError = console.error;
            console.error = consoleError;

            try {
                observers.subscribeToTracker(() => { throw new Error('boom'); });
                observers.subscribeToTracker(u => received.push(u));
                observers.emitTracker(TRACKER_UPDATE);
                expect(received).toEqual([TRACKER_UPDATE]);
                expect(consoleError).toHaveBeenCalled();
            } finally {
                console.error = originalError;
            }
        });
    });

    describe('dispose', () => {
        it('clears all subscribers and tears down upstream', () => {
            const upstreamUnsub = mock(() => {});
            const onUpdate = mock((_cb: (u: TrackerUpdate) => void) => upstreamUnsub);
            const obs = new RuntimeObservers({ onUpdate });

            obs.subscribeToStack(() => {});
            obs.subscribeToTracker(() => {});

            expect(obs.stackObserverCount).toBe(1);
            expect(obs.trackerListenerCount).toBe(1);

            obs.dispose();

            expect(obs.stackObserverCount).toBe(0);
            expect(obs.trackerListenerCount).toBe(0);
            expect(upstreamUnsub).toHaveBeenCalledTimes(1);
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
