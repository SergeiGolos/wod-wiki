/**
 * Catalog / Atoms / WodPlaygroundButton
 *
 * Button that opens the Playground with pre-loaded workout content.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { WodPlaygroundButton } from '@/components/Editor/md-components/WodPlaygroundButton';

const meta: Meta<typeof WodPlaygroundButton> = {
  title: 'catalog/atoms/WodPlaygroundButton',
  component: WodPlaygroundButton,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-6 space-y-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const SimpleWorkout: Story = {
  name: 'Simple workout',
  render: () => (
    <div>
      <p className="text-xs text-muted-foreground mb-2 font-mono">
        Simple workout — opens Playground with pre-loaded content
      </p>
      <WodPlaygroundButton wodContent="(21-15-9)\n  Thrusters @95lb\n  Pull-ups" />
    </div>
  ),
};

export const AmrapVariant: Story = {
  name: 'AMRAP variant',
  render: () => (
    <div>
      <p className="text-xs text-muted-foreground mb-2 font-mono">AMRAP variant</p>
      <WodPlaygroundButton
        wodContent="20:00 AMRAP\n  5 Pull-ups\n  10 Push-ups\n  15 Air Squats"
      />
    </div>
  ),
};
