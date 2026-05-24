import React, { useMemo, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, Square } from 'lucide-react';
import { ITimerDisplayEntry, IDisplayCardEntry } from '../../clock/types/DisplayTypes';
import { formatTimeMMSS } from '../../lib/formatTime';
import type { FocusProps } from '@/hooks/useSpatialNavigation';
import { useAudio } from '@/components/audio/AudioContext';

export interface TimerStackViewProps {
    elapsedMs: number;
    hasActiveBlock: boolean;
    onStart: () => void;
    onPause: () => void;
    onStop: () => void;
    onNext: () => void;
    isRunning: boolean;
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


export const TimerStackView: React.FC<TimerStackViewProps> = ({
    elapsedMs,
    onStart,
    onPause,
    onStop,
    onNext,
    isRunning,
    primaryTimer,
    compact = false,
    subLabel,
    subLabels,

    timerStates,
    getFocusProps,
    enableGestures = true,
    skipFlash = false,
    skipFlashKey = 0,
}) => {
    let audio: any = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        audio = useAudio();
    } catch { /* ignore if provider missing */ }

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

    const handleNext = useCallback(() => {
        audio?.playClick();
        onNext();
    }, [audio, onNext]);

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
                console.log('Swipe Left -> Next');
                handleNext();
            } else if (isRightSwipe) {
                console.log('Swipe Right -> Stop');
                handleStop();
            }
        }
        
        touchStart.current = null;
        touchEnd.current = null;
    }, [enableGestures, handleNext, handleStop]);

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
                            onClick={isRunning ? handlePause : handleStart}
                            {...(getFocusProps ? getFocusProps('timer-main') : {})}
                            className={`tv-focusable relative z-10 flex flex-col items-center justify-center focus:outline-none focus-visible:outline-2 focus-visible:outline-ring group ${compact ? 'py-2' : 'py-8'}`}
                        >
                            <span className={`font-mono font-bold tracking-tighter text-foreground tabular-nums leading-none ${compact ? 'text-[5rem] sm:text-[6rem]' : 'text-[8rem] lg:text-[12rem]'}`}>
                                {formatTime(displayTimeMs)}
                            </span>
                            <div className={`text-primary group-hover:opacity-80 transition-opacity ${compact ? 'mt-2' : 'mt-4'}`}>
                                {isRunning 
                                    ? <Pause className={`title-pause ${compact ? 'w-8 h-8' : 'w-14 h-14 lg:w-16 lg:h-16'}`} /> 
                                    : <Play className={`ml-1 title-play ${compact ? 'w-8 h-8' : 'w-14 h-14 lg:w-16 lg:h-16'}`} />
                                }
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Controls Row — adapts between mobile (bottom bar) and desktop (centered buttons) */}
            <div className={`flex items-center justify-center ${compact ? 'px-4 py-3 bg-background border-t border-border gap-3' : 'gap-8 sm:gap-12 px-2 pb-8'} flex-wrap`}>
                {/* Stop Button */}
                <div className={`flex flex-col items-center ${compact ? 'gap-1' : 'gap-2'}`}>
                    <button
                        onClick={handleStop}
                        {...(getFocusProps ? getFocusProps('btn-stop') : {})}
                        className={`tv-focusable group flex items-center justify-center rounded-full border transition-all active:scale-95 ${compact ? 'w-12 h-12 bg-muted border-border' : 'w-16 h-16 sm:w-20 sm:h-20 bg-surface-container-low border-outline-variant hover:bg-surface-variant shadow-sm'}`}
                        title="Stop Session"
                    >
                        <Square className={`${compact ? 'w-5 h-5' : 'w-7 h-7 sm:w-8 sm:h-8'} text-muted-foreground group-hover:text-destructive transition-colors`} />
                    </button>
                    {!compact && <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-secondary">Stop</span>}
                </div>

                {/* Pause/Resume Button */}
                <div className={`flex flex-col items-center ${compact ? 'gap-1' : 'gap-2'}`}>
                    <button
                        onClick={isRunning ? handlePause : handleStart}
                        {...(getFocusProps ? getFocusProps('btn-pause') : {})}
                        className={`tv-focusable group flex items-center justify-center rounded-full transition-all active:scale-95 ${compact ? 'w-14 h-14 bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'w-20 h-20 sm:w-24 sm:h-24 bg-surface-container-low border border-outline-variant hover:bg-surface-variant shadow-sm'}`}
                        title={isRunning ? 'Pause' : 'Resume'}
                    >
                        {isRunning 
                            ? <Pause className={`${compact ? 'w-6 h-6 text-white' : 'w-8 h-8 sm:w-10 sm:h-10 text-on-surface-variant'}`} />
                            : <Play className={`${compact ? 'w-6 h-6 text-white ml-0.5' : 'w-8 h-8 sm:w-10 sm:h-10 text-on-surface-variant ml-1'}`} />
                        }
                    </button>
                    {!compact && <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-secondary">{isRunning ? 'Pause' : 'Resume'}</span>}
                </div>

                {/* Next Button */}
                {compact ? (
                    /* Mobile: wide pill button */
                    <button
                        onClick={handleNext}
                        {...(getFocusProps ? getFocusProps('btn-next') : {})}
                        className="tv-focusable flex-1 h-14 bg-foreground text-background rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
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
                            {...(getFocusProps ? getFocusProps('btn-next') : {})}
                            className="tv-focusable flex items-center justify-center rounded-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-white transition-all active:scale-90 shadow-xl w-24 h-24 sm:w-28 sm:h-28"
                            title="Next Block"
                        >
                            <SkipForward className="font-bold w-10 h-10 sm:w-12 sm:h-12" />
                        </button>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-primary-container">Next</span>
                    </div>
                )}
            </div>
        </div >
    );
};
