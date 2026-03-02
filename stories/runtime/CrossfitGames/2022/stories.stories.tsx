import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2022_01 from '../../../../wod/crossfit-games/2022.01.md?raw';
import markdown_2022_02 from '../../../../wod/crossfit-games/2022.02.md?raw';
import markdown_2022_03 from '../../../../wod/crossfit-games/2022.03.md?raw';
import markdown_2022_04 from '../../../../wod/crossfit-games/2022.04.md?raw';
import markdown_2022_05 from '../../../../wod/crossfit-games/2022.05.md?raw';
import markdown_2022_06 from '../../../../wod/crossfit-games/2022.06.md?raw';
import markdown_2022_07 from '../../../../wod/crossfit-games/2022.07.md?raw';
import markdown_2022_08 from '../../../../wod/crossfit-games/2022.08.md?raw';
import markdown_2022_09 from '../../../../wod/crossfit-games/2022.09.md?raw';
import markdown_2022_10 from '../../../../wod/crossfit-games/2022.10.md?raw';
import markdown_2022_11 from '../../../../wod/crossfit-games/2022.11.md?raw';
import markdown_2022_12 from '../../../../wod/crossfit-games/2022.12.md?raw';
import markdown_2022_13 from '../../../../wod/crossfit-games/2022.13.md?raw';
import markdown_2022_14 from '../../../../wod/crossfit-games/2022.14.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2022',
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

export const W2022_01: Story = {
  ...createWorkoutStory(markdown_2022_01, 'wod/crossfit-games/2022.01.md'),
  name: '2022.01'
};
export const W2022_02: Story = {
  ...createWorkoutStory(markdown_2022_02, 'wod/crossfit-games/2022.02.md'),
  name: '2022.02'
};
export const W2022_03: Story = {
  ...createWorkoutStory(markdown_2022_03, 'wod/crossfit-games/2022.03.md'),
  name: '2022.03'
};
export const W2022_04: Story = {
  ...createWorkoutStory(markdown_2022_04, 'wod/crossfit-games/2022.04.md'),
  name: '2022.04'
};
export const W2022_05: Story = {
  ...createWorkoutStory(markdown_2022_05, 'wod/crossfit-games/2022.05.md'),
  name: '2022.05'
};
export const W2022_06: Story = {
  ...createWorkoutStory(markdown_2022_06, 'wod/crossfit-games/2022.06.md'),
  name: '2022.06'
};
export const W2022_07: Story = {
  ...createWorkoutStory(markdown_2022_07, 'wod/crossfit-games/2022.07.md'),
  name: '2022.07'
};
export const W2022_08: Story = {
  ...createWorkoutStory(markdown_2022_08, 'wod/crossfit-games/2022.08.md'),
  name: '2022.08'
};
export const W2022_09: Story = {
  ...createWorkoutStory(markdown_2022_09, 'wod/crossfit-games/2022.09.md'),
  name: '2022.09'
};
export const W2022_10: Story = {
  ...createWorkoutStory(markdown_2022_10, 'wod/crossfit-games/2022.10.md'),
  name: '2022.10'
};
export const W2022_11: Story = {
  ...createWorkoutStory(markdown_2022_11, 'wod/crossfit-games/2022.11.md'),
  name: '2022.11'
};
export const W2022_12: Story = {
  ...createWorkoutStory(markdown_2022_12, 'wod/crossfit-games/2022.12.md'),
  name: '2022.12'
};
export const W2022_13: Story = {
  ...createWorkoutStory(markdown_2022_13, 'wod/crossfit-games/2022.13.md'),
  name: '2022.13'
};
export const W2022_14: Story = {
  ...createWorkoutStory(markdown_2022_14, 'wod/crossfit-games/2022.14.md'),
  name: '2022.14'
};
