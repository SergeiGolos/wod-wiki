import type { Meta, StoryObj } from '@storybook/react';
import { WodScriptVisualizer } from '../../src/components/WodScriptVisualizer';
import { ICodeStatement } from '../../src/core/models/CodeStatement';
import { FragmentType } from '../../src/core/models/CodeFragment';
import React, { useState } from 'react';

const meta: Meta<typeof WodScriptVisualizer> = {
  title: 'Components/Visualization/WodScriptVisualizer',
  component: WodScriptVisualizer,
  parameters: {
    layout: 'padded',
  },

};

export default meta;
type Story = StoryObj<typeof WodScriptVisualizer>;

// Sample statements for testing
const sampleStatements: ICodeStatement[] = [
  {
    id: 1,
    children: [[2, 3, 4]],
    meta: { line: 1, column: 0, length: 20 },
    fragments: [
      { type: 'timer', fragmentType: FragmentType.Timer, value: 300000, image: '5:00' },
      { type: 'action', fragmentType: FragmentType.Action, value: 'AMRAP', image: 'AMRAP' },
    ],
  },
  {
    id: 2,
    parent: 1,
    children: [],
    meta: { line: 2, column: 2, length: 15 },
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pushups', image: 'Pushups' },
    ],
    isLeaf: true,
  },
  {
    id: 3,
    parent: 1,
    children: [],
    meta: { line: 3, column: 2, length: 15 },
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Air Squats', image: 'Air Squats' },
    ],
    isLeaf: true,
  },
  {
    id: 4,
    parent: 1,
    children: [],
    meta: { line: 4, column: 2, length: 15 },
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 20, image: '20x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Double Unders', image: 'Double Unders' },
    ],
    isLeaf: true,
  },
];

const roundsStatements: ICodeStatement[] = [
  {
    id: 10,
    children: [[11, 12, 13]],
    meta: { line: 1, column: 0, length: 10 },
    fragments: [
      { type: 'rounds', fragmentType: FragmentType.Rounds, value: 3, image: '3 Rounds' },
    ],
  },
  {
    id: 11,
    parent: 10,
    children: [],
    meta: { line: 2, column: 2, length: 20 },
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 21, image: '21x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Deadlift', image: 'Deadlift' },
      { type: 'resistance', fragmentType: FragmentType.Resistance, value: 225, image: '225 lb' },
    ],
    isLeaf: true,
  },
  {
    id: 12,
    parent: 10,
    children: [],
    meta: { line: 3, column: 2, length: 20 },
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Box Jump', image: 'Box Jump' },
      { type: 'distance', fragmentType: FragmentType.Distance, value: 24, image: '24 in' },
    ],
    isLeaf: true,
  },
  {
    id: 13,
    parent: 10,
    children: [],
    meta: { line: 4, column: 2, length: 15 },
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 9, image: '9x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Handstand Pushup', image: 'Handstand Pushup' },
    ],
    isLeaf: true,
  },
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
        story: 'Default display showing an array of statements rendered via UnifiedItemList.',
      },
    },
  },
};

/**
 * With active statements highlighted
 */
export const WithActiveStatements: Story = {
  args: {
    statements: sampleStatements,
    activeStatementIds: new Set([2, 3]),
  },
  parameters: {
    docs: {
      description: {
        story: 'Statements with IDs 2 and 3 are marked as active and highlighted.',
      },
    },
  },
};

/**
 * With a selected statement
 */
export const WithSelection: Story = {
  args: {
    statements: sampleStatements,
    selectedStatementId: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Statement ID 3 is selected and has selection styling applied.',
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
 * Interactive hover demonstration
 */
export const HoverInteraction: Story = {
  render: () => {
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Hovered Statement ID: <span className="font-mono font-bold">{hoveredId ?? 'None'}</span>
        </div>
        <WodScriptVisualizer
          statements={sampleStatements}
          onHover={setHoveredId}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Hover over statements to see the onHover callback in action.',
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
        story: 'Empty state displaying "No statements to display" message.',
      },
    },
  },
};

/**
 * Selection change callback
 */
export const SelectionChange: Story = {
  render: () => {
    const [selectedId, setSelectedId] = useState<number | null>(null);

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Selected Statement ID: <span className="font-mono font-bold">{selectedId ?? 'None'}</span>
        </div>
        <WodScriptVisualizer
          statements={sampleStatements}
          selectedStatementId={selectedId}
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
 * With custom render actions
 */
export const WithRenderActions: Story = {
  render: () => {
    return (
      <WodScriptVisualizer
        statements={sampleStatements}
        onRenderActions={(statement) => (
          <button
            className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20"
            onClick={(e) => {
              e.stopPropagation();
              alert(`Action for statement ${statement.id}`);
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
        story: 'Custom action buttons rendered for each statement via onRenderActions prop.',
      },
    },
  },
};

/**
 * Active and selected combined
 */
export const ActiveAndSelected: Story = {
  args: {
    statements: sampleStatements,
    activeStatementIds: new Set([2]),
    selectedStatementId: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Statement 2 is active, statement 3 is selected - showing both states.',
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
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [activeIds] = useState(new Set([2]));

    return (
      <div className="space-y-4">
        <div className="flex gap-4 text-sm">
          <div>
            Active: <span className="font-mono">2</span>
          </div>
          <div>
            Selected: <span className="font-mono font-bold">{selectedId ?? 'None'}</span>
          </div>
          <div>
            Hovered: <span className="font-mono">{hoveredId ?? 'None'}</span>
          </div>
        </div>
        <WodScriptVisualizer
          statements={sampleStatements}
          activeStatementIds={activeIds}
          selectedStatementId={selectedId}
          onSelectionChange={setSelectedId}
          onHover={setHoveredId}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Full interactive demonstration with active, selected, and hover states all working together.',
      },
    },
  },
};
