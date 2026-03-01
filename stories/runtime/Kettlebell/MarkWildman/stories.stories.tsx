import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';

import markdown_TheManMaker from '../../../../wod/kettlebell/mark-wildman/the-man-maker.md?raw';
import markdown_HeavyLightProgramDesign from '../../../../wod/kettlebell/mark-wildman/heavy-light-program-design.md?raw';
import markdown_TheTwoBestExercises from '../../../../wod/kettlebell/mark-wildman/the-two-best-exercises.md?raw';
import markdown_BjjStrengthProgram from '../../../../wod/kettlebell/mark-wildman/bjj-strength-program.md?raw';
import markdown_FatLossProtocol from '../../../../wod/kettlebell/mark-wildman/fat-loss-protocol.md?raw';
import markdown_TetrisOfTraining from '../../../../wod/kettlebell/mark-wildman/tetris-of-training.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Kettlebell/Mark Wildman',
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
        component: 'Mark Wildman kettlebell workouts.'
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

export const WTheManMaker: Story = {
  ...createWorkoutStory(markdown_TheManMaker, 'wod/kettlebell/mark-wildman/the-man-maker.md'),
  name: 'The Man Maker (Full Body)'
};

export const WHeavyLightProgramDesign: Story = {
  ...createWorkoutStory(markdown_HeavyLightProgramDesign, 'wod/kettlebell/mark-wildman/heavy-light-program-design.md'),
  name: 'Heavy/Light Program Design'
};

export const WTheTwoBestExercises: Story = {
  ...createWorkoutStory(markdown_TheTwoBestExercises, 'wod/kettlebell/mark-wildman/the-two-best-exercises.md'),
  name: 'The Two Best Exercises'
};

export const WBjjStrengthProgram: Story = {
  ...createWorkoutStory(markdown_BjjStrengthProgram, 'wod/kettlebell/mark-wildman/bjj-strength-program.md'),
  name: 'BJJ Strength Program'
};

export const WFatLossProtocol: Story = {
  ...createWorkoutStory(markdown_FatLossProtocol, 'wod/kettlebell/mark-wildman/fat-loss-protocol.md'),
  name: 'Fat Loss Protocol (Beginner to Advanced)'
};

export const WTetrisOfTraining: Story = {
  ...createWorkoutStory(markdown_TetrisOfTraining, 'wod/kettlebell/mark-wildman/tetris-of-training.md'),
  name: 'Tetris of Training (Program Design)'
};
