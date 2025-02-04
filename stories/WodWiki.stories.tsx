import { WodContainer } from '@/app/components/editor/WodContainer';
import type { Meta, StoryObj } from '@storybook/react';


const meta: Meta<typeof WodContainer> = {
  title: 'Components/Wiki',
  component: WodContainer,
  parameters: {
    controls: { hideNoControlsWarning: true },
    showPanel: false
  }
};

export default meta;
export type WodStory = StoryObj<typeof WodContainer>;

export const Empty: WodStory = {
  args: {
    id: "Empty",
    code: '',        
  },
};

export const Countdown: WodStory = {
  args: {
    id: "Countdown",
    code: `20:00 Work`,
  },
};  

export const Emom: WodStory = {
  args: {
    id: "Emom",
    code: `(30) 1:00 Work`,
  },
};


export const IronBlackJack: WodStory = {
  args: {
    id: "IronBlackJack",
    code:`(30) 1:00
  10 Macebell Touchdowns 30lb
  6 KB swings 106lb
  3 Deadlifts 235lb`
  },
};