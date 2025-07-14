import React, { useState, useEffect } from 'react';
import { WodWiki } from '../../src/editor/WodWiki';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { IRuntimeBlock } from '../../src/runtime/IRuntimeBlock';
import { NextEvent } from '../../src/runtime/events/NextEvent';
import { WodScript } from '../../src/WodScript';
import { JitCompiler, RuntimeJitStrategies } from '../../src/runtime/JitCompiler';
import { FragmentCompilationManager } from '../../src/runtime/FragmentCompilationManager';
import { compilers } from '../../src/runtime/FragmentCompilationManager.fixture';
import { CountdownStrategy, RoundsStrategy, EffortStrategy } from '../../src/runtime/strategies';
import { MdTimerRuntime } from '../../src/parser/md-timer';

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



function MetricValueDisplay({ metric }: { metric: { type: string; value: string; unit?: string } }) {
  return (
    <div className="border rounded px-2 py-1 text-xs bg-white shadow-sm flex flex-col items-center">
      <span className="font-bold uppercase tracking-wider text-gray-600">{metric.type}</span>
      <span className="font-mono text-base">{metric.value} {metric.unit}</span>
    </div>
  );
}

function RuntimeBlockDisplay({ block, isActive }: { block: MockRuntimeBlock; isActive: boolean }) {
  return (
    <div className={`border-2 rounded-lg p-3 mb-2 transition-all duration-200 ${blockColors[block.blockType]} ${isActive ? 'border-blue-600 shadow-lg' : 'opacity-80'}`} style={{ marginLeft: `${block.depth * 20}px` }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-sm">{block.displayName}</span>
        <span className="text-xs text-gray-500">({block.blockType})</span>
        {isActive && <span className="ml-2 text-blue-700 font-bold">&larr; CURRENT</span>}
      </div>
      <div className="text-xs text-gray-700 mb-1">{block.description}</div>
      <div className="flex gap-2 flex-wrap">
        {block.metrics.filter(m => m.value !== undefined).map((m, i) => <MetricValueDisplay key={i} metric={{ ...m, value: m.value! }} />)}
      </div>
      <div className="text-xs text-gray-400 mt-1">Key: {block.key} {block.parentKey && <>| Parent: {block.parentKey}</>}</div>
    </div>
  );
}

function RuntimeStackVisualizer({ stack }: { stack: MockRuntimeStack }) {
  return (
    <div>
      {stack.blocks.map((block, i) => (
        <RuntimeBlockDisplay key={block.key} block={block} isActive={i === stack.currentIndex} />
      ))}
    </div>
  );
}

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

export interface JitCompilerDemoProps {
  initialScript?: string;
  runtime?: ScriptRuntime;
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

    const metrics = block.metrics.flatMap(m => m.values.map(v => ({ type: v.type as string, value: v.value?.toString(), unit: v.unit })));

    return {
        displayName: block.constructor.name.replace('Block', ''),
        description: block.key.toString(),
        blockType: blockType,
        depth: depth,
        metrics: metrics,
        key: block.key.toString(),
        parentKey: block.parent?.key.toString()
    };
};

export const JitCompilerDemo: React.FC<JitCompilerDemoProps> = ({
    initialScript = `20:00 AMRAP\n5 Pullups\n10 Pushups\n15 Air Squats`,
    runtime: initialRuntime
}) => {
  const [script, setScript] = useState(initialScript);
  
  // Create a runtime if one wasn't provided
  const createRuntime = (scriptText: string): ScriptRuntime => {
    const mdRuntime = new MdTimerRuntime();
    const wodScript = mdRuntime.read(scriptText) as WodScript;
    const fragmentCompiler = new FragmentCompilationManager(compilers);
    const strategyManager = new RuntimeJitStrategies()
      .addStrategy(new CountdownStrategy())
      .addStrategy(new RoundsStrategy())
      .addStrategy(new EffortStrategy());
    const jitCompiler = new JitCompiler(wodScript, fragmentCompiler, strategyManager);
    const runtime = new ScriptRuntime(wodScript, jitCompiler);
    
    // Initialize with the root block
    console.log(`🌱 Creating and pushing root block to stack`);
    const rootBlock = jitCompiler.root();
    runtime.stack.push(rootBlock);
    console.log(`  ✅ Root block pushed, stack depth: ${runtime.stack.blocks.length}`);
    
    return runtime;
  };

  const [runtime, setRuntime] = useState<ScriptRuntime>(() => 
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
        const newRuntime = new ScriptRuntime(prev.script, prev.jit);
        newRuntime.stack.setBlocks([...prev.stack.blocks]);
        return newRuntime;
    });
  };

  const stack: MockRuntimeStack = {
      blocks: runtime?.stack?.blocks?.map((b, i) => toMockBlock(b, i)) ?? [],
      currentIndex: Math.max(0, (runtime?.stack?.blocks?.length ?? 1) - 1)
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-2">JIT Compiler Demo</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
      </div>
    </div>
  );
};

