import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2016_01 from '../../../../wod/2016.01.md?raw';
import markdown_2016_02 from '../../../../wod/2016.02.md?raw';
import markdown_2016_03 from '../../../../wod/2016.03.md?raw';
import markdown_2016_04 from '../../../../wod/2016.04.md?raw';
import markdown_2016_05 from '../../../../wod/2016.05.md?raw';
import markdown_2016_06 from '../../../../wod/2016.06.md?raw';
import markdown_2016_07 from '../../../../wod/2016.07.md?raw';
import markdown_2016_08 from '../../../../wod/2016.08.md?raw';
import markdown_2016_09 from '../../../../wod/2016.09.md?raw';
import markdown_2016_10 from '../../../../wod/2016.10.md?raw';
import markdown_2016_11 from '../../../../wod/2016.11.md?raw';
import markdown_2016_12 from '../../../../wod/2016.12.md?raw';
import markdown_2016_13 from '../../../../wod/2016.13.md?raw';
import markdown_2016_14 from '../../../../wod/2016.14.md?raw';
import markdown_2016_15 from '../../../../wod/2016.15.md?raw';
import markdown_2016_16 from '../../../../wod/2016.16.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2016',
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

export const W2016_01: Story = {
  ...createWorkoutStory(markdown_2016_01, 'wod/2016.01.md'),
  name: '2016.01'
};
export const W2016_02: Story = {
  ...createWorkoutStory(markdown_2016_02, 'wod/2016.02.md'),
  name: '2016.02'
};
export const W2016_03: Story = {
  ...createWorkoutStory(markdown_2016_03, 'wod/2016.03.md'),
  name: '2016.03'
};
export const W2016_04: Story = {
  ...createWorkoutStory(markdown_2016_04, 'wod/2016.04.md'),
  name: '2016.04'
};
export const W2016_05: Story = {
  ...createWorkoutStory(markdown_2016_05, 'wod/2016.05.md'),
  name: '2016.05'
};
export const W2016_06: Story = {
  ...createWorkoutStory(markdown_2016_06, 'wod/2016.06.md'),
  name: '2016.06'
};
export const W2016_07: Story = {
  ...createWorkoutStory(markdown_2016_07, 'wod/2016.07.md'),
  name: '2016.07'
};
export const W2016_08: Story = {
  ...createWorkoutStory(markdown_2016_08, 'wod/2016.08.md'),
  name: '2016.08'
};
export const W2016_09: Story = {
  ...createWorkoutStory(markdown_2016_09, 'wod/2016.09.md'),
  name: '2016.09'
};
export const W2016_10: Story = {
  ...createWorkoutStory(markdown_2016_10, 'wod/2016.10.md'),
  name: '2016.10'
};
export const W2016_11: Story = {
  ...createWorkoutStory(markdown_2016_11, 'wod/2016.11.md'),
  name: '2016.11'
};
export const W2016_12: Story = {
  ...createWorkoutStory(markdown_2016_12, 'wod/2016.12.md'),
  name: '2016.12'
};
export const W2016_13: Story = {
  ...createWorkoutStory(markdown_2016_13, 'wod/2016.13.md'),
  name: '2016.13'
};
export const W2016_14: Story = {
  ...createWorkoutStory(markdown_2016_14, 'wod/2016.14.md'),
  name: '2016.14'
};
export const W2016_15: Story = {
  ...createWorkoutStory(markdown_2016_15, 'wod/2016.15.md'),
  name: '2016.15'
};
export const W2016_16: Story = {
  ...createWorkoutStory(markdown_2016_16, 'wod/2016.16.md'),
  name: '2016.16'
};
