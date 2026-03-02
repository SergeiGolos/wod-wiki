import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_general_fitness_session from '../../../../wod/swimming/masters/general-fitness-session.md?raw';
import markdown_competitive_masters_training from '../../../../wod/swimming/masters/competitive-masters-training.md?raw';
import markdown_stroke_refinement_workshop from '../../../../wod/swimming/masters/stroke-refinement-workshop.md?raw';
import markdown_open_water_preparation from '../../../../wod/swimming/masters/open-water-preparation.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Swimming/Masters',
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

export const Wgeneral_fitness_session: Story = {
  ...createWorkoutStory(markdown_general_fitness_session, 'wod/swimming/masters/general-fitness-session.md'),
  name: 'General Fitness Session'
};
export const Wcompetitive_masters_training: Story = {
  ...createWorkoutStory(markdown_competitive_masters_training, 'wod/swimming/masters/competitive-masters-training.md'),
  name: 'Competitive Masters Training'
};
export const Wstroke_refinement_workshop: Story = {
  ...createWorkoutStory(markdown_stroke_refinement_workshop, 'wod/swimming/masters/stroke-refinement-workshop.md'),
  name: 'Stroke Refinement Workshop'
};
export const Wopen_water_preparation: Story = {
  ...createWorkoutStory(markdown_open_water_preparation, 'wod/swimming/masters/open-water-preparation.md'),
  name: 'Open Water Preparation'
};
