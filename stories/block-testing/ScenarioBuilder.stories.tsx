/**
 * Block Test Scenario Builder Stories
 * 
 * Interactive testing workbench for building and executing
 * block lifecycle test scenarios.
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

## Use Cases

- **Mount Phase**: Test block initialization, memory allocation, child pushing
- **Next Phase**: Test iteration logic, completion detection, state transitions
- **Unmount Phase**: Test cleanup, memory release, metric emission
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

// ==================== DEFAULT STORY ====================

export const Default: Story = {
  args: {
    initialScript: '5 Pullups'
  }
};

// ==================== ROUNDS SCENARIO ====================

export const RoundsScenario: Story = {
  args: {
    initialScript: `3 Rounds
  10 Pushups
  15 Squats
  20 Situps`
  },
  parameters: {
    docs: {
      description: {
        story: 'Test a rounds block with multiple children. Select the "3 Rounds" statement and test next() to see iteration behavior.'
      }
    }
  }
};

// ==================== TIMER SCENARIO ====================

export const TimerScenario: Story = {
  args: {
    initialScript: `10:00 Timer
  5 Pullups
  10 Pushups
  15 Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'Test a timer block. Use setup actions to set elapsed time and test completion behavior.'
      }
    }
  }
};

// ==================== AMRAP SCENARIO ====================

export const AmrapScenario: Story = {
  args: {
    initialScript: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'Test an AMRAP (time-bound rounds) block. This combines timer and rounds behavior.'
      }
    }
  }
};

// ==================== EMOM SCENARIO ====================

export const EmomScenario: Story = {
  args: {
    initialScript: `EMOM 10
  3 Cleans
  6 Front Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'Test an EMOM (every minute on the minute) block with interval behavior.'
      }
    }
  }
};

// ==================== REP SCHEME SCENARIO ====================

export const RepSchemeScenario: Story = {
  args: {
    initialScript: `21-15-9
  Thrusters
  Pullups`
  },
  parameters: {
    docs: {
      description: {
        story: 'Test a rep scheme block (like Fran). Test how rep counts are inherited by child efforts.'
      }
    }
  }
};

// ==================== INTERACTIVE WITH SAVE ====================

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

// ==================== PRE-LOADED SCENARIO ====================

const preloadedScenario: ScenarioDefinition = {
  id: 'rounds-mid-iteration',
  name: 'Rounds Mid-Iteration Test',
  description: 'Tests next() behavior when rounds block is in the middle of iteration 2 of 3',
  wodScript: `3 Rounds
  10 Pushups
  15 Squats`,
  targetStatementId: 1, // The "3 Rounds" statement
  includeChildren: true,
  setupActions: [
    { 
      type: 'setLoopIndex', 
      params: { 
        blockKey: '{{currentBlock}}', 
        currentIndex: 1, 
        totalIterations: 3 
      } 
    }
  ],
  testPhase: 'next'
};

export const PreloadedScenario: Story = {
  args: {
    initialScenario: preloadedScenario
  },
  parameters: {
    docs: {
      description: {
        story: 'Pre-loaded scenario demonstrating how to test rounds block mid-iteration.'
      }
    }
  }
};

// ==================== EFFORT COMPLETION TEST ====================

const effortCompletionScenario: ScenarioDefinition = {
  id: 'effort-completion',
  name: 'Effort Completion Test',
  description: 'Tests that effort block completes when currentReps reaches targetReps',
  wodScript: '10 Pushups',
  targetStatementId: 1,
  includeChildren: false,
  setupActions: [
    {
      type: 'setEffortState',
      params: {
        blockKey: '{{currentBlock}}',
        currentReps: 9,
        targetReps: 10
      }
    }
  ],
  testPhase: 'next'
};

export const EffortCompletionTest: Story = {
  args: {
    initialScenario: effortCompletionScenario
  },
  parameters: {
    docs: {
      description: {
        story: 'Pre-configured scenario testing effort block completion detection.'
      }
    }
  }
};

// ==================== TIMER EXPIRATION TEST ====================

const timerExpirationScenario: ScenarioDefinition = {
  id: 'timer-expiration',
  name: 'Timer Expiration Test',
  description: 'Tests timer block behavior when elapsed time exceeds duration',
  wodScript: `1:00 Timer
  10 Pushups`,
  targetStatementId: 1,
  includeChildren: true,
  setupActions: [
    {
      type: 'setTimerState',
      params: {
        blockKey: '{{currentBlock}}',
        elapsedMs: 61000,
        totalMs: 60000
      }
    }
  ],
  testPhase: 'next'
};

export const TimerExpirationTest: Story = {
  args: {
    initialScenario: timerExpirationScenario
  },
  parameters: {
    docs: {
      description: {
        story: 'Pre-configured scenario testing timer block expiration behavior.'
      }
    }
  }
};
