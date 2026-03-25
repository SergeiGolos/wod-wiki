/**
 * DesignSystem / Organisms / CollectionBrowsePanel
 *
 * Full search + filter panel for browsing WOD collection items.
 * Includes a search bar, collection filter chips, and card grid.
 */


import type { Meta, StoryObj } from '@storybook/react';
import { CollectionBrowsePanel } from '@/components/collections/CollectionBrowsePanel';
import type { WodCollectionItem, WodCollection } from '@/repositories/wod-collections';
import { FIXTURE_COLLECTIONS } from '../fixtures';

const meta: Meta<typeof CollectionBrowsePanel> = {
  title: 'DesignSystem/Organisms/CollectionBrowsePanel',
  component: CollectionBrowsePanel,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="h-[700px] max-w-3xl mx-auto border border-border rounded-lg overflow-hidden bg-background">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const handleSelect = (item: WodCollectionItem, col: WodCollection) =>
  alert(`Selected: ${item.name} from ${col.name}`);

export const AllCollections: Story = {
  name: 'All collections — root-level grid',
  args: {
    collections: FIXTURE_COLLECTIONS,
    onSelectItem: handleSelect,
  },
};

export const SingleCollectionFocus: Story = {
  name: 'Single collection — CrossFit Benchmarks',
  render: () => (
    <CollectionBrowsePanel
      collections={[FIXTURE_COLLECTIONS[0]]}
      onSelectItem={handleSelect}
    />
  ),
};

export const EmptyCollection: Story = {
  name: 'Empty collections (no items)',
  args: {
    collections: [
      {
        id: 'empty-col',
        name: 'Empty Collection',
        count: 0,
        items: [],
      },
    ],
    onSelectItem: handleSelect,
  },
};

export const ManyCollections: Story = {
  name: 'Many collections (search & filter)',
  args: {
    collections: [
      ...FIXTURE_COLLECTIONS,
      {
        id: 'endurance',
        name: 'Endurance',
        count: 2,
        items: [
          {
            id: '5k-run',
            name: '5K Run',
            path: 'endurance/5k-run.md',
            content:
              '---\ncategory: Endurance\ndifficulty: beginner\ndescription: A simple 5 km run target.\n---\n5000m Run',
          },
          {
            id: 'rowing-2k',
            name: '2K Row',
            path: 'endurance/rowing-2k.md',
            content:
              '---\ncategory: Endurance\ndifficulty: intermediate\ndescription: 2000 m rowing time trial.\n---\n2000m Row',
          },
        ],
      },
    ],
    onSelectItem: handleSelect,
  },
};
