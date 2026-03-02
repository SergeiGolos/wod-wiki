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
    const [isCasting, setIsCasting] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const subscriptionManager = useSubscriptionManager();

    const transportRef = useRef<WebRtcRpcTransport | null>(null);
    const eventProviderRef = useRef<ChromecastEventProvider | null>(null);

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

    // Wire ChromecastEventProvider to route receiver events → local runtime
    useEffect(() => {
        const eventProvider = eventProviderRef.current;
        if (!eventProvider || !isCasting) return;

        // When the receiver sends events (D-Pad), feed them into the local runtime
        const unsub = eventProvider.onEvent((event) => {
            const state = useWorkbenchSyncStore.getState();
            const { handleNext, handleStart, handlePause, handleStop } = state;

            switch (event.name) {
                case 'next': handleNext(); break;
                case 'start': handleStart(); break;
                case 'pause': handlePause(); break;
                case 'stop': handleStop(); break;
                default:
                    console.warn(`[CastButtonRpc] Unhandled remote event: ${event.name}`);
            }
        });

        return unsub;
    }, [isCasting]);

    // Handle transport disconnect
    useEffect(() => {
        const transport = transportRef.current;
        if (!transport || !isCasting) return;

        const unsub = transport.onDisconnected(() => {
            console.log('[CastButtonRpc] Transport disconnected');
            cleanupCast();
        });

        return unsub;
    }, [isCasting]);

    const cleanupCast = useCallback(() => {
        // Remove chromecast subscription from the manager
        subscriptionManager?.remove(CHROMECAST_SUBSCRIPTION_ID);

        // Dispose event provider
        eventProviderRef.current?.dispose();
        eventProviderRef.current = null;

        // Dispose transport
        transportRef.current?.dispose();
        transportRef.current = null;

        setIsCasting(false);
    }, [subscriptionManager]);

    const handleCast = useCallback(async () => {
        if (isCasting) {
            cleanupCast();
            ChromecastSdk.endSession();
            return;
        }

        if (!subscriptionManager) {
            console.warn('[CastButtonRpc] No subscription manager — runtime not active');
            return;
        }

        setIsConnecting(true);
        try {
            if (!hasCustomCastAppId) {
                throw new Error(
                    `Cast is not configured. Set VITE_CAST_APP_ID to your Custom Receiver App ID.`
                );
            }

            // 1. Load SDK
            await ChromecastSdk.load(CAST_APP_ID);

            // 2. Open device picker
            await ChromecastSdk.requestSession();

            // 3. Get Cast session
            const session = ChromecastSdk.getSession();
            if (!session) throw new Error('No Cast session after requestSession()');

            // 4. Wait for receiver boot
            await new Promise(r => setTimeout(r, 3000));

            const sessionAfterWait = ChromecastSdk.getSession();
            if (!sessionAfterWait) throw new Error('Cast session died during receiver init wait');

            // 4b. Ping to verify namespace
            try {
                await sessionAfterWait.sendMessage(CAST_NAMESPACE_STR, { type: 'ping', timestamp: Date.now() });
            } catch (pingErr) {
                const reason = typeof pingErr === 'string'
                    ? pingErr
                    : ((pingErr as any)?.code || (pingErr as any)?.message || String(pingErr));
                throw new Error(
                    `Cast namespace ping failed (${reason}). ` +
                    `Verify App ID points to the published custom receiver.`
                );
            }

            // 5. Create RPC transport
            const signaling = new SenderCastSignaling(sessionAfterWait);
            const transport = new WebRtcRpcTransport('offerer', signaling);
            transportRef.current = transport;

            // 6. Connect
            await transport.connect();

            // 7. Create subscription and event provider
            const chromecastSub = new ChromecastRuntimeSubscription(transport, {
                id: CHROMECAST_SUBSCRIPTION_ID,
            });
            subscriptionManager.add(chromecastSub);

            const eventProvider = new ChromecastEventProvider(transport);
            eventProviderRef.current = eventProvider;

            setIsCasting(true);
        } catch (err) {
            console.error('[CastButtonRpc] Cast failed:', err);
            cleanupCast();
        } finally {
            setIsConnecting(false);
        }
    }, [isCasting, subscriptionManager, cleanupCast]);

    // Handle states
    const isUnavailable = sdkState === 'unavailable';
    const isAvailable = sdkState === 'ready';
    const isConnected = isCasting && sdkState === 'session-active';
    const isCurrentlyConnecting = isConnecting || (sdkState === 'loading');

    if (isUnavailable) {
        return (
            <Button variant="ghost" size="icon" disabled className="opacity-20 cursor-not-allowed">
                <Cast className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleCast}
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
