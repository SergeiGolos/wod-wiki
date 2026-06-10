/**
 * CastTransportContext — provides the active cast `IRpcTransport` to
 * the bridges that read it.
 *
 * Before this context existed, the cast transport was held in the
 * workbench sync store (`workbenchSyncStore.castTransport`). The
 * store had accumulated cast plumbing that didn't belong there —
 * specifically, the goal of letting `WorkbenchCastBridge` and
 * `EditorCastBridge` observe the transport without prop-drilling
 * through a tree that may not even be cast-aware.
 *
 * The cleaner seam: `CastButtonRpc` is always mounted in the tree
 * above the bridges. It owns the cast lifecycle and exposes the
 * transport via context. The bridges consume it from context, the
 * same React-native mechanism they already use for everything else.
 *
 * The transport is also exposed (for one-shot writes) via
 * `useWorkbenchSyncStore.getState().castTransport` in code paths
 * that need a synchronous read outside React's render cycle (e.g.
 * the inline `RuntimeTimerPanel` sending a completion message).
 * That field is kept as a one-shot accessor — the store is no
 * longer the cast's source of truth.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { IRpcTransport } from '@/services/cast/rpc/IRpcTransport';

interface CastTransportContextValue {
    /** The active cast transport, or `null` when not casting. */
    transport: IRpcTransport | null;
}

const defaultContext: CastTransportContextValue = { transport: null };

const CastTransportContext = createContext<CastTransportContextValue>(defaultContext);

/**
 * Hook to access the active cast transport.
 *
 * Returns `null` when the user is not casting — callers should
 * gate on this before invoking any transport methods.
 */
export function useCastTransport(): IRpcTransport | null {
    return useContext(CastTransportContext).transport;
}

export interface CastTransportProviderProps {
    children: React.ReactNode;
    /** The active cast transport; `null` when not casting. */
    transport: IRpcTransport | null;
}

/**
 * Provider component for the cast transport context.
 *
 * Mounted by `CastButtonRpc` immediately above the children it
 * renders. The bridge components (`WorkbenchCastBridge`,
 * `EditorCastBridge`) live somewhere in that subtree and read the
 * transport via `useCastTransport()`.
 */
export const CastTransportProvider: React.FC<CastTransportProviderProps> = ({
    children,
    transport,
}) => {
    // Memoize the context value so consumers don't re-render when
    // a sibling state change updates the parent. The transport ref
    // is stable; the value only changes when the transport itself
    // changes (cast on/off).
    const value = useMemo(() => ({ transport }), [transport]);
    return (
        <CastTransportContext.Provider value={value}>
            {children}
        </CastTransportContext.Provider>
    );
};
