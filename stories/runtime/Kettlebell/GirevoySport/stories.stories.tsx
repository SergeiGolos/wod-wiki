import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';

import markdown_Biathlon from '../../../../wod/kettlebell/girevoy-sport/biathlon.md?raw';
import markdown_LongCycle from '../../../../wod/kettlebell/girevoy-sport/long-cycle.md?raw';
import markdown_SnatchEndurance from '../../../../wod/kettlebell/girevoy-sport/snatch-endurance.md?raw';
import markdown_JerkTechniqueAndEndurance from '../../../../wod/kettlebell/girevoy-sport/jerk-technique-and-endurance.md?raw';
import markdown_4WeekBeginnerGirevoySportProgram from '../../../../wod/kettlebell/girevoy-sport/4-week-beginner-girevoy-sport-program.md?raw';
import markdown_LongCycleTrainingSession from '../../../../wod/kettlebell/girevoy-sport/long-cycle-training-session.md?raw';
import markdown_RelayCompetitionFormat from '../../../../wod/kettlebell/girevoy-sport/relay-competition-format.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Kettlebell/Girevoy Sport',
  component: Workbench,
  args: {
    showToolbar: false,
    showContextOverlay: false,
    readonly: true,
    theme: 'wod-light',
    hidePlanUnlessDebug: true,
    initialShowPlan: false,
    initialShowTrack: true,
    initialShowReview: true
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Girevoy Sport kettlebell workouts.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

const createWorkoutStory = (content: string, source: string): Story => ({
  args: { initialContent: content },
  parameters: {
    docs: {
      description: {
        story: `Markdown source: ${source}`
      }
    }
  }
});

export const WBiathlon: Story = {
  ...createWorkoutStory(markdown_Biathlon, 'wod/kettlebell/girevoy-sport/biathlon.md'),
  name: 'Biathlon (Jerk + Snatch)'
};

export const WLongCycle: Story = {
  ...createWorkoutStory(markdown_LongCycle, 'wod/kettlebell/girevoy-sport/long-cycle.md'),
  name: 'Long Cycle (Clean & Jerk)'
};

export const WSnatchEndurance: Story = {
  ...createWorkoutStory(markdown_SnatchEndurance, 'wod/kettlebell/girevoy-sport/snatch-endurance.md'),
  name: 'Snatch Endurance'
};

export const WJerkTechniqueAndEndurance: Story = {
  ...createWorkoutStory(markdown_JerkTechniqueAndEndurance, 'wod/kettlebell/girevoy-sport/jerk-technique-and-endurance.md'),
  name: 'Jerk Technique and Endurance'
};

export const W4WeekBeginnerGirevoySportProgram: Story = {
  ...createWorkoutStory(markdown_4WeekBeginnerGirevoySportProgram, 'wod/kettlebell/girevoy-sport/4-week-beginner-girevoy-sport-program.md'),
  name: '4-Week Beginner Girevoy Sport Program'
};

export const WLongCycleTrainingSession: Story = {
  ...createWorkoutStory(markdown_LongCycleTrainingSession, 'wod/kettlebell/girevoy-sport/long-cycle-training-session.md'),
  name: 'Long Cycle Training Session'
};

export const WRelayCompetitionFormat: Story = {
  ...createWorkoutStory(markdown_RelayCompetitionFormat, 'wod/kettlebell/girevoy-sport/relay-competition-format.md'),
  name: 'Relay Competition Format'
};
