import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2014_01 from '../../../../wod/2014.01.md?raw';
import markdown_2014_02 from '../../../../wod/2014.02.md?raw';
import markdown_2014_03 from '../../../../wod/2014.03.md?raw';
import markdown_2014_04 from '../../../../wod/2014.04.md?raw';
import markdown_2014_05 from '../../../../wod/2014.05.md?raw';
import markdown_2014_06 from '../../../../wod/2014.06.md?raw';
import markdown_2014_07 from '../../../../wod/2014.07.md?raw';
import markdown_2014_08 from '../../../../wod/2014.08.md?raw';
import markdown_2014_09 from '../../../../wod/2014.09.md?raw';
import markdown_2014_10 from '../../../../wod/2014.10.md?raw';
import markdown_2014_11 from '../../../../wod/2014.11.md?raw';
import markdown_2014_12 from '../../../../wod/2014.12.md?raw';
import markdown_2014_13 from '../../../../wod/2014.13.md?raw';
import markdown_2014_14 from '../../../../wod/2014.14.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2014',
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

export const W2014_01: Story = {
  ...createWorkoutStory(markdown_2014_01, 'wod/2014.01.md'),
  name: '2014.01'
};
export const W2014_02: Story = {
  ...createWorkoutStory(markdown_2014_02, 'wod/2014.02.md'),
  name: '2014.02'
};
export const W2014_03: Story = {
  ...createWorkoutStory(markdown_2014_03, 'wod/2014.03.md'),
  name: '2014.03'
};
export const W2014_04: Story = {
  ...createWorkoutStory(markdown_2014_04, 'wod/2014.04.md'),
  name: '2014.04'
};
export const W2014_05: Story = {
  ...createWorkoutStory(markdown_2014_05, 'wod/2014.05.md'),
  name: '2014.05'
};
export const W2014_06: Story = {
  ...createWorkoutStory(markdown_2014_06, 'wod/2014.06.md'),
  name: '2014.06'
};
export const W2014_07: Story = {
  ...createWorkoutStory(markdown_2014_07, 'wod/2014.07.md'),
  name: '2014.07'
};
export const W2014_08: Story = {
  ...createWorkoutStory(markdown_2014_08, 'wod/2014.08.md'),
  name: '2014.08'
};
export const W2014_09: Story = {
  ...createWorkoutStory(markdown_2014_09, 'wod/2014.09.md'),
  name: '2014.09'
};
export const W2014_10: Story = {
  ...createWorkoutStory(markdown_2014_10, 'wod/2014.10.md'),
  name: '2014.10'
};
export const W2014_11: Story = {
  ...createWorkoutStory(markdown_2014_11, 'wod/2014.11.md'),
  name: '2014.11'
};
export const W2014_12: Story = {
  ...createWorkoutStory(markdown_2014_12, 'wod/2014.12.md'),
  name: '2014.12'
};
export const W2014_13: Story = {
  ...createWorkoutStory(markdown_2014_13, 'wod/2014.13.md'),
  name: '2014.13'
};
export const W2014_14: Story = {
  ...createWorkoutStory(markdown_2014_14, 'wod/2014.14.md'),
  name: '2014.14'
};
