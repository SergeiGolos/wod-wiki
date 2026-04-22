/**
 * Catalog / Atoms / Progress
 *
 * Horizontal progress bar — Radix primitive wrapped with design tokens.
 */

import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from '@/components/ui/progress';

const meta: Meta<typeof Progress> = {
  title: 'catalog/atoms/display/Progress',
  component: Progress,
  parameters: { layout: 'centered', subsystem: 'chromecast' },
  decorators: [
    (Story) => (
      <div className="p-8 space-y-6 w-80">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Values: Story = {
  name: 'Values',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">value</p>
      {[0, 25, 50, 75, 100].map((v) => (
        <div key={v} className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{v === 0 ? 'Not started' : v === 100 ? 'Complete' : 'In progress'}</span>
            <span>{v}%</span>
          </div>
          <Progress value={v} />
        </div>
      ))}
    </div>
  ),
};

export const WorkoutProgress: Story = {
  name: 'Workout progress',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">real-world usage</p>
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium">Round 1 / 5</span>
            <span className="text-muted-foreground">20%</span>
          </div>
          <Progress value={20} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium">Reps 15 / 21</span>
            <span className="text-muted-foreground">71%</span>
          </div>
          <Progress value={71} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium">Timer 4:30 / 10:00</span>
            <span className="text-muted-foreground">45%</span>
          </div>
          <Progress value={45} />
        </div>
      </div>
    </div>
  ),
};

const AnimatedDemo: React.FC = () => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => (v >= 100 ? 0 : v + 5));
    }, 300);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Counting down…</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
};

export const Animated: Story = {
  name: 'Animated',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">transition-all on the indicator</p>
      <AnimatedDemo />
    </div>
  ),
};
