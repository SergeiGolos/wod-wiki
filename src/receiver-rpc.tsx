/**
 * receiver-rpc.tsx — React Chromecast receiver using ChromecastReceiverViewSession.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { CAST_NAMESPACE } from '@/types/cast/messages';
import { ChromecastReceiverViewSession } from '@/services/cast/rpc/ViewSession';
import { ChromecastProxyRuntime } from '@/services/cast/rpc/ChromecastProxyRuntime';
import type { WorkbenchDisplayState } from '@/services/cast/rpc/ChromecastProxyRuntime';
import type { IRuntimeEventProvider } from '@/runtime/contracts/IRuntimeEventProvider';
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { TrackViewShell } from '@/components/workout/TrackViewShell';
import { ReceiverStackPanel } from '@/panels/track-panel-chromecast';
import { ReceiverTimerPanel } from '@/panels/timer-panel-chromecast';
import { ReceiverPreviewPanel } from '@/panels/preview-panel-chromecast';
import { ReceiverReviewPanel } from '@/panels/review-panel-chromecast';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import '@/index.css';

const ReceiverApp: React.FC = () => {
    const [proxyRuntime, setProxyRuntime] = useState<ChromecastProxyRuntime | null>(null);
    const [connectionStatus, setConnectionStatus] = useState('waiting-for-cast');
    const [workbenchState, setWorkbenchState] = useState<WorkbenchDisplayState>({ mode: 'idle' });
    const [dpadFlash, setDpadFlash] = useState(false);

    const sessionRef = useRef<ChromecastReceiverViewSession | null>(null);
    const runtimeRef = useRef<ChromecastProxyRuntime | null>(null);
    const eventProviderRef = useRef<IRuntimeEventProvider | null>(null);

    const sendEvent = useCallback((eventName: string, data?: unknown) => {
        eventProviderRef.current?.dispatch({
            name: eventName,
            timestamp: new Date(),
            data,
        });
    }, []);

    const flash = useCallback(() => {
        setDpadFlash(true);
        setTimeout(() => setDpadFlash(false), 200);
    }, []);

    const workbenchStateRef = useRef(workbenchState);
    workbenchStateRef.current = workbenchState;

    const { getFocusProps, setFocusedId } = useSpatialNavigation({
        enabled: !!proxyRuntime,
        initialFocusId: workbenchState.mode === 'preview' ? 'preview-block-0' : 'btn-next',
        onSelect: useCallback((elementId: string, element: HTMLElement) => {
            flash();
            if (elementId.startsWith('preview-block-')) {
                const index = parseInt(elementId.replace('preview-block-', ''), 10);
                const blockId = workbenchStateRef.current.previewData?.blocks[index]?.id;
                sendEvent('select-block', { index, blockId });
                return;
            }

            switch (elementId) {
                case 'timer-main':
                    element.click();
                    break;
                case 'btn-stop':
                    sendEvent('stop');
                    break;
                case 'btn-next':
                    sendEvent('next');
                    break;
                default:
                    element.click();
                    break;
            }
        }, [sendEvent, flash]),
    });

    useEffect(() => {
        if (workbenchState.mode === 'preview') {
            setFocusedId('preview-block-0');
        } else if (workbenchState.mode === 'active') {
            setFocusedId('btn-next');
        }
    }, [workbenchState.mode, setFocusedId]);

    useEffect(() => {
        (window as any).__chromecast_senderClockTimeMs = runtimeRef.current?.getSenderClockTimeMs?.bind(runtimeRef.current) ?? (() => Date.now());
        return () => {
            (window as any).__chromecast_senderClockTimeMs = undefined;
        };
    }, [proxyRuntime]);

    useEffect(() => {
        const castContext = (window as any).cast?.framework?.CastReceiverContext?.getInstance();
        if (!castContext) {
            console.error('[ReceiverApp] Cast Receiver SDK not loaded');
            setConnectionStatus('error: no Cast SDK');
            return;
        }

        castContext.start({
            customNamespaces: {
                [CAST_NAMESPACE]: 'JSON',
            },
            disableIdleTimeout: true,
        });

        setConnectionStatus('cast-ready');

        const session = new ChromecastReceiverViewSession(castContext);
        sessionRef.current = session;

        const unsubConnected = session.onConnected(() => {
            const runtime = session.runtime;
            if (!runtime) return;

            runtimeRef.current = runtime;
            eventProviderRef.current = session.eventProvider;
            setProxyRuntime(runtime);
            setConnectionStatus('connected');

            runtime.subscribeToWorkbench((state) => {
                setWorkbenchState(state);
            });
        });

        const unsubDisconnected = session.onDisconnected(() => {
            setConnectionStatus('disconnected');
            setProxyRuntime(null);
            runtimeRef.current = null;
            eventProviderRef.current = null;
        });

        session.connect().catch((err) => {
            console.error('[ReceiverApp] Failed to initialize receiver view session', err);
            setConnectionStatus('error');
        });

        return () => {
            unsubConnected();
            unsubDisconnected();
            session.dispose();
            sessionRef.current = null;
            runtimeRef.current = null;
            eventProviderRef.current = null;
        };
    }, []);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Backspace') {
                e.preventDefault();
                sendEvent('stop');
                flash();
            }
        };
        document.addEventListener('keydown', handleEscape, true);
        return () => document.removeEventListener('keydown', handleEscape, true);
    }, [sendEvent, flash]);

    if (!proxyRuntime) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/60 font-mono uppercase tracking-[0.5em]">
                <div className="animate-pulse">Wod.Wiki // {connectionStatus}</div>
            </div>
        );
    }

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

    return (
        <ScriptRuntimeProvider runtime={proxyRuntime}>
            <PanelSizeProvider>
                <div className="h-screen w-screen bg-background text-foreground overflow-hidden">
                    {dpadFlash && (
                        <div className="fixed inset-0 bg-primary/10 pointer-events-none z-50 animate-in fade-in duration-150" />
                    )}

                    <TrackViewShell
                        leftPanel={<ReceiverStackPanel />}
                        rightPanelClassName="relative"
                        rightPanel={(
                            <>
                                <ReceiverTimerPanel eventProvider={eventProviderRef.current!} getFocusProps={getFocusProps} />
                                <div className="absolute bottom-2 right-2 opacity-10 text-[8px] font-mono tracking-tighter uppercase">
                                    {connectionStatus}
                                </div>
                            </>
                        )}
                    />
                </div>
            </PanelSizeProvider>
        </ScriptRuntimeProvider>
    );
};

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<ReceiverApp />);
}
