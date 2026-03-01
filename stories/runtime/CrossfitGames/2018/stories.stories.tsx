import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2018_01 from '../../../../wod/2018.01.md?raw';
import markdown_2018_02 from '../../../../wod/2018.02.md?raw';
import markdown_2018_03 from '../../../../wod/2018.03.md?raw';
import markdown_2018_04 from '../../../../wod/2018.04.md?raw';
import markdown_2018_05 from '../../../../wod/2018.05.md?raw';
import markdown_2018_06 from '../../../../wod/2018.06.md?raw';
import markdown_2018_07 from '../../../../wod/2018.07.md?raw';
import markdown_2018_08 from '../../../../wod/2018.08.md?raw';
import markdown_2018_09 from '../../../../wod/2018.09.md?raw';
import markdown_2018_10 from '../../../../wod/2018.10.md?raw';
import markdown_2018_11 from '../../../../wod/2018.11.md?raw';
import markdown_2018_12 from '../../../../wod/2018.12.md?raw';
import markdown_2018_13 from '../../../../wod/2018.13.md?raw';
import markdown_2018_14 from '../../../../wod/2018.14.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2018',
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

export const W2018_01: Story = {
  ...createWorkoutStory(markdown_2018_01, 'wod/2018.01.md'),
  name: '2018.01'
};
export const W2018_02: Story = {
  ...createWorkoutStory(markdown_2018_02, 'wod/2018.02.md'),
  name: '2018.02'
};
export const W2018_03: Story = {
  ...createWorkoutStory(markdown_2018_03, 'wod/2018.03.md'),
  name: '2018.03'
};
export const W2018_04: Story = {
  ...createWorkoutStory(markdown_2018_04, 'wod/2018.04.md'),
  name: '2018.04'
};
export const W2018_05: Story = {
  ...createWorkoutStory(markdown_2018_05, 'wod/2018.05.md'),
  name: '2018.05'
};
export const W2018_06: Story = {
  ...createWorkoutStory(markdown_2018_06, 'wod/2018.06.md'),
  name: '2018.06'
};
export const W2018_07: Story = {
  ...createWorkoutStory(markdown_2018_07, 'wod/2018.07.md'),
  name: '2018.07'
};
export const W2018_08: Story = {
  ...createWorkoutStory(markdown_2018_08, 'wod/2018.08.md'),
  name: '2018.08'
};
export const W2018_09: Story = {
  ...createWorkoutStory(markdown_2018_09, 'wod/2018.09.md'),
  name: '2018.09'
};
export const W2018_10: Story = {
  ...createWorkoutStory(markdown_2018_10, 'wod/2018.10.md'),
  name: '2018.10'
};
export const W2018_11: Story = {
  ...createWorkoutStory(markdown_2018_11, 'wod/2018.11.md'),
  name: '2018.11'
};
export const W2018_12: Story = {
  ...createWorkoutStory(markdown_2018_12, 'wod/2018.12.md'),
  name: '2018.12'
};
export const W2018_13: Story = {
  ...createWorkoutStory(markdown_2018_13, 'wod/2018.13.md'),
  name: '2018.13'
};
export const W2018_14: Story = {
  ...createWorkoutStory(markdown_2018_14, 'wod/2018.14.md'),
  name: '2018.14'
};
