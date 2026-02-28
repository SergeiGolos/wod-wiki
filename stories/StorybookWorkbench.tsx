import React, { useCallback, useState } from 'react';
import { CommandProvider } from '@/components/command-palette/CommandContext';
import { WorkbenchProvider, useWorkbench } from '@/components/layout/WorkbenchContext';
import { RuntimeLifecycleProvider } from '@/components/layout/RuntimeLifecycleProvider';
import { WorkbenchSyncBridge } from '@/components/layout/WorkbenchSyncBridge';
import { useWorkbenchSync } from '@/components/layout/useWorkbenchSync';
import { DebugButton, useDebugMode } from '@/components/layout/DebugModeContext';
import { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
import { globalCompiler } from '@/runtime-test-bench/services/testbench-services';
import { FileText, Activity, BarChart3, Download, RotateCcw, Edit, Timer, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { PlanPanel } from '@/components/workbench/PlanPanel';
import { TimerScreen } from '@/components/workbench/TrackPanel';
import { ReviewGrid } from '@/components/review-grid';
import { WorkbenchProps } from '@/components/layout/Workbench';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';

const runtimeFactory = new RuntimeFactory(globalCompiler);

interface StorybookWorkbenchProps extends WorkbenchProps {
  initialShowPlan?: boolean;
  initialShowTrack?: boolean;
  initialShowReview?: boolean;
}

const StorybookWorkbenchContent: React.FC<StorybookWorkbenchProps> = ({
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
    viewMode,
    setViewMode,
  } = useWorkbench();

  const { isDebugMode } = useDebugMode();
  const resetStore = useWorkbenchSyncStore(s => s.resetStore);

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

  const handleReset = useCallback(() => {
    resetStore();
    // Also reset execution if it's currently active/completed
    if (execution.status !== 'idle') {
      execution.reset();
    }
  }, [resetStore, execution]);

  const handleExport = useCallback(() => {
    // ... same as before
    // Collect serializable runtime state
    const exportState = {
      timestamp: new Date().toISOString(),
      content,
      documentItems,
      selectedBlockId: activeBlockId,
      execution: {
        status: execution.status,
        elapsedTime: execution.elapsedTime,
        stepCount: execution.stepCount,
        startTime: execution.startTime,
      },
      analytics: {
        data: analyticsData,
        segments: analyticsSegments,
        groups: analyticsGroups,
      },
      // If runtime exists, export more detailed info
      outputs: runtime ? runtime.getOutputStatements() : [],
    };

    // Serialize with handling for Set/Map/circular types
    const blob = new Blob([
      JSON.stringify(exportState, (key, value) => {
        if (value instanceof Set) return Array.from(value);
        if (value instanceof Map) return Object.fromEntries(value);
        // Handle potentially large or circular objects (like runtime itself)
        if (key === 'runtime') return undefined; 
        return value;
      }, 2)
    ], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runtime-state-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [
    content,
    documentItems,
    activeBlockId,
    execution,
    analyticsData,
    analyticsSegments,
    analyticsGroups,
    runtime
  ]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header with Panel Toggles and Debug */}
      <div className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
        <div className="font-bold tracking-widest text-sm">STORYBOOK WORKBENCH</div>
        <div className="flex gap-2 items-center">
          <div className="flex bg-muted p-1 rounded-lg mr-2">
            <Button
              variant={viewMode === "plan" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={() => setViewMode("plan")}
              title="Plan View"
            >
              <Edit className="h-4 w-4" />
              Plan
            </Button>
            <Button
              variant={viewMode === "track" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={() => setViewMode("track")}
              title="Track View"
            >
              <Timer className="h-4 w-4" />
              Track
            </Button>
            <Button
              variant={viewMode === "review" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={() => setViewMode("review")}
              title="Review View"
            >
              <BarChart2 className="h-4 w-4" />
              Review
            </Button>
          </div>
          <div className="h-6 w-px bg-border mx-1" />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleReset}
            title="Reset All Data"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleExport}
            title="Export Runtime State"
          >
            <Download className="h-4 w-4" />
          </Button>
          <DebugButton />
        </div>
      </div>

      {/* Scrollable Container with toggled views */}
      <div className={cn(
        "flex-1 overflow-y-auto p-4 bg-muted/10",
      )}>
        {/* Plan View */}
        {viewMode === 'plan' && (
          <section className="flex flex-col h-full">
            <div className="border border-border rounded-xl bg-background shadow-sm overflow-hidden flex-1 min-h-0">
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
        )}

        {/* Track View */}
        {viewMode === 'track' && (
          <section className="flex flex-col h-full">
            <div className="border border-border rounded-xl bg-background shadow-sm overflow-hidden flex-1 min-h-0">
              <TimerScreen
                runtime={runtime}
                execution={execution}
                selectedBlock={selectedBlock}
                documentItems={documentItems}
                activeBlockId={activeBlockId || undefined}
                onBlockHover={handleBlockHover}
                onBlockClick={() => { }}
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
        )}

        {/* Review View */}
        {viewMode === 'review' && (
          <section className="flex flex-col h-full">
            <div className="border border-border rounded-xl bg-background shadow-sm overflow-hidden flex-1 min-h-0">
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
        )}
      </div>
    </div>
  );
};

export const StorybookWorkbench: React.FC<StorybookWorkbenchProps> = (props) => {
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
