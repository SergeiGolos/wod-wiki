import React from 'react';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { useTimerDisplay, useRoundDisplay } from '../hooks/useBlockMemory';
import { cn } from '@/lib/utils';

export interface BlockTimerDisplayProps {
    /** The runtime block to display timer for */
    block: IRuntimeBlock | undefined;
    /** Optional CSS class name */
    className?: string;
    /** Show round information if available */
    showRounds?: boolean;
    /** Compact mode for smaller displays */
    compact?: boolean;
}

/**
 * BlockTimerDisplay - Timer display using new behavior-based hooks.
 * 
 * This component demonstrates the preferred pattern for displaying timer
 * state from runtime blocks using the new useTimerDisplay and useRoundDisplay
 * hooks.
 * 
 * ## Features
 * - 60fps animation for running timers
 * - Automatic format detection (countdown vs countup)
 * - Round display integration
 * - Zero polling for completed timers
 * 
 * ## Usage
 * 
 * When you have direct access to an IRuntimeBlock (e.g., from the stack),
 * use this component:
 * 
 * \\\	sx
 * const block = runtime.stack.current();
 * return <BlockTimerDisplay block={block} showRounds />;
 * \\\
 * 
 * For display stack integration where you only have a blockKey string,
 * continue using DigitalClock or ClockAnchor with useTimerElapsed.
 * 
 * @see useTimerDisplay
 * @see useRoundDisplay
 */
export const BlockTimerDisplay: React.FC<BlockTimerDisplayProps> = ({
    block,
    className,
    showRounds = true,
    compact = false
}) => {
    const timer = useTimerDisplay(block);
    const round = useRoundDisplay(block);

    if (!timer) {
        return (
            <div className={cn('flex items-center justify-center p-4 text-muted-foreground', className)}>
                No timer active
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col items-center', className)}>
            {/* Timer Display */}
            <div className={cn(
                'font-mono font-bold tabular-nums',
                compact ? 'text-3xl' : 'text-5xl md:text-6xl',
                timer.isRunning ? 'text-primary' : 'text-foreground'
            )}>
                {timer.formatted}
            </div>

            {/* Status Indicator */}
            <div className={cn(
                'text-xs uppercase tracking-wider mt-2',
                timer.isRunning ? 'text-green-500' : 'text-muted-foreground'
            )}>
                {timer.isComplete ? 'Complete' : timer.isRunning ? 'Running' : 'Paused'}
            </div>

            {/* Elapsed/Remaining Info */}
            {timer.remaining !== undefined && timer.remaining > 0 && (
                <div className="text-sm text-muted-foreground mt-1">
                    {Math.ceil(timer.remaining / 1000)}s remaining
                </div>
            )}

            {/* Round Display */}
            {showRounds && round && (
                <div className={cn(
                    'mt-3 px-3 py-1 rounded-full text-sm',
                    'bg-secondary text-secondary-foreground'
                )}>
                    {round.label}
                </div>
            )}
        </div>
    );
};

export default BlockTimerDisplay;
