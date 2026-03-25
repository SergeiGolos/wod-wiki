import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TvMinimal, Cast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import { ChromecastSdk, type CastSdkState } from '@/services/cast/ChromecastSdk';
import { SenderCastSignaling } from '@/services/cast/CastSignaling';
import { WebRTCTransport } from '@/services/cast/WebRTCTransport';
import { CAST_APP_ID, DEFAULT_MEDIA_RECEIVER_APP_ID, hasCustomCastAppId } from '@/services/cast/config';
import { v4 as uuidv4 } from 'uuid';
import { CAST_NAMESPACE as CAST_NAMESPACE_STR } from '@/types/cast/messages';
import type { EventName, CastMessage } from '@/types/cast/messages';
import { cn } from '@/lib/utils';

export const CastButton: React.FC = () => {
    const [sdkState, setSdkState] = useState<CastSdkState>(ChromecastSdk.getState());
    const [isCasting, setIsCasting] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const store = useWorkbenchSyncStore();
    const transportRef = useRef<WebRTCTransport | null>(null);
    const sessionIdRef = useRef<string>(uuidv4().substring(0, 8));

    // Initialize SDK on mount and listen for state changes
    useEffect(() => {
        if (!hasCustomCastAppId) {
            console.error(
                `[CastButton] Cast disabled: VITE_CAST_APP_ID is not configured with a Custom Receiver ID. ` +
                `Current value: ${CAST_APP_ID || '(empty)'} (default media receiver: ${DEFAULT_MEDIA_RECEIVER_APP_ID}).`
            );
            return;
        }

        // Load the SDK early to check availability
        ChromecastSdk.load(CAST_APP_ID).catch(() => {
            // Error is handled by state-changed listener below
        });

        const unsub = ChromecastSdk.on('state-changed', (newState) => {
            setSdkState(newState as CastSdkState);
        });

        return unsub;
    }, []);

    // Listen for receiver events (D-Pad clicks from Chromecast remote)
    useEffect(() => {
        const transport = transportRef.current;
        if (!transport || !isCasting) return;

        const handleMessage = (data: unknown) => {
            const msg = data as CastMessage;
            if (msg.type !== 'event-from-receiver') return;
            const payload = msg.payload as { event: { name: EventName; timestamp: number; data?: unknown } };
            const state = useWorkbenchSyncStore.getState();
            const { handleNext, handleStart, handlePause, handleStop } = state;
            
            console.log(`[CastButton] Received remote event: "${payload.event.name}" at ${new Date(payload.event.timestamp).toLocaleTimeString()}`);

            switch (payload.event.name) {
                case 'next':
                    console.log('[CastButton] Calling handleNext()');
                    handleNext();
                    break;
                case 'start':
                    console.log('[CastButton] Calling handleStart()');
                    handleStart();
                    break;
                case 'pause':
                    console.log('[CastButton] Calling handlePause()');
                    handlePause();
                    break;
                case 'stop':
                    console.log('[CastButton] Calling handleStop()');
                    handleStop();
                    break;
                default:
                    console.warn(`[CastButton] Unhandled remote event: ${payload.event.name}`);
            }
        };

        transport.on('message', handleMessage);

        const handleDisconnect = () => {
            console.log('[CastButton] WebRTC disconnected');
            setIsCasting(false);
            transportRef.current?.dispose();
            transportRef.current = null;
        };
        transport.on('disconnected', handleDisconnect);

        return () => {
            transport.off('message', handleMessage);
            transport.off('disconnected', handleDisconnect);
        };
    }, [isCasting]);

    // Only send updates on structural changes (not timer ticks)
    // Receiver interpolates timers locally via requestAnimationFrame
    const lastSentFingerprintRef = useRef('');
    const sequenceRef = useRef(0);

    // Reset fingerprint whenever casting starts so the first state update
    // is always sent, even if it looks structurally identical to a prior session.
    useEffect(() => {
        if (isCasting) {
            lastSentFingerprintRef.current = '';
        }
    }, [isCasting]);

    useEffect(() => {
        const transport = transportRef.current;
        const display = store.displayState as any;

        if (!transport || !isCasting || !display) return;

        // Build a structural fingerprint that ignores timer elapsed values
        // but captures identity changes (new block, reset spans, state transitions).
        const rowKeys = (display.displayRows || []).map((r: any) =>
            `${r.blockKey}:${r.label}:${r.blockType}:${JSON.stringify(r.rows)}`
        ).join('|');

        const timerStructure = (display.timerStack || []).map((t: any) => {
            // Include the start timestamp of the first span so a reset/new block
            // still triggers a send even if span count is the same.
            const firstSpanStart = t.spans?.[0]?.started ?? 0;
            return `${t.ownerId}:${t.format}:${t.durationMs}:${t.isRunning}:${t.role}:${t.spans?.length}:${firstSpanStart}`;
        }).join('|');

        const fingerprint = [
            display.workoutState,
            display.subLabel,
            rowKeys,
            timerStructure,
            JSON.stringify(display.lookahead),
            store.execution.status,
        ].join('::');

        if (fingerprint === lastSentFingerprintRef.current) return;
        lastSentFingerprintRef.current = fingerprint;
        sequenceRef.current += 1;

        // Send state-update over the WebRTC DataChannel (same JSON format)
        transport.send({
            type: 'state-update',
            messageId: uuidv4(),
            sessionId: sessionIdRef.current,
            timestamp: Date.now(),
            payload: {
                displayState: {
                    timerStack: display.timerStack || [],
                    cardStack: [],
                    displayRows: display.displayRows || [],
                    lookahead: display.lookahead || null,
                    subLabel: display.subLabel || '',
                    // Use the actual workoutState value — not a boolean conversion —
                    // so the receiver can distinguish idle / running / paused / complete.
                    workoutState: display.workoutState || (display.isRunning ? 'running' : 'paused'),
                },
                sequenceNumber: sequenceRef.current,
            },
        });
    }, [
        isCasting,
        store.displayState,
        store.execution.status,
    ]);

    const handleCast = useCallback(async () => {
        // If the SDK thinks we are casting, the button should stop it,
        // even if our internal WebRTC state (isCasting) is false.
        if (sdkState === 'session-active') {
            console.log('[CastButton] Stopping active session');
            transportRef.current?.dispose();
            transportRef.current = null;
            ChromecastSdk.endSession();
            setIsCasting(false);
            return;
        }

        setIsConnecting(true);
        const t0 = Date.now();
        const elapsed = () => `${Date.now() - t0}ms`;
        try {
            // 0. Validate App ID
            if (!hasCustomCastAppId) {
                throw new Error(
                    `Cast is not configured. Set VITE_CAST_APP_ID to your Custom Receiver App ID (current: ${CAST_APP_ID || '(empty)'}, default media receiver: ${DEFAULT_MEDIA_RECEIVER_APP_ID}).`
                );
            }
            console.log(`[CastButton] App ID: ${CAST_APP_ID}`);

            // 1. Ensure SDK is loaded
            console.log(`[CastButton] Step 1: Loading Cast SDK…`);
            await ChromecastSdk.load(CAST_APP_ID);
            console.log(`[CastButton] Step 1: SDK loaded [${elapsed()}]`);
            
            // 2. Open the native device picker
            console.log(`[CastButton] Step 2: Opening device picker…`);
            await ChromecastSdk.requestSession();
            console.log(`[CastButton] Step 2: Device selected [${elapsed()}]`);

            // 3. Get the active Cast session for signaling
            const session = ChromecastSdk.getSession();
            if (!session) throw new Error('No Cast session after requestSession()');
            console.log(`[CastButton] Step 3: Session obtained — id=${session.getSessionId?.()} state=${session.getSessionState?.()} [${elapsed()}]`);

            const appMetadata = session.getApplicationMetadata?.();
            const advertisedNamespaces = ((appMetadata?.namespaces || []) as Array<{ name?: string }>)
                .map((ns) => ns?.name)
                .filter((name): name is string => Boolean(name));
            console.log('[CastButton] Receiver app metadata namespaces:', advertisedNamespaces);
            if (!advertisedNamespaces.includes(CAST_NAMESPACE_STR)) {
                console.warn(
                    `[CastButton] Receiver metadata does not list namespace ${CAST_NAMESPACE_STR}. ` +
                    'Continuing with ping probe because metadata can be incomplete on some Cast runtimes.'
                );
            }

            // 4. Wait for receiver to boot.  The receiver calls context.start()
            //    as the first <script> in <body> now, so 3s should be plenty.
            //    Also send a "ping" to verify the receiver is alive.
            console.log(`[CastButton] Step 4: Waiting 3s for receiver init…`);
            await new Promise(r => setTimeout(r, 3000));
            console.log(`[CastButton] Step 4: Wait complete [${elapsed()}]`);

            // 4b. Verify session is still alive
            const sessionAfterWait = ChromecastSdk.getSession();
            if (!sessionAfterWait) throw new Error('Cast session died during receiver init wait');
            const sessionState = sessionAfterWait.getSessionState?.();
            console.log(`[CastButton] Step 4b: Session alive — state=${sessionState} [${elapsed()}]`);

            // 4c. Send a quick ping to the receiver via Cast namespace to verify
            //     the custom namespace is working before starting WebRTC
            try {
                await sessionAfterWait.sendMessage(CAST_NAMESPACE_STR, { type: 'ping', timestamp: Date.now() });
                console.log(`[CastButton] Step 4c: Ping sent to receiver [${elapsed()}]`);
            } catch (pingErr) {
                const reason = typeof pingErr === 'string'
                    ? pingErr
                    : ((pingErr as { code?: string; message?: string } | null)?.code
                        || (pingErr as { message?: string } | null)?.message
                        || String(pingErr));

                throw new Error(
                    `Cast namespace ping failed (${reason}). ` +
                    `Receiver is not accepting ${CAST_NAMESPACE_STR}; verify App ID points to the published custom receiver and namespace registration.`
                );
            }

            // 5. Set up WebRTC: Cast namespace → signaling → DataChannel
            console.log(`[CastButton] Step 5: Creating signaling + WebRTCTransport…`);
            const signaling = new SenderCastSignaling(sessionAfterWait);
            const transport = new WebRTCTransport('offerer', signaling);
            transportRef.current = transport;

            console.log(`[CastButton] Step 6: Calling transport.connect()…`);
            await transport.connect();

            console.log(`[CastButton] Step 7: DataChannel OPEN — casting! [${elapsed()}]`);
            setIsCasting(true);
        } catch (err) {
            console.error('[CastButton] Cast failed:', err);
            transportRef.current?.dispose();
            transportRef.current = null;
            setIsCasting(false);
        } finally {
            setIsConnecting(false);
        }
    }, [isCasting, sdkState]);

    // Handle states: unavailable | available | connecting | connected
    const isUnavailable = sdkState === 'unavailable';
    const isAvailable = sdkState === 'ready';
    const isConnected = sdkState === 'session-active';
    const isWebRtcActive = isCasting && isConnected;
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
                "transition-all duration-300 rounded-full",
                isConnected ? "text-blue-500 bg-blue-500/10" : "",
                isCurrentlyConnecting ? "text-blue-400" : "",
                isAvailable ? "text-foreground hover:text-blue-500" : ""
            )}
            title={isConnected ? "Stop Casting" : (isCurrentlyConnecting ? "Connecting..." : "Cast to TV")}
        >
            {isConnected ? (
                <TvMinimal className={cn(
                    "h-5 w-5",
                    !isWebRtcActive && "opacity-50"
                )} />
            ) : (
                <Cast className={cn(
                    "h-5 w-5",
                    isCurrentlyConnecting ? "animate-pulse-opacity" : ""
                )} />
            )}
        </Button>
    );
};
