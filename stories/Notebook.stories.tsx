import { StorybookWorkbench as Workbench } from './StorybookWorkbench';
import { LocalStorageContentProvider } from '@/services/content/LocalStorageContentProvider';
import type { Meta, StoryObj } from '@storybook/react';

// Import raw markdown content
import franMarkdown from '../wod/crossfit-girls/fran.md?raw';
import cindyMarkdown from '../wod/crossfit-girls/cindy.md?raw';
import annieMarkdown from '../wod/crossfit-girls/annie.md?raw';
import simpleAndSinisterMarkdown from '../wod/01-simple-and-sinister.md?raw';

// Singleton — same instance across hot reloads
const notebookProvider = new LocalStorageContentProvider();

const meta: Meta<typeof Workbench> = {
  title: 'Notebook',
  component: Workbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full workbench with persistent localStorage history. ' +
          'The "Seeded" story will clean existing data and load sample workouts from the codebase on every load. ' +
          'This provides a consistent "fresh" state with real data.',
      },
    },
  },
  argTypes: {
    initialViewMode: {
      control: 'select',
      options: ['history', 'plan', 'track', 'review', 'analyze'],
      description: 'Initial view mode for the workbench',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Workouts to seed
const sampleWorkouts = [
  {
    id: 'seeded-fran',
    title: 'Fran',
    rawContent: franMarkdown || '# Fran (Fallback)\n\nFailed to load markdown file.',
    tags: ['benchmark', 'couplet'],
  },
  {
    id: 'seeded-cindy',
    title: 'Cindy',
    rawContent: cindyMarkdown || '# Cindy (Fallback)\n\nFailed to load markdown file.',
    tags: ['benchmark', 'bodyweight'],
  },
  {
    id: 'seeded-annie',
    title: 'Annie',
    rawContent: annieMarkdown || '# Annie (Fallback)\n\nFailed to load markdown file.',
    tags: ['benchmark', 'double-unders', 'situps'],
  },
  {
    id: 'seeded-simple-sinister',
    title: 'Simple and Sinister',
    rawContent: simpleAndSinisterMarkdown || '# Simple & Sinister (Fallback)\n\nFailed to load markdown file.',
    tags: ['kettlebell', 'strength'],
  },
];

export const Default: Story = {
  args: {
    provider: notebookProvider,
    showToolbar: false,
    theme: 'system',
  },
  play: async () => {
    console.group('Notebook Story: Seeding');
    console.log('Starting data reset...');

    // 1. Clean: Remove all existing entries
    const existing = await notebookProvider.getEntries();
    console.log(`Found ${existing.length} existing entries to delete.`);
    for (const entry of existing) {
      await notebookProvider.deleteEntry(entry.id);
    }

    // 2. Load: Add fresh sample workouts
    console.log(`Seeding ${sampleWorkouts.length} sample workouts...`);
    for (const workout of sampleWorkouts) {
      console.log(`Saving ${workout.title}, content length: ${workout.rawContent?.length}`);
      if (!workout.rawContent) console.error(`WARNING: Content for ${workout.title} is undefined!`);
      await notebookProvider.saveEntry(workout);
    }

    console.log('Seeding complete.');
    console.groupEnd();
  },
};
