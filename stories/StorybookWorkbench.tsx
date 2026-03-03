import React, { useCallback, useEffect, useState } from 'react';
import { CommandProvider } from '@/components/command-palette/CommandContext';

// ---------------------------------------------------------------------------
// ?z=<base64encodedzip> support
// The `z` URL param carries content that has been gzip-compressed and then
// base64-encoded. Falls back to treating the param as plain base64 (no
// compression) if decompression fails, so both workflows are supported.
//
// IMPORTANT: We extract AND strip the `z` param synchronously at module-load
// time, before any React rendering or Storybook router code has a chance to
// snapshot the URL. This prevents the param from leaking into subsequent
// navigation events.
// ---------------------------------------------------------------------------

/**
 * Synchronously reads the `z` query param from the current window or its
 * parent (for the Storybook UI iframe case), strips it from both URLs via
 * `history.replaceState`, and returns the raw value (or null if absent).
 *
 * Called once at module initialisation — intentionally top-level.
 */
function extractAndStripZ(): string | null {
  // Determine which window holds the param and grab it
  let targetWindow: Window = window;
  let params = new URLSearchParams(window.location.search);

  if (!params.has('z')) {
    try {
      const parentParams = new URLSearchParams(window.parent.location.search);
      if (parentParams.has('z')) {
        targetWindow = window.parent;
        params = parentParams;
      }
    } catch { /* cross-origin parent — inaccessible */ }
  }

  const z = params.get('z');
  if (!z) return null;

  // Strip immediately — synchronously, before React mounts or the router runs.
  params.delete('z');
  const newSearch = params.toString();
  const newUrl = targetWindow.location.pathname
    + (newSearch ? '?' + newSearch : '')
    + targetWindow.location.hash;
  try {
    targetWindow.history.replaceState(null, '', newUrl);
  } catch { /* cross-origin parent — can't rewrite, not critical */ }

  return z;
}

// Captured once when this module is first imported.
// `let` so we can null it out after first consumption — prevents remounts
// (e.g. navigating away and back to the Playground story) from re-applying
// the same content again.
let _rawZ: string | null = extractAndStripZ();

async function decodeZParam(z: string): Promise<string> {
  // base64 → binary bytes (handle URL-safe base64)
  const binary = atob(z.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));

  try {
    // Attempt gzip decompression (native browser API, no extra deps)
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    writer.write(bytes);
    writer.close();

    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLen = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.length; }
    return new TextDecoder().decode(merged);
  } catch {
    // Fallback: treat bytes as raw UTF-8 (plain base64, no compression)
    return new TextDecoder().decode(bytes);
  }
}

/**
 * Decodes the pre-captured `z` value (extracted synchronously at module load)
 * and returns `{ content, ready }`. When no `z` param was present, `ready`
 * is true immediately with no flash.
 */
function useZParamContent(): { content: string | undefined; ready: boolean } {
  const [content, setContent] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(!_rawZ); // instantly ready when no z param

  useEffect(() => {
    // Consume and clear _rawZ so that if this component unmounts and remounts
    // (e.g. the user browses to another story and back) it won't re-apply the
    // same encoded content — the next mount sees _rawZ=null and renders clean.
    const z = _rawZ;
    _rawZ = null;
    if (!z) return;

    decodeZParam(z)
      .then(decoded => setContent(decoded))
      .catch(err => console.warn('[Playground] Failed to decode ?z= param:', err))
      .finally(() => setReady(true));
  }, []); // runs once per mount; _rawZ is module-level and consumed immediately

  return { content, ready };
}
import { WorkbenchProvider, useWorkbench } from '@/components/layout/WorkbenchContext';
import { RuntimeLifecycleProvider } from '@/components/layout/RuntimeLifecycleProvider';
import { WorkbenchSyncBridge } from '@/components/layout/WorkbenchSyncBridge';
import { DisplaySyncBridge } from '@/components/layout/DisplaySyncBridge';
import { WorkbenchCastBridge } from '@/components/cast/WorkbenchCastBridge';
import { useWorkbenchSync } from '@/components/layout/useWorkbenchSync';
import { DebugButton, useDebugMode } from '@/components/layout/DebugModeContext';
import { CastButtonRpc } from '@/components/cast/CastButtonRpc';
import { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
import { globalCompiler } from '@/runtime-test-bench/services/testbench-services';
import { FileText, Activity, BarChart3, Download, RotateCcw, Edit, Timer, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { PlanPanel } from '@/components/workbench/PlanPanel';
import { TimerScreen } from '@/components/workbench/TrackPanel';
import { PanelSizeProvider } from '@/components/layout/panel-system/PanelSizeContext';
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
    resetResults,
    currentEntry,
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
    selectBlock(null);
    setActiveBlockId(null);
    resetResults();
    setViewMode('plan');
  }, [resetStore, execution, selectBlock, setActiveBlockId, setViewMode, resetResults]);

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
    analyticsSegments,
    analyticsGroups,
    runtime
  ]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header with Panel Toggles and Debug */}
      <div className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
        <div className="font-bold tracking-widest text-sm hidden sm:block">STORYBOOK WORKBENCH</div>
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
              <span className="hidden sm:inline">Plan</span>
            </Button>
            <Button
              variant={viewMode === "track" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={() => setViewMode("track")}
              title="Track View"
            >
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Track</span>
            </Button>
            <Button
              variant={viewMode === "review" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={() => setViewMode("review")}
              title="Review View"
            >
              <BarChart2 className="h-4 w-4" />
              <span className="hidden sm:inline">Review</span>
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
            <span className="hidden sm:inline">Reset</span>
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
          <CastButtonRpc />
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
                sourceNoteId={currentEntry?.id}
              />
            </div>
          </section>
        )}

        {/* Track View */}
        {viewMode === 'track' && (
          <section className="flex flex-col h-full">
            <div className="border border-border rounded-xl bg-background shadow-sm overflow-hidden flex-1 min-h-0">
              <PanelSizeProvider>
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
              </PanelSizeProvider>
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
  const { content: zContent, ready } = useZParamContent();

  // Hold rendering until we know whether ?z= should override initialContent.
  // When no `z` param is present `ready` is set synchronously, so there is no
  // visible flash.
  if (!ready) return null;

  const effectiveContent = zContent ?? props.initialContent;

  return (
    <CommandProvider>
      <WorkbenchProvider
        initialContent={effectiveContent}
        initialActiveEntryId={props.initialActiveEntryId}
        initialViewMode={props.initialViewMode}
        mode={props.mode}
        provider={props.provider}
      >
        <RuntimeLifecycleProvider factory={runtimeFactory}>
          <WorkbenchSyncBridge>
            <WorkbenchCastBridge />
            <DisplaySyncBridge />
            <StorybookWorkbenchContent {...props} />
          </WorkbenchSyncBridge>
        </RuntimeLifecycleProvider>
      </WorkbenchProvider>
    </CommandProvider>
  );
};
