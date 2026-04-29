import React from 'react';
import { useWorkoutTracker } from '@/hooks/useRuntimeTimer';
import { Sparkles, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricTrackerCardProps {
    className?: string;
}

/**
 * MetricTrackerCard - Renders high-fidelity analytics as floating bubbles.
 * Designed to sit above the clock, matching the style of exercise labels.
 */
export const MetricTrackerCard: React.FC<MetricTrackerCardProps> = ({ className }) => {
    const { metrics } = useWorkoutTracker();

    // Get high-fidelity analytics results (calculated after every block pop)
    const analyticsResults = metrics['session-totals'] || {};
    const hasData = Object.keys(analyticsResults).length > 0;

    if (!hasData) return null;

    return (
        <div className={cn("flex flex-wrap justify-center gap-2 px-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500", className)}>
            {Object.entries(analyticsResults).map(([key, data]) => (
                <div 
                    key={`bubble-${key}`}
                    className="flex flex-col items-center bg-background/60 backdrop-blur-md border border-primary/20 rounded-xl px-3 py-1.5 shadow-sm ring-1 ring-black/5 group hover:border-primary/40 transition-colors"
                >
                    <div className="flex items-center gap-1.5 opacity-60">
                        <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground group-hover:text-primary transition-colors">
                            {key}
                        </span>
                        <Sparkles className="h-2 w-2 text-primary/40" />
                    </div>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-sm font-black text-foreground tabular-nums tracking-tight">
                            {typeof data.value === 'number' ? 
                                (Number.isInteger(data.value) ? data.value : data.value.toFixed(1)) 
                                : data.value}
                        </span>
                        {data.unit && (
                            <span className="text-[9px] font-bold text-primary/60 uppercase">{data.unit}</span>
                        )}
                    </div>
                </div>
            ))}
            
            {/* Minimal Sigma Badge to indicate these are session totals */}
            <div className="self-center bg-primary/10 border border-primary/20 rounded-full p-1.5 shadow-inner opacity-40 hover:opacity-100 transition-opacity cursor-help" title="Session Aggregates">
                <Sigma className="h-3 w-3 text-primary" />
            </div>
        </div>
    );
};
