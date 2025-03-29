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
  }
};

export default meta;
export type WodStory = StoryObj<typeof EditorWithState>;

export const SimpleAndSinister: WodStory = {
  args: {
    id: "SimpleAndSinister",
    code:`5:00 100 KB Swings 70lb
1:00 Rest
10:00 10 Turkish Getups 70lb`
  },
};
