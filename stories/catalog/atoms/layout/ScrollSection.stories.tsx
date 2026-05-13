/**
 * Catalog / Atoms / Layout / ScrollSection
 *
 * Simple scrollable content section with optional max-height constraint.
 * Used inside page shells for static or lightly interactive content areas.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ScrollSection } from '@/panels/page-shells/ScrollSection';

const meta: Meta<typeof ScrollSection> = {
  title: 'catalog/atoms/layout/ScrollSection',
  component: ScrollSection,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof ScrollSection>;

const PlaceholderContent = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold">Section Content</h3>
    <p>
      This is a scrollable section. When a maxHeight is provided, it will scroll
      internally if the content exceeds that height.
    </p>
    {Array.from({ length: 10 }).map((_, i) => (
      <p key={i}>
        Paragraph {i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </p>
    ))}
  </div>
);

export const Default: Story = {
  render: (args) => (
    <div className="border border-dashed border-border rounded-lg">
      <ScrollSection {...args}>
        <PlaceholderContent />
      </ScrollSection>
    </div>
  ),
};

export const BoundedHeight: Story = {
  args: {
    maxHeight: '200px',
    className: 'bg-muted/30',
  },
  render: (args) => (
    <div className="border border-border rounded-lg max-w-md">
      <ScrollSection {...args}>
        <PlaceholderContent />
      </ScrollSection>
    </div>
  ),
};

export const CustomPadding: Story = {
  args: {
    padding: 'p-12',
    className: 'bg-primary/5',
  },
  render: (args) => (
    <div className="border border-border rounded-lg">
      <ScrollSection {...args}>
        <div className="text-center">
          <p className="font-bold">Generous Padding</p>
          <p className="text-sm text-muted-foreground">This section has p-12 padding.</p>
        </div>
      </ScrollSection>
    </div>
  ),
};
