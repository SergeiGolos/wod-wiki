import type { Meta, StoryObj } from '@storybook/react';
import { EnhancedTimerHarness } from '../../src/clock/components/EnhancedTimerHarness';
import { DigitalClock } from '../../src/clock/components/DigitalClock';

const meta: Meta<typeof DigitalClock> = {
  title: 'Clock/EnhancedClockDesign',
  component: DigitalClock,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Workout title displayed in the card header',
    },
    duration: {
      control: 'number',
      description: 'Duration in milliseconds for countdown timers',
    },
    timerType: {
      control: 'select',
      options: ['countdown', 'countup'],
      description: 'Type of timer display',
    },
    currentRound: {
      control: 'number',
      description: 'Current round number for display',
    },
    nextCardLabel: {
      control: 'text',
      description: 'Label for the next card placeholder',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic story with design system styling
export const DefaultDesign: Story = {
  args: {
    title: "AMRAP 20",
    duration: 1200000, // 20 minutes
    timerType: 'countdown',
    currentRound: 1,
    nextCardLabel: "Rest Period - 2:00",
  },
  render: (args) => (
    <EnhancedTimerHarness
      timerType={args.timerType || 'countdown'}
      durationMs={args.duration || 1200000}
      autoStart={false}
    >
      {({ blockKey }) => (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="w-1/2 max-w-2xl">
            <DigitalClock
              blockKey={blockKey}
              title={args.title}
              duration={args.duration}
              timerType={args.timerType}
              currentRound={args.currentRound}
              nextCardLabel={args.nextCardLabel}
              metrics={[
                { label: 'Rounds', value: '1', unit: 'of 5' },
                { label: 'Reps', value: '25', unit: 'total' }
              ]}
            />
          </div>
        </div>
      )}
    </EnhancedTimerHarness>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Enhanced DigitalClock component designed to be half-screen width. Features digital time display, metrics tracking, and next card placeholder. Integrates with the runtime for real-time updates.',
      },
    },
  },
};

// Story with running timer
export const RunningTimer: Story = {
  args: {
    title: "Fran",
    duration: 600000, // 10 minutes
    timerType: 'countdown',
    currentRound: 1,
    nextCardLabel: "21 Thrusters",
  },
  render: (args) => (
    <EnhancedTimerHarness
      timerType={args.timerType || 'countdown'}
      durationMs={args.duration || 600000}
      autoStart={true}
    >
      {({ blockKey }) => (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="w-1/2 max-w-2xl">
            <DigitalClock
              blockKey={blockKey}
              title={args.title}
              duration={args.duration}
              timerType={args.timerType}
              currentRound={args.currentRound}
              nextCardLabel={args.nextCardLabel}
              metrics={[
                { label: 'Thrusters', value: '21', unit: 'reps' },
                { label: 'Pull-ups', value: '21', unit: 'reps' }
              ]}
            />
          </div>
        </div>
      )}
    </EnhancedTimerHarness>
  ),
  parameters: {
    docs: {
      description: {
        story: 'DigitalClock with auto-start enabled. Shows the timer running with real-time updates and animated pulse effect.',
      },
    },
  },
};

// Count-up timer story
export const CountUpTimer: Story = {
  args: {
    title: "For Time",
    timerType: 'countup',
    currentRound: 1,
    nextCardLabel: "50 Burpees",
  },
  render: (args) => (
    <EnhancedTimerHarness
      timerType="countup"
      durationMs={120000}
      autoStart={true}
    >
      {({ blockKey }) => (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="w-1/2 max-w-2xl">
            <DigitalClock
              blockKey={blockKey}
              title={args.title}
              timerType={args.timerType}
              currentRound={args.currentRound}
              nextCardLabel={args.nextCardLabel}
              metrics={[
                { label: 'Burpees', value: '25', unit: 'of 50' },
                { label: 'Pace', value: '2.4', unit: 'reps/min' }
              ]}
            />
          </div>
        </div>
      )}
    </EnhancedTimerHarness>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Count-up timer without progress bar. Ideal for "for time" workouts where duration is not predetermined.',
      },
    },
  },
};

// EMOM style workout
export const EMOMStyle: Story = {
  args: {
    title: "EMOM 10",
    duration: 600000, // 10 minutes
    timerType: 'countdown',
    currentRound: 3,
    nextCardLabel: "15 Wall Balls",
  },
  render: (args) => (
    <EnhancedTimerHarness
      timerType={args.timerType || 'countdown'}
      durationMs={args.duration || 600000}
      autoStart={false}
    >
      {({ blockKey }) => (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="w-1/2 max-w-2xl">
            <DigitalClock
              blockKey={blockKey}
              title={args.title}
              duration={args.duration}
              timerType={args.timerType}
              currentRound={args.currentRound}
              nextCardLabel={args.nextCardLabel}
              metrics={[
                { label: 'Completed', value: '2', unit: 'of 10' },
                { label: 'Rest Time', value: '40', unit: 'sec' }
              ]}
            />
          </div>
        </div>
      )}
    </EnhancedTimerHarness>
  ),
  parameters: {
    docs: {
      description: {
        story: 'EMOM (Every Minute On Minute) style workout with round tracking displayed in the badge.',
      },
    },
  },
};

// Tabata style workout
export const TabataStyle: Story = {
  args: {
    title: "Tabata",
    duration: 240000, // 4 minutes
    timerType: 'countdown',
    currentRound: 5,
    nextCardLabel: "Rest - 10s",
  },
  render: (args) => (
    <EnhancedTimerHarness
      timerType={args.timerType || 'countdown'}
      durationMs={args.duration || 240000}
      autoStart={true}
    >
      {({ blockKey }) => (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="w-1/2 max-w-2xl">
            <DigitalClock
              blockKey={blockKey}
              title={args.title}
              duration={args.duration}
              timerType={args.timerType}
              currentRound={args.currentRound}
              nextCardLabel={args.nextCardLabel}
              metrics={[
                { label: 'Work', value: '20', unit: 'sec' },
                { label: 'Intervals', value: '4', unit: 'of 8' }
              ]}
            />
          </div>
        </div>
      )}
    </EnhancedTimerHarness>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tabata interval workout with progress bar showing work/rest periods across 8 rounds.',
      },
    },
  },
};