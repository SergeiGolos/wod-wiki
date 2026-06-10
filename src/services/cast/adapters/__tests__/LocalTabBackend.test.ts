import { describe, it, expect, beforeEach } from 'bun:test';
import { LocalTabBackend, LOCAL_HANDSHAKE_TIMEOUT_MS } from '../LocalTabBackend';
import { BroadcastChannelRpcTransport } from '../../rpc/BroadcastChannelRpcTransport';
import type { RpcMessage } from '../../rpc/RpcMessages';

const event = (name: string): RpcMessage => ({ type: 'rpc-event', name, timestamp: 0 });

interface StubOptions {
    manualTimeout?: { fire: () => void; cancel: () => void };
    openPopupReturns?: Window | null;
    onTransferDataPort?: (popup: Window, sessionId: string, port: MessagePort) => void;
    captureTransferPort?: (port: MessagePort) => void;
}

describe('LocalTabBackend', () => {
    let nextSessionId: number;
    let openedUrls: string[];
    let popupStub: Window;

    beforeEach(() => {
        nextSessionId = 0;
        openedUrls = [];
        popupStub = {} as Window;
    });

    function makeBackend(opts: StubOptions = {}): LocalTabBackend {
        return new LocalTabBackend({
            openPopup: (url) => {
                openedUrls.push(url);
                return opts.openPopupReturns !== undefined ? opts.openPopupReturns : popupStub;
            },
            transferDataPort: opts.onTransferDataPort
                ?? (opts.captureTransferPort
                    ? (_popup, _sid, port) => { opts.captureTransferPort!(port); }
                    : (() => { /* in-process: no real transfer */ })),
            generateId: () => `s${++nextSessionId}`,
            getOrigin: () => 'https://app.example.test',
            setTimeoutFn: opts.manualTimeout
                ? (handler) => { opts.manualTimeout!.fire = handler as () => void; return 0; }
                : (handler, ms) => setTimeout(handler, ms),
            clearTimeoutFn: opts.manualTimeout
                ? () => { opts.manualTimeout!.cancel(); }
                : (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
        });
    }

    /**
     * Stand up a stub receiver: opens a parallel `BroadcastChannel` on the
     * same name. The test drives the receiver's accept and goodbye by
     * calling the returned helpers. The `sessionId` is captured at
     * construction time so multi-test counter reuse doesn't cause
     * session-id mismatches.
     */
    function standUpReceiver(channelName: string, sessionId: string): {
        triggerGoodbye: () => void;
        postAccept: () => void;
        close: () => void;
    } {
        const receiver = new BroadcastChannel(channelName);
        return {
            triggerGoodbye: () => {
                receiver.postMessage({ kind: 'goodbye', sessionId });
            },
            postAccept: () => {
                receiver.postMessage({ kind: 'accept', sessionId });
            },
            close: () => { receiver.close(); },
        };
    }

    it('opens a popup with the receiver URL including the local sessionId', () => {
        const backend = makeBackend();
        const promise = backend.startSession();
        // The URL is captured synchronously during startSession's prologue.
        expect(openedUrls).toEqual([`https://app.example.test/receiver-rpc.html?local=s1`]);
        // Abort the test by disposing (which clears the timeout and closes
        // the popup and channel).
        backend.dispose();
        return promise.catch(() => { /* expected: aborted */ });
    });

    it('startSession flips state to "connecting" synchronously, then "session-active" on accept', async () => {
        const backend = makeBackend();
        const seen: string[] = [];
        backend.onStateChanged((s) => seen.push(s));

        const promise = backend.startSession();
        expect(backend.state).toBe('connecting');
        expect(seen).toContain('connecting');

        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        await new Promise((r) => setTimeout(r, 5));
        receiver.postAccept();

        const transport = await promise;
        expect(backend.state).toBe('session-active');
        expect(transport).toBeInstanceOf(BroadcastChannelRpcTransport);
        expect(transport.connected).toBe(true);

        receiver.close();
        backend.dispose();
    });

    it('startSession returns a working transport whose send reaches the paired MessagePort', async () => {
        let receiverPort: MessagePort | null = null;
        const backend = new LocalTabBackend({
            openPopup: (url) => { openedUrls.push(url); return popupStub; },
            transferDataPort: (_popup, _sid, port) => { receiverPort = port; },
            generateId: () => 's1',
            getOrigin: () => 'https://app.example.test',
            setTimeoutFn: (handler, ms) => setTimeout(handler, ms),
            clearTimeoutFn: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
        });

        const promise = backend.startSession();
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        await new Promise((r) => setTimeout(r, 5));
        receiver.postAccept();

        const transport = (await promise) as BroadcastChannelRpcTransport;
        expect(receiverPort).not.toBeNull();
        const received: unknown[] = [];
        receiverPort!.addEventListener('message', (e) => received.push(e.data));
        receiverPort!.start();

        transport.send({ type: 'rpc-dispose' });
        transport.send(event('hello'));

        await new Promise((r) => setTimeout(r, 10));
        expect(received).toEqual([{ type: 'rpc-dispose' }, event('hello')]);

        receiver.close();
        backend.dispose();
    });

    it('startSession rejects with a timeout error if the receiver never accepts', async () => {
        const manualTimeout = { fire: () => { /* noop */ }, cancel: () => { /* noop */ } };
        const backend = makeBackend({ manualTimeout });

        const promise = backend.startSession();
        expect(backend.state).toBe('connecting');

        manualTimeout.fire();

        await expect(promise).rejects.toThrow(/receiver did not accept within/);
        expect(backend.state).toBe('session-ended');
    });


    it('endSession posts goodbye and tears down the transport', async () => {
        const backend = makeBackend();
        const promise = backend.startSession();
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        await new Promise((r) => setTimeout(r, 5));
        receiver.postAccept();

        const transport = (await promise) as BroadcastChannelRpcTransport;
        let disconnectedFired = 0;
        transport.onDisconnected(() => { disconnectedFired++; });

        const seen: string[] = [];
        backend.onStateChanged((s) => seen.push(s));

        backend.endSession();

        expect(transport.connected).toBe(false);
        expect(backend.state).toBe('session-ended');
        expect(disconnectedFired).toBeGreaterThanOrEqual(1);
        expect(seen).toContain('session-ended');

        receiver.close();
    });

    it('goodbye from receiver flips state to "session-ended"', async () => {
        const backend = makeBackend();
        const promise = backend.startSession();
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        await new Promise((r) => setTimeout(r, 5));
        receiver.postAccept();

        const transport = (await promise) as BroadcastChannelRpcTransport;
        expect(backend.state).toBe('session-active');

        const seen: string[] = [];
        backend.onStateChanged((s) => seen.push(s));

        receiver.triggerGoodbye();
        await new Promise((r) => setTimeout(r, 10));

        expect(backend.state).toBe('session-ended');
        expect(transport.connected).toBe(false);
        expect(seen).toContain('session-ended');

        receiver.close();
        backend.dispose();
    });

    it('startSession throws if window.open returns null', () => {
        const backend = new LocalTabBackend({
            openPopup: () => null,
            transferDataPort: () => { /* noop */ },
            generateId: () => 'never',
            getOrigin: () => 'https://x',
            setTimeoutFn: () => 0,
            clearTimeoutFn: () => { /* noop */ },
        });

        const promise = backend.startSession();
        return promise.then(
            () => { throw new Error('should have rejected'); },
            (err: unknown) => {
                expect((err as Error).message).toMatch(/popup blocked/);
            },
        );
    });

    it('startSession throws when called twice without endSession', async () => {
        const backend = makeBackend();
        const promise = backend.startSession();
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        await new Promise((r) => setTimeout(r, 5));
        receiver.postAccept();
        await promise;

        await expect(backend.startSession()).rejects.toThrow(/already active/);

        receiver.close();
        backend.dispose();
    });

    it('dispose makes further startSession throw', async () => {
        const backend = makeBackend();
        const promise = backend.startSession();
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        await new Promise((r) => setTimeout(r, 5));
        receiver.postAccept();
        await promise;
        receiver.close();
        backend.dispose();

        await expect(backend.startSession()).rejects.toThrow(/after dispose/);
    });

    it('unsubscribe removes a state-change listener', async () => {
        const backend = makeBackend();
        const seen: string[] = [];
        const unsub = backend.onStateChanged((s) => seen.push(s));

        const promise = backend.startSession();
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        await new Promise((r) => setTimeout(r, 5));
        receiver.postAccept();
        await promise;

        // The listener was registered before startSession, so 'connecting'
        // and 'session-active' are both captured.
        expect(seen).toEqual(['connecting', 'session-active']);

        unsub();
        receiver.triggerGoodbye();
        await new Promise((r) => setTimeout(r, 10));

        // No additional state captured.
        expect(seen).toEqual(['connecting', 'session-active']);

        receiver.close();
        backend.dispose();
    });

    it('exposes the configured handshake timeout as a constant', () => {
        expect(LOCAL_HANDSHAKE_TIMEOUT_MS).toBe(5_000);
    });
});
