import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';

import markdown_KettlebellTrainingBeginnerProgram from '../../../../wod/kettlebell/steve-cotter/kettlebell-training-beginner-program.md?raw';
import markdown_IntermediateStrengthProgram from '../../../../wod/kettlebell/steve-cotter/intermediate-strength-program.md?raw';
import markdown_TheWayOfTheKettlebell from '../../../../wod/kettlebell/steve-cotter/the-way-of-the-kettlebell.md?raw';
import markdown_KettlebellSportPreparation from '../../../../wod/kettlebell/steve-cotter/kettlebell-sport-preparation.md?raw';
import markdown_EncyclopediaSeriesAdvancedComplex from '../../../../wod/kettlebell/steve-cotter/encyclopedia-series-advanced-complex.md?raw';
import markdown_MobilityAndFlexibilitySession from '../../../../wod/kettlebell/steve-cotter/mobility-and-flexibility-session.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Kettlebell/Steve Cotter',
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
        component: 'Steve Cotter kettlebell workouts.'
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

export const WKettlebellTrainingBeginnerProgram: Story = {
  ...createWorkoutStory(markdown_KettlebellTrainingBeginnerProgram, 'wod/kettlebell/steve-cotter/kettlebell-training-beginner-program.md'),
  name: 'Kettlebell Training - Beginner Program'
};

export const WIntermediateStrengthProgram: Story = {
  ...createWorkoutStory(markdown_IntermediateStrengthProgram, 'wod/kettlebell/steve-cotter/intermediate-strength-program.md'),
  name: 'Intermediate Strength Program'
};

export const WTheWayOfTheKettlebell: Story = {
  ...createWorkoutStory(markdown_TheWayOfTheKettlebell, 'wod/kettlebell/steve-cotter/the-way-of-the-kettlebell.md'),
  name: 'The Way of the Kettlebell (Mindvalley Program)'
};

export const WKettlebellSportPreparation: Story = {
  ...createWorkoutStory(markdown_KettlebellSportPreparation, 'wod/kettlebell/steve-cotter/kettlebell-sport-preparation.md'),
  name: 'Kettlebell Sport Preparation'
};

export const WEncyclopediaSeriesAdvancedComplex: Story = {
  ...createWorkoutStory(markdown_EncyclopediaSeriesAdvancedComplex, 'wod/kettlebell/steve-cotter/encyclopedia-series-advanced-complex.md'),
  name: 'Encyclopedia Series - Advanced Complex'
};

export const WMobilityAndFlexibilitySession: Story = {
  ...createWorkoutStory(markdown_MobilityAndFlexibilitySession, 'wod/kettlebell/steve-cotter/mobility-and-flexibility-session.md'),
  name: 'Mobility and Flexibility Session'
};
