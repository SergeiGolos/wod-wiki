import React, { useMemo, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, StopCircle } from 'lucide-react';
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

    const progress = useMemo(() => {
        if (!effectiveTimerState) return 100;
        if (effectiveTimerState.format === 'down' && effectiveTimerState.duration) {
            const remaining = Math.max(0, effectiveTimerState.duration - effectiveTimerState.elapsed);
            return Math.min((remaining / effectiveTimerState.duration) * 100, 100);
        }
        return 100;
    }, [effectiveTimerState]);

    const strokeDasharray = 628;

    const strokeDashoffset = strokeDasharray - (progress / 100) * strokeDasharray;

    // Pulse animation for non-countdown timers (up or undefined/infinite)
    const isPulsing = isRunning && (
        !effectiveTimerState?.duration ||
        effectiveTimerState?.format === 'up'
    );

    const displayTimeMs = useMemo(() => {
        if (!effectiveTimerState) return 0;
        if (effectiveTimerState.format === 'down' && effectiveTimerState.duration) {
            return Math.max(0, effectiveTimerState.duration - effectiveTimerState.elapsed);
        }
        return effectiveTimerState.elapsed;
    }, [effectiveTimerState]);


    return (
        <div 
            className={`flex flex-col h-full w-full max-w-6xl mx-auto ${compact ? 'p-2' : 'p-4 gap-4'}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <style>{`
                @keyframes pulse-border {
                    0%, 100% { opacity: 1; stroke-width: 8px; }
                    50% { opacity: 0.6; stroke-width: 6px; }
                }
                .animate-pulse-border {
                    animation: pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
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
            <div className={`flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden`}>

                {/* Right Panel - Timer & Controls */}
                <div className="flex flex-col items-center justify-center h-full relative">
                    {/* Skip-attempt flash message — appears above the timer circle */}
                    {skipFlash && (
                        <div
                            key={skipFlashKey}
                            className="animate-skip-flash absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg pointer-events-none z-20"
                        >
                            Timer can&#39;t be skipped!
                        </div>
                    )}
                    <div className="relative flex items-center justify-center">
                        {/* Main Timer Circle — sizes driven by compact prop (container-aware) */}
                        <div className={`relative flex items-center justify-center z-10 transition-all ${compact ? 'w-[min(12rem,75vw)] h-[min(12rem,75vw)]' : 'w-48 h-48 lg:w-80 lg:h-80'}`}>
                            {/* SVG Background Ring */}
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 220 220">
                                <circle

                                    className="stroke-slate-100 dark:stroke-slate-800"
                                    cx="110" cy="110" fill="none" r="100" strokeWidth="8"
                                ></circle>
                                <circle
                                    className={`stroke-blue-500 transition-all duration-300 ease-in-out ${isPulsing ? 'animate-pulse-border' : ''}`}
                                    cx="110" cy="110" fill="none" r="100" strokeLinecap="round" strokeWidth="8"
                                    style={{
                                        strokeDasharray: strokeDasharray,
                                        strokeDashoffset: strokeDashoffset
                                    }}
                                ></circle>
                            </svg>

                            {/* Inner Circle / Content */}
                            <button
                                onClick={isRunning ? handlePause : handleStart}
                                {...(getFocusProps ? getFocusProps('timer-main') : {})}
                                className={`tv-focusable relative z-10 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all focus:outline-none group border border-slate-100 dark:border-slate-800 ${compact ? 'w-[min(10rem,65vw)] h-[min(10rem,65vw)]' : 'w-40 h-40 lg:w-[17rem] lg:h-[17rem]'}`}
                            >
                                <span className={`font-mono font-bold tracking-tighter text-slate-900 dark:text-white tabular-nums ${compact ? 'text-4xl' : 'text-5xl lg:text-6xl'}`}>
                                    {formatTime(displayTimeMs)}
                                </span>
                                <div className="mt-2 text-blue-500 group-hover:text-blue-600 transition-colors">
                                    {isRunning ? <Pause className={`title-pause ${compact ? 'w-10 h-10' : 'w-10 h-10 lg:w-12 lg:h-12'}`} /> : <Play className={`ml-2 title-play ${compact ? 'w-10 h-10' : 'w-10 h-10 lg:w-12 lg:h-12'}`} />}
                                </div>
                            </button>
                        </div>

                    </div>

                    {/* Controls Row (Below Timer) */}
                    <div className={`flex items-center ${compact ? 'gap-3 mt-4' : 'gap-3 sm:gap-6 mt-4 sm:mt-8'} flex-wrap justify-center px-2`}>
                        <button
                            onClick={handleStop}
                            {...(getFocusProps ? getFocusProps('btn-stop') : {})}
                            className="tv-focusable group flex flex-col items-center gap-1 sm:gap-2 text-slate-400 hover:text-red-500 transition-colors p-2"
                            title="Stop Session"
                        >
                            <div className={`flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors ${compact ? 'w-12 h-12' : 'w-12 h-12 sm:w-14 sm:h-14'}`}>
                                <StopCircle className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-medium uppercase tracking-wider">Stop</span>
                        </button>

                        <button
                            onClick={handleNext}
                            {...(getFocusProps ? getFocusProps('btn-next') : {})}
                            className={`tv-focusable flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transition-all ${compact ? 'w-16 h-16' : 'w-16 h-16 sm:w-20 sm:h-20'}`}
                            title="Next Block"
                        >
                            <SkipForward className={compact ? 'w-6 h-6' : 'w-6 h-6 sm:w-8 sm:h-8'} />
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};
