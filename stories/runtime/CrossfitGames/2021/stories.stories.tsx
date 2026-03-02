import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2021_01 from '../../../../wod/crossfit-games/2021.01.md?raw';
import markdown_2021_02 from '../../../../wod/crossfit-games/2021.02.md?raw';
import markdown_2021_03 from '../../../../wod/crossfit-games/2021.03.md?raw';
import markdown_2021_04 from '../../../../wod/crossfit-games/2021.04.md?raw';
import markdown_2021_05 from '../../../../wod/crossfit-games/2021.05.md?raw';
import markdown_2021_06 from '../../../../wod/crossfit-games/2021.06.md?raw';
import markdown_2021_07 from '../../../../wod/crossfit-games/2021.07.md?raw';
import markdown_2021_08 from '../../../../wod/crossfit-games/2021.08.md?raw';
import markdown_2021_09 from '../../../../wod/crossfit-games/2021.09.md?raw';
import markdown_2021_10 from '../../../../wod/crossfit-games/2021.10.md?raw';
import markdown_2021_11 from '../../../../wod/crossfit-games/2021.11.md?raw';
import markdown_2021_12 from '../../../../wod/crossfit-games/2021.12.md?raw';
import markdown_2021_13 from '../../../../wod/crossfit-games/2021.13.md?raw';
import markdown_2021_14 from '../../../../wod/crossfit-games/2021.14.md?raw';
import markdown_2021_15 from '../../../../wod/crossfit-games/2021.15.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2021',
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

export const W2021_01: Story = {
  ...createWorkoutStory(markdown_2021_01, 'wod/crossfit-games/2021.01.md'),
  name: '2021.01'
};
export const W2021_02: Story = {
  ...createWorkoutStory(markdown_2021_02, 'wod/crossfit-games/2021.02.md'),
  name: '2021.02'
};
export const W2021_03: Story = {
  ...createWorkoutStory(markdown_2021_03, 'wod/crossfit-games/2021.03.md'),
  name: '2021.03'
};
export const W2021_04: Story = {
  ...createWorkoutStory(markdown_2021_04, 'wod/crossfit-games/2021.04.md'),
  name: '2021.04'
};
export const W2021_05: Story = {
  ...createWorkoutStory(markdown_2021_05, 'wod/crossfit-games/2021.05.md'),
  name: '2021.05'
};
export const W2021_06: Story = {
  ...createWorkoutStory(markdown_2021_06, 'wod/crossfit-games/2021.06.md'),
  name: '2021.06'
};
export const W2021_07: Story = {
  ...createWorkoutStory(markdown_2021_07, 'wod/crossfit-games/2021.07.md'),
  name: '2021.07'
};
export const W2021_08: Story = {
  ...createWorkoutStory(markdown_2021_08, 'wod/crossfit-games/2021.08.md'),
  name: '2021.08'
};
export const W2021_09: Story = {
  ...createWorkoutStory(markdown_2021_09, 'wod/crossfit-games/2021.09.md'),
  name: '2021.09'
};
export const W2021_10: Story = {
  ...createWorkoutStory(markdown_2021_10, 'wod/crossfit-games/2021.10.md'),
  name: '2021.10'
};
export const W2021_11: Story = {
  ...createWorkoutStory(markdown_2021_11, 'wod/crossfit-games/2021.11.md'),
  name: '2021.11'
};
export const W2021_12: Story = {
  ...createWorkoutStory(markdown_2021_12, 'wod/crossfit-games/2021.12.md'),
  name: '2021.12'
};
export const W2021_13: Story = {
  ...createWorkoutStory(markdown_2021_13, 'wod/crossfit-games/2021.13.md'),
  name: '2021.13'
};
export const W2021_14: Story = {
  ...createWorkoutStory(markdown_2021_14, 'wod/crossfit-games/2021.14.md'),
  name: '2021.14'
};
export const W2021_15: Story = {
  ...createWorkoutStory(markdown_2021_15, 'wod/crossfit-games/2021.15.md'),
  name: '2021.15'
};
