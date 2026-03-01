import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2013_01 from '../../../../wod/2013.01.md?raw';
import markdown_2013_02 from '../../../../wod/2013.02.md?raw';
import markdown_2013_03 from '../../../../wod/2013.03.md?raw';
import markdown_2013_04 from '../../../../wod/2013.04.md?raw';
import markdown_2013_05 from '../../../../wod/2013.05.md?raw';
import markdown_2013_06 from '../../../../wod/2013.06.md?raw';
import markdown_2013_07 from '../../../../wod/2013.07.md?raw';
import markdown_2013_08 from '../../../../wod/2013.08.md?raw';
import markdown_2013_09 from '../../../../wod/2013.09.md?raw';
import markdown_2013_10 from '../../../../wod/2013.10.md?raw';
import markdown_2013_11 from '../../../../wod/2013.11.md?raw';
import markdown_2013_12 from '../../../../wod/2013.12.md?raw';
import markdown_2013_13 from '../../../../wod/2013.13.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2013',
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

export const W2013_01: Story = {
  ...createWorkoutStory(markdown_2013_01, 'wod/2013.01.md'),
  name: '2013.01'
};
export const W2013_02: Story = {
  ...createWorkoutStory(markdown_2013_02, 'wod/2013.02.md'),
  name: '2013.02'
};
export const W2013_03: Story = {
  ...createWorkoutStory(markdown_2013_03, 'wod/2013.03.md'),
  name: '2013.03'
};
export const W2013_04: Story = {
  ...createWorkoutStory(markdown_2013_04, 'wod/2013.04.md'),
  name: '2013.04'
};
export const W2013_05: Story = {
  ...createWorkoutStory(markdown_2013_05, 'wod/2013.05.md'),
  name: '2013.05'
};
export const W2013_06: Story = {
  ...createWorkoutStory(markdown_2013_06, 'wod/2013.06.md'),
  name: '2013.06'
};
export const W2013_07: Story = {
  ...createWorkoutStory(markdown_2013_07, 'wod/2013.07.md'),
  name: '2013.07'
};
export const W2013_08: Story = {
  ...createWorkoutStory(markdown_2013_08, 'wod/2013.08.md'),
  name: '2013.08'
};
export const W2013_09: Story = {
  ...createWorkoutStory(markdown_2013_09, 'wod/2013.09.md'),
  name: '2013.09'
};
export const W2013_10: Story = {
  ...createWorkoutStory(markdown_2013_10, 'wod/2013.10.md'),
  name: '2013.10'
};
export const W2013_11: Story = {
  ...createWorkoutStory(markdown_2013_11, 'wod/2013.11.md'),
  name: '2013.11'
};
export const W2013_12: Story = {
  ...createWorkoutStory(markdown_2013_12, 'wod/2013.12.md'),
  name: '2013.12'
};
export const W2013_13: Story = {
  ...createWorkoutStory(markdown_2013_13, 'wod/2013.13.md'),
  name: '2013.13'
};
