import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2010_01 from '../../../../wod/2010.01.md?raw';
import markdown_2010_02 from '../../../../wod/2010.02.md?raw';
import markdown_2010_03 from '../../../../wod/2010.03.md?raw';
import markdown_2010_04 from '../../../../wod/2010.04.md?raw';
import markdown_2010_05 from '../../../../wod/2010.05.md?raw';
import markdown_2010_06 from '../../../../wod/2010.06.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2010',
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

export const W2010_01: Story = {
  ...createWorkoutStory(markdown_2010_01, 'wod/2010.01.md'),
  name: '2010.01'
};
export const W2010_02: Story = {
  ...createWorkoutStory(markdown_2010_02, 'wod/2010.02.md'),
  name: '2010.02'
};
export const W2010_03: Story = {
  ...createWorkoutStory(markdown_2010_03, 'wod/2010.03.md'),
  name: '2010.03'
};
export const W2010_04: Story = {
  ...createWorkoutStory(markdown_2010_04, 'wod/2010.04.md'),
  name: '2010.04'
};
export const W2010_05: Story = {
  ...createWorkoutStory(markdown_2010_05, 'wod/2010.05.md'),
  name: '2010.05'
};
export const W2010_06: Story = {
  ...createWorkoutStory(markdown_2010_06, 'wod/2010.06.md'),
  name: '2010.06'
};
