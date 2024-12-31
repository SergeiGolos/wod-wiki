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
    code:`# Fran

:10 Get Ready

(21-15-9) 
  Thursters @96lb
  Pullups`
  },
};

export const Annie: WodStory = {
  args: {
    code: `# Annie

:10 Get Ready

(50-40-30-20-10)
  Double-Unders
  Situps`
  }
};

export const Barbara: WodStory = {
  args: {
    code: `# Barbara

:10 Get Ready

(5 Rounds)
  20 Pullups
  30 Pushups
  40 Situps
  50 Air Squats
  :180 Rest`
  }
};

export const Chelsea: WodStory = {
  args: {
    code: `# Chelsea

:10 Get Ready

(30:00 EMOM)
  5 Pullups
  10 Pushups
  15 Air Squats`
  }
};

export const Cindy: WodStory = {
  args: {
    code: `# Cindy

:10 Get Ready

(20:00 AMRAP)
  5 Pullups
  10 Pushups
  15 Air Squats`
  }
};

export const Diane: WodStory = {
  args: {
    code: `# Diane

:10 Get Ready

(21-15-9)
  Deadlift @225lb
  Handstand Pushups`
  }
};

export const Elizabeth: WodStory = {
  args: {
    code: `# Elizabeth

:10 Get Ready

(21-15-9)
  Clean @135lb
  Ring Dips`
  }
};

export const Grace: WodStory = {
  args: {
    code: `# Grace

:10 Get Ready

30 Clean & Jerk @135lb`
  }
};

export const Helen: WodStory = {
  args: {
    code: `# Helen

:10 Get Ready

(3 Rounds)
  400m Run
  21 KB Swings @53lb
  12 Pullups`
  }
};

export const Isabel: WodStory = {
  args: {
    code: `# Isabel

:10 Get Ready

30 Snatch @135lb`
  }
};

export const Jackie: WodStory = {
  args: {
    code: `# Jackie

:10 Get Ready

1000m Row
50 Thrusters @45lb
30 Pullups`
  }
};

export const Karen: WodStory = {
  args: {
    code: `# Karen

:10 Get Ready

150 Wall Ball Shots @20lb`
  }
};

export const Linda: WodStory = {
  args: {
    code: `# Linda (The Three Bars of Death)

:10 Get Ready

(10-9-8-7-6-5-4-3-2-1)
  Deadlift @1.5BW
  Bench Press @BW
  Clean @0.75BW`
  }
};

export const Mary: WodStory = {
  args: {
    code: `# Mary

:10 Get Ready

(20:00 AMRAP)
  5 Handstand Pushups
  10 Single-leg Squats
  15 Pullups`
  }
};

export const Nancy: WodStory = {
  args: {
    code: `# Nancy

:10 Get Ready

(5 Rounds)
  400m Run
  15 Overhead Squats @95lb`
  }
};
