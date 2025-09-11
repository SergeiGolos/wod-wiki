import React, { useState, useEffect } from 'react';
import { WodWiki } from '../../src/editor/WodWiki';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { ScriptRuntimeWithMemory } from '../../src/runtime/ScriptRuntimeWithMemory';
import { IRuntimeBlock } from '../../src/runtime/IRuntimeBlock';
import { NextEvent } from '../../src/runtime/events/NextEvent';
import { WodScript } from '../../src/WodScript';
import { JitCompiler, RuntimeJitStrategies } from '../../src/runtime/JitCompiler';
import { FragmentCompilationManager } from '../../src/runtime/FragmentCompilationManager';
import { compilers } from '../../src/runtime/FragmentCompilationManager.fixture';
import { CountdownStrategy, RoundsStrategy, EffortStrategy } from '../../src/runtime/strategies';
import { MdTimerRuntime } from '../../src/parser/md-timer';
import { DebugMemorySnapshot } from '../../src/runtime/memory/IDebugMemoryView';

// Mock types for demonstration (replace with real types when available)
export interface MockRuntimeBlock {
  displayName: string;
  description: string;
  blockType: 'Root' | 'Timer' | 'Effort' | 'Group' | 'Completion' | 'Idle';
  depth: number;
  metrics: { type: string; value?: string; unit?: string }[];
  key: string;
  parentKey?: string;
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

// Editor component for editing the workout script
function ScriptEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-2">
      <WodWiki
        id="jit-compiler-demo-editor"
        code={value}
        onValueChange={scriptObj => {
          if (scriptObj && typeof scriptObj === 'object' && 'source' in scriptObj) {
            onChange((scriptObj as any).source);
          }
        }}
      />
    </div>
  );
}

function CompactRuntimeBlockDisplay({ block, isActive }: { block: MockRuntimeBlock; isActive: boolean }) {
  return (
    <div className={`border rounded px-2 py-1 flex items-center gap-2 text-xs mb-1 ${blockColors[block.blockType]} ${isActive ? 'border-blue-600 bg-blue-50' : 'opacity-80'}`} style={{ marginLeft: `${block.depth * 12}px` }}>
      <span className="font-bold">{block.displayName}</span>
      <span className="text-gray-500">({block.blockType})</span>
      {block.metrics.filter(m => m.value !== undefined).map((m, i) => (
        <span key={i} className="ml-2 px-1 bg-white border rounded text-gray-700 font-mono">{m.value}{m.unit ? ` ${m.unit}` : ''}</span>
      ))}
      {isActive && <span className="ml-2 text-blue-700 font-bold">&larr;</span>}
    </div>
  );
}

function CompactRuntimeStackVisualizer({ stack }: { stack: MockRuntimeStack }) {
  return (
    <div>
      {stack.blocks.map((block, i) => (
        <CompactRuntimeBlockDisplay key={block.key} block={block} isActive={i === stack.currentIndex} />
      ))}
    </div>
  );
}

interface MemoryTableEntry {
  id: string;
  type: string;
  owner: string;
  value: string;
  isValid: boolean;
  children: number;
}

function MemoryVisualizationTable({ entries }: { entries: MemoryTableEntry[] }) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 border-b">
        Memory Space ({entries.length} entries)
      </div>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1 font-semibold">Type</th>
              <th className="text-left px-2 py-1 font-semibold">Owner</th>
              <th className="text-left px-2 py-1 font-semibold">Value</th>
              <th className="text-center px-2 py-1 font-semibold">Children</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className={`border-t hover:bg-gray-50 ${!entry.isValid ? 'opacity-50' : ''}`}>
                <td className="px-2 py-1">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${entry.isValid ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  {entry.type}
                </td>
                <td className="px-2 py-1 text-gray-600 font-mono">{entry.owner || '-'}</td>
                <td className="px-2 py-1 text-gray-800 font-mono max-w-32 truncate" title={entry.value}>
                  {entry.value}
                </td>
                <td className="px-2 py-1 text-center">{entry.children}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupedMemoryVisualization({ snapshot }: { snapshot: DebugMemorySnapshot | null }) {
  if (!snapshot) {
    return (
      <div className="bg-gray-100 border rounded-lg p-4 text-center text-gray-500 text-sm">
        No memory data available (using ScriptRuntime instead of ScriptRuntimeWithMemory)
      </div>
    );
  }

  const memoryEntries: MemoryTableEntry[] = snapshot.entries.map(entry => ({
    id: entry.id,
    type: entry.type,
    owner: entry.ownerId || '',
    value: formatMemoryValue(entry.value),
    isValid: entry.isValid,
    children: entry.children.length
  }));

  // Group by type
  const groupedByType = memoryEntries.reduce((acc, entry) => {
    if (!acc[entry.type]) acc[entry.type] = [];
    acc[entry.type].push(entry);
    return acc;
  }, {} as Record<string, MemoryTableEntry[]>);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-xs text-gray-600">
        <span>Total Memory: {snapshot.totalAllocated} entries</span>
        <span>By Type: {Object.keys(snapshot.summary.byType).join(', ')}</span>
      </div>
      
      {Object.entries(groupedByType).map(([type, entries]) => (
        <div key={type}>
          <div className="text-xs font-semibold text-gray-700 mb-1">
            {type} ({entries.length})
          </div>
          <MemoryVisualizationTable entries={entries} />
        </div>
      ))}
    </div>
  );
}

function formatMemoryValue(value: any): string {
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
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    if (keys.length <= 2) {
      return `{${keys.join(', ')}}`;
    }
    return `{${keys.slice(0, 2).join(', ')}...}`;
  }
  return String(value).substring(0, 30);
}

export interface JitCompilerDemoProps {
  initialScript?: string;
  runtime?: ScriptRuntime | ScriptRuntimeWithMemory;
}

const toMockBlock = (block: IRuntimeBlock, depth: number): MockRuntimeBlock => {
    let blockType: MockRuntimeBlock['blockType'] = 'Idle';
    if (block.constructor.name.includes('Countdown')) {
        blockType = 'Timer';
    } else if (block.constructor.name.includes('Rounds')) {
        blockType = 'Group';
    } else if (block.constructor.name.includes('Effort')) {
        blockType = 'Effort';
    }

    const metrics = block.getMetrics().flatMap(m => m.values.map(v => ({ type: v.type as string, value: v.value?.toString(), unit: v.unit })));

    return {
        displayName: block.constructor.name.replace('Block', ''),
        description: block.key.toString(),
        blockType: blockType,
        depth: depth,
        metrics: metrics,
        key: block.key.toString(),
        parentKey: block.getParent()?.key.toString()
    };
};

export const JitCompilerDemo: React.FC<JitCompilerDemoProps> = ({
    initialScript = `20:00 AMRAP\n5 Pullups\n10 Pushups\n15 Air Squats`,
    runtime: initialRuntime
}) => {
  const [script, setScript] = useState(initialScript);
  
  // Create a runtime if one wasn't provided
  const createRuntime = (scriptText: string): ScriptRuntimeWithMemory => {
    const mdRuntime = new MdTimerRuntime();
    const wodScript = mdRuntime.read(scriptText) as WodScript;
    const fragmentCompiler = new FragmentCompilationManager(compilers);
    const strategyManager = new RuntimeJitStrategies()
      .addStrategy(new CountdownStrategy())
      .addStrategy(new RoundsStrategy())
      .addStrategy(new EffortStrategy());
    const jitCompiler = new JitCompiler(wodScript, fragmentCompiler, strategyManager);
    const runtime = new ScriptRuntimeWithMemory(wodScript, jitCompiler);
    
    // Initialize with the root block
    console.log(`🌱 Creating and pushing root block to stack`);
    const rootBlock = jitCompiler.root();
    runtime.stack.push(rootBlock);
    console.log(`  ✅ Root block pushed, stack depth: ${runtime.stack.blocks.length}`);
    
    return runtime;
  };

  const [runtime, setRuntime] = useState<ScriptRuntime | ScriptRuntimeWithMemory>(() => 
    initialRuntime || createRuntime(initialScript)
  );

  // Update runtime when script changes
  useEffect(() => {
    if (!initialRuntime) {
      const newRuntime = createRuntime(script);
      setRuntime(newRuntime);
    }
  }, [script, initialRuntime]);

  const handleNextBlock = () => {
    runtime.handle(new NextEvent());
    setRuntime(prev => {
        if (prev instanceof ScriptRuntimeWithMemory) {
            const newRuntime = new ScriptRuntimeWithMemory(prev.script, prev.jit);
            newRuntime.stack.setBlocks([...prev.stack.blocks]);
            return newRuntime;
        } else {
            const newRuntime = new ScriptRuntime(prev.script, prev.jit);
            newRuntime.stack.setBlocks([...prev.stack.blocks]);
            return newRuntime;
        }
    });
  };

  const stack: MockRuntimeStack = {
      blocks: runtime?.stack?.blocks?.map((b, i) => toMockBlock(b, i)) ?? [],
      currentIndex: Math.max(0, (runtime?.stack?.blocks?.length ?? 1) - 1)
  }

  // Get memory snapshot if using ScriptRuntimeWithMemory
  const memorySnapshot = runtime instanceof ScriptRuntimeWithMemory ? 
    runtime.getMemorySnapshot() : null;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-xl font-bold mb-2">JIT Compiler Demo with Memory Visualization</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-700">Workout Script</label>
          <ScriptEditor value={script} onChange={setScript} />
          <div className="flex gap-2 mt-2">
            <button className="px-3 py-1 bg-green-600 text-white rounded text-xs" onClick={handleNextBlock}>Next Block</button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-700">Runtime Stack</label>
          <CompactRuntimeStackVisualizer stack={stack} />
          <div className="mt-2 text-xs text-gray-500">Block: {stack.currentIndex + 1} / {stack.blocks.length}</div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-700">Memory Space</label>
          <GroupedMemoryVisualization snapshot={memorySnapshot} />
        </div>
      </div>
    </div>
  );
};

