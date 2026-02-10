import type { Meta, StoryObj } from '@storybook/react';
import { Workbench } from '../../src/components/layout/Workbench';
import React from 'react';

import annieMarkdown from '../../wod/annie.md?raw';
import barbaraMarkdown from '../../wod/barbara.md?raw';
import chelseaMarkdown from '../../wod/chelsea.md?raw';
import cindyMarkdown from '../../wod/cindy.md?raw';
import dianeMarkdown from '../../wod/diane.md?raw';
import elizabethMarkdown from '../../wod/elizabeth.md?raw';
import franMarkdown from '../../wod/fran.md?raw';
import graceMarkdown from '../../wod/grace.md?raw';
import helenMarkdown from '../../wod/helen.md?raw';
import isabelMarkdown from '../../wod/isabel.md?raw';
import jackieMarkdown from '../../wod/jackie.md?raw';
import karenMarkdown from '../../wod/karen.md?raw';
import lindaMarkdown from '../../wod/linda.md?raw';
import maryMarkdown from '../../wod/mary.md?raw';
import nancyMarkdown from '../../wod/nancy.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Crossfit',
  component: Workbench,
  args: {
    showToolbar: false,
    showContextOverlay: false,
    readonly: true,
    theme: 'wod-light'
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'CrossFit benchmark "Girls" workouts rendered with the MarkdownEditor. Each story sources its content directly from the markdown files stored in `wod/`.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// Official CrossFit YouTube video URLs for each benchmark have been moved to wod/workout-videos.json

const createWorkoutStory = (content: string, source: string): Story => {
  return {
    args: { initialContent: content },
    parameters: {
      docs: {
        description: {
          story: `Markdown source: ${source}`
        }
      }
    }
  };
};

export const Fran = createWorkoutStory(franMarkdown, 'wod/fran.md');
export const Annie = createWorkoutStory(annieMarkdown, 'wod/annie.md');
export const Barbara = createWorkoutStory(barbaraMarkdown, 'wod/barbara.md');
export const Chelsea = createWorkoutStory(chelseaMarkdown, 'wod/chelsea.md');
export const Cindy = createWorkoutStory(cindyMarkdown, 'wod/cindy.md');
export const Diane = createWorkoutStory(dianeMarkdown, 'wod/diane.md');
export const Elizabeth = createWorkoutStory(elizabethMarkdown, 'wod/elizabeth.md');
export const Grace = createWorkoutStory(graceMarkdown, 'wod/grace.md');
export const Helen = createWorkoutStory(helenMarkdown, 'wod/helen.md');
export const Isabel = createWorkoutStory(isabelMarkdown, 'wod/isabel.md');
export const Jackie = createWorkoutStory(jackieMarkdown, 'wod/jackie.md');
export const Karen = createWorkoutStory(karenMarkdown, 'wod/karen.md');
export const Linda = createWorkoutStory(lindaMarkdown, 'wod/linda.md');
export const Mary = createWorkoutStory(maryMarkdown, 'wod/mary.md');
export const Nancy = createWorkoutStory(nancyMarkdown, 'wod/nancy.md');
