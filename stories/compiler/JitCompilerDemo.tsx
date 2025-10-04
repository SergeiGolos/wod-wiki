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

// Enhanced memory visualization with hover state
function MemoryVisualizationTable({ 
  entries, 
  hoveredBlockKey, 
  onMemoryHover,
  hideOwnerColumn,
}: { 
  entries: MemoryTableEntry[]; 
  hoveredBlockKey?: string;
  onMemoryHover: (entryId?: string, blockKey?: string) => void;
  hideOwnerColumn?: boolean;
}) {
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
  return (
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
              {!hideOwnerColumn && (
                <th className="text-left px-2 py-1 font-semibold">Owner</th>
              )}
              <th className="text-left px-2 py-1 font-semibold">Value</th>
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
                  onMouseEnter={() => onMemoryHover(entry.id, entry.associatedBlockKey)}
                  onMouseLeave={() => onMemoryHover()}
                >
                  <td className="px-2 py-1 text-gray-500 font-mono max-w-24 truncate" title={entry.id}>
                    {entry.id}
                  </td>
                  <td className="px-2 py-1">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      entry.isValid ? 'bg-green-400' : 'bg-red-400'
                    }`}></span>
                    {entry.type}
                  </td>
                  {!hideOwnerColumn && (
                    <td className="px-2 py-1 text-gray-600 font-mono">{entry.owner || '-'}</td>
                  )}
                  <td className="px-2 py-1 text-gray-800 font-mono max-w-32 truncate" title={entry.value}>
                    {entry.rawValue && typeof entry.rawValue === 'object' ? (
                      <details>
                        <summary className="cursor-pointer select-none">{entry.value}</summary>
                        <pre className="mt-1 p-2 bg-gray-50 rounded border max-h-40 overflow-auto whitespace-pre-wrap break-words">
                          {safeJSONStringify(entry.rawValue)}
                        </pre>
                      </details>
                    ) : (
                      entry.value
                    )}
                  </td>
                  <td className="px-2 py-1 text-center">{entry.children}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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
            hideOwnerColumn
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
  showFragments?: boolean;
  showRuntimeStack?: boolean;
  showMemory?: boolean;
}

const toMockBlock = (block: IRuntimeBlock, depth: number, scriptLines: string[]): MockRuntimeBlock => {
    let blockType: MockRuntimeBlock['blockType'] = 'Idle';
    if (block.constructor.name.includes('Countdown')) {
        blockType = 'Timer';
    } else if (block.constructor.name.includes('Rounds')) {
        blockType = 'Group';
    } else if (block.constructor.name.includes('Effort')) {
        blockType = 'Effort';
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
        displayName: block.constructor.name.replace('Block', ''),
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
    showFragments = true,
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
    // const strategyManager = new RuntimeJitStrategies()
    //   // Add strategies in order of precedence (most specific to most general)
    //   .addStrategy(new CountdownRoundsStrategy())
    //   .addStrategy(new TimeBoundedRoundsStrategy())
    //   .addStrategy(new CountdownStrategy())
    //   .addStrategy(new TimerStrategy())
    //   .addStrategy(new TimeBoundStrategy()) 
    //   .addStrategy(new RoundsStrategy()) // Repeating rounds
    //   .addStrategy(new EffortStrategy()); // Fallback strategy
      
    // Don't override console.log - it causes infinite recursion
    // Just use the standard console.log

    const jitCompiler = new JitCompiler([]);
    const runtime = new ScriptRuntime(wodScript, jitCompiler);

    // Register Next event handler
    const nextHandler = new NextEventHandler('jit-compiler-demo-next-handler');
    runtime.memory.allocate('handler', nextHandler.id, {
      name: nextHandler.name,
      handler: nextHandler.handler.bind(nextHandler)
    });
    console.log(`📝 Registered Next event handler: ${nextHandler.id}`);

    // Initialize with the root block
    console.log(`🌱 Creating and pushing root block to stack`);
    const rootBlock = new RuntimeBlock(runtime);
    runtime.stack.push(rootBlock);
    console.log(`  ✅ Root block pushed, stack depth: ${runtime.stack.blocks.length}`);

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
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold">Stack & Memory Visualization Debug Harness</h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            onClick={() => {
              setScript(initialScript);
              setHighlightedLine(undefined);
              setHoveredBlockKey(undefined);
              setHoveredMemoryBlockKey(undefined);
            }}
          >
            🔄 Reset
          </button>
          {(() => {
            const isScriptCompleted = !runtime?.stack?.current;
            const hasRuntimeErrors = runtime?.hasErrors && runtime.hasErrors();

            return (
              <button
            className={`px-3 py-2 rounded text-sm transition-colors ${
              isProcessingNext
                ? 'bg-yellow-600 text-white cursor-not-allowed'
                : isScriptCompleted
                ? 'bg-gray-600 text-white cursor-not-allowed'
                : hasRuntimeErrors
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            onClick={handleNextBlock}
            disabled={isProcessingNext || isScriptCompleted}
            type="button"
            title={
              isProcessingNext
                ? 'Processing...'
                : isScriptCompleted
                ? 'Script completed - no more blocks to advance'
                : hasRuntimeErrors
                ? 'Runtime has errors'
                : 'Advance to next block'
            }
          >
            {isProcessingNext ? '⏳ Processing...' : isScriptCompleted ? '✅ Completed' : (
              <>
                ▶️ Next Block
                {nextClickQueue > 0 && (
                  <span className="ml-1 px-1 py-0.5 bg-white bg-opacity-20 rounded text-xs">
                    +{nextClickQueue}
                  </span>
                )}
              </>
            )}
              </button>
            );
          })()}
        </div>
      </div>

      {/* 1. Workout Script Editor */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          📝 Workout Script Editor
        </label>
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

      {/* 2. Runtime Clock Placeholder */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          ⏰ Runtime Clock
        </label>
        <div className="bg-gray-100 border rounded-lg p-8 text-center text-gray-500">
          <div className="text-sm">Runtime clock placeholder</div>
          <div className="text-xs mt-2">Timer display will be implemented here</div>
        </div>
      </div>

      {/* 3. Fragment Breakdown */}
      {showFragments && statements.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            🔍 Fragments Breakdown
          </label>
          <div className="overflow-hidden rounded-lg border border-gray-200 shadow-md">
            <table className="w-full border-collapse bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Line</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Position</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fragments Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statements.map((statement, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-3 align-top text-sm text-gray-500 w-16">
                      {statement.meta?.line ?? 'N/A'}
                    </td>
                    <td className="p-3 align-top text-sm text-gray-500 w-24">
                      {statement.meta ? `[${statement.meta.columnStart} - ${statement.meta.columnEnd}]` : 'N/A'}
                    </td>
                    <td className="p-3">
                      <div style={{ paddingLeft: statement.meta?.columnStart ? `${(statement.meta.columnStart - 1) * COLUMN_INDENT_REM}rem` : '0' }}>
                        <FragmentVisualizer fragments={statement.fragments} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Runtime Stack */}
      {showRuntimeStack && (
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            📚 Runtime Stack (Execution)
          </label>
          <CompactRuntimeStackVisualizer
            stack={stack}
            hoveredMemoryBlockKey={hoveredMemoryBlockKey}
            onBlockHover={handleBlockHover}
          />
        </div>
      )}

      {/* 5. Memory Space */}
      {showMemory && (
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            🧠 Memory Space (Allocation)
          </label>
          <GroupedMemoryVisualization
            snapshot={memorySnapshot}
            hoveredBlockKey={hoveredBlockKey}
            onMemoryHover={handleMemoryHover}
          />
        </div>
      )}

      </div>
  );
};

