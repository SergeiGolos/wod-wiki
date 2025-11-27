import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CollapsibleSection } from '@/components/layout/CollapsibleSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';

const meta: Meta<typeof CollapsibleSection> = {
  title: 'Components/Layout/CollapsibleSection',
  component: CollapsibleSection,
  tags: ['autodocs'],
  argTypes: {
    level: {
      control: 'select',
      options: [1, 2, 3],
    },
    defaultExpanded: {
      control: 'boolean',
    },
    bordered: {
      control: 'boolean',
    },
    contentPadded: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof CollapsibleSection>;

export const Default: Story = {
  args: {
    title: 'Section Title',
    children: <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">This is the collapsible content.</div>,
    defaultExpanded: false,
  },
};

export const InitiallyExpanded: Story = {
  args: {
    title: 'Expanded Section',
    children: <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">This content is visible by default.</div>,
    defaultExpanded: true,
  },
};

export const WithIconAndBadge: Story = {
  args: {
    title: 'Settings',
    icon: <Settings className="h-4 w-4" />,
    badge: <Badge variant="secondary">New</Badge>,
    children: <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">Settings content goes here.</div>,
    defaultExpanded: true,
  },
};

export const WithActions: Story = {
  args: {
    title: 'Project Details',
    actions: (
      <>
        <Button variant="ghost" size="sm" className="h-6">Edit</Button>
        <Button variant="ghost" size="sm" className="h-6 text-red-500">Delete</Button>
      </>
    ),
    children: <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">Project details content.</div>,
    defaultExpanded: true,
    bordered: true,
  },
};

export const Nested: Story = {
  render: () => (
    <CollapsibleSection title="Outer Section" defaultExpanded bordered>
      <div className="space-y-2">
        <p>Some content in the outer section.</p>
        <CollapsibleSection title="Inner Section 1" level={3} bordered>
          <p>Nested content 1.</p>
        </CollapsibleSection>
        <CollapsibleSection title="Inner Section 2" level={3} bordered>
          <p>Nested content 2.</p>
        </CollapsibleSection>
      </div>
    </CollapsibleSection>
  ),
};
