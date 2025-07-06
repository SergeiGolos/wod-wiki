import React, { useState, useEffect } from 'react';
import { MdTimerRuntime } from '../../src/parser/md-timer';
import { RuntimeMetric, MetricValue } from '../../src/runtime/RuntimeMetric';
import { IRuntimeBlock } from '../../src/runtime/IRuntimeBlock';
import { IScript } from '../../src/WodScript';
import { WodWiki } from '../../src/editor/WodWiki';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { WodScript } from '../../src/WodScript';

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

const RuntimeStackVisualizer = ({ runtime, simulationStep }: { runtime: ScriptRuntime | null; simulationStep: number }) => {
  if (!runtime || !runtime.stack || runtime.stack.blocks.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500">
        Runtime stack is empty
      </div>
    );
  }

  const blocks = runtime.stack.blocks;
  const currentIndex = blocks.length - 1; // Current is always the top of the stack

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-gray-800 mb-3">
        Runtime Stack (Bottom to Top):
        <span className="ml-2 text-sm font-normal text-blue-600">
          Step {simulationStep + 1}/4
        </span>
      </h4>
      {blocks.map((block, index) => {
        const isActive = index === currentIndex;
        const blockKey = block.key?.blockId || `block-${index}`;
        
        // Add visual effects based on simulation step
        const getStepEffects = () => {
          switch (simulationStep) {
            case 1: return index === 0 ? 'animate-pulse' : '';
            case 2: return 'border-green-500 bg-green-50';
            case 3: return 'border-emerald-500 bg-emerald-50';
            default: return '';
          }
        };
        
        return (
          <div
            key={index}
            className={`border rounded-lg p-3 transition-all duration-200 ${
              isActive 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'bg-gray-100 border-gray-200 opacity-75'
            } ${getStepEffects()}`}
            style={{ marginLeft: `${index * 20}px` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold bg-slate-100 border-slate-200 text-slate-800`}>
                    {blockKey === 'root' ? 'Root' : 'Block'}
                  </span>
                  <span className="font-medium">{blockKey}</span>
                  {isActive && <span className="text-blue-600 font-bold">← CURRENT</span>}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {blockKey === 'root' ? 'Main execution container' : 'Runtime block'}
                </p>
                <p className="text-xs text-gray-500">
                  Key: {blockKey} | Depth: {index} | Metrics: {block.metrics.length}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600">Active</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
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

const RuntimeBlockDisplay = ({ block, isActive }: { block: IRuntimeBlock | null; isActive: boolean }) => {
  if (!block) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
        No runtime block compiled
      </div>
    );
  }

  const blockKey = block.key?.blockId || 'unknown';

  return (
    <div className={`border rounded-lg p-4 ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
      <div className="mb-3">
        <h3 className="font-bold text-xl text-gray-800">{blockKey}</h3>
        <p className="text-sm text-gray-600">Runtime Block</p>
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

export const JitCompilerDemo = ({ text }: { text: string }) => {
  const [script, setScript] = useState<IScript | null>(null);
  const [scriptRuntime, setScriptRuntime] = useState<ScriptRuntime | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulationStep, setSimulationStep] = useState(0);

  // Initialize the script and runtime
  useEffect(() => {
    try {
      const runtime = new MdTimerRuntime();
      const parsedScript = runtime.read(text);
      setScript(parsedScript);
      
      // Create ScriptRuntime with WodScript
      const wodScript = new WodScript(text, parsedScript.statements);
      const newScriptRuntime = new ScriptRuntime(wodScript);
      setScriptRuntime(newScriptRuntime);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setScriptRuntime(null);
    }
  }, [text]);

  const handleValueChange = (newScript?: IScript) => {
    if (newScript) {
      setScript(newScript);
      try {
        const wodScript = new WodScript(text, newScript.statements);
        const newScriptRuntime = new ScriptRuntime(wodScript);
        setScriptRuntime(newScriptRuntime);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setScriptRuntime(null);
      }
    }
  };

  const handleNext = () => {
    // Simulate different runtime scenarios by adding/removing blocks
    if (!scriptRuntime) return;
    
    const maxSteps = 4;
    const nextStep = (simulationStep + 1) % maxSteps;
    setSimulationStep(nextStep);
    
    // This is just for demonstration - in real usage, blocks would be managed by the runtime
    console.log(`Simulation step ${nextStep}: Demonstrating stack at different execution phases`);
  };

  const getSimulationDescription = () => {
    switch (simulationStep) {
      case 0: return "Step 1: Initial state - Root block loaded on runtime stack";
      case 1: return "Step 2: Compilation phase - JIT compiler processing statements (pulsing animation)";
      case 2: return "Step 3: Execution phase - Runtime blocks actively processing (green highlighting)";
      case 3: return "Step 4: Completion phase - Workout execution finished (emerald highlighting)";
      default: return "Runtime stack demonstration";
    }
  };

  const currentBlock = scriptRuntime?.stack.current || null;

  return (    
    <div className="p-4 font-sans max-w-7xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Script Runtime Stack Demonstration</h2>
        <p className="text-gray-600">
          This demo shows the actual ScriptRuntime stack managing the execution of workout statements.
          The runtime stack holds the currently executing blocks and manages the execution flow.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <button 
            className="flex items-center justify-center px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors" 
            onClick={handleNext}
            disabled={!scriptRuntime}
          >
            <span className="text-lg">Next Simulation Step</span>            
          </button>
          <div className="text-sm text-gray-600">
            {getSimulationDescription()}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800">Error:</h4>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <WodWiki id="script-runtime-editor" code={text} onValueChange={handleValueChange} />
        
        {/* Runtime Stack Visualization */}
        <div className="xl:col-span-1">
          <h3 className="text-lg font-semibold mb-4">Runtime Stack Visualization:</h3>
          <div className="max-h-96 overflow-y-auto">
            <RuntimeStackVisualizer runtime={scriptRuntime} simulationStep={simulationStep} />
          </div>
        </div>
      </div>

      {/* Current Block Details */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Current Block Details:</h3>
        <RuntimeBlockDisplay block={currentBlock} isActive={true} />
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">Runtime Stack Overview:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li><strong>Stack Management:</strong> The RuntimeStack maintains a stack of IRuntimeBlock instances</li>
          <li><strong>Current Block:</strong> The top of the stack represents the currently executing block</li>
          <li><strong>JIT Compiler:</strong> Creates runtime blocks on-demand during execution</li>
          <li><strong>Root Block:</strong> The bottom of the stack is always the root execution container</li>
          <li><strong>Block Hierarchy:</strong> Parent-child relationships are maintained through the stack structure</li>
        </ul>
        
        {scriptRuntime && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h5 className="font-medium mb-2">Current Runtime State:</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Stack Depth:</span> {scriptRuntime.stack.blocks.length}
              </div>
              <div>
                <span className="font-medium">Current Block:</span> {scriptRuntime.stack.current?.key?.blockId || 'None'}
              </div>
              <div>
                <span className="font-medium">Script Statements:</span> {scriptRuntime.script.statements.length}
              </div>
              <div>
                <span className="font-medium">JIT Compiler:</span> Ready
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Simulation Controls */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Simulation Controls:</h3>
        <div className="flex gap-4">
          <button
            onClick={handleNext}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition-all duration-200"
          >
            Next Block
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-800">
          {getSimulationDescription()}
        </div>
      </div>
    </div>
  );
};
