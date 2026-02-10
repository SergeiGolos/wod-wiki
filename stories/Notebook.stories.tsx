import { UnifiedWorkbench } from '@/components/layout/UnifiedWorkbench';
import { LocalStorageContentProvider } from '@/services/content/LocalStorageContentProvider';
import type { Meta, StoryObj } from '@storybook/react';

// Singleton — same instance across hot reloads
const notebookProvider = new LocalStorageContentProvider();

const meta: Meta<typeof UnifiedWorkbench> = {
  title: 'Notebook',
  component: UnifiedWorkbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full workbench with persistent localStorage history. ' +
          'Workouts you create and complete are saved and survive page reloads. ' +
          'This is the closest experience to production mode.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    provider: notebookProvider,
    showToolbar: false,
    theme: 'wod-dark',
  },
};

const sampleWorkouts = [
  {
    title: 'Fran',
    rawContent: '# Fran\n\n```wod\n3 Rounds\n  - 21/15/9 Thrusters (95/65)\n  - 21/15/9 Pull-ups\n```\n',
    tags: ['benchmark', 'couplet'],
  },
  {
    title: 'Cindy',
    rawContent: '# Cindy\n\n```wod\nAMRAP 20:00\n  - 5 Pull-ups\n  - 10 Push-ups\n  - 15 Air Squats\n```\n',
    tags: ['benchmark', 'bodyweight'],
  },
  {
    title: 'Morning Run',
    rawContent: '# Morning Run\n\n```wod\nTimer 30:00\n  - Run\n```\n',
    tags: ['cardio'],
  },
];

export const Seeded: Story = {
  args: {
    provider: notebookProvider,
    showToolbar: false,
    theme: 'wod-dark',
  },
  play: async () => {
    const existing = await notebookProvider.getEntries();
    if (existing.length === 0) {
      for (const workout of sampleWorkouts) {
        await notebookProvider.saveEntry(workout);
      }
    }
  },
};
