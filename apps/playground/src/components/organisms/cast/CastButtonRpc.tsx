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
import { useWorkbenchSessionStore } from '@/stores/workbenchSessionStore.shim';
import { noopHandles } from '@/stores/workbenchSessionStore';
import { NextEvent } from '@/hooks/useRuntimeTimer';
import {
    sharedCastSessionManager,
    type CastSessionHandle,
    getCastBackend,
    setActiveCastTransport,
    routeRuntimeEvent,
    type ICastBackend,
    type ICastBackendState,
    type IRpcTransport,
} from '@/hooks/useCastSignaling';
import type { ICastSubscription } from '@/hooks/useRuntimeTimer';
import { cn } from '@/lib/utils';
import { CastTransportProvider } from '@/contexts/CastTransportContext';
import { ProjectionSyncProvider } from '@/contexts/ProjectionSyncContext';
import { workbenchModeResolver } from '@/app/cast/workbenchModeResolver';

/**
 * CAF and the WebRTC transport reject with different shapes: Error instances,
 * `{ code, description }` objects (chrome.cast.Error), and plain objects.
 * Logging them raw prints "[object Object]" and loses the failure code — the
 * thing you need when diagnosing a cast failure from console logs.
 */
export function describeCastError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null) {
        const { code, description } = err as { code?: unknown; description?: unknown };
        if (code !== undefined || description !== undefined) {
            return [code !== undefined ? String(code) : null, description ? String(description) : null]
                .filter((part): part is string => part !== null)
                .join(': ') || 'unknown';
        }
        try {
            return JSON.stringify(err);
        } catch {
            return String(err);
        }
    }
    return String(err);
}

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
    const sessionManager = sharedCastSessionManager;
    const handleRef = useRef<CastSessionHandle | null>(sessionManager.getActiveHandle());
    const connectingRef = useRef(false);

    const cleanupCast = useCallback((notifyRemote: boolean) => {
        const handle = handleRef.current;
        handleRef.current = null;
        if (handle) {
            sessionManager.dispose(notifyRemote);
        }
        setActiveCastTransport(null);
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
            const registry = useWorkbenchSessionStore.getState().subscriptionManager;
            const handle = sessionManager.connect(transport, registry);
            handleRef.current = handle;
            setSessionHandle(handle);
            setSessionSubscription(handle.subscription);
            setIsCasting(true);
            // Publish the transport so runtimes created outside the workbench
            // session (the /run inline timer) can mirror to the receiver — the
            // context provider below only wraps this button. (#704)
            setActiveCastTransport(handle.transport);

            // D-Pad events from the TV reach the local runtime through
            // the handle's event provider. The router is shared with the
            // cast-roundtrip test.
            handle.eventProvider.onEvent((event) => {
                const state = useWorkbenchSessionStore.getState();
                routeRuntimeEvent(event, {
                    onNext: () => {
                        if (state.handles.handleNext) {
                            state.handles.handleNext();
                        }
                        if (state.runtime && (!state.handles.handleNext || state.handles.handleNext === noopHandles.handleNext)) {
                            state.runtime.handle(new NextEvent(undefined, state.runtime.nowProvider));
                            if (state.execution.status !== 'running') {
                                state.execution.start();
                            }
                        }
                    },
                    onStart: () => {
                        if (state.handles.handleStart) state.handles.handleStart();
                        if (state.execution && (!state.handles.handleStart || state.handles.handleStart === noopHandles.handleStart)) {
                            state.execution.start();
                        }
                    },
                    onPause: () => {
                        if (state.handles.handlePause) state.handles.handlePause();
                        if (state.execution && (!state.handles.handlePause || state.handles.handlePause === noopHandles.handlePause)) {
                            state.execution.pause();
                        }
                    },
                    onStop: () => {
                        if (state.handles.handleStop) state.handles.handleStop();
                        if (state.execution && (!state.handles.handleStop || state.handles.handleStop === noopHandles.handleStop)) {
                            state.execution.stop();
                        }
                    },
                });
            });

            // Push the current workbench mode immediately so the
            // receiver doesn't sit on the waiting screen while it waits
            // for the first reactive WorkbenchCastBridge effect tick.
            // The send (with disconnect-tolerant error handling) is
            // owned by the session — the resolver stays here.
            const wb = useWorkbenchSessionStore.getState();
            const message = workbenchModeResolver.resolve({
                viewMode: wb.viewMode,
                executionStatus: wb.execution.status,
                runtime: wb.runtime,
                analyticsSegments: wb.analyticsSegments,
                selectedBlock: wb.selectedBlock,
                documentItems: wb.documentItems,
            });
            handle.pushInitialWorkbench(message);
        } finally {
            connectingRef.current = false;
        }
    }, [sessionManager]);

    // Adopt a platform session that outlived this mount (SPA navigation or
    // page reload): the CAF session is still running, so rebuild the local
    // transport against it rather than showing a dead "connected" button.
    // `connectSession` bails while `connectingRef` is set, so adoption tracks
    // its own in-flight flag.
    const adoptingRef = useRef(false);
    const adoptSession = useCallback(async () => {
        if (sessionManager.isConnected && sessionManager.getActiveHandle()) {
            const handle = sessionManager.getActiveHandle()!;
            handleRef.current = handle;
            setSessionHandle(handle);
            setSessionSubscription(handle.subscription);
            setIsCasting(true);
            return;
        }
        if (handleRef.current || adoptingRef.current) return;
        if (typeof backend.resumeSession !== 'function') return;
        adoptingRef.current = true;
        try {
            const transport = await backend.resumeSession();
            await connectSession(transport);
        } catch (err) {
            console.warn('[CastButtonRpc] Session resume failed:', describeCastError(err));
            cleanupCast(false);
            backend.endSession();
        } finally {
            adoptingRef.current = false;
        }
    }, [backend, connectSession, cleanupCast, sessionManager]);

    // Subscribe to backend state changes.
    useEffect(() => {
        const unsub = backend.onStateChanged((s) => {
            setBackendState(s);
            if (s === 'session-active') {
                setIsCasting(true);
                // The platform session may have outlived this mount (SPA
                // navigation or page reload) — rebuild the local transport
                // against it instead of leaving a dead "connected" button.
                void adoptSession();
            } else if (s === 'ready' || s === 'unavailable') {
                setIsCasting(false);
            } else if (s === 'session-ended') {
                cleanupCast(false);
            }
        });
        return unsub;
    }, [backend, cleanupCast, adoptSession]);

    // Mount: if the platform session was already active before this component
    // existed (route remount after SPA navigation, or a reload where CAF
    // resumed before React subscribed), no state CHANGE will ever arrive —
    // adopt directly from the current state.
    useEffect(() => {
        if (sessionManager.isConnected && sessionManager.getActiveHandle()) {
            const handle = sessionManager.getActiveHandle()!;
            handleRef.current = handle;
            setSessionHandle(handle);
            setSessionSubscription(handle.subscription);
            setIsCasting(true);
        } else if (backend.state === 'session-active') {
            void adoptSession();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design; adoptSession reads live refs
    }, [backend, sessionManager]);

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
                const message = describeCastError(err);
                if (message === 'cancel' || message.includes('cancel')) {
                    console.log('[CastButtonRpc] Cast request canceled or gesture expired');
                } else {
                    console.error('[CastButtonRpc] Cast failed:', message);
                }
                cleanupCast(false);
            }
        };

        btn.addEventListener('click', onNativeClick);
        return () => btn.removeEventListener('click', onNativeClick);
    }, [backend, connectSession, cleanupCast]);


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
                        isWebRtcActive && 'text-signal-positive ring-2 ring-signal-positive/30',
                        isCurrentlyConnecting && 'animate-pulse text-signal-caution',
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
