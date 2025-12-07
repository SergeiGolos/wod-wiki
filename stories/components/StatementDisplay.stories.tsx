import type { Meta, StoryObj } from '@storybook/react';
import { StatementDisplay, BlockDisplay, FragmentList } from '../../src/components/fragments/StatementDisplay';
import { FragmentType, ICodeFragment } from '../../src/core/models/CodeFragment';
import { ICodeStatement } from '../../src/core/models/CodeStatement';
import { Button } from '../../src/components/ui/button';
import React from 'react';

const meta: Meta<typeof StatementDisplay> = {
  title: 'Components/Fragments/StatementDisplay',
  component: StatementDisplay,
  parameters: {
    layout: 'padded',
  },

};

export default meta;
type Story = StoryObj<typeof StatementDisplay>;

// Sample statement data
const sampleStatement: ICodeStatement = {
  id: 1,
  children: [],
  meta: { line: 1, column: 0, length: 20 },
  fragments: [
    { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
    { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pushups', image: 'Pushups' },
  ],
};

const timerStatement: ICodeStatement = {
  id: 2,
  children: [],
  meta: { line: 2, column: 0, length: 15 },
  fragments: [
    { type: 'timer', fragmentType: FragmentType.Timer, value: 300000, image: '5:00' },
    { type: 'rounds', fragmentType: FragmentType.Rounds, value: 3, image: '3 Rounds' },
    { type: 'action', fragmentType: FragmentType.Action, value: 'AMRAP', image: 'AMRAP' },
  ],
};

const complexStatement: ICodeStatement = {
  id: 3,
  children: [],
  meta: { line: 3, column: 0, length: 30 },
  fragments: [
    { type: 'rep', fragmentType: FragmentType.Rep, value: 21, image: '21x' },
    { type: 'effort', fragmentType: FragmentType.Effort, value: 'Deadlift', image: 'Deadlift' },
    { type: 'resistance', fragmentType: FragmentType.Resistance, value: 225, image: '225 lb' },
    { type: 'distance', fragmentType: FragmentType.Distance, value: 0, image: '' },
  ],
};

/**
 * Default statement display
 */
export const Default: Story = {
  args: {
    statement: sampleStatement,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default display of a single statement with its fragments rendered via FragmentVisualizer.',
      },
    },
  },
};

/**
 * Active statement state
 */
export const ActiveState: Story = {
  args: {
    statement: sampleStatement,
    isActive: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Statement in active state with primary color background highlight.',
      },
    },
  },
};

/**
 * Grouped mode (no outer border)
 */
export const GroupedMode: Story = {
  args: {
    statement: sampleStatement,
    isGrouped: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Grouped mode removes outer border for use within statement groups.',
      },
    },
  },
};

/**
 * Compact mode
 */
export const CompactMode: Story = {
  args: {
    statement: sampleStatement,
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact mode with smaller padding for tighter layouts.',
      },
    },
  },
};

/**
 * Statement with action buttons
 */
export const WithActions: Story = {
  args: {
    statement: sampleStatement,
    actions: (
      <>
        <Button size="sm" variant="ghost">Edit</Button>
        <Button size="sm" variant="ghost">Delete</Button>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Statement with custom action buttons rendered on the right side.',
      },
    },
  },
};

/**
 * Clickable statement
 */
export const ClickableStatement: Story = {
  args: {
    statement: sampleStatement,
    onClick: () => alert('Statement clicked!'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Clickable statement showing cursor pointer. onClick handler triggers on click.',
      },
    },
  },
};

/**
 * Complex statement with multiple fragment types
 */
export const ComplexStatement: Story = {
  args: {
    statement: complexStatement,
  },
  parameters: {
    docs: {
      description: {
        story: 'Complex statement showing multiple fragment types including resistance and distance.',
      },
    },
  },
};

/**
 * Timer statement
 */
export const TimerStatement: Story = {
  args: {
    statement: timerStatement,
  },
  parameters: {
    docs: {
      description: {
        story: 'Statement with timer, rounds, and action fragments.',
      },
    },
  },
};

/**
 * Active and grouped combined
 */
export const ActiveGrouped: Story = {
  args: {
    statement: sampleStatement,
    isActive: true,
    isGrouped: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Statement that is both active and grouped, showing combined styling.',
      },
    },
  },
};

/**
 * Multiple statements in a list
 */
export const StatementList: Story = {
  render: () => (
    <div className="space-y-2">
      <StatementDisplay statement={timerStatement} />
      <StatementDisplay statement={sampleStatement} isActive />
      <StatementDisplay statement={complexStatement} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple statements displayed in a list with one marked as active.',
      },
    },
  },
};

// BlockDisplay stories
const blockMeta: Meta<typeof BlockDisplay> = {
  title: 'Components/Fragments/BlockDisplay',
  component: BlockDisplay,
};

/**
 * BlockDisplay component stories
 */
export const BlockDisplayDefault: StoryObj<typeof BlockDisplay> = {
  render: () => (
    <div className="space-y-2 border rounded-lg overflow-hidden">
      <BlockDisplay
        label="Pushups"
        blockType="effort"
        status="pending"
        metrics={[
          { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
        ]}
      />
      <BlockDisplay
        label="Squats"
        blockType="effort"
        status="active"
        metrics={[
          { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
        ]}
      />
      <BlockDisplay
        label="Burpees"
        blockType="effort"
        status="complete"
        metrics={[
          { type: 'rep', fragmentType: FragmentType.Rep, value: 20, image: '20x' },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'BlockDisplay showing different status states: pending, active, and complete.',
      },
    },
  },
};

/**
 * BlockDisplay with depth indentation
 */
export const BlockDisplayWithDepth: StoryObj<typeof BlockDisplay> = {
  render: () => (
    <div className="border rounded-lg overflow-hidden">
      <BlockDisplay
        label="AMRAP 10"
        blockType="timer"
        status="active"
        depth={0}
        metrics={[
          { type: 'timer', fragmentType: FragmentType.Timer, value: 600000, image: '10:00' },
        ]}
      />
      <BlockDisplay
        label="Round 1"
        blockType="rounds"
        status="complete"
        depth={1}
        metrics={[
          { type: 'rounds', fragmentType: FragmentType.Rounds, value: 1, image: 'Round 1' },
        ]}
      />
      <BlockDisplay
        label="Pushups"
        blockType="effort"
        status="complete"
        depth={2}
        metrics={[
          { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
        ]}
      />
      <BlockDisplay
        label="Squats"
        blockType="effort"
        status="running"
        depth={2}
        metrics={[
          { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'BlockDisplay showing nested hierarchy with depth-based indentation.',
      },
    },
  },
};

// FragmentList stories
/**
 * FragmentList component
 */
export const FragmentListDefault: StoryObj<typeof FragmentList> = {
  render: () => {
    const fragments: ICodeFragment[] = [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pushups', image: 'Pushups' },
      { type: 'resistance', fragmentType: FragmentType.Resistance, value: 0, image: 'bodyweight' },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Normal</h3>
          <FragmentList fragments={fragments} />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">Compact</h3>
          <FragmentList fragments={fragments} compact />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">Empty</h3>
          <FragmentList fragments={[]} />
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'FragmentList showing fragments in normal and compact modes, plus empty state.',
      },
    },
  },
};
