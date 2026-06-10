import { describe, it, expect, beforeEach } from 'bun:test';
import { LocalTabBackend, LOCAL_HANDSHAKE_TIMEOUT_MS } from '../LocalTabBackend';
import { BroadcastChannelRpcTransport } from '../../rpc/BroadcastChannelRpcTransport';
import type { RpcMessage } from '../../rpc/RpcMessages';

const event = (name: string): RpcMessage => ({ type: 'rpc-event', name, timestamp: 0 });

interface StubOptions {
    manualTimeout?: { fire: () => void; cancel: () => void };
    openPopupReturns?: Window | null;
    captureTransferPort?: (port: MessagePort) => void;
}

interface ReceiverStub {
    triggerGoodbye: () => void;
    close: () => void;
    /** Called by the test's captureTransferPort callback when the sender transfers the data port. */
    onPortCaptured: (port: MessagePort) => void;
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
            transferDataPort: opts.captureTransferPort
                ? (_popup, _sid, port) => { opts.captureTransferPort!(port); }
                : (() => { /* in-process: no real transfer */ }),
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
     * Stand up a stub receiver that participates in the four-step
     * handshake: listens for `offer`, posts `ready`, and (when the test
     * calls `onPortCaptured`) posts `accept` to complete the handshake.
     */
    function standUpReceiver(channelName: string, sessionId: string): ReceiverStub {
        const receiver = new BroadcastChannel(channelName);

        receiver.addEventListener('message', (e) => {
            const packet = e.data as { kind?: string; sessionId?: string };
            if (packet.kind === 'offer' && packet.sessionId === sessionId) {
                receiver.postMessage({ kind: 'ready', sessionId });
            }
        });

        return {
            triggerGoodbye: () => {
                receiver.postMessage({ kind: 'goodbye', sessionId });
            },
            close: () => { receiver.close(); },
            onPortCaptured: () => {
                // The test's captureTransferPort callback (called when the
                // sender transfers the data port) hands us the port via
                // this method. We post `accept` to complete the handshake.
                // The setTimeout lets the test register listeners on the
                // port before the sender flips state.
                setTimeout(() => {
                    receiver.postMessage({ kind: 'accept', sessionId });
                }, 0);
            },
        };
    }

    it('opens a popup with the receiver URL including the local sessionId', () => {
        const backend = makeBackend();
        const promise = backend.startSession();
        // The URL is captured synchronously during startSession's prologue.
        expect(openedUrls).toEqual([`https://app.example.test/receiver-rpc.html?local=s1`]);
        // Abort the test by disposing (which clears the timeout).
        backend.dispose();
        return promise.catch(() => { /* expected: aborted */ });
    });

    it('startSession flips state to "connecting" synchronously, then "session-active" on accept', async () => {
        // Build the receiver *first* so we can wire its onPortCaptured
        // callback into the backend's captureTransferPort dep.
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        const backend = makeBackend({
            captureTransferPort: (port) => receiver.onPortCaptured(port),
        });
        const seen: string[] = [];
        backend.onStateChanged((s) => seen.push(s));

        const promise = backend.startSession();
        expect(backend.state).toBe('connecting');
        expect(seen).toContain('connecting');

        // Wait for the offer → ready → capture-port → accept cycle.
        await new Promise((r) => setTimeout(r, 10));

        const transport = await promise;
        expect(backend.state).toBe('session-active');
        expect(transport).toBeInstanceOf(BroadcastChannelRpcTransport);
        expect(transport.connected).toBe(true);

        receiver.close();
        backend.dispose();
    });

    it('startSession returns a working transport whose send reaches the paired MessagePort', async () => {
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        let receiverPort: MessagePort | null = null;
        const backend = makeBackend({
            captureTransferPort: (port) => {
                receiverPort = port;
                receiver.onPortCaptured(port);
            },
        });

        const promise = backend.startSession();
        await new Promise((r) => setTimeout(r, 10));

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

        await expect(promise).rejects.toThrow(/receiver did not complete handshake within/);
        expect(backend.state).toBe('session-ended');
    });

    it('endSession posts goodbye and tears down the transport', async () => {
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        const backend = makeBackend({
            captureTransferPort: (port) => receiver.onPortCaptured(port),
        });
        const promise = backend.startSession();
        await new Promise((r) => setTimeout(r, 10));

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
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        const backend = makeBackend({
            captureTransferPort: (port) => receiver.onPortCaptured(port),
        });
        const promise = backend.startSession();
        await new Promise((r) => setTimeout(r, 10));

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
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        const backend = makeBackend({
            captureTransferPort: (port) => receiver.onPortCaptured(port),
        });
        const promise = backend.startSession();
        await new Promise((r) => setTimeout(r, 10));
        await promise;

        await expect(backend.startSession()).rejects.toThrow(/already active/);

        receiver.close();
        backend.dispose();
    });

    it('dispose makes further startSession throw', async () => {
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        const backend = makeBackend({
            captureTransferPort: (port) => receiver.onPortCaptured(port),
        });
        const promise = backend.startSession();
        await new Promise((r) => setTimeout(r, 10));
        await promise;
        receiver.close();
        backend.dispose();

        await expect(backend.startSession()).rejects.toThrow(/after dispose/);
    });

    it('unsubscribe removes a state-change listener', async () => {
        const receiver = standUpReceiver('wodwiki-local-s1', 's1');
        const backend = makeBackend({
            captureTransferPort: (port) => receiver.onPortCaptured(port),
        });
        const seen: string[] = [];
        const unsub = backend.onStateChanged((s) => seen.push(s));

        const promise = backend.startSession();
        await new Promise((r) => setTimeout(r, 10));
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
