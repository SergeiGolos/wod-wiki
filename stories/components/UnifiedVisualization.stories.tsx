import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedItemList, UnifiedItemRow } from '../../src/components/unified';
import { IDisplayItem } from '../../src/core/models/DisplayItem';
import { FragmentType } from '../../src/core/models/CodeFragment';

const meta: Meta<typeof UnifiedItemList> = {
  title: 'Components/Unified Visualization',
  component: UnifiedItemList,
  parameters: {
    layout: 'padded',
  },

};

export default meta;
type Story = StoryObj<typeof UnifiedItemList>;

// Sample items representing different states and types
const sampleItems: IDisplayItem[] = [
  {
    id: '1',
    parentId: null,
    fragments: [
      { type: 'timer', fragmentType: FragmentType.Timer, value: 300000, image: '5:00' },
      { type: 'rounds', fragmentType: FragmentType.Rounds, value: 3, image: '3 Rounds' },
    ],
    depth: 0,
    isHeader: true,
    status: 'completed',
    sourceType: 'span',
    sourceId: '1',
    startTime: Date.now() - 600000,
    endTime: Date.now() - 300000,
    duration: 300000,
    label: 'AMRAP 5'
  },
  {
    id: '2',
    parentId: '1',
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pushups', image: 'Pushups' },
    ],
    depth: 1,
    isHeader: false,
    status: 'completed',
    sourceType: 'span',
    sourceId: '2',
    startTime: Date.now() - 580000,
    endTime: Date.now() - 550000,
    duration: 30000,
    label: '10 Pushups'
  },
  {
    id: '3',
    parentId: '1',
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Air Squats', image: 'Air Squats' },
    ],
    depth: 1,
    isHeader: false,
    status: 'completed',
    sourceType: 'span',
    sourceId: '3',
    startTime: Date.now() - 550000,
    endTime: Date.now() - 500000,
    duration: 50000,
    label: '15 Air Squats'
  },
  {
    id: '4',
    parentId: '1',
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 20, image: '20x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Double Unders', image: 'Double Unders' },
    ],
    depth: 1,
    isHeader: false,
    status: 'active',
    sourceType: 'span',
    sourceId: '4',
    startTime: Date.now() - 500000,
    label: '20 Double Unders'
  },
  {
    id: '5',
    parentId: null,
    fragments: [
      { type: 'timer', fragmentType: FragmentType.Timer, value: 60000, image: '1:00' },
      { type: 'action', fragmentType: FragmentType.Action, value: 'Rest', image: 'Rest' },
    ],
    depth: 0,
    isHeader: false,
    status: 'pending',
    sourceType: 'span',
    sourceId: '5',
    label: 'Rest 1 min'
  },
];

// Linked items example (for parser view)
const linkedItems: IDisplayItem[] = [
  {
    id: '10',
    parentId: null,
    fragments: [
      { type: 'rounds', fragmentType: FragmentType.Rounds, value: 3, image: '3 Rounds' },
    ],
    depth: 0,
    isHeader: true,
    status: 'pending',
    sourceType: 'statement',
    sourceId: 10,
    label: '3 Rounds'
  },
  {
    id: '11',
    parentId: '10',
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Deadlift', image: 'Deadlift' },
      { type: 'resistance', fragmentType: FragmentType.Resistance, value: 225, image: '225 lb' },
    ],
    depth: 1,
    isHeader: false,
    isLinked: true,
    status: 'pending',
    sourceType: 'statement',
    sourceId: 11,
    label: '10 Deadlift @ 225lb'
  },
  {
    id: '12',
    parentId: '10',
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Box Jump', image: 'Box Jump' },
      { type: 'distance', fragmentType: FragmentType.Distance, value: 24, image: '24 in' },
    ],
    depth: 1,
    isHeader: false,
    isLinked: true,
    status: 'pending',
    sourceType: 'statement',
    sourceId: 12,
    label: '15 Box Jump 24in'
  },
  {
    id: '13',
    parentId: '10',
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 20, image: '20x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pull-ups', image: 'Pull-ups' },
    ],
    depth: 1,
    isHeader: false,
    isLinked: true,
    status: 'pending',
    sourceType: 'statement',
    sourceId: 13,
    label: '20 Pull-ups'
  },
];

// Failed/Skipped states
const mixedStatusItems: IDisplayItem[] = [
  {
    id: '20',
    parentId: null,
    fragments: [
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Warm-up', image: 'Warm-up' },
    ],
    depth: 0,
    isHeader: true,
    status: 'completed',
    sourceType: 'span',
    sourceId: '20',
    label: 'Warm-up'
  },
  {
    id: '21',
    parentId: '20',
    fragments: [
      { type: 'distance', fragmentType: FragmentType.Distance, value: 400, image: '400m' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Run', image: 'Run' },
    ],
    depth: 1,
    isHeader: false,
    status: 'completed',
    sourceType: 'span',
    sourceId: '21',
    duration: 120000,
    label: '400m Run'
  },
  {
    id: '22',
    parentId: '20',
    fragments: [
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Stretching', image: 'Stretching' },
    ],
    depth: 1,
    isHeader: false,
    status: 'skipped',
    sourceType: 'span',
    sourceId: '22',
    label: 'Stretching'
  },
  {
    id: '23',
    parentId: null,
    fragments: [
      { type: 'timer', fragmentType: FragmentType.Timer, value: 600000, image: '10:00' },
      { type: 'action', fragmentType: FragmentType.Action, value: 'AMRAP', image: 'AMRAP' },
    ],
    depth: 0,
    isHeader: true,
    status: 'failed',
    sourceType: 'span',
    sourceId: '23',
    label: 'AMRAP 10 (Failed)'
  },
];

export const BasicList: Story = {
  args: {
    items: sampleItems,
    emptyMessage: 'No items'
  },
};

export const WithTimestamps: Story = {
  args: {
    items: sampleItems,
    showTimestamps: true,
    showDurations: true,
  },
};

export const CompactMode: Story = {
  args: {
    items: sampleItems,
    compact: true,
    showDurations: true,
  },
};

export const LinkedGroups: Story = {
  args: {
    items: linkedItems,
    groupLinked: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows how linked items (from + statements in parser) are grouped together.'
      }
    }
  }
};

export const MixedStatuses: Story = {
  args: {
    items: mixedStatusItems,
    showDurations: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates completed, skipped, and failed status indicators.'
      }
    }
  }
};

export const EmptyState: Story = {
  args: {
    items: [],
    emptyMessage: 'No workout items to display',
  },
};

export const WithActiveItem: Story = {
  args: {
    items: sampleItems,
    activeItemId: '4',
    autoScroll: true,
    showDurations: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows active item highlighting with auto-scroll enabled.'
      }
    }
  }
};

export const WithMaxHeight: Story = {
  args: {
    items: [...sampleItems, ...linkedItems, ...mixedStatusItems],
    maxHeight: 300,
    autoScroll: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'List with constrained height showing scroll behavior.'
      }
    }
  }
};

// Individual row component story
export const SingleRow: StoryObj<typeof UnifiedItemRow> = {
  render: () => (
    <div className="space-y-2 p-4 bg-background">
      <UnifiedItemRow
        item={sampleItems[0]}
        showTimestamp
        showDuration
      />
      <UnifiedItemRow
        item={sampleItems[1]}
        showDuration
      />
      <UnifiedItemRow
        item={sampleItems[3]}
        isHighlighted
      />
      <UnifiedItemRow
        item={mixedStatusItems[2]}
        compact
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Individual UnifiedItemRow components in various states.'
      }
    }
  }
};
