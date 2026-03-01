import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';

import markdown_ExtremeKettlebellCardioWorkout1 from '../../../../wod/kettlebell/keith-weber/extreme-kettlebell-cardio-workout-1.md?raw';
import markdown_TheManMaker from '../../../../wod/kettlebell/keith-weber/the-man-maker.md?raw';
import markdown_TheKettlebellFitnessTest from '../../../../wod/kettlebell/keith-weber/the-kettlebell-fitness-test.md?raw';
import markdown_UpperBodyBlast from '../../../../wod/kettlebell/keith-weber/upper-body-blast.md?raw';
import markdown_TheFinisher from '../../../../wod/kettlebell/keith-weber/the-finisher.md?raw';
import markdown_DoubleKettlebellExtreme from '../../../../wod/kettlebell/keith-weber/double-kettlebell-extreme.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Kettlebell/Keith Weber',
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
        component: 'Keith Weber kettlebell workouts.'
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

export const WExtremeKettlebellCardioWorkout1: Story = {
  ...createWorkoutStory(markdown_ExtremeKettlebellCardioWorkout1, 'wod/kettlebell/keith-weber/extreme-kettlebell-cardio-workout-1.md'),
  name: 'Extreme Kettlebell Cardio Workout 1 (Full Body)'
};

export const WTheManMaker: Story = {
  ...createWorkoutStory(markdown_TheManMaker, 'wod/kettlebell/keith-weber/the-man-maker.md'),
  name: 'The Man Maker (Leg Focus)'
};

export const WTheKettlebellFitnessTest: Story = {
  ...createWorkoutStory(markdown_TheKettlebellFitnessTest, 'wod/kettlebell/keith-weber/the-kettlebell-fitness-test.md'),
  name: 'The Kettlebell Fitness Test'
};

export const WUpperBodyBlast: Story = {
  ...createWorkoutStory(markdown_UpperBodyBlast, 'wod/kettlebell/keith-weber/upper-body-blast.md'),
  name: 'Upper Body Blast'
};

export const WTheFinisher: Story = {
  ...createWorkoutStory(markdown_TheFinisher, 'wod/kettlebell/keith-weber/the-finisher.md'),
  name: 'The Finisher (Metabolic Conditioning)'
};

export const WDoubleKettlebellExtreme: Story = {
  ...createWorkoutStory(markdown_DoubleKettlebellExtreme, 'wod/kettlebell/keith-weber/double-kettlebell-extreme.md'),
  name: 'Double Kettlebell Extreme'
};
