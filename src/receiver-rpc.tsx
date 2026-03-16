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
import type { WorkbenchDisplayState } from '@/services/cast/rpc/ChromecastProxyRuntime';
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { MetricTrackerCard } from '@/components/track/MetricTrackerCard';
import { ReceiverStackPanel } from '@/panels/track-panel-chromecast';
import { ReceiverTimerPanel } from '@/panels/timer-panel-chromecast';
import { ReceiverPreviewPanel } from '@/panels/preview-panel-chromecast';
import { ReceiverReviewPanel } from '@/panels/review-panel-chromecast';
import { calculateDuration } from '@/lib/timeUtils';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import '@/index.css';

// ============================================================================
// ReceiverApp — Main receiver component
// ============================================================================

const ReceiverApp: React.FC = () => {
    const [proxyRuntime, setProxyRuntime] = useState<ChromecastProxyRuntime | null>(null);
    const [connectionStatus, setConnectionStatus] = useState('waiting-for-cast');
    const [workbenchState, setWorkbenchState] = useState<WorkbenchDisplayState>({ mode: 'idle' });
    const [now, setNow] = useState(Date.now());
    const [dpadFlash, setDpadFlash] = useState(false);
    const runtimeRef = useRef<ChromecastProxyRuntime | null>(null);
    const transportRef = useRef<WebRtcRpcTransport | null>(null);

    // Persistent signaling instance (lives for the life of the Receiver app)
    const signalingRef = useRef<ReceiverCastSignaling | null>(null);

    // Send event back to browser via the proxy runtime
    const sendEvent = useCallback((eventName: string, data?: unknown) => {
        const runtime = runtimeRef.current;
        if (!runtime) return;
        runtime.handle({
            name: eventName,
            timestamp: new Date(),
            data,
        });
    }, []);

    // D-Pad flash helper
    const flash = useCallback(() => {
        setDpadFlash(true);
        setTimeout(() => setDpadFlash(false), 200);
    }, []);

    // Keep workbenchState in a ref so the onSelect callback always reads
    // the latest value without needing it in its dependency array.
    const workbenchStateRef = useRef(workbenchState);
    workbenchStateRef.current = workbenchState;

    // ── Spatial Navigation ──────────────────────────────────────────────────
    // The hook handles ArrowUp/Down/Left/Right (focus movement) and
    // Enter/Select (activation). We map element IDs to runtime events.
    const { getFocusProps, setFocusedId } = useSpatialNavigation({
        enabled: !!proxyRuntime,
        initialFocusId: workbenchState.mode === 'preview' ? 'preview-block-0' : 'btn-next',
        onSelect: useCallback((elementId: string, element: HTMLElement) => {
            flash();
            // Preview screen items → select the block to start the workout
            if (elementId.startsWith('preview-block-')) {
                const index = parseInt(elementId.replace('preview-block-', ''), 10);
                const blockId = workbenchStateRef.current.previewData?.blocks[index]?.id;
                sendEvent('select-block', { index, blockId });
                return;
            }
            // Track panel controls
            switch (elementId) {
                case 'timer-main':
                    // Toggle play/pause
                    element.click();
                    break;
                case 'btn-stop':
                    sendEvent('stop');
                    break;
                case 'btn-next':
                    sendEvent('next');
                    break;
                default:
                    // Fallback: click the element
                    element.click();
                    break;
            }
        }, [sendEvent, flash]),
    });

    // Move focus to the appropriate element when the display mode changes.
    // Preview → focus first block; Active → focus the Next button.
    useEffect(() => {
        if (workbenchState.mode === 'preview') {
            setFocusedId('preview-block-0');
        } else if (workbenchState.mode === 'active') {
            setFocusedId('btn-next');
        }
    }, [workbenchState.mode, setFocusedId]);

    // Local clock for smooth timer interpolation
    // Uses the proxy runtime's clock sync offset to match sender's elapsed time
    useEffect(() => {
        let frameId: number;
        const tick = () => {
            // Use the sender's clock time (adjusted for drift) instead of local Date.now()
            const senderNow = runtimeRef.current?.getSenderClockTimeMs() ?? Date.now();
            setNow(senderNow);
            frameId = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(frameId);
    }, []);

    // Expose the sender's clock time globally for useTimerDisplay hook access
    useEffect(() => {
        const updateClock = () => {
            (window as any).__chromecast_senderClockTimeMs = runtimeRef.current?.getSenderClockTimeMs?.bind(runtimeRef.current) ?? (() => Date.now());
        };
        updateClock();

        // Update whenever proxyRuntime changes
        const cleanup = () => (window as any).__chromecast_senderClockTimeMs = undefined;

        return cleanup;
    }, [proxyRuntime]);

    /** 
     * Initialize/Re-initialize the WebRTC transport and ProxyRuntime.
     * Called whenever a new signaling offer arrives.
     */
    const setupTransport = useCallback(() => {
        if (!signalingRef.current) return;

        console.log('[ReceiverApp] Setting up new transport session…');
        
        // 1. Cleanup existing session if active
        if (transportRef.current) {
            console.log('[ReceiverApp] Disposing previous transport for new connection');
            transportRef.current.dispose();
            transportRef.current = null;
        }
        if (runtimeRef.current) {
            runtimeRef.current.dispose();
            runtimeRef.current = null;
        }
        setProxyRuntime(null);

        // 2. Create new transport + runtime.
        // Wrap the shared signaling in a non-disposable facade so that
        // transport.dispose() cannot kill signalingRef.current and break
        // reconnection — ReceiverApp owns the signaling lifetime, not the transport.
        const sharedSignaling = signalingRef.current;
        const signalingFacade = {
            send: (s: any) => sharedSignaling.send(s),
            onSignal: (h: any) => sharedSignaling.onSignal(h),
            dispose: () => { /* no-op — signaling is owned by ReceiverApp */ },
        };
        const transport = new WebRtcRpcTransport('answerer', signalingFacade as any);
        const runtime = new ChromecastProxyRuntime(transport);
        
        transportRef.current = transport;
        runtimeRef.current = runtime;

        transport.onConnected(() => {
            console.log('[ReceiverApp] RPC transport connected');
            setConnectionStatus('connected');
            setProxyRuntime(runtime);

            // Subscribe to workbench display mode updates
            runtime.subscribeToWorkbench((state) => {
                setWorkbenchState(state);
            });
        });

        transport.onDisconnected(() => {
            console.log('[ReceiverApp] RPC transport disconnected — returning to waiting screen');
            setConnectionStatus('disconnected');
            // Return to waiting screen immediately so the user can see the
            // receiver is ready for a new connection.
            setProxyRuntime(null);
            // Clean up refs only if they still point to this session's objects
            // (setupTransport() may have already replaced them).
            if (runtimeRef.current === runtime) {
                runtimeRef.current.dispose();
                runtimeRef.current = null;
            }
            if (transportRef.current === transport) {
                transportRef.current = null;
            }
        });

        transport.connect().catch((err: unknown) => {
            console.error('[ReceiverApp] RPC transport connect failed', err);
            setConnectionStatus('error');
        });

        return { transport, runtime };
    }, []);

    // WebRTC connection via Cast Receiver SDK + persistent signaling
    useEffect(() => {
        const castContext = (window as any).cast?.framework?.CastReceiverContext?.getInstance();
        if (!castContext) {
            console.error('[ReceiverApp] Cast Receiver SDK not loaded');
            setConnectionStatus('error: no Cast SDK');
            return;
        }

        // Start the CAF receiver context FIRST — the custom namespace must be
        // declared in start() before addCustomMessageListener() is called.
        castContext.start({
            customNamespaces: {
                [CAST_NAMESPACE]: 'JSON',
            },
            // Prevent the CAF SDK from consuming D-Pad / media key events
            // so they propagate to our spatial navigation handler.
            disableIdleTimeout: true,
        });
        setConnectionStatus('cast-ready');
        console.log('[ReceiverApp] castContext.start() called — namespace registered');

        // ── Diagnostic: log ALL key events reaching the page ──────────
        // This capture-phase listener fires before anything else and logs
        // key info to the console (visible in chrome://inspect remote debug).
        // Remove once D-Pad navigation is confirmed working on device.
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            console.log(`[KeyDiag] key=${e.key} code=${e.code} keyCode=${e.keyCode} type=${e.type}`);
        }, true);

        castContext.addEventListener((window as any).cast.framework.system.EventType.READY, () => {
            console.log('[ReceiverApp] Cast Receiver READY');
            const loader = document.getElementById('initial-loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 500); // Wait for fade-out transition
            }
        });

        // Create signaling AFTER start(). 
        // We keep this signaling instance alive for the duration of the app.
        const signaling = new ReceiverCastSignaling(castContext);
        signalingRef.current = signaling;

        // CRITICAL: Reconnection support.
        // Listen for incoming signals. If we see a 'webrtc-offer', it means a 
        // sender is trying to start a new session. We trigger setupTransport()
        // to handle the handshake even if we were already connected to an 
        // old session (clearing it out first).
        signaling.onSignal((signal) => {
            if (signal.type === 'webrtc-offer') {
                console.log('[ReceiverApp] Received webrtc-offer — triggering transport setup');
                setupTransport();
            }
        });

        return () => {
            runtimeRef.current?.dispose();
            transportRef.current?.dispose();
            signaling.dispose();
            signalingRef.current = null;
            runtimeRef.current = null;
            transportRef.current = null;
        };
    }, [setupTransport]);

    // Escape/Backspace handler (stop event — not part of spatial navigation)
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Backspace') {
                e.preventDefault();
                sendEvent('stop');
                flash();
            }
        };
        // Capture phase so we intercept before Cast SDK consumes the event
        document.addEventListener('keydown', handleEscape, true);
        return () => document.removeEventListener('keydown', handleEscape, true);
    }, [sendEvent, flash]);

    // Waiting screen (not yet connected)
    if (!proxyRuntime) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/20 font-mono uppercase tracking-[0.5em]">
                <div className="animate-pulse">Wod.Wiki // {connectionStatus}</div>
            </div>
        );
    }

    // Preview mode: note loaded but no active runtime
    if (workbenchState.mode === 'preview' && workbenchState.previewData) {
        return (
            <div className="h-screen w-screen bg-background text-foreground overflow-hidden">
                {dpadFlash && (
                    <div className="fixed inset-0 bg-primary/10 pointer-events-none z-50 animate-in fade-in duration-150" />
                )}
                <ReceiverPreviewPanel previewData={workbenchState.previewData} getFocusProps={getFocusProps} />
                <div className="absolute bottom-2 right-2 opacity-10 text-[8px] font-mono tracking-tighter uppercase">
                    {connectionStatus}
                </div>
            </div>
        );
    }

    // Review mode: workout completed, results available
    if (workbenchState.mode === 'review' && workbenchState.reviewData) {
        return (
            <div className="h-screen w-screen bg-background text-foreground overflow-hidden">
                {dpadFlash && (
                    <div className="fixed inset-0 bg-primary/10 pointer-events-none z-50 animate-in fade-in duration-150" />
                )}
                <ReceiverReviewPanel
                    reviewData={workbenchState.reviewData}
                    analyticsSummary={workbenchState.analyticsSummary}
                />
                <div className="absolute bottom-2 right-2 opacity-10 text-[8px] font-mono tracking-tighter uppercase">
                    {connectionStatus}
                </div>
            </div>
        );
    }

    // Active / Idle mode: normal stack + timer layout
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
                        <div className="p-4 pt-6">
                            <MetricTrackerCard />
                        </div>
                        <ReceiverTimerPanel localNow={now} onEvent={sendEvent} getFocusProps={getFocusProps} />
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
