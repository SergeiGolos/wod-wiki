import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Play, Pause, Square, Timer } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useRuntimeContext } from '../../runtime/context/RuntimeContext';
import { useMemorySubscription } from '../../runtime/hooks/useMemorySubscription';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../../runtime/models/RuntimeSpan';
import {
  useDisplayStack,
  useCurrentTimer,
  useCurrentCard,
  useWorkoutState
} from '../hooks/useDisplayStack';

import { ITimerDisplayEntry, IDisplayCardEntry } from '../types/DisplayTypes';
import { CardComponentRegistry } from '../registry/CardComponentRegistry';
import { FallbackCard } from '../cards/DefaultCards';

/**
 * Props for the StackedClockDisplay component.
 */
export interface StackedClockDisplayProps {
  /** Optional className for styling */
  className?: string;

  /** Show the timer stack visualization for debugging */
  showStackDebug?: boolean;

  /** Callback when a button on a timer or card is clicked */
  onButtonClick?: (eventName: string, payload?: Record<string, unknown>) => void;

  /** Callback when workout state changes are requested */
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;

  /** Whether external controls are managing the running state */
  isRunning?: boolean;
}

/**
 * StackedClockDisplay - Main clock UI that renders the timer and card stacks.
 * 
 * Layout (top to bottom):
 * 1. Secondary timers (floating cards on desktop, rows on mobile)
 * 2. Primary clock (the latest/top timer in the stack)
 * 3. Control buttons
 * 4. Activity card (current block/effort display)
 * 
 * @example
 * ```tsx
 * <RuntimeProvider runtime={runtime}>
 *   <StackedClockDisplay 
 *     onButtonClick={(event, payload) => runtime.handle({ name: event, data: payload })}
 *   />
 * </RuntimeProvider>
 * ```
 */
export const StackedClockDisplay: React.FC<StackedClockDisplayProps> = ({
  className,
  showStackDebug = false,
  onButtonClick,
  onPlay,
  onPause,
  onReset,
  isRunning: externalIsRunning,
}) => {
  const runtime = useRuntimeContext();
  const displayState = useDisplayStack();
  const currentTimer = useCurrentTimer();
  const currentCard = useCurrentCard();
  const workoutState = useWorkoutState();

  // Primary timer:
  // 1. First entry with role='primary' (search from top/end of stack down)
  // 2. Fallback: Top of stack (currentTimer)
  const primaryTimer = useMemo(() => {
    // Search from end (top) to start (bottom)
    for (let i = displayState.timerStack.length - 1; i >= 0; i--) {
      if (displayState.timerStack[i].role === 'primary') {
        return displayState.timerStack[i];
      }
    }
    return currentTimer;
  }, [displayState.timerStack, currentTimer]);

  // Secondary timers:
  // 1. All entries with role='secondary'
  // 2. If no roles used anywhere, fallback to all except top
  const secondaryTimers = useMemo(() => {
    const explicitSecondaries = displayState.timerStack.filter(t => t.role === 'secondary');

    if (explicitSecondaries.length > 0) {
      // If we have explicit secondaries, use them. 
      // Also include any 'auto' roles that are NOT the primary timer.
      const autos = displayState.timerStack.filter(t =>
        t.role === 'auto' && t.id !== primaryTimer?.id
      );
      return [...explicitSecondaries, ...autos];
    }

    // Fallback if no explicit roles found at all
    const hasAnyRoles = displayState.timerStack.some(t => t.role === 'primary');
    if (hasAnyRoles) {
      // If we have a primary but no secondaries, show everything else
      return displayState.timerStack.filter(t => t.id !== primaryTimer?.id);
    }

    // Legacy fallback: all timers except top one
    if (displayState.timerStack.length <= 1) return [];
    return displayState.timerStack.slice(0, -1);
  }, [displayState.timerStack, primaryTimer]);

  // Handle button clicks - emit to runtime if handler provided
  const handleButtonClick = useCallback((eventName: string, payload?: Record<string, unknown>) => {
    // Call the provided handler
    onButtonClick?.(eventName, payload);

    // Also emit as a runtime event
    runtime.handle({
      name: eventName,
      timestamp: new Date(),
      data: payload || {},
    });
  }, [onButtonClick, runtime]);

  // Determine which idle card to show when stacks are empty
  const idleCardEntry = useMemo((): IDisplayCardEntry | undefined => {
    if (currentCard) return undefined; // Don't show idle if there's an active card

    if (workoutState === 'complete') {
      return {
        id: 'idle-complete',
        ownerId: 'system',
        type: 'idle-complete',
        title: 'Workout Complete!',
        subtitle: 'Great job! View your results.',
      };
    }

    if (workoutState === 'idle') {
      return {
        id: 'idle-start',
        ownerId: 'system',
        type: 'idle-start',
        title: 'Ready to Start',
        subtitle: 'Press start to begin your workout',
      };
    }

    return undefined;
  }, [currentCard, workoutState]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Secondary Timers - Float above primary on desktop, stack on mobile */}
      {secondaryTimers.length > 0 && (
        <SecondaryTimersSection
          timers={secondaryTimers}
          onButtonClick={handleButtonClick}
        />
      )}

      {/* Primary Timer Section - The main clock display */}
      <PrimaryTimerSection
        timerEntry={primaryTimer}
        displayState={displayState}
        onButtonClick={handleButtonClick}
        onPlay={onPlay}
        onPause={onPause}
        onReset={onReset}
        isRunning={externalIsRunning}
      />

      {/* Activity Card Section - Below primary clock */}
      <CardSection
        cardEntry={currentCard || idleCardEntry}
        onButtonClick={handleButtonClick}
      />

      {/* Debug: Stack Visualization */}
      {showStackDebug && (
        <StackDebugView
          timerStack={displayState.timerStack}
          cardStack={displayState.cardStack}
          workoutState={displayState.workoutState}
        />
      )}
    </div>
  );
};

/**
 * Secondary Timers Section - Shows other timers on the stack as floating cards.
 * On desktop: horizontal row of compact timer cards
 * On mobile: vertical stack of timer rows
 */
interface SecondaryTimersSectionProps {
  timers: ITimerDisplayEntry[];
  onButtonClick?: (eventName: string, payload?: Record<string, unknown>) => void;
}

const SecondaryTimersSection: React.FC<SecondaryTimersSectionProps> = ({
  timers,
  onButtonClick,
}) => {
  return (
    <div className="w-full">
      {/* Desktop: Horizontal floating cards */}
      <div className="hidden md:flex flex-wrap gap-2 justify-center">
        {timers.map((timer) => (
          <SecondaryTimerCard
            key={timer.id}
            timerEntry={timer}
            onButtonClick={onButtonClick}
            variant="card"
          />
        ))}
      </div>

      {/* Mobile: Vertical rows */}
      <div className="md:hidden flex flex-col gap-1">
        {timers.map((timer) => (
          <SecondaryTimerCard
            key={timer.id}
            timerEntry={timer}
            onButtonClick={onButtonClick}
            variant="row"
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Secondary Timer Card - Compact display for non-primary timers
 */
interface SecondaryTimerCardProps {
  timerEntry: ITimerDisplayEntry;
  onButtonClick?: (eventName: string, payload?: Record<string, unknown>) => void;
  variant: 'card' | 'row';
}

const SecondaryTimerCard: React.FC<SecondaryTimerCardProps> = ({
  timerEntry,
  onButtonClick: _onButtonClick,
  variant,
}) => {
  const runtime = useRuntimeContext();
  const [now, setNow] = useState(Date.now());

  // Update time display periodically
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  // Get timer data from memory
  const timerRef = useMemo(() => {
    if (!timerEntry?.timerMemoryId) return undefined;

    // Search for unified RuntimeSpan
    const refs = runtime.memory.search({
      id: null,
      ownerId: timerEntry.ownerId, // timerMemoryId might be unreliable if expecting old key
      type: RUNTIME_SPAN_TYPE,
      visibility: null,
    });

    // If we didn't find by ownerId (typical), try ID if it was passed as such? 
    // Usually timerMemoryId is the ownerId in the new system? 
    // In legacy it was 'timer:blockId'. In new system we typically search by blockId (ownerId).
    // Let's assume timerEntry.ownerId is the blockId.

    return refs[0] as TypedMemoryReference<RuntimeSpan> | undefined;
  }, [runtime, timerEntry?.ownerId]);

  const timerSpan = useMemorySubscription(timerRef);
  const spans = timerSpan?.spans || [];

  // Calculate elapsed time
  const elapsed = useMemo(() => {
    if (spans.length === 0) return 0;

    return spans.reduce((total, span) => {
      const end = span.ended || now;
      return total + Math.max(0, end - span.started);
    }, 0);
  }, [spans, now]);

  // Calculate display time
  const displayTime = useMemo(() => {
    if (timerEntry.format === 'down' && timerEntry.durationMs) {
      return Math.max(0, timerEntry.durationMs - elapsed);
    }
    return elapsed;
  }, [timerEntry, elapsed]);

  // Format time compactly
  const formatTimeCompact = (ms: number): string => {
    const totalSeconds = Math.floor(Math.abs(ms) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Determine if running
  const isRunning = useMemo(() => {
    if (timerSpan && typeof timerSpan.isActive === 'function') {
      return timerSpan.isActive();
    }
    if (spans.length === 0) return false;
    const lastSpan = spans[spans.length - 1];
    return lastSpan && !lastSpan.ended;
  }, [spans, timerSpan]);

  if (variant === 'row') {
    // Mobile: Horizontal row layout
    return (
      <div className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg border',
        'bg-muted/50 hover:bg-muted/80 transition-colors'
      )}>
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {timerEntry.label || 'Timer'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-mono text-sm font-semibold',
            isRunning ? 'text-primary' : 'text-muted-foreground'
          )}>
            {formatTimeCompact(displayTime)}
          </span>
          {isRunning && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  // Desktop: Compact card layout
  return (
    <Card className={cn(
      'min-w-[140px] max-w-[180px]',
      'bg-muted/30 hover:bg-muted/50 transition-colors'
    )}>
      <CardContent className="p-3">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Timer size={14} />
            <span className="text-xs font-medium truncate max-w-[100px]">
              {timerEntry.label || 'Timer'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn(
              'font-mono text-lg font-bold',
              isRunning ? 'text-primary' : 'text-foreground'
            )}>
              {formatTimeCompact(displayTime)}
            </span>
            {isRunning && (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Primary Timer Section - Renders the main (top of stack) timer display.
 */
interface PrimaryTimerSectionProps {
  timerEntry?: ITimerDisplayEntry;
  displayState: ReturnType<typeof useDisplayStack>;
  onButtonClick?: (eventName: string, payload?: Record<string, unknown>) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  isRunning?: boolean;
}

const PrimaryTimerSection: React.FC<PrimaryTimerSectionProps> = ({
  timerEntry,
  displayState,
  onButtonClick,
  onPlay,
  onPause,
  onReset,
  isRunning: externalIsRunning,
}) => {
  const runtime = useRuntimeContext();
  const [now, setNow] = useState(Date.now());

  // Update time display every 100ms when running
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  // Get timer data from memory if we have a timer entry
  const timerRef = useMemo(() => {
    if (!timerEntry?.ownerId) return undefined;

    const refs = runtime.memory.search({
      id: null,
      ownerId: timerEntry.ownerId,
      type: RUNTIME_SPAN_TYPE,
      visibility: null,
    });

    return refs[0] as TypedMemoryReference<RuntimeSpan> | undefined;
  }, [runtime, timerEntry?.ownerId]);

  const timerSpan = useMemorySubscription(timerRef);
  const spans = timerSpan?.spans || [];

  // Calculate elapsed time
  const elapsed = useMemo(() => {
    if (spans.length === 0) return 0;

    return spans.reduce((total, span) => {
      const end = span.ended || now;
      return total + Math.max(0, end - span.started);
    }, 0);
  }, [spans, now]);

  // Determine if timer is running
  const isRunning = useMemo(() => {
    if (externalIsRunning !== undefined) return externalIsRunning;
    if (timerSpan && typeof timerSpan.isActive === 'function') {
      return timerSpan.isActive();
    }
    if (spans.length === 0) return false;
    const lastSpan = spans[spans.length - 1];
    return lastSpan && !lastSpan.ended;
  }, [spans, externalIsRunning, timerSpan]);

  // Calculate display time based on format
  const displayTime = useMemo(() => {
    if (!timerEntry) return 0;

    if (timerEntry.format === 'down' && timerEntry.durationMs) {
      return Math.max(0, timerEntry.durationMs - elapsed);
    }
    return elapsed;
  }, [timerEntry, elapsed]);

  // Calculate progress for countdown
  const progress = useMemo(() => {
    if (timerEntry?.format === 'down' && timerEntry.durationMs) {
      return Math.min((elapsed / timerEntry.durationMs) * 100, 100);
    }
    return 0;
  }, [timerEntry, elapsed]);

  // Format time for display
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(Math.abs(ms) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((Math.abs(ms) % 1000) / 10);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  // No timer entry - show placeholder
  if (!timerEntry) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Clock size={48} className="text-muted-foreground" />
            </div>
            <div className="text-4xl font-mono font-bold text-muted-foreground mb-2">
              --:--
            </div>
            <p className="text-sm text-muted-foreground">
              No active timer
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={24} className="text-primary" />
            <h3 className="text-xl font-semibold">
              {timerEntry.label || 'Timer'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isRunning ? 'default' : 'secondary'}>
              {isRunning ? 'Running' : 'Stopped'}
            </Badge>
            {displayState.currentRound !== undefined && (
              <Badge variant="outline">
                Round {displayState.currentRound}
                {displayState.totalRounds !== undefined && `/${displayState.totalRounds}`}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Time Display */}
        <div className="text-center">
          <div className={cn(
            'text-6xl md:text-7xl font-mono font-bold transition-colors',
            isRunning ? 'text-primary' : 'text-foreground'
          )}>
            {formatTime(displayTime)}
          </div>

          {/* Progress bar for countdown */}
          {timerEntry.format === 'down' && timerEntry.durationMs && (
            <div className="mt-4">
              <Progress
                value={progress}
                className={cn(
                  'h-2',
                  progress >= 90 ? '[&>div]:bg-red-500' :
                    progress >= 70 ? '[&>div]:bg-yellow-500' : ''
                )}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0:00</span>
                <span>{Math.round(progress)}%</span>
                <span>{formatTime(timerEntry.durationMs)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Timer Buttons */}
        {timerEntry.buttons && timerEntry.buttons.length > 0 && (
          <div className="flex justify-center gap-2 pt-2 border-t">
            {timerEntry.buttons.map((button) => (
              <Button
                key={button.id}
                variant={button.variant === 'primary' ? 'default' : button.variant as any || 'outline'}
                size="sm"
                onClick={() => onButtonClick?.(button.eventName, button.payload)}
              >
                {button.label}
              </Button>
            ))}
          </div>
        )}

        {/* Default Controls (if no buttons specified and handlers provided) */}
        {(!timerEntry.buttons || timerEntry.buttons.length === 0) && (onPlay || onPause || onReset) && (
          <div className="flex justify-center gap-3 pt-2 border-t">
            {isRunning ? (
              <Button onClick={onPause} variant="secondary" size="sm">
                <Pause size={16} className="mr-2" />
                Pause
              </Button>
            ) : (
              <Button onClick={onPlay} size="sm">
                <Play size={16} className="mr-2" />
                {elapsed > 0 ? 'Resume' : 'Start'}
              </Button>
            )}
            <Button onClick={onReset} variant="outline" size="sm">
              <Square size={16} className="mr-2" />
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Card Section - Renders the current display card.
 */
interface CardSectionProps {
  cardEntry?: IDisplayCardEntry;
  onButtonClick?: (eventName: string, payload?: Record<string, unknown>) => void;
}

const CardSection: React.FC<CardSectionProps> = ({
  cardEntry,
  onButtonClick,
}) => {
  if (!cardEntry) {
    return null;
  }

  // Find the registered component for this card type
  const Component = CardComponentRegistry.resolve(cardEntry) || FallbackCard;

  return (
    <Component
      entry={cardEntry}
      onButtonClick={onButtonClick}
    />
  );
};

/**
 * Stack Debug View - Shows the internal state of the stacks.
 */
interface StackDebugViewProps {
  timerStack: ITimerDisplayEntry[];
  cardStack: IDisplayCardEntry[];
  workoutState: string;
}

const StackDebugView: React.FC<StackDebugViewProps> = ({
  timerStack,
  cardStack,
  workoutState,
}) => {
  return (
    <Card className="w-full border-dashed">
      <CardHeader className="py-2">
        <h4 className="text-sm font-semibold text-muted-foreground">
          Debug: Display Stacks
        </h4>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <Badge variant="outline" className="mb-1">Workout State</Badge>
          <div className="font-mono bg-muted p-1 rounded">{workoutState}</div>
        </div>

        <div>
          <Badge variant="outline" className="mb-1">Timer Stack ({timerStack.length})</Badge>
          <div className="font-mono bg-muted p-1 rounded max-h-24 overflow-auto">
            {timerStack.length === 0 ? (
              <span className="text-muted-foreground">Empty</span>
            ) : (
              timerStack.map((t, i) => (
                <div key={t.id} className={i === timerStack.length - 1 ? 'text-primary font-bold' : ''}>
                  [{i}] {t.label || t.id} ({t.format})
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <Badge variant="outline" className="mb-1">Card Stack ({cardStack.length})</Badge>
          <div className="font-mono bg-muted p-1 rounded max-h-24 overflow-auto">
            {cardStack.length === 0 ? (
              <span className="text-muted-foreground">Empty</span>
            ) : (
              cardStack.map((c, i) => (
                <div key={c.id} className={i === cardStack.length - 1 ? 'text-primary font-bold' : ''}>
                  [{i}] {c.title || c.id} ({c.type})
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
