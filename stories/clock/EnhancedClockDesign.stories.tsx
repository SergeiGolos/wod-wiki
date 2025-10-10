import type { Meta, StoryObj } from '@storybook/react';
import { EnhancedTimerHarness } from '../../src/clock/components/EnhancedTimerHarness';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';

const meta: Meta<typeof ClockAnchor> = {
  title: 'Clock/EnhancedClockDesign',
  component: ClockAnchor,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Workout title displayed in the card header',
    },
    description: {
      control: 'text',
      description: 'Workout description displayed below the title',
    },
    duration: {
      control: 'number',
      description: 'Duration in milliseconds for countdown timers',
    },
    showProgress: {
      control: 'boolean',
      description: 'Whether to show the progress bar',
    },
    showControls: {
      control: 'boolean',
      description: 'Whether to show the play/pause/reset controls',
    },
    workoutType: {
      control: 'select',
      options: ['AMRAP', 'FOR_TIME', 'EMOM', 'TABATA'],
      description: 'Type of workout for badge display',
    },
    currentRound: {
      control: 'number',
      description: 'Current round number for display',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic story with design system styling
export const DefaultDesign: Story = {
  args: {
    title: "AMRAP 20",
    description: "As Many Rounds As Possible",
    duration: 1200000, // 20 minutes
    showProgress: true,
    showControls: false,
    workoutType: "AMRAP",
    currentRound: 1,
  },
  render: (args) => (
    <EnhancedTimerHarness
      timerType="countdown"
      durationMs={args.duration || 1200000}
      autoStart={false}
    >
      {({ blockKey, controls, isRunning }) => (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
          <ClockAnchor
            blockKey={blockKey}
            title={args.title}
            description={args.description}
            duration={args.duration}
            showProgress={args.showProgress}
            showControls={args.showControls}
            workoutType={args.workoutType}
            currentRound={args.currentRound}
            isRunning={isRunning}
            onPlay={controls.start}
            onPause={controls.pause}
            onReset={controls.reset}
          />
        </div>
      )}
    </EnhancedTimerHarness>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Enhanced ClockAnchor with modern design system styling. Features card-based layout, Badge components for workout type and round, Progress component for visual feedback, and responsive grid layout.',
      },
    },
  },
};

// Story with controls enabled
export const WithControls: Story = {
  args: {
    title: "Fran",
    description: "21-15-9 Thrusters & Pull-ups",
    duration: 600000, // 10 minutes
    showProgress: true,
    showControls: true,
    workoutType: "FOR_TIME",
    currentRound: 1,
  },
  render: (args) => (
    <EnhancedTimerHarness
      timerType="countdown"
      durationMs={args.duration || 600000}
      autoStart={false}
    >
      {({ blockKey, controls, isRunning }) => (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
          <ClockAnchor
            blockKey={blockKey}
            title={args.title}
            description={args.description}
            duration={args.duration}
            showProgress={args.showProgress}
            showControls={args.showControls}
            workoutType={args.workoutType}
            currentRound={args.currentRound}
            isRunning={isRunning}
            onPlay={controls.start}
            onPause={controls.pause}
            onReset={controls.reset}
          />
        </div>
      )}
    </EnhancedTimerHarness>
  ),
  parameters: {
    docs: {
      description: {
        story: 'ClockAnchor with interactive controls enabled. The play/pause and reset buttons are fully functional and integrate with the timer harness.',
      },
    },
  },
};

// Count-up timer story
export const CountUpTimer: Story = {
  args: {
    title: "For Time",
    description: "Complete 50 burpees for time",
    showProgress: false,
    showControls: true,
    workoutType: "FOR_TIME",
    currentRound: 1,
  },
  render: (args) => (
    <EnhancedTimerHarness
      timerType="countup"
      durationMs={0}
      autoStart={false}
    >
      {({ blockKey, controls, isRunning }) => (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
          <ClockAnchor
            blockKey={blockKey}
            title={args.title}
            description={args.description}
            showProgress={args.showProgress}
            showControls={args.showControls}
            workoutType={args.workoutType}
            currentRound={args.currentRound}
            isRunning={isRunning}
            onPlay={controls.start}
            onPause={controls.pause}
            onReset={controls.reset}
          />
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
    description: "Every Minute On Minute - 10 minutes",
    duration: 600000, // 10 minutes
    showProgress: true,
    showControls: true,
    workoutType: "EMOM",
    currentRound: 3,
  },
  render: (args) => (
    <EnhancedTimerHarness
      timerType="countdown"
      durationMs={args.duration || 600000}
      autoStart={false}
    >
      {({ blockKey, controls, isRunning }) => (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
          <ClockAnchor
            blockKey={blockKey}
            title={args.title}
            description={args.description}
            duration={args.duration}
            showProgress={args.showProgress}
            showControls={args.showControls}
            workoutType={args.workoutType}
            currentRound={args.currentRound}
            isRunning={isRunning}
            onPlay={controls.start}
            onPause={controls.pause}
            onReset={controls.reset}
            onRoundComplete={() => console.log('Round completed!')}
          />
        </div>
      )}
    </EnhancedTimerHarness>
  ),
  parameters: {
    docs: {
      description: {
        story: 'EMOM (Every Minute On Minute) style workout with round tracking and completion callback.',
      },
    },
  },
};

// Tabata style workout
export const TabataStyle: Story = {
  args: {
    title: "Tabata",
    description: "8 rounds of 20s work, 10s rest",
    duration: 240000, // 4 minutes
    showProgress: true,
    showControls: true,
    workoutType: "TABATA",
    currentRound: 5,
  },
  render: (args) => (
    <EnhancedTimerHarness
      timerType="countdown"
      durationMs={args.duration || 240000}
      autoStart={false}
    >
      {({ blockKey, controls, isRunning }) => (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
          <ClockAnchor
            blockKey={blockKey}
            title={args.title}
            description={args.description}
            duration={args.duration}
            showProgress={args.showProgress}
            showControls={args.showControls}
            workoutType={args.workoutType}
            currentRound={args.currentRound}
            isRunning={isRunning}
            onPlay={controls.start}
            onPause={controls.pause}
            onReset={controls.reset}
            onRoundComplete={() => console.log('Tabata interval completed!')}
          />
        </div>
      )}
    </EnhancedTimerHarness>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tabata interval workout with high-intensity styling and round completion tracking.',
      },
    },
  },
};