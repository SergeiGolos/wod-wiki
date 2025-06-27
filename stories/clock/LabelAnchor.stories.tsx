import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LabelAnchor } from '../../src/clock/anchors/LabelAnchor';
import { CollectionSpan } from '../../src/CollectionSpan';

const meta: Meta<typeof LabelAnchor> = {
  title: 'Clock/Label Anchor',
  component: LabelAnchor,
  decorators: [
    (Story) => (
        <div className="flex flex-col items-center justify-center flex-grow p-6 bg-gray-50">
          <Story />
        </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LabelAnchor>;

const defaultSpan: CollectionSpan = {
  blockKey: 'Jumping Jacks',
  duration: 185000,
  timeSpans: [{ start: new Date(Date.now() - 185000), stop: new Date() }],
  metrics: [],
};

export const Default: Story = {
  args: {
    span: defaultSpan,
    template: '{{blockKey}}',
  },
};

export const Badge: Story = {
  args: {
    span: defaultSpan,
    variant: 'badge',
    template: 'Warm-up',
  },
};

export const Title: Story = {
  args: {
    span: defaultSpan,
    variant: 'title',
    template: '{{blockKey}}',
  },
};

export const Subtitle: Story = {
  args: {
    span: defaultSpan,
    variant: 'subtitle',
    template: '30 seconds',
  },
};

export const NextUp: Story = {
  args: {
    span: defaultSpan,
    variant: 'next-up',
    template: 'Next up: 30s Plank',
  },
};

export const Empty: Story = {
  args: {
    span: new CollectionSpan(),
    template: '{{blockKey}}',
  },
};
