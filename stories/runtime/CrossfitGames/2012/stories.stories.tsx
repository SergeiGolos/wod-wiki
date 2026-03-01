import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2012_01 from '../../../../wod/2012.01.md?raw';
import markdown_2012_02 from '../../../../wod/2012.02.md?raw';
import markdown_2012_03 from '../../../../wod/2012.03.md?raw';
import markdown_2012_04 from '../../../../wod/2012.04.md?raw';
import markdown_2012_05 from '../../../../wod/2012.05.md?raw';
import markdown_2012_06 from '../../../../wod/2012.06.md?raw';
import markdown_2012_07 from '../../../../wod/2012.07.md?raw';
import markdown_2012_08 from '../../../../wod/2012.08.md?raw';
import markdown_2012_09 from '../../../../wod/2012.09.md?raw';
import markdown_2012_10 from '../../../../wod/2012.10.md?raw';
import markdown_2012_11 from '../../../../wod/2012.11.md?raw';
import markdown_2012_12 from '../../../../wod/2012.12.md?raw';
import markdown_2012_13 from '../../../../wod/2012.13.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2012',
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

export const W2012_01: Story = {
  ...createWorkoutStory(markdown_2012_01, 'wod/2012.01.md'),
  name: '2012.01'
};
export const W2012_02: Story = {
  ...createWorkoutStory(markdown_2012_02, 'wod/2012.02.md'),
  name: '2012.02'
};
export const W2012_03: Story = {
  ...createWorkoutStory(markdown_2012_03, 'wod/2012.03.md'),
  name: '2012.03'
};
export const W2012_04: Story = {
  ...createWorkoutStory(markdown_2012_04, 'wod/2012.04.md'),
  name: '2012.04'
};
export const W2012_05: Story = {
  ...createWorkoutStory(markdown_2012_05, 'wod/2012.05.md'),
  name: '2012.05'
};
export const W2012_06: Story = {
  ...createWorkoutStory(markdown_2012_06, 'wod/2012.06.md'),
  name: '2012.06'
};
export const W2012_07: Story = {
  ...createWorkoutStory(markdown_2012_07, 'wod/2012.07.md'),
  name: '2012.07'
};
export const W2012_08: Story = {
  ...createWorkoutStory(markdown_2012_08, 'wod/2012.08.md'),
  name: '2012.08'
};
export const W2012_09: Story = {
  ...createWorkoutStory(markdown_2012_09, 'wod/2012.09.md'),
  name: '2012.09'
};
export const W2012_10: Story = {
  ...createWorkoutStory(markdown_2012_10, 'wod/2012.10.md'),
  name: '2012.10'
};
export const W2012_11: Story = {
  ...createWorkoutStory(markdown_2012_11, 'wod/2012.11.md'),
  name: '2012.11'
};
export const W2012_12: Story = {
  ...createWorkoutStory(markdown_2012_12, 'wod/2012.12.md'),
  name: '2012.12'
};
export const W2012_13: Story = {
  ...createWorkoutStory(markdown_2012_13, 'wod/2012.13.md'),
  name: '2012.13'
};
