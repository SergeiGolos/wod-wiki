import React, { useCallback } from 'react';
import { CommandProvider } from '@/components/command-palette/CommandContext';
import { WorkbenchProvider, useWorkbench } from '@/components/layout/WorkbenchContext';
import { RuntimeLifecycleProvider } from '@/components/layout/RuntimeLifecycleProvider';
import { WorkbenchSyncBridge } from '@/components/layout/WorkbenchSyncBridge';
import { useWorkbenchSync } from '@/components/layout/useWorkbenchSync';
import { DebugButton } from '@/components/layout/DebugModeContext';
import { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
import { globalCompiler } from '@/runtime-test-bench/services/testbench-services';

import { PlanPanel } from '@/components/workbench/PlanPanel';
import { TimerScreen } from '@/components/workbench/TrackPanel';
import { ReviewGrid } from '@/components/review-grid';
import { WorkbenchProps } from '@/components/layout/Workbench';

const runtimeFactory = new RuntimeFactory(globalCompiler);

const StorybookWorkbenchContent: React.FC<WorkbenchProps> = ({
  initialContent,
}) => {
  const {
    content,
    sections,
    activeBlockId,
    setBlocks,
    setActiveBlockId,
    selectBlock,
    setContent,
    provider,
  } = useWorkbench();

  const {
    runtime,
    execution,
    activeSegmentIds,
    activeStatementIds,
    hoveredBlockKey,
    setHoveredBlockKey,
    selectedBlock,
    documentItems,
    analyticsData,
    analyticsSegments,
    analyticsGroups,
    selectedAnalyticsIds,
    toggleAnalyticsSegment,
    handleStart,
    handlePause,
    handleStop,
    handleNext,
    handleStartWorkoutAction,
  } = useWorkbenchSync();

  const handleBlockHover = useCallback((blockKey: string | null) => {
    setHoveredBlockKey(blockKey);
  }, [setHoveredBlockKey]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Simplified Header with Debug Toggle only */}
      <div className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
        <div className="font-bold tracking-widest text-sm">STORYBOOK WORKBENCH</div>
        <div className="flex gap-2 items-center">
          <DebugButton />
        </div>
      </div>

      {/* Scrollable Container with all three views shown at once */}
      <div className="flex-1 overflow-y-auto p-6 space-y-12 bg-muted/20">
        
        {/* Plan View */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold px-1">Plan</h2>
          <div className="border border-border rounded-xl bg-background shadow-sm overflow-hidden h-[600px]">
            <PlanPanel
              initialContent={initialContent}
              value={content}
              sections={sections}
              onStartWorkout={handleStartWorkoutAction}
              setActiveBlockId={setActiveBlockId}
              setBlocks={setBlocks}
              setContent={setContent}
              provider={provider}
            />
          </div>
        </section>

        {/* Track View */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold px-1">Track</h2>
          <div className="border border-border rounded-xl bg-background shadow-sm overflow-hidden h-[700px]">
            <TimerScreen
              runtime={runtime}
              execution={execution}
              selectedBlock={selectedBlock}
              documentItems={documentItems}
              activeBlockId={activeBlockId || undefined}
              onBlockHover={handleBlockHover}
              onBlockClick={() => {}}
              onSelectBlock={selectBlock}
              onSetActiveBlockId={setActiveBlockId}
              onStart={handleStart}
              onPause={handlePause}
              onStop={handleStop}
              onNext={handleNext}
              activeSegmentIds={activeSegmentIds}
              activeStatementIds={activeStatementIds}
              hoveredBlockKey={hoveredBlockKey}
              content={content}
              onStartWorkout={handleStartWorkoutAction}
              setBlocks={setBlocks}
            />
          </div>
        </section>

        {/* Review View */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold px-1">Review</h2>
          <div className="border border-border rounded-xl bg-background shadow-sm overflow-hidden h-[500px]">
            <ReviewGrid
              runtime={runtime}
              segments={analyticsSegments}
              selectedSegmentIds={selectedAnalyticsIds}
              onSelectSegment={toggleAnalyticsSegment}
              groups={analyticsGroups}
              rawData={analyticsData}
              hoveredBlockKey={hoveredBlockKey}
              onHoverBlockKey={setHoveredBlockKey}
            />
          </div>
        </section>

      </div>
    </div>
  );
};

export const StorybookWorkbench: React.FC<WorkbenchProps> = (props) => {
  return (
    <CommandProvider>
      <WorkbenchProvider
        initialContent={props.initialContent}
        initialActiveEntryId={props.initialActiveEntryId}
        initialViewMode={props.initialViewMode}
        mode={props.mode}
        provider={props.provider}
      >
        <RuntimeLifecycleProvider factory={runtimeFactory}>
          <WorkbenchSyncBridge>
            <StorybookWorkbenchContent {...props} />
          </WorkbenchSyncBridge>
        </RuntimeLifecycleProvider>
      </WorkbenchProvider>
    </CommandProvider>
  );
};
