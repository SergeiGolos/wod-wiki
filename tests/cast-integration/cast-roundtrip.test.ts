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
import { NextEvent } from '@/runtime/events/NextEvent';
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
            // CastButtonRpc maps cast event names to runtime-side handles.
            // 'next' is the canonical advance; the production call site
            // (useWorkbenchRuntime.ts) uses new NextEvent(undefined, runtime.nowProvider).
            // We do the same here so the test exercises the same code path.
            if (msg.name === 'next') {
                this.runtime.handle(new NextEvent(undefined, this.runtime.nowProvider));
                return;
            }
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

const SCRIPT = `
# Cast Roundtrip Test

## Timer
*:30 Run
`;

describe('cast roundtrip integration', () => {
    let runtime: ScriptRuntime;
    let subscription: ChromecastRuntimeSubscription;
    let browserFake: FakeRpcTransport;
    let receiverFake: FakeRpcTransport;
    let browserProxy: BrowserEventProxy;

    beforeEach(async () => {
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

        subscription = new ChromecastRuntimeSubscription(browserFake);
        runtime.subscribeToStack((snapshot) => subscription.onStackSnapshot(snapshot));
        // The proxy listens on the BROWSER-side transport — that's where
        // cast-bound RpcEvents arrive (paired send from receiverFake routes
        // to browserFake.messageHandlers). CastButtonRpc does the same in
        // production, but inside a Zustand store.
        browserProxy = new BrowserEventProxy(browserFake, runtime);

        // Flush the deferred initial snapshot that subscribeToStack schedules
        // via setTimeout(0) to dodge React render warnings in production.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    afterEach(() => {
        browserProxy.dispose();
        subscription.dispose();
        runtime.dispose();
        browserFake.dispose();
        receiverFake.dispose();
    });

    it('runtime stack event → cast receives an RpcStackUpdate', () => {
        const stackUpdates = browserFake.filter('rpc-stack-update');
        expect(stackUpdates.length).toBeGreaterThan(0);

        const first = stackUpdates[0] as RpcStackUpdate;
        expect(first.snapshotType).toBe('initial');
        expect(first.depth).toBeGreaterThan(0);
        expect(Array.isArray(first.blocks)).toBe(true);
    });
    it('cast injects "next" → runtime advances AND cast receives a follow-up RpcStackUpdate', async () => {
        const updatesBefore = browserFake
            .filter('rpc-stack-update')
            .filter((m) => m.snapshotType !== 'initial').length;

        const nextEvent: RpcEvent = {
            type: 'rpc-event',
            name: 'next',
            timestamp: 0,
        };
        receiverFake.send(nextEvent);

        // Flush any deferred work the runtime schedules in response to the
        // next event (the stack observer path uses setTimeout(0) too).
        await new Promise<void>((resolve) => setTimeout(resolve, 0));

        const updatesAfter = browserFake
            .filter('rpc-stack-update')
            .filter((m) => m.snapshotType !== 'initial');
        expect(updatesAfter.length).toBeGreaterThan(updatesBefore);

        const hasStructuralChange = updatesAfter.some(
            (m) => m.snapshotType === 'push' || m.snapshotType === 'pop',
        );
        expect(hasStructuralChange).toBe(true);
    });

    it('RpcEvent.data flows through unknown → runtime.handle without crashing', () => {
        const eventWithData: RpcEvent = {
            type: 'rpc-event',
            name: 'noop',
            data: { arbitrary: 'payload', count: 42 },
            timestamp: 0,
        };
        expect(() => receiverFake.send(eventWithData)).not.toThrow();
    });
});
