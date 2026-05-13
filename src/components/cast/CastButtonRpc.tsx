/**
 * CastButton — Chromecast cast control button.
 *
 * Uses ChromecastSenderViewSession so React only orchestrates UI state,
 * while handshake/subscription/event wiring lives in the session object.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TvMinimal, Cast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import { useSubscriptionManager } from '@/components/layout/SubscriptionManagerContext';
import { ChromecastSdk, type CastSdkState, CAST_APP_ID, hasCustomCastAppId, ChromecastSenderViewSession } from '@/hooks/useCastSignaling';
import { cn } from '@/lib/utils';
import { ProjectionSyncProvider } from './ProjectionSyncContext';
import { workbenchModeResolver } from '@/app/cast/workbenchModeResolver';

export const CastButtonRpc: React.FC = () => {
    const [sdkState, setSdkState] = useState<CastSdkState>(ChromecastSdk.getState());
    const [isCasting, setIsCasting] = useState(() => ChromecastSdk.isSessionActive());
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [sessionSubscription, setSessionSubscription] = useState<ChromecastSenderViewSession['subscription']>(null);

    const subscriptionManager = useSubscriptionManager();
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
        castSession?: any;
        existingTransport?: any;
        bootDelayMs?: number;
        skipNamespacePing?: boolean;
    }) => {
        const currentSession = senderSessionRef.current;
        currentSession?.dispose();

        const viewSession = new ChromecastSenderViewSession(subscriptionManager);
        senderSessionRef.current = viewSession;

        viewSession.onDisconnected(() => {
            cleanupCast(false);
        });

        await viewSession.connect(options);

        setCastTransport(viewSession.transport);
        setSessionSubscription(viewSession.subscription);
        setIsCasting(true);

        viewSession.eventProvider?.onEvent((event) => {
            const state = useWorkbenchSyncStore.getState();
            const { handleNext, handleStart, handlePause, handleStop } = state.handles;
            switch (event.name) {
                case 'next': handleNext(); break;
                case 'start': handleStart(); break;
                case 'pause': handlePause(); break;
                case 'stop': handleStop(); break;
            }
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

    // Re-adopt or re-establish transport on mount/remount.
    useEffect(() => {
        const tryConnect = async () => {
            if (!isCasting || senderSessionRef.current) return;

            if (castTransportFromStore) {
                try {
                    await connectSession({ existingTransport: castTransportFromStore, skipNamespacePing: true });
                } catch (err) {
                    console.error('[CastButtonRpc] Failed to re-adopt cast transport', err);
                    cleanupCast(false);
                }
                return;
            }

            if (sdkState === 'session-active') {
                try {
                    const session = ChromecastSdk.getSession();
                    if (!session) throw new Error('No Cast session found');
                    await connectSession({ castSession: session, skipNamespacePing: false });
                } catch (err) {
                    console.error('[CastButtonRpc] Failed to re-establish transport:', err);
                    cleanupCast(false);
                }
            }
        };

        tryConnect();
    }, [isCasting, sdkState, castTransportFromStore, connectSession, cleanupCast]);

    const sdkStateRef = useRef(sdkState);
    sdkStateRef.current = sdkState;
    const isDisconnectingRef = useRef(false);
    isDisconnectingRef.current = isDisconnecting;

    useEffect(() => {
        if (!hasCustomCastAppId) {
            console.error('[CastButtonRpc] Cast disabled: VITE_CAST_APP_ID is not configured.');
            return;
        }

        ChromecastSdk.load(CAST_APP_ID).catch(() => {});

        const unsub = ChromecastSdk.on('state-changed', (newState) => {
            setSdkState(newState as CastSdkState);
            if (newState === 'session-active') {
                setIsCasting(true);
            } else if (newState === 'ready' || newState === 'unavailable') {
                setIsCasting(false);
            }
        });

        return unsub;
    }, []);

    useEffect(() => {
        return ChromecastSdk.on('session-ended', () => {
            cleanupCast(false);
        });
    }, [cleanupCast]);

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
            if (sdkStateRef.current === 'session-active') {
                if (isDisconnectingRef.current) return;

                setIsDisconnecting(true);
                try {
                    cleanupCast(true);
                    ChromecastSdk.endSession();
                } finally {
                    setTimeout(() => setIsDisconnecting(false), 2000);
                }
                return;
            }

            try {
                if (!hasCustomCastAppId) throw new Error('Cast not configured');
                await ChromecastSdk.requestSession();

                setIsConnecting(true);
                const castSession = ChromecastSdk.getSession();
                if (!castSession) throw new Error('No session');

                await connectSession({ castSession, bootDelayMs: 3000 });
            } catch (err: any) {
                if (err?.message?.includes('cancel') || err === 'cancel') {
                    console.log('[CastButtonRpc] Cast request canceled or gesture expired');
                } else {
                    console.error('[CastButtonRpc] Cast failed:', err);
                }
                cleanupCast(false);
            } finally {
                setIsConnecting(false);
            }
        };

        btn.addEventListener('click', onNativeClick);
        return () => btn.removeEventListener('click', onNativeClick);
    }, [cleanupCast, connectSession]);

    useEffect(() => {
        return () => cleanupCast(false);
    }, [cleanupCast]);

    const isUnavailable = sdkState === 'unavailable';
    const isAvailable = sdkState === 'ready';
    const isConnected = sdkState === 'session-active';
    const isWebRtcActive = isCasting && isConnected;
    const isCurrentlyConnecting = isConnecting || (sdkState === 'loading');
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
            <div className="relative">
                <Button
                    ref={buttonRef}
                    variant="ghost"
                    size="icon"
                    disabled={isCurrentlyBusy || !canInteract}
                    className={cn(
                        'transition-all duration-300',
                        isConnected ? 'text-blue-500 bg-blue-500/10' : '',
                        isCurrentlyBusy ? 'text-blue-400' : '',
                        isAvailable ? 'text-foreground hover:text-blue-500' : '',
                    )}
                    title={isConnected ? 'Stop Casting' : (isCurrentlyBusy ? 'Connecting...' : 'Cast to TV')}
                >
                    {isConnected ? (
                        <TvMinimal className={cn(
                            'h-5 w-5',
                            !isWebRtcActive && 'opacity-50',
                            isDisconnecting && 'animate-pulse',
                        )} />
                    ) : (
                        <Cast className={cn(
                            'h-5 w-5',
                            isCurrentlyConnecting ? 'animate-pulse-opacity' : '',
                        )} />
                    )}
                </Button>
            </div>
        </ProjectionSyncProvider>
    );
};
