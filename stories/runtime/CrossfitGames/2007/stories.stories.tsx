import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2007_01 from '../../../../wod/2007.01.md?raw';
import markdown_2007_02 from '../../../../wod/2007.02.md?raw';
import markdown_2007_03 from '../../../../wod/2007.03.md?raw';
import markdown_2007_04 from '../../../../wod/2007.04.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2007',
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

export const W2007_01: Story = {
  ...createWorkoutStory(markdown_2007_01, 'wod/2007.01.md'),
  name: '2007.01'
};
export const W2007_02: Story = {
  ...createWorkoutStory(markdown_2007_02, 'wod/2007.02.md'),
  name: '2007.02'
};
export const W2007_03: Story = {
  ...createWorkoutStory(markdown_2007_03, 'wod/2007.03.md'),
  name: '2007.03'
};
export const W2007_04: Story = {
  ...createWorkoutStory(markdown_2007_04, 'wod/2007.04.md'),
  name: '2007.04'
};
