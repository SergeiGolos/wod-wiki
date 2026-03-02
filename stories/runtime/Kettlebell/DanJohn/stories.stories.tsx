import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';

import markdown_10000SwingChallenge from '../../../../wod/kettlebell/dan-john/10-000-swing-challenge.md?raw';
import markdown_ArmorBuildingComplex from '../../../../wod/kettlebell/dan-john/armor-building-complex.md?raw';
import markdown_SingleKettlebellArmorBuildingComplex from '../../../../wod/kettlebell/dan-john/single-kettlebell-armor-building-complex.md?raw';
import markdown_The40DayProgram from '../../../../wod/kettlebell/dan-john/the-40-day-program.md?raw';
import markdown_TheMassProgram from '../../../../wod/kettlebell/dan-john/the-mass-program.md?raw';
import markdown_TheParkBenchProgram from '../../../../wod/kettlebell/dan-john/the-park-bench-program.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Kettlebell/Dan John',
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
        component: 'Dan John kettlebell workouts.'
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

export const W10000SwingChallenge: Story = {
  ...createWorkoutStory(markdown_10000SwingChallenge, 'wod/kettlebell/dan-john/10-000-swing-challenge.md'),
  name: '10,000 Swing Challenge'
};

export const WArmorBuildingComplex: Story = {
  ...createWorkoutStory(markdown_ArmorBuildingComplex, 'wod/kettlebell/dan-john/armor-building-complex.md'),
  name: 'Armor Building Complex (ABC)'
};

export const WSingleKettlebellArmorBuildingComplex: Story = {
  ...createWorkoutStory(markdown_SingleKettlebellArmorBuildingComplex, 'wod/kettlebell/dan-john/single-kettlebell-armor-building-complex.md'),
  name: 'Single Kettlebell Armor Building Complex'
};

export const WThe40DayProgram: Story = {
  ...createWorkoutStory(markdown_The40DayProgram, 'wod/kettlebell/dan-john/the-40-day-program.md'),
  name: 'The 40-Day Program'
};

export const WTheMassProgram: Story = {
  ...createWorkoutStory(markdown_TheMassProgram, 'wod/kettlebell/dan-john/the-mass-program.md'),
  name: 'The Mass Program'
};

export const WTheParkBenchProgram: Story = {
  ...createWorkoutStory(markdown_TheParkBenchProgram, 'wod/kettlebell/dan-john/the-park-bench-program.md'),
  name: 'The Park Bench Program'
};
