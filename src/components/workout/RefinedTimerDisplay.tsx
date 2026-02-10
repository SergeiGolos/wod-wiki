import React, { useMemo } from 'react';
import { Play, Pause, SkipForward, StopCircle } from 'lucide-react';
import { ITimerDisplayEntry, IDisplayCardEntry } from '../../clock/types/DisplayTypes';
import { RuntimeControls } from '../../runtime/models/MemoryModels';
import { VisualizerFilter } from '../../core/models/DisplayItem';
import { formatTimeMMSS } from '../../lib/formatTime';
import { FragmentSourceRow } from '../unified/FragmentSourceRow';
import { ActionDescriptor } from '../../runtime/models/ActionDescriptor';
import { StackFragmentEntry } from '../../runtime/hooks/useStackDisplay';

export interface RefinedTimerDisplayProps {
    elapsedMs: number;
    hasActiveBlock: boolean;
    onStart: () => void;
    onPause: () => void;
    onStop: () => void;
    onNext: () => void;
    onAction?: (eventName: string, payload?: Record<string, unknown>) => void;
    isRunning: boolean;
    primaryTimer?: ITimerDisplayEntry;
    secondaryTimers?: ITimerDisplayEntry[];
    currentCard?: IDisplayCardEntry;
    compact?: boolean;

    controls?: RuntimeControls;
    stackItems?: StackFragmentEntry[];
    actions?: ActionDescriptor[];

    /** ID of the block that should be focused/displayed on the main timer */
    focusedBlockId?: string;

    /** Map of all active timer states by block ID (ownerId) */
    timerStates?: Map<string, {
        elapsed: number;
        duration?: number;
        format: 'down' | 'up';
    }>;
}

const formatTime = formatTimeMMSS;

/**
 * Timer Pill for card display
 */
const CardTimerPill: React.FC<{
    elapsed: number;
    duration?: number;
    format: 'down' | 'up';
}> = ({ elapsed, duration, format }) => {
    const displayTime = Math.max(0, format === 'down' && duration ? duration - elapsed : elapsed);

    return (
        <div className={`
            font-mono text-sm font-bold px-3 py-1 rounded-md min-w-[70px] text-center
            ${format === 'down'
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'text-slate-500 dark:text-slate-400'}
        `}>
            {formatTime(displayTime)}
        </div>
    );
};

export const RefinedTimerDisplay: React.FC<RefinedTimerDisplayProps> = ({
    elapsedMs,
    onStart,
    onPause,
    onStop,
    onNext,
    onAction,
    isRunning,
    primaryTimer,
    secondaryTimers = [],
    compact = false,

    stackItems,
    focusedBlockId,
    timerStates,
    actions
}) => {

    // Determine which timer is "Focused" for the big ring
    // Default to the primaryTimer (usually the leaf) if no focus override
    // If focusedBlockId is present, try to find that timer.
    const effectivePrimaryTimer = useMemo(() => {
        if (!focusedBlockId) return primaryTimer;

        // Search in secondary timers (or primary)
        if (primaryTimer?.ownerId === focusedBlockId) return primaryTimer;
        return secondaryTimers.find(t => t.ownerId === focusedBlockId) || primaryTimer;
    }, [focusedBlockId, primaryTimer, secondaryTimers]);

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
        const isActuallyActive = effectivePrimaryTimer === primaryTimer;
        return {
            elapsed: isActuallyActive ? elapsedMs : (effectivePrimaryTimer.accumulatedMs || 0),
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
    // Filter configuration for Stack View
    const stackFilter: VisualizerFilter = {
        allowedOrigins: [
            'parser',
            'collected',
        ],
        nameOverrides: {
            'ellapsed-time': false,
            'elapsed': false
        }
    };


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
            <div className={`flex-1 min-h-0 grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-[minmax(280px,35%)_1fr] lg:gap-8 lg:items-start'} gap-4 items-center overflow-hidden`}>

                {/* Left Panel - Stack View - CENTERED content */}
                <div className={`
                    flex flex-col gap-3 justify-center
                    ${compact ? 'order-1 w-full flex-1 overflow-y-auto min-h-0' : 'order-1 lg:h-full lg:overflow-y-auto lg:pr-2'}
                `}>
                    {stackItems && stackItems.map((entry) => {
                        // Get state for this entry's block
                        const blockKey = entry.block.key.toString();
                        const state = timerStates?.get(blockKey);

                        const isFocused = blockKey === (focusedBlockId || primaryTimer?.ownerId);

                        return (
                            <div key={String(entry.source.id)} className="transition-all duration-300">
                                <FragmentSourceRow
                                    source={entry.source}
                                    status={entry.isLeaf ? 'active' : 'pending'}
                                    depth={entry.depth}
                                    size="focused"
                                    filter={stackFilter}
                                    label={entry.label}
                                    fragmentGroups={entry.fragmentGroups}
                                    className={`
                                        shadow-md border rounded-lg pr-3
                                        ${isFocused
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 ring-1 ring-blue-400/30'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}
                                    `}
                                    actions={state ? (
                                        <CardTimerPill
                                            elapsed={state.elapsed}
                                            duration={state.duration}
                                            format={state.format}
                                        />
                                    ) : undefined}
                                />
                            </div>
                        );
                    })}
                    {(!stackItems || stackItems.length === 0) && (
                        <div className="p-8 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-sm">
                            <p>Ready to start...</p>
                        </div>
                    )}
                </div>

                {/* Right Panel - Timer & Controls */}
                <div className={`
                    flex flex-col items-center justify-center h-full relative
                    ${compact ? 'order-2 shrink-0 py-2' : 'order-1 lg:order-2'}
                `}>
                    {/* Header Label - Shows what the BIG timer is focused on */}
                    <div className={`text-center ${compact ? 'mb-4' : 'mb-4 sm:mb-8'} shrink-0`}>
                        <h2 className={`${compact ? 'text-lg' : 'text-lg sm:text-xl'} font-bold text-slate-700 dark:text-slate-200`}>
                            {effectivePrimaryTimer?.label || "Timer"}
                        </h2>
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
                            title="Stop Workout"
                        >
                            <div className={`flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors ${compact ? 'w-12 h-12' : 'w-12 h-12 sm:w-14 sm:h-14'}`}>
                                <StopCircle className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-medium uppercase tracking-wider">Stop</span>
                        </button>

                        {actions && actions.length > 0 ? (
                            <div className={`flex items-center ${compact ? 'gap-2' : 'gap-2 sm:gap-3'} flex-wrap justify-center`}>
                                {actions.map(action => (
                                    <button
                                        key={action.id}
                                        onClick={() => onAction?.(action.eventName, action.payload)}
                                        className={`${compact ? 'px-3 py-2 min-h-[44px] text-xs' : 'px-3 sm:px-4 py-2 min-h-[44px] sm:min-h-[48px] text-xs sm:text-sm'} rounded-full font-semibold shadow-sm transition-all border ${action.isPinned ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-500' : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400'} hover:-translate-y-0.5`}
                                        title={action.displayLabel || action.name}
                                    >
                                        {action.displayLabel || action.name}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <button
                                onClick={onNext}
                                className={`flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transition-all ${compact ? 'w-16 h-16' : 'w-16 h-16 sm:w-20 sm:h-20'}`}
                                title="Next Block"
                            >
                                <SkipForward className={compact ? 'w-6 h-6' : 'w-6 h-6 sm:w-8 sm:h-8'} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};
