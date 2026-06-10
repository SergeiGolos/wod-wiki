/**
 * CastButton — sender-side cast control.
 *
 * The button does not know whether casting is going to a real Chromecast
 * device or to a local-tab dual-pane mirror. It asks `getCastBackend()` for
 * the build's `ICastBackend`, calls `startSession()` from a user gesture,
 * and gets back a connected `IRpcTransport`. The transport is then handed
 * to a `ChromecastSenderViewSession` (which owns subscription / event
 * provider / clock sync on top of the transport).
 *
 * This is the single seam for "is the cast going to a TV or a popup tab".
 * The chromecast adapter drives the native device picker; the local
 * adapter opens a popup and uses BroadcastChannel + MessageChannel. The
 * rest of the cast stack (subscription, event wiring, workbench sync) is
 * identical for both.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TvMinimal, Cast } from 'lucide-react';
import { Button } from '@/components/atoms/primitives/button';
import { useWorkbenchSyncStore } from '@/stores/workbenchSyncStore';
import { ChromecastSenderViewSession } from '@/hooks/useCastSignaling';
import { cn } from '@/lib/utils';
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
    const [sessionSubscription, setSessionSubscription] = useState<ChromecastSenderViewSession['subscription']>(null);

    const subscriptionManager = useWorkbenchSyncStore(s => s.subscriptionManager);
    const castTransportFromStore = useWorkbenchSyncStore(s => s.castTransport);
    const setCastTransport = useWorkbenchSyncStore(s => s.setCastTransport);

    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const senderSessionRef = useRef<ChromecastSenderViewSession | null>(null);

    const cleanupCast = useCallback((notifyRemote: boolean) => {
        const session = senderSessionRef.current;
        senderSessionRef.current = null;

        if (session) {
            if (notifyRemote) {
                session.endSession();
            } else {
                session.dispose();
            }
        }

        setSessionSubscription(null);
        setCastTransport(null);
        setIsCasting(false);
    }, [setCastTransport]);

    const connectSession = useCallback(async (options: {
        existingTransport?: IRpcTransport;
    } = {}) => {
        const currentSession = senderSessionRef.current;
        currentSession?.dispose();

        const viewSession = new ChromecastSenderViewSession(subscriptionManager);
        senderSessionRef.current = viewSession;

        viewSession.onDisconnected(() => {
            cleanupCast(false);
        });

        await viewSession.connect({
            existingTransport: options.existingTransport,
        });

        setCastTransport(viewSession.transport);
        setSessionSubscription(viewSession.subscription);
        setIsCasting(true);

        viewSession.eventProvider?.onEvent((event) => {
            const state = useWorkbenchSyncStore.getState();
            routeRuntimeEvent(event, {
                onNext: () => state.handles.handleNext(),
                onStart: () => state.handles.handleStart(),
                onPause: () => state.handles.handlePause(),
                onStop: () => state.handles.handleStop(),
            });
        });

        const workbenchState = useWorkbenchSyncStore.getState();
        const message = workbenchModeResolver.resolve({
            viewMode: workbenchState.viewMode,
            executionStatus: workbenchState.execution.status,
            runtime: workbenchState.runtime,
            analyticsSegments: workbenchState.analyticsSegments,
            selectedBlock: workbenchState.selectedBlock,
            documentItems: workbenchState.documentItems,
        });
        viewSession.transport?.send(message);
    }, [subscriptionManager, setCastTransport, cleanupCast]);

    // Re-adopt transport on mount/remount.
    useEffect(() => {
        const tryConnect = async () => {
            if (!isCasting || senderSessionRef.current) return;

            if (castTransportFromStore) {
                try {
                    await connectSession({ existingTransport: castTransportFromStore });
                } catch (err) {
                    console.error('[CastButtonRpc] Failed to re-adopt cast transport', err);
                    cleanupCast(false);
                }
            }
        };

        tryConnect();
    }, [isCasting, castTransportFromStore, connectSession, cleanupCast]);

    const backendStateRef = useRef(backendState);
    backendStateRef.current = backendState;
    const isDisconnectingRef = useRef(false);
    isDisconnectingRef.current = isDisconnecting;

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

    useEffect(() => {
        const onPageHide = () => {
            senderSessionRef.current?.sendDisposeSignal();
        };
        window.addEventListener('pagehide', onPageHide);
        return () => window.removeEventListener('pagehide', onPageHide);
    }, []);

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
                await connectSession({ existingTransport: transport });
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
    );
};
