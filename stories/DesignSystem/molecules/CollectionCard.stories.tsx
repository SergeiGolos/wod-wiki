/**
 * DesignSystem / Molecules / CollectionCard
 *
 * Card tile for a single WOD collection item. Shows difficulty-based colour
 * coding (beginner → intermediate → advanced → elite).
 */


import type { Meta, StoryObj } from '@storybook/react';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { FIXTURE_COLLECTIONS } from '../fixtures';

const benchmarks = FIXTURE_COLLECTIONS.find(c => c.id === 'crossfit-benchmarks')!;
const kettlebell = FIXTURE_COLLECTIONS.find(c => c.id === 'kettlebell')!;

const meta: Meta<typeof CollectionCard> = {
  title: 'DesignSystem/Molecules/CollectionCard',
  component: CollectionCard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-80 p-4 bg-background rounded-lg">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

// ── Individual stories ────────────────────────────────────────────────────────

export const AdvancedWorkout: Story = {
  name: 'Advanced difficulty (Fran)',
  args: {
    item: benchmarks.items[0],
    collectionId: benchmarks.id,
    collectionName: benchmarks.name,
    onClick: () => alert('clicked: Fran'),
  },
};

export const IntermediateWorkout: Story = {
  name: 'Intermediate difficulty (Cindy)',
  args: {
    item: benchmarks.items[1],
    collectionId: benchmarks.id,
    collectionName: benchmarks.name,
    onClick: () => alert('clicked: Cindy'),
  },
};

export const BeginnerWorkout: Story = {
  name: 'Beginner difficulty (Simple & Sinister)',
  args: {
    item: kettlebell.items[0],
    collectionId: kettlebell.id,
    collectionName: kettlebell.name,
    onClick: () => alert('clicked: Simple & Sinister'),
  },
};

export const NoFrontmatter: Story = {
  name: 'No frontmatter (graceful fallback)',
  args: {
    item: {
      id: 'raw-wod',
      name: 'Plain Workout',
      path: 'misc/raw-wod.md',
      content:
        '# Plain Workout\nThis markdown has no --- frontmatter block.\n\n30 Box Jumps @24in\n20 Burpees\n10 Pull-ups',
    },
    collectionId: 'misc',
    collectionName: 'Miscellaneous',
    onClick: () => {},
  },
};

// All four cards side-by-side in a grid
export const AllVariants: Story = {
  name: 'All difficulty variants',
  render: () => (
    <div className="grid grid-cols-1 gap-3 w-80 p-4 bg-background">
        {[...benchmarks.items, ...kettlebell.items].map(item => (
          <CollectionCard
            key={item.id}
            item={item}
            collectionId={item.path.split('/')[0]}
            collectionName={item.path.split('/')[0]}
            onClick={() => {}}
          />
        ))}
    </div>
  ),
};
