import type { Meta, StoryObj } from '@storybook/react';
import { WodContainer } from '../src/components/WodContainer';
import React from 'react';

const meta: Meta<typeof WodContainer> = {
  title: 'Workouts/StrongFirst',
  component: WodContainer,
  parameters: {
    controls: { hideNoControlsWarning: true },
    showPanel: false
  }
};

export default meta;
export type WodStory = StoryObj<typeof WodContainer>;

export const SimpleAndSinister: WodStory = {
  args: {
    code:`5:00 100 KB Swings @70lb
1:00 Rest
10:00 10 Turkish Getups 70lb`
  },
};
