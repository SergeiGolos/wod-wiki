import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';
import React from 'react';

import markdown_2011_01 from '../../../../wod/2011.01.md?raw';
import markdown_2011_02 from '../../../../wod/2011.02.md?raw';
import markdown_2011_03 from '../../../../wod/2011.03.md?raw';
import markdown_2011_04 from '../../../../wod/2011.04.md?raw';
import markdown_2011_05 from '../../../../wod/2011.05.md?raw';
import markdown_2011_06 from '../../../../wod/2011.06.md?raw';
import markdown_2011_07 from '../../../../wod/2011.07.md?raw';
import markdown_2011_08 from '../../../../wod/2011.08.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit/Crossfit Games/2011',
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

export const W2011_01: Story = {
  ...createWorkoutStory(markdown_2011_01, 'wod/2011.01.md'),
  name: '2011.01'
};
export const W2011_02: Story = {
  ...createWorkoutStory(markdown_2011_02, 'wod/2011.02.md'),
  name: '2011.02'
};
export const W2011_03: Story = {
  ...createWorkoutStory(markdown_2011_03, 'wod/2011.03.md'),
  name: '2011.03'
};
export const W2011_04: Story = {
  ...createWorkoutStory(markdown_2011_04, 'wod/2011.04.md'),
  name: '2011.04'
};
export const W2011_05: Story = {
  ...createWorkoutStory(markdown_2011_05, 'wod/2011.05.md'),
  name: '2011.05'
};
export const W2011_06: Story = {
  ...createWorkoutStory(markdown_2011_06, 'wod/2011.06.md'),
  name: '2011.06'
};
export const W2011_07: Story = {
  ...createWorkoutStory(markdown_2011_07, 'wod/2011.07.md'),
  name: '2011.07'
};
export const W2011_08: Story = {
  ...createWorkoutStory(markdown_2011_08, 'wod/2011.08.md'),
  name: '2011.08'
};
