/**
 * receiver-rpc.tsx — React receiver for the cast stack.
 *
 * Two boot paths:
 *  - **Chromecast / standalone**: the production receiver, boots CAF
 *    (or skips it for `?standalone=1` testing). Same as before.
 *  - **Local-tab dual-pane**: when the URL carries `?local=<id>`, the
 *    sender-side `LocalTabBackend` opened this popup and is waiting for
 *    a `MessagePort` transfer. We do the local handshake, hand the
 *    resulting transport to the same `ReceiverApp` component, and never
 *    touch CAF.
 *
 * An error boundary wraps the entire tree so a render error in the
 * receiver React app doesn't blank the popup — the user sees a graceful
 * fallback with the error message and can close the tab manually.
 */

import React, { useEffect, useState, useCallback, useRef, Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { CAST_NAMESPACE } from '@/types/cast/messages';
import { ChromecastReceiverViewSession } from '@/services/cast/rpc/ViewSession';
import { ChromecastProxyRuntime } from '@/services/cast/rpc/ChromecastProxyRuntime';
import type { WorkbenchDisplayState } from '@/services/cast/rpc/ChromecastProxyRuntime';
import type { IRpcTransport } from '@/services/cast/rpc/IRpcTransport';
import type { IRuntimeEventProvider } from '@/runtime/contracts/IRuntimeEventProvider';
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { TrackViewShell } from '@/components/organisms/workout/TrackViewShell';
import { ReceiverStackPanel } from '@/panels/track-panel-chromecast';
import { ReceiverTimerPanel } from '@/panels/wallclock-panel-chromecast';
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
import {
    acquireLocalReceiverSession,
    readLocalSessionIdFromUrl,
} from '@/services/cast/adapters/LocalReceiverBackend';
import '@/index.css';

// =====================================================================
// ReceiverErrorBoundary — keeps the popup from blanking on a render error.
// =====================================================================

interface ReceiverErrorBoundaryState {
    error: Error | null;
}

class ReceiverErrorBoundary extends Component<{ children: ReactNode }, ReceiverErrorBoundaryState> {
    state: ReceiverErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ReceiverErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('[ReceiverApp] render error', error, info);
    }

    render(): ReactNode {
        if (this.state.error) {
            return (
                <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-black text-white p-8">
                    <div className="max-w-2xl text-center space-y-4">
                        <div className="text-2xl font-bold text-red-400">Receiver error</div>
                        <div className="text-sm text-zinc-300 break-words">{this.state.error.message}</div>
                        <div className="text-xs text-zinc-500 pt-4">
                            You can close this tab and try casting again from the sender.
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// =====================================================================
// ReceiverApp — the production receiver. Unchanged from the previous version.
// =====================================================================

const ReceiverApp: React.FC<{ transport?: IRpcTransport }> = ({ transport }) => {
    const [proxyRuntime, setProxyRuntime] = useState<ChromecastProxyRuntime | null>(null);
    const [connectionStatus, setConnectionStatus] = useState('waiting-for-cast');
    const [workbenchState, setWorkbenchState] = useState<WorkbenchDisplayState>({ mode: 'idle' });
    // dpadFlash removed — activation is now element-level (WOD-274)

    const sessionRef = useRef<ChromecastReceiverViewSession | null>(null);
    const runtimeRef = useRef<ChromecastProxyRuntime | null>(null);
    const eventProviderRef = useRef<IRuntimeEventProvider | null>(null);
    const bootTimeoutRef = useRef<number | null>(null);
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
        setProxyRuntime(null);
        runtimeRef.current = null;
        eventProviderRef.current = null;
        setWorkbenchState({ mode: 'idle' });
        audioService.stopAll();
        try { sendEvent('dismiss'); } catch (err) { console.warn(err); }
    }, [sendEvent]);

    const { getFocusProps, reset } = useSpatialNavigation({
        onSelect: (path: string) => {
            if (path.startsWith('block-select:')) {
                sendEvent('select-block', { blockId: path.slice('block-select:'.length) });
                flash();
            } else if (path.startsWith('mode:')) {
                // handled by mode-specific panels
            } else if (path === 'btn-dismiss') {
                dismissToWaiting();
            } else if (path === 'btn-next') {
                sendEvent('next');
                flash();
            } else if (path === 'btn-stop') {
                sendEvent('stop');
                flash();
            } else if (path === 'btn-start') {
                sendEvent('start');
                flash();
            } else if (path === 'btn-pause') {
                sendEvent('pause');
                flash();
            } else if (path === 'btn-reset') {
                sendEvent('reset');
                flash();
            }
        },
    });

    /**
     * Cross-mode focus reset strategy (WOD-662):
     * Reset spatial-nav focus whenever the workbench mode changes, so the
     * user doesn't get stuck on a block that doesn't exist in the new mode.
     */
    useEffect(() => {
        reset();
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
        const session = ChromecastReceiverViewSession.create(castContext, transport);
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
            <div
                data-nav-root="true"
                {...getFocusProps('root')}
                className="min-h-screen w-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-12"
            >
                <div className="text-4xl font-black tracking-wider uppercase opacity-80">{waitingCopy.title}</div>
                <div className="max-w-xl text-center text-base opacity-60 leading-relaxed">
                    {waitingCopy.description}
                </div>
                {waitingCopy.isError && (
                    <div className="text-xs opacity-40 pt-4">
                        You can close this tab and try casting again from the sender.
                    </div>
                )}
            </div>
        );
    }

    if (workbenchState.mode === 'preview' && workbenchState.previewData) {
        return (
            <div data-nav-root="true" {...getFocusProps('root')} className="min-h-screen w-screen bg-black text-white">
                <ReceiverPreviewPanel
                    workbenchState={workbenchState}
                    getFocusProps={getFocusProps}
                    onSelectBlock={(blockId) => {
                        sendEvent('select-block', { blockId });
                        flash();
                    }}
                    onDismiss={dismissToWaiting}
                />
            </div>
        );
    }

    if (workbenchState.mode === 'review' && workbenchState.reviewData) {
        return (
            <div data-nav-root="true" {...getFocusProps('root')} className="min-h-screen w-screen bg-black text-white">
                <ReceiverReviewPanel
                    workbenchState={workbenchState}
                    getFocusProps={getFocusProps}
                    onDismiss={dismissToWaiting}
                />
            </div>
        );
    }

    return (
        <ScriptRuntimeProvider key="active" runtime={proxyRuntime}>
            <PanelSizeProvider>
                <TrackViewShell
                    leftPanel={<ReceiverTimerPanel workbenchState={workbenchState} />}
                    rightPanel={<ReceiverStackPanel workbenchState={workbenchState} getFocusProps={getFocusProps} />}
                />
            </PanelSizeProvider>
        </ScriptRuntimeProvider>
    );
};

// =====================================================================
// LocalReceiverApp — boot path for the local-tab dual-pane mirror.
// =====================================================================

type LocalBootState =
    | { kind: 'handshaking' }
    | { kind: 'connected'; transport: IRpcTransport; dispose: () => void }
    | { kind: 'failed'; error: Error };

const LocalReceiverApp: React.FC = () => {
    const sessionId = readLocalSessionIdFromUrl();
    const [state, setState] = useState<LocalBootState>({ kind: 'handshaking' });

    useEffect(() => {
        if (!sessionId) {
            setState({
                kind: 'failed',
                error: new Error('Local receiver opened without a `?local=<id>` query param. Did the sender open this tab?'),
            });
            return;
        }

        let cancelled = false;
        let disposeSession: (() => void) | null = null;

        acquireLocalReceiverSession({ sessionId })
            .then((result) => {
                if (cancelled) {
                    result.dispose();
                    return;
                }
                disposeSession = result.dispose;
                dismissReceiverBootLoader('local-ready');
                setState({ kind: 'connected', transport: result.transport, dispose: result.dispose });
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const error = err instanceof Error ? err : new Error(String(err));
                console.error('[LocalReceiverApp] handshake failed', error);
                setState({ kind: 'failed', error });
            });

        return () => {
            cancelled = true;
            if (disposeSession) disposeSession();
        };
    }, [sessionId]);

    if (state.kind === 'failed') {
        return (
            <div
                data-nav-root="true"
                className="min-h-screen w-screen flex flex-col items-center justify-center bg-black text-white p-8"
            >
                <div className="max-w-2xl text-center space-y-4">
                    <div className="text-2xl font-bold text-red-400">Local cast failed</div>
                    <div className="text-sm text-zinc-300 break-words">{state.error.message}</div>
                    <div className="text-xs text-zinc-500 pt-4">
                        The sender did not transfer a connection. You can close this tab and try again.
                    </div>
                </div>
            </div>
        );
    }

    if (state.kind === 'handshaking') {
        return (
            <div
                data-nav-root="true"
                className="min-h-screen w-screen flex flex-col items-center justify-center bg-black text-white"
            >
                <div className="text-2xl font-bold opacity-80">Waiting for sender</div>
                <div className="text-sm opacity-60 mt-2">
                    The sender opened this tab. The connection will appear when the handshake completes.
                </div>
            </div>
        );
    }

    return <ReceiverApp transport={state.transport} />;
};

// =====================================================================
// Root — dispatches between the local boot path and the chromecast path.
// =====================================================================

const Root: React.FC = () => {
    const localSessionId = readLocalSessionIdFromUrl();
    if (localSessionId) {
        return <LocalReceiverApp />;
    }
    return <ReceiverApp />;
};

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(
        <ReceiverErrorBoundary>
            <Root />
        </ReceiverErrorBoundary>,
    );
}
