import type { Meta, StoryObj } from '@storybook/react';
import { FragmentVisualizer } from '../../src/views/runtime/FragmentVisualizer';
import { FragmentType } from '../../src/core/models/CodeFragment';
import type { ParseError } from '../../src/views/runtime/types';

const meta: Meta<typeof FragmentVisualizer> = {
  title: 'Components/Runtime/FragmentVisualizer',
  component: FragmentVisualizer,
  parameters: {
    layout: 'padded',
  },

};

export default meta;
type Story = StoryObj<typeof FragmentVisualizer>;

// Sample fragments for different scenarios
const mixedFragments = [
  { type: 'timer', fragmentType: FragmentType.Timer, value: 300000, image: '5:00' },
  { type: 'rounds', fragmentType: FragmentType.Rounds, value: 3, image: '3 Rounds' },
  { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
  { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pushups', image: 'Pushups' },
];

const timerFragments = [
  { type: 'timer', fragmentType: FragmentType.Timer, value: 60000, image: '1:00' },
  { type: 'timer', fragmentType: FragmentType.Timer, value: 120000, image: '2:00' },
  { type: 'timer', fragmentType: FragmentType.Timer, value: 300000, image: '5:00' },
];

const roundsFragments = [
  { type: 'rounds', fragmentType: FragmentType.Rounds, value: 3, image: '3 Rounds' },
  { type: 'rounds', fragmentType: FragmentType.Rounds, value: 5, image: '5 Rounds' },
  { type: 'rounds', fragmentType: FragmentType.Rounds, value: 10, image: '10 Rounds' },
];

const allFragmentTypes = [
  { type: 'timer', fragmentType: FragmentType.Timer, value: 300000, image: '5:00' },
  { type: 'rounds', fragmentType: FragmentType.Rounds, value: 3, image: '3 Rounds' },
  { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
  { type: 'effort', fragmentType: FragmentType.Effort, value: 'Burpees', image: 'Burpees' },
  { type: 'distance', fragmentType: FragmentType.Distance, value: 400, image: '400m' },
  { type: 'resistance', fragmentType: FragmentType.Resistance, value: 135, image: '135 lb' },
  { type: 'action', fragmentType: FragmentType.Action, value: 'AMRAP', image: 'AMRAP' },
];

const sampleError: ParseError = {
  message: 'Unexpected token at position 15',
  line: 3,
  column: 15,
  excerpt: '10x Pushups\n15x Squats\n>>> invalid syntax <<<',
};

/**
 * Default display with mixed fragment types
 */
export const Default: Story = {
  args: {
    fragments: mixedFragments,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default display showing mixed fragment types with appropriate icons and colors.',
      },
    },
  },
};

/**
 * Empty fragments array
 */
export const EmptyFragments: Story = {
  args: {
    fragments: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state showing "No fragments to display" message.',
      },
    },
  },
};

/**
 * Error state with parse error
 */
export const WithParseError: Story = {
  args: {
    fragments: [],
    error: sampleError,
  },
  parameters: {
    docs: {
      description: {
        story: 'Error panel displayed when a parse error is provided. Shows message, line, column, and code excerpt.',
      },
    },
  },
};

/**
 * Compact mode for tighter displays
 */
export const CompactMode: Story = {
  args: {
    fragments: mixedFragments,
    compact: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact mode with smaller padding and reduced font sizes for tighter layouts.',
      },
    },
  },
};

/**
 * Timer-only fragments
 */
export const TimerFragments: Story = {
  args: {
    fragments: timerFragments,
  },
  parameters: {
    docs: {
      description: {
        story: 'Timer fragments display with ⏱️ icon and orange color scheme.',
      },
    },
  },
};

/**
 * Rounds-only fragments
 */
export const RoundsFragments: Story = {
  args: {
    fragments: roundsFragments,
  },
  parameters: {
    docs: {
      description: {
        story: 'Rounds fragments display with 🔄 icon and proper color scheme.',
      },
    },
  },
};

/**
 * All fragment types combined
 */
export const MixedFragments: Story = {
  args: {
    fragments: allFragmentTypes,
  },
  parameters: {
    docs: {
      description: {
        story: 'All available fragment types displayed together: Timer, Rounds, Effort, Rep, Distance, Resistance, and Action.',
      },
    },
  },
};

/**
 * Error with minimal info
 */
export const MinimalError: Story = {
  args: {
    fragments: [],
    error: {
      message: 'Parse error occurred',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Error display with only a message, no line/column/excerpt.',
      },
    },
  },
};

/**
 * With custom className
 */
export const WithCustomClassName: Story = {
  args: {
    fragments: mixedFragments,
    className: 'p-4 bg-slate-100 rounded-lg',
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
 * Compact mode comparison
 */
export const CompactComparison: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-2">Normal Mode</h3>
        <FragmentVisualizer fragments={mixedFragments} />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Compact Mode</h3>
        <FragmentVisualizer fragments={mixedFragments} compact />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of normal and compact modes.',
      },
    },
  },
};

/**
 * Fragment tooltip demonstration
 */
export const FragmentTooltips: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Hover over fragments to see detailed value information</p>
      <FragmentVisualizer fragments={allFragmentTypes} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the tooltip feature showing fragment type and value on hover.',
      },
    },
  },
};
