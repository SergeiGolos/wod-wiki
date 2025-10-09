import React, { useState, useEffect } from 'react';
import { WodWiki } from '../../src/editor/WodWiki';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { IRuntimeBlock } from '../../src/runtime/IRuntimeBlock';
import { WodScript } from '../../src/WodScript';
import { JitCompiler } from '../../src/runtime/JitCompiler';
import { MdTimerRuntime } from '../../src/parser/md-timer';
import { CodeMetadata } from '../../src/CodeMetadata';
import { RuntimeBlock } from '@/runtime/RuntimeBlock';
import { FragmentVisualizer } from '../../src/components/fragments';
import { NextEvent } from '../../src/runtime/NextEvent';
import { NextEventHandler } from '../../src/runtime/NextEventHandler';
import { EffortStrategy, TimerStrategy, RoundsStrategy } from '../../src/runtime/strategies';
import { ChildAdvancementBehavior } from '../../src/runtime/behaviors/ChildAdvancementBehavior';
import { LazyCompilationBehavior } from '../../src/runtime/behaviors/LazyCompilationBehavior';
import { CodeStatement } from '../../src/CodeStatement';
import { RuntimeProvider } from '../../src/runtime/context/RuntimeContext';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';
import { TimerBehavior, TIMER_MEMORY_TYPES } from '../../src/runtime/behaviors/TimerBehavior';
import { useTimerElapsed } from '../../src/runtime/hooks/useTimerElapsed';

// Visual constants
const COLUMN_INDENT_REM = 0.8;

// Mock types for demonstration (replace with real types when available)
export interface MockRuntimeBlock {
  displayName: string;
  description: string;
  blockType: 'Root' | 'Timer' | 'Effort' | 'Group' | 'Completion' | 'Idle';
  depth: number;
  metrics: { type: string; value?: string; unit?: string }[];
  key: string;
  parentKey?: string;
  lineNumber?: number; // Line number in the source code for highlighting
  memoryAllocations?: string[]; // IDs of memory allocations for this block
}

export interface MockRuntimeStack {
  blocks: MockRuntimeBlock[];
  currentIndex: number;
}

const blockColors: Record<string, string> = {
  Root: 'bg-slate-200 border-slate-400',
  Timer: 'bg-blue-100 border-blue-300',
  Effort: 'bg-green-100 border-green-300',
  Group: 'bg-purple-100 border-purple-300',
  Completion: 'bg-emerald-100 border-emerald-300',
  Idle: 'bg-gray-100 border-gray-300',
};



// (unused) MetricValueDisplay kept for potential future detailed UI

// (unused) Detailed block display kept for future use

// (unused) Full-size stack visualizer kept for future use

// Clock display component for JIT compiler demo
function RuntimeClockDisplay({ runtime }: { runtime: ScriptRuntime | ScriptRuntime }) {
  // Find the first timer block in the current stack
  const timerBlock = runtime?.stack?.blocksBottomFirst?.find(block => {
    // Check if this block has TimerBehavior by looking for timer memory references
    const timeSpansRefs = runtime.memory.search({
      id: null,
      ownerId: block.key.toString(),
      type: TIMER_MEMORY_TYPES.TIME_SPANS,
      visibility: null
    });
    return timeSpansRefs.length > 0;
  });

  if (!timerBlock) {
    return (
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
        <div className="text-sm">No timer blocks currently running</div>
        <div className="text-xs mt-2">Timer blocks will appear here when workout is executed</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="text-center">
        <div className="text-sm font-medium text-gray-600 mb-4">Runtime Timer</div>
        <ClockAnchor blockKey={timerBlock.key.toString()} />
        <div className="mt-2 text-xs text-gray-500">
          Block: {timerBlock.key.toString()}
        </div>
      </div>
    </div>
  );
}

// Enhanced editor component with line highlighting
function ScriptEditor({ 
  value, 
  onChange, 
  highlightedLine 
}: { 
  value: string; 
  onChange: (v: string) => void;
  highlightedLine?: number;
}) {
  // Create cursor metadata for line highlighting
  const cursor: CodeMetadata | undefined = highlightedLine
    ? ({
        stack: [
          {
            meta: { line: highlightedLine },
          },
        ],
      } as unknown as CodeMetadata)
    : undefined;

  return (
    <div className="mb-2">
      <WodWiki
        id="jit-compiler-demo-editor"
        code={value}
        cursor={cursor}
        onValueChange={scriptObj => {
          if (scriptObj && typeof scriptObj === 'object' && 'source' in scriptObj) {
            onChange((scriptObj as any).source);
          }
        }}
      />
    </div>
  );
}

// Enhanced runtime block display with hover functionality
function CompactRuntimeBlockDisplay({ 
  block, 
  isActive, 
  isHighlighted, 
  onBlockHover 
}: { 
  block: MockRuntimeBlock; 
  isActive: boolean;
  isHighlighted?: boolean;
  onBlockHover: (blockKey?: string, lineNumber?: number) => void;
}) {
  return (
    <div 
      className={`border rounded px-2 py-1 flex items-center gap-2 text-xs mb-1 cursor-pointer transition-all duration-200 ${
        blockColors[block.blockType]
      } ${
        isActive ? 'border-blue-600 bg-blue-50' : 'opacity-80'
      } ${
        isHighlighted ? 'ring-2 ring-orange-300 bg-orange-50' : ''
      }`} 
      style={{ marginLeft: `${block.depth * 12}px` }}
      onMouseEnter={() => onBlockHover(block.key, block.lineNumber)}
      onMouseLeave={() => onBlockHover()}
    >
      <span className="font-bold">{block.displayName}</span>
      <span className="text-gray-500">({block.blockType})</span>
      {block.metrics.filter(m => m.value !== undefined).map((m, i) => (
        <span key={i} className="ml-2 px-1 bg-white border rounded text-gray-700 font-mono">{m.value}{m.unit ? ` ${m.unit}` : ''}</span>
      ))}
      {isActive && <span className="ml-2 text-blue-700 font-bold">&larr;</span>}
      {isHighlighted && <span className="ml-2 text-orange-600 font-bold">💭</span>}
    </div>
  );
}

function CompactRuntimeStackVisualizer({ 
  stack, 
  hoveredMemoryBlockKey, 
  onBlockHover 
}: { 
  stack: MockRuntimeStack;
  hoveredMemoryBlockKey?: string;
  onBlockHover: (blockKey?: string, lineNumber?: number) => void;
}) {
  return (
    <div className="bg-white border rounded-lg p-3">
      <div className="bg-gray-50 px-3 py-2 -mx-3 -mt-3 mb-3 text-xs font-semibold text-gray-700 border-b">
        Runtime Stack ({stack.blocks.length} blocks)
      </div>
      {stack.blocks.map((block, i) => (
        <CompactRuntimeBlockDisplay 
          key={block.key} 
          block={block} 
          isActive={i === stack.currentIndex}
          isHighlighted={block.key === hoveredMemoryBlockKey}
          onBlockHover={onBlockHover}
        />
      ))}
      <div className="mt-2 text-xs text-gray-500">
        Active Block: {stack.currentIndex + 1} / {stack.blocks.length}
      </div>
    </div>
  );
}

interface MemoryTableEntry {
  id: string;
  type: string;
  owner: string;
  value: string;
  rawValue: any;
  isValid: boolean;
  children: number;
  associatedBlockKey?: string; // Link to the runtime block that owns this memory
}

// Value popover component for hover display
function ValuePopover({
  entry,
  isVisible,
  targetRect
}: {
  entry: MemoryTableEntry;
  isVisible: boolean;
  targetRect?: DOMRect;
}) {
  if (!isVisible || !targetRect) return null;

  const safeJSONStringify = (value: any): string => {
    try {
      const seen = new WeakSet();
      return JSON.stringify(
        value,
        (_key, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) return '[Circular]';
            seen.add(val);
          }
          return val;
        },
        2
      );
    } catch {
      try {
        return String(value);
      } catch {
        return '[unserializable]';
      }
    }
  };

  // Calculate position to float above the mouse cursor
  // max-h-80 in Tailwind is 320px (80 * 4px)
  const popoverMaxHeight = 320;
  const popoverWidth = 384; // max-w-sm is 384px
  const verticalOffset = 20; // Space between mouse and popover
  
  // Position above the mouse
  const top = Math.max(10, targetRect.top - popoverMaxHeight - verticalOffset);
  // Center horizontally on the mouse, but keep within screen bounds
  const left = Math.max(10, Math.min(
    targetRect.left - (popoverWidth / 2),
    window.innerWidth - popoverWidth - 10
  ));

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-sm max-h-80 overflow-auto pointer-events-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm font-semibold text-gray-800 font-mono">
              {entry.id}
            </span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              {entry.type}
            </span>
          </div>
          <div className={`w-2 h-2 rounded-full ${
            entry.isValid ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
        </div>

        {/* Content */}
        <div className="text-sm">
          {entry.rawValue && typeof entry.rawValue === 'object' ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 mb-1">Object Structure:</div>
              <pre className="bg-gray-50 p-3 rounded border border-gray-200 text-xs font-mono leading-relaxed overflow-auto max-h-60">
                {safeJSONStringify(entry.rawValue)}
              </pre>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 mb-1">Value:</div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm break-all">
                {entry.value}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
          <span>Children: {entry.children}</span>
          <span>{entry.isValid ? 'Valid' : 'Invalid'}</span>
        </div>
      </div>
    </div>
  );
}

// Enhanced memory visualization with hover state
function MemoryVisualizationTable({
  entries,
  hoveredBlockKey,
  onMemoryHover,
}: {
  entries: MemoryTableEntry[];
  hoveredBlockKey?: string;
  onMemoryHover: (entryId?: string, blockKey?: string) => void;
}) {
  const [hoveredEntry, setHoveredEntry] = useState<MemoryTableEntry | null>(null);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);

  const handleRowMouseEnter = (entry: MemoryTableEntry, event: React.MouseEvent) => {
    setHoveredEntry(entry);
    // Store the mouse position instead of the target rect
    setPopoverRect({
      top: event.clientY,
      left: event.clientX,
      right: event.clientX,
      bottom: event.clientY,
      width: 0,
      height: 0
    } as DOMRect);
    onMemoryHover(entry.id, entry.associatedBlockKey);
  };

  const handleRowMouseLeave = () => {
    setHoveredEntry(null);
    setPopoverRect(null);
    onMemoryHover();
  };

  return (
    <>
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 border-b">
          Memory Space ({entries.length} entries)
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1 font-semibold">ID</th>
                <th className="text-left px-2 py-1 font-semibold">Type</th>
                <th className="text-center px-2 py-1 font-semibold">Children</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isHighlighted = entry.associatedBlockKey === hoveredBlockKey;
                return (
                  <tr
                    key={entry.id}
                    className={`border-t hover:bg-blue-50 cursor-pointer transition-colors ${
                      !entry.isValid ? 'opacity-50' : ''
                    } ${
                      isHighlighted ? 'bg-blue-100 border-blue-300' : ''
                    }`}
                    onMouseEnter={(e) => handleRowMouseEnter(entry, e)}
                    onMouseLeave={handleRowMouseLeave}
                  >
                    <td className="px-2 py-1 text-gray-500 font-mono max-w-20 truncate" title={entry.id}>
                      {entry.id}
                    </td>
                    <td className="px-2 py-1">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        entry.isValid ? 'bg-green-400' : 'bg-red-400'
                      }`}></span>
                      {entry.type}
                    </td>
                    <td className="px-2 py-1 text-center">{entry.children}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {hoveredEntry && popoverRect && (
        <ValuePopover
          entry={hoveredEntry}
          isVisible={true}
          targetRect={popoverRect}
        />
      )}
    </>
  );
}

function GroupedMemoryVisualization({ 
  snapshot, 
  hoveredBlockKey, 
  onMemoryHover 
}: { 
  snapshot: any | null;
  hoveredBlockKey?: string;
  onMemoryHover: (entryId?: string, blockKey?: string) => void;
}) {
  if (!snapshot) {
    return (
      <div className="bg-gray-100 border rounded-lg p-4 text-center text-gray-500 text-sm">        
        No memory data available (using ScriptRuntime instead of ScriptRuntime)
      </div>
    );
  }

  const memoryEntries: MemoryTableEntry[] = snapshot.entries.map((entry: any) => ({
    id: entry.id,
    type: entry.type,
    owner: entry.ownerId || '',
    value: formatMemoryValue(entry.type, entry.value),
    rawValue: entry.value,
    isValid: entry.isValid,
    children: entry.children.length,
    associatedBlockKey: entry.ownerId // Owner ID is the block key
  }));

  // Group by owner for compact visualization
  const groupedByOwner = memoryEntries.reduce((acc, entry) => {
    const owner = entry.owner || 'unknown-owner';
    if (!acc[owner]) acc[owner] = [] as MemoryTableEntry[];
    acc[owner].push(entry);
    return acc;
  }, {} as Record<string, MemoryTableEntry[]>);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-xs text-gray-600">
        <span>Total Memory: {snapshot.totalAllocated} entries</span>
        <span>Owners: {Object.keys(groupedByOwner).length}</span>
      </div>
      {Object.entries(groupedByOwner).map(([owner, entries]) => (
        <div key={owner} className="border rounded-md p-2">
          <div className="text-xs font-semibold text-gray-800 mb-2">Owner: {owner}</div>
          <MemoryVisualizationTable 
            entries={entries}
            hoveredBlockKey={hoveredBlockKey}
            onMemoryHover={onMemoryHover}
          />
        </div>
      ))}
    </div>
  );
}

function formatMemoryValue(type: string, value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value.length > 30 ? value.substring(0, 30) + '...' : value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return `Array[${value.length}]`;
  }
  if (typeof value === 'object') {
    try {
  if (type === 'metric') {
        const me = value as any;
        return `metric ${me.type}: ${me.value ?? '-'}${me.unit ? ' ' + me.unit : ''} (src:${me.sourceId}, blk:${me.blockId})`;
      }
      if (type === 'loop-state') {
        const rr = (value as any).remainingRounds;
        const idx = (value as any).currentChildIndex;
        const childCount = Array.isArray((value as any).childStatements) ? (value as any).childStatements.length : 2;
        return `rounds: ${rr}, child: ${Math.max(0, idx) + 1}/${childCount}`;
      }
      if (type === 'group-state') {
        const idx = (value as any).currentChildIndex;
        const childCount = Array.isArray((value as any).childBlocks) ? (value as any).childBlocks.length : 0;
        return `child: ${Math.max(0, idx) + 1}/${childCount}`;
      }
      if (type === 'metrics' || type === 'metrics-snapshot') {
        const m = value as any[];
        return `metrics: ${Array.isArray(m) ? m.length : 0}`;
      }
      if (type === 'spans') {
        return 'spans-builder';
      }
      if (type === 'handlers') {
        const arr = value as any[];
        return `handlers: ${Array.isArray(arr) ? arr.length : 0}`;
      }
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      if (keys.length <= 2) {
        return `{${keys.join(', ')}}`;
      }
      return `{${keys.slice(0, 2).join(', ')}...}`;
    } catch {
      return '{…}';
    }
  }
  return String(value).substring(0, 30);
}

export interface JitCompilerDemoProps {
  initialScript?: string;
  runtime?: ScriptRuntime;
  showRuntimeStack?: boolean;
  showMemory?: boolean;
}

const toMockBlock = (block: IRuntimeBlock, depth: number, scriptLines: string[]): MockRuntimeBlock => {
    // Use the new blockType property if available, otherwise fall back to constructor name
    const blockTypeFromStrategy = block.blockType;
    let blockType: MockRuntimeBlock['blockType'];
    let displayName: string;

    if (blockTypeFromStrategy) {
        // Map strategy blockType to MockRuntimeBlock blockType
        switch (blockTypeFromStrategy) {
            case 'Timer':
                blockType = 'Timer';
                break;
            case 'Rounds':
                blockType = 'Group';
                break;
            case 'Effort':
                blockType = 'Effort';
                break;
            default:
                blockType = 'Idle';
        }
        displayName = blockTypeFromStrategy;
    } else {
        // Fallback to old constructor-based detection
        if (block.constructor.name.includes('Countdown')) {
            blockType = 'Timer';
        } else if (block.constructor.name.includes('Rounds')) {
            blockType = 'Group';
        } else if (block.constructor.name.includes('Effort')) {
            blockType = 'Effort';
        } else {
            blockType = 'Idle';
        }
        displayName = block.constructor.name.replace('Block', '');
    }

    // Estimate line number based on block key and script content
    // This is a simple heuristic - in a real implementation, this would come from the compiler
    let lineNumber: number | undefined;
    // Note: key available via block.key.toString() if needed for mapping

    // Try to find the line that corresponds to this block
    // Look for patterns that might match the block type
    for (let i = 0; i < scriptLines.length; i++) {
        const line = scriptLines[i].toLowerCase();
        if (blockType === 'Timer' && (line.includes('amrap') || line.includes(':00'))) {
            lineNumber = i + 1;
            break;
        } else if (blockType === 'Effort' && (line.includes('pullup') || line.includes('pushup') || line.includes('squat'))) {
            lineNumber = i + 1;
            break;
        } else if (blockType === 'Group' && line.includes('(')) {
            lineNumber = i + 1;
            break;
        }
    }

    // For the new interface, we can't directly access metrics and parent
    // We'll use placeholder data for the demo
    const metrics: { type: string; value?: string; unit?: string }[] = [];

    return {
        displayName: displayName,
        description: block.key.toString(),
        blockType: blockType,
        depth: depth,
        metrics: metrics,
        key: block.key.toString(),
        parentKey: undefined, // Can't access parent in new interface
        lineNumber: lineNumber
    };
};

export const JitCompilerDemo: React.FC<JitCompilerDemoProps> = ({
    initialScript = `20:00 AMRAP\n5 Pullups\n10 Pushups\n15 Air Squats`,
    runtime: initialRuntime,
    showRuntimeStack = true,
    showMemory = true
}) => {
  const [script, setScript] = useState(initialScript);
  const [hoveredBlockKey, setHoveredBlockKey] = useState<string>();
  const [hoveredMemoryBlockKey, setHoveredMemoryBlockKey] = useState<string>();
  const [highlightedLine, setHighlightedLine] = useState<number>();
  // Used to force a re-render after mutating the runtime in-place
  const [, setStepVersion] = useState(0);
  // State for button management
  const [isProcessingNext, setIsProcessingNext] = useState(false);
  const [nextClickQueue, setNextClickQueue] = useState(0);
  
  // Create a runtime if one wasn't provided
  const createRuntime = (scriptText: string): ScriptRuntime => {
    const mdRuntime = new MdTimerRuntime();
    const wodScript = mdRuntime.read(scriptText) as WodScript;    
    
    // Create JIT compiler and register strategies
    const jitCompiler = new JitCompiler([]);

    // Register strategies in precedence order: most specific first
    jitCompiler.registerStrategy(new TimerStrategy());      // Check Timer first
    jitCompiler.registerStrategy(new RoundsStrategy());     // Then Rounds
    jitCompiler.registerStrategy(new EffortStrategy());     // Effort is fallback

    console.log(`📝 Registered strategies with JIT compiler: Timer → Rounds → Effort`);
    
    const runtime = new ScriptRuntime(wodScript, jitCompiler);

    // Register Next event handler
    const nextHandler = new NextEventHandler('jit-compiler-demo-next-handler');
    runtime.memory.allocate('handler', nextHandler.id, {
      name: nextHandler.name,
      handler: nextHandler.handler.bind(nextHandler)
    });
    console.log(`📝 Registered Next event handler: ${nextHandler.id}`);

    // Initialize with the root block that has child statements and behaviors
    console.log(`🌱 Creating root block with ${wodScript.statements.length} child statements`);
    
    // Create behaviors for the root block
    const childBehavior = new ChildAdvancementBehavior(wodScript.statements as CodeStatement[]);
    const lazyCompilationBehavior = new LazyCompilationBehavior(false);
    const behaviors = [childBehavior, lazyCompilationBehavior];
    
    // Create root block with script statements as children and behaviors
    const rootBlock = new RuntimeBlock(runtime, [], behaviors);
    runtime.stack.push(rootBlock);
    console.log(`  ✅ Root block pushed with ${behaviors.length} behaviors, stack depth: ${runtime.stack.blocks.length}`);

    return runtime;
  };

  const [runtime, setRuntime] = useState<ScriptRuntime | ScriptRuntime>(() => {
    return initialRuntime || createRuntime(initialScript);
  });

  // Update runtime when script changes
  useEffect(() => {
    if (!initialRuntime) {
      const newRuntime = createRuntime(script);
      setRuntime(newRuntime);
    }
  }, [script, initialRuntime]);

  // Handle block hover - highlights associated memory and source line
  const handleBlockHover = (blockKey?: string, lineNumber?: number) => {
    setHoveredBlockKey(blockKey);
    setHighlightedLine(lineNumber);
  };

  // Handle memory hover - highlights associated runtime block
  const handleMemoryHover = (entryId?: string, blockKey?: string) => {
    // Mark param as used to satisfy strict TS noUnusedParameters
    void entryId;
    setHoveredMemoryBlockKey(blockKey);
  };

  const handleNextBlock = () => {
    if (!runtime) {
      console.warn('No runtime available for Next button action');
      return;
    }

    // Handle rapid clicks by queuing them
    if (isProcessingNext) {
      setNextClickQueue(prev => prev + 1);
      console.log(`Next click queued. Queue size: ${nextClickQueue + 1}`);
      return;
    }

    setIsProcessingNext(true);

    try {
      // Check if script has already completed
      if (!runtime.stack.current) {
        console.log('Script has already completed - no current block to advance');
        setIsProcessingNext(false);
        return;
      }

      // Create and handle the NextEvent using our new event system
      const nextEvent = new NextEvent({
        source: 'ui-button',
        timestamp: Date.now(),
        queuePosition: nextClickQueue,
        isCompleted: false
      });
      runtime.handle(nextEvent);

      // Force a re-render to update the UI
      setStepVersion(v => v + 1);

      // Check for script completion after advancement
      setTimeout(() => {
        if (!runtime.stack.current) {
          console.log('🎉 Script execution completed!');
          // You could add completion state here if needed
        }
      }, 0);

      console.log('Next button executed successfully');
    } catch (error) {
      console.error('Error handling Next button click:', error);
      // Still force re-render even on error to show any error state
      setStepVersion(v => v + 1);
    } finally {
      setIsProcessingNext(false);

      // Process queued clicks if any
      if (nextClickQueue > 0) {
        setNextClickQueue(prev => prev - 1);
        // Use setTimeout to allow UI to update between rapid clicks
        setTimeout(() => {
          handleNextBlock();
        }, 10);
      }
    }
  };

  // Parse script into lines for line number mapping
  const scriptLines = script.split('\n');

  // Render stack in a canonical order: bottom (root) -> top (current)
  const blocksBottomFirst = runtime?.stack?.blocksBottomFirst ?? [];
  const stack: MockRuntimeStack = {
    blocks: blocksBottomFirst.map((b, i) => toMockBlock(b, i, scriptLines)),
    // Active is always the top-of-stack: last item in bottom-first view
    currentIndex: Math.max(0, blocksBottomFirst.length - 1)
  }

  // Build a debug-like memory snapshot from the current memory interface
  const memorySnapshot: any | null = (() => {
    try {
      const mem: any = (runtime as any)?.memory;
      if (!mem || typeof mem.search !== 'function' || typeof mem.get !== 'function') return null;

      // Get all references by passing fully-null criteria
  const allRefs = mem.search({ id: null, ownerId: null, type: null, visibility: null }) as Array<{ id: string; ownerId?: string; type?: string; visibility?: 'public' | 'private' }>;

      const entries = allRefs.map(ref => {
        // Recreate a typed reference so we can call memory.get()
        const typedRef = { id: ref.id, ownerId: ref.ownerId ?? '', type: ref.type ?? '', visibility: ref.visibility ?? 'private' } as any;
        const value = mem.get(typedRef);
        return {
          id: ref.id,
          type: ref.type ?? 'unknown',
          ownerId: ref.ownerId ?? '',
          value,
          isValid: true,
          children: [] as string[],
        };
      });

      // Summaries
      const byType: Record<string, number> = {};
      const byOwner: Record<string, number> = {};
      for (const e of entries) {
        byType[e.type] = (byType[e.type] ?? 0) + 1;
        const owner = e.ownerId ?? '';
        byOwner[owner] = (byOwner[owner] ?? 0) + 1;
      }

      const snapshot: any = {
        timestamp: Date.now(),
        entries,
        totalAllocated: entries.length,
        summary: { byType, byOwner },
      };
      return snapshot;
    } catch {
      return null;
    }
  })();

  // Extract statements for fragment visualization
  const statements = runtime?.script?.statements || [];

  return (
    <RuntimeProvider runtime={runtime}>
      <div className="p-4 max-w-7xl mx-auto">

        {/* Top Section: Workout Setup (left) and Parsed Workout (right) */}
        <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Left: Workout Setup / Script Editor */}
        <div className="bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Create Workout</h3>
          </div>
          <div className="p-4">
            <ScriptEditor
              value={script}
              onChange={setScript}
              highlightedLine={highlightedLine}
            />
            {highlightedLine && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                💡 Highlighting line {highlightedLine}
              </div>
            )}
          </div>
        </div>

        {/* Right: Parsed Workout / Fragment Breakdown */}
        
          {statements.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full border-collapse bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Line</th>
                      <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Position</th>
                      <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fragments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {statements.map((statement, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-2 align-top text-xs text-gray-500 w-12">
                          {statement.meta?.line ?? 'N/A'}
                        </td>
                        <td className="p-2 align-top text-xs text-gray-500 w-20">
                          {statement.meta ? `[${statement.meta.columnStart}-${statement.meta.columnEnd}]` : 'N/A'}
                        </td>
                        <td className="p-2">
                          <div style={{ paddingLeft: statement.meta?.columnStart ? `${(statement.meta.columnStart - 1) * COLUMN_INDENT_REM}rem` : '0' }}>
                            <FragmentVisualizer fragments={statement.fragments} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No workout parsed yet</p>
            </div>
          )}      
      </div>

      {/* Runtime Clock Section - Full Width */}
      <div className="mb-6">
        <RuntimeClockDisplay runtime={runtime} />
      </div>

      {/* Runtime Controls */}
      <div className="mb-6 bg-white rounded-lg border border-gray-300 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <h3 className="text-base font-semibold text-gray-900">Runtime Controls</h3>
          <div className="flex gap-3">
            <button
              onClick={handleNextBlock}
              disabled={isProcessingNext}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                isProcessingNext
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
              title="Advance to next block in runtime execution"
            >
              {isProcessingNext ? 'Processing...' : 'Next Block'}
              {nextClickQueue > 0 && ` (${nextClickQueue} queued)`}
            </button>
            <button
              onClick={() => {
                console.log('[JitCompilerDemo] Reset button clicked');
                setStepVersion(v => v + 1);
              }}
              className="px-4 py-2 rounded-md font-medium text-sm bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 transition-colors"
              title="Force UI refresh"
            >
              Refresh UI
            </button>
          </div>
          {isProcessingNext && (
            <div className="text-xs text-gray-500">
              <span className="inline-block animate-pulse">⏳</span> Processing next event...
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Runtime Stack and Memory Side by Side */}
      <div className="grid grid-cols-2 gap-6">
        {showRuntimeStack && (
          <CompactRuntimeStackVisualizer
            stack={stack}
            hoveredMemoryBlockKey={hoveredMemoryBlockKey}
            onBlockHover={handleBlockHover}
          />
        )}

        {showMemory && (
          <GroupedMemoryVisualization
            snapshot={memorySnapshot}
            hoveredBlockKey={hoveredBlockKey}
            onMemoryHover={handleMemoryHover}
          />
        )}
      </div>
      </div>
    </RuntimeProvider>
  );
};

