import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2020_01 from '../../../../wod/crossfit-games/2020.01.md?raw';
import markdown_2020_02 from '../../../../wod/crossfit-games/2020.02.md?raw';
import markdown_2020_03 from '../../../../wod/crossfit-games/2020.03.md?raw';
import markdown_2020_04 from '../../../../wod/crossfit-games/2020.04.md?raw';
import markdown_2020_05 from '../../../../wod/crossfit-games/2020.05.md?raw';
import markdown_2020_06 from '../../../../wod/crossfit-games/2020.06.md?raw';
import markdown_2020_07 from '../../../../wod/crossfit-games/2020.07.md?raw';
import markdown_2020_08 from '../../../../wod/crossfit-games/2020.08.md?raw';
import markdown_2020_09 from '../../../../wod/crossfit-games/2020.09.md?raw';
import markdown_2020_10 from '../../../../wod/crossfit-games/2020.10.md?raw';
import markdown_2020_11 from '../../../../wod/crossfit-games/2020.11.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2020',
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

export const W2020_01: Story = {
  ...createWorkoutStory(markdown_2020_01, 'wod/crossfit-games/2020.01.md'),
  name: '2020.01'
};
export const W2020_02: Story = {
  ...createWorkoutStory(markdown_2020_02, 'wod/crossfit-games/2020.02.md'),
  name: '2020.02'
};
export const W2020_03: Story = {
  ...createWorkoutStory(markdown_2020_03, 'wod/crossfit-games/2020.03.md'),
  name: '2020.03'
};
export const W2020_04: Story = {
  ...createWorkoutStory(markdown_2020_04, 'wod/crossfit-games/2020.04.md'),
  name: '2020.04'
};
export const W2020_05: Story = {
  ...createWorkoutStory(markdown_2020_05, 'wod/crossfit-games/2020.05.md'),
  name: '2020.05'
};
export const W2020_06: Story = {
  ...createWorkoutStory(markdown_2020_06, 'wod/crossfit-games/2020.06.md'),
  name: '2020.06'
};
export const W2020_07: Story = {
  ...createWorkoutStory(markdown_2020_07, 'wod/crossfit-games/2020.07.md'),
  name: '2020.07'
};
export const W2020_08: Story = {
  ...createWorkoutStory(markdown_2020_08, 'wod/crossfit-games/2020.08.md'),
  name: '2020.08'
};
export const W2020_09: Story = {
  ...createWorkoutStory(markdown_2020_09, 'wod/crossfit-games/2020.09.md'),
  name: '2020.09'
};
export const W2020_10: Story = {
  ...createWorkoutStory(markdown_2020_10, 'wod/crossfit-games/2020.10.md'),
  name: '2020.10'
};
export const W2020_11: Story = {
  ...createWorkoutStory(markdown_2020_11, 'wod/crossfit-games/2020.11.md'),
  name: '2020.11'
};
