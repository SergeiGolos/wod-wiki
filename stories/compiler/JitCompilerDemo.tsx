import React, { useState } from 'react';
import { WodWiki } from '../../src/editor/WodWiki';

// Mock types for demonstration (replace with real types when available)
export interface MockRuntimeBlock {
  displayName: string;
  description: string;
  blockType: 'Root' | 'Timer' | 'Effort' | 'Group' | 'Completion' | 'Idle';
  depth: number;
  metrics: { type: string; value: string | number; unit?: string }[];
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



function MetricValueDisplay({ metric }: { metric: { type: string; value: string | number; unit?: string } }) {
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
        {block.metrics.map((m, i) => <MetricValueDisplay key={i} metric={m} />)}
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
      {block.metrics.map((m, i) => (
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
  initialStack?: MockRuntimeStack;
}

export const JitCompilerDemo: React.FC<JitCompilerDemoProps> = ({
  initialScript = `20:00 AMRAP\n5 Pullups\n10 Pushups\n15 Air Squats`,
  initialStack = {
    blocks: [
      { displayName: 'Root Block', description: 'Main execution container', blockType: 'Root', depth: 0, metrics: [], key: 'root' },
      { displayName: 'Timer Block', description: '20:00 AMRAP', blockType: 'Timer', depth: 1, metrics: [{ type: 'time', value: '20:00' }], key: 'timer', parentKey: 'root' },
      { displayName: 'Effort Block', description: '5 Pullups', blockType: 'Effort', depth: 2, metrics: [{ type: 'repetitions', value: 5 }], key: 'effort1', parentKey: 'timer' },
      { displayName: 'Effort Block', description: '10 Pushups', blockType: 'Effort', depth: 2, metrics: [{ type: 'repetitions', value: 10 }], key: 'effort2', parentKey: 'timer' },
      { displayName: 'Effort Block', description: '15 Air Squats', blockType: 'Effort', depth: 2, metrics: [{ type: 'repetitions', value: 15 }], key: 'effort3', parentKey: 'timer' },
      { displayName: 'Completion Block', description: 'Workout Complete', blockType: 'Completion', depth: 1, metrics: [], key: 'complete', parentKey: 'root' },
    ],
    currentIndex: 0,
  }
}) => {
  // Mock state for demonstration
  const [script, setScript] = useState(initialScript);
  const [stack, setStack] = useState<MockRuntimeStack>(initialStack);

  const handleNextBlock = () => {
    setStack((prev) => {
      const nextIndex = prev.currentIndex < prev.blocks.length - 1 ? prev.currentIndex + 1 : 0;
      return { ...prev, currentIndex: nextIndex };
    });
  };

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
