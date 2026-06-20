/**
 * LocalReceiverBackend — receiver-side adapter for the local-tab dual-pane mirror.
 *
 * On the receiver side, this is the mirror of `LocalTabBackend`. The
 * sender's local adapter opens this popup tab; we acquire the
 * `MessagePort` the sender transferred, hand it to a
 * `BroadcastChannelRpcTransport`, and use that as the transport for
 * the rest of the receiver-side cast stack.
 *
 * Handshake shape — uses `Window.postMessage` to talk to the opener:
 *  1. The popup mounts and listens on `window.addEventListener('message', ...)`
 *     for the sender's `{ kind: 'data-port' }` packet.
 *  2. The popup posts `{ kind: 'ready' }` to the opener via
 *     `window.opener.postMessage`, signaling that the data-port listener
 *     is attached and the sender can proceed.
 *  3. The popup waits for the sender's data-port transfer. The sender
 *     posts it on receipt of `ready`.
 *  4. The popup takes `event.ports[0]` from the data-port transfer,
 *     wraps it in a `BroadcastChannelRpcTransport`, and posts
 *     `{ kind: 'accept' }` to the opener.
 *  5. The popup resolves the session to the React tree.
 *
 * Why `postMessage` and not `BroadcastChannel`?
 * -----------------------------------------------
 * `BroadcastChannel` is supposed to work between same-origin browsing
 * contexts (a window and its popup), but in practice the popup's
 * React app mounts *after* the sender posts the offer, and the
 * `BroadcastChannel` listener is attached in a different event loop
 * tick than the sender's post. The queued message is dropped.
 *
 * `Window.postMessage` is the most reliable inter-context message
 * path. The popup has `window.opener`; the opener has the popup
 * reference from `window.open`. Both use the same `addEventListener`
 * API, with the same IPC layer regardless of event loop scheduling.
 */

import { BroadcastChannelRpcTransport } from '../rpc/BroadcastChannelRpcTransport';
import type { IRpcTransport } from '../rpc/IRpcTransport';

export const LOCAL_RECEIVER_HANDSHAKE_TIMEOUT_MS = 5_000;

export interface LocalReceiverSessionResult {
    transport: IRpcTransport;
    dispose: () => void;
}

export interface LocalReceiverSessionOptions {
    sessionId: string;
    windowLike?: Window;
    addEventListener?: (handler: (event: MessageEvent) => void) => () => void;
    postToOpener?: (message: unknown) => void;
    setTimeoutFn?: (handler: () => void, ms: number) => unknown;
    clearTimeoutFn?: (handle: unknown) => void;
    timeoutMs?: number;
}

/**
 * Acquire a `BroadcastChannelRpcTransport` from the sender's popup opener.
 * Resolves once the data port is paired and the postMessage handshake is
 * complete. Rejects on timeout or handshake failure.
 */
export async function acquireLocalReceiverSession(
    options: LocalReceiverSessionOptions,
): Promise<LocalReceiverSessionResult> {
    const {
        sessionId,
        windowLike = (typeof window !== 'undefined' ? window : undefined) as unknown as Window,
        addEventListener = (handler) => {
            window.addEventListener('message', handler);
            return () => window.removeEventListener('message', handler);
        },
        postToOpener = (message) => {
            if (window.opener) {
                window.opener.postMessage(message, '*');
            }
        },
        setTimeoutFn = (handler, ms) => setTimeout(handler, ms),
        clearTimeoutFn = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
        timeoutMs = LOCAL_RECEIVER_HANDSHAKE_TIMEOUT_MS,
    } = options;

    if (!windowLike) {
        throw new Error('LocalReceiverBackend: no window available');
    }
    // Step 1: attach the window.message listener.
    // Step 2: post `ready` so the sender knows the listener is in place
    //         and can safely transfer the data port.
    // Step 3: wait for the data-port message (which arrives after the
    //         sender sees `ready`).
    console.log('[LocalReceiverBackend] starting handshake', { sessionId });

    // Use a one-shot listener that resolves when the data port arrives.
    // We store the resolver so the listener (registered below) can
    // call it from outside the `new Promise` closure.
    let resolveDataPort!: (port: MessagePort) => void;
    let rejectDataPort!: (err: Error) => void;
    const dataPortPromise = new Promise<MessagePort>((resolve, reject) => {
        resolveDataPort = resolve;
        rejectDataPort = reject;
    });
    let unregisterDataPort: (() => void) | null = null;
    let timer: unknown = null;
    unregisterDataPort = addEventListener((event: MessageEvent) => {
        const data = event.data as { kind?: string; sessionId?: string; port?: unknown } | undefined;
        if (!data || typeof data !== 'object' || typeof data.kind !== 'string') return;
        if (data.sessionId !== sessionId) return;
        if (data.kind === 'data-port' && event.ports?.[0]) {
            console.log('[LocalReceiverBackend] received data port', { sessionId });
            unregisterDataPort?.();
            clearTimeoutFn(timer);
            resolveDataPort(event.ports[0]);
        } else if (data.kind === 'goodbye') {
            unregisterDataPort?.();
            clearTimeoutFn(timer);
            rejectDataPort(new Error('LocalReceiverBackend: sender said goodbye before handshake completed'));
        }
    });
    timer = setTimeoutFn(() => {
        unregisterDataPort?.();
        rejectDataPort(new Error(`LocalReceiverBackend: sender did not transfer data port within ${timeoutMs}ms`));
    }, timeoutMs);

    // Listener is up — signal readiness. The sender, on receiving
    // `ready`, transfers the data port via `popup.postMessage(...)` —
    // the listener above receives it.
    postToOpener({ kind: 'ready', sessionId });
    console.log('[LocalReceiverBackend] posted ready', { sessionId });

    const dataPort = await dataPortPromise;


    // Wrap the data port in a transport and confirm acceptance.
    const transport = new BroadcastChannelRpcTransport(dataPort);
    transport.start();
    postToOpener({ kind: 'accept', sessionId });

    // Handle future goodbye from the sender.
    const onGoodbye = (event: MessageEvent): void => {
        const data = event.data as { kind?: string; sessionId?: string } | undefined;
        if (data && data.kind === 'goodbye' && data.sessionId === sessionId) {
            transport.notifyDisconnected();
        }
    };
    const unsubGoodbye = addEventListener(onGoodbye);

    return {
        transport,
        dispose: () => {
            unsubGoodbye();
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

