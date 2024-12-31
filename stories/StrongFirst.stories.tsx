import type { Meta, StoryObj } from '@storybook/react';
import { WodContainer } from '../src/components/WodContainer';
import React from 'react';

const meta: Meta<typeof WodContainer> = {
  title: 'Workouts/StrongFirst',
  component: WodContainer,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '800px' }}>
        <Story />
      </div>
    ),
  ]
};

export default meta;
export type WodStory = StoryObj<typeof WodContainer>;

export const SimpleAndSinister: WodStory = {
  args: {
    initialCode:`# Simple & Sinister
> Never contest for space with a kettlebell.

:10 Get Ready

5:00 100 KB Swings @70lb
1:00 Rest
10:00 10 Turkish Getups 70lb`
  },
};

