import React, { useMemo } from 'react';
import { Play, Pause, SkipForward, StopCircle } from 'lucide-react';
import { ITimerDisplayEntry, IDisplayCardEntry } from '../../clock/types/DisplayTypes';
import { RuntimeControls } from '../../runtime/models/MemoryModels';
import { IDisplayItem } from '../../core/models/DisplayItem';
import { UnifiedItemRow } from '../unified/UnifiedItemRow';

export interface RefinedTimerDisplayProps {
    elapsedMs: number;
    hasActiveBlock: boolean;
    onStart: () => void;
    onPause: () => void;
    onStop: () => void;
    onNext: () => void;
    isRunning: boolean;
    primaryTimer?: ITimerDisplayEntry;
    secondaryTimers?: ITimerDisplayEntry[];
    currentCard?: IDisplayCardEntry;
    compact?: boolean;

    controls?: RuntimeControls;
    stackItems?: IDisplayItem[];
}

const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const RefinedTimerDisplay: React.FC<RefinedTimerDisplayProps> = ({
    elapsedMs,
    onStart,
    onPause,
    onStop,
    onNext,
    isRunning,
    primaryTimer,
    secondaryTimers = [],
    compact = false,

    stackItems
}) => {
    // Calculate progress for the ring
    const progress = useMemo(() => {
        if (primaryTimer?.format === 'countdown' && primaryTimer.durationMs) {
            const remaining = Math.max(0, primaryTimer.durationMs - elapsedMs);
            return Math.min((remaining / primaryTimer.durationMs) * 100, 100);
        }
        return 100; // Full circle if countup or no duration
    }, [primaryTimer, elapsedMs]);

    const strokeDasharray = 628; // 2 * pi * 100
    const strokeDashoffset = strokeDasharray - (progress / 100) * strokeDasharray;

    // Determine display time
    const displayTime = useMemo(() => {
        if (primaryTimer?.format === 'countdown' && primaryTimer.durationMs) {
            return Math.max(0, primaryTimer.durationMs - elapsedMs);
        }
        return elapsedMs;
    }, [primaryTimer, elapsedMs]);

    // Helper to find specific timer types in secondary timers
    const findTimerByLabel = (labelFragment: string) =>
        secondaryTimers.find(t => t.label?.toLowerCase().includes(labelFragment.toLowerCase()));

    const intervalTimer = findTimerByLabel('Interval');
    const emomTimer = findTimerByLabel('EMOM');
    const amrapTimer = findTimerByLabel('AMRAP');
    const timeCapTimer = findTimerByLabel('Cap') || (primaryTimer?.format === 'countdown' ? primaryTimer : undefined);

    return (
        <div className={`flex flex-col h-full w-full max-w-6xl mx-auto ${compact ? 'p-2' : 'p-4 gap-4'}`}>
            
            {/* Top Bar - Secondary Timers */}
            <div className="w-full flex flex-wrap items-center justify-center gap-4 min-h-[40px] shrink-0">
                 <div className={`${compact ? 'p-2 py-1' : 'p-4 py-2'} rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm text-center min-w-[100px]`}>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</p>
                    <p className={`font-mono font-bold ${compact ? 'text-sm' : 'text-xl'} text-slate-800 dark:text-slate-200`}>{formatTime(elapsedMs)}</p>
                </div>

                {timeCapTimer && timeCapTimer.durationMs && (
                    <div className={`${compact ? 'p-2 py-1' : 'p-4 py-2'} rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm text-center min-w-[100px]`}>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cap</p>
                        <p className={`font-mono font-bold ${compact ? 'text-sm' : 'text-xl'} text-slate-800 dark:text-slate-200`}>{formatTime(timeCapTimer.durationMs)}</p>
                    </div>
                )}

                {amrapTimer && (
                    <div className={`${compact ? 'p-2 py-1' : 'p-4 py-2'} rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm text-center min-w-[100px]`}>
                         <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">AMRAP</p>
                         <p className={`font-mono font-bold ${compact ? 'text-sm' : 'text-xl'} text-slate-800 dark:text-slate-200`}>--:--</p>
                    </div>
                )}

                {secondaryTimers.map(t => {
                    if (t === intervalTimer || t === emomTimer || t === amrapTimer || t === timeCapTimer) return null;
                    return (
                        <div key={t.id} className={`${compact ? 'p-2 py-1' : 'p-4 py-2'} rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm text-center min-w-[100px]`}>
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.label || 'Timer'}</p>
                             <p className={`font-mono font-bold ${compact ? 'text-sm' : 'text-xl'} text-slate-800 dark:text-slate-200`}>--:--</p>
                        </div>
                    )
                })}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-8 items-center lg:items-start overflow-hidden lg:overflow-visible">
                
                {/* Left Panel - Stack View */}
                {/* Desktop: Order 1 (Left). Mobile: Order 1 (Top, above timer) */}
                <div className={`
                    flex flex-col gap-2 
                    lg:h-full lg:overflow-y-auto lg:pr-2
                    ${compact ? 'order-1 w-full flex-1 overflow-y-auto min-h-0' : 'order-1'}
                `}>
                     {stackItems && stackItems.map((item) => (
                        <UnifiedItemRow 
                            key={item.id} 
                            item={item} 
                            compact={compact}
                            className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-md"
                        />
                    ))}
                    {(!stackItems || stackItems.length === 0) && (
                         <div className="p-4 rounded-md border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-sm">
                            <p>Ready to start...</p>
                         </div>
                    )}
                </div>

                {/* Right Panel - Timer & Controls */}
                {/* Desktop: Order 2. Mobile: Order 2 (Below stack), with buttons at bottom */}
                <div className={`
                    flex flex-col items-center justify-center h-full relative
                    ${compact ? 'order-2 shrink-0 py-2' : 'order-1 lg:order-2'}
                `}>
                     <div className="relative flex items-center justify-center">
                        
                        {/* Desktop: Stop Button Top RIGHT aligned to timer */}
                        <div className="hidden lg:block absolute -right-24 top-0">
                            <button
                                onClick={onStop}
                                className="group flex flex-col items-center gap-1 text-red-500 hover:text-red-600 transition-colors p-2"
                                title="Stop Workout"
                            >
                                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/10 group-hover:bg-red-100 dark:group-hover:bg-red-900/20 transition-colors">
                                    <StopCircle className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-medium uppercase tracking-wider">Stop</span>
                            </button>
                        </div>
                        
                        {/* Main Timer Circle */}
                        <div className="relative w-48 h-48 lg:w-96 lg:h-96 flex items-center justify-center z-10 transition-all">
                            {/* SVG Background Ring */}
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 220 220">
                                <circle
                                    className="stroke-slate-100 dark:stroke-slate-800"
                                    cx="110" cy="110" fill="none" r="100" strokeWidth="8"
                                ></circle>
                                <circle
                                    className="stroke-blue-500 transition-all duration-300 ease-in-out"
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
                                className="relative z-10 w-40 h-40 lg:w-80 lg:h-80 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all focus:outline-none group border border-slate-100 dark:border-slate-800"
                            >
                                <span className={`font-mono font-bold tracking-tighter text-slate-900 dark:text-white tabular-nums ${compact ? 'text-5xl' : 'text-7xl lg:text-8xl'}`}>
                                    {formatTime(displayTime)}
                                </span>
                                <div className="mt-2 text-blue-500 group-hover:text-blue-600 transition-colors">
                                    {isRunning ? <Pause className="w-10 h-10 lg:w-16 lg:h-16 title-pause" /> : <Play className="w-10 h-10 lg:w-16 lg:h-16 ml-2 title-play" />}
                                </div>
                            </button>
                        </div>

                         {/* Desktop: Next Button Right aligned to timer content (Below Stop Button) */}
                         <div className="hidden lg:block absolute -right-24 top-1/2 -translate-y-1/2 ">
                            <button
                                onClick={onNext}
                                className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transition-all"
                                title="Next Block"
                            >
                                <SkipForward className="w-8 h-8" />
                            </button>
                        </div>

                    </div>

                    {/* Mobile Controls (Bottom Row) */}
                    <div className="lg:hidden w-full flex items-center justify-between px-8 mt-4">
                        <button
                             onClick={onStop}
                             className="flex flex-col items-center gap-1 text-red-500"
                        >
                            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/10">
                                <StopCircle className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-medium">End</span>
                        </button>

                         <button
                            onClick={onNext}
                            className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
                        >
                            <SkipForward className="w-8 h-8" />
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
