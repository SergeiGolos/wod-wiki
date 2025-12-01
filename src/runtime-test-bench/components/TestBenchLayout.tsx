import React from 'react';
import { EditorPanel } from '../components/EditorPanel';
import { RuntimeStackPanel } from '../components/RuntimeStackPanel';
import { MemoryPanel } from '../components/MemoryPanel';
import { Toolbar } from '../components/Toolbar';
import { CompilationPanel } from '../components/CompilationPanel';
import { ControlsPanel } from '../components/ControlsPanel';
import { StatusFooter } from '../components/StatusFooter';
import { useTestBenchContext } from '../context/TestBenchContext';
import { useHighlighting } from '../hooks/useHighlighting';

interface TestBenchLayoutProps {
  status: string;
  elapsedTime: number;
  onCodeChange: (code: string) => void;
  onCompile: () => void;
  onExecute: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onStep: () => void;
  className?: string;
}

export const TestBenchLayout: React.FC<TestBenchLayoutProps> = ({
  status,
  elapsedTime,
  onCodeChange,
  onCompile,
  onExecute,
  onPause,
  onStop,
  onReset,
  onStep,
  className = ''
}) => {
  const { state } = useTestBenchContext();
  const { code, parseResults, snapshot, compilationLog } = state;

  const {
    highlightState,
    setBlockHighlight,
    setMemoryHighlight
  } = useHighlighting();

  const blocks = snapshot?.stack.blocks || [];
  const memory = snapshot?.memory.entries || [];

  return (
    <div className={`bg-background text-foreground min-h-screen space-y-6 ${className}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toolbar */}
        <div>
          <Toolbar
            title="WOD Wiki Runtime Test Bench"
            navigationItems={[
              { id: 'editor', label: 'Editor', path: 'editor', isActive: true },
              { id: 'runtime', label: 'Runtime', path: 'runtime', isActive: false },
              { id: 'debug', label: 'Debug', path: 'debug', isActive: false }
            ]}
            onNavigate={() => {}}
            actionButtons={[
              { id: 'compile', label: 'Compile', icon: '⚙️', disabled: status === 'running' },
              { id: 'execute', label: status === 'paused' ? 'Resume' : 'Run', icon: '▶️', disabled: status === 'running' },
              { id: 'pause', label: 'Pause', icon: '⏸️', disabled: status !== 'running' },
              { id: 'stop', label: 'Stop', icon: '⏹️', disabled: status === 'idle' },
              { id: 'reset', label: 'Reset', icon: '🔄', disabled: false },
              { id: 'step', label: 'Step', icon: '👟', disabled: status !== 'paused' }
            ]}
            onAction={(actionId) => {
              switch (actionId) {
                case 'compile': onCompile(); break;
                case 'execute': onExecute(); break;
                case 'pause': onPause(); break;
                case 'stop': onStop(); break;
                case 'reset': onReset(); break;
                case 'step': onStep(); break;
              }
            }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg p-4">
            <EditorPanel
              value={code}
              onChange={onCodeChange}
              highlightedLine={highlightState.line}
              errors={parseResults.errors}
              status={parseResults.status as any}
              readonly={false}
            />
          </div>

          <div className="bg-card rounded-lg p-4">
            <CompilationPanel
              statements={parseResults.statements}
              activeTab="output"
              onTabChange={() => {}}
              compilationLog={compilationLog}
              errors={parseResults.errors}
              warnings={[]}
            />
          </div>

          <div className="bg-card rounded-lg p-4">
            <RuntimeStackPanel
              blocks={blocks}
              highlightedBlockKey={highlightState.blockKey}
              onBlockHover={(blockKey) => setBlockHighlight(blockKey, 'stack')}
              onBlockClick={() => {}}
            />
          </div>

          <div className="bg-card rounded-lg p-4">
            <MemoryPanel
              entries={memory}
              highlightedMemoryId={highlightState.memoryId}
              onEntryHover={(memoryId) => setMemoryHighlight(memoryId, 'memory')}
              onEntryClick={() => {}}
              filterText=""
              onFilterChange={() => {}}
              groupBy="none"
              onGroupByChange={() => {}}
            />
          </div>
        </div>

        {/* Controls Panel */}
        <div className="bg-card rounded-lg p-4">
          <ControlsPanel
            status={status as any}
            enabled={true}
            stepMode={false}
            onPlayPause={onExecute}
            onStop={onStop}
            onReset={onReset}
            onStep={onStep}
            onStepModeToggle={() => {}}
          />
        </div>

        {/* Status Footer */}
        <div className="bg-card rounded-lg p-4">
          <StatusFooter
            status={status as any}
            elapsedTime={elapsedTime}
            blockCount={blocks.length}
          />
        </div>
      </div>
    </div>
  );
};
