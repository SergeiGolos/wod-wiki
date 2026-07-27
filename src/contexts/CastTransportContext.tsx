/**
 * CastTransportContext — provides the active cast `IRpcTransport` to
 * the bridges that read it.
 *
 * `CastButtonRpc` is always mounted in the tree above the bridges. It
 * owns the cast lifecycle and exposes the transport via context. The
 * bridges consume it from context, the same React-native mechanism
 * they already use for everything else.
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
