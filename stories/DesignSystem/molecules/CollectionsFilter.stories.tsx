/**
 * DesignSystem / Molecules / CollectionsFilter
 *
 * Sidebar filter panel for browsing WOD collections.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CollectionsFilter } from '@/components/history/CollectionsFilter';
import { FIXTURE_COLLECTIONS } from '../fixtures';

const meta: Meta<typeof CollectionsFilter> = {
  title: 'DesignSystem/Molecules/CollectionsFilter',
  component: CollectionsFilter,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-64 p-4 bg-background rounded-lg border border-border shadow-sm">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const Controlled: React.FC<{
  initialActive?: string | null;
  collections?: typeof FIXTURE_COLLECTIONS;
}> = ({ initialActive = null, collections = FIXTURE_COLLECTIONS }) => {
  const [active, setActive] = useState<string | null>(initialActive);
  return (
    <CollectionsFilter
      collections={collections}
      activeCollectionId={active}
      onCollectionSelect={setActive}
    />
  );
};

export const AllCollections: Story = {
  name: 'All collections (no selection)',
  render: () => <Controlled />,
};

export const ActiveSelection: Story = {
  name: 'Active collection selected',
  render: () => <Controlled initialActive="crossfit-benchmarks" />,
};

export const EmptyCollections: Story = {
  name: 'Empty (no collections)',
  render: () => <Controlled collections={[]} />,
};
