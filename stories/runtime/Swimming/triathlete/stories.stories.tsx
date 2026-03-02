import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_sprint_distance_preparation from '../../../../wod/swimming/triathlete/sprint-distance-preparation.md?raw';
import markdown_olympic_distance_endurance from '../../../../wod/swimming/triathlete/olympic-distance-endurance.md?raw';
import markdown_half_ironman_70_3_building from '../../../../wod/swimming/triathlete/half-ironman-70-3-building.md?raw';
import markdown_ironman_distance_mastery from '../../../../wod/swimming/triathlete/ironman-distance-mastery.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Swimming/Triathlete',
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

export const Wsprint_distance_preparation: Story = {
  ...createWorkoutStory(markdown_sprint_distance_preparation, 'wod/swimming/triathlete/sprint-distance-preparation.md'),
  name: 'Sprint Distance Preparation'
};
export const Wolympic_distance_endurance: Story = {
  ...createWorkoutStory(markdown_olympic_distance_endurance, 'wod/swimming/triathlete/olympic-distance-endurance.md'),
  name: 'Olympic Distance Endurance'
};
export const Whalf_ironman_70_3_building: Story = {
  ...createWorkoutStory(markdown_half_ironman_70_3_building, 'wod/swimming/triathlete/half-ironman-70-3-building.md'),
  name: 'Half Ironman (70.3) Building'
};
export const Wironman_distance_mastery: Story = {
  ...createWorkoutStory(markdown_ironman_distance_mastery, 'wod/swimming/triathlete/ironman-distance-mastery.md'),
  name: 'Ironman Distance Mastery'
};
