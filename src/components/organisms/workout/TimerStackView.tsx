import React, { useMemo, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, Square, Timer } from 'lucide-react';
import { ITimerDisplayEntry, IDisplayCardEntry } from '@/clock/types/DisplayTypes';
import { formatTimeMMSS } from '@/lib/formatTime';
import type { FocusProps } from '@/hooks/useSpatialNavigation';
import { useAudio } from '@/contexts/AudioContext';
import { usePanelSize } from '@/panels/panel-system/PanelSizeContext';

export interface TimerStackViewProps {
    elapsedMs: number;
    hasActiveBlock: boolean;
    onStart: () => void;
    onPause: () => void;
    onStop: () => void;
    onNext: () => void;
    isRunning: boolean;
    isPaused?: boolean;
    disableNext?: boolean;
    primaryTimer?: ITimerDisplayEntry;
    currentCard?: IDisplayCardEntry;
    compact?: boolean;
    subLabel?: string;
    subLabels?: string[];

    /** Map of all active timer states by block ID (ownerId) */
    timerStates?: Map<string, {
        elapsed: number;
        duration?: number;
        format: 'down' | 'up';
    }>;
    actions?: any[];
    onAction?: (eventName: string, payload?: any) => void;
    secondaryTimers?: ITimerDisplayEntry[];
    focusedBlockId?: string;
    stackItems?: any[];
    /** Spatial navigation focus props for TV remote support */
    getFocusProps?: (id: string) => FocusProps;
    /** Whether swipe gestures are enabled (e.g. only in 'track' view) */
    enableGestures?: boolean;
    /** When true, flash "Timer can't be skipped!" above the timer circle for 3 seconds */
    skipFlash?: boolean;
    /** Unique key incremented on each skip attempt to restart the animation */
    skipFlashKey?: number;
}

const formatTime = formatTimeMMSS;

export function getPrimaryTimerFontSizePx(panelWidth: number, compact: boolean): number {
    const width = panelWidth > 0 ? panelWidth : 800;

    if (compact) {
        return Math.round(Math.min(Math.max(width * 0.14, 56), 72));
    }

    return Math.round(Math.min(Math.max(width * 0.18, 128), 320));
}

export const TimerStackView: React.FC<TimerStackViewProps> = ({
    elapsedMs,
    onStart,
    onPause,
    onStop,
    onNext,
    isRunning,
    isPaused = false,
    disableNext,
    primaryTimer,
    compact = false,
    subLabel,
    subLabels,
    secondaryTimers,

    timerStates,
    getFocusProps,
    enableGestures = true,
    skipFlash = false,
    skipFlashKey = 0,
}) => {
    const { width: panelWidth } = usePanelSize();

    let audio: any = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        audio = useAudio();
    } catch { /* ignore if provider missing */ }

    const primaryTimerFontSizePx = useMemo(
        () => getPrimaryTimerFontSizePx(panelWidth, compact),
        [panelWidth, compact],
    );

    const handleStart = useCallback(() => {
        audio?.playClick();
        onStart();
    }, [audio, onStart]);

    const handlePause = useCallback(() => {
        audio?.playClick();
        onPause();
    }, [audio, onPause]);

    const handleStop = useCallback(() => {
        audio?.playClick();
        onStop();
    }, [audio, onStop]);

    const isNextDisabled = disableNext ?? isPaused;
    const primaryControlLabel = isPaused ? 'Continue' : isRunning ? 'Pause' : 'Start';

    const handleNext = useCallback(() => {
        if (isNextDisabled) return;
        audio?.playClick();
        onNext();
    }, [audio, isNextDisabled, onNext]);

    // --- Swipe Gesture Logic ---
    const touchStart = useRef<number | null>(null);
    const touchEnd = useRef<number | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        touchEnd.current = null;
        touchStart.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = useCallback(() => {
        if (!enableGestures || !touchStart.current || !touchEnd.current) return;
        
        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        // Don't trigger if user is typing
        const activeEl = document.activeElement;
        const isTyping = activeEl && (
            activeEl.tagName === 'INPUT' || 
            activeEl.tagName === 'TEXTAREA' || 
            (activeEl as HTMLElement).isContentEditable
        );

        if (!isTyping) {
            if (isLeftSwipe) {
                if (isNextDisabled) return;
                console.log('Swipe Left -> Next');
                handleNext();
            } else if (isRightSwipe) {
                console.log('Swipe Right -> Stop');
                handleStop();
            }
        }
        
        touchStart.current = null;
        touchEnd.current = null;
    }, [enableGestures, handleNext, handleStop, isNextDisabled]);

    // Determine which timer is "Focused" for the big ring
    // Default to the primaryTimer (usually the leaf) if no focus override
    // If focusedBlockId is present, try to find that timer.
    const effectivePrimaryTimer = primaryTimer;

    // Calculate progress for the ring based on EFFECTIVE primary timer
    // We need the state for this timer.
    const effectiveTimerState = useMemo(() => {
        if (!effectivePrimaryTimer) return undefined;
        // Try to get from the passed `timerStates` map first for accuracy
        if (timerStates && timerStates.has(effectivePrimaryTimer.ownerId)) {
            return timerStates.get(effectivePrimaryTimer.ownerId);
        }
        // Fallback to timer entry data + global elapsed if it matches the 'active' one?
        // Logic: if effective is THE primary, use elapsedMs.
        return {
            elapsed: effectivePrimaryTimer.accumulatedMs || 0,
            duration: effectivePrimaryTimer.durationMs,
            format: effectivePrimaryTimer.format
        };
    }, [effectivePrimaryTimer, timerStates, primaryTimer, elapsedMs]);

    const displayTimeMs = useMemo(() => {
        if (!effectiveTimerState) return 0;
        if (effectiveTimerState.format === 'down' && effectiveTimerState.duration) {
            return Math.max(0, effectiveTimerState.duration - effectiveTimerState.elapsed);
        }
        return effectiveTimerState.elapsed;
    }, [effectiveTimerState]);

    // --- Secondary Timers ---
    // Compute live display values for each secondary timer, handling edge cases:
    // - missing timerStates entry → fallback to accumulatedMs
    // - countdown format → show remaining time (clamped to 0)
    // - null/undefined/empty secondaryTimers → hide section entirely
    const secondaryTimerData = useMemo(() => {
        if (!secondaryTimers || secondaryTimers.length === 0) return [];
        return secondaryTimers.map(st => {
            const state = timerStates?.get(st.ownerId);
            const elapsed = state?.elapsed ?? st.accumulatedMs ?? 0;
            const duration = state?.duration ?? st.durationMs;
            const format = state?.format ?? st.format ?? 'up';
            const displayMs = format === 'down' && duration
                ? Math.max(0, duration - elapsed)
                : elapsed;
            return {
                id: st.id,
                ownerId: st.ownerId,
                label: st.label || 'Timer',
                displayMs,
                format,
            };
        });
    }, [secondaryTimers, timerStates]);

    // --- Responsive layout classes ---
    // compact = mobile/narrow container (from PanelSizeContext)
    // We use different layouts for compact vs wide

    return (
        <div 
            className={`flex flex-col h-full w-full ${compact ? '' : 'gap-4'}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <style>{`
                @keyframes skip-flash-fade {
                    0%   { opacity: 1; transform: translateY(0); }
                    70%  { opacity: 1; transform: translateY(-4px); }
                    100% { opacity: 0; transform: translateY(-8px); }
                }
                .animate-skip-flash {
                    animation: skip-flash-fade 3s ease-out forwards;
                }
            `}</style>

            {/* Main Content Area */}
            <div className={`flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden ${compact ? 'px-4 py-2' : 'p-4'}`}>

                {/* Timer & Controls Container */}
                <div className="flex flex-col items-center justify-center h-full relative w-full">
                    {/* Skip-attempt flash message — appears above the timer */}
                    {skipFlash && (
                        <div
                            key={skipFlashKey}
                            className="animate-skip-flash absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg pointer-events-none z-20"
                            role="status"
                            aria-live="polite"
                        >
                            Timer can&#39;t be skipped!
                        </div>
                    )}

                    {/* Labels above timer */}
                    <div className={`text-center ${compact ? 'mb-2' : 'mb-6'}`}>
                        {primaryTimer?.label && (
                            <h2 className={`font-semibold text-foreground tracking-tight ${compact ? 'text-lg' : 'text-3xl lg:text-4xl'}`}>
                                {primaryTimer.label}
                            </h2>
                        )}
                        {subLabels && subLabels.length > 0 && (
                            <div className={`${compact ? 'mt-1 space-y-0.5' : 'mt-2 space-y-1'}`}>
                                {subLabels.map((line, i) => (
                                    <p key={i} className={`text-muted-foreground ${compact ? 'text-xs' : 'text-lg lg:text-xl'}`}>
                                        {line}
                                    </p>
                                ))}
                            </div>
                        )}
                        {subLabels === undefined && subLabel && (
                            <p className={`text-muted-foreground ${compact ? 'mt-1 text-xs' : 'mt-2 text-lg lg:text-xl'}`}>
                                {subLabel}
                            </p>
                        )}
                    </div>

                    {/* Very Large Timer Number (no circle) */}
                    <div className="relative flex items-center justify-center w-full">
                        <button
                            onClick={isPaused ? handleStart : isRunning ? handlePause : handleStart}
                            {...(getFocusProps ? getFocusProps('timer-main') : {})}
                            className={`tv-focusable relative z-10 flex flex-col items-center justify-center focus:outline-none focus-visible:outline-2 focus-visible:outline-ring group min-h-[48px] min-w-[48px] ${compact ? 'py-2' : 'py-8'}`}
                            title={primaryControlLabel}
                        >
                            <span
                                className="font-mono font-bold tracking-tighter text-foreground tabular-nums leading-none"
                                style={{ fontSize: `${primaryTimerFontSizePx}px` }}
                                role="timer"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                {formatTime(displayTimeMs)}
                            </span>
                        </button>
                    </div>

                    {/* Secondary Timers — smaller context clocks for parent intervals */}
                    {secondaryTimerData.length > 0 && (
                        <div className={`w-full ${compact ? 'mt-3' : 'mt-6'}`}>
                            <div className={`flex items-center justify-center gap-2 ${compact ? 'flex-wrap' : 'gap-4'}`}>
                                {secondaryTimerData.map((st, index) => (
                                    <div
                                        key={st.id}
                                        {...(getFocusProps ? getFocusProps(`secondary-timer-${index}`) : {})}
                                        className={`tv-focusable flex items-center gap-2 rounded-lg border bg-muted/40 text-muted-foreground ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
                                        title={st.label}
                                        role="timer"
                                        aria-label={`${st.label} ${formatTime(st.displayMs)}`}
                                        aria-atomic="true"
                                    >
                                        <Timer className={`shrink-0 ${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                                        <span className="font-medium truncate max-w-[120px]">{st.label}</span>
                                        <span className="font-mono font-semibold tabular-nums">
                                            {formatTime(st.displayMs)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Row — adapts between mobile (bottom bar) and desktop (centered buttons) */}
            <div className={`flex items-center justify-center ${compact ? 'px-4 py-3 bg-background border-t border-border gap-3' : 'gap-8 px-2 pb-8'} flex-wrap`}>
                {/* Stop Button */}
                <div className={`flex flex-col items-center ${compact ? 'gap-1' : 'gap-2'}`}>
                    <button
                        onClick={handleStop}
                        {...(getFocusProps ? getFocusProps('btn-stop') : {})}
                        className={`tv-focusable group flex items-center justify-center rounded-full border transition-all active:scale-95 ${compact ? 'w-12 h-12 bg-muted border-border' : 'w-16 h-16 bg-surface-container-low border-outline-variant hover:bg-surface-variant shadow-sm'}`}
                        title="Stop Session"
                    >
                        <Square className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-muted-foreground group-hover:text-destructive transition-colors`} />
                    </button>
                    {!compact && <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-secondary">Stop</span>}
                </div>

                {/* Pause/Resume Button */}
                <div className={`flex flex-col items-center ${compact ? 'gap-1' : 'gap-2'}`}>
                    <button
                        onClick={isPaused ? handleStart : isRunning ? handlePause : handleStart}
                        {...(getFocusProps ? getFocusProps('btn-pause') : {})}
                        className={`tv-focusable group flex items-center justify-center rounded-full transition-all active:scale-95 ${compact ? 'w-14 h-14 bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'w-20 h-20 bg-surface-container-low border border-outline-variant hover:bg-surface-variant shadow-sm'}`}
                        title={primaryControlLabel}
                    >
                        {isPaused
                            ? <Play className={`${compact ? 'w-6 h-6 text-white ml-0.5' : 'w-8 h-8 text-on-surface-variant ml-1'}`} />
                            : isRunning
                            ? <Pause className={`${compact ? 'w-6 h-6 text-white' : 'w-8 h-8 text-on-surface-variant'}`} />
                            : <Play className={`${compact ? 'w-6 h-6 text-white ml-0.5' : 'w-8 h-8 text-on-surface-variant ml-1'}`} />
                        }
                    </button>
                    {!compact && <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-secondary">{primaryControlLabel}</span>}
                </div>

                {/* Next Button */}
                {compact ? (
                    /* Mobile: wide pill button */
                    <button
                        onClick={handleNext}
                        disabled={isNextDisabled}
                        aria-disabled={isNextDisabled ? 'true' : undefined}
                        {...(getFocusProps ? getFocusProps('btn-next') : {})}
                        className={`tv-focusable flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 transition-transform shadow-lg ${isNextDisabled ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60' : 'bg-primary text-primary-foreground shadow-primary/20 active:scale-[0.98]'}`}
                        title="Next Block"
                    >
                        <span className="text-base font-bold tracking-widest uppercase">Next</span>
                        <SkipForward className="w-5 h-5" />
                    </button>
                ) : (
                    /* Desktop: large circular button */
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={handleNext}
                            disabled={isNextDisabled}
                            aria-disabled={isNextDisabled ? 'true' : undefined}
                            {...(getFocusProps ? getFocusProps('btn-next') : {})}
                            className={`tv-focusable flex items-center justify-center rounded-full transition-all shadow-xl w-24 h-24 ${isNextDisabled ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60' : 'bg-primary-container text-on-primary-container hover:bg-primary hover:text-white active:scale-90'}`}
                            title="Next Block"
                        >
                            <SkipForward className="font-bold w-10 h-10" />
                        </button>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-primary-container">Next</span>
                    </div>
                )}
            </div>
        </div >
    );
};
