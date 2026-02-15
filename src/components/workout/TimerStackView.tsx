import React, { useMemo } from 'react';
import { Play, Pause, SkipForward, StopCircle } from 'lucide-react';
import { ITimerDisplayEntry, IDisplayCardEntry } from '../../clock/types/DisplayTypes';
import { formatTimeMMSS } from '../../lib/formatTime';

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
    currentCard,
    compact = false,
    subLabel,

    timerStates,
}) => {

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
        <div className={`flex flex-col h-full w-full max-w-6xl mx-auto ${compact ? 'p-2' : 'p-4 gap-4'}`}>
            <style>{`
                @keyframes pulse-border {
                    0%, 100% { opacity: 1; stroke-width: 8px; }
                    50% { opacity: 0.6; stroke-width: 6px; }
                }
                .animate-pulse-border {
                    animation: pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>

            {/* Main Content Area */}
            <div className={`flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden`}>

                {/* Right Panel - Timer & Controls */}
                <div className="flex flex-col items-center justify-center h-full relative">
                    {/* Header Label - Shows what the BIG timer is focused on */}
                    <div className={`text-center ${compact ? 'mb-4' : 'mb-4 sm:mb-8'} shrink-0 z-20`}>
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-3 shadow-lg">
                            <h2 className={`${compact ? 'text-lg' : 'text-lg sm:text-xl'} font-bold text-slate-700 dark:text-slate-200`}>
                                {effectivePrimaryTimer?.label || "Timer"}
                            </h2>
                            {subLabel && (
                                <>
                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-2 w-full" />
                                    <div className={`${compact ? 'text-sm' : 'text-base'} font-medium text-slate-500 dark:text-slate-400`}>
                                        {subLabel}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="relative flex items-center justify-center">
                        {/* Main Timer Circle — sizes driven by compact prop (container-aware) */}
                        <div className={`relative flex items-center justify-center z-10 transition-all ${compact ? 'w-[min(12rem,75vw)] h-[min(12rem,75vw)]' : 'w-48 h-48 lg:w-96 lg:h-96'}`}>
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
                                onClick={isRunning ? onPause : onStart}
                                className={`relative z-10 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all focus:outline-none group border border-slate-100 dark:border-slate-800 ${compact ? 'w-[min(10rem,65vw)] h-[min(10rem,65vw)]' : 'w-40 h-40 lg:w-80 lg:h-80'}`}
                            >
                                <span className={`font-mono font-bold tracking-tighter text-slate-900 dark:text-white tabular-nums ${compact ? 'text-4xl' : 'text-5xl lg:text-8xl'}`}>
                                    {formatTime(displayTimeMs)}
                                </span>
                                <div className="mt-2 text-blue-500 group-hover:text-blue-600 transition-colors">
                                    {isRunning ? <Pause className={`title-pause ${compact ? 'w-10 h-10' : 'w-10 h-10 lg:w-16 lg:h-16'}`} /> : <Play className={`ml-2 title-play ${compact ? 'w-10 h-10' : 'w-10 h-10 lg:w-16 lg:h-16'}`} />}
                                </div>
                            </button>
                        </div>

                    </div>

                    {/* Controls Row (Below Timer) */}
                    <div className={`flex items-center ${compact ? 'gap-3 mt-4' : 'gap-3 sm:gap-6 mt-4 sm:mt-8'} flex-wrap justify-center px-2`}>
                        <button
                            onClick={onStop}
                            className="group flex flex-col items-center gap-1 sm:gap-2 text-slate-400 hover:text-red-500 transition-colors p-2"
                            title="Stop Session"
                        >
                            <div className={`flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors ${compact ? 'w-12 h-12' : 'w-12 h-12 sm:w-14 sm:h-14'}`}>
                                <StopCircle className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-medium uppercase tracking-wider">Stop</span>
                        </button>

                        <button
                            onClick={onNext}
                            className={`flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transition-all ${compact ? 'w-16 h-16' : 'w-16 h-16 sm:w-20 sm:h-20'}`}
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
