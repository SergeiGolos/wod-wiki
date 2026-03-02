import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_distance_freestyle_training from '../../../../wod/swimming/highschool/distance-freestyle-training.md?raw';
import markdown_sprint_freestyle_power from '../../../../wod/swimming/highschool/sprint-freestyle-power.md?raw';
import markdown_im_training_session from '../../../../wod/swimming/highschool/im-training-session.md?raw';
import markdown_race_simulation_day from '../../../../wod/swimming/highschool/race-simulation-day.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Swimming/Highschool',
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
    layout: 'fullscreen'
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

const createWorkoutStory = (content: string, source: string): Story => {
  return {
    args: { initialContent: content },
    parameters: {
      docs: {
        description: {
          story: `Markdown source: ${source}`
        }
      }
    }
  };
};

export const Wdistance_freestyle_training: Story = {
  ...createWorkoutStory(markdown_distance_freestyle_training, 'wod/swimming/highschool/distance-freestyle-training.md'),
  name: 'Distance Freestyle Training'
};
export const Wsprint_freestyle_power: Story = {
  ...createWorkoutStory(markdown_sprint_freestyle_power, 'wod/swimming/highschool/sprint-freestyle-power.md'),
  name: 'Sprint Freestyle Power'
};
export const Wim_training_session: Story = {
  ...createWorkoutStory(markdown_im_training_session, 'wod/swimming/highschool/im-training-session.md'),
  name: 'IM Training Session'
};
export const Wrace_simulation_day: Story = {
  ...createWorkoutStory(markdown_race_simulation_day, 'wod/swimming/highschool/race-simulation-day.md'),
  name: 'Race Simulation Day'
};
