import type { Meta, StoryObj } from '@storybook/react';
import { WodScriptVisualizer } from '../../src/components/WodScriptVisualizer';
import { ParsedCodeStatement } from '../../src/core/models/CodeStatement';
import { FragmentType } from '../../src/core/models/CodeFragment';
import { useState } from 'react';

const meta: Meta<typeof WodScriptVisualizer> = {
  title: 'Components/Visualization/WodScriptVisualizer',
  component: WodScriptVisualizer,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof WodScriptVisualizer>;

// Helper to create well-typed statements
function stmt(init: Partial<ParsedCodeStatement>): ParsedCodeStatement {
  return new ParsedCodeStatement(init);
}

// Sample statements for testing
const sampleStatements = [
  stmt({
    id: 1,
    children: [[2, 3, 4]],
    fragments: [
      { type: 'timer', fragmentType: FragmentType.Timer, value: 300000, image: '5:00' },
      { type: 'action', fragmentType: FragmentType.Action, value: 'AMRAP', image: 'AMRAP' },
    ],
  }),
  stmt({
    id: 2,
    parent: 1,
    children: [],
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pushups', image: 'Pushups' },
    ],
    isLeaf: true,
  }),
  stmt({
    id: 3,
    parent: 1,
    children: [],
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Air Squats', image: 'Air Squats' },
    ],
    isLeaf: true,
  }),
  stmt({
    id: 4,
    parent: 1,
    children: [],
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 20, image: '20x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Double Unders', image: 'Double Unders' },
    ],
    isLeaf: true,
  }),
];

const roundsStatements = [
  stmt({
    id: 10,
    children: [[11, 12, 13]],
    fragments: [
      { type: 'rounds', fragmentType: FragmentType.Rounds, value: 3, image: '3 Rounds' },
    ],
  }),
  stmt({
    id: 11,
    parent: 10,
    children: [],
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 21, image: '21x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Deadlift', image: 'Deadlift' },
      { type: 'resistance', fragmentType: FragmentType.Resistance, value: 225, image: '225 lb' },
    ],
    isLeaf: true,
  }),
  stmt({
    id: 12,
    parent: 10,
    children: [],
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Box Jump', image: 'Box Jump' },
      { type: 'distance', fragmentType: FragmentType.Distance, value: 24, image: '24 in' },
    ],
    isLeaf: true,
  }),
  stmt({
    id: 13,
    parent: 10,
    children: [],
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 9, image: '9x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Handstand Pushup', image: 'Handstand Pushup' },
    ],
    isLeaf: true,
  }),
];

/**
 * Default visualizer with statements
 */
export const Default: Story = {
  args: {
    statements: sampleStatements,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default display showing an array of statements rendered via FragmentSourceList.',
      },
    },
  },
};

/**
 * Compact display mode
 */
export const CompactMode: Story = {
  args: {
    statements: sampleStatements,
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact mode with reduced spacing and sizes.',
      },
    },
  },
};

/**
 * Empty statements array
 */
export const EmptyStatements: Story = {
  args: {
    statements: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state displaying the empty message.',
      },
    },
  },
};

/**
 * Selection change callback
 */
export const SelectionChange: Story = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Selected Statement ID: <span className="font-mono font-bold">{selectedId ?? 'None'}</span>
        </div>
        <WodScriptVisualizer
          statements={sampleStatements}
          selectedLine={selectedId ? Number(selectedId) : undefined}
          onSelectionChange={setSelectedId}
        />
        <p className="text-xs text-muted-foreground">
          Click on a statement to select it
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Click statements to change selection. Shows onSelectionChange callback.',
      },
    },
  },
};

/**
 * Rounds-based workout
 */
export const RoundsWorkout: Story = {
  args: {
    statements: roundsStatements,
  },
  parameters: {
    docs: {
      description: {
        story: 'A rounds-based workout structure (e.g., CrossFit "Diane").',
      },
    },
  },
};

/**
 * With render actions
 */
export const WithRenderActions: Story = {
  render: () => {
    return (
      <WodScriptVisualizer
        statements={sampleStatements}
        renderActions={(entry) => (
          <button
            className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20"
            onClick={(e) => {
              e.stopPropagation();
              alert(`Action for entry ${entry.source.id}`);
            }}
          >
            Edit
          </button>
        )}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom action buttons rendered for each entry via renderActions prop.',
      },
    },
  },
};

/**
 * With custom className
 */
export const WithCustomClassName: Story = {
  args: {
    statements: sampleStatements,
    className: 'p-4 bg-slate-50 rounded-lg border border-slate-200',
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom className applied for additional container styling.',
      },
    },
  },
};

/**
 * Full interactive demo
 */
export const FullInteractiveDemo: Story = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
      <div className="space-y-4">
        <div className="flex gap-4 text-sm">
          <div>
            Selected: <span className="font-mono font-bold">{selectedId ?? 'None'}</span>
          </div>
        </div>
        <WodScriptVisualizer
          statements={sampleStatements}
          selectedLine={selectedId ? Number(selectedId) : undefined}
          onSelectionChange={setSelectedId}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Full interactive demonstration with selection state.',
      },
    },
  },
};
