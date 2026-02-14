import React from 'react';
import { TimerIndexPanel } from '../layout/TimerIndexPanel';
import { TimerDisplay } from '../workout/TimerDisplay';
import { ScriptRuntimeProvider } from '../../runtime/context/RuntimeContext';
import { VisualStatePanel } from '../track/VisualStatePanel';
import { IScriptRuntime } from '../../runtime/contracts/IScriptRuntime';
import { UseRuntimeExecutionReturn } from '../../runtime-test-bench/hooks/useRuntimeExecution';
import { usePanelSize } from '../layout/panel-system/PanelSizeContext';
import { cn } from '@/lib/utils';

export interface TrackPanelProps {
  runtime: IScriptRuntime | null;
  execution: UseRuntimeExecutionReturn;
  selectedBlock: any | null;
  activeSegmentIds: Set<number>;
  activeStatementIds: Set<number>;
  hoveredBlockKey: string | null;
  documentItems: any[];
  activeBlockId: string | undefined;
  onBlockHover: (blockKey: string | null) => void;
  onBlockClick: (blockKey: string) => void;
  onSelectBlock: (blockId: string | null) => void;
  onSetActiveBlockId: (blockId: string | null) => void;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
}

export const SessionHistory: React.FC<Pick<TrackPanelProps, 'runtime' | 'activeSegmentIds' | 'activeStatementIds' | 'hoveredBlockKey' | 'execution'>> = ({
  runtime,
  activeSegmentIds,
  activeStatementIds,
  hoveredBlockKey,
  execution
}) => {
  return (
    <TimerIndexPanel
      runtime={runtime as any}
      activeSegmentIds={activeSegmentIds}
      activeStatementIds={activeStatementIds}
      highlightedBlockKey={hoveredBlockKey}
      autoScroll={execution.status === 'running'}
      workoutStartTime={execution.startTime}
      className="h-full"
    />
  );
};

export const TimerScreen: React.FC<TrackPanelProps> = ({
  runtime,
  execution,
  selectedBlock,
  onBlockHover,
  onBlockClick,
  onStart,
  onPause,
  onStop,
  onNext,
  activeSegmentIds,
  activeStatementIds,
  hoveredBlockKey
}) => {
  const { isCompact } = usePanelSize();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const lastScrollTopRef = React.useRef(0);
  const [isUserScrolledUp, setIsUserScrolledUp] = React.useState(false);

  const handleScroll = React.useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    const isScrollingUp = scrollTop < lastScrollTopRef.current;

    lastScrollTopRef.current = scrollTop;

    if (isAtBottom) {
      // We are at the bottom, re-enable auto-scroll
      setIsUserScrolledUp(false);
    } else if (isScrollingUp) {
      // We are NOT at bottom AND scrolling up -> user action
      setIsUserScrolledUp(true);
    }
    // If scrolling down but not at bottom yet (e.g. smooth scroll in progress),
    // leave state as is.
  }, []);

  const timerDisplay = (
    <TimerDisplay
      elapsedMs={execution.elapsedTime}
      hasActiveBlock={!!selectedBlock}
      onStart={onStart}
      onPause={onPause}
      onStop={onStop}
      onNext={onNext}
      isRunning={execution.status === 'running'}
      compact={isCompact}
      onBlockHover={onBlockHover}
      onBlockClick={onBlockClick}
      enableDisplayStack={!!runtime}
    />
  );


  const content = runtime ? (
    <ScriptRuntimeProvider runtime={runtime}>
      <div className="flex h-full overflow-hidden">
        {/* Left Column: Timer & Controls (flex-1 or fixed width?) */}
        {/* Let's make TimerDisplay the main focus on the left, maybe 40-50% width? */}
        <div className={cn(
          "flex flex-col border-r border-border bg-background transition-all duration-300",
          isCompact ? "w-full" : "w-1/2"
        )}>
          <div className="flex-1 flex flex-col justify-center">
            {timerDisplay}
          </div>
        </div>

        {/* Right Column: Visual State */}
        {!isCompact && (
          <div className="flex-1 min-w-0 bg-secondary/10">
            <VisualStatePanel />
          </div>
        )}
      </div>
    </ScriptRuntimeProvider>
  ) : (
    // ... (selection state remains same)
    selectedBlock ? timerDisplay : (
      <div className="h-full w-full bg-background flex items-center justify-center text-muted-foreground italic">
        Redirecting to Plan...
      </div>
    )
  );

  return content;
};
