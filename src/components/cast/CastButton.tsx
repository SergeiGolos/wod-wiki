import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TvMinimal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import { CastManager } from '@/services/cast/CastManager';
import { RELAY_URL } from '@/services/cast/config';
import { v4 as uuidv4 } from 'uuid';

export const CastButton: React.FC = () => {
    const [isCasting, setIsCasting] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const store = useWorkbenchSyncStore();
    const castManagerRef = useRef<CastManager | null>(null);
    const sessionIdRef = useRef<string>(uuidv4().substring(0, 8));

    // Smart Sync: Only push when the logical state changes
    useEffect(() => {
        const manager = castManagerRef.current;
        const display = store.displayState;

        if (manager && isCasting && display) {
            manager.sendStateUpdate(
                sessionIdRef.current,
                {
                    timerStack: display.primaryTimer ? [display.primaryTimer as any] : [],
                    cardStack: [],
                    workoutState: display.isRunning ? 'running' : 'paused',
                    totalElapsedMs: store.execution.elapsedTime
                },
                store.execution.stepCount
            );
        }
    }, [
        isCasting, 
        store.displayState.primaryTimer?.label, 
        store.displayState.primaryTimer?.durationMs,
        store.displayState.isRunning,
        store.execution.status,
        store.execution.stepCount
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
                let url = window.location.href.split('#')[0];
                url = url.replace('viewMode=story', 'viewMode=tv');
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
