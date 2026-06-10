/**
 * CastButton — sender-side cast control.
 *
 * The button does not know whether casting is going to a real Chromecast
 * device or to a local-tab dual-pane mirror. It asks `getCastBackend()` for
 * the build's `ICastBackend`, calls `startSession()` from a user gesture,
 * and gets back a connected `IRpcTransport`. The transport is then handed
 * to a `CastSessionManager` (which owns subscription / event provider /
 * clock sync on top of the transport).
 *
 * The active transport is exposed to the rest of the page via
 * `CastTransportContext` (see `CastButtonRpc` return value). The bridge
 * components (`WorkbenchCastBridge`, `EditorCastBridge`) consume it from
 * context rather than the workbench sync store.
 *
 * This is the single seam for "is the cast going to a TV or a popup tab".
 * The chromecast adapter drives the native device picker; the local
 * adapter opens a popup and uses BroadcastChannel + MessageChannel. The
 * rest of the cast stack (subscription, event wiring, workbench sync) is
 * identical for both.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TvMinimal, Cast } from 'lucide-react';
import { Button } from '@/components/atoms/primitives/button';
import { useWorkbenchSyncStore } from '@/stores/workbenchSyncStore';
import {
    CastSessionManager,
    type CastSessionHandle,
    type ICastSubscription,
} from '@/hooks/useCastSignaling';
import { cn } from '@/lib/utils';
import { CastTransportProvider } from '@/contexts/CastTransportContext';
import { ProjectionSyncProvider } from '@/contexts/ProjectionSyncContext';
import { workbenchModeResolver } from '@/app/cast/workbenchModeResolver';
import { getCastBackend } from '@/services/cast/getCastBackend';
import { routeRuntimeEvent } from '@/services/cast/rpc/eventRouter';
import type { ICastBackend, ICastBackendState } from '@/services/cast/ICastBackend';
import type { IRpcTransport } from '@/services/cast/rpc/IRpcTransport';

export const CastButtonRpc: React.FC = () => {
    const backend: ICastBackend = getCastBackend();
    const [backendState, setBackendState] = useState<ICastBackendState>(backend.state);
    const [isCasting, setIsCasting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [sessionSubscription, setSessionSubscription] = useState<ICastSubscription | null>(null);
    const [sessionHandle, setSessionHandle] = useState<CastSessionHandle | null>(null);

    const buttonRef = useRef<HTMLButtonElement | null>(null);

    // One manager per button lifetime. The manager is the source of
    // truth for the active session — refs would defeat the point.
    const sessionManager = useMemo(() => new CastSessionManager(), []);
    const handleRef = useRef<CastSessionHandle | null>(null);
    const connectingRef = useRef(false);

    const cleanupCast = useCallback((notifyRemote: boolean) => {
        const handle = handleRef.current;
        handleRef.current = null;
        if (handle) {
            sessionManager.dispose(notifyRemote);
        }
        setSessionHandle(null);
        setSessionSubscription(null);
        setIsCasting(false);
    }, [sessionManager]);

    const connectSession = useCallback(async (transport: IRpcTransport) => {
        if (connectingRef.current) return;
        connectingRef.current = true;
        try {
            // Read the registry once at connect time — we don't want
            // this callback to invalidate on every store update.
            const registry = useWorkbenchSyncStore.getState().subscriptionManager;
            const handle = sessionManager.connect(transport, registry);
            handleRef.current = handle;
            setSessionHandle(handle);
            setSessionSubscription(handle.subscription);
            setIsCasting(true);

            // D-Pad events from the TV reach the local runtime through
            // the handle's event provider. The router is shared with the
            // cast-roundtrip test.
            handle.eventProvider.onEvent((event) => {
                const state = useWorkbenchSyncStore.getState();
                routeRuntimeEvent(event, {
                    onNext: () => state.handles.handleNext(),
                    onStart: () => state.handles.handleStart(),
                    onPause: () => state.handles.handlePause(),
                    onStop: () => state.handles.handleStop(),
                });
            });

            // Push the current workbench mode immediately so the
            // receiver doesn't sit on the waiting screen while it waits
            // for the first reactive WorkbenchCastBridge effect tick.
            const wb = useWorkbenchSyncStore.getState();
            const message = workbenchModeResolver.resolve({
                viewMode: wb.viewMode,
                executionStatus: wb.execution.status,
                runtime: wb.runtime,
                analyticsSegments: wb.analyticsSegments,
                selectedBlock: wb.selectedBlock,
                documentItems: wb.documentItems,
            });
            try {
                handle.transport.send(message);
            } catch {
                // transport may be tearing down (race with goodbye);
                // the receiver will see the disconnect.
            }
        } finally {
            connectingRef.current = false;
        }
    }, [sessionManager]);

    // Subscribe to backend state changes.
    useEffect(() => {
        const unsub = backend.onStateChanged((s) => {
            setBackendState(s);
            if (s === 'session-active') {
                setIsCasting(true);
            } else if (s === 'ready' || s === 'unavailable') {
                setIsCasting(false);
            } else if (s === 'session-ended') {
                cleanupCast(false);
            }
        });
        return unsub;
    }, [backend, cleanupCast]);

    // Best-effort: tell the receiver we're going away when the tab
    // closes. The transport-level disconnect handler on the receiver
    // is the source of truth — this is the polite signal that gets the
    // receiver back to the waiting screen promptly.
    useEffect(() => {
        const onPageHide = () => {
            sessionManager.sendDisposeSignal();
        };
        window.addEventListener('pagehide', onPageHide);
        return () => window.removeEventListener('pagehide', onPageHide);
    }, [sessionManager]);

    useEffect(() => {
        const btn = buttonRef.current;
        if (!btn) return;

        const onNativeClick = async () => {
            if (backendStateRef.current === 'session-active') {
                if (isDisconnectingRef.current) return;

                setIsDisconnecting(true);
                try {
                    cleanupCast(true);
                    backend.endSession();
                } finally {
                    setTimeout(() => setIsDisconnecting(false), 2000);
                }
                return;
            }

            try {
                const transport = await backend.startSession();
                setIsCasting(true);
                await connectSession(transport);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (message.includes('cancel') || message === 'cancel') {
                    console.log('[CastButtonRpc] Cast request canceled or gesture expired');
                } else {
                    console.error('[CastButtonRpc] Cast failed:', err);
                }
                cleanupCast(false);
            }
        };

        btn.addEventListener('click', onNativeClick);
        return () => btn.removeEventListener('click', onNativeClick);
    }, [backend, connectSession, cleanupCast]);

    useEffect(() => {
        return () => cleanupCast(false);
    }, [cleanupCast]);

    const backendStateRef = useRef(backendState);
    backendStateRef.current = backendState;
    const isDisconnectingRef = useRef(isDisconnecting);
    isDisconnectingRef.current = isDisconnecting;

    const isUnavailable = backendState === 'unavailable';
    const isAvailable = backendState === 'ready';
    const isConnected = backendState === 'session-active';
    const isConnecting = backendState === 'connecting';
    const isWebRtcActive = isCasting && isConnected;
    const isCurrentlyConnecting = isConnecting;
    const isCurrentlyBusy = isCurrentlyConnecting || isDisconnecting;
    const canInteract = isAvailable || isConnected;

    if (isUnavailable) {
        return (
            <Button variant="ghost" size="icon" disabled className="opacity-20 cursor-not-allowed">
                <Cast className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <CastTransportProvider transport={sessionHandle?.transport ?? null}>
            <ProjectionSyncProvider chromecastSubscription={sessionSubscription}>
                <Button
                    ref={buttonRef}
                    variant="ghost"
                    size="icon"
                    disabled={isCurrentlyBusy}
                    onClick={() => { /* listener attached imperatively */ }}
                    className={cn(
                        'transition-all',
                        isWebRtcActive && 'text-emerald-400 ring-2 ring-emerald-400/30',
                        isCurrentlyConnecting && 'animate-pulse text-amber-400',
                        !canInteract && 'opacity-50',
                    )}
                    aria-label={isWebRtcActive ? 'Stop casting' : 'Cast to TV'}
                    title={isWebRtcActive ? 'Stop casting' : isCurrentlyConnecting ? 'Connecting...' : 'Cast to TV'}
                >
                    {isWebRtcActive ? <TvMinimal className="h-5 w-5" /> : <Cast className="h-5 w-5" />}
                </Button>
            </ProjectionSyncProvider>
        </CastTransportProvider>
    );
};
