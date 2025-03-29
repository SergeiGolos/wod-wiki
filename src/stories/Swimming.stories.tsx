import type { Meta, StoryObj } from '@storybook/react';
import '../index.css';
import { EditorWithState } from './components/EditorWithState';

const meta: Meta<typeof EditorWithState> = {
  title: 'Workouts/Swimming',
  component: EditorWithState,
  parameters: {
    controls: { hideNoControlsWarning: true },
    layout: 'fullscreen',
    showPanel: false
  }
};

export default meta;
export type WodStory = StoryObj<typeof EditorWithState>;

export const BeginnerFriendltySwimming: WodStory = {
  args: {
    id: "BeginnerSwimming",
    code:`(6) Warmup
  25m Swim
  :20 Rest

100m Kick

(6) Warmup
  25m Swim
  :20 Rest

100m Kick

(6) Warmup
  25m Swim
  :20 Rest
  
100m Cooldown`
  },
};
