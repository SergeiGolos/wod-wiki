import React from 'react';
import { TimerIndexPanel } from '../layout/TimerIndexPanel';
import { TimerDisplay } from '../workout/TimerDisplay';
import { ScriptRuntimeProvider } from '../../runtime/context/RuntimeContext';
import { VisualStatePanel } from '../track/VisualStatePanel';
import { IScriptRuntime } from '../../runtime/contracts/IScriptRuntime';
import { UseRuntimeExecutionReturn } from '../../runtime-test-bench/hooks/useRuntimeExecution';
import { usePanelSize } from '../layout/panel-system/PanelSizeContext';
import { cn } from '@/lib/utils';
import { WorkoutPreviewPanel } from './WorkoutPreviewPanel';
import type { SectionType } from '../../markdown-editor/types/section';
import type { WodBlock } from '../../markdown-editor/types';

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
  /** Raw markdown content for the preview panel */
  content?: string;
  /** Called when user clicks Run on a WOD block in the preview */
  onStartWorkout?: (block: WodBlock) => void;
  /**
   * Optional section-type filter for the preview panel.
   * Defaults to `['wod']` to show only runnable blocks.
   */
  previewFilter?: SectionType[];
  /** Callback to update parsed blocks */
  setBlocks?: (blocks: any[]) => void;
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
  // activeSegmentIds, // Unused
  // activeStatementIds, // Unused
  // hoveredBlockKey, // Unused
  content,
  onStartWorkout,
  setBlocks,
  previewFilter = ['wod'],
}) => {
  const { isCompact } = usePanelSize();

  // No runtime -> Show preview panel for block selection
  // If selectedBlock is present, show timer (legacy behavior?)
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


  const screenContent = runtime ? (
    <ScriptRuntimeProvider runtime={runtime}>
      <div className="flex h-full overflow-hidden">
        {/* Left Column: Visual State */}
        {!isCompact && (
          <div className="flex-1 min-w-0 bg-secondary/10 border-r border-border">
            <VisualStatePanel />
          </div>
        )}

        {/* Right Column: Timer & Controls */}
        <div className={cn(
          "flex flex-col bg-background transition-all duration-300",
          isCompact ? "w-full" : "w-1/2"
        )}>
          <div className="flex-1 flex flex-col justify-center">
            {timerDisplay}
          </div>
        </div>
      </div>
    </ScriptRuntimeProvider>
  ) : (
    // No runtime — show workout preview panel for block selection
    // If selectedBlock is present, show timer (legacy behavior? or maybe just for transition)
    selectedBlock ? timerDisplay : (
      <div className="flex h-full overflow-hidden">
        {/* Left Column: Placeholder / Visual State equivalent */}
        {!isCompact && (
          <div className="flex-1 min-w-0 bg-secondary/10 border-r border-border flex items-center justify-center text-muted-foreground">
            <div className="text-center p-6 disabled-state-panel">
              <h3 className="text-lg font-semibold mb-2">Select a Session</h3>
              <p className="text-sm opacity-80">Choose a workout block to begin.</p>
            </div>
          </div>
        )}

        {/* Right Column: Workout Preview */}
        <div className={cn(
          "flex flex-col bg-background transition-all duration-300 overflow-hidden",
          isCompact ? "w-full" : "w-1/2"
        )}>
          <WorkoutPreviewPanel
            content={content || ''}
            filter={previewFilter}
            onStartWorkout={onStartWorkout}
            onBlocksChange={setBlocks}
          />
        </div>
      </div>
    )
  );

  return screenContent;
};
