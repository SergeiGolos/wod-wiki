import type { Meta, StoryObj } from '@storybook/react';
import { CommitGraph } from '@/components/ui/CommitGraph';

const meta: Meta<typeof CommitGraph> = {
  title: 'Components/UI/CommitGraph',
  component: CommitGraph,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    rows: { control: 'number' },
    cols: { control: 'number' },
    fontScale: { control: { type: 'range', min: 0.1, max: 2, step: 0.1 } },
  },
};

export default meta;
type Story = StoryObj<typeof CommitGraph>;

export const Default: Story = {
  args: {
    text: "WOD.WIKI",
    rows: 7,
    cols: 50,
  },
};

export const Large: Story = {
  args: {
    text: "STORYBOOK",
    rows: 10,
    cols: 80,
  },
};

export const CustomProps: Story = {
  args: {
    text: "REACT",
    rows: 5,
    cols: 40,
    gap: 2,
    padding: 5,
    randomness: false,
  },
};
