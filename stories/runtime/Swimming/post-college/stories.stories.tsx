import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_national_qualifier_distance_freestyle from '../../../../wod/swimming/post-college/national-qualifier-distance-freestyle.md?raw';
import markdown_professional_sprint_development from '../../../../wod/swimming/post-college/professional-sprint-development.md?raw';
import markdown_international_im_preparation from '../../../../wod/swimming/post-college/international-im-preparation.md?raw';
import markdown_pro_circuit_race_week_preparation from '../../../../wod/swimming/post-college/pro-circuit-race-week-preparation.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Swimming/Post college',
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

export const Wnational_qualifier_distance_freestyle: Story = {
  ...createWorkoutStory(markdown_national_qualifier_distance_freestyle, 'wod/swimming/post-college/national-qualifier-distance-freestyle.md'),
  name: 'National Qualifier Distance Freestyle'
};
export const Wprofessional_sprint_development: Story = {
  ...createWorkoutStory(markdown_professional_sprint_development, 'wod/swimming/post-college/professional-sprint-development.md'),
  name: 'Professional Sprint Development'
};
export const Winternational_im_preparation: Story = {
  ...createWorkoutStory(markdown_international_im_preparation, 'wod/swimming/post-college/international-im-preparation.md'),
  name: 'International IM Preparation'
};
export const Wpro_circuit_race_week_preparation: Story = {
  ...createWorkoutStory(markdown_pro_circuit_race_week_preparation, 'wod/swimming/post-college/pro-circuit-race-week-preparation.md'),
  name: 'Pro Circuit Race Week Preparation'
};
