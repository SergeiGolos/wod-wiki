import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_distance_freestyle_ultra_endurance from '../../../../wod/swimming/college/distance-freestyle-ultra-endurance.md?raw';
import markdown_sprint_power_and_speed_endurance from '../../../../wod/swimming/college/sprint-power-and-speed-endurance.md?raw';
import markdown_mid_distance_championship_preparation from '../../../../wod/swimming/college/mid-distance-championship-preparation.md?raw';
import markdown_collegiate_im_championship from '../../../../wod/swimming/college/collegiate-im-championship.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Swimming/College',
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

export const Wdistance_freestyle_ultra_endurance: Story = {
  ...createWorkoutStory(markdown_distance_freestyle_ultra_endurance, 'wod/swimming/college/distance-freestyle-ultra-endurance.md'),
  name: 'Distance Freestyle Ultra-Endurance'
};
export const Wsprint_power_and_speed_endurance: Story = {
  ...createWorkoutStory(markdown_sprint_power_and_speed_endurance, 'wod/swimming/college/sprint-power-and-speed-endurance.md'),
  name: 'Sprint Power and Speed Endurance'
};
export const Wmid_distance_championship_preparation: Story = {
  ...createWorkoutStory(markdown_mid_distance_championship_preparation, 'wod/swimming/college/mid-distance-championship-preparation.md'),
  name: 'Mid-Distance Championship Preparation'
};
export const Wcollegiate_im_championship: Story = {
  ...createWorkoutStory(markdown_collegiate_im_championship, 'wod/swimming/college/collegiate-im-championship.md'),
  name: 'Collegiate IM Championship'
};
