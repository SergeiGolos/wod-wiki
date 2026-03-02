import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';

import markdown_SimpleSinister from '../../../../wod/kettlebell/strongfirst/simple-sinister.md?raw';
import markdown_TheRiteOfPassage from '../../../../wod/kettlebell/strongfirst/the-rite-of-passage.md?raw';
import markdown_QuickAndTheDead from '../../../../wod/kettlebell/strongfirst/quick-and-the-dead.md?raw';
import markdown_TheEagle from '../../../../wod/kettlebell/strongfirst/the-eagle.md?raw';
import markdown_StrongfirstSnatchTest from '../../../../wod/kettlebell/strongfirst/strongfirst-snatch-test.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Kettlebell/StrongFirst',
  component: Workbench,
  args: {
    showToolbar: false,
    showContextOverlay: false,
    readonly: true,
    theme: 'wod-light',
    hidePlanUnlessDebug: true,
    initialShowPlan: false,
    initialShowTrack: true,
    initialShowReview: true
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'StrongFirst kettlebell workouts.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

const createWorkoutStory = (content: string, source: string): Story => ({
  args: { initialContent: content },
  parameters: {
    docs: {
      description: {
        story: `Markdown source: ${source}`
      }
    }
  }
});

export const WSimpleSinister: Story = {
  ...createWorkoutStory(markdown_SimpleSinister, 'wod/kettlebell/strongfirst/simple-sinister.md'),
  name: 'Simple & Sinister'
};

export const WTheRiteOfPassage: Story = {
  ...createWorkoutStory(markdown_TheRiteOfPassage, 'wod/kettlebell/strongfirst/the-rite-of-passage.md'),
  name: 'The Rite of Passage'
};

export const WQuickAndTheDead: Story = {
  ...createWorkoutStory(markdown_QuickAndTheDead, 'wod/kettlebell/strongfirst/quick-and-the-dead.md'),
  name: 'Quick and the Dead'
};

export const WTheEagle: Story = {
  ...createWorkoutStory(markdown_TheEagle, 'wod/kettlebell/strongfirst/the-eagle.md'),
  name: 'The Eagle'
};

export const WStrongfirstSnatchTest: Story = {
  ...createWorkoutStory(markdown_StrongfirstSnatchTest, 'wod/kettlebell/strongfirst/strongfirst-snatch-test.md'),
  name: 'StrongFirst Snatch Test'
};
