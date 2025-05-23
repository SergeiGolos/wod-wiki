import type { Meta, StoryObj } from '@storybook/react';
import '../index.css';
import { EditorWithState } from './components/EditorWithState';


const meta: Meta<typeof EditorWithState> = {
  title: 'Workouts/CrossfitLadies',
  component: EditorWithState,  
  parameters: {
    controls: { hideNoControlsWarning: true },
    layout: 'fullscreen',
    showPanel: false
  },
  argTypes: {
    debug: { control: 'boolean' }
  }
};

export default meta;
export type WodStory = StoryObj<typeof EditorWithState>;

export const Fran: WodStory = {
  args: {
    id: "Fran",
    debug: false,
    code:`(21-15-9) 
  Thursters 95lb
  Pullups`
  },
};

export const Annie: WodStory = {
  args: {
    id: "Annie",
    debug: false,
    code: `(50-40-30-20-10)
  Double-Unders
  Situps`
  }
};

export const Barbara: WodStory = {
  args: {
    id: "Barbara",
    debug: false,
    code: `(5)
  + 20 Pullups
  + 30 Pushups
  + 40 Situps
  + 50 Air Squats
  3:00 Rest`
  }
};

export const Chelsea: WodStory = {
  args: {
    id: "Chelsea",
    debug: false,
    code: `(30) :60 EMOM
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats`
  }
};

export const Cindy: WodStory = {
  args: {
    id: "Cindy",
    debug: false,
    code: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`
  }
};

export const Diane: WodStory = {
  args: {
    id: "Diane",
    debug: false,
    code: `(21-15-9)
  Deadlift 225lb
  Handstand Pushups`
  }
};

export const Elizabeth: WodStory = {
  args: {
    id: "Elizabeth",
    debug: false,
    code: `(21-15-9)
  Clean 135lb
  Ring Dips`
  }
};

export const Grace: WodStory = {
  args: {
    id: "Grace",
    debug: false,
    code: `30 Clean & Jerk 135lb`
  }
};

export const Helen: WodStory = {
  args: {
    id: "Helen",
    debug: false,
    code: `(3)
  400m Run
  21 KB Swings 53lb
  12 Pullups`
  }
};

export const Isabel: WodStory = {
  args: {
    id: "Isabel",
    debug: false,
    code: `30 Snatch 135lb`
  }
};

export const Jackie: WodStory = {
  args: {
    id: "Jackie",
    debug: false,
    code: `1000m Row
50 Thrusters 45lb
30 Pullups`
  }
};

export const Karen: WodStory = {
  args: {
    id: "Karen",
    debug: false,
    code: `150 Wall Ball Shots 20lb`
  }
};

export const Linda: WodStory = {
  args: {
    id: "Linda",
    debug: false,
    code: `(10-9-8-7-6-5-4-3-2-1)
  Deadlift 1.5BW
  Bench Press 1BW
  Clean 0.75BW`
  }
};

export const Mary: WodStory = {
  args: {
    id: "Mary",
    debug: false,
    code: `20:00 AMRAP
  + 5 Handstand Pushups
  + 10 Single-leg Squats
  + 15 Pullups`
  }
};

export const Nancy: WodStory = {
  args: {
    id: "Nancy",
    debug: false,
    code: `(5)
  400m Run
  15 Overhead Squats 95lb`
  }
};
