/**
 * Catalog / Atoms / Badge
 *
 * All Badge variants from the design system.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/components/ui/badge';

const meta: Meta<typeof Badge> = {
  title: 'catalog/atoms/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-8 space-y-6 max-w-xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  name: 'Variants',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">variant</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    </div>
  ),
};

export const WorkoutContexts: Story = {
  name: 'Workout contexts',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">real-world usage</p>
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="default">AMRAP</Badge>
        <Badge variant="secondary">For Time</Badge>
        <Badge variant="secondary">EMOM</Badge>
        <Badge variant="outline">Benchmark</Badge>
        <Badge variant="destructive">Max Effort</Badge>
      </div>
    </div>
  ),
};

export const InContext: Story = {
  name: 'In context',
  render: () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-mono">inline with text</p>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Fran</span>
        <Badge variant="secondary">21-15-9</Badge>
        <Badge variant="outline">Benchmark</Badge>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Murph</span>
        <Badge variant="default">Hero WOD</Badge>
        <Badge variant="outline">For Time</Badge>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Grace</span>
        <Badge variant="destructive">30 Clean &amp; Jerk</Badge>
      </div>
    </div>
  ),
};
