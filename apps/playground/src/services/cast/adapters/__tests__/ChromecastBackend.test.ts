import { describe, it, expect, beforeEach, mock } from 'bun:test';

// ── Controllable ChromecastSdk fake ─────────────────────────────────────────
type SdkState = 'not-loaded' | 'loading' | 'unavailable' | 'ready' | 'session-active';
type Listener = (...args: unknown[]) => void;

interface SessionStub {
    sendMessage: (namespace: string, message: unknown) => Promise<void>;
}

const sdk = {
    state: 'not-loaded' as SdkState,
    loadImpl: null as null | (() => Promise<void>),
    requestSessionImpl: null as null | (() => Promise<void>),
    session: { sendMessage: async () => {} } as SessionStub,
    listeners: new Map<string, Set<Listener>>(),
    reset() {
        this.state = 'not-loaded';
        this.loadImpl = null;
        this.requestSessionImpl = null;
        this.session = { sendMessage: async () => {} };
        this.listeners.clear();
    },
    emit(event: string, ...args: unknown[]) {
        this.listeners.get(event)?.forEach((l) => l(...args));
    },
};

mock.module('../../ChromecastSdk', () => ({
    ChromecastSdk: {
        getState: () => sdk.state,
        load: () => (sdk.loadImpl ? sdk.loadImpl() : Promise.reject(new Error('load not stubbed'))),
        requestSession: () =>
            sdk.requestSessionImpl
                ? sdk.requestSessionImpl()
                : Promise.reject(new Error('requestSession not stubbed')),
        getSession: () => sdk.session,
        endSession: () => {},
        on: (event: string, listener: Listener) => {
            if (!sdk.listeners.has(event)) sdk.listeners.set(event, new Set());
            sdk.listeners.get(event)!.add(listener);
            return () => sdk.listeners.get(event)?.delete(listener);
        },
    },
}));

// ── Transport fake shared with the mocked class ─────────────────────────────
class TransportStub {
    connectImpl: () => Promise<void> = async () => {};
    disposed = 0;
    connect() {
        return this.connectImpl();
    }
    dispose() {
        this.disposed += 1;
    }
    onDisconnected() {
        return () => {};
    }
}
let transport = new TransportStub();

mock.module('../../rpc/WebRtcRpcTransport', () => ({
    WebRtcRpcTransport: class {
        connect() {
            return transport.connectImpl();
        }
        dispose() {
            transport.disposed += 1;
        }
        onDisconnected() {
            return () => {};
        }
    },
}));

mock.module('../../CastSignaling', () => ({
    SenderCastSignaling: class {},
}));

mock.module('../../config', () => ({
    CAST_APP_ID: 'TESTAPP01',
    hasCustomCastAppId: true,
}));

// Dynamic import is required: bun's mock.module must be registered before the
// module under test loads, and a static import would hoist above the mocks.
const { ChromecastBackend } = await import('../ChromecastBackend');

describe('ChromecastBackend failure recovery', () => {
    beforeEach(() => {
        sdk.reset();
        transport = new TransportStub();
    });

    it('returns to ready and allows retry when requestSession fails (session_error)', async () => {
        sdk.state = 'ready';
        sdk.loadImpl = async () => {
            sdk.state = 'ready';
        };
        sdk.requestSessionImpl = () => Promise.reject(new Error('Cast session request failed: session_error'));

        const backend = new ChromecastBackend();
        await expect(backend.startSession()).rejects.toThrow('session_error');
        expect(backend.state).toBe('ready');

        // The button must be usable again: a retry goes through the whole flow.
        sdk.requestSessionImpl = async () => {
            sdk.state = 'session-active';
        };
        await expect(backend.startSession()).resolves.toBeDefined();
        expect(backend.state).toBe('session-active');
        backend.dispose();
    });

    it('disposes the half-built transport and resets when the handshake fails', async () => {
        sdk.state = 'ready';
        sdk.loadImpl = async () => {
            sdk.state = 'ready';
        };
        sdk.requestSessionImpl = async () => {
            sdk.state = 'session-active';
        };
        transport.connectImpl = () => Promise.reject(new Error('TIMEOUT after 15000ms'));

        const backend = new ChromecastBackend();
        await expect(backend.startSession()).rejects.toThrow('TIMEOUT');
        expect(transport.disposed).toBe(1);
        expect(backend.state).toBe('ready');
        backend.dispose();
    });

    it('lets a CAF no-session recovery event reset the connecting state', async () => {
        sdk.state = 'ready';
        sdk.loadImpl = async () => {
            sdk.state = 'ready';
        };
        // Picker opened, launch never completes — startSession stays pending.
        sdk.requestSessionImpl = () => new Promise<void>(() => {});

        const backend = new ChromecastBackend();
        // startSession is intentionally left pending: the launch never
        // completes, which is the stuck-'connecting' scenario under test.
        const pending = backend.startSession();
        void pending.catch(() => {}); // may never settle; silence rejection noise
        expect(backend.state).toBe('connecting');

        // CAF emits NO_SESSION (SDK maps it to 'ready') when the launch fails.
        sdk.emit('state-changed', 'ready');
        expect(backend.state).toBe('ready');
        backend.dispose();
    });
});
