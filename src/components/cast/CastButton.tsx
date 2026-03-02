import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TvMinimal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import { ChromecastSdk } from '@/services/cast/ChromecastSdk';
import { SenderCastSignaling } from '@/services/cast/CastSignaling';
import { WebRTCTransport } from '@/services/cast/WebRTCTransport';
import { CAST_APP_ID } from '@/services/cast/config';
import { v4 as uuidv4 } from 'uuid';
import type { EventName, CastMessage } from '@/types/cast/messages';

export const CastButton: React.FC = () => {
    const [isCasting, setIsCasting] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const store = useWorkbenchSyncStore();
    const transportRef = useRef<WebRTCTransport | null>(null);
    const sessionIdRef = useRef<string>(uuidv4().substring(0, 8));

    // Listen for receiver events (D-Pad clicks from Chromecast remote)
    useEffect(() => {
        const transport = transportRef.current;
        if (!transport || !isCasting) return;

        const handleMessage = (data: unknown) => {
            const msg = data as CastMessage;
            if (msg.type !== 'event-from-receiver') return;
            const payload = msg.payload as { event: { name: EventName; timestamp: number; data?: unknown } };
            const { handleNext, handleStart, handlePause, handleStop } = useWorkbenchSyncStore.getState();
            console.log(`[CastButton] Received remote event: ${payload.event.name}`);

            switch (payload.event.name) {
                case 'next':
                    handleNext();
                    break;
                case 'start':
                    handleStart();
                    break;
                case 'pause':
                    handlePause();
                    break;
                case 'stop':
                    handleStop();
                    break;
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

    useEffect(() => {
        const transport = transportRef.current;
        const display = store.displayState as any;

        if (!transport || !isCasting || !display) return;

        // Build a structural fingerprint that ignores timer elapsed values.
        const rowKeys = (display.displayRows || []).map((r: any) =>
            `${r.blockKey}:${r.label}:${r.blockType}:${JSON.stringify(r.rows)}`
        ).join('|');

        const timerStructure = (display.timerStack || []).map((t: any) =>
            `${t.ownerId}:${t.format}:${t.durationMs}:${t.isRunning}:${t.role}:${t.spans?.length}`
        ).join('|');

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
                    subLabel: display.subLabel,
                    workoutState: display.isRunning ? 'running' : 'paused',
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
        if (isCasting) {
            // Stop casting
            transportRef.current?.dispose();
            transportRef.current = null;
            ChromecastSdk.endSession();
            setIsCasting(false);
            return;
        }

        setIsConnecting(true);
        try {
            // 1. Load the Cast SDK and open the native device picker
            await ChromecastSdk.load(CAST_APP_ID);
            await ChromecastSdk.requestSession();

            // 2. Get the active Cast session for signaling
            const session = ChromecastSdk.getSession();
            if (!session) throw new Error('No Cast session after requestSession()');

            // 3. Small delay to let the receiver's CAF context.start() complete.
            //    The Chromecast loads our receiver URL and must initialise the
            //    Cast Receiver SDK before it can accept custom namespace messages.
            console.log('[CastButton] Cast session active — waiting for receiver init…');
            await new Promise(r => setTimeout(r, 2000));

            // 4. Set up WebRTC: Cast namespace → signaling → DataChannel
            const signaling = new SenderCastSignaling(session);
            const transport = new WebRTCTransport('offerer', signaling);
            transportRef.current = transport;

            await transport.connect();

            console.log('[CastButton] WebRTC DataChannel open — casting!');
            setIsCasting(true);
        } catch (err) {
            console.error('[CastButton] Cast failed:', err);
            transportRef.current?.dispose();
            transportRef.current = null;
        } finally {
            setIsConnecting(false);
        }
    }, [isCasting]);

    return (
        <Button variant="ghost" size="icon" onClick={handleCast} className={isCasting ? "text-blue-500 bg-blue-500/10 animate-pulse" : ""}>
            {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <TvMinimal className="h-5 w-5" />}
        </Button>
    );
};
