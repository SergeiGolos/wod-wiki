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
import { SubscriptionManager } from '@/hooks/useRuntimeTimer';
import { ChromecastSdk, type CastSdkState, SenderCastSignaling, WebRtcRpcTransport, ChromecastRuntimeSubscription, ChromecastEventProvider, CAST_APP_ID, hasCustomCastAppId, ClockSyncService } from '@/hooks/useCastSignaling';
import type { RpcWorkbenchUpdate } from '@/hooks/useCastSignaling';
import { CAST_NAMESPACE as CAST_NAMESPACE_STR } from '@/types/cast/messages';
import { cn } from '@/lib/utils';
import { ProjectionSyncProvider } from './ProjectionSyncContext';
import { useLocation } from 'react-router-dom';
import { formatTimeMMSS } from '@/lib/formatTime';
import type { Segment } from '@/core/models/AnalyticsModels';
import type { DocumentItem } from '@/components/Editor/utils/documentStructure';
import type { WodBlock } from '@/components/Editor/types';

const CHROMECAST_SUBSCRIPTION_ID = 'chromecast';

export const CastButtonRpc: React.FC = () => {
    const [sdkState, setSdkState] = useState<CastSdkState>(ChromecastSdk.getState());
    const [isCasting, setIsCasting] = useState(() => ChromecastSdk.isSessionActive());
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [eventProvider, setEventProvider] = useState<ChromecastEventProvider | null>(null);
    const subscriptionManager = useSubscriptionManager();
    const castTransportFromStore = useWorkbenchSyncStore(s => s.castTransport);
    const setCastTransport = useWorkbenchSyncStore(s => s.setCastTransport);

    const transportRef = useRef<WebRtcRpcTransport | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const clockSyncRef = useRef<ClockSyncService | null>(null);
    const chromecastSubRef = useRef<ChromecastRuntimeSubscription | null>(null);
    const lastWorkbenchFingerprintRef = useRef<string>('');

    // --- Workbench Mode Syncing (Playground Bridge) ---
    const viewMode = useWorkbenchSyncStore(s => s.viewMode);
    const selectedBlock = useWorkbenchSyncStore(s => s.selectedBlock);
    const documentItems = useWorkbenchSyncStore(s => s.documentItems);
    const analyticsSegments = useWorkbenchSyncStore(s => s.analyticsSegments);
    const runtime = useWorkbenchSyncStore(s => s.runtime);
    const execution = useWorkbenchSyncStore(s => s.execution);

    useEffect(() => {
        const transport = transportRef.current;
        if (!isCasting || !transport?.connected) return;

        let message: RpcWorkbenchUpdate;

        // In the playground, we don't always have a global runtime, 
        // so we check if one is active in the store first.
        if (runtime && (execution.status === 'running' || execution.status === 'paused' || execution.status === 'completed')) {
            // Let the runtime/timer components handle active/review modes.
            // We just ensure we don't override them with preview here.
            return;
        }

        // Default to preview mode for the current note
        message = buildPreviewMessage(selectedBlock, documentItems);

        // Skip send if nothing has changed
        const fingerprint = JSON.stringify(message);
        if (fingerprint === lastWorkbenchFingerprintRef.current) return;
        lastWorkbenchFingerprintRef.current = fingerprint;

        try {
            transport.send(message);
        } catch (err) {
            console.warn('[CastButtonRpc] Failed to send workbench update:', err);
        }
    }, [isCasting, transportRef.current?.connected, viewMode, selectedBlock, documentItems, runtime, execution.status]);

    // Re-adopt or re-establish transport on mount/remount
    useEffect(() => {
        const tryConnect = async () => {
            if (!isCasting || transportRef.current) return;

            // Case A: Transport exists in store (navigation within SPA)
            if (castTransportFromStore) {
                console.log('[CastButtonRpc] Re-adopting existing transport from store');
                transportRef.current = castTransportFromStore as WebRtcRpcTransport;
                setEventProvider(new ChromecastEventProvider(transportRef.current));
                return;
            }

            // Case B: Transport is missing (page refresh) but session is active
            if (sdkState === 'session-active') {
                console.log('[CastButtonRpc] Re-establishing transport from active session (page refresh)');
                try {
                    const session = ChromecastSdk.getSession();
                    if (!session) throw new Error('No Cast session found');

                    const signaling = new SenderCastSignaling(session);
                    const transport = new WebRtcRpcTransport('offerer', signaling);
                    transportRef.current = transport;

                    await transport.connect();
                    setEventProvider(new ChromecastEventProvider(transport));
                    setCastTransport(transport);
                    console.log('[CastButtonRpc] Transport re-established after refresh');
                } catch (err) {
                    console.error('[CastButtonRpc] Failed to re-establish transport:', err);
                    setIsCasting(false);
                }
            }
        };

        tryConnect();
    }, [isCasting, sdkState, castTransportFromStore, setCastTransport]);

    // Track state in refs for the native event listener closure
    const isCastingRef = useRef(false);
    isCastingRef.current = isCasting;
    const sdkStateRef = useRef(sdkState);
    sdkStateRef.current = sdkState;
    const isDisconnectingRef = useRef(false);
    isDisconnectingRef.current = isDisconnecting;

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
            if (newState === 'session-active') {
                setIsCasting(true);
            } else if (newState === 'ready' || newState === 'unavailable') {
                setIsCasting(false);
            }
        });

        return unsub;
    }, []);

    // Shared helper: attach a new ChromecastRuntimeSubscription to a manager
    // Returns the subscription so it can be passed to ProjectionSyncProvider
    const attachSubscription = useCallback((mgr: SubscriptionManager, transport: WebRtcRpcTransport) => {
        const chromecastSub = new ChromecastRuntimeSubscription(transport, {
            id: CHROMECAST_SUBSCRIPTION_ID,
        });
        mgr.add(chromecastSub);
        console.log('[CastButtonRpc] Attached subscription to SubscriptionManager');
        chromecastSubRef.current = chromecastSub; // Store the subscription
        return chromecastSub; // Return the subscription
    }, []);

    const cleanupCast = useCallback(() => {
        // Null out refs FIRST so re-entrant calls (fired by dispose()'s
        // notifyDisconnected() → onDisconnected handler → cleanupCast)
        // are no-ops instead of double-disposing.
        subscriptionManager?.remove(CHROMECAST_SUBSCRIPTION_ID);

        chromecastSubRef.current = null;
        const transport = transportRef.current;
        transportRef.current = null;   // ← null before dispose to break re-entrancy

        if (transport?.connected) {
            try { transport.send({ type: 'rpc-dispose' }); } catch { /* ignore */ }
        }

        setEventProvider(prev => {
            prev?.dispose();
            return null;
        });

        // Clean up clock sync service
        const clockSync = clockSyncRef.current;
        clockSyncRef.current = null;
        clockSync?.dispose();

        transport?.dispose();
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

    // Native click handler to preserve "User Activation" gesture.
    // React's SyntheticEvent system can introduce microtasks that break gesture-sensitive APIs.
    useEffect(() => {
        const btn = buttonRef.current;
        if (!btn) return;

        const onNativeClick = async () => {
            // If the SDK thinks we are casting, the button should stop it,
            // even if our internal WebRTC state (isCasting) is false.
            if (sdkStateRef.current === 'session-active') {
                if (isDisconnectingRef.current) return;

                console.log('[CastButtonRpc] Stopping active session');
                setIsDisconnecting(true);
                try {
                    cleanupCast();
                    ChromecastSdk.endSession();
                } finally {
                    // Safety timeout to reset busy state if events are missed
                    setTimeout(() => setIsDisconnecting(false), 2000);
                }
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

                // Perform clock synchronization to account for clock drift between devices
                try {
                    const clockSync = new ClockSyncService(transport);
                    clockSyncRef.current = clockSync;

                    console.log('[CastButtonRpc] Starting clock synchronization...');
                    const result = await clockSync.sync();
                    console.log(`[CastButtonRpc] Clock sync complete: offset=${result.offsetMs.toFixed(2)}ms, avg RTT=${result.avgRttMs.toFixed(2)}ms`);
                } catch (err) {
                    console.error('[CastButtonRpc] Clock sync failed:', err);
                    // Don't fail the cast if sync fails — timers will still work
                    // with default (unsynchronized) behavior
                }

                const eventProvider = new ChromecastEventProvider(transport);
                setEventProvider(eventProvider);
                setCastTransport(transport);
                setIsCasting(true);

                // GESTURE/SESSION CRITICAL: Now that transport is connected, wire it up 
                // to the SubscriptionManager immediately. This ensures the catch-up
                // snapshot is sent while the transport is definitely 'connected'.
                if (subscriptionManager) {
                    attachSubscription(subscriptionManager, transport);
                }

                // Also ensure the receiver's display mode is synchronized.
                // The WorkbenchCastBridge will handle subsequent updates, but we send
                // an initial mode sync here to be sure.
                const workbenchState = useWorkbenchSyncStore.getState();
                transport.send({
                    type: 'rpc-workbench-update',
                    mode: workbenchState.execution.status === 'running' ? 'active' : 'idle',
                });

                console.log('[CastButtonRpc] Cast session established and synchronized');

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
        if (!eventProvider || !isCasting) return;

        const unsub = eventProvider.onEvent((event) => {
            const state = useWorkbenchSyncStore.getState();
            const { handleNext, handleStart, handlePause, handleStop } = state.handles;
            switch (event.name) {
                case 'next': handleNext(); break;
                case 'start': handleStart(); break;
                case 'pause': handlePause(); break;
                case 'stop': handleStop(); break;
            }
        });
        return unsub;
    }, [isCasting, eventProvider]);

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
        <ProjectionSyncProvider chromecastSubscription={chromecastSubRef.current ?? null}>
            <div className="relative">
                <Button
                    ref={buttonRef}
                    variant="ghost"
                    size="icon"
                    disabled={isCurrentlyBusy || !canInteract}
                    className={cn(
                        "transition-all duration-300",
                        isConnected ? "text-blue-500 bg-blue-500/10" : "",
                        isCurrentlyBusy ? "text-blue-400" : "",
                        isAvailable ? "text-foreground hover:text-blue-500" : ""
                    )}
                    title={isConnected ? "Stop Casting" : (isCurrentlyBusy ? "Connecting..." : "Cast to TV")}
                >
                    {isConnected ? (
                        <TvMinimal className={cn(
                            "h-5 w-5",
                            !isWebRtcActive && "opacity-50",
                            isDisconnecting && "animate-pulse"
                        )} />
                    ) : (
                        <Cast className={cn(
                            "h-5 w-5",
                            isCurrentlyConnecting ? "animate-pulse-opacity" : ""
                        )} />
                    )}
                </Button>
            </div>
        </ProjectionSyncProvider>
    );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildReviewMessage(
    analyticsSegments: Segment[],
): RpcWorkbenchUpdate {
    // Derive total duration from segments instead of old time-series data
    const totalSeconds = analyticsSegments.length > 0
        ? Math.max(...analyticsSegments.map(s => s.endTime)) - Math.min(...analyticsSegments.map(s => s.startTime))
        : 0;
    const totalMs = Math.round(totalSeconds * 1000);

    const rows: Array<{ label: string; value: string }> = [];
    if (totalMs > 0) {
        rows.push({ label: 'Total Time', value: formatTimeMMSS(totalMs) });
    }
    rows.push({ label: 'Segments', value: String(analyticsSegments.length) });

    const maxDepth = Math.max(...analyticsSegments.map(s => s.depth));
    const leafSegs = analyticsSegments.filter(s => s.depth === maxDepth).slice(0, 4);
    leafSegs.forEach(seg => {
        rows.push({
            label: seg.name || 'Segment',
            value: formatTimeMMSS(Math.round(seg.elapsed * 1000)),
        });
    });

    return {
        type: 'rpc-workbench-update',
        mode: 'review',
        reviewData: {
            totalDurationMs: totalMs,
            completedSegments: analyticsSegments.length,
            rows,
        },
    };
}

function buildPreviewMessage(
    selectedBlock: WodBlock | null,
    documentItems: DocumentItem[],
): RpcWorkbenchUpdate {
    const wodItems = documentItems.filter(i => i.type === 'wod');

    if (wodItems.length === 0 && !selectedBlock) {
        return { type: 'rpc-workbench-update', mode: 'idle' };
    }

    const titleSource = selectedBlock?.content ?? wodItems[0]?.content ?? '';
    const title = titleSource.split('\n')[0].trim().substring(0, 60) || 'Workout';

    const blocks = wodItems.slice(0, 8).map(item => ({
        id: item.id,
        title: (item.wodBlock?.content ?? item.content).split('\n')[0].trim().substring(0, 50) || 'Workout',
        statementCount: item.wodBlock?.statements?.length ?? 0,
    }));

    return {
        type: 'rpc-workbench-update',
        mode: 'preview',
        previewData: { title, blocks },
    };
}
