import { WodContainer } from '@/app/components/editor/WodContainer';
import type { Meta, StoryObj } from '@storybook/react';


const meta: Meta<typeof WodContainer> = {
  title: 'Workouts/Swimming',
  component: WodContainer,
  parameters: {
    controls: { hideNoControlsWarning: true },
    showPanel: false
  }
};

export default meta;
export type WodStory = StoryObj<typeof WodContainer>;

export const BeginnerFriendltySwimming: WodStory = {
  args: {
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
