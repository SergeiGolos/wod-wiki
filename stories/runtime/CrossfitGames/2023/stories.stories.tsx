import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2023_01 from '../../../../wod/crossfit-games/2023.01.md?raw';
import markdown_2023_02 from '../../../../wod/crossfit-games/2023.02.md?raw';
import markdown_2023_03 from '../../../../wod/crossfit-games/2023.03.md?raw';
import markdown_2023_04 from '../../../../wod/crossfit-games/2023.04.md?raw';
import markdown_2023_05 from '../../../../wod/crossfit-games/2023.05.md?raw';
import markdown_2023_06 from '../../../../wod/crossfit-games/2023.06.md?raw';
import markdown_2023_07 from '../../../../wod/crossfit-games/2023.07.md?raw';
import markdown_2023_08 from '../../../../wod/crossfit-games/2023.08.md?raw';
import markdown_2023_09 from '../../../../wod/crossfit-games/2023.09.md?raw';
import markdown_2023_10 from '../../../../wod/crossfit-games/2023.10.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2023',
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

export const W2023_01: Story = {
  ...createWorkoutStory(markdown_2023_01, 'wod/crossfit-games/2023.01.md'),
  name: '2023.01'
};
export const W2023_02: Story = {
  ...createWorkoutStory(markdown_2023_02, 'wod/crossfit-games/2023.02.md'),
  name: '2023.02'
};
export const W2023_03: Story = {
  ...createWorkoutStory(markdown_2023_03, 'wod/crossfit-games/2023.03.md'),
  name: '2023.03'
};
export const W2023_04: Story = {
  ...createWorkoutStory(markdown_2023_04, 'wod/crossfit-games/2023.04.md'),
  name: '2023.04'
};
export const W2023_05: Story = {
  ...createWorkoutStory(markdown_2023_05, 'wod/crossfit-games/2023.05.md'),
  name: '2023.05'
};
export const W2023_06: Story = {
  ...createWorkoutStory(markdown_2023_06, 'wod/crossfit-games/2023.06.md'),
  name: '2023.06'
};
export const W2023_07: Story = {
  ...createWorkoutStory(markdown_2023_07, 'wod/crossfit-games/2023.07.md'),
  name: '2023.07'
};
export const W2023_08: Story = {
  ...createWorkoutStory(markdown_2023_08, 'wod/crossfit-games/2023.08.md'),
  name: '2023.08'
};
export const W2023_09: Story = {
  ...createWorkoutStory(markdown_2023_09, 'wod/crossfit-games/2023.09.md'),
  name: '2023.09'
};
export const W2023_10: Story = {
  ...createWorkoutStory(markdown_2023_10, 'wod/crossfit-games/2023.10.md'),
  name: '2023.10'
};
