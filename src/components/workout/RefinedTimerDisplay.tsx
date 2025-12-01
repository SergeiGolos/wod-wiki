import React, { useMemo } from 'react';
import { Play, Pause, SkipForward, StopCircle } from 'lucide-react';
import { ITimerDisplayEntry, IDisplayCardEntry } from '../../clock/types/DisplayTypes';
import { RuntimeControls } from '../../runtime/models/MemoryModels';

export interface BreadcrumbItem {
    label?: string;
    metric?: string;
    type: 'round' | 'exercise' | 'group';
    isLeaf?: boolean;
}

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

    controls?: RuntimeControls;
    activeItems?: BreadcrumbItem[];
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

    activeItems
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
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                {/* Left Panel - Stats */}
                <div className="lg:col-start-1 flex flex-col justify-center">
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm text-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Time</p>
                            <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{formatTime(elapsedMs)}</p>
                        </div>

                        {/* Conditional Stats */}
                        {timeCapTimer && timeCapTimer.durationMs && (
                            <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm text-center">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Time Cap</p>
                                <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{formatTime(timeCapTimer.durationMs)}</p>
                            </div>
                        )}

                        {amrapTimer && (
                            <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm text-center">
                                <p className="text-sm text-slate-500 dark:text-slate-400">AMRAP</p>
                                <p className="font-bold text-lg text-slate-800 dark:text-slate-200">--:--</p> {/* Need actual value if available */}
                            </div>
                        )}
                        {/* Placeholder for other stats if needed or dynamic */}
                        {secondaryTimers.map(t => {
                            if (t === intervalTimer || t === emomTimer || t === amrapTimer || t === timeCapTimer) return null;
                            return (
                                <div key={t.id} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm text-center">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.label || 'Timer'}</p>
                                    <p className="font-bold text-lg text-slate-800 dark:text-slate-200">--:--</p>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Center/Right Panel - Main Timer & Controls */}
                <div className="lg:col-span-2 flex flex-col justify-center items-center">
                    <div className="max-w-md w-full">
                        {/* Active View String (Breadcrumb) */}
                        <div className="flex flex-wrap items-center justify-center gap-2 mb-4 min-h-[3rem]">
                            {activeItems && activeItems.map((item, index) => (
                                <div key={index} className="flex items-center animate-in fade-in slide-in-from-bottom-2 group">
                                    {/* CSS Separator */}
                                    {index > 0 && (
                                        <span className="text-slate-300 dark:text-slate-600 select-none mx-2 text-lg font-light">|</span>
                                    )}

                                    <span className={`flex items-center gap-2 px-3 py-1.5 rounded-md border shadow-sm font-medium transition-colors
                                        ${item.isLeaf
                                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        {item.isLeaf && <span>🏃</span>}

                                        {item.label && <span>{item.label}</span>}

                                        {item.metric && (
                                            <span className={`text-xs ml-1 px-1.5 py-0.5 rounded-full ${item.isLeaf
                                                ? 'bg-yellow-100 dark:bg-yellow-800/40 text-yellow-700 dark:text-yellow-300'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                }`}>
                                                {item.metric}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Main Timer Circle & Controls */}
                        <div className="flex flex-col items-center w-full">
                            <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center z-10">
                                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 220 220">
                                    <circle
                                        className="stroke-slate-200 dark:stroke-slate-700"
                                        cx="110" cy="110" fill="none" r="100" strokeWidth="10" // Thinner stroke for background
                                    ></circle>
                                    <circle
                                        className="stroke-primary transition-all duration-300 ease-in-out"
                                        cx="110" cy="110" fill="none" r="100" strokeLinecap="round" strokeWidth="10"
                                        style={{
                                            strokeDasharray: strokeDasharray,
                                            strokeDashoffset: strokeDashoffset
                                        }}
                                    ></circle>
                                </svg>

                                <button
                                    onClick={isRunning ? onPause : onStart}
                                    className="relative z-10 w-60 h-60 sm:w-64 sm:h-64 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus:ring-4 focus:ring-primary/30 pt-4 group"
                                >
                                    <span className="text-5xl sm:text-6xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                                        {formatTime(displayTime)}
                                    </span>
                                    <div className="mt-2 text-primary">
                                        {isRunning ? <Pause className="w-12 h-12 sm:w-16 sm:h-16" /> : <Play className="w-12 h-12 sm:w-16 sm:h-16 ml-2" />}
                                    </div>
                                </button>
                            </div>

                            {/* Controls - Positioned below the timer */}
                            <div className="w-full flex justify-between items-center px-4 sm:px-12 mt-4">
                                {/* End Button */}
                                <button
                                    onClick={onStop}
                                    className="text-sm font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors flex flex-col items-center gap-1 py-2 px-4 rounded-lg"
                                >
                                    <StopCircle className="w-8 h-8" />
                                    <span>End</span>
                                </button>

                                {/* Skip Button */}
                                <button
                                    onClick={onNext}
                                    className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border-4 border-blue-500 shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-4 focus:ring-blue-400/30"
                                >
                                    <SkipForward className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 dark:text-slate-500" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};
