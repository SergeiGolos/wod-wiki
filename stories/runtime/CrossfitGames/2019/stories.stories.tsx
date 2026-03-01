import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2019_01 from '../../../../wod/2019.01.md?raw';
import markdown_2019_02 from '../../../../wod/2019.02.md?raw';
import markdown_2019_03 from '../../../../wod/2019.03.md?raw';
import markdown_2019_04 from '../../../../wod/2019.04.md?raw';
import markdown_2019_05 from '../../../../wod/2019.05.md?raw';
import markdown_2019_06 from '../../../../wod/2019.06.md?raw';
import markdown_2019_07 from '../../../../wod/2019.07.md?raw';
import markdown_2019_08 from '../../../../wod/2019.08.md?raw';
import markdown_2019_09 from '../../../../wod/2019.09.md?raw';
import markdown_2019_10 from '../../../../wod/2019.10.md?raw';
import markdown_2019_11 from '../../../../wod/2019.11.md?raw';
import markdown_2019_12 from '../../../../wod/2019.12.md?raw';
import markdown_2019_13 from '../../../../wod/2019.13.md?raw';
import markdown_2019_14 from '../../../../wod/2019.14.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2019',
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

export const W2019_01: Story = {
  ...createWorkoutStory(markdown_2019_01, 'wod/2019.01.md'),
  name: '2019.01'
};
export const W2019_02: Story = {
  ...createWorkoutStory(markdown_2019_02, 'wod/2019.02.md'),
  name: '2019.02'
};
export const W2019_03: Story = {
  ...createWorkoutStory(markdown_2019_03, 'wod/2019.03.md'),
  name: '2019.03'
};
export const W2019_04: Story = {
  ...createWorkoutStory(markdown_2019_04, 'wod/2019.04.md'),
  name: '2019.04'
};
export const W2019_05: Story = {
  ...createWorkoutStory(markdown_2019_05, 'wod/2019.05.md'),
  name: '2019.05'
};
export const W2019_06: Story = {
  ...createWorkoutStory(markdown_2019_06, 'wod/2019.06.md'),
  name: '2019.06'
};
export const W2019_07: Story = {
  ...createWorkoutStory(markdown_2019_07, 'wod/2019.07.md'),
  name: '2019.07'
};
export const W2019_08: Story = {
  ...createWorkoutStory(markdown_2019_08, 'wod/2019.08.md'),
  name: '2019.08'
};
export const W2019_09: Story = {
  ...createWorkoutStory(markdown_2019_09, 'wod/2019.09.md'),
  name: '2019.09'
};
export const W2019_10: Story = {
  ...createWorkoutStory(markdown_2019_10, 'wod/2019.10.md'),
  name: '2019.10'
};
export const W2019_11: Story = {
  ...createWorkoutStory(markdown_2019_11, 'wod/2019.11.md'),
  name: '2019.11'
};
export const W2019_12: Story = {
  ...createWorkoutStory(markdown_2019_12, 'wod/2019.12.md'),
  name: '2019.12'
};
export const W2019_13: Story = {
  ...createWorkoutStory(markdown_2019_13, 'wod/2019.13.md'),
  name: '2019.13'
};
export const W2019_14: Story = {
  ...createWorkoutStory(markdown_2019_14, 'wod/2019.14.md'),
  name: '2019.14'
};
