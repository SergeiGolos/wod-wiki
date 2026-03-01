import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2017_01 from '../../../../wod/2017.01.md?raw';
import markdown_2017_02 from '../../../../wod/2017.02.md?raw';
import markdown_2017_03 from '../../../../wod/2017.03.md?raw';
import markdown_2017_04 from '../../../../wod/2017.04.md?raw';
import markdown_2017_05 from '../../../../wod/2017.05.md?raw';
import markdown_2017_06 from '../../../../wod/2017.06.md?raw';
import markdown_2017_07 from '../../../../wod/2017.07.md?raw';
import markdown_2017_08 from '../../../../wod/2017.08.md?raw';
import markdown_2017_09 from '../../../../wod/2017.09.md?raw';
import markdown_2017_10 from '../../../../wod/2017.10.md?raw';
import markdown_2017_11 from '../../../../wod/2017.11.md?raw';
import markdown_2017_12 from '../../../../wod/2017.12.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2017',
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

export const W2017_01: Story = {
  ...createWorkoutStory(markdown_2017_01, 'wod/2017.01.md'),
  name: '2017.01'
};
export const W2017_02: Story = {
  ...createWorkoutStory(markdown_2017_02, 'wod/2017.02.md'),
  name: '2017.02'
};
export const W2017_03: Story = {
  ...createWorkoutStory(markdown_2017_03, 'wod/2017.03.md'),
  name: '2017.03'
};
export const W2017_04: Story = {
  ...createWorkoutStory(markdown_2017_04, 'wod/2017.04.md'),
  name: '2017.04'
};
export const W2017_05: Story = {
  ...createWorkoutStory(markdown_2017_05, 'wod/2017.05.md'),
  name: '2017.05'
};
export const W2017_06: Story = {
  ...createWorkoutStory(markdown_2017_06, 'wod/2017.06.md'),
  name: '2017.06'
};
export const W2017_07: Story = {
  ...createWorkoutStory(markdown_2017_07, 'wod/2017.07.md'),
  name: '2017.07'
};
export const W2017_08: Story = {
  ...createWorkoutStory(markdown_2017_08, 'wod/2017.08.md'),
  name: '2017.08'
};
export const W2017_09: Story = {
  ...createWorkoutStory(markdown_2017_09, 'wod/2017.09.md'),
  name: '2017.09'
};
export const W2017_10: Story = {
  ...createWorkoutStory(markdown_2017_10, 'wod/2017.10.md'),
  name: '2017.10'
};
export const W2017_11: Story = {
  ...createWorkoutStory(markdown_2017_11, 'wod/2017.11.md'),
  name: '2017.11'
};
export const W2017_12: Story = {
  ...createWorkoutStory(markdown_2017_12, 'wod/2017.12.md'),
  name: '2017.12'
};
