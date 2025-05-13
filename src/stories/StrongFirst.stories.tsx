import type { Meta, StoryObj } from '@storybook/react';
import '../index.css';
import { EditorWithState } from './components/EditorWithState';


const meta: Meta<typeof EditorWithState> = {
  title: 'Workouts/StrongFirst',
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

export const SimpleAndSinister: WodStory = {
  args: {
    id: "SimpleAndSinister",
    debug: false,
    code:`5:00 100 KB Swings 70lb [:done]
1:00 Rest
10:00 10 Turkish Getups 70lb [:done]`
  },
};

export const KBAxeHeavy: WodStory = {
  args: {
    id: "KBAxeHeavy",
    debug: true,
    code:`(20) 1:00 
  4 KB Swings 106lb [:rest]`
  },
};

export const KBAxeLite: WodStory = {
  args: {
    id: "KBAxeLite",
    debug: false,
    code:`(20) 1:00 
  6 KB Swings 70lb [:rest]`
  },
};

