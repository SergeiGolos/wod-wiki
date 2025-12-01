/**
 * EnhancedTimerDisplay - Timer display with multi-timer stack and activity cards
 * 
 * This component enhances the original UnifiedWorkbench timer display with:
 * - Memory listeners for display stack state
 * - Secondary timer indicators (linked to blocks with hover highlighting)
 * - Activity cards below the primary timer
 * - "Next" button on cards to advance workout state
 * 
 * Maintains the same visual style as the original UnifiedWorkbench timer.
 */

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, SkipForward, Timer as TimerIcon, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeContext } from '../../runtime/context/RuntimeContext';
import { useMemorySubscription } from '../../runtime/hooks/useMemorySubscription';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';
import { TimerState, RuntimeControls } from '../../runtime/models/MemoryModels';
import { 
  useDisplayStack, 
  useTimerStack,
  useCardStack
} from '../../clock/hooks/useDisplayStack';
import { ITimerDisplayEntry, IDisplayCardEntry } from '../../clock/types/DisplayTypes';
import { CardComponentRegistry } from '../../clock/registry/CardComponentRegistry';
import { getFragmentColorClasses } from '../../views/runtime/fragmentColorMap';
import { getFragmentIcon } from '../../views/runtime/FragmentVisualizer';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerDisplayProps {
  /** Current elapsed time in milliseconds */
  elapsedMs: number;
  
  /** Whether a workout block is active */
  hasActiveBlock: boolean;
  
  /** Callback to start the timer */
  onStart: () => void;
  
  /** Callback to pause the timer */
  onPause: () => void;
  
  /** Callback to stop the timer */
  onStop: () => void;
  
  /** Callback to advance to next segment */
  onNext: () => void;
  
  /** Whether the timer is currently running */
  isRunning: boolean;
  
  /** Enable compact mode for mobile */
  compact?: boolean;
  
  /** Callback when hovering a timer block (for highlighting in editor) */
  onBlockHover?: (blockKey: string | null) => void;
  
  /** Callback when clicking a timer block (for navigation) */
  onBlockClick?: (blockKey: string) => void;
  
  /** Enable memory-driven display stack features */
  enableDisplayStack?: boolean;
}

/**
 * Format milliseconds to MM:SS.ms display
 */
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};

/**
 * Secondary Timer Badge - Compact display for non-primary timers
 */
interface SecondaryTimerBadgeProps {
  entry: ITimerDisplayEntry | { timerMemoryId?: string; label?: string; format?: string; durationMs?: number; ownerId?: string };
  onHover?: (blockKey: string | null) => void;
  onClick?: (blockKey: string) => void;
  compact?: boolean;
  className?: string;
}

const SecondaryTimerBadge: React.FC<SecondaryTimerBadgeProps> = ({
  entry,
  onHover,
  onClick,
  compact = false,
  className
}) => {
  const runtime = useRuntimeContext();
  const [now, setNow] = React.useState(Date.now());

  // Get timer data from memory
  const timerRef = useMemo(() => {
    if (!entry?.timerMemoryId) return undefined;
    
    const refs = runtime.memory.search({
      id: entry.timerMemoryId,
      ownerId: null,
      type: null,
      visibility: null,
    });
    
    return refs[0] as TypedMemoryReference<TimerState> | undefined;
  }, [runtime, entry?.timerMemoryId]);

  const timerState = useMemorySubscription(timerRef);
  const timeSpans = timerState?.spans || [];

  // Check if timer is actually running (has an open span without stop time)
  const isTimerRunning = useMemo(() => {
    return timeSpans.some(span => span.start && !span.stop);
  }, [timeSpans]);

  // Only update time periodically when timer is running
  React.useEffect(() => {
    if (!isTimerRunning) return;
    
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Calculate elapsed time
  const elapsed = useMemo(() => {
    if (timeSpans.length === 0) return 0;
    
    return timeSpans.reduce((total, span) => {
      if (!span.start) return total;
      // Timestamps are numbers in MemoryModels
      const start = span.start;
      const stop = span.stop || now;
      return total + (stop - start);
    }, 0);
  }, [timeSpans, now]);

  // Calculate display time
  const displayTime = useMemo(() => {
    if ('format' in entry && entry.format === 'countdown' && entry.durationMs) {
      return Math.max(0, entry.durationMs - elapsed);
    }
    return elapsed;
  }, [entry, elapsed]);

  // Progress for countdown
  const progress = useMemo(() => {
    if ('format' in entry && entry.format === 'countdown' && entry.durationMs) {
      return Math.min((elapsed / entry.durationMs) * 100, 100);
    }
    return 0;
  }, [entry, elapsed]);

  const label = 'label' in entry ? entry.label : 'Timer';
  const ownerId = 'ownerId' in entry ? entry.ownerId : undefined;
  const format = 'format' in entry ? entry.format : 'countup';
  const durationMs = 'durationMs' in entry ? entry.durationMs : undefined;

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all',
        'bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/50',
        compact ? 'text-xs' : 'text-sm',
        className
      )}
      onMouseEnter={() => ownerId && onHover?.(ownerId)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => ownerId && onClick?.(ownerId)}
    >
      <TimerIcon className={cn('text-muted-foreground group-hover:text-primary', compact ? 'h-3 w-3' : 'h-4 w-4')} />
      <span className="font-medium text-muted-foreground group-hover:text-foreground truncate max-w-[100px]">
        {label}
      </span>
      <span className={cn('font-mono tabular-nums', compact ? 'text-xs' : 'text-sm')}>
        {formatTime(displayTime)}
      </span>
      {format === 'countdown' && durationMs && (
        <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              'h-full transition-all',
              progress >= 90 ? 'bg-red-500' : progress >= 70 ? 'bg-yellow-500' : 'bg-primary'
            )} 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}
    </div>
  );
};

/**
 * Activity Card - Displays current block information with Next button
 */
interface ActivityCardProps {
  entry: IDisplayCardEntry;
  onNext?: () => void;
  onButtonClick?: (eventName: string, payload?: Record<string, unknown>) => void;
  compact?: boolean;
  controls?: RuntimeControls;
  onControlAction?: (action: string) => void;
  onBlockHover?: (blockKey: string | null) => void;
  onBlockClick?: (blockKey: string) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  entry,
  onNext,
  onButtonClick,
  compact = false,
  controls,
  onControlAction,
  onBlockHover,
  onBlockClick
}) => {
  // Try to get a registered component for this card type
  const Component = CardComponentRegistry.resolve(entry);
  
  if (Component) {
    return (
      <div className="relative">
        <Component entry={entry} onButtonClick={onButtonClick} />
        {/* Next button overlay */}
        {onNext && (
          <Button
            onClick={onNext}
            size={compact ? 'sm' : 'default'}
            variant="secondary"
            className={cn(
              'absolute right-2',
              compact ? 'top-1' : 'top-2',
              'flex items-center gap-1'
            )}
          >
            Next
            <ChevronRight className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />
          </Button>
        )}
      </div>
    );
  }

  // Helper to render a runtime button
  const renderButton = (btn: any) => {
    const Icon = btn.icon === 'play' ? Play : 
                 btn.icon === 'pause' ? Pause : 
                 btn.icon === 'stop' ? Square : 
                 btn.icon === 'next' ? SkipForward : 
                 btn.icon === 'check' ? ChevronRight :
                 btn.icon === 'analytics' ? TimerIcon :
                 btn.icon === 'x' ? X :
                 Play;

    return (
      <Button 
        key={btn.id}
        onClick={() => onControlAction?.(btn.action)}
        variant={btn.variant || 'default'}
        size={btn.size || (compact ? 'sm' : 'default')}
        className={cn(
          'rounded-full',
          compact ? 'h-8 w-8 p-0' : 'h-10 w-10 p-0',
          btn.color
        )}
        title={btn.label}
      >
        <Icon className={cn('fill-current', compact ? 'h-3 w-3' : 'h-4 w-4')} />
      </Button>
    );
  };

  // Split buttons into groups - play/pause, stop, and complete (x) go on left, next goes on right
  const playPauseButton = controls?.buttons.find(b => ['play', 'pause'].includes(b.icon || ''));
  const stopButton = controls?.buttons.find(b => b.icon === 'stop');
  const completeButton = controls?.buttons.find(b => b.icon === 'x');
  const nextButton = controls?.buttons.find(b => ['next', 'check'].includes(b.icon || ''));
  const otherButtons = controls?.buttons.filter(b => !['play', 'pause', 'stop', 'next', 'check', 'x'].includes(b.icon || '')) || [];

  // Default activity card layout
  return (
    <Card className={cn('w-full', compact ? 'p-2' : 'p-4')}>
      <CardContent className={cn('flex items-center justify-between gap-4', compact ? 'p-2' : 'p-4')}>
        
        {/* Left Controls (Play/Pause + End Workout + Complete) */}
        <div className="flex items-center gap-2 shrink-0">
          {playPauseButton && renderButton(playPauseButton)}
          {completeButton && renderButton(completeButton)}
          {stopButton && (
            <Button
              onClick={() => onControlAction?.(stopButton.action)}
              variant="destructive"
              size={compact ? 'sm' : 'default'}
              className="flex items-center gap-1"
            >
              <Square className={cn('fill-current', compact ? 'h-3 w-3' : 'h-4 w-4')} />
              {compact ? 'End' : 'End Workout'}
            </Button>
          )}
          {otherButtons.map(renderButton)}
        </div>

        {/* Info - Rendered as Fragment Pills */}
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-2">
          
          <div className="flex flex-wrap gap-2 items-center justify-center">
            {/* Metrics display */}
            {entry.metrics && entry.metrics.length > 0 && entry.metrics.map((metric, idx) => {
               const type = metric.type || 'unknown';
               const colorClasses = getFragmentColorClasses(type);
               const icon = getFragmentIcon(type);
               
               return (
                  <span
                    key={idx}
                    className={cn(
                      `inline-flex items-center gap-1 rounded font-mono border ${colorClasses} bg-opacity-60 shadow-sm transition-colors`,
                      compact ? "px-1 py-0 text-[10px] leading-tight" : "px-2 py-0.5 text-sm"
                    )}
                  >
                    {icon && <span className={compact ? "text-xs" : "text-base leading-none"}>{icon}</span>}
                    <span>{metric.value} {metric.unit}</span>
                  </span>
               );
            })}

            {/* Title as Action/Text Fragment */}
            {entry.title && (
              <span
                className={cn(
                  `inline-flex items-center gap-1 rounded font-mono border ${getFragmentColorClasses('action')} bg-opacity-60 shadow-sm transition-colors`,
                  compact ? "px-1 py-0 text-[10px] leading-tight" : "px-2 py-0.5 text-sm"
                )}
              >
                <span className={compact ? "text-xs" : "text-base leading-none"}>{getFragmentIcon('action')}</span>
                <span className="font-semibold">{entry.title}</span>
              </span>
            )}

            {entry.subtitle && (
               <span className={cn('text-muted-foreground ml-2', compact ? 'text-xs' : 'text-sm')}>
                 {entry.subtitle}
               </span>
            )}
          </div>

          {/* Card Timer - If timerMemoryId is present */}
          {entry.timerMemoryId && (
            <div className="mt-1">
                <SecondaryTimerBadge 
                    entry={{ 
                        timerMemoryId: entry.timerMemoryId, 
                        label: 'Block Time',
                        format: 'countup',
                        ownerId: entry.ownerId
                    }}
                    onHover={onBlockHover}
                    onClick={onBlockClick}
                    compact={true}
                    className="bg-background/80 border-primary/20"
                />
            </div>
          )}
        </div>
        
        {/* Right Controls (Next as button with text) */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {nextButton ? (
            <Button
              onClick={() => onControlAction?.(nextButton.action)}
              variant="default"
              size={compact ? 'sm' : 'default'}
              className={cn(
                'flex items-center gap-1',
                nextButton.color || 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {compact ? 'Next' : nextButton.label || 'Next'}
              <SkipForward className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />
            </Button>
          ) : onNext ? (
            // Fallback if no controls but onNext exists (legacy/custom)
            <Button
              onClick={onNext}
              size={compact ? 'sm' : 'default'}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
            >
              Next
              <SkipForward className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * EnhancedTimerCore - Core enhanced timer UI
 * Can render with or without display stack data
 */
interface EnhancedTimerCoreProps extends TimerDisplayProps {
  /** Primary timer entry from display stack */
  primaryTimer?: ITimerDisplayEntry;
  /** Secondary timer entries */
  secondaryTimers?: ITimerDisplayEntry[];
  /** Current activity card */
  currentCard?: IDisplayCardEntry;
  /** Display state for rounds */
  displayState?: { currentRound?: number; totalRounds?: number } | null;
  /** Runtime controls configuration */
  controls?: RuntimeControls;
}

const EnhancedTimerCore: React.FC<EnhancedTimerCoreProps> = ({ 
  elapsedMs, 
  hasActiveBlock, 
  onStart, 
  onPause, 
  onStop, 
  onNext, 
  isRunning, 
  compact = false,
  onBlockHover,
  onBlockClick,
  primaryTimer,
  secondaryTimers = [],
  currentCard,
  displayState,
  controls,
}) => {
  // Clock state for 'clock' mode
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    if (controls?.displayMode === 'clock') {
      const interval = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [controls?.displayMode]);

  const formatClock = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Determine what to display
  const showClock = controls?.displayMode === 'clock';
  const displayValue = showClock ? formatClock(currentTime) : (hasActiveBlock ? formatTime(elapsedMs) : '--:--.--');

  return (
    <div className={cn(
      'flex flex-col items-center justify-center h-full',
      compact ? 'gap-4' : 'gap-6'
    )}>
      {/* Secondary Timers (linked to blocks) - only shown when data exists */}
      {secondaryTimers.length > 0 && (
        <div className={cn(
          'flex flex-wrap justify-center',
          compact ? 'gap-2 mb-2' : 'gap-3 mb-4'
        )}>
          {secondaryTimers.map((timer) => (
            <SecondaryTimerBadge
              key={timer.id}
              entry={timer}
              onHover={onBlockHover}
              onClick={onBlockClick}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Title */}
      {!compact && (
        <h2 className="text-2xl font-bold text-muted-foreground">
          {showClock ? 'Current Time' : (primaryTimer?.label || 'Workout Timer')}
        </h2>
      )}
      
      {/* Main Time Display */}
      <div className={cn(
        'font-mono font-bold tabular-nums tracking-wider',
        compact ? 'text-4xl' : 'text-8xl',
        (hasActiveBlock || showClock) ? 'text-primary' : 'text-muted-foreground/20'
      )}>
        {displayValue}
      </div>

      {/* Countdown Progress (if primary timer is countdown) */}
      {!showClock && primaryTimer?.format === 'countdown' && primaryTimer.durationMs && hasActiveBlock && (
        <div className={cn('w-full max-w-md', compact ? 'px-4' : 'px-8')}>
          <Progress 
            value={Math.min((elapsedMs / primaryTimer.durationMs) * 100, 100)} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0:00</span>
            <span>{formatTime(primaryTimer.durationMs)}</span>
          </div>
        </div>
      )}

      {/* Round info */}
      {!showClock && displayState && (displayState.currentRound || displayState.totalRounds) && (
        <Badge variant="outline" className={cn(compact ? 'text-xs' : 'text-sm')}>
          Round {displayState.currentRound || 1}
          {displayState.totalRounds && ` / ${displayState.totalRounds}`}
        </Badge>
      )}
      
      {/* Control Buttons - Only shown if NO active card */}
      {!currentCard && (controls?.buttons && controls.buttons.length > 0 ? (
        <div className={cn('flex', compact ? 'gap-3' : 'gap-6')}>
          {controls.buttons.map(btn => {
            const Icon = btn.icon === 'play' ? Play : 
                         btn.icon === 'pause' ? Pause : 
                         btn.icon === 'stop' ? Square : 
                         btn.icon === 'next' ? SkipForward : 
                         btn.icon === 'check' ? ChevronRight :
                         btn.icon === 'analytics' ? TimerIcon : // Use TimerIcon as placeholder for Analytics if needed
                         Play; // Default

            const handleClick = () => {
                if (btn.action === 'timer:start') onStart();
                else if (btn.action === 'timer:pause') onPause();
                else if (btn.action === 'timer:resume') onStart();
                else if (btn.action === 'timer:stop') onStop();
                else if (btn.action === 'timer:next') onNext();
                else if (btn.action === 'timer:complete') onStop();
                else if (btn.action === 'view:analytics') {
                    console.log('View Analytics clicked');
                }
            };

            return (
                <Button 
                    key={btn.id}
                    onClick={handleClick}
                    variant={btn.variant || 'default'}
                    size={compact ? 'default' : 'lg'}
                    className={cn(
                        'rounded-full',
                        compact ? 'h-12 w-12 p-0' : 'h-16 w-16 p-0',
                        btn.color // Apply custom color class if provided
                    )}
                    title={btn.label}
                >
                    <Icon className={cn('fill-current', compact ? 'h-5 w-5' : 'h-8 w-8')} />
                </Button>
            );
          })}
        </div>
      ) : hasActiveBlock ? (
        // Fallback to hardcoded buttons if no controls (should not happen with new logic)
        <div className={cn('flex', compact ? 'gap-3' : 'gap-6')}>
          {!isRunning ? (
            <Button onClick={onStart} size={compact ? 'default' : 'lg'} className={cn(
              'rounded-full bg-green-600 hover:bg-green-700',
              compact ? 'h-12 w-12 p-0' : 'h-16 w-16 p-0'
            )}>
              <Play className={cn('fill-current', compact ? 'h-5 w-5' : 'h-8 w-8')} />
            </Button>
          ) : (
            <Button onClick={onPause} size={compact ? 'default' : 'lg'} className={cn(
              'rounded-full bg-yellow-600 hover:bg-yellow-700',
              compact ? 'h-12 w-12 p-0' : 'h-16 w-16 p-0'
            )}>
              <Pause className={cn('fill-current', compact ? 'h-5 w-5' : 'h-8 w-8')} />
            </Button>
          )}
          
          <Button onClick={onNext} size={compact ? 'default' : 'lg'} className={cn(
            'rounded-full bg-blue-600 hover:bg-blue-700',
            compact ? 'h-12 w-12 p-0' : 'h-16 w-16 p-0'
          )}>
            <SkipForward className={cn('fill-current', compact ? 'h-5 w-5' : 'h-8 w-8')} />
          </Button>

          <Button onClick={onStop} size={compact ? 'default' : 'lg'} variant="destructive" className={cn(
            'rounded-full',
            compact ? 'h-12 w-12 p-0' : 'h-16 w-16 p-0'
          )}>
            <Square className={cn('fill-current', compact ? 'h-4 w-4' : 'h-6 w-6')} />
          </Button>
        </div>
      ) : (
        <div className={cn(
          'p-4 rounded-lg border border-border bg-card text-center',
          compact ? 'max-w-[200px]' : 'max-w-md'
        )}>
          <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
            {compact ? 'Select a workout to begin' : 'Select a WOD block from the index to begin tracking.'}
          </p>
        </div>
      ))}

      {/* Activity Card - only shown when data exists */}
      {currentCard && hasActiveBlock && (
        <div className={cn('w-full', compact ? 'max-w-[300px] mt-2' : 'max-w-lg mt-4')}>
          <ActivityCard
            entry={currentCard}
            onNext={onNext}
            compact={compact}
            controls={controls || (hasActiveBlock ? {
                // Generate synthetic controls if missing but we have active block
                buttons: [
                    !isRunning ? {
                        id: 'start', label: 'Start', action: 'timer:start', icon: 'play', variant: 'default', color: 'bg-green-600 hover:bg-green-700'
                    } : {
                        id: 'pause', label: 'Pause', action: 'timer:pause', icon: 'pause', variant: 'default', color: 'bg-yellow-600 hover:bg-yellow-700'
                    },
                    {
                        id: 'next', label: 'Next', action: 'timer:next', icon: 'next', variant: 'default', color: 'bg-blue-600 hover:bg-blue-700'
                    },
                    {
                        id: 'stop', label: 'Stop', action: 'timer:stop', icon: 'stop', variant: 'destructive'
                    }
                ]
            } : undefined)}
            onControlAction={(action) => {
                if (action === 'timer:start') onStart();
                else if (action === 'timer:pause') onPause();
                else if (action === 'timer:resume') onStart();
                else if (action === 'timer:stop') onStop();
                else if (action === 'timer:next') onNext();
                else if (action === 'timer:complete') onStop();
            }}
            onBlockHover={onBlockHover}
            onBlockClick={onBlockClick}
          />
        </div>
      )}
    </div>
  );
};

/**
 * DisplayStackTimerDisplay - Timer with full runtime integration
 * This component MUST be rendered inside a RuntimeProvider
 */
const DisplayStackTimerDisplay: React.FC<TimerDisplayProps> = (props) => {
  // These hooks require RuntimeProvider - safe to call here since we're only
  // rendered when enableDisplayStack is true (which requires runtime)
  const displayState = useDisplayStack();
  const timerStack = useTimerStack();
  const cardStack = useCardStack();
  const runtime = useRuntimeContext();

  // Subscribe to runtime controls
  const controlsRef = useMemo(() => {
    const refs = runtime.memory.search({
      type: 'runtime-controls',
      id: null,
      ownerId: null,
      visibility: null
    });
    // Use the last one (most recently created/pushed) as it likely corresponds to the active block
    return refs.length > 0 ? (refs[refs.length - 1] as TypedMemoryReference<RuntimeControls>) : undefined;
  }, [runtime]);

  const controls = useMemorySubscription(controlsRef);
  
  // Primary timer is the last in stack (if display stack enabled)
  const primaryTimer = timerStack.length > 0 ? timerStack[timerStack.length - 1] : undefined;
  
  // Secondary timers are all except the primary
  const secondaryTimers = timerStack.length > 1 ? timerStack.slice(0, -1) : [];
  
  // Current activity card
  const currentCard = cardStack.length > 0 ? cardStack[cardStack.length - 1] : undefined;

  // Delegate to EnhancedTimerCore with the display stack data
  return (
    <EnhancedTimerCore
      {...props}
      primaryTimer={primaryTimer}
      secondaryTimers={secondaryTimers}
      currentCard={currentCard}
      displayState={displayState}
      controls={controls}
    />
  );
};

/**
 * TimerDisplay - Enhanced timer display component
 * 
 * Always shows the enhanced layout with:
 * - Secondary timer badges (when display stack data available)
 * - Activity cards (when display stack data available)
 * - Full control buttons
 * 
 * When enableDisplayStack is true and RuntimeProvider is available,
 * it will show data from the display stack. Otherwise shows the
 * enhanced UI without the stack data.
 */
export const TimerDisplay: React.FC<TimerDisplayProps> = (props) => {
  // If display stack is enabled (runtime available), render with runtime hooks
  // Otherwise render without runtime dependencies but same enhanced layout
  if (props.enableDisplayStack) {
    return <DisplayStackTimerDisplay {...props} />;
  }
  
  // Render same enhanced layout but pass empty display stack data
  return <EnhancedTimerCore {...props} />;
};

export default TimerDisplay;
