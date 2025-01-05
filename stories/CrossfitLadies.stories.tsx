import type { Meta, StoryObj } from '@storybook/react';
import { WodContainer } from '../src/components/WodContainer';
import React from 'react';

const meta: Meta<typeof WodContainer> = {
  title: 'Workouts/CrossfitLadies',
  component: WodContainer,  
  parameters: {
    controls: { hideNoControlsWarning: true },
    showPanel: false
  }
};

export default meta;
export type WodStory = StoryObj<typeof WodContainer>;

export const Fran: WodStory = {
  args: {
    code:`(21-15-9) 
  Thursters @96lb
  Pullups`
  },
};

export const Annie: WodStory = {
  args: {
    code: `(50-40-30-20-10)
  Double-Unders
  Situps`
  }
};

export const Barbara: WodStory = {
  args: {
    code: `(5) Rounds
  20 Pullups
  30 Pushups
  40 Situps
  50 Air Squats
  :180 Rest`
  }
};

export const Chelsea: WodStory = {
  args: {
    code: `(30) :60 EMOM
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats`
  }
};

export const Cindy: WodStory = {
  args: {
    code: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`
  }
};

export const Diane: WodStory = {
  args: {
    code: `(21-15-9)
  Deadlift @225lb
  Handstand Pushups`
  }
};

export const Elizabeth: WodStory = {
  args: {
    code: `(21-15-9)
  Clean @135lb
  Ring Dips`
  }
};

export const Grace: WodStory = {
  args: {
    code: `30 Clean & Jerk @135lb`
  }
};

export const Helen: WodStory = {
  args: {
    code: `(3) Rounds
  400m Run
  21 KB Swings @53lb
  12 Pullups`
  }
};

export const Isabel: WodStory = {
  args: {
    code: `30 Snatch @135lb`
  }
};

export const Jackie: WodStory = {
  args: {
    code: `1000m Row
50 Thrusters @45lb
30 Pullups`
  }
};

export const Karen: WodStory = {
  args: {
    code: `150 Wall Ball Shots @20lb`
  }
};

export const Linda: WodStory = {
  args: {
    code: `(10-9-8-7-6-5-4-3-2-1)
  Deadlift @1.5BW
  Bench Press @BW
  Clean @0.75BW`
  }
};

export const Mary: WodStory = {
  args: {
    code: `20:00 AMRAP
  + 5 Handstand Pushups
  + 10 Single-leg Squats
  + 15 Pullups`
  }
};

export const Nancy: WodStory = {
  args: {
    code: `(5 Rounds)
  400m Run
  15 Overhead Squats @95lb`
  }
};
