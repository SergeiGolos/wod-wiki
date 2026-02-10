import type { Meta, StoryObj } from '@storybook/react';
import { FragmentSourceList } from '../../src/components/unified/FragmentSourceList';
import { FragmentSourceRow, FragmentSourceEntry } from '../../src/components/unified/FragmentSourceRow';
import { FragmentType } from '../../src/core/models/CodeFragment';
import { SimpleFragmentSource } from '../../src/core/utils/SimpleFragmentSource';

const meta: Meta<typeof FragmentSourceList> = {
  title: 'Components/Unified Visualization',
  component: FragmentSourceList,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof FragmentSourceList>;

// Sample entries representing different states and types
const sampleEntries: FragmentSourceEntry[] = [
  {
    source: new SimpleFragmentSource('1', [
      { type: 'timer', fragmentType: FragmentType.Timer, value: 300000, image: '5:00' },
      { type: 'rounds', fragmentType: FragmentType.Rounds, value: 3, image: '3 Rounds' },
    ]),
    depth: 0,
    isHeader: true,
    status: 'completed',
    startTime: Date.now() - 600000,
    endTime: Date.now() - 300000,
    duration: 300000,
    label: 'AMRAP 5'
  },
  {
    source: new SimpleFragmentSource('2', [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pushups', image: 'Pushups' },
    ]),
    depth: 1,
    status: 'completed',
    startTime: Date.now() - 580000,
    endTime: Date.now() - 550000,
    duration: 30000,
    label: '10 Pushups'
  },
  {
    source: new SimpleFragmentSource('3', [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Air Squats', image: 'Air Squats' },
    ]),
    depth: 1,
    status: 'completed',
    startTime: Date.now() - 550000,
    endTime: Date.now() - 500000,
    duration: 50000,
    label: '15 Air Squats'
  },
  {
    source: new SimpleFragmentSource('4', [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 20, image: '20x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Double Unders', image: 'Double Unders' },
    ]),
    depth: 1,
    status: 'active',
    isLeaf: true,
    startTime: Date.now() - 500000,
    label: '20 Double Unders'
  },
  {
    source: new SimpleFragmentSource('5', [
      { type: 'timer', fragmentType: FragmentType.Timer, value: 60000, image: '1:00' },
      { type: 'action', fragmentType: FragmentType.Action, value: 'Rest', image: 'Rest' },
    ]),
    depth: 0,
    status: 'pending',
    label: 'Rest 1 min'
  },
];

// Linked items example (for parser view)
const linkedEntries: FragmentSourceEntry[] = [
  {
    source: new SimpleFragmentSource('10', [
      { type: 'rounds', fragmentType: FragmentType.Rounds, value: 3, image: '3 Rounds' },
    ]),
    depth: 0,
    isHeader: true,
    status: 'pending',
    label: '3 Rounds'
  },
  {
    source: new SimpleFragmentSource('11', [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Deadlift', image: 'Deadlift' },
      { type: 'resistance', fragmentType: FragmentType.Resistance, value: 225, image: '225 lb' },
    ]),
    depth: 1,
    isLinked: true,
    status: 'pending',
    label: '10 Deadlift @ 225lb'
  },
  {
    source: new SimpleFragmentSource('12', [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Box Jump', image: 'Box Jump' },
      { type: 'distance', fragmentType: FragmentType.Distance, value: 24, image: '24 in' },
    ]),
    depth: 1,
    isLinked: true,
    status: 'pending',
    label: '15 Box Jump 24in'
  },
  {
    source: new SimpleFragmentSource('13', [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 20, image: '20x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pull-ups', image: 'Pull-ups' },
    ]),
    depth: 1,
    isLinked: true,
    status: 'pending',
    label: '20 Pull-ups'
  },
];

// Failed/Skipped states
const mixedStatusEntries: FragmentSourceEntry[] = [
  {
    source: new SimpleFragmentSource('20', [
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Warm-up', image: 'Warm-up' },
    ]),
    depth: 0,
    isHeader: true,
    status: 'completed',
    label: 'Warm-up'
  },
  {
    source: new SimpleFragmentSource('21', [
      { type: 'distance', fragmentType: FragmentType.Distance, value: 400, image: '400m' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Run', image: 'Run' },
    ]),
    depth: 1,
    status: 'completed',
    duration: 120000,
    label: '400m Run'
  },
  {
    source: new SimpleFragmentSource('22', [
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Stretching', image: 'Stretching' },
    ]),
    depth: 1,
    status: 'skipped',
    label: 'Stretching'
  },
  {
    source: new SimpleFragmentSource('23', [
      { type: 'timer', fragmentType: FragmentType.Timer, value: 600000, image: '10:00' },
      { type: 'action', fragmentType: FragmentType.Action, value: 'AMRAP', image: 'AMRAP' },
    ]),
    depth: 0,
    isHeader: true,
    status: 'failed',
    label: 'AMRAP 10 (Failed)'
  },
];

export const BasicList: Story = {
  args: {
    entries: sampleEntries,
    emptyMessage: 'No items'
  },
};

export const WithDurations: Story = {
  args: {
    entries: sampleEntries,
    showDurations: true,
  },
};

export const CompactMode: Story = {
  args: {
    entries: sampleEntries,
    size: 'compact',
    showDurations: true,
  },
};

export const LinkedGroups: Story = {
  args: {
    entries: linkedEntries,
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
    entries: mixedStatusEntries,
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
    entries: [],
    emptyMessage: 'No workout items to display',
  },
};

export const WithActiveItem: Story = {
  args: {
    entries: sampleEntries,
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
    entries: [...sampleEntries, ...linkedEntries, ...mixedStatusEntries],
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
export const SingleRow: StoryObj<typeof FragmentSourceRow> = {
  render: () => (
    <div className="space-y-2 p-4 bg-background">
      <FragmentSourceRow
        source={sampleEntries[0].source}
        status="completed"
        depth={0}
        isHeader
        showDuration
        duration={300000}
      />
      <FragmentSourceRow
        source={sampleEntries[1].source}
        status="completed"
        depth={1}
        showDuration
        duration={30000}
      />
      <FragmentSourceRow
        source={sampleEntries[3].source}
        status="active"
        isHighlighted
        depth={1}
      />
      <FragmentSourceRow
        source={mixedStatusEntries[2].source}
        status="skipped"
        size="compact"
        depth={1}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Individual FragmentSourceRow components in various states.'
      }
    }
  }
};
