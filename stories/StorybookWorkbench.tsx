import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CommandProvider, useCommandPalette } from '../src/components/command-palette/CommandContext';
import { WorkbenchProvider, useWorkbench } from '../src/components/layout/WorkbenchContext';
import { RuntimeLifecycleProvider } from '../src/components/layout/RuntimeLifecycleProvider';
import { WorkbenchSyncBridge } from '../src/components/layout/WorkbenchSyncBridge';
import { DisplaySyncBridge } from '../src/components/layout/DisplaySyncBridge';
import { WorkbenchCastBridge } from '../src/components/cast/WorkbenchCastBridge';
import { useWorkbenchSync } from '../src/components/layout/useWorkbenchSync';
import { DebugButton, useDebugMode } from '../src/components/layout/DebugModeContext';
import { CastButtonRpc } from '../src/components/cast/CastButtonRpc';
import { RuntimeFactory } from '../src/runtime/compiler/RuntimeFactory';
import { globalCompiler } from '../src/runtime-test-bench/services/testbench-services';
import { 
  Download, 
  RotateCcw, 
} from 'lucide-react';
import { Button } from '../src/components/ui/button';

import { UnifiedEditor } from '../src/components/Editor/UnifiedEditor';
import { WorkbenchProps } from '../src/components/layout/Workbench';
import { useWorkbenchSyncStore } from '../src/components/layout/workbenchSyncStore';
import { useInMemoryNavigation } from '../src/hooks/useInMemoryNavigation';

const runtimeFactory = new RuntimeFactory(globalCompiler);

// --- ?z support (same as before) ---
function extractAndStripZ(): string | null {
  let params = new URLSearchParams(window.location.search);
  if (!params.has('z')) {
    try {
      const parentParams = new URLSearchParams(window.parent.location.search);
      if (parentParams.has('z')) params = parentParams;
    } catch { }
  }
  return params.get('z');
}

let _rawZ: string | null = extractAndStripZ();

async function decodeZParam(z: string): Promise<string> {
  const binary = atob(z.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  try {
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
    return new TextDecoder().decode(bytes);
  }
}

function useZParamContent(): { content: string | undefined; ready: boolean } {
  const [content, setContent] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(!_rawZ);
  useEffect(() => {
    const z = _rawZ;
    _rawZ = null;
    if (!z) return;
    decodeZParam(z).then(decoded => setContent(decoded)).finally(() => setReady(true));
  }, []);
  return { content, ready };
}

interface StorybookWorkbenchProps extends WorkbenchProps {
  initialContent?: string;
}

const StorybookWorkbenchContent: React.FC<StorybookWorkbenchProps> = ({
  initialContent,
}) => {
  const {
    content,
    setContent,
    selectBlock,
    setActiveBlockId,
    resetResults,
  } = useWorkbench();

  const resetStore = useWorkbenchSyncStore(s => s.resetStore);
  const { handleStartWorkoutAction, execution } = useWorkbenchSync();

  const handleReset = useCallback(() => {
    resetStore();
    if (execution.status !== 'idle') execution.reset();
    selectBlock(null);
    setActiveBlockId(null);
    resetResults();
    window.location.reload();
  }, [resetStore, execution, selectBlock, setActiveBlockId, resetResults]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Minimal toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0">
        <span className="text-sm font-semibold text-foreground">WOD Wiki</span>
        <div className="flex items-center gap-2">
          <CastButtonRpc />
          <DebugButton />
          <Button variant="ghost" size="icon" title="Download" onClick={handleDownload}>
            <Download className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Reset" onClick={handleReset}>
            <RotateCcw className="size-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Editor fills remaining height */}
      <div className="flex-1 min-h-0">
        <UnifiedEditor
          value={content}
          onChange={setContent}
          onStartWorkout={handleStartWorkoutAction}
          className="h-full w-full"
          theme="vs-dark"
        />
      </div>
    </div>
  );
};

export const StorybookWorkbench: React.FC<StorybookWorkbenchProps> = (props) => {
  const { content: zContent, ready } = useZParamContent();
  const navigation = useInMemoryNavigation({
    view: props.initialViewMode || 'plan',
    noteId: props.initialActiveEntryId || 'static',
  });

  if (!ready) return null;

  const effectiveContent = zContent ?? props.initialContent ?? '';

  return (
      <CommandProvider>
        <WorkbenchProvider
          initialContent={effectiveContent}
          mode="static"
          navigation={navigation}
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
