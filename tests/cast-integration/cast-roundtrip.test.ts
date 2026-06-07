/**
 * Cast roundtrip integration test
 *
 * End-to-end check that:
 *  (1) ScriptRuntime stack events reach the cast side as RpcStackUpdate messages,
 *  (2) an RpcEvent injected from the cast side advances the runtime's block.
 *
 * Uses two FakeRpcTransports wired together (browser-side + receiver-side)
 * to model the bidirectional RPC session, and a tiny BrowserEventProxy that
 * mirrors the runtime-side mapping CastButtonRpc performs in production —
 * without dragging in React/Zustand.
 *
 * Story 2 "Done when" gate: a test that boots a real runtime with a fake
 * transport, injects an RpcEvent for "next" from the cast side, and asserts
 * the runtime advanced to the next block AND the cast side received a
 * matching RpcStackUpdate.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { createMockClock } from '@/runtime/RuntimeClock';

import { ChromecastRuntimeSubscription } from '@/services/cast/rpc/ChromecastRuntimeSubscription';
import type { RpcEvent, RpcStackUpdate } from '@/services/cast/rpc/RpcMessages';
import type { IEvent } from '@/runtime/contracts/events';

import { FakeRpcTransport, connectPair } from '@/testing/transport';

import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { ReportOutputStrategy } from '@/runtime/compiler/strategies/enhancements/ReportOutputStrategy';
import { RestBlockStrategy } from '@/runtime/compiler/strategies/components/RestBlockStrategy';
import { SoundStrategy } from '@/runtime/compiler/strategies/enhancements/SoundStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

import { StartSessionAction } from '@/runtime/actions/stack/StartSessionAction';
import { sharedParser } from '@/parser/parserInstance';

// ── BrowserEventProxy — maps RpcEvent names to runtime.handle() calls ────────
// Typed, headless analog of CastButtonRpc's switch statement.

class BrowserEventProxy {
    private readonly unsubMessage: () => void;

    constructor(
        private readonly transport: FakeRpcTransport,
        private readonly runtime: ScriptRuntime,
    ) {
        this.unsubMessage = transport.onMessage((msg) => {
            if (msg.type !== 'rpc-event') return;
            const event: IEvent = {
                name: msg.name,
                timestamp: new Date(msg.timestamp),
                data: msg.data,
            };
            this.runtime.handle(event);
        });
    }

    dispose(): void {
        this.unsubMessage();
    }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('cast roundtrip integration', () => {
    let runtime: ScriptRuntime;
    let subscription: ChromecastRuntimeSubscription;
    let browserFake: FakeRpcTransport;
    let receiverFake: FakeRpcTransport;
    let browserProxy: BrowserEventProxy;

    const SCRIPT = `
# Cast Roundtrip Test

## Timer
*:30 Run
`;

    beforeEach(() => {
        browserFake = new FakeRpcTransport();
        receiverFake = new FakeRpcTransport();
        connectPair(browserFake, receiverFake);

        const script = sharedParser.read(SCRIPT);

        const compiler = new JitCompiler();
        compiler.registerStrategy(new GenericTimerStrategy());
        compiler.registerStrategy(new GenericLoopStrategy());
        compiler.registerStrategy(new RestBlockStrategy());
        compiler.registerStrategy(new ChildrenStrategy());
        compiler.registerStrategy(new ReportOutputStrategy());
        compiler.registerStrategy(new SoundStrategy());
        compiler.registerStrategy(new EffortFallbackStrategy());

        const stack = new RuntimeStack();
        const clock = createMockClock(new Date('2024-01-01T12:00:00Z'));
        const eventBus = new EventBus();

        runtime = new ScriptRuntime(script, compiler, { stack, clock, eventBus });
        // Boot the session — pushes SessionRootBlock + WaitingToStart gate.
        runtime.do(new StartSessionAction());

        // Subscription wires runtime stack events → browserFake.send.
        subscription = new ChromecastRuntimeSubscription(browserFake);
        runtime.subscribeToStack((snapshot) => subscription.onStackSnapshot(snapshot));

        // Receiver-side proxy: maps cast RpcEvents back to runtime.handle().
        browserProxy = new BrowserEventProxy(receiverFake, runtime);
    });

    afterEach(() => {
        browserProxy.dispose();
        subscription.dispose();
        runtime.dispose();
        browserFake.dispose();
        receiverFake.dispose();
    });

    it('runtime stack event → cast receives an RpcStackUpdate', () => {
        // The subscription is wired; the initial snapshot lands on subscribe.
        const stackUpdates = browserFake.filter('rpc-stack-update');
        expect(stackUpdates.length).toBeGreaterThan(0);

        const first = stackUpdates[0] as RpcStackUpdate;
        expect(first.snapshotType).toBe('initial');
        expect(first.depth).toBeGreaterThan(0);
        // Subscription wires runtime stack events → browserFake.send.
        subscription = new ChromecastRuntimeSubscription(browserFake);
        runtime.subscribeToStack((snapshot) => subscription.onStackSnapshot(snapshot));

        // Receiver-side proxy: maps cast RpcEvents back to runtime.handle().
        browserProxy = new BrowserEventProxy(receiverFake, runtime);

        // Flush the deferred initial snapshot that subscribeToStack schedules
        // via setTimeout(0) to dodge React render warnings.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
     });
    it('cast injects "next" → runtime advances AND cast receives a follow-up RpcStackUpdate', () => {
        // Snapshot the cast side's view of the stack pre-event.
        const updatesBefore = browserFake
            .filter('rpc-stack-update')
            .filter((m) => m.snapshotType !== 'initial').length;

        // Cast side sends a "next" event. The browser proxy receives it via
        // the receiver fake and calls runtime.handle({ name: 'next', ... }).
        const nextEvent: RpcEvent = {
            type: 'rpc-event',
            name: 'next',
            timestamp: 0,
        };
        receiverFake.send(nextEvent);

        // 1. Cast side received at least one follow-up RpcStackUpdate.
        const updatesAfter = browserFake
            .filter('rpc-stack-update')
            .filter((m) => m.snapshotType !== 'initial');
        expect(updatesAfter.length).toBeGreaterThan(updatesBefore);

        // 2. At least one structural change (push or pop) reached the cast side.
        const hasStructuralChange = updatesAfter.some(
            (m) => m.snapshotType === 'push' || m.snapshotType === 'pop',
        );
        expect(hasStructuralChange).toBe(true);
    });

    it('RpcEvent.data flows through unknown → runtime.handle without crashing', () => {
        // RpcEvent.data is unknown. A non-null payload verifies the
        // unknown → IEvent.data path is wired without runtime-side crashes.
        const eventWithData: RpcEvent = {
            type: 'rpc-event',
            name: 'noop',
            timestamp: 0,
            data: { arbitrary: 'payload', count: 42 },
        };
        expect(() => receiverFake.send(eventWithData)).not.toThrow();
    });
});
