/**
 * receiver-rpc.tsx — React Chromecast receiver using ChromecastProxyRuntime.
 *
 * This replaces receiver-main.tsx's manual state parsing with a proper
 * IScriptRuntime proxy. The proxy hydrates RPC messages into stack snapshots
 * and output statements, letting standard workbench hooks (useSnapshotBlocks,
 * useStackTimers, etc.) work identically to the browser.
 *
 * Setup:
 * 1. Cast Receiver SDK starts and creates signaling
 * 2. WebRtcRpcTransport connects as answerer
 * 3. ChromecastProxyRuntime wraps the transport
 * 4. <ScriptRuntimeProvider> exposes runtime to hooks
 * 5. D-Pad events → proxyRuntime.handle() → RPC → browser
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { CAST_NAMESPACE } from '@/types/cast/messages';
import { ReceiverCastSignaling } from '@/services/cast/CastSignaling';
import { WebRtcRpcTransport } from '@/services/cast/rpc/WebRtcRpcTransport';
import { ChromecastProxyRuntime } from '@/services/cast/rpc/ChromecastProxyRuntime';
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import { TimerStackView } from '@/components/workout/TimerStackView';
import { PanelSizeProvider } from '@/components/layout/panel-system/PanelSizeContext';
import { useSnapshotBlocks } from '@/runtime/hooks/useStackSnapshot';
import { usePrimaryTimer, useSecondaryTimers, useStackTimers } from '@/runtime/hooks/useStackDisplay';
import { useNextPreview } from '@/runtime/hooks/useNextPreview';
import { FragmentSourceRow } from '@/components/fragments/FragmentSourceRow';
import { cn } from '@/lib/utils';
import { formatTimeMMSS } from '@/lib/formatTime';
import { calculateDuration } from '@/lib/timeUtils';
import { Timer, CheckCircle2 } from 'lucide-react';
import '@/index.css';

// ============================================================================
// ReceiverStackPanel — renders the runtime stack using standard hooks
// ============================================================================

const ReceiverStackPanel: React.FC<{ localNow: number }> = ({ localNow }) => {
    const blocks = useSnapshotBlocks();
    const nextPreview = useNextPreview();
    const allTimers = useStackTimers();

    // Build timer lookup
    const blockTimerMap = new Map<string, {
        elapsed: number;
        durationMs?: number;
        direction: 'up' | 'down';
        isRunning: boolean;
    }>();
    for (const entry of allTimers) {
        const blockKey = entry.block.key.toString();
        blockTimerMap.set(blockKey, {
            elapsed: calculateDuration(entry.timer.spans, localNow),
            durationMs: entry.timer.durationMs,
            direction: entry.timer.direction,
            isRunning: entry.timer.spans.some(s => s.ended === undefined),
        });
    }

    // Root→leaf order (stack is leaf→root)
    const orderedBlocks = [...blocks].reverse();

    return (
        <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
            {/* Stack blocks */}
            <div className="shrink-0">
                {orderedBlocks.length > 0 ? (
                    <div className="flex flex-col gap-1 relative">
                        {orderedBlocks.map((block, index) => {
                            const blockKey = block.key.toString();
                            const timer = blockTimerMap.get(blockKey);
                            const isLeaf = index === orderedBlocks.length - 1;
                            const displayLocs = block.getFragmentMemoryByVisibility('display');
                            const rows = displayLocs.map(loc => loc.fragments);

                            return (
                                <div key={blockKey} className={cn(
                                    "relative w-full",
                                    isLeaf ? "animate-in fade-in slide-in-from-left-1 duration-300" : ""
                                )}>
                                    <div className={cn(
                                        "rounded-md border text-sm transition-all",
                                        isLeaf
                                            ? "bg-card shadow-sm border-primary/40 ring-1 ring-primary/10"
                                            : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50"
                                    )}>
                                        <div className="flex items-center justify-between gap-3 p-3">
                                            <div className="flex flex-col min-w-0">
                                                <span className={cn(
                                                    "font-semibold tracking-tight",
                                                    isLeaf ? "text-foreground" : "text-muted-foreground"
                                                )}>
                                                    {block.label}
                                                </span>
                                            </div>
                                            {timer && (
                                                <div className={cn(
                                                    "flex items-center gap-1.5 px-2 py-1 rounded font-mono text-xs font-bold shrink-0",
                                                    timer.isRunning
                                                        ? "bg-primary/10 text-primary animate-pulse"
                                                        : "bg-muted text-muted-foreground"
                                                )}>
                                                    <Timer className="h-3 w-3" />
                                                    {formatTimeMMSS(timer.elapsed)}
                                                </div>
                                            )}
                                        </div>
                                        {rows.length > 0 && (
                                            <div className="flex flex-col gap-0.5 px-3 pb-2">
                                                {rows.map((row, rowIdx) => (
                                                    <FragmentSourceRow
                                                        key={rowIdx}
                                                        fragments={row}
                                                        size="compact"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-md border border-border bg-card p-4">
                        <span className="text-base font-medium text-foreground capitalize">
                            Ready to Start
                        </span>
                    </div>
                )}
            </div>

            {/* Spacer */}
            <div className="flex-1 min-h-0" />

            {/* Up Next */}
            <div className="shrink-0 bg-muted/30 border border-dashed rounded-lg">
                <div className="p-3 pb-0">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Up Next
                    </h3>
                </div>
                <div className="p-3">
                    {nextPreview ? (
                        <div className={cn(
                            "rounded-md border text-sm transition-all",
                            "bg-card/50 border-border/60 hover:bg-card/80"
                        )}>
                            <div className="flex flex-col gap-0.5 p-3">
                                <FragmentSourceRow
                                    fragments={nextPreview.fragments}
                                    size="compact"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-sm p-3 border border-dashed rounded-lg text-muted-foreground bg-muted/10">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="italic">End of section</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// ReceiverTimerPanel — renders the timer using standard hooks
// ============================================================================

const ReceiverTimerPanel: React.FC<{
    localNow: number;
    onEvent: (name: string) => void;
}> = ({ localNow, onEvent }) => {
    const primaryTimerEntry = usePrimaryTimer();
    const secondaryTimers = useSecondaryTimers();
    const allTimers = useStackTimers();

    const isRunning = primaryTimerEntry
        ? primaryTimerEntry.timer.spans.some(s => s.ended === undefined)
        : false;

    const primaryElapsed = primaryTimerEntry
        ? calculateDuration(primaryTimerEntry.timer.spans, localNow)
        : 0;

    // Build timerStates map for TimerStackView
    const timerStates = new Map<string, { elapsed: number; duration?: number; format: 'down' | 'up' }>();
    for (const t of allTimers) {
        timerStates.set(t.block.key.toString(), {
            elapsed: calculateDuration(t.timer.spans, localNow),
            duration: t.timer.durationMs,
            format: t.timer.direction,
        });
    }

    const primaryEntry = primaryTimerEntry ? {
        id: `timer-${primaryTimerEntry.block.key}`,
        ownerId: primaryTimerEntry.block.key.toString(),
        timerMemoryId: '',
        label: primaryTimerEntry.timer.label,
        format: primaryTimerEntry.timer.direction,
        durationMs: primaryTimerEntry.timer.durationMs,
        role: primaryTimerEntry.isPinned ? 'primary' as const : 'auto' as const,
        accumulatedMs: primaryElapsed,
    } : undefined;

    const secondaryEntries = secondaryTimers.map(t => ({
        id: `timer-${t.block.key}`,
        ownerId: t.block.key.toString(),
        timerMemoryId: '',
        label: t.timer.label,
        format: t.timer.direction,
        durationMs: t.timer.durationMs,
        role: 'auto' as const,
        accumulatedMs: calculateDuration(t.timer.spans, localNow),
    }));

    return (
        <div className="flex-1 flex flex-col justify-center">
            <TimerStackView
                elapsedMs={primaryElapsed}
                hasActiveBlock={!!primaryTimerEntry}
                onStart={() => onEvent('start')}
                onPause={() => onEvent('pause')}
                onStop={() => onEvent('stop')}
                onNext={() => onEvent('next')}
                isRunning={isRunning}
                primaryTimer={primaryEntry}
                subLabel={undefined}
                secondaryTimers={secondaryEntries}
                timerStates={timerStates}
            />
        </div>
    );
};

// ============================================================================
// ReceiverApp — Main receiver component
// ============================================================================

const ReceiverApp: React.FC = () => {
    const [proxyRuntime, setProxyRuntime] = useState<ChromecastProxyRuntime | null>(null);
    const [connectionStatus, setConnectionStatus] = useState('waiting-for-cast');
    const [now, setNow] = useState(Date.now());
    const [dpadFlash, setDpadFlash] = useState(false);
    const runtimeRef = useRef<ChromecastProxyRuntime | null>(null);

    // Local clock for smooth timer interpolation
    useEffect(() => {
        let frameId: number;
        const tick = () => {
            setNow(Date.now());
            frameId = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(frameId);
    }, []);

    // WebRTC connection via Cast Receiver SDK + ChromecastProxyRuntime
    useEffect(() => {
        const castContext = (window as any).cast?.framework?.CastReceiverContext?.getInstance();
        if (!castContext) {
            console.error('[ReceiverApp] Cast Receiver SDK not loaded');
            setConnectionStatus('error: no Cast SDK');
            return;
        }

        const signaling = new ReceiverCastSignaling(castContext);
        const transport = new WebRtcRpcTransport('answerer', signaling);

        // Create the proxy runtime — it will receive RPC messages from the transport
        const runtime = new ChromecastProxyRuntime(transport);
        runtimeRef.current = runtime;

        transport.onConnected(() => {
            console.log('[ReceiverApp] RPC transport connected');
            setConnectionStatus('connected');
            setProxyRuntime(runtime);
        });

        transport.onDisconnected(() => {
            console.log('[ReceiverApp] RPC transport disconnected');
            setConnectionStatus('disconnected');
            setProxyRuntime(null);
        });

        // Start the CAF receiver context
        castContext.start({
            customNamespaces: {
                [CAST_NAMESPACE]: 'JSON',
            },
        });
        setConnectionStatus('cast-ready');

        transport.connect().catch((err: unknown) => {
            console.error('[ReceiverApp] RPC transport connect failed', err);
            setConnectionStatus('error');
        });

        return () => {
            runtime.dispose();
            transport.dispose();
            runtimeRef.current = null;
        };
    }, []);

    // Send event back to browser via the proxy runtime
    const sendEvent = useCallback((eventName: string) => {
        const runtime = runtimeRef.current;
        if (!runtime) return;
        runtime.handle({
            name: eventName,
            timestamp: new Date(),
        });
    }, []);

    // D-Pad key handler
    useEffect(() => {
        document.body.tabIndex = 0;
        document.body.focus();

        const refocus = () => {
            if (document.activeElement !== document.body) {
                document.body.focus();
            }
        };

        const focusInterval = setInterval(refocus, 1000);
        window.addEventListener('blur', refocus);

        const handleKey = (e: KeyboardEvent) => {
            const isSelect =
                e.key === 'Enter' ||
                e.key === 'Select' ||
                e.key === 'Center' ||
                e.key === 'Ok' ||
                e.key === 'Accept' ||
                e.key === ' ' ||
                e.keyCode === 13 ||
                e.keyCode === 23 ||
                e.keyCode === 32;

            const isPlayPause =
                e.key === 'MediaPlayPause' ||
                e.keyCode === 179;

            if (isSelect || isPlayPause) {
                e.preventDefault();
                sendEvent('next');
                setDpadFlash(true);
                setTimeout(() => setDpadFlash(false), 200);
                return;
            }

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    sendEvent('start');
                    setDpadFlash(true);
                    setTimeout(() => setDpadFlash(false), 200);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    sendEvent('pause');
                    setDpadFlash(true);
                    setTimeout(() => setDpadFlash(false), 200);
                    break;
                case 'Escape':
                case 'Backspace':
                    e.preventDefault();
                    sendEvent('stop');
                    setDpadFlash(true);
                    setTimeout(() => setDpadFlash(false), 200);
                    break;
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => {
            clearInterval(focusInterval);
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('blur', refocus);
        };
    }, [sendEvent]);

    // Waiting screen
    if (!proxyRuntime) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/20 font-mono uppercase tracking-[0.5em]">
                <div className="animate-pulse">Wod.Wiki // {connectionStatus}</div>
            </div>
        );
    }

    return (
        <ScriptRuntimeProvider runtime={proxyRuntime}>
            <PanelSizeProvider>
                <div className="h-screen w-screen bg-background text-foreground flex overflow-hidden">
                    {/* D-Pad flash overlay */}
                    {dpadFlash && (
                        <div className="fixed inset-0 bg-primary/10 pointer-events-none z-50 animate-in fade-in duration-150" />
                    )}

                    {/* Left Column: Stack & Lookahead */}
                    <div className="flex-1 min-w-0 bg-secondary/10 border-r border-border">
                        <ReceiverStackPanel localNow={now} />
                    </div>

                    {/* Right Column: Timer & Controls */}
                    <div className="w-1/2 flex flex-col bg-background transition-all duration-300">
                        <ReceiverTimerPanel localNow={now} onEvent={sendEvent} />
                        <div className="absolute bottom-2 right-2 opacity-10 text-[8px] font-mono tracking-tighter uppercase">
                            {connectionStatus}
                        </div>
                    </div>
                </div>
            </PanelSizeProvider>
        </ScriptRuntimeProvider>
    );
};

// ── Mount ────────────────────────────────────────────────────────────────────

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<ReceiverApp />);
}
