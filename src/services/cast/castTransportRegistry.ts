/**
 * castTransportRegistry — process-wide holder for the active cast session's
 * RPC transport.
 *
 * `CastButtonRpc` owns the session (transport created on the user's cast
 * gesture) and registers it here on connect / clears it on disconnect. The
 * `CastTransportContext` provider wraps only the cast button itself, so React
 * consumers elsewhere in the tree (the `/run` inline timer in
 * `RuntimeTimerPanel`, the cast bridges) cannot read the transport from
 * context — this registry is the seam that reaches them. (#704)
 *
 * Listeners let a component react to cast connect/disconnect without polling.
 */

import type { IRpcTransport } from '@/services/cast/rpc/IRpcTransport';

let activeTransport: IRpcTransport | null = null;
const listeners = new Set<(transport: IRpcTransport | null) => void>();

export function setActiveCastTransport(transport: IRpcTransport | null): void {
    if (activeTransport === transport) return;
    activeTransport = transport;
    listeners.forEach((listener) => listener(activeTransport));
}

export function getActiveCastTransport(): IRpcTransport | null {
    return activeTransport;
}

/** Subscribe to transport changes. Returns an unsubscribe function. */
export function onCastTransportChange(
    listener: (transport: IRpcTransport | null) => void,
): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
