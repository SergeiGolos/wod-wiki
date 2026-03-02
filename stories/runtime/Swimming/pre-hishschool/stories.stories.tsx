import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_stroke_introduction_session from '../../../../wod/swimming/pre-hishschool/stroke-introduction-session.md?raw';
import markdown_im_readiness_basics from '../../../../wod/swimming/pre-hishschool/im-readiness-basics.md?raw';
import markdown_endurance_building from '../../../../wod/swimming/pre-hishschool/endurance-building.md?raw';
import markdown_sprint_introduction from '../../../../wod/swimming/pre-hishschool/sprint-introduction.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Swimming/Pre hishschool',
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

export const Wstroke_introduction_session: Story = {
  ...createWorkoutStory(markdown_stroke_introduction_session, 'wod/swimming/pre-hishschool/stroke-introduction-session.md'),
  name: 'Stroke Introduction Session'
};
export const Wim_readiness_basics: Story = {
  ...createWorkoutStory(markdown_im_readiness_basics, 'wod/swimming/pre-hishschool/im-readiness-basics.md'),
  name: 'IM Readiness Basics'
};
export const Wendurance_building: Story = {
  ...createWorkoutStory(markdown_endurance_building, 'wod/swimming/pre-hishschool/endurance-building.md'),
  name: 'Endurance Building'
};
export const Wsprint_introduction: Story = {
  ...createWorkoutStory(markdown_sprint_introduction, 'wod/swimming/pre-hishschool/sprint-introduction.md'),
  name: 'Sprint Introduction'
};
