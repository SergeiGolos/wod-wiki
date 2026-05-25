import React from 'react';
import { useWorkoutTracker } from '@/hooks/useRuntimeTimer';
import { Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMetricColorClasses, getMetricIcon } from '@/views/runtime/metricColorMap';
import { formatDurationSmart } from '@/lib/formatTime';

interface MetricTrackerCardProps {
    className?: string;
}

/** Time-like metric types whose numeric values represent milliseconds. */
const TIME_LIKE_TYPES = new Set<string>([
    'duration', 'time', 'elapsed', 'total', 'spans',
]);

/** Infer a canonical metric type from a session-total key name and optional unit. */
export function inferMetricType(key: string, unit?: string): string {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Direct matches
    const exactMap: Record<string, string> = {
        reps: 'rep',
        rep: 'rep',
        distance: 'distance',
        rounds: 'rounds',
        round: 'rounds',
        currentround: 'current-round',
        action: 'action',
        increment: 'increment',
        lap: 'lap',
        text: 'text',
        resistance: 'resistance',
        weight: 'resistance',
        duration: 'duration',
        spans: 'spans',
        elapsed: 'elapsed',
        total: 'total',
        totaltime: 'total',
        systemtime: 'system-time',
        label: 'label',
        system: 'system',
        sound: 'sound',
        group: 'group',
    };
    if (exactMap[normalized]) return exactMap[normalized];

    // Partial / heuristic matches
    if (normalized.includes('rir')) return 'rir';
    if (normalized.includes('sessionrpe')) return 'session-rpe';
    if (normalized === 'rpe') return 'session-rpe';
    if (normalized.includes('sessionload')) return 'session-load';
    if (normalized.includes('metscore') || normalized === 'met') return 'met-score';
    if (normalized === 'tis') return 'tis';
    if (normalized.includes('volume')) return 'volume';
    if (normalized.includes('intensity')) return 'intensity';
    if (normalized.includes('load')) return 'load';
    if (normalized.includes('work') || normalized.includes('energy') || normalized.includes('calorie')) return 'work';
    if (normalized.includes('set')) return 'metric';

    // Unit-based inference
    if (unit) {
        const u = unit.toLowerCase();
        if (u === 'reps' || u === 'rep') return 'rep';
        if (u === 'km' || u === 'm' || u === 'mi' || u === 'ft' || u === 'yd') return 'distance';
        if (u === 'lb' || u === 'kg' || u === 'lbs' || u === 'pood') return 'resistance';
        if (u === 'min' || u === 'sec' || u === 'ms' || u === 'h') return 'duration';
        if (u === 'kcal' || u === 'cal') return 'work';
        if (u === 'round' || u === 'rounds') return 'rounds';
        if (u === 'sets' || u === 'set') return 'metric';
    }

    return 'metric';
}

/** Format a tracker value based on inferred metric type and unit. */
export function formatTrackerValue(value: unknown, type: string, unit?: string): string {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'string') return value;
    if (typeof value !== 'number' || !Number.isFinite(value)) return String(value);

    // Time-like values: assume milliseconds if no explicit time unit
    if (TIME_LIKE_TYPES.has(type)) {
        const timeUnit = unit?.toLowerCase();
        if (timeUnit === 'sec' || timeUnit === 's') {
            return formatDurationSmart(value * 1000);
        }
        if (timeUnit === 'min' || timeUnit === 'm') {
            return formatDurationSmart(value * 60 * 1000);
        }
        if (timeUnit === 'h' || timeUnit === 'hr') {
            return formatDurationSmart(value * 60 * 60 * 1000);
        }
        return formatDurationSmart(value);
    }

    // Standard numeric formatting
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1);
}

/**
 * MetricTrackerCard - Renders high-fidelity analytics as floating bubbles.
 * Designed to sit above the clock, matching the style of exercise labels.
 *
 * Each bubble is type-aware: it infers the metric type from the key name,
 * applies the correct color theme and icon, and formats values appropriately
 * (e.g., milliseconds → MM:SS, integers → plain, decimals → 1 d.p.).
 */
export const MetricTrackerCard: React.FC<MetricTrackerCardProps> = ({ className }) => {
    const { metrics } = useWorkoutTracker();

    const analyticsResults = metrics['session-totals'] || {};
    const entries = Object.entries(analyticsResults);
    const hasData = entries.length > 0;

    if (!hasData) return null;

    return (
        <div className={cn("flex flex-wrap justify-center gap-2 px-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500", className)}>
            {entries.map(([key, data]) => {
                const type = inferMetricType(key, data.unit);
                const colorClasses = getMetricColorClasses(type);
                const icon = getMetricIcon(type);
                const formattedValue = formatTrackerValue(data.value, type, data.unit);

                return (
                    <div
                        key={`bubble-${key}`}
                        className={cn(
                            "flex flex-col items-center backdrop-blur-md border rounded-xl px-3 py-1.5 shadow-sm ring-1 ring-black/5 group transition-colors",
                            colorClasses
                        )}
                    >
                        <div className="flex items-center gap-1.5 opacity-70">
                            {icon && (
                                <span className="text-[10px] leading-none" aria-hidden="true">{icon}</span>
                            )}
                            <span className="text-[8px] font-black uppercase tracking-tighter group-hover:opacity-100 transition-opacity">
                                {key}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-sm font-black tabular-nums tracking-tight">
                                {formattedValue}
                            </span>
                            {data.unit && !TIME_LIKE_TYPES.has(type) && (
                                <span className="text-[9px] font-bold opacity-60 uppercase">{data.unit}</span>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Minimal Sigma Badge to indicate these are session totals */}
            <div className="self-center bg-primary/10 border border-primary/20 rounded-full p-1.5 shadow-inner opacity-40 hover:opacity-100 transition-opacity cursor-help" title="Session Aggregates">
                <Sigma className="h-3 w-3 text-primary" />
            </div>
        </div>
    );
};
