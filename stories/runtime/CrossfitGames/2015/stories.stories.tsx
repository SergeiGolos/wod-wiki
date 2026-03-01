import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2015_01 from '../../../../wod/2015.01.md?raw';
import markdown_2015_02 from '../../../../wod/2015.02.md?raw';
import markdown_2015_03 from '../../../../wod/2015.03.md?raw';
import markdown_2015_04 from '../../../../wod/2015.04.md?raw';
import markdown_2015_05 from '../../../../wod/2015.05.md?raw';
import markdown_2015_06 from '../../../../wod/2015.06.md?raw';
import markdown_2015_07 from '../../../../wod/2015.07.md?raw';
import markdown_2015_08 from '../../../../wod/2015.08.md?raw';
import markdown_2015_09 from '../../../../wod/2015.09.md?raw';
import markdown_2015_10 from '../../../../wod/2015.10.md?raw';
import markdown_2015_11 from '../../../../wod/2015.11.md?raw';
import markdown_2015_12 from '../../../../wod/2015.12.md?raw';
import markdown_2015_13 from '../../../../wod/2015.13.md?raw';
import markdown_2015_14 from '../../../../wod/2015.14.md?raw';
import markdown_2015_15 from '../../../../wod/2015.15.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2015',
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

export const W2015_01: Story = {
  ...createWorkoutStory(markdown_2015_01, 'wod/2015.01.md'),
  name: '2015.01'
};
export const W2015_02: Story = {
  ...createWorkoutStory(markdown_2015_02, 'wod/2015.02.md'),
  name: '2015.02'
};
export const W2015_03: Story = {
  ...createWorkoutStory(markdown_2015_03, 'wod/2015.03.md'),
  name: '2015.03'
};
export const W2015_04: Story = {
  ...createWorkoutStory(markdown_2015_04, 'wod/2015.04.md'),
  name: '2015.04'
};
export const W2015_05: Story = {
  ...createWorkoutStory(markdown_2015_05, 'wod/2015.05.md'),
  name: '2015.05'
};
export const W2015_06: Story = {
  ...createWorkoutStory(markdown_2015_06, 'wod/2015.06.md'),
  name: '2015.06'
};
export const W2015_07: Story = {
  ...createWorkoutStory(markdown_2015_07, 'wod/2015.07.md'),
  name: '2015.07'
};
export const W2015_08: Story = {
  ...createWorkoutStory(markdown_2015_08, 'wod/2015.08.md'),
  name: '2015.08'
};
export const W2015_09: Story = {
  ...createWorkoutStory(markdown_2015_09, 'wod/2015.09.md'),
  name: '2015.09'
};
export const W2015_10: Story = {
  ...createWorkoutStory(markdown_2015_10, 'wod/2015.10.md'),
  name: '2015.10'
};
export const W2015_11: Story = {
  ...createWorkoutStory(markdown_2015_11, 'wod/2015.11.md'),
  name: '2015.11'
};
export const W2015_12: Story = {
  ...createWorkoutStory(markdown_2015_12, 'wod/2015.12.md'),
  name: '2015.12'
};
export const W2015_13: Story = {
  ...createWorkoutStory(markdown_2015_13, 'wod/2015.13.md'),
  name: '2015.13'
};
export const W2015_14: Story = {
  ...createWorkoutStory(markdown_2015_14, 'wod/2015.14.md'),
  name: '2015.14'
};
export const W2015_15: Story = {
  ...createWorkoutStory(markdown_2015_15, 'wod/2015.15.md'),
  name: '2015.15'
};
