import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2008_01 from '../../../../wod/2008.01.md?raw';
import markdown_2008_02 from '../../../../wod/2008.02.md?raw';
import markdown_2008_03 from '../../../../wod/2008.03.md?raw';
import markdown_2008_04 from '../../../../wod/2008.04.md?raw';
import markdown_2008_05 from '../../../../wod/2008.05.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2008',
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

export const W2008_01: Story = {
  ...createWorkoutStory(markdown_2008_01, 'wod/2008.01.md'),
  name: '2008.01'
};
export const W2008_02: Story = {
  ...createWorkoutStory(markdown_2008_02, 'wod/2008.02.md'),
  name: '2008.02'
};
export const W2008_03: Story = {
  ...createWorkoutStory(markdown_2008_03, 'wod/2008.03.md'),
  name: '2008.03'
};
export const W2008_04: Story = {
  ...createWorkoutStory(markdown_2008_04, 'wod/2008.04.md'),
  name: '2008.04'
};
export const W2008_05: Story = {
  ...createWorkoutStory(markdown_2008_05, 'wod/2008.05.md'),
  name: '2008.05'
};
