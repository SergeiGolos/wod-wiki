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

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Bug } from 'lucide-react';
import { MemoryPanel } from '../../runtime-test-bench/components/MemoryPanel';
import { RuntimeAdapter } from '../../runtime-test-bench/adapters/RuntimeAdapter';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { WorkoutContextPanel } from './WorkoutContextPanel';
import { WodBlock } from '../../markdown-editor/types';
import { MemoryEntry } from '../../runtime-test-bench/types/interfaces';

type DebugTab = 'parser' | 'stack' | 'memory';

const DEBUG_TABS: { id: DebugTab; label: string }[] = [
  { id: 'parser', label: 'Parser' },
  { id: 'stack', label: 'Stack' },
  { id: 'memory', label: 'Memory' },
];

/**
 * Helper to compute memory counts by type
 */
function getMemoryTypeCounts(entries: MemoryEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  entries.forEach(entry => {
    const type = entry.type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  });
  return counts;
}

/**
 * Memory Type Summary - Shows badge counts for each memory type
 */
const MemoryTypeSummary: React.FC<{ entries: MemoryEntry[] }> = ({ entries }) => {
  const typeCounts = useMemo(() => getMemoryTypeCounts(entries), [entries]);
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  
  if (sortedTypes.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {sortedTypes.map(([type, count]) => (
        <Badge 
          key={type} 
          variant="secondary" 
          className="text-[10px] px-1.5 py-0 h-4 font-normal"
        >
          {type}: {count}
        </Badge>
      ))}
    </div>
  );
};

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
  
  /** Active workout block for context panel */
  activeBlock?: WodBlock | null;
  
  /** Active statement IDs for highlighting in context panel */
  activeStatementIds?: Set<number>;
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
  className = '',
  activeBlock,
  activeStatementIds = new Set()
}) => {
  const adapter = React.useRef(new RuntimeAdapter()).current;
  
  // Version counter to force snapshot recalculation on memory changes
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<DebugTab>('parser');
  
  // Track which block's memory should be highlighted (set by double-clicking stack row)
  const [highlightedOwnerKey, setHighlightedOwnerKey] = useState<string | undefined>(undefined);
  
  // Handler for double-clicking a stack row - switch to memory tab and highlight
  const handleStackRowDoubleClick = (blockKey: string) => {
    setHighlightedOwnerKey(blockKey);
    setActiveTab('memory');
  };
  
  // Clear highlight when switching away from memory tab
  const handleTabChange = (tab: DebugTab) => {
    if (tab !== 'memory') {
      setHighlightedOwnerKey(undefined);
    }
    setActiveTab(tab);
  };
  
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

  const renderEmptyState = (title: string, subtitle?: string) => (
    <div className="p-6 text-center text-muted-foreground">
      <p className="text-sm">{title}</p>
      {subtitle && <p className="text-xs mt-2">{subtitle}</p>}
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === 'parser') {
      return (
        <div className="p-3">
          <WorkoutContextPanel
            block={activeBlock || null}
            mode="run"
            activeStatementIds={activeStatementIds}
            className="rounded-lg border border-border"
          />
        </div>
      );
    }

    if (!runtime || !snapshot) {
      const target = activeTab === 'stack' ? 'runtime stack' : 'memory state';
      return renderEmptyState('No active runtime', `Start a workout to inspect the ${target}.`);
    }

    if (activeTab === 'stack') {
      // Reverse blocks to show top of stack first (most recent at top)
      const stackBlocks = [...snapshot.stack.blocks].reverse();
      
      return (
        <div className="flex flex-col h-full">
          {/* Stack Summary Header */}
          <div className="p-2 bg-muted/20 border-b border-border text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground">
                Call Stack ({snapshot.stack.blocks.length} blocks)
              </span>
              <span className="text-muted-foreground">
                Depth: {snapshot.stack.depth}
              </span>
            </div>
          </div>
          
          {/* Flat Stack List - One row per block */}
          <div className="flex-1 overflow-auto">
            {stackBlocks.length === 0 ? (
              <div className="text-center text-muted-foreground py-4 text-xs">
                Stack is empty
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {stackBlocks.map((block, index) => {
                  const isTop = index === 0;
                  const isHighlighted = highlightedBlockKey === block.key;
                  const statusColor = {
                    complete: 'bg-green-500',
                    active: 'bg-blue-500',
                    running: 'bg-blue-500 animate-pulse',
                    pending: 'bg-gray-400',
                    error: 'bg-red-500'
                  }[block.status || 'pending'];
                  
                  return (
                    <div
                      key={block.key}
                      className={`
                        flex items-center gap-3 py-2 px-3 text-xs transition-colors cursor-pointer select-none
                        ${isTop ? 'bg-primary/5' : ''}
                        ${isHighlighted ? 'bg-primary/10' : 'hover:bg-muted/30'}
                      `}
                      onDoubleClick={() => handleStackRowDoubleClick(block.key)}
                      title="Double-click to view memory for this block"
                    >
                      {/* Stack Position */}
                      <div className="w-6 text-center shrink-0">
                        <span className={`font-mono ${isTop ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {isTop ? '→' : index}
                        </span>
                      </div>
                      
                      {/* Status Indicator */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                      
                      {/* Icon */}
                      {block.icon && (
                        <span className="shrink-0">{block.icon}</span>
                      )}
                      
                      {/* Block Label */}
                      <div className="flex-1 min-w-0">
                        <span className={`font-medium truncate ${isTop ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {block.label}
                        </span>
                      </div>
                      
                      {/* Block Type Badge */}
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                      >
                        {block.blockType}
                      </Badge>
                      
                      {/* Key (truncated) */}
                      <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px] shrink-0" title={block.key}>
                        {block.key.split('-').pop()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <MemoryPanel 
        entries={snapshot.memory.entries}
        groupBy="owner"
        highlightedOwnerKey={highlightedOwnerKey}
        className="border-0 shadow-none rounded-none"
      />
    );
  };

  const tabBar = (
    <div className="flex border-b border-border bg-muted/20 text-[11px] font-semibold uppercase tracking-wider">
      {DEBUG_TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`flex-1 py-2 transition-colors ${
              isActive
                ? 'text-foreground bg-background border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  // Embedded mode - render inline without slide-out behavior
  if (embedded) {
    return (
      <div className={`h-full flex flex-col bg-background ${className}`}>
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/30 shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h3 className="font-semibold text-sm">Runtime Debugger</h3>
        </div>

        {tabBar}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {renderTabContent()}
        </div>

        {/* Footer with Memory Type Summary */}
        <div className="p-2 border-t border-border bg-muted/10 text-xs text-muted-foreground shrink-0 space-y-1">
          <div className="flex items-center justify-between">
            <span>Stack: {snapshot?.stack.blocks.length || 0}</span>
            <span>Memory: {snapshot?.memory.entries.length || 0}</span>
          </div>
          {snapshot && snapshot.memory.entries.length > 0 && (
            <MemoryTypeSummary entries={snapshot.memory.entries} />
          )}
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

        {tabBar}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {renderTabContent()}
        </div>

        {/* Footer with Memory Type Summary */}
        <div className="p-2 border-t border-border bg-muted/10 text-xs text-muted-foreground shrink-0 space-y-1">
          <div className="flex items-center justify-between">
            <span>Stack Depth: {snapshot?.stack.blocks.length || 0}</span>
            <span>Memory Entries: {snapshot?.memory.entries.length || 0}</span>
          </div>
          {snapshot && snapshot.memory.entries.length > 0 && (
            <MemoryTypeSummary entries={snapshot.memory.entries} />
          )}
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
