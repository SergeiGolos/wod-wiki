import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tv, TvMinimal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import { CastManager } from '@/services/cast/CastManager';
import { RELAY_URL } from '@/services/cast/config';

export const CastButton: React.FC = () => {
    const [connection, setConnection] = useState<any>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const store = useWorkbenchSyncStore();
    const castManagerRef = useRef<CastManager | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    // 1. Setup CastManager
    useEffect(() => {
        const manager = new CastManager();
        castManagerRef.current = manager;

        manager.on('connectionOpened', () => {
            console.log('[CastButton] Connected to relay');
            setIsConnecting(false);
        });

        manager.on('targetDiscovered', (target: any) => {
            if (!sessionIdRef.current) {
                console.log('[CastButton] Receiver discovered:', target.targetId);
                const sid = manager.startCast(target.targetId, '');
                sessionIdRef.current = sid;
                setConnection({ targetId: target.targetId, sessionId: sid });
            }
        });

        manager.on('castStop', () => {
            setConnection(null);
            sessionIdRef.current = null;
        });

        return () => {
            manager.disconnect();
        };
    }, []);

    // 2. Continuous Discovery Loop (when active)
    useEffect(() => {
        if (!isConnecting && !connection) return;
        
        const interval = setInterval(() => {
            if (castManagerRef.current) {
                castManagerRef.current.discoverTargets();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [isConnecting, connection]);

    // 3. Hybrid State Sync (BroadcastChannel + WebSockets)
    useEffect(() => {
        const channel = new BroadcastChannel('wod-wiki-cast');
        
        const syncInterval = setInterval(() => {
            const manager = castManagerRef.current;
            const sessionId = sessionIdRef.current;
            const display = store.displayState;

            const payload = {
                execution: {
                    elapsedTime: store.execution.elapsedTime,
                    status: store.execution.status,
                    stepCount: store.execution.stepCount,
                },
                display: display
            };

            // Method A: Local sync (Tabs on same machine)
            channel.postMessage({ type: 'STATE_UPDATE', payload });

            // Method B: Remote sync (Chromecast via Relay)
            if (manager && sessionId && display) {
                manager.sendStateUpdate(
                    sessionId,
                    {
                        timerStack: display.primaryTimer ? [display.primaryTimer as any] : [],
                        cardStack: [],
                        workoutState: display.isRunning ? 'running' : 'paused',
                        totalElapsedMs: store.execution.elapsedTime
                    },
                    store.execution.stepCount
                );
            }
        }, 500);

        return () => {
            clearInterval(syncInterval);
            channel.close();
        };
    }, [connection, store.displayState, store.execution.elapsedTime, store.execution.status, store.execution.stepCount]);

    const handleCast = useCallback(async () => {
        const manager = castManagerRef.current;
        if (!manager) return;

        if (connection) {
            if (sessionIdRef.current) manager.stopCast(sessionIdRef.current);
            manager.disconnect();
            setConnection(null);
            sessionIdRef.current = null;
            return;
        }

        setIsConnecting(true);
        try {
            console.log('[CastButton] Starting cast to:', RELAY_URL);
            await manager.connect(RELAY_URL);
            manager.discoverTargets();

            if ('PresentationRequest' in window) {
                const url = `${window.location.origin}${window.location.pathname}#/tv`;
                const request = new (window as any).PresentationRequest([url]);
                request.start().catch(e => console.log('Presentation Picker closed'));
            }
        } catch (err) {
            console.error('Cast failed:', err);
            setIsConnecting(false);
        }
    }, [connection]);

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleCast}
            className={connection ? "text-primary" : "text-muted-foreground hover:text-foreground"}
            title={connection ? "Stop Casting" : "Cast to TV"}
        >
            {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : 
             connection ? <Tv className="h-5 w-5 animate-pulse" /> : <TvMinimal className="h-5 w-5" />}
        </Button>
    );
};
