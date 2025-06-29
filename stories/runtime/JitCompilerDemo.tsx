import React, { useState, useEffect } from 'react';
import { MdTimerRuntime } from '../../src/parser/md-timer';
import { RuntimeMetric, MetricValue } from '../../src/runtime/RuntimeMetric';
import { IRuntimeBlock } from '../../src/runtime/IRuntimeBlock';
import { IScript } from '../../src/WodScript';
import { WodWiki } from '../../src/editor/WodWiki';

// Mock implementations for demonstration
interface MockJitStatement {
  fragments: any[];
  id: string;
  effort?: string;
}

interface MockRuntimeBlock extends IRuntimeBlock {
  displayName: string;
  description: string;
  blockType: 'Root' | 'Timer' | 'Effort' | 'Group' | 'Completion' | 'Idle';
  depth: number;
}

interface MockRuntimeStack {
  blocks: MockRuntimeBlock[];
  currentIndex: number;
}

interface RuntimeStackVisualization {
  stack: MockRuntimeStack;
  currentBlock: MockRuntimeBlock | null;
  executionPhase: 'Idle' | 'Compiling' | 'Executing' | 'Completed';
}

const getMetricColorClasses = (type: string) => {
  const colorMap: { [key: string]: string } = {
    'repetitions': 'bg-green-100 border-green-200 text-green-800',
    'resistance': 'bg-red-100 border-red-200 text-red-800',
    'distance': 'bg-teal-100 border-teal-200 text-teal-800',
    'timestamp': 'bg-blue-100 border-blue-200 text-blue-800',
    'rounds': 'bg-purple-100 border-purple-200 text-purple-800',
    'time': 'bg-yellow-100 border-yellow-200 text-yellow-800',
  };
  return colorMap[type] || 'bg-gray-200 border-gray-300 text-gray-800';
};

const getBlockTypeColor = (blockType: string) => {
  const colorMap: { [key: string]: string } = {
    'Root': 'bg-slate-100 border-slate-200 text-slate-800',
    'Timer': 'bg-blue-100 border-blue-200 text-blue-800',
    'Effort': 'bg-green-100 border-green-200 text-green-800',
    'Group': 'bg-purple-100 border-purple-200 text-purple-800',
    'Completion': 'bg-emerald-100 border-emerald-200 text-emerald-800',
    'Idle': 'bg-gray-100 border-gray-200 text-gray-800',
  };
  return colorMap[blockType] || 'bg-gray-200 border-gray-300 text-gray-800';
};

const RuntimeStackVisualizer = ({ stack, currentBlockIndex }: { 
  stack: MockRuntimeStack; 
  currentBlockIndex: number;
}) => {
  if (stack.blocks.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500">
        Runtime stack is empty
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-gray-800 mb-3">Runtime Stack (Bottom to Top):</h4>
      {stack.blocks.map((block, index) => {
        const isActive = index === currentBlockIndex;
        const isInStack = index <= currentBlockIndex;
        
        return (
          <div
            key={index}
            className={`border rounded-lg p-3 transition-all duration-200 ${
              isActive 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : isInStack
                  ? getBlockTypeColor(block.blockType) + ' opacity-75'
                  : 'bg-gray-50 border-gray-200 opacity-40'
            }`}
            style={{ marginLeft: `${block.depth * 20}px` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getBlockTypeColor(block.blockType)}`}>
                    {block.blockType}
                  </span>
                  <span className="font-medium">{block.displayName}</span>
                  {isActive && <span className="text-blue-600 font-bold">← CURRENT</span>}
                </div>
                <p className="text-sm text-gray-600 mt-1">{block.description}</p>
                <p className="text-xs text-gray-500">
                  Key: {(block.key as any).value} | Depth: {block.depth} | Metrics: {block.metrics.length}
                </p>
              </div>
              <div className="text-right">
                {isInStack && (
                  <div className="text-sm">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CompilationPhaseIndicator = ({ phase, currentStep }: { 
  phase: 'Idle' | 'Compiling' | 'Executing' | 'Completed';
  currentStep: number;
  totalSteps: number;
}) => {
  const phases = [
    { name: 'Fragment Compilation', description: 'Converting statements to RuntimeMetrics' },
    { name: 'Metric Inheritance', description: 'Applying parent block inheritance rules' },
    { name: 'Block Creation', description: 'Using strategy pattern to create runtime blocks' },
    { name: 'Stack Execution', description: 'Processing blocks through the runtime stack' }
  ];

  return (
    <div className="bg-white border rounded-lg p-4">
      <h4 className="font-semibold mb-3">JIT Compilation Process:</h4>
      <div className="space-y-2">
        {phases.map((phaseInfo, index) => {
          const isActive = phase === 'Compiling' && currentStep === index;
          const isCompleted = phase === 'Executing' || phase === 'Completed' || 
                             (phase === 'Compiling' && currentStep > index);
          
          return (
            <div
              key={index}
              className={`flex items-center p-2 rounded ${
                isActive 
                  ? 'bg-blue-100 border border-blue-300' 
                  : isCompleted 
                    ? 'bg-green-100 border border-green-300'
                    : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center text-sm font-bold ${
                isActive 
                  ? 'bg-blue-500 text-white animate-pulse' 
                  : isCompleted 
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <div>
                <div className="font-medium">{phaseInfo.name}</div>
                <div className="text-sm text-gray-600">{phaseInfo.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MetricValueDisplay = ({ value }: { value: MetricValue }) => {
  return (
    <div className={`border rounded-lg p-2 ${getMetricColorClasses(value.type)}`}>
      <strong className="block mb-1 text-center text-xs font-bold uppercase tracking-wider">
        {value.type}
      </strong>
      <div className="bg-white bg-opacity-60 px-2 py-1 rounded-md font-mono text-sm shadow-sm text-center">
        {value.value} {value.unit}
      </div>
    </div>
  );
};

const RuntimeMetricVisualizer = ({ metric }: { metric: RuntimeMetric }) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="mb-2">
        <h4 className="font-semibold text-lg text-gray-800">{metric.effort || 'Unknown Exercise'}</h4>
        <p className="text-sm text-gray-500">Source: {metric.sourceId}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {metric.values.map((value, index) => (
          <MetricValueDisplay key={index} value={value} />
        ))}
      </div>
    </div>
  );
};

const RuntimeBlockDisplay = ({ block, isActive }: { block: MockRuntimeBlock | null; isActive: boolean }) => {
  if (!block) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
        No runtime block compiled
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
      <div className="mb-3">
        <h3 className="font-bold text-xl text-gray-800">{block.displayName}</h3>
        <p className="text-sm text-gray-600">{block.description}</p>
      </div>
      
      <div className="mb-3">
        <h4 className="font-semibold text-lg mb-2">Runtime Metrics:</h4>
        <div className="space-y-3">
          {block.metrics.map((metric, index) => (
            <RuntimeMetricVisualizer key={index} metric={metric} />
          ))}
        </div>
      </div>
      
      {isActive && (
        <div className="mt-3 p-2 bg-blue-100 rounded-md">
          <p className="text-sm text-blue-800 font-medium">🔄 Currently Active Block</p>
        </div>
      )}
    </div>
  );
};

// Mock function to create runtime metrics from parsed statements
const createMockRuntimeMetrics = (script: IScript): RuntimeMetric[] => {
  return script.statements.map((statement, index) => {
    const repFragment = statement.fragments.find(f => f.type === 'rep');
    const actionFragment = statement.fragments.find(f => f.type === 'action');
    const resistanceFragment = statement.fragments.find(f => f.type === 'resistance');
    const distanceFragment = statement.fragments.find(f => f.type === 'distance');
    const timerFragment = statement.fragments.find(f => f.type === 'timer');

    const values: MetricValue[] = [];
    
    if (repFragment) {
      values.push({
        type: 'repetitions',
        value: typeof repFragment.value === 'number' ? repFragment.value : parseInt(repFragment.value?.toString() || '0'),
        unit: 'reps'
      });
    }
    
    if (resistanceFragment) {
      values.push({
        type: 'resistance',
        value: typeof resistanceFragment.value === 'number' ? resistanceFragment.value : parseInt(resistanceFragment.value?.toString() || '0'),
        unit: resistanceFragment.value?.toString().includes('lb') ? 'lb' : 'kg'
      });
    }
    
    if (distanceFragment) {
      values.push({
        type: 'distance',
        value: typeof distanceFragment.value === 'number' ? distanceFragment.value : parseInt(distanceFragment.value?.toString() || '0'),
        unit: 'm'
      });
    }
    
    if (timerFragment) {
      values.push({
        type: 'time',
        value: typeof timerFragment.value === 'number' ? timerFragment.value : parseInt(timerFragment.value?.toString() || '0'),
        unit: 'sec'
      });
    }

    return {
      sourceId: `statement-${index}`,
      effort: actionFragment?.value?.toString() || `Exercise ${index + 1}`,
      values
    };
  });
};

// Mock function to create runtime blocks with proper stack visualization
const createMockRuntimeBlocks = (metrics: RuntimeMetric[]): MockRuntimeBlock[] => {
  const blocks: MockRuntimeBlock[] = [];
  
  // Root block
  blocks.push({
    displayName: 'Root Block',
    description: 'Main workout execution container',
    blockType: 'Root',
    depth: 0,
    metrics: metrics,
    key: { value: 'root' } as any,
    spans: {} as any,
    handlers: [],
    parent: undefined,
    next: () => [],
    onEnter: () => {},
    inherit: () => ({} as any)
  });

  // Create individual exercise blocks
  metrics.forEach((metric, index) => {
    const blockType = metric.values.some(v => v.type === 'time') ? 'Timer' : 'Effort';
    blocks.push({
      displayName: `${metric.effort} Block`,
      description: `Execution block for ${metric.effort}`,
      blockType,
      depth: 1,
      metrics: [metric],
      key: { value: `block-${index}` } as any,
      spans: {} as any,
      handlers: [],
      parent: blocks[0],
      next: () => [],
      onEnter: () => {},
      inherit: () => ({} as any)
    });
  });

  // Completion block
  blocks.push({
    displayName: 'Completion Block',
    description: 'Workout completed successfully',
    blockType: 'Completion',
    depth: 0,
    metrics: [],
    key: { value: 'completion' } as any,
    spans: {} as any,
    handlers: [],
    parent: undefined,
    next: () => [],
    onEnter: () => {},
    inherit: () => ({} as any)
  });

  return blocks;
};

export const JitCompilerDemo = ({ text }: { text: string }) => {
  const [script, setScript] = useState<IScript | null>(null);
  const [runtimeBlocks, setRuntimeBlocks] = useState<MockRuntimeBlock[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationPhase, setCompilationPhase] = useState<'Idle' | 'Compiling' | 'Executing' | 'Completed'>('Idle');
  const [currentCompilationStep, setCurrentCompilationStep] = useState(0);
  const [runtimeStack, setRuntimeStack] = useState<MockRuntimeStack>({ blocks: [], currentIndex: -1 });

  // Initialize the script and compiler
  useEffect(() => {
    const runtime = new MdTimerRuntime();
    const parsedScript = runtime.read(text);
    setScript(parsedScript);
    
    // Mock compilation process with phases
    setIsCompiling(true);
    setCompilationPhase('Compiling');
    setCurrentCompilationStep(0);
    
    // Simulate compilation phases
    const phases = [
      () => { setCurrentCompilationStep(0); }, // Fragment Compilation
      () => { setCurrentCompilationStep(1); }, // Metric Inheritance  
      () => { setCurrentCompilationStep(2); }, // Block Creation
      () => { 
        setCurrentCompilationStep(3);
        const metrics = createMockRuntimeMetrics(parsedScript);
        const blocks = createMockRuntimeBlocks(metrics);
        setRuntimeBlocks(blocks);
        setRuntimeStack({ blocks, currentIndex: -1 });
        setCurrentBlockIndex(0);
        setIsCompiling(false);
        setCompilationPhase('Executing');
      }
    ];
    
    phases.forEach((phase, index) => {
      setTimeout(phase, (index + 1) * 400);
    });
  }, [text]);

  const handleValueChange = (newScript?: IScript) => {
    if (newScript) {
      setScript(newScript);
      // Re-compile with new script
      setIsCompiling(true);
      setCompilationPhase('Compiling');
      setCurrentCompilationStep(0);
      
      const phases = [
        () => { setCurrentCompilationStep(0); },
        () => { setCurrentCompilationStep(1); },
        () => { setCurrentCompilationStep(2); },
        () => { 
          setCurrentCompilationStep(3);
          const metrics = createMockRuntimeMetrics(newScript);
          const blocks = createMockRuntimeBlocks(metrics);
          setRuntimeBlocks(blocks);
          setRuntimeStack({ blocks, currentIndex: -1 });
          setCurrentBlockIndex(0);
          setIsCompiling(false);
          setCompilationPhase('Executing');
        }
      ];
      
      phases.forEach((phase, index) => {
        setTimeout(phase, (index + 1) * 200);
      });
    }
  };

  const handleNext = () => {
    if (currentBlockIndex < runtimeBlocks.length - 1) {
      const nextIndex = currentBlockIndex + 1;
      setCurrentBlockIndex(nextIndex);
      
      // Update runtime stack to show current execution state
      setRuntimeStack(prev => ({
        ...prev,
        currentIndex: nextIndex
      }));
      
      // If we're at the last block, mark as completed
      if (nextIndex === runtimeBlocks.length - 1) {
        setTimeout(() => setCompilationPhase('Completed'), 500);
      }
    } else {
      // Reset to beginning
      setCurrentBlockIndex(0);
      setRuntimeStack(prev => ({
        ...prev,
        currentIndex: 0
      }));
      setCompilationPhase('Executing');
    }
  };

  const currentBlock = runtimeBlocks[currentBlockIndex] || null;

  return (
    <div className="p-4 font-sans max-w-7xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">JIT Compiler Runtime Stack Demonstration</h2>
        <p className="text-gray-600">
          This demo shows how the JIT Compiler processes workout statements through the runtime stack.
          Watch how blocks are compiled, pushed onto the stack, and executed step by step.
        </p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Workout Script Editor:</h3>
        <WodWiki id="jit-compiler-editor" code={text} onValueChange={handleValueChange} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Compilation Process */}
        <div className="xl:col-span-1">
          <CompilationPhaseIndicator 
            phase={compilationPhase} 
            currentStep={currentCompilationStep}
            totalSteps={4}
          />
        </div>

        {/* Current Block Execution */}
        <div className="xl:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Current Block Execution:</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Block {currentBlockIndex + 1} of {runtimeBlocks.length}
              </span>
              <button
                onClick={handleNext}
                disabled={isCompiling || runtimeBlocks.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {currentBlockIndex === runtimeBlocks.length - 1 ? 'Reset' : 'Next'}
              </button>
            </div>
          </div>

          {isCompiling && (
            <div className="border rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Compiling runtime blocks...</p>
            </div>
          )}

          {!isCompiling && (
            <RuntimeBlockDisplay block={currentBlock} isActive={true} />
          )}
        </div>

        {/* Runtime Stack Visualization */}
        <div className="xl:col-span-1">
          <h3 className="text-lg font-semibold mb-4">Runtime Stack Visualization:</h3>
          <div className="max-h-96 overflow-y-auto">
            <RuntimeStackVisualizer 
              stack={runtimeStack} 
              currentBlockIndex={currentBlockIndex}
            />
          </div>
        </div>
      </div>

      {/* All Compiled Blocks Overview */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">All Compiled Blocks (Execution Order):</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {runtimeBlocks.map((block, index) => (
            <div 
              key={index}
              className={`cursor-pointer transition-all ${index === currentBlockIndex ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => {
                setCurrentBlockIndex(index);
                setRuntimeStack(prev => ({ ...prev, currentIndex: index }));
              }}
            >
              <RuntimeBlockDisplay 
                block={block} 
                isActive={index === currentBlockIndex} 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">Runtime Stack Processing:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li><strong>Fragment Compilation:</strong> Parse workout statements into RuntimeMetric objects</li>
          <li><strong>Metric Inheritance:</strong> Apply inheritance rules from parent blocks in the runtime stack</li>
          <li><strong>Block Creation:</strong> Use strategy pattern to create appropriate runtime blocks</li>
          <li><strong>Stack Execution:</strong> Push blocks onto stack, execute with next(), and pop when complete</li>
          <li><strong>Stack Management:</strong> Parent-child relationships maintained through stack depth and hierarchy</li>
        </ol>
      </div>
    </div>
  );
};
