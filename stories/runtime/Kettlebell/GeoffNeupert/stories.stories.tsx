import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';

import markdown_DoubleKettlebellCleanAndPress from '../../../../wod/kettlebell/geoff-neupert/double-kettlebell-clean-and-press.md?raw';
import markdown_KettlebellMuscleComplex1 from '../../../../wod/kettlebell/geoff-neupert/kettlebell-muscle-complex-1.md?raw';
import markdown_TheUniverse from '../../../../wod/kettlebell/geoff-neupert/the-universe.md?raw';
import markdown_SecretServiceSnatchTest from '../../../../wod/kettlebell/geoff-neupert/secret-service-snatch-test.md?raw';
import markdown_2Kettlebells12WeeksProgram from '../../../../wod/kettlebell/geoff-neupert/2-kettlebells-12-weeks-program.md?raw';
import markdown_EasyMuscle from '../../../../wod/kettlebell/geoff-neupert/easy-muscle.md?raw';
import markdown_SwingHard from '../../../../wod/kettlebell/geoff-neupert/swing-hard.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Kettlebell/Geoff Neupert',
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
        component: 'Geoff Neupert kettlebell workouts.'
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

export const WDoubleKettlebellCleanAndPress: Story = {
  ...createWorkoutStory(markdown_DoubleKettlebellCleanAndPress, 'wod/kettlebell/geoff-neupert/double-kettlebell-clean-and-press.md'),
  name: 'Double Kettlebell Clean and Press'
};

export const WKettlebellMuscleComplex1: Story = {
  ...createWorkoutStory(markdown_KettlebellMuscleComplex1, 'wod/kettlebell/geoff-neupert/kettlebell-muscle-complex-1.md'),
  name: 'Kettlebell Muscle Complex 1'
};

export const WTheUniverse: Story = {
  ...createWorkoutStory(markdown_TheUniverse, 'wod/kettlebell/geoff-neupert/the-universe.md'),
  name: 'The Universe (Light Day)'
};

export const WSecretServiceSnatchTest: Story = {
  ...createWorkoutStory(markdown_SecretServiceSnatchTest, 'wod/kettlebell/geoff-neupert/secret-service-snatch-test.md'),
  name: 'Secret Service Snatch Test'
};

export const W2Kettlebells12WeeksProgram: Story = {
  ...createWorkoutStory(markdown_2Kettlebells12WeeksProgram, 'wod/kettlebell/geoff-neupert/2-kettlebells-12-weeks-program.md'),
  name: '2 Kettlebells 12 Weeks Program'
};

export const WEasyMuscle: Story = {
  ...createWorkoutStory(markdown_EasyMuscle, 'wod/kettlebell/geoff-neupert/easy-muscle.md'),
  name: 'Easy Muscle'
};

export const WSwingHard: Story = {
  ...createWorkoutStory(markdown_SwingHard, 'wod/kettlebell/geoff-neupert/swing-hard.md'),
  name: 'Swing Hard'
};
