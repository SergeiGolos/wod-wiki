/**
 * RuntimeDebugPanel - Slide-out debug panel for runtime inspection
 * 
 * Key Features:
 * - Slide-out panel from the right side
 * - Shows RuntimeStack and Memory panels
 * - Only visible when debug mode is enabled
 * - Accessible via debug button next to track button
 * - Can be toggled on/off independently of view mode
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Bug } from 'lucide-react';
import { RuntimeStackPanel } from '../../runtime-test-bench/components/RuntimeStackPanel';
import { MemoryPanel } from '../../runtime-test-bench/components/MemoryPanel';
import { RuntimeAdapter } from '../../runtime-test-bench/adapters/RuntimeAdapter';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';

export interface RuntimeDebugPanelProps {
  /** Active runtime to inspect */
  runtime: ScriptRuntime | null;
  
  /** Whether debug panel is visible */
  isOpen: boolean;
  
  /** Callback to close the panel */
  onClose: () => void;
  
  /** Highlighted block key (optional) */
  highlightedBlockKey?: string;
  
  /** Whether to render embedded (no slide-out, no backdrop) */
  embedded?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * RuntimeDebugPanel Component
 */
export const RuntimeDebugPanel: React.FC<RuntimeDebugPanelProps> = ({
  runtime,
  isOpen,
  onClose,
  highlightedBlockKey,
  embedded = false,
  className = ''
}) => {
  const adapter = React.useRef(new RuntimeAdapter()).current;
  
  // Version counter to force snapshot recalculation on memory changes
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  
  // Subscribe to memory changes for live updates
  useEffect(() => {
    if (!runtime) return;
    
    // Subscribe to memory changes
    const unsubscribe = runtime.memory.subscribe(() => {
      // Increment version to trigger snapshot recalculation
      setSnapshotVersion(v => v + 1);
    });
    
    // Also set up a periodic refresh for stack changes (stack doesn't emit events)
    const intervalId = setInterval(() => {
      setSnapshotVersion(v => v + 1);
    }, 100); // 10 FPS refresh for stack state
    
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [runtime]);

  // Create snapshot for UI rendering - recalculates when snapshotVersion changes
  const snapshot = React.useMemo(() => {
    if (!runtime) return null;
    return adapter.createSnapshot(runtime);
  }, [runtime, adapter, snapshotVersion]);

  // Embedded mode - render inline without slide-out behavior
  if (embedded) {
    return (
      <div className={`h-full flex flex-col bg-background ${className}`}>
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/30 shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h3 className="font-semibold text-sm">Runtime Debugger</h3>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!runtime ? (
            <div className="p-6 text-center text-muted-foreground">
              <p className="text-sm">No active runtime</p>
              <p className="text-xs mt-2">Start a workout to enable debugging</p>
            </div>
          ) : (
            <>
              <RuntimeStackPanel 
                blocks={snapshot?.stack.blocks || []} 
                activeBlockIndex={snapshot?.stack.activeIndex}
                highlightedBlockKey={highlightedBlockKey}
                className="border-b border-border"
              />
              <MemoryPanel 
                entries={snapshot?.memory.entries || []}
                groupBy="owner"
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border bg-muted/10 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center justify-between">
            <span>Stack: {snapshot?.stack.blocks.length || 0}</span>
            <span>Memory: {snapshot?.memory.entries.length || 0}</span>
          </div>
        </div>
      </div>
    );
  }

  // Slide-out mode (original behavior)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Slide-out Panel */}
      <div
        className={`
          fixed right-0 top-0 bottom-0 w-[480px] bg-background border-l border-border z-50
          shadow-2xl flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          ${className}
        `}
      >
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="font-semibold text-sm">Runtime Debugger</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!runtime ? (
            <div className="p-6 text-center text-muted-foreground">
              <p className="text-sm">No active runtime</p>
              <p className="text-xs mt-2">Start a workout to enable debugging</p>
            </div>
          ) : (
            <>
              {/* Runtime Stack */}
              <RuntimeStackPanel 
                blocks={snapshot?.stack.blocks || []} 
                activeBlockIndex={snapshot?.stack.activeIndex}
                highlightedBlockKey={highlightedBlockKey}
                className="border-b border-border"
              />

              {/* Memory Panel */}
              <MemoryPanel 
                entries={snapshot?.memory.entries || []}
                groupBy="owner"
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border bg-muted/10 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center justify-between">
            <span>Stack Depth: {snapshot?.stack.blocks.length || 0}</span>
            <span>Memory Entries: {snapshot?.memory.entries.length || 0}</span>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Debug Button Component
 * Standalone button to toggle debug panel
 */
export interface DebugButtonProps {
  isDebugMode: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const DebugButton: React.FC<DebugButtonProps> = ({
  isDebugMode,
  onClick,
  disabled = false
}) => {
  return (
    <Button
      variant={isDebugMode ? "default" : "ghost"}
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-9 relative"
      title={isDebugMode ? "Close debugger" : "Open debugger"}
    >
      <Bug className="h-[1.2rem] w-[1.2rem]" />
      {isDebugMode && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      )}
      <span className="sr-only">Toggle debugger</span>
    </Button>
  );
};
