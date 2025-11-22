import type { Meta, StoryObj } from '@storybook/react';
import { WodWorkbench } from '../../src/components/layout/WodWorkbench';
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

const meta: Meta<typeof WodWorkbench> = {
  title: 'Examples/Crossfit',
  component: WodWorkbench,
  args: {
    showToolbar: false,
    showContextOverlay: false,
    readonly: true,
    theme: 'vs',
    height: '85vh'
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'CrossFit benchmark "Girls" workouts rendered with the MarkdownEditor. Each story sources its content directly from the markdown files stored in `wod/` and includes an official CrossFit demonstration video where available.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// Official CrossFit YouTube video URLs for each benchmark
const WORKOUT_VIDEOS: Record<string, string> = {
  fran: 'YO1_G7ygdmQ',           // CrossFit - "Fran" WOD 100909 Demo
  annie: 'ItouRkkXlR4',          // Gymnasty Annie WOD Demo: 230104
  barbara: 'nMWH0qmM-QA',        // Back Squat Barbara WOD Demo: 230102
  chelsea: 'syIkJSPBxaw',        // Workout Tips for 211014 (Chelsea)
  cindy: 'fQYThP8jrfs',          // Cindy WOD Demo: 220927
  diane: 'smT8ptwxNKI',          // CrossFit - "Diane" WOD Demo
  elizabeth: 'jgOdLBrrkQQ',      // Elizabeth (squat) WOD Demo: 220829
  grace: 'HAsVIDxa3fU',          // Grace WOD Demo: 230207
  helen: 'i016AKIYUgs',          // Workout Tips for 220509 (Helen)
  isabel: 'w0EhRykalqE',         // Isabel WOD Demo: 230523
  jackie: 'SSRB02KN0nI',         // Jackie WOD Demo: 230509
  karen: '9rt5hmYjpLU',          // Workout Tips for 220403 (Karen)
  linda: 'Cy0xT3lxwDk',          // Linda WOD Demo: 220516
  mary: 'X74ql7d5T-4',           // WOD 130106 Demo (Mary)
  nancy: 'l-jTfN2r_1g',          // Nancy WOD Demo: 220214
};

const createWorkoutStory = (content: string, source: string, videoId?: string): Story => {
  // Prepend video link to markdown content if videoId is provided
  const contentWithVideo = videoId 
    ? `![https://www.youtube.com/watch?v=${videoId}](https://www.youtube.com/watch?v=${videoId})\n\n---\n\n${content}`
    : content;

  return {
    args: { initialContent: contentWithVideo },
    parameters: {
      docs: {
        description: {
          story: `Markdown source: ${source}${videoId ? ` (with embedded video link)` : ''}`
        }
      }
    }
  };
};

export const Fran = createWorkoutStory(franMarkdown, 'wod/fran.md', WORKOUT_VIDEOS.fran);
export const Annie = createWorkoutStory(annieMarkdown, 'wod/annie.md', WORKOUT_VIDEOS.annie);
export const Barbara = createWorkoutStory(barbaraMarkdown, 'wod/barbara.md', WORKOUT_VIDEOS.barbara);
export const Chelsea = createWorkoutStory(chelseaMarkdown, 'wod/chelsea.md', WORKOUT_VIDEOS.chelsea);
export const Cindy = createWorkoutStory(cindyMarkdown, 'wod/cindy.md', WORKOUT_VIDEOS.cindy);
export const Diane = createWorkoutStory(dianeMarkdown, 'wod/diane.md', WORKOUT_VIDEOS.diane);
export const Elizabeth = createWorkoutStory(elizabethMarkdown, 'wod/elizabeth.md', WORKOUT_VIDEOS.elizabeth);
export const Grace = createWorkoutStory(graceMarkdown, 'wod/grace.md', WORKOUT_VIDEOS.grace);
export const Helen = createWorkoutStory(helenMarkdown, 'wod/helen.md', WORKOUT_VIDEOS.helen);
export const Isabel = createWorkoutStory(isabelMarkdown, 'wod/isabel.md', WORKOUT_VIDEOS.isabel);
export const Jackie = createWorkoutStory(jackieMarkdown, 'wod/jackie.md', WORKOUT_VIDEOS.jackie);
export const Karen = createWorkoutStory(karenMarkdown, 'wod/karen.md', WORKOUT_VIDEOS.karen);
export const Linda = createWorkoutStory(lindaMarkdown, 'wod/linda.md', WORKOUT_VIDEOS.linda);
export const Mary = createWorkoutStory(maryMarkdown, 'wod/mary.md', WORKOUT_VIDEOS.mary);
export const Nancy = createWorkoutStory(nancyMarkdown, 'wod/nancy.md', WORKOUT_VIDEOS.nancy);
