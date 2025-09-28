import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MdTimerRuntime } from '../../src/parser/md-timer';

// Demonstration component for children grouping functionality
const ChildrenGroupingDemo: React.FC = () => {
  const runtime = new MdTimerRuntime();
  
  // Test scenarios demonstrating consecutive compose grouping behavior
  const scenarios = [
    {
      title: "Mixed Lap Fragments",
      syntax: `parent workout
  - round child 1 [3:00]
  regular child 2 10x burpees  
  + compose child 3 moderate effort
  + compose child 4 high intensity
  regular child 5 rest [1:00]`,
      expectedGrouping: [[1], [2], [3, 4], [5]],
      description: "Consecutive compose fragments (+ child 3, + child 4) are grouped together"
    },
    {
      title: "All Compose Fragments", 
      syntax: `workout
  + child 1 push ups
  + child 2 pull ups  
  + child 3 sit ups
  + child 4 squats`,
      expectedGrouping: [[1, 2, 3, 4]],
      description: "All consecutive compose fragments form a single group"
    },
    {
      title: "No Compose Fragments",
      syntax: `workout
  - round 1 [5:00]
  round 2 10x burpees
  - round 3 [2:00] rest`,
      expectedGrouping: [[1], [2], [3]], 
      description: "Round (-) and repeat (no prefix) fragments are individual groups"
    }
  ];

  const parseAndDisplay = (syntax: string) => {
    try {
      const result = runtime.read(syntax);
      return result.statements;
    } catch (error) {
      return [{ SyntaxError: error instanceof Error ? error.message : String(error) }];
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Children Grouping Demonstration</h1>
        <p className="text-gray-600">
          This story demonstrates the new children grouping behavior where consecutive compose lap fragments (+) 
          are grouped together in arrays, while round (-) and repeat (no prefix) fragments remain as individual arrays.
        </p>
      </div>

      {scenarios.map((scenario, index) => {
        const result = parseAndDisplay(scenario.syntax);
        const parentStatement = Array.isArray(result) ? 
          result.find(stmt => 'children' in stmt && stmt.children && stmt.children.length > 0) : null;

        return (
          <div key={index} className="border rounded-lg p-4 bg-gray-50">
            <h2 className="text-lg font-semibold mb-2">{scenario.title}</h2>
            <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-1">Input Syntax:</h3>
                <pre className="bg-white p-2 rounded text-sm border overflow-x-auto">
{scenario.syntax}
                </pre>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Result:</h3>
                <div className="bg-white p-2 rounded text-sm border">
                  {parentStatement && 'children' in parentStatement ? (
                    <div>
                      <div className="text-green-600 font-mono">
                        children: {JSON.stringify(parentStatement.children)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Expected: {JSON.stringify(scenario.expectedGrouping)}
                      </div>
                      <div className="text-xs mt-1">
                        {JSON.stringify(parentStatement.children) === JSON.stringify(scenario.expectedGrouping) ? 
                          <span className="text-green-600">✅ Match</span> : 
                          <span className="text-red-600">❌ Mismatch</span>
                        }
                      </div>
                    </div>
                  ) : (
                    <div className="text-orange-600">
                      No parent statement with children found
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <h3 className="font-medium mb-1">Full Parser Output:</h3>
              <pre className="bg-white p-2 rounded text-xs border overflow-x-auto max-h-32">
{JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        );
      })}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Key Changes</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><code>ICodeStatement.children</code> changed from <code>number[]</code> to <code>number[][]</code></li>
          <li>Consecutive compose fragments (<code>+</code>) are grouped into single arrays</li>
          <li>Round (<code>-</code>) and repeat (no prefix) fragments remain as individual arrays</li>
          <li>Sequential order is preserved within and between groups</li>
        </ul>
      </div>
    </div>
  );
};

const meta: Meta<typeof ChildrenGroupingDemo> = {
  title: 'Parser/Children Grouping',
  component: ChildrenGroupingDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Demonstrates the new children grouping behavior for consecutive compose lap fragments.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Consecutive Compose Grouping',
  parameters: {
    docs: {
      description: {
        story: 'Shows how consecutive compose lap fragments (+) are grouped together while maintaining individual arrays for round (-) and repeat fragments.',
      },
    },
  },
};