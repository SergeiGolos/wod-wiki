import { StorybookWorkbench as Workbench } from '../StorybookWorkbench';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Workbench> = {
  title: 'Syntax/Interactive Guide',
  component: Workbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Interactive syntax guide using the full Workbench. Step through examples of different workout types.'
      }
    }
  },
  args: {
    showToolbar: false,
    readonly: true,
    theme: 'wod-light',
    initialShowPlan: true,
    initialShowTrack: true,
    initialShowReview: true,
    initialActiveEntryId: 'syntax/basics'
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basics: Story = {
  name: '1. The Basics',
  args: { initialActiveEntryId: 'syntax/basics' }
};

export const Timers: Story = {
  name: '2. Timers & Intervals',
  args: { initialActiveEntryId: 'syntax/timers' }
};

export const Repeaters: Story = {
  name: '3. Repeaters',
  args: { initialActiveEntryId: 'syntax/repeaters' }
};

export const Groups: Story = {
  name: '4. Groups',
  args: { initialActiveEntryId: 'syntax/groups' }
};

export const Measurements: Story = {
  name: '5. Measurements',
  args: { initialActiveEntryId: 'syntax/measurements' }
};

export const Supplemental: Story = {
  name: '6. Supplemental Data',
  args: { initialActiveEntryId: 'syntax/supplemental' }
};

export const Agentic: Story = {
  name: '7. Agentic Skill',
  args: { initialActiveEntryId: 'syntax/agentic' }
};
