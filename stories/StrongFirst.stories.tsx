import type { Meta, StoryObj } from '@storybook/react';
import { WodRunner } from '../src/components/WodRunner';
import React from 'react';

const meta: Meta<typeof WodRunner> = {
  title: 'Workouts/StrongFirst',
  component: WodRunner,
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
export type WodStory = StoryObj<typeof WodRunner>;

export const SimpleAndSinister: WodStory = {
  args: {
    code:`# Simple & Sinister
> Never contest for space with a kettlebell.

-:10 Get Ready

-5:00 100 KB Swings @70lb
-1:00 Rest
-10:00 10 Turkish Getups 70lb`
  },
};

