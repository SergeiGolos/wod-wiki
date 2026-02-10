import type { Meta, StoryObj } from '@storybook/react';
import { RuntimeHistoryLog } from '@/components/history/RuntimeHistoryLog';
import { IOutputStatement } from '@/core/models/OutputStatement';
import { FragmentType, CodeFragment } from '@/core/models/CodeFragment';
import { IFragmentSource } from '@/core/contracts/IFragmentSource';
import React from 'react';

/**
 * Mock ScriptRuntime that provides static history data
 */
class MockHistoryRuntime {
  private outputs: IOutputStatement[];
  private subscriptions: Set<() => void> = new Set();

  constructor(outputs: IOutputStatement[]) {
    this.outputs = outputs;
  }

  getOutputStatements(): IOutputStatement[] {
    return this.outputs;
  }

  subscribeToOutput(callback: () => void): () => void {
    this.subscriptions.add(callback);
    return () => {
      this.subscriptions.delete(callback);
    };
  }
}

/**
 * Helper to create mock output statements
 */
function createMockOutput(
  id: number,
  blockKey: string,
  fragments: CodeFragment[],
  startTime: number,
  duration: number,
  stackLevel: number = 0,
  outputType: 'segment' | 'completion' | 'metric' = 'completion'
): IOutputStatement {
  const endTime = startTime + duration;

  return {
    id,
    outputType,
    sourceBlockKey: blockKey,
    stackLevel,
    timeSpan: {
      started: startTime,
      ended: endTime,
      duration: duration,
    },
    fragments: [fragments],
    getDisplayFragments: () => fragments,
  } as IOutputStatement;
}

/**
 * Helper to create a fragment
 */
function createFragment(
  type: FragmentType,
  image: string
): CodeFragment {
  return {
    fragmentType: type,
    type: type.toLowerCase(),
    image,
  } as CodeFragment;
}

/**
 * Generate history data for multiple workouts across different days
 */
function generateNotebookHistory(): IOutputStatement[] {
  const outputs: IOutputStatement[] = [];
  let id = 1;

  // Day 1: Fran (3 days ago)
  const day1Start = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 days ago
  outputs.push(
    createMockOutput(
      id++,
      'workout-1',
      [
        createFragment(FragmentType.Text, 'Fran'),
        createFragment(FragmentType.Rounds, '21-15-9'),
      ],
      day1Start,
      8 * 60 * 1000, // 8 minutes
      0
    ),
    createMockOutput(
      id++,
      'workout-1-round-1',
      [
        createFragment(FragmentType.Text, 'Round'),
        createFragment(FragmentType.Text, '1'),
      ],
      day1Start,
      3 * 60 * 1000, // 3 minutes
      1
    ),
    createMockOutput(
      id++,
      'workout-1-round-1-thrusters',
      [
        createFragment(FragmentType.Rep, '21'),
        createFragment(FragmentType.Text, 'Thrusters'),
        createFragment(FragmentType.Resistance, '95lb'),
      ],
      day1Start,
      90 * 1000, // 90 seconds
      2
    ),
    createMockOutput(
      id++,
      'workout-1-round-1-pullups',
      [
        createFragment(FragmentType.Rep, '21'),
        createFragment(FragmentType.Text, 'Pullups'),
      ],
      day1Start + 90 * 1000,
      90 * 1000, // 90 seconds
      2
    ),
    createMockOutput(
      id++,
      'workout-1-round-2',
      [
        createFragment(FragmentType.Text, 'Round'),
        createFragment(FragmentType.Text, '2'),
      ],
      day1Start + 3 * 60 * 1000,
      150 * 1000, // 2.5 minutes
      1
    ),
    createMockOutput(
      id++,
      'workout-1-round-2-thrusters',
      [
        createFragment(FragmentType.Rep, '15'),
        createFragment(FragmentType.Text, 'Thrusters'),
        createFragment(FragmentType.Resistance, '95lb'),
      ],
      day1Start + 3 * 60 * 1000,
      70 * 1000,
      2
    ),
    createMockOutput(
      id++,
      'workout-1-round-2-pullups',
      [
        createFragment(FragmentType.Rep, '15'),
        createFragment(FragmentType.Text, 'Pullups'),
      ],
      day1Start + 3 * 60 * 1000 + 70 * 1000,
      80 * 1000,
      2
    ),
    createMockOutput(
      id++,
      'workout-1-round-3',
      [
        createFragment(FragmentType.Text, 'Round'),
        createFragment(FragmentType.Text, '3'),
      ],
      day1Start + 5.5 * 60 * 1000,
      150 * 1000,
      1
    ),
    createMockOutput(
      id++,
      'workout-1-round-3-thrusters',
      [
        createFragment(FragmentType.Rep, '9'),
        createFragment(FragmentType.Text, 'Thrusters'),
        createFragment(FragmentType.Resistance, '95lb'),
      ],
      day1Start + 5.5 * 60 * 1000,
      60 * 1000,
      2
    ),
    createMockOutput(
      id++,
      'workout-1-round-3-pullups',
      [
        createFragment(FragmentType.Rep, '9'),
        createFragment(FragmentType.Text, 'Pullups'),
      ],
      day1Start + 5.5 * 60 * 1000 + 60 * 1000,
      90 * 1000,
      2
    )
  );

  // Day 2: AMRAP Cindy (2 days ago)
  const day2Start = Date.now() - (2 * 24 * 60 * 60 * 1000); // 2 days ago
  outputs.push(
    createMockOutput(
      id++,
      'workout-2',
      [
        createFragment(FragmentType.Text, 'AMRAP'),
        createFragment(FragmentType.Timer, '20:00'),
        createFragment(FragmentType.Text, 'Cindy'),
      ],
      day2Start,
      20 * 60 * 1000, // 20 minutes
      0
    ),
    createMockOutput(
      id++,
      'workout-2-round-1',
      [
        createFragment(FragmentType.Text, 'Round'),
        createFragment(FragmentType.Text, '1', '1'),
      ],
      day2Start,
      55 * 1000,
      1
    ),
    createMockOutput(
      id++,
      'workout-2-round-2',
      [
        createFragment(FragmentType.Text, 'Round'),
        createFragment(FragmentType.Text, '2', '2'),
      ],
      day2Start + 55 * 1000,
      58 * 1000,
      1
    ),
    createMockOutput(
      id++,
      'workout-2-round-3',
      [
        createFragment(FragmentType.Text, 'Round'),
        createFragment(FragmentType.Text, '3', '3'),
      ],
      day2Start + 113 * 1000,
      60 * 1000,
      1
    ),
    createMockOutput(
      id++,
      'workout-2-rounds-completed',
      [
        createFragment(FragmentType.Text, 'Completed'),
        createFragment(FragmentType.Text, '21'),
        createFragment(FragmentType.Text, 'rounds'),
      ],
      day2Start + 20 * 60 * 1000,
      0,
      0
    )
  );

  // Day 3: EMOM (1 day ago)
  const day3Start = Date.now() - (24 * 60 * 60 * 1000); // 1 day ago
  outputs.push(
    createMockOutput(
      id++,
      'workout-3',
      [
        createFragment(FragmentType.Rounds, '10'),
        createFragment(FragmentType.Timer, '1:00'),
        createFragment(FragmentType.Text, 'EMOM'),
      ],
      day3Start,
      10 * 60 * 1000, // 10 minutes
      0
    ),
    createMockOutput(
      id++,
      'workout-3-minute-1',
      [
        createFragment(FragmentType.Text, 'Minute'),
        createFragment(FragmentType.Text, '1', '1'),
        createFragment(FragmentType.Rep, '15'),
        createFragment(FragmentType.Text, 'Wall Balls'),
      ],
      day3Start,
      60 * 1000,
      1
    ),
    createMockOutput(
      id++,
      'workout-3-minute-5',
      [
        createFragment(FragmentType.Text, 'Minute'),
        createFragment(FragmentType.Text, '5', '5'),
        createFragment(FragmentType.Rep, '15'),
        createFragment(FragmentType.Text, 'Wall Balls'),
      ],
      day3Start + 4 * 60 * 1000,
      60 * 1000,
      1
    ),
    createMockOutput(
      id++,
      'workout-3-minute-10',
      [
        createFragment(FragmentType.Text, 'Minute'),
        createFragment(FragmentType.Text, '10', '10'),
        createFragment(FragmentType.Rep, '15'),
        createFragment(FragmentType.Text, 'Wall Balls'),
      ],
      day3Start + 9 * 60 * 1000,
      60 * 1000,
      1
    )
  );

  // Day 4: Today's workout (in progress simulation)
  const todayStart = Date.now() - (5 * 60 * 1000); // Started 5 minutes ago
  outputs.push(
    createMockOutput(
      id++,
      'workout-4',
      [
        createFragment(FragmentType.Text, 'Helen'),
        createFragment(FragmentType.Rounds, '3'),
        createFragment(FragmentType.Text, 'RFT'),
      ],
      todayStart,
      5 * 60 * 1000,
      0,
      'segment' // Active workout
    ),
    createMockOutput(
      id++,
      'workout-4-round-1',
      [
        createFragment(FragmentType.Text, 'Round'),
        createFragment(FragmentType.Text, '1', '1'),
      ],
      todayStart,
      170 * 1000,
      1
    ),
    createMockOutput(
      id++,
      'workout-4-round-1-run',
      [
        createFragment(FragmentType.Text, 'Run'),
        createFragment(FragmentType.Distance, '400m'),
      ],
      todayStart,
      120 * 1000,
      2
    ),
    createMockOutput(
      id++,
      'workout-4-round-2',
      [
        createFragment(FragmentType.Text, 'Round'),
        createFragment(FragmentType.Text, '2', '2'),
      ],
      todayStart + 170 * 1000,
      130 * 1000,
      1,
      'segment' // Currently active
    )
  );

  return outputs;
}

/**
 * Wrapper component that renders RuntimeHistoryLog with a mock runtime
 */
const NotebookWrapper: React.FC<{
  outputs: IOutputStatement[];
  showActive?: boolean;
  compact?: boolean;
  className?: string;
}> = ({ outputs, showActive = true, compact = false, className }) => {
  const mockRuntime = React.useMemo(
    () => new MockHistoryRuntime(outputs),
    [outputs]
  );

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b bg-muted/50">
        <h1 className="text-2xl font-bold">Workout History Notebook</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A chronological log of completed workouts with detailed breakdown
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <RuntimeHistoryLog
          runtime={mockRuntime as any}
          showActive={showActive}
          compact={compact}
          className={className}
          autoScroll={false}
        />
      </div>
    </div>
  );
};

const meta: Meta<typeof NotebookWrapper> = {
  title: 'Runtime/Notebook',
  component: NotebookWrapper,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Workout History Notebook

This story demonstrates the **RuntimeHistoryLog** component with static history data
spanning multiple days. It showcases how completed workouts are recorded and displayed
in a chronological, hierarchical format.

## Features Demonstrated

- **Multi-day history**: Workouts from the past 3 days plus an active workout
- **Hierarchical display**: Parent workouts → rounds → exercises
- **Duration tracking**: Each entry shows completion time
- **Status indicators**: Active vs completed workouts
- **Fragment visualization**: Proper rendering of reps, timers, weights, etc.

## Example Workouts

1. **Day -3**: Fran (21-15-9 Thrusters & Pullups) - 8 minutes
2. **Day -2**: AMRAP Cindy (20 min) - 21 rounds completed
3. **Day -1**: EMOM 10 (Wall Balls)
4. **Today**: Helen (3 RFT) - In progress

This pattern matches the behavior needed for the History Panel expansion feature,
where users can browse through their workout history across multiple sessions.
        `,
      },
    },
  },
  argTypes: {
    showActive: {
      control: 'boolean',
      description: 'Show active/in-progress workouts',
      defaultValue: true,
    },
    compact: {
      control: 'boolean',
      description: 'Use compact display mode',
      defaultValue: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof NotebookWrapper>;

/**
 * Full workout history notebook spanning multiple days
 */
export const Default: Story = {
  args: {
    outputs: generateNotebookHistory(),
    showActive: true,
    compact: false,
  },
};

/**
 * Compact view - useful for sidebars or narrow panels
 */
export const CompactView: Story = {
  args: {
    outputs: generateNotebookHistory(),
    showActive: true,
    compact: true,
    className: 'w-[350px]',
  },
};

/**
 * Completed workouts only (hide active)
 */
export const CompletedOnly: Story = {
  args: {
    outputs: generateNotebookHistory(),
    showActive: false,
    compact: false,
  },
};

/**
 * Single day - Fran workout only
 */
export const SingleWorkout: Story = {
  args: {
    outputs: generateNotebookHistory().filter(o =>
      o.sourceBlockKey.startsWith('workout-1')
    ),
    showActive: true,
    compact: false,
  },
};

/**
 * Mobile optimized view
 */
export const MobileView: Story = {
  args: {
    outputs: generateNotebookHistory(),
    showActive: true,
    compact: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
