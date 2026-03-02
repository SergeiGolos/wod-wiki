import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../../../StorybookWorkbench';

import markdown_ForLoveOfTraining from '../../../../wod/kettlebell/joe-daniels/for-love-of-training.md?raw';
import markdown_OuterlimitsProtocol from '../../../../wod/kettlebell/joe-daniels/outerlimits-protocol.md?raw';
import markdown_TuesdayTens from '../../../../wod/kettlebell/joe-daniels/tuesday-tens.md?raw';
import markdown_KbomgFullBody from '../../../../wod/kettlebell/joe-daniels/kbomg-full-body.md?raw';
import markdown_FundamentalsProgram from '../../../../wod/kettlebell/joe-daniels/fundamentals-program.md?raw';
import markdown_SportPreparationSession from '../../../../wod/kettlebell/joe-daniels/sport-preparation-session.md?raw';
import markdown_OverheadSquatSession from '../../../../wod/kettlebell/joe-daniels/overhead-squat-session.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Kettlebell/Joe Daniels',
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
        component: 'Joe Daniels kettlebell workouts.'
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

export const WForLoveOfTraining: Story = {
  ...createWorkoutStory(markdown_ForLoveOfTraining, 'wod/kettlebell/joe-daniels/for-love-of-training.md'),
  name: 'For Love of Training (8-Week Program)'
};

export const WOuterlimitsProtocol: Story = {
  ...createWorkoutStory(markdown_OuterlimitsProtocol, 'wod/kettlebell/joe-daniels/outerlimits-protocol.md'),
  name: 'Outerlimits Protocol'
};

export const WTuesdayTens: Story = {
  ...createWorkoutStory(markdown_TuesdayTens, 'wod/kettlebell/joe-daniels/tuesday-tens.md'),
  name: 'Tuesday Tens'
};

export const WKbomgFullBody: Story = {
  ...createWorkoutStory(markdown_KbomgFullBody, 'wod/kettlebell/joe-daniels/kbomg-full-body.md'),
  name: 'KBOMG (Kettlebell Only Muscle Gain) - Full Body'
};

export const WFundamentalsProgram: Story = {
  ...createWorkoutStory(markdown_FundamentalsProgram, 'wod/kettlebell/joe-daniels/fundamentals-program.md'),
  name: 'Fundamentals Program'
};

export const WSportPreparationSession: Story = {
  ...createWorkoutStory(markdown_SportPreparationSession, 'wod/kettlebell/joe-daniels/sport-preparation-session.md'),
  name: 'Sport Preparation Session'
};

export const WOverheadSquatSession: Story = {
  ...createWorkoutStory(markdown_OverheadSquatSession, 'wod/kettlebell/joe-daniels/overhead-squat-session.md'),
  name: 'Overhead Squat Session'
};
