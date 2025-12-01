import React from 'react';
import { TimerIndexPanel } from '../layout/TimerIndexPanel';
import { TimerDisplay } from '../workout/TimerDisplay';
import { RuntimeProvider as ClockRuntimeProvider } from '../../runtime/context/RuntimeContext';
import { WodIndexPanel } from '../layout/WodIndexPanel';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { RuntimeExecutionState } from '../../runtime-test-bench/hooks/useRuntimeExecution';

export interface TrackPanelProps {
  runtime: IScriptRuntime | null;
  execution: RuntimeExecutionState;
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
    runtime={runtime}
    activeSegmentIds={activeSegmentIds}
    activeStatementIds={activeStatementIds}
    highlightedBlockKey={hoveredBlockKey}
    autoScroll={execution.status === 'running'}
    mobile={isMobile}
    workoutStartTime={execution.startTime}
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
  onNext
}) => {
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

  return runtime ? (
    <ClockRuntimeProvider runtime={runtime}>
      {timerDisplay}
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
};
