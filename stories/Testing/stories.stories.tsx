import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../StorybookWorkbench';

import markdownLoopsFixed from './workouts/loops-fixed.md?raw';
import markdownLoopsForTime from './workouts/loops-for-time.md?raw';
import markdownLoopsEMOM from './workouts/loops-emom.md?raw';
import markdownLoopsAMRAP from './workouts/loops-amrap.md?raw';
import markdownLoopsTabata from './workouts/loops-tabata.md?raw';

import markdownBlocksSimple from './workouts/blocks-simple.md?raw';
import markdownBlocksNested from './workouts/blocks-nested.md?raw';
import markdownBlocksRest from './workouts/blocks-rest.md?raw';
import markdownBlocksMetadata from './workouts/blocks-metadata.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Testing/Workouts',
  component: Workbench,
  args: {
    showToolbar: false,
    showContextOverlay: false,
    readonly: true,
    theme: 'wod-light',
    hidePlanUnlessDebug: true,
    initialShowPlan: false,
    initialShowTrack: true,
    initialShowReview: true,
    initialViewMode: 'track'
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Fast-executing workout fixtures for automated and manual testing of the runtime behavior.'
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

// Loops Group
export const LoopsFixed: Story = {
  ...createWorkoutStory(markdownLoopsFixed, 'stories/Testing/workouts/loops-fixed.md'),
  name: 'Loops/Fixed Rounds'
};

export const LoopsForTime: Story = {
  ...createWorkoutStory(markdownLoopsForTime, 'stories/Testing/workouts/loops-for-time.md'),
  name: 'Loops/For Time'
};

export const LoopsEMOM: Story = {
  ...createWorkoutStory(markdownLoopsEMOM, 'stories/Testing/workouts/loops-emom.md'),
  name: 'Loops/EMOM'
};

export const LoopsAMRAP: Story = {
  ...createWorkoutStory(markdownLoopsAMRAP, 'stories/Testing/workouts/loops-amrap.md'),
  name: 'Loops/AMRAP'
};

export const LoopsTabata: Story = {
  ...createWorkoutStory(markdownLoopsTabata, 'stories/Testing/workouts/loops-tabata.md'),
  name: 'Loops/Tabata'
};

// Blocks Group
export const BlocksSimple: Story = {
  ...createWorkoutStory(markdownBlocksSimple, 'stories/Testing/workouts/blocks-simple.md'),
  name: 'Blocks/Simple'
};

export const BlocksNested: Story = {
  ...createWorkoutStory(markdownBlocksNested, 'stories/Testing/workouts/blocks-nested.md'),
  name: 'Blocks/Nested'
};

export const BlocksRest: Story = {
  ...createWorkoutStory(markdownBlocksRest, 'stories/Testing/workouts/blocks-rest.md'),
  name: 'Blocks/Rest'
};

export const BlocksMetadata: Story = {
  ...createWorkoutStory(markdownBlocksMetadata, 'stories/Testing/workouts/blocks-metadata.md'),
  name: 'Blocks/Metadata'
};
