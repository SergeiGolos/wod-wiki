/**
 * Block Test Scenario Builder Stories
 * 
 * Interactive testing workbench for building and executing
 * block lifecycle test scenarios.
 * 
 * For block-type specific tests, see the dedicated story files:
 * - AMRAP.stories.tsx
 * - EMOM.stories.tsx
 * - Timer.stories.tsx
 * - Rounds.stories.tsx
 * - Group.stories.tsx
 * - Effort.stories.tsx
 */

import type { Meta, StoryObj } from '@storybook/react';
import { 
  BlockTestScenarioBuilder, 
  ScenarioDefinition,
  ScenarioExecutionResult 
} from '@/runtime/testing';
import React, { useState } from 'react';

const meta: Meta<typeof BlockTestScenarioBuilder> = {
  title: 'Block Testing/Scenario Builder',
  component: BlockTestScenarioBuilder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Block Test Scenario Builder

Interactive workbench for creating, configuring, and executing block lifecycle test scenarios.

## Features

- **WOD Script Editor**: Enter workout script to parse
- **Statement Selection**: Click parsed statements to select target for compilation
- **Setup Actions**: Add actions to configure block state before testing
- **Phase Selection**: Choose mount/next/unmount phase to test
- **Before/After Diff**: Visual comparison of state changes
- **Export/Import**: Save scenarios as JSON for regression testing

## Workflow

1. Enter a WOD script in the editor
2. Click a statement in the parsed view to select it as the test target
3. Add setup actions to configure initial state (e.g., set loop index, timer elapsed)
4. Select the lifecycle phase to test (mount, next, or unmount)
5. Click "Execute" to run the test
6. Review the before/after state diff
7. Export the scenario for future use

## Block-Type Specific Tests

For pre-configured test scenarios, see the dedicated story files:
- **AMRAP Block**: Time-bound rounds tests
- **EMOM Block**: Interval workout tests
- **Timer Block**: Time-capped workout tests
- **Rounds Block**: Multi-round and rep scheme tests
- **Group Block**: Container/structural tests
- **Effort Block**: Basic movement tests
        `
      }
    }
  },
  argTypes: {
    initialScript: { control: 'text' },
    className: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== DEFAULT INTERACTIVE BUILDER ====================

export const Default: Story = {
  args: {
    initialScript: '5 Pullups'
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic interactive scenario builder. Enter any WOD script and test block lifecycle phases.'
      }
    }
  }
};

// ==================== FULL INTERACTIVE MODE WITH SAVE ====================

const InteractiveWithSaveRender: React.FC = () => {
  const [savedScenarios, setSavedScenarios] = useState<ScenarioDefinition[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioDefinition | undefined>();
  const [results, setResults] = useState<ScenarioExecutionResult[]>([]);
  
  const handleSave = (scenario: ScenarioDefinition) => {
    setSavedScenarios(prev => {
      const existing = prev.findIndex(s => s.id === scenario.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = scenario;
        return updated;
      }
      return [...prev, scenario];
    });
  };
  
  const handleExecute = (result: ScenarioExecutionResult) => {
    setResults(prev => [...prev, result]);
  };
  
  return (
    <div className="space-y-4">
      {/* Saved scenarios sidebar */}
      {savedScenarios.length > 0 && (
        <div className="p-3 bg-gray-100 rounded">
          <h4 className="font-medium mb-2">Saved Scenarios ({savedScenarios.length})</h4>
          <div className="flex flex-wrap gap-2">
            {savedScenarios.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedScenario(s)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedScenario?.id === s.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border hover:bg-gray-50'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Main builder */}
      <BlockTestScenarioBuilder
        initialScript="5 Pullups"
        initialScenario={selectedScenario}
        onSaveScenario={handleSave}
        onExecute={handleExecute}
      />
      
      {/* Execution history */}
      {results.length > 0 && (
        <div className="p-3 bg-gray-100 rounded">
          <h4 className="font-medium mb-2">Execution History ({results.length})</h4>
          <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
            {results.slice(-10).reverse().map((r, i) => (
              <div 
                key={i}
                className={`p-2 rounded ${r.success ? 'bg-green-50' : 'bg-red-50'}`}
              >
                <span className={r.success ? 'text-green-600' : 'text-red-600'}>
                  {r.success ? '✓' : '✗'}
                </span>
                <span className="ml-2">{r.scenario.name}</span>
                <span className="ml-2 text-gray-500">
                  ({r.scenario.testPhase}) - {r.executionTimeMs.toFixed(1)}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const InteractiveWithSave: Story = {
  render: () => <InteractiveWithSaveRender />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive mode with scenario saving and execution history tracking.'
      }
    }
  }
};
