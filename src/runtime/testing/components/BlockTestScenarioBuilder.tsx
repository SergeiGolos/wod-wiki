/**
 * BlockTestScenarioBuilder
 * 
 * Interactive component for building and executing block test scenarios.
 * Features:
 * - Monaco editor for WOD script input
 * - ParsedView showing clickable statements
 * - Setup action builder with presets
 * - Before/After snapshot comparison
 * - Mount/Next/Unmount action buttons
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ParsedView from '../../../components/ParsedView';
import { MdTimerRuntime } from '../../../parser/md-timer';
import { WodScript, IScript } from '../../../parser/WodScript';
import { TestableRuntime, RuntimeSnapshot, SnapshotDiff } from '../TestableRuntime';
import { ScriptRuntime } from '../../ScriptRuntime';
import { JitCompiler } from '../../JitCompiler';
import { IRuntimeBlock } from '../../IRuntimeBlock';
import { 
  SnapshotDiffViewer, 
  SnapshotDiffSummary, 
  ModifiedValuesViewer 
} from './SnapshotDiffViewer';
import {
  ITestSetupAction,
  TestSetupActionJSON,
  getAllActionFactories,
  getPresetsByCategory,
  applyPresetWithBlockKey,
  deserializeActions,
  serializeActions,
  TestSetupPreset
} from '../actions';
import { 
  EffortStrategy,
  TimerStrategy, 
  RoundsStrategy, 
  GroupStrategy,
  TimeBoundRoundsStrategy,
  IntervalStrategy
} from '../../strategies';

/**
 * Serializable scenario definition
 */
export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  wodScript: string;
  targetStatementId: number | null;
  includeChildren: boolean;
  setupActions: TestSetupActionJSON[];
  testPhase: 'mount' | 'next' | 'unmount';
}

/**
 * Props for BlockTestScenarioBuilder
 */
export interface BlockTestScenarioBuilderProps {
  /** Initial WOD script */
  initialScript?: string;
  /** Initial scenario to load */
  initialScenario?: ScenarioDefinition;
  /** Callback when scenario is saved */
  onSaveScenario?: (scenario: ScenarioDefinition) => void;
  /** Callback when scenario is executed */
  onExecute?: (result: ScenarioExecutionResult) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Result of executing a test scenario
 */
export interface ScenarioExecutionResult {
  scenario: ScenarioDefinition;
  success: boolean;
  beforeSnapshot: RuntimeSnapshot;
  afterSnapshot: RuntimeSnapshot;
  diff: SnapshotDiff;
  actionsReturned: any[];
  executionTimeMs: number;
  error?: Error;
}

// Empty snapshot for error/initial cases
const emptySnapshot: RuntimeSnapshot = {
  timestamp: 0,
  stack: { depth: 0, blockKeys: [] },
  memory: { entries: [], totalCount: 0 }
};

const emptyDiff: SnapshotDiff = {
  before: emptySnapshot,
  after: emptySnapshot,
  stack: { pushed: [], popped: [], depthChange: 0 },
  memory: { allocated: [], released: [], modified: [] }
};

/**
 * Create a JIT compiler with all standard strategies
 */
function createStandardCompiler(): JitCompiler {
  const compiler = new JitCompiler();
  compiler.registerStrategy(new TimeBoundRoundsStrategy());
  compiler.registerStrategy(new IntervalStrategy());
  compiler.registerStrategy(new TimerStrategy());
  compiler.registerStrategy(new RoundsStrategy());
  compiler.registerStrategy(new GroupStrategy());
  compiler.registerStrategy(new EffortStrategy());
  return compiler;
}

/**
 * Parse WOD script to WodScript object
 */
function parseScript(source: string): IScript | null {
  if (!source.trim()) return null;
  try {
    const parser = new MdTimerRuntime();
    return parser.read(source);
  } catch (e) {
    console.error('Parse error:', e);
    return null;
  }
}

export const BlockTestScenarioBuilder: React.FC<BlockTestScenarioBuilderProps> = ({
  initialScript = '5 Pullups',
  initialScenario,
  onSaveScenario,
  onExecute,
  className = ''
}) => {
  // Script state
  const [wodScript, setWodScript] = useState(initialScenario?.wodScript ?? initialScript);
  const [parsedScript, setParsedScript] = useState<IScript | null>(null);
  
  // Selection state
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(
    initialScenario?.targetStatementId ?? null
  );
  const [includeChildren, setIncludeChildren] = useState(
    initialScenario?.includeChildren ?? false
  );
  
  // Setup actions state
  const [setupActions, setSetupActions] = useState<ITestSetupAction[]>(
    initialScenario?.setupActions 
      ? deserializeActions(initialScenario.setupActions) 
      : []
  );
  
  // Test phase
  const [testPhase, setTestPhase] = useState<'mount' | 'next' | 'unmount'>(
    initialScenario?.testPhase ?? 'mount'
  );
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [_setupSnapshot, setSetupSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [_resultSnapshot, setResultSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [resultDiff, setResultDiff] = useState<SnapshotDiff | null>(null);
  const [actionsReturned, setActionsReturned] = useState<any[]>([]);
  const [executionError, setExecutionError] = useState<Error | null>(null);
  const [executedBlock, setExecutedBlock] = useState<IRuntimeBlock | null>(null);
  
  // Scenario metadata
  const [scenarioName, setScenarioName] = useState(initialScenario?.name ?? 'Untitled Scenario');
  const [scenarioDescription, setScenarioDescription] = useState(
    initialScenario?.description ?? ''
  );
  
  // Parse script when it changes
  useEffect(() => {
    const script = parseScript(wodScript);
    setParsedScript(script);
    
    // Auto-select first statement if none selected
    if (script && selectedStatementId === null && script.statements.length > 0) {
      setSelectedStatementId(script.statements[0].id as number);
    }
  }, [wodScript]);
  
  // Get selected statement info
  const selectedStatement = useMemo(() => {
    if (!parsedScript || selectedStatementId === null) return null;
    return parsedScript.getId(selectedStatementId);
  }, [parsedScript, selectedStatementId]);
  
  // Build current scenario definition
  const currentScenario = useMemo((): ScenarioDefinition => ({
    id: initialScenario?.id ?? `scenario-${Date.now()}`,
    name: scenarioName,
    description: scenarioDescription,
    wodScript,
    targetStatementId: selectedStatementId,
    includeChildren,
    setupActions: serializeActions(setupActions),
    testPhase
  }), [scenarioName, scenarioDescription, wodScript, selectedStatementId, includeChildren, setupActions, testPhase, initialScenario]);
  
  // Handle statement selection
  const handleStatementSelect = useCallback((id: number | null) => {
    setSelectedStatementId(id);
    // Reset execution state when selection changes
    setSetupSnapshot(null);
    setResultSnapshot(null);
    setResultDiff(null);
    setActionsReturned([]);
    setExecutionError(null);
    setExecutedBlock(null);
  }, []);
  
  // Add setup action
  const addSetupAction = useCallback((action: ITestSetupAction) => {
    setSetupActions(prev => [...prev, action]);
  }, []);
  
  // Remove setup action
  const removeSetupAction = useCallback((index: number) => {
    setSetupActions(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  // Apply preset
  const applyPreset = useCallback((preset: TestSetupPreset) => {
    const blockKey = executedBlock?.key.toString() ?? 'target-block';
    const actions = applyPresetWithBlockKey(preset, blockKey);
    setSetupActions(prev => [...prev, ...actions]);
  }, [executedBlock]);
  
  // Execute the test scenario
  const executeScenario = useCallback(async () => {
    if (!parsedScript || selectedStatementId === null) {
      setExecutionError(new Error('No statement selected'));
      return;
    }
    
    setIsExecuting(true);
    setExecutionError(null);
    const startTime = performance.now();
    
    try {
      // Create fresh runtime
      const compiler = createStandardCompiler();
      const emptyScript = new WodScript('', [], []);
      const baseRuntime = new ScriptRuntime(emptyScript, compiler);
      const testRuntime = new TestableRuntime(baseRuntime);
      
      // Get the statement to compile
      const statement = parsedScript.getId(selectedStatementId);
      if (!statement) {
        throw new Error(`Statement ${selectedStatementId} not found`);
      }
      
      // Compile and push the block
      const block = testRuntime.pushStatementById(
        parsedScript, 
        selectedStatementId,
        { includeChildren, mountAfterPush: testPhase !== 'mount' }
      );
      
      if (!block) {
        throw new Error('Failed to compile statement');
      }
      
      setExecutedBlock(block);
      
      // Apply setup actions
      testRuntime.applyTestActions(setupActions);
      
      // Take "before" snapshot (after setup, before test action)
      testRuntime.clearOperations();
      const beforeSnapshot = testRuntime.snapshot(`Before ${testPhase}`);
      setSetupSnapshot(beforeSnapshot);
      
      // Execute the test phase
      let returnedActions: any[] = [];
      
      switch (testPhase) {
        case 'mount':
          // For mount test, we need to re-push without mounting first
          testRuntime.stack.pop();
          testRuntime.stack.push(block);
          returnedActions = block.mount(testRuntime);
          break;
          
        case 'next':
          returnedActions = block.next(testRuntime);
          break;
          
        case 'unmount':
          returnedActions = block.unmount(testRuntime);
          testRuntime.stack.pop();
          block.dispose(testRuntime);
          break;
      }
      
      // Execute returned actions
      for (const action of returnedActions) {
        if (action && typeof action.do === 'function') {
          action.do(testRuntime);
        }
      }
      
      // Take "after" snapshot
      const afterSnapshot = testRuntime.snapshot(`After ${testPhase}`);
      setResultSnapshot(afterSnapshot);
      
      // Calculate diff
      const diff = testRuntime.diff(beforeSnapshot, afterSnapshot);
      setResultDiff(diff);
      setActionsReturned(returnedActions);
      
      // Callback
      onExecute?.({
        scenario: currentScenario,
        success: true,
        beforeSnapshot,
        afterSnapshot,
        diff,
        actionsReturned: returnedActions,
        executionTimeMs: performance.now() - startTime
      });
      
    } catch (error) {
      setExecutionError(error as Error);
      onExecute?.({
        scenario: currentScenario,
        success: false,
        beforeSnapshot: emptySnapshot,
        afterSnapshot: emptySnapshot,
        diff: emptyDiff,
        actionsReturned: [],
        executionTimeMs: performance.now() - startTime,
        error: error as Error
      });
    } finally {
      setIsExecuting(false);
    }
  }, [parsedScript, selectedStatementId, includeChildren, setupActions, testPhase, currentScenario, onExecute]);
  
  // Save scenario
  const handleSave = useCallback(() => {
    onSaveScenario?.(currentScenario);
  }, [currentScenario, onSaveScenario]);
  
  // Export scenario as JSON
  const handleExport = useCallback(() => {
    const json = JSON.stringify(currentScenario, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenarioName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentScenario, scenarioName]);
  
  // Import scenario from JSON
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const scenario = JSON.parse(e.target?.result as string) as ScenarioDefinition;
        setScenarioName(scenario.name);
        setScenarioDescription(scenario.description);
        setWodScript(scenario.wodScript);
        setSelectedStatementId(scenario.targetStatementId);
        setIncludeChildren(scenario.includeChildren);
        setSetupActions(deserializeActions(scenario.setupActions));
        setTestPhase(scenario.testPhase);
      } catch (err) {
        console.error('Failed to import scenario:', err);
        alert('Failed to import scenario: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }, []);
  
  return (
    <div className={`block-test-scenario-builder ${className}`}>
      {/* Header with scenario metadata */}
      <div className="scenario-header mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full text-lg font-semibold bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
              placeholder="Scenario Name"
            />
            <textarea
              value={scenarioDescription}
              onChange={(e) => setScenarioDescription(e.target.value)}
              className="w-full mt-2 text-sm text-gray-600 bg-transparent border border-gray-200 rounded p-2 resize-none"
              placeholder="Description (optional)"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Export
            </button>
            <label className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer">
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
      
      {/* Main content grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left side: Script & Selection */}
        <div className="script-panel">
          {/* WOD Script Editor */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">WOD Script</label>
            <textarea
              value={wodScript}
              onChange={(e) => setWodScript(e.target.value)}
              className="w-full h-32 font-mono text-sm p-3 border rounded bg-gray-900 text-gray-100"
              placeholder="Enter WOD script..."
            />
          </div>
          
          {/* Parsed View with selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Parsed Statements 
              <span className="text-gray-500 font-normal ml-2">
                (click to select target)
              </span>
            </label>
            <div className="border rounded p-2 bg-white max-h-48 overflow-y-auto">
              {parsedScript ? (
                <ParsedView
                  wodscript={wodScript}
                  selectedStatementId={selectedStatementId}
                  onSelectionChange={handleStatementSelect}
                />
              ) : (
                <div className="text-gray-400 italic p-2">No valid script</div>
              )}
            </div>
          </div>
          
          {/* Statement info */}
          {selectedStatement && (
            <div className="mb-4 p-2 bg-blue-50 rounded text-sm">
              <div className="font-medium">Selected: ID {selectedStatementId}</div>
              <div className="text-gray-600">
                Type: {selectedStatement.fragments?.map((f: { type: string }) => f.type).join(', ') || 'unknown'}
              </div>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={includeChildren}
                  onChange={(e) => setIncludeChildren(e.target.checked)}
                />
                <span>Include children ({selectedStatement.children?.flat().length ?? 0} found)</span>
              </label>
            </div>
          )}
          
          {/* Test Phase Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Test Phase</label>
            <div className="flex gap-2">
              {(['mount', 'next', 'unmount'] as const).map((phase) => (
                <button
                  key={phase}
                  onClick={() => setTestPhase(phase)}
                  className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                    testPhase === phase
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {phase.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right side: Setup Actions */}
        <div className="setup-panel">
          <label className="block text-sm font-medium mb-2">Setup Actions</label>
          
          {/* Current actions */}
          <div className="border rounded p-2 mb-2 bg-white min-h-[100px] max-h-48 overflow-y-auto">
            {setupActions.length === 0 ? (
              <div className="text-gray-400 italic p-2">No setup actions</div>
            ) : (
              <div className="space-y-1">
                {setupActions.map((action, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <div>
                      <span className="font-medium text-purple-600">{action.type}</span>
                      <span className="text-gray-500 ml-2 text-xs">
                        {action.description}
                      </span>
                    </div>
                    <button
                      onClick={() => removeSetupAction(i)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Add action controls */}
          <SetupActionBuilder onAddAction={addSetupAction} />
          
          {/* Preset buttons */}
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-500 mb-2">Quick Presets</label>
            <PresetButtons onApplyPreset={applyPreset} />
          </div>
        </div>
      </div>
      
      {/* Execute button */}
      <div className="my-4">
        <button
          onClick={executeScenario}
          disabled={isExecuting || selectedStatementId === null}
          className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors"
        >
          {isExecuting 
            ? 'Executing...' 
            : `Execute ${testPhase.toUpperCase()} Phase`}
        </button>
      </div>
      
      {/* Error display */}
      {executionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          <div className="font-medium">Error</div>
          <div className="text-sm">{executionError.message}</div>
        </div>
      )}
      
      {/* Results display */}
      {resultDiff && (
        <div className="results space-y-4">
          <h3 className="text-lg font-semibold">Results</h3>
          
          {/* Diff summary */}
          <div className="p-3 bg-gray-50 rounded">
            <SnapshotDiffSummary diff={resultDiff} />
          </div>
          
          {/* Before/After comparison */}
          <div className="border rounded p-3">
            <h4 className="font-medium mb-3">State Comparison</h4>
            <SnapshotDiffViewer diff={resultDiff} />
          </div>
          
          {/* Modified values */}
          {resultDiff.memory.modified.length > 0 && (
            <div className="border rounded p-3">
              <ModifiedValuesViewer modified={resultDiff.memory.modified} />
            </div>
          )}
          
          {/* Actions returned */}
          <div className="border rounded p-3">
            <h4 className="font-medium mb-2">
              Actions Returned ({actionsReturned.length})
            </h4>
            <div className="text-sm font-mono bg-gray-100 p-2 rounded">
              {actionsReturned.length === 0 ? (
                <span className="text-gray-500 italic">No actions returned</span>
              ) : (
                actionsReturned.map((action, i) => (
                  <div key={i} className="py-1">
                    <span className="text-purple-600">
                      {action.type ?? action.constructor?.name ?? 'Unknown'}
                    </span>
                    {action.target && (
                      <span className="text-gray-500 ml-2">→ {action.target}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Setup action builder component
 */
const SetupActionBuilder: React.FC<{
  onAddAction: (action: ITestSetupAction) => void;
}> = ({ onAddAction }) => {
  const factories = getAllActionFactories();
  const [selectedType, setSelectedType] = useState(factories[0]?.type ?? '');
  const [params, setParams] = useState<Record<string, unknown>>({});
  
  const selectedFactory = factories.find(f => f.type === selectedType);
  
  // Initialize params when type changes
  useEffect(() => {
    if (selectedFactory) {
      const defaults: Record<string, unknown> = {};
      for (const param of selectedFactory.paramSchema) {
        if (param.defaultValue !== undefined) {
          defaults[param.name] = param.defaultValue;
        }
      }
      setParams(defaults);
    }
  }, [selectedType, selectedFactory]);
  
  const handleAdd = () => {
    if (!selectedFactory) return;
    try {
      const action = selectedFactory.create(params);
      onAddAction(action);
    } catch (e) {
      console.error('Failed to create action:', e);
      alert('Failed to create action: ' + (e as Error).message);
    }
  };
  
  return (
    <div className="border rounded p-2 bg-gray-50">
      <div className="flex gap-2 mb-2">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="flex-1 p-1 border rounded text-sm"
        >
          {factories.map(f => (
            <option key={f.type} value={f.type}>{f.label}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Add
        </button>
      </div>
      
      {selectedFactory && (
        <div className="space-y-2">
          {selectedFactory.paramSchema.map((param) => (
            <div key={param.name} className="flex items-center gap-2 text-sm">
              <label className="w-32 text-gray-600">{param.label}:</label>
              {param.type === 'select' ? (
                <select
                  value={params[param.name] as string ?? ''}
                  onChange={(e) => setParams(p => ({ ...p, [param.name]: e.target.value }))}
                  className="flex-1 p-1 border rounded"
                >
                  {param.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : param.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={params[param.name] as boolean ?? false}
                  onChange={(e) => setParams(p => ({ ...p, [param.name]: e.target.checked }))}
                />
              ) : param.type === 'number' ? (
                <input
                  type="number"
                  value={params[param.name] as number ?? 0}
                  onChange={(e) => setParams(p => ({ ...p, [param.name]: Number(e.target.value) }))}
                  className="flex-1 p-1 border rounded"
                />
              ) : (
                <input
                  type="text"
                  value={params[param.name] as string ?? ''}
                  onChange={(e) => setParams(p => ({ ...p, [param.name]: e.target.value }))}
                  className="flex-1 p-1 border rounded"
                  placeholder={param.required ? 'Required' : 'Optional'}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Preset buttons component
 */
const PresetButtons: React.FC<{
  onApplyPreset: (preset: TestSetupPreset) => void;
}> = ({ onApplyPreset }) => {
  const categories = ['timer', 'rounds', 'effort', 'memory'] as const;
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]>('effort');
  
  const presets = getPresetsByCategory(selectedCategory);
  
  return (
    <div>
      <div className="flex gap-1 mb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-1 text-xs rounded ${
              selectedCategory === cat
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map(preset => (
          <button
            key={preset.id}
            onClick={() => onApplyPreset(preset)}
            title={preset.description}
            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BlockTestScenarioBuilder;
