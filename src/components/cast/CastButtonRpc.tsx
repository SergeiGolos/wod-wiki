/**
 * CastButton — Chromecast cast control button.
 *
 * Refactored to use the SubscriptionManager + RPC infrastructure:
 * - On cast start: creates WebRtcRpcTransport, ChromecastRuntimeSubscription,
 *   ChromecastEventProvider, and wires them into the subscription pipeline.
 * - On cast end: removes the subscription and disposes transport.
 *
 * The button no longer reads displayState from the store or manually serializes
 * state — the ChromecastRuntimeSubscription handles that via the SubscriptionManager.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TvMinimal, Cast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import { useSubscriptionManager } from '@/components/layout/SubscriptionManagerContext';
import { SubscriptionManager } from '@/runtime/subscriptions/SubscriptionManager';
import { ChromecastSdk, type CastSdkState } from '@/services/cast/ChromecastSdk';
import { SenderCastSignaling } from '@/services/cast/CastSignaling';
import { WebRtcRpcTransport } from '@/services/cast/rpc/WebRtcRpcTransport';
import { ChromecastRuntimeSubscription } from '@/services/cast/rpc/ChromecastRuntimeSubscription';
import { ChromecastEventProvider } from '@/services/cast/rpc/ChromecastEventProvider';
import { CAST_APP_ID, hasCustomCastAppId } from '@/services/cast/config';
import { CAST_NAMESPACE as CAST_NAMESPACE_STR } from '@/types/cast/messages';
import { cn } from '@/lib/utils';

const CHROMECAST_SUBSCRIPTION_ID = 'chromecast';

export const CastButtonRpc: React.FC = () => {
    const [sdkState, setSdkState] = useState<CastSdkState>(ChromecastSdk.getState());
    const [isCasting, setIsCasting] = useState(() => ChromecastSdk.isSessionActive());
    const [isConnecting, setIsConnecting] = useState(false);
    const subscriptionManager = useSubscriptionManager();
    const setCastTransport = useWorkbenchSyncStore(s => s.setCastTransport);

    const transportRef = useRef<WebRtcRpcTransport | null>(null);
    const eventProviderRef = useRef<ChromecastEventProvider | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    // Track state in refs for the native event listener closure
    const isCastingRef = useRef(false);
    isCastingRef.current = isCasting;
    const sdkStateRef = useRef(sdkState);
    sdkStateRef.current = sdkState;

    // Initialize SDK on mount
    useEffect(() => {
        if (!hasCustomCastAppId) {
            console.error(
                `[CastButtonRpc] Cast disabled: VITE_CAST_APP_ID is not configured.`
            );
            return;
        }

        ChromecastSdk.load(CAST_APP_ID).catch(() => {});

        const unsub = ChromecastSdk.on('state-changed', (newState) => {
            setSdkState(newState as CastSdkState);
        });

        return unsub;
    }, []);

    // Shared helper: attach a new ChromecastRuntimeSubscription to a manager
    const attachSubscription = useCallback((mgr: SubscriptionManager, transport: WebRtcRpcTransport) => {
        const chromecastSub = new ChromecastRuntimeSubscription(transport, {
            id: CHROMECAST_SUBSCRIPTION_ID,
        });
        mgr.add(chromecastSub);
        console.log('[CastButtonRpc] Attached subscription to SubscriptionManager');
    }, []);

    const cleanupCast = useCallback(() => {
        subscriptionManager?.remove(CHROMECAST_SUBSCRIPTION_ID);

        const transport = transportRef.current;
        if (transport?.connected) {
            try { transport.send({ type: 'rpc-dispose' }); } catch { /* ignore */ }
        }

        eventProviderRef.current?.dispose();
        eventProviderRef.current = null;
        transportRef.current?.dispose();
        transportRef.current = null;
        setCastTransport(null);
        setIsCasting(false);
    }, [subscriptionManager, setCastTransport]);

    // Auto-cleanup when the Cast SDK session ends externally (e.g. Chromecast
    // turned off, user stops casting from another device, or the component
    // remounts after tab navigation with isCasting=true but no live session).
    useEffect(() => {
        return ChromecastSdk.on('session-ended', () => {
            console.log('[CastButtonRpc] SDK session ended externally — cleaning up');
            cleanupCast();
        });
    }, [cleanupCast]);

    // Send rpc-dispose to the receiver before the page unloads so it shows the
    // waiting screen immediately instead of staying frozen for ~30s while
    // WebRTC keepalive detects the dead peer.
    useEffect(() => {
        const onPageHide = () => {
            const transport = transportRef.current;
            if (transport?.connected) {
                try { transport.send({ type: 'rpc-dispose' }); } catch { /* ignore */ }
            }
        };
        window.addEventListener('pagehide', onPageHide);
        return () => window.removeEventListener('pagehide', onPageHide);
    }, []);

    // Cleanup when this component unmounts while still casting (e.g. Storybook
    // story navigation). Without this the transport and subscription are
    // orphaned and cannot be interacted with until the page reloads.
    useEffect(() => {
        return () => {
            if (isCastingRef.current) {
                console.log('[CastButtonRpc] Unmounting while still casting — disposing cast session');
                cleanupCast();
            }
        };
    }, [cleanupCast]);

    // Native click handler to preserve "User Activation" gesture.
    // React's SyntheticEvent system can introduce microtasks that break gesture-sensitive APIs.
    useEffect(() => {
        const btn = buttonRef.current;
        if (!btn) return;

        const onNativeClick = async () => {
            if (isCastingRef.current) {
                console.log('[CastButtonRpc] Stopping active session');
                cleanupCast();
                ChromecastSdk.endSession();
                return;
            }

            // GESTURE CRITICAL: Calling requestSession() must be the very first action
            // in the tick of the user gesture. 
            console.log('[CastButtonRpc] Native click: requesting device picker...');
            try {
                if (!hasCustomCastAppId) throw new Error('Cast not configured');
                
                // Diagnostic check (no delay)
                if (window.self !== window.top) {
                    console.info('[CastButtonRpc] Running in iframe (Storybook) - ensure "allow=presentation"');
                }

                await ChromecastSdk.requestSession();
                
                // --- User chose a device ---
                setIsConnecting(true);

                const session = ChromecastSdk.getSession();
                if (!session) throw new Error('No session');

                console.log('[CastButtonRpc] Session obtained, waiting for receiver boot...');
                await new Promise(r => setTimeout(r, 3000));
                
                const sessionAfterWait = ChromecastSdk.getSession();
                if (!sessionAfterWait) throw new Error('Session died');

                // Verify namespace
                await sessionAfterWait.sendMessage(CAST_NAMESPACE_STR, { type: 'ping', timestamp: Date.now() });

                // Create RPC transport
                const signaling = new SenderCastSignaling(sessionAfterWait);
                const transport = new WebRtcRpcTransport('offerer', signaling);
                transportRef.current = transport;

                await transport.connect();

                const eventProvider = new ChromecastEventProvider(transport);
                eventProviderRef.current = eventProvider;
                setCastTransport(transport);
                setIsCasting(true);
                console.log('[CastButtonRpc] Cast session established');

            } catch (err: any) {
                if (err?.message?.includes('cancel') || err === 'cancel') {
                    console.log('[CastButtonRpc] Cast request canceled or gesture expired');
                } else {
                    console.error('[CastButtonRpc] Cast failed:', err);
                }
                cleanupCast();
            } finally {
                setIsConnecting(false);
            }
        };

        btn.addEventListener('click', onNativeClick);
        return () => btn.removeEventListener('click', onNativeClick);
    }, [cleanupCast, setCastTransport]);

    // Subscription management effects
    useEffect(() => {
        if (!isCasting || !subscriptionManager || !transportRef.current) return;
        attachSubscription(subscriptionManager, transportRef.current);
    }, [isCasting, subscriptionManager, attachSubscription]);

    // Remote event routing (Receiver -> Local Runtime)
    useEffect(() => {
        const eventProvider = eventProviderRef.current;
        if (!eventProvider || !isCasting) return;

        const unsub = eventProvider.onEvent((event) => {
            const state = useWorkbenchSyncStore.getState();
            const { handleNext, handleStart, handlePause, handleStop } = state;
            switch (event.name) {
                case 'next': handleNext(); break;
                case 'start': handleStart(); break;
                case 'pause': handlePause(); break;
                case 'stop': handleStop(); break;
            }
        });
        return unsub;
    }, [isCasting]);

    // Auto-cleanup on disconnect
    useEffect(() => {
        const transport = transportRef.current;
        if (!transport || !isCasting) return;
        return transport.onDisconnected(() => {
            console.log('[CastButtonRpc] Transport disconnected');
            cleanupCast();
        });
    }, [isCasting, cleanupCast]);

    // State derivation
    const isUnavailable = sdkState === 'unavailable';
    const isAvailable = sdkState === 'ready';
    const isConnected = isCasting && sdkState === 'session-active';
    const isCurrentlyConnecting = isConnecting || (sdkState === 'loading');
    const canInteract = isAvailable || isConnected;

    if (isUnavailable) {
        return (
            <Button variant="ghost" size="icon" disabled className="opacity-20 cursor-not-allowed">
                <Cast className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <Button
            ref={buttonRef}
            variant="ghost"
            size="icon"
            disabled={isCurrentlyConnecting || !canInteract}
            className={cn(
                "transition-all duration-300",
                isConnected ? "text-blue-500 bg-blue-500/10" : "",
                isCurrentlyConnecting ? "text-blue-400" : "",
                isAvailable ? "text-foreground hover:text-blue-500" : ""
            )}
            title={isConnected ? "Stop Casting" : (isCurrentlyConnecting ? "Connecting..." : "Cast to TV")}
        >
            {isConnected ? (
                <TvMinimal className="h-5 w-5" />
            ) : (
                <Cast className={cn(
                    "h-5 w-5",
                    isCurrentlyConnecting ? "animate-pulse-opacity" : ""
                )} />
            )}
        </Button>
    );
};
