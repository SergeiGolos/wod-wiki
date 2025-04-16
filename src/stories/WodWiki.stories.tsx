import type { Meta, StoryObj } from '@storybook/react';
import '../index.css';
import { EditorWithState } from './components/EditorWithState';
import { SoundProvider } from '../core/contexts/SoundContext';

const meta: Meta<typeof EditorWithState> = {
  title: 'Workouts/Examples',
  component: EditorWithState,
  parameters: {
    controls: { hideNoControlsWarning: true },
    layout: 'fullscreen',
    showPanel: false
  },
  argTypes: {
    debug: { control: 'boolean' }
  },
  
  // Use a decorator to wrap all stories with SoundProvider
  decorators: [
    (Story) => (
      <SoundProvider>
        <Story />
      </SoundProvider>
    )
  ]
};

export default meta;
export type WodStory = StoryObj<typeof EditorWithState>;

export const Empty: WodStory = {
  args: {
    id: "Empty",
    debug: false,
    code: '',        
  },
};

export const Countdown: WodStory = {
  args: {
    id: "Countdown",
    debug: false,
    code: `20:00 Work`,
  },
};  

export const Emom: WodStory = {
  args: {
    id: "Emom",
    debug: false,
    code: `(30) 1:00 Work`,
  },
};

export const IronBlackJack: WodStory = {
  args: {
    id: "IronBlackJack",
    debug: false,
    code:`(30) 1:00
  10 Macebell Touchdowns 30lb
  6 KB swings 106lb
  3 Deadlifts 235lb`
  },
};

export const AMRAP: WodStory = {
  args: {
    id: "AMRAP",
    debug: false,
    code: `AMRAP 20:00
  10 Burpees
  15 Pull-ups
  20 Box jumps`
  },
};

export const ForTime: WodStory = {
  args: {
    id: "ForTime",
    debug: false,
    code: `For Time (20:00 cap)
  5 Rounds:
    20 Wall balls
    15 Kettlebell swings
    10 Toes to bar`
  }
};