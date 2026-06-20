import { describe, it, expect, beforeEach } from 'bun:test';
import { LocalTabBackend, LOCAL_HANDSHAKE_TIMEOUT_MS } from '../LocalTabBackend';

interface StubOptions {
    manualTimeout?: { fire: () => void; cancel: () => void };
    openPopupReturns?: Window | null;
    onPopupPostMessage?: (message: unknown) => void;
}

describe('LocalTabBackend', () => {
    let nextSessionId: number;
    let openedUrls: string[];
    let popupStub: Window;
    let registeredHandlers: Array<(event: MessageEvent) => void>;

    beforeEach(() => {
        nextSessionId = 0;
        openedUrls = [];
        popupStub = {} as Window;
        registeredHandlers = [];
    });

    function makeBackend(opts: StubOptions = {}): LocalTabBackend {
        return new LocalTabBackend({
            openPopup: (url) => {
                openedUrls.push(url);
                return opts.openPopupReturns !== undefined ? opts.openPopupReturns : popupStub;
            },
            addEventListener: (handler) => {
                registeredHandlers.push(handler);
                return () => {
                    registeredHandlers = registeredHandlers.filter((h) => h !== handler);
                };
            },
            removeEventListener: (handler) => {
                registeredHandlers = registeredHandlers.filter((h) => h !== handler);
            },
            postToPopup: (popup, message) => {
                opts.onPopupPostMessage?.(message);
            },
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

    it('opens a popup with the receiver URL including the local sessionId', () => {
        const backend = makeBackend();
        const promise = backend.startSession();
        expect(openedUrls).toEqual([`https://app.example.test/receiver-rpc.html?local=s1`]);
        backend.dispose();
        return promise.catch(() => { /* expected: aborted */ });
    });

    it('startSession flips state to "connecting" synchronously', () => {
        const backend = makeBackend();
        const seen: string[] = [];
        backend.onStateChanged((s) => seen.push(s));

        const promise = backend.startSession();
        expect(backend.state).toBe('connecting');
        expect(seen).toContain('connecting');

        backend.dispose();
        return promise.catch(() => { /* expected: aborted */ });
    });

    it('startSession registers a window.message listener', () => {
        const backend = makeBackend();
        const beforeCount = registeredHandlers.length;
        const promise = backend.startSession();
        expect(registeredHandlers.length).toBeGreaterThan(beforeCount);

        backend.dispose();
        return promise.catch(() => { /* expected: aborted */ });
    });

    it('startSession rejects with a timeout error if the receiver never signals ready', async () => {
        const manualTimeout = { fire: () => { /* noop */ }, cancel: () => { /* noop */ } };
        const backend = makeBackend({ manualTimeout });

        const promise = backend.startSession();
        expect(backend.state).toBe('connecting');

        manualTimeout.fire();

        await expect(promise).rejects.toThrow(/receiver did not complete handshake within/);
        expect(backend.state).toBe('session-ended');
    });

    it('startSession ignores messages with a non-matching sessionId', async () => {
        const manualTimeout = { fire: () => { /* noop */ }, cancel: () => { /* noop */ } };
        const backend = makeBackend({ manualTimeout });
        const promise = backend.startSession();

        // Send a message with a wrong sessionId.
        registeredHandlers[registeredHandlers.length - 1]?.({
            data: { kind: 'ready', sessionId: 'wrong-id' },
            source: popupStub,
        } as MessageEvent);

        // The handler should ignore it; the timer should still be live.
        expect(backend.state).toBe('connecting');

        manualTimeout.fire();
        await expect(promise).rejects.toThrow(/receiver did not complete handshake within/);
    });

    it('startSession ignores messages from a different source (not our popup)', async () => {
        const manualTimeout = { fire: () => { /* noop */ }, cancel: () => { /* noop */ } };
        const backend = makeBackend({ manualTimeout });
        const promise = backend.startSession();

        registeredHandlers[registeredHandlers.length - 1]?.({
            data: { kind: 'ready', sessionId: 's1' },
            source: null,
        } as unknown as MessageEvent);

        expect(backend.state).toBe('connecting');
        manualTimeout.fire();
        await expect(promise).rejects.toThrow(/receiver did not complete handshake within/);
    });

    it('endSession on an idle backend is a no-op', () => {
        const backend = makeBackend();
        expect(backend.state).toBe('ready');
        backend.endSession();
        expect(backend.state).toBe('ready');
    });

    it('endSession during "connecting" transitions to "session-ended"', async () => {
        const manualTimeout = { fire: () => { /* noop */ }, cancel: () => { /* noop */ } };
        const backend = makeBackend({ manualTimeout });
        const promise = backend.startSession();
        expect(backend.state).toBe('connecting');

        backend.endSession();
        expect(backend.state).toBe('session-ended');

        manualTimeout.cancel();
        await promise.catch(() => { /* expected: aborted */ });
    });

    it('startSession throws if window.open returns null', () => {
        const backend = new LocalTabBackend({
            openPopup: () => null,
            postToPopup: () => { /* noop */ },
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
        const manualTimeout = { fire: () => { /* noop */ }, cancel: () => { /* noop */ } };
        const backend = makeBackend({ manualTimeout });
        const promise = backend.startSession();
        expect(() => backend.startSession()).toThrow(/already active/);
        manualTimeout.fire();
        await promise.catch(() => { /* expected: timeout */ });
    });

    it('dispose makes further startSession throw', async () => {
        const manualTimeout = { fire: () => { /* noop */ }, cancel: () => { /* noop */ } };
        const backend = makeBackend({ manualTimeout });
        const promise = backend.startSession();
        manualTimeout.fire();
        await promise.catch(() => { /* expected: timeout */ });
        backend.dispose();

        await expect(backend.startSession()).rejects.toThrow(/after dispose/);
    });

    it('unsubscribe removes a state-change listener', async () => {
        const manualTimeout = { fire: () => { /* noop */ }, cancel: () => { /* noop */ } };
        const backend = makeBackend({ manualTimeout });
        const seen: string[] = [];
        const unsub = backend.onStateChanged((s) => seen.push(s));

        const promise = backend.startSession();
        expect(seen).toEqual(['connecting']);

        unsub();
        manualTimeout.fire();
        await promise.catch(() => { /* expected */ });

        expect(seen).toEqual(['connecting']);
    });

    it('exposes the configured handshake timeout as a constant', () => {
        expect(LOCAL_HANDSHAKE_TIMEOUT_MS).toBe(5_000);
    });
});
