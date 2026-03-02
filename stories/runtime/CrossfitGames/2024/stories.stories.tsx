import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2024_02 from '../../../../wod/crossfit-games/2024.02.md?raw';
import markdown_2024_03 from '../../../../wod/crossfit-games/2024.03.md?raw';
import markdown_2024_04 from '../../../../wod/crossfit-games/2024.04.md?raw';
import markdown_2024_05 from '../../../../wod/crossfit-games/2024.05.md?raw';
import markdown_2024_06 from '../../../../wod/crossfit-games/2024.06.md?raw';
import markdown_2024_07 from '../../../../wod/crossfit-games/2024.07.md?raw';
import markdown_2024_08 from '../../../../wod/crossfit-games/2024.08.md?raw';
import markdown_2024_09 from '../../../../wod/crossfit-games/2024.09.md?raw';
import markdown_2024_10 from '../../../../wod/crossfit-games/2024.10.md?raw';
import markdown_2024_11 from '../../../../wod/crossfit-games/2024.11.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2024',
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

export const W2024_02: Story = {
  ...createWorkoutStory(markdown_2024_02, 'wod/crossfit-games/2024.02.md'),
  name: '2024.02'
};
export const W2024_03: Story = {
  ...createWorkoutStory(markdown_2024_03, 'wod/crossfit-games/2024.03.md'),
  name: '2024.03'
};
export const W2024_04: Story = {
  ...createWorkoutStory(markdown_2024_04, 'wod/crossfit-games/2024.04.md'),
  name: '2024.04'
};
export const W2024_05: Story = {
  ...createWorkoutStory(markdown_2024_05, 'wod/crossfit-games/2024.05.md'),
  name: '2024.05'
};
export const W2024_06: Story = {
  ...createWorkoutStory(markdown_2024_06, 'wod/crossfit-games/2024.06.md'),
  name: '2024.06'
};
export const W2024_07: Story = {
  ...createWorkoutStory(markdown_2024_07, 'wod/crossfit-games/2024.07.md'),
  name: '2024.07'
};
export const W2024_08: Story = {
  ...createWorkoutStory(markdown_2024_08, 'wod/crossfit-games/2024.08.md'),
  name: '2024.08'
};
export const W2024_09: Story = {
  ...createWorkoutStory(markdown_2024_09, 'wod/crossfit-games/2024.09.md'),
  name: '2024.09'
};
export const W2024_10: Story = {
  ...createWorkoutStory(markdown_2024_10, 'wod/crossfit-games/2024.10.md'),
  name: '2024.10'
};
export const W2024_11: Story = {
  ...createWorkoutStory(markdown_2024_11, 'wod/crossfit-games/2024.11.md'),
  name: '2024.11'
};
