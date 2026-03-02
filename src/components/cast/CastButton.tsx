import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TvMinimal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import { CastManager } from '@/services/cast/CastManager';
import { RELAY_URL } from '@/services/cast/config';
import { v4 as uuidv4 } from 'uuid';
import type { EventName } from '@/types/cast/messages';

export const CastButton: React.FC = () => {
    const [isCasting, setIsCasting] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const store = useWorkbenchSyncStore();
    const castManagerRef = useRef<CastManager | null>(null);
    const sessionIdRef = useRef<string>(uuidv4().substring(0, 8));

    // Listen for receiver events (D-Pad clicks from Chromecast remote)
    useEffect(() => {
        const manager = castManagerRef.current;
        if (!manager || !isCasting) return;

        const handleReceiverEvent = (payload: { event: { name: EventName; timestamp: number; data?: unknown } }) => {
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

        manager.on('receiverEvent', handleReceiverEvent as any);
        return () => { manager.off('receiverEvent', handleReceiverEvent as any); };
    }, [isCasting]);

    // Only send updates when logical state changes
    useEffect(() => {
        const manager = castManagerRef.current;
        const display = store.displayState as any;

        if (manager && isCasting && display) {
            // Send the full displayState from the bridge — it already contains
            // timerStack, displayRows, lookahead, subLabel, workoutState, etc.
            manager.sendStateUpdate(
                sessionIdRef.current,
                {
                    timerStack: display.timerStack || [],
                    cardStack: [],
                    displayRows: display.displayRows || [],
                    lookahead: display.lookahead || null,
                    subLabel: display.subLabel,
                    workoutState: display.isRunning ? 'running' : 'paused',
                    totalElapsedMs: store.execution.elapsedTime,
                } as any,
                store.execution.stepCount
            );
        }
    }, [
        isCasting, 
        store.displayState,
        store.execution.status,
        store.execution.stepCount,
        store.execution.elapsedTime,
    ]);

    const handleCast = useCallback(async () => {
        if (isCasting) {
            castManagerRef.current?.disconnect();
            setIsCasting(false);
            return;
        }

        setIsConnecting(true);
        try {
            const manager = new CastManager();
            castManagerRef.current = manager;
            await manager.connect(RELAY_URL);
            
            manager.send({
                type: 'register',
                messageId: uuidv4(),
                sessionId: sessionIdRef.current,
                timestamp: Date.now(),
                payload: { clientType: 'caster', clientId: 'web-' + uuidv4().substring(0, 4) }
            } as any);

            setIsCasting(true);

            if ('PresentationRequest' in window) {
                const host = window.location.hostname === '0.0.0.0' ? 'pluto.forest-adhara.ts.net' : window.location.hostname;
                const origin = `https://${host}:6006`;
                const finalUrl = `${origin}/receiver.html?session=${sessionIdRef.current}&relay=${encodeURIComponent(RELAY_URL)}`;
                const request = new (window as any).PresentationRequest([finalUrl]);
                request.start();
            }
        } catch (err) {
            console.error('Cast failed:', err);
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
