/**
 * LocalReceiverBackend — receiver-side adapter for the local-tab dual-pane mirror.
 *
 * On the receiver side, this is the mirror of `LocalTabBackend` (the
 * sender-side adapter). Where the sender's local adapter opens a popup
 * tab, the receiver's local adapter *is* the popup tab — it acquires the
 * `MessagePort` the sender transferred, hands it to a
 * `BroadcastChannelRpcTransport`, and uses that as the transport for the
 * rest of the receiver-side cast stack.
 *
 * The receiver React app (`receiver-rpc.tsx`) detects `?local=<id>` in
 * the URL and dispatches to this adapter instead of booting CAF.
 *
 * Handshake shape (matches `LocalTabBackend`):
 *  1. The popup mounts and opens the control channel.
 *  2. The popup waits for the sender's `{ kind: 'offer' }` packet.
 *  3. The popup attaches a `window.message` listener and posts
 *     `{ kind: 'ready' }` on the control channel (signaling that the
 *     listener is ready to receive the data-port transfer).
 *  4. The popup waits for the data-port message from the sender.
 *  5. The popup takes `event.ports[0]` as the data port, wraps it in a
 *     `BroadcastChannelRpcTransport`, and posts `{ kind: 'accept' }` on
 *     the control channel.
 *  6. The popup resolves the session to the React tree.
 *
 * Why post `ready` *after* attaching the window.message listener?
 * ---------------------------------------------------------------
 * `window.open` returns synchronously, *before* the popup has loaded
 * its scripts. The sender's `popup.postMessage(data-port, ...)` would
 * be lost if the popup's listener isn't attached yet. We reverse the
 * handshake so the receiver attaches the listener, then signals "ready"
 * to the sender, which then transfers the port. No race.
 *
 * If the popup never completes the handshake (sender side failed, popup
 * opened by mistake), the receiver surfaces an error to the React tree
 * rather than crashing.
 */

import { BroadcastChannelRpcTransport } from '../rpc/BroadcastChannelRpcTransport';
import type { IRpcTransport } from '../rpc/IRpcTransport';

export const LOCAL_RECEIVER_HANDSHAKE_TIMEOUT_MS = 5_000;

type ControlPacket = { kind: 'offer' | 'ready' | 'accept' | 'goodbye'; sessionId: string };

export interface LocalReceiverSessionResult {
    transport: IRpcTransport;
    /** Tear down the control channel; called by the receiver React app on unmount. */
    dispose: () => void;
}

export interface LocalReceiverSessionOptions {
    /** Session id from the `?local=<id>` query param. */
    sessionId: string;
    /** Override the window message listener (default: real `window`). */
    windowLike?: Window;
    /** Override BroadcastChannel constructor (default: real). */
    createBroadcastChannel?: (name: string) => BroadcastChannelLike;
    /** Override setTimeout (default: real). */
    setTimeoutFn?: (handler: () => void, ms: number) => unknown;
    clearTimeoutFn?: (handle: unknown) => void;
    /** Wait this long for the sender's offer before failing. */
    timeoutMs?: number;
}

export interface BroadcastChannelLike {
    postMessage(message: unknown): void;
    addEventListener(type: 'message', handler: (event: { data: unknown }) => void): void;
    removeEventListener(type: 'message', handler: (event: { data: unknown }) => void): void;
    close(): void;
}

/**
 * Acquire a `BroadcastChannelRpcTransport` from the sender's popup opener.
 * Resolves once the data port is paired and the BroadcastChannel handshake
 * is complete. Rejects if the sender never posts the offer within the
 * configured timeout, or if any other step of the handshake fails.
 */
export async function acquireLocalReceiverSession(
    options: LocalReceiverSessionOptions,
): Promise<LocalReceiverSessionResult> {
    const {
        sessionId,
        windowLike = (typeof window !== 'undefined' ? window : undefined) as unknown as Window,
        createBroadcastChannel = (name) => new BroadcastChannel(name) as unknown as BroadcastChannelLike,
        setTimeoutFn = (handler, ms) => setTimeout(handler, ms),
        clearTimeoutFn = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
        timeoutMs = LOCAL_RECEIVER_HANDSHAKE_TIMEOUT_MS,
    } = options;

    if (!windowLike) {
        throw new Error('LocalReceiverBackend: no window available');
    }

    // Step 1: open the control channel and wait for the sender's `offer`.
    const control = createBroadcastChannel(`wodwiki-local-${sessionId}`);

    await new Promise<void>((resolve, reject) => {
        const onControlMessage = (event: { data: unknown }): void => {
            const packet = event.data as ControlPacket;
            if (!packet || typeof packet !== 'object' || typeof packet.kind !== 'string') return;
            if (packet.sessionId !== sessionId) return;
            if (packet.kind === 'offer') {
                control.removeEventListener('message', onControlMessage);
                clearTimeoutFn(timer);
                resolve();
            } else if (packet.kind === 'goodbye') {
                control.removeEventListener('message', onControlMessage);
                clearTimeoutFn(timer);
                reject(new Error('LocalReceiverBackend: sender said goodbye before handshake completed'));
            }
        };
        control.addEventListener('message', onControlMessage);
        const timer = setTimeoutFn(() => {
            control.removeEventListener('message', onControlMessage);
            reject(new Error(`LocalReceiverBackend: sender did not post offer within ${timeoutMs}ms`));
        }, timeoutMs);
    });

    // Step 2: attach the window.message listener for the data-port
    // transfer, then post `ready` on the control channel. The sender
    // transfers the port only after it sees `ready`, so by the time
    // the port arrives the listener is already in place.
    const dataPort = await new Promise<MessagePort>((resolve, reject) => {
        const onMessage = (event: MessageEvent): void => {
            const packet = event.data as { kind?: string; port?: unknown };
            if (packet && packet.kind === 'data-port' && packet.port) {
                windowLike.removeEventListener('message', onMessage);
                clearTimeoutFn(timer);
                resolve(packet.port as MessagePort);
            }
        };
        windowLike.addEventListener('message', onMessage);
        const timer = setTimeoutFn(() => {
            windowLike.removeEventListener('message', onMessage);
            reject(new Error(`LocalReceiverBackend: sender did not transfer data port within ${timeoutMs}ms`));
        }, timeoutMs);

        // Listener is attached — signal readiness to the sender.
        try {
            control.postMessage({ kind: 'ready', sessionId } satisfies ControlPacket);
        } catch (err) {
            windowLike.removeEventListener('message', onMessage);
            clearTimeoutFn(timer);
            reject(err instanceof Error ? err : new Error(String(err)));
        }
    });

    // Step 3: wrap the data port in a transport and post `accept`.
    const transport = new BroadcastChannelRpcTransport(dataPort);
    transport.start();
    control.postMessage({ kind: 'accept', sessionId } satisfies ControlPacket);

    // Step 4: handle future goodbye (sender-side teardown).
    const onGoodbye = (event: { data: unknown }): void => {
        const packet = event.data as ControlPacket;
        if (packet && packet.kind === 'goodbye' && packet.sessionId === sessionId) {
            transport.notifyDisconnected();
        }
    };
    control.addEventListener('message', onGoodbye);

    return {
        transport,
        dispose: () => {
            control.removeEventListener('message', onGoodbye);
            try { control.close(); } catch { /* ignore */ }
            transport.dispose();
        },
    };
}

/**
 * Read the local session id from the popup's URL. Returns null if the URL
 * does not carry a `?local=<id>` query param.
 */
export function readLocalSessionIdFromUrl(search: string = (typeof window !== 'undefined' ? window.location.search : '')): string | null {
    const params = new URLSearchParams(search);
    return params.get('local');
}
