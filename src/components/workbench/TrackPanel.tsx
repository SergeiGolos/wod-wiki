import React from 'react';
import { TimerIndexPanel } from '../layout/TimerIndexPanel';
import { TimerDisplay } from '../workout/TimerDisplay';
import { RuntimeProvider as ClockRuntimeProvider } from '../../runtime/context/RuntimeContext';
import { WodIndexPanel } from '../layout/WodIndexPanel';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { UseRuntimeExecutionReturn } from '../../runtime-test-bench/hooks/useRuntimeExecution';

export interface TrackPanelProps {
  runtime: IScriptRuntime | null;
  execution: UseRuntimeExecutionReturn;
  selectedBlock: any | null;
  activeSegmentIds: Set<number>;
  activeStatementIds: Set<number>;
  hoveredBlockKey: string | null;
  isMobile: boolean;
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

export const TrackPanelIndex: React.FC<Pick<TrackPanelProps, 'runtime' | 'activeSegmentIds' | 'activeStatementIds' | 'hoveredBlockKey' | 'isMobile' | 'execution'>> = ({
  runtime,
  activeSegmentIds,
  activeStatementIds,
  hoveredBlockKey,
  isMobile,
  execution
}) => (
  <TimerIndexPanel
    runtime={runtime as any}
    activeSegmentIds={activeSegmentIds}
    activeStatementIds={activeStatementIds}
    highlightedBlockKey={hoveredBlockKey}
    autoScroll={execution.status === 'running'}
    mobile={isMobile}
    workoutStartTime={execution.startTime}
    className="h-full"
  />
);

export const TrackPanelPrimary: React.FC<TrackPanelProps> = ({
  runtime,
  execution,
  selectedBlock,
  isMobile,
  documentItems,
  activeBlockId,
  onBlockHover,
  onBlockClick,
  onSelectBlock,
  onSetActiveBlockId,
  onStart,
  onPause,
  onStop,
  onNext,
  activeSegmentIds,
  activeStatementIds,
  hoveredBlockKey
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const lastScrollTopRef = React.useRef(0);
  const [isUserScrolledUp, setIsUserScrolledUp] = React.useState(false);

  const handleScroll = () => {
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
  };

  const timerDisplay = (
    <TimerDisplay
      elapsedMs={execution.elapsedTime}
      hasActiveBlock={!!selectedBlock}
      onStart={onStart}
      onPause={onPause}
      onStop={onStop}
      onNext={onNext}
      isRunning={execution.status === 'running'}
      compact={isMobile}
      onBlockHover={onBlockHover}
      onBlockClick={onBlockClick}
      enableDisplayStack={!!runtime}
    />
  );

  const content = runtime ? (
    <ClockRuntimeProvider runtime={runtime}>
      <div className="flex flex-col h-full overflow-hidden">
        {isMobile && (
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto min-h-0 border-b border-border bg-slate-50/50 dark:bg-slate-900/50"
          >
            <TimerIndexPanel
              runtime={runtime as any}
              activeSegmentIds={activeSegmentIds}
              activeStatementIds={activeStatementIds}
              highlightedBlockKey={hoveredBlockKey}
              autoScroll={execution.status === 'running' && !isUserScrolledUp}
              mobile={isMobile}
              workoutStartTime={execution.startTime}
              className="overflow-visible"
            />
          </div>
        )}
        <div className={isMobile ? "shrink-0 bg-background z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]" : "h-full"}>
          {timerDisplay}
        </div>
      </div>
    </ClockRuntimeProvider>
  ) : (
    selectedBlock ? timerDisplay : (
      <div className="h-full w-full bg-background p-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full border border-border rounded-lg shadow-sm bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-lg">Select a Workout</h3>
            <p className="text-sm text-muted-foreground">Choose a workout to start tracking</p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <WodIndexPanel
              items={documentItems}
              activeBlockId={activeBlockId}
              onBlockClick={(item) => {
                if (item.type === 'wod') {
                  onSelectBlock(item.id);
                } else {
                  onSetActiveBlockId(item.id);
                }
              }}
              onBlockHover={onBlockHover}
              mobile={isMobile}
            />
          </div>
        </div>
      </div>
    )
  );

  return content;
};
