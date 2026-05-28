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
import { audioService } from '@/services/AudioService';
import {
    RECEIVER_BOOT_DEGRADED_STATUS,
    RECEIVER_BOOT_READY_TIMEOUT_MS,
    RECEIVER_BOOT_STANDALONE_STATUS,
    RECEIVER_BOOT_START_FAILURE_STATUS,
    armReceiverBootFallback,
    dismissReceiverBootLoader,
    getReceiverWaitingScreenCopy,
    receiverStandaloneModeEnabled,
} from '@/services/cast/receiverBootLoader';
import '@/index.css';

const ReceiverApp: React.FC = () => {
    const [proxyRuntime, setProxyRuntime] = useState<ChromecastProxyRuntime | null>(null);
    const [connectionStatus, setConnectionStatus] = useState('waiting-for-cast');
    const [workbenchState, setWorkbenchState] = useState<WorkbenchDisplayState>({ mode: 'idle' });
    // dpadFlash removed — activation is now element-level (WOD-274)

    const sessionRef = useRef<ChromecastReceiverViewSession | null>(null);
    const runtimeRef = useRef<ChromecastProxyRuntime | null>(null);
    const eventProviderRef = useRef<IRuntimeEventProvider | null>(null);
    const bootTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const readyReceivedRef = useRef(false);

    const sendEvent = useCallback((eventName: string, data?: unknown) => {
        eventProviderRef.current?.dispatch({
            name: eventName,
            timestamp: new Date(),
            data,
        });
    }, []);

    /**
     * Element-level activation flash (WOD-274).
     * Instead of a full-screen bg-primary/10 overlay that is imperceptible at
     * TV distance, we briefly add `.tv-activating` to the currently-focused
     * navigation element so the pulse happens right where the user is looking.
     */
    const flash = useCallback(() => {
        const focused = document.querySelector<HTMLElement>('[data-nav-focused="true"]');
        if (!focused) return;
        focused.classList.add('tv-activating');
        setTimeout(() => focused.classList.remove('tv-activating'), 250);
    }, []);

    const workbenchStateRef = useRef(workbenchState);
    workbenchStateRef.current = workbenchState;

    const dismissToWaiting = useCallback(() => {
        // Best effort: notify sender so it can react while still connected.
        sendEvent('dismiss');

        // Local fallback: always reset to waiting even if sender is gone.
        setWorkbenchState({ mode: 'idle' });
        setProxyRuntime(null);
    }, [sendEvent]);

    const { getFocusProps, setFocusedId, reset } = useSpatialNavigation({
        enabled: !!proxyRuntime,
        initialFocusId: workbenchState.mode === 'preview'
            ? 'preview-block-0'
            : workbenchState.mode === 'review'
                ? 'btn-dismiss'
                : 'btn-next',
        onFocusChanged: useCallback((_elementId: string | null, _element: HTMLElement | null) => {
            audioService.playSound('click', 0.3);
        }, []),
        onSelect: useCallback((elementId: string, element: HTMLElement) => {
            audioService.playSound('select', 0.5);
            flash();
            if (elementId.startsWith('preview-block-')) {
                const index = parseInt(elementId.replace('preview-block-', ''), 10);
                const blockId = workbenchStateRef.current.previewData?.blocks[index]?.id;
                sendEvent('select-block', { index, blockId });
                return;
            }

            if (elementId.startsWith('secondary-timer-')) {
                // Non-interactive display element — just visual focus
                return;
            }

            switch (elementId) {
                case 'timer-main':
                    element.click();
                    break;
                case 'btn-pause':
                    element.click();
                    break;
                case 'btn-stop':
                    sendEvent('stop');
                    break;
                case 'btn-next':
                    sendEvent('next');
                    break;
                case 'btn-dismiss':
                    dismissToWaiting();
                    break;
                default:
                    element.click();
                    break;
            }
        }, [sendEvent, flash, dismissToWaiting]),
    });

    /**
     * Cross-mode focus reset strategy (WOD-662):
     * When the receiver transitions between modes (preview → active → review),
     * the entire focusable surface changes. We reset the spatial navigation
     * registry to purge stale elements from the previous mode, then set focus
     * to the primary action element for the new mode.
     *
     * This prevents:
     *   - Ghost elements from the previous mode interfering with arrow-key nav
     *   - Focus traps on elements that no longer exist in the DOM
     *   - Visual focus indicators lingering on unmounted components
     */
    useEffect(() => {
        if (workbenchState.mode === 'preview') {
            const targetId =
                workbenchState.previewData && workbenchState.previewData.blocks.length > 0
                    ? 'preview-block-0'
                    : null;
            reset(targetId);
        } else if (workbenchState.mode === 'active') {
            reset('btn-next');
        } else if (workbenchState.mode === 'review') {
            reset('btn-dismiss');
        } else {
            // idle / unknown — clear everything so no phantom focus remains
            reset(null);
        }
    }, [workbenchState.mode, workbenchState.previewData, reset]);

    useEffect(() => {
        (window as any).__chromecast_senderClockTimeMs = runtimeRef.current?.getSenderClockTimeMs?.bind(runtimeRef.current) ?? (() => Date.now());
        return () => {
            (window as any).__chromecast_senderClockTimeMs = undefined;
        };
    }, [proxyRuntime]);

    useEffect(() => {
        if (receiverStandaloneModeEnabled()) {
            console.info('[ReceiverApp] Standalone browser mode enabled — skipping CAF bootstrap');
            setConnectionStatus(RECEIVER_BOOT_STANDALONE_STATUS);
            dismissReceiverBootLoader('standalone');
            return;
        }

        const castContext = (window as any).cast?.framework?.CastReceiverContext?.getInstance();
        const readyEventType = (window as any).cast?.framework?.system?.EventType?.READY;
        const clearBootTimeout = () => {
            if (bootTimeoutRef.current) {
                clearTimeout(bootTimeoutRef.current);
                bootTimeoutRef.current = null;
            }
        };
        const markCastReady = () => {
            readyReceivedRef.current = true;
            clearBootTimeout();
            dismissReceiverBootLoader('ready');
            setConnectionStatus((current) => current === 'connected' ? current : 'cast-ready');
        };

        if (!castContext) {
            console.warn('[ReceiverApp] Cast Receiver SDK unavailable — using fallback waiting shell');
            setConnectionStatus(RECEIVER_BOOT_DEGRADED_STATUS);
            dismissReceiverBootLoader('no-caf');
            return;
        }

        const handleReady = () => {
            console.log('[ReceiverApp] Cast Receiver READY');
            markCastReady();
        };

        if (readyEventType) {
            castContext.addEventListener(readyEventType, handleReady);
        }

        bootTimeoutRef.current = armReceiverBootFallback(() => {
            if (readyReceivedRef.current || runtimeRef.current) {
                return;
            }

            console.warn(
                `[ReceiverApp] CAF READY did not arrive within ${RECEIVER_BOOT_READY_TIMEOUT_MS}ms; showing fallback waiting shell`,
            );
            setConnectionStatus(RECEIVER_BOOT_DEGRADED_STATUS);
            dismissReceiverBootLoader('timeout');
        }, RECEIVER_BOOT_READY_TIMEOUT_MS);

        try {
            castContext.start({
                customNamespaces: {
                    [CAST_NAMESPACE]: 'JSON',
                },
                disableIdleTimeout: true,
            });
        } catch (error) {
            console.error('[ReceiverApp] Cast Receiver start failed', error);
            clearBootTimeout();
            setConnectionStatus(RECEIVER_BOOT_START_FAILURE_STATUS);
            dismissReceiverBootLoader('start-failure');
            return;
        }

        const session = new ChromecastReceiverViewSession(castContext);
        sessionRef.current = session;

        const unsubConnected = session.onConnected(() => {
            const runtime = session.runtime;
            if (!runtime) return;

            markCastReady();
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
            clearBootTimeout();
            setConnectionStatus(RECEIVER_BOOT_START_FAILURE_STATUS);
            dismissReceiverBootLoader('start-failure');
        });

        return () => {
            clearBootTimeout();
            castContext.removeEventListener?.(readyEventType, handleReady);
            unsubConnected();
            unsubDisconnected();
            session.dispose();
            sessionRef.current = null;
            runtimeRef.current = null;
            eventProviderRef.current = null;
            readyReceivedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Backspace') {
                // Only trigger stop in active mode; preview/review have their own
                // spatial-navigation dismiss paths (btn-dismiss, block-select).
                if (workbenchStateRef.current.mode !== 'active') return;
                e.preventDefault();
                sendEvent('stop');
                flash();
            }
        };
        document.addEventListener('keydown', handleEscape, true);
        return () => document.removeEventListener('keydown', handleEscape, true);
    }, [sendEvent, flash]);

    if (!proxyRuntime) {
        const waitingCopy = getReceiverWaitingScreenCopy(connectionStatus);

        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center px-8 text-center text-white">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.5em] text-white/40">Wod.Wiki</div>
                <div className={waitingCopy.isError ? 'text-2xl font-semibold text-red-200' : 'text-2xl font-semibold text-white/90'}>
                    {waitingCopy.title}
                </div>
                <div className={waitingCopy.isError ? 'mt-3 max-w-xl text-sm text-red-100/90' : 'mt-3 max-w-xl text-sm text-white/60'}>
                    {waitingCopy.description}
                </div>
                <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-white/35">
                    {connectionStatus}
                </div>
            </div>
        );
    }

    if (workbenchState.mode === 'preview' && workbenchState.previewData) {
        return (
            <div key="preview" className="h-screen w-screen bg-background text-foreground overflow-hidden">
                <ReceiverPreviewPanel
                    previewData={workbenchState.previewData}
                    getFocusProps={getFocusProps}
                    onBlockSelect={(_blockId, index) => {
                        sendEvent('select-block', { index, blockId: _blockId });
                    }}
                />
                <div className="absolute bottom-2 right-2 opacity-10 text-[8px] font-mono tracking-tighter uppercase">
                    {connectionStatus}
                </div>
            </div>
        );
    }

    if (workbenchState.mode === 'review' && workbenchState.reviewData) {
        return (
            <div key="review" className="h-screen w-screen bg-background text-foreground overflow-hidden">
                <ReceiverReviewPanel
                    reviewData={workbenchState.reviewData}
                    analyticsSummary={workbenchState.analyticsSummary}
                    onDismiss={dismissToWaiting}
                    getFocusProps={getFocusProps}
                />
                <div className="absolute bottom-2 right-2 opacity-10 text-[8px] font-mono tracking-tighter uppercase">
                    {connectionStatus}
                </div>
            </div>
        );
    }

    return (
        <ScriptRuntimeProvider key="active" runtime={proxyRuntime}>
            <PanelSizeProvider>
                <div className="h-screen w-screen bg-background text-foreground overflow-hidden">
                    <TrackViewShell
                        leftPanel={<ReceiverStackPanel />}
                        rightPanelClassName="relative"
                        leftPanelAriaLabel="Receiver stack panel"
                        rightPanelAriaLabel="Receiver timer panel"
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
