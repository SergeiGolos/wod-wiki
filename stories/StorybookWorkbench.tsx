import React, { useCallback, useState } from 'react';
import { CommandProvider } from '@/components/command-palette/CommandContext';
import { WorkbenchProvider, useWorkbench } from '@/components/layout/WorkbenchContext';
import { RuntimeLifecycleProvider } from '@/components/layout/RuntimeLifecycleProvider';
import { WorkbenchSyncBridge } from '@/components/layout/WorkbenchSyncBridge';
import { useWorkbenchSync } from '@/components/layout/useWorkbenchSync';
import { DebugButton, useDebugMode } from '@/components/layout/DebugModeContext';
import { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
import { globalCompiler } from '@/runtime-test-bench/services/testbench-services';
import { FileText, Activity, BarChart3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { PlanPanel } from '@/components/workbench/PlanPanel';
import { TimerScreen } from '@/components/workbench/TrackPanel';
import { ReviewGrid } from '@/components/review-grid';
import { WorkbenchProps } from '@/components/layout/Workbench';

const runtimeFactory = new RuntimeFactory(globalCompiler);

interface StorybookWorkbenchProps extends WorkbenchProps {
  initialShowPlan?: boolean;
  initialShowTrack?: boolean;
  initialShowReview?: boolean;
}

const StorybookWorkbenchContent: React.FC<StorybookWorkbenchProps> = ({
  initialContent,
  initialShowPlan = true,
  initialShowTrack = true,
  initialShowReview = true,
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

  const [showPlan, setShowPlan] = useState(initialShowPlan);
  const [showTrack, setShowTrack] = useState(initialShowTrack);
  const [showReview, setShowReview] = useState(initialShowReview);

  const { isDebugMode } = useDebugMode();

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

  const handleExport = useCallback(() => {
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
              variant={showPlan ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowPlan(!showPlan)}
              title="Toggle Plan Panel"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant={showTrack ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowTrack(!showTrack)}
              title="Toggle Track Panel"
            >
              <Activity className="h-4 w-4" />
            </Button>
            <Button
              variant={showReview ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowReview(!showReview)}
              title="Toggle Review Panel"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-6 w-px bg-border mx-1" />
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
        "flex-1 overflow-y-auto p-4 space-y-6 bg-muted/10",
        (!showPlan && !showTrack && !showReview) && "flex items-center justify-center text-muted-foreground italic"
      )}>
        {!showPlan && !showTrack && !showReview && (
          <div>No panels selected. Toggle panels in the header.</div>
        )}

        {/* Plan View */}
        {showPlan && (
          <section className="flex flex-col">
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
        )}

        {/* Track View */}
        {showTrack && (
          <section className="flex flex-col">
            <div className="border border-border rounded-xl bg-background shadow-sm overflow-hidden h-[700px]">
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
        {showReview && (
          <section className="flex flex-col">
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
