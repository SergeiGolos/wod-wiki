import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_distance_freestyle_olympic_preparation from '../../../../wod/swimming/olympic/distance-freestyle-olympic-preparation.md?raw';
import markdown_sprint_freestyle_world_class_power from '../../../../wod/swimming/olympic/sprint-freestyle-world-class-power.md?raw';
import markdown_olympic_im_championship from '../../../../wod/swimming/olympic/olympic-im-championship.md?raw';
import markdown_olympic_games_race_week from '../../../../wod/swimming/olympic/olympic-games-race-week.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Swimming/Olympic',
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

export const Wdistance_freestyle_olympic_preparation: Story = {
  ...createWorkoutStory(markdown_distance_freestyle_olympic_preparation, 'wod/swimming/olympic/distance-freestyle-olympic-preparation.md'),
  name: 'Distance Freestyle Olympic Preparation'
};
export const Wsprint_freestyle_world_class_power: Story = {
  ...createWorkoutStory(markdown_sprint_freestyle_world_class_power, 'wod/swimming/olympic/sprint-freestyle-world-class-power.md'),
  name: 'Sprint Freestyle World-Class Power'
};
export const Wolympic_im_championship: Story = {
  ...createWorkoutStory(markdown_olympic_im_championship, 'wod/swimming/olympic/olympic-im-championship.md'),
  name: 'Olympic IM Championship'
};
export const Wolympic_games_race_week: Story = {
  ...createWorkoutStory(markdown_olympic_games_race_week, 'wod/swimming/olympic/olympic-games-race-week.md'),
  name: 'Olympic Games Race Week'
};
