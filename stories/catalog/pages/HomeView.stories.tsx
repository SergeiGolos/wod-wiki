/**
 * HomeView Stories
 *
 * The HomeView renders the application home page with the HomeHero
 * banner and the home canvas page content.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { HomeView } from '../../../playground/src/pages/HomeView';
import type { WorkoutItem } from '../../../playground/src/App';

const storyWodFiles = import.meta.glob('../../../markdown/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const wodFiles = Object.fromEntries(
  Object.entries(storyWodFiles).map(([path, content]) => [
    path.replace('../../../markdown/', '../../markdown/'),
    content,
  ]),
);

const mockWorkoutItems: WorkoutItem[] = [
  { id: 'benchmarks/fran', name: 'Fran', category: 'benchmarks', content: '# Fran\n\n```wod\n(21-15-9)\n  Thrusters 95lb\n  Pullups\n```\n' },
  { id: 'benchmarks/murph', name: 'Murph', category: 'benchmarks', content: '# Murph\n\n```wod\n1 Mile Run\n(20x)\n  5 Pullups\n  10 Pushups\n  15 Air Squats\n1 Mile Run\n```\n' },
  { id: 'benchmarks/cindy', name: 'Cindy', category: 'benchmarks', content: '# Cindy\n\n```wod\n20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats\n```\n' },
];

const meta: Meta<typeof HomeView> = {
  title: 'catalog/pages/HomeView',
  component: HomeView,
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/'] },
    docs: {
      description: {
        component:
          'Home page — renders the hero banner and the home canvas page with collection workout lists.',
      },
    },
  },
  args: {
    wodFiles,
    theme: 'vs',
    workoutItems: mockWorkoutItems,
  },
};

export default meta;

export const Default: StoryObj<typeof HomeView> = {
  name: 'Default',
  render: (args) => <HomeView {...args} />,
};

export const WithCollections: StoryObj<typeof HomeView> = {
  name: 'With workout items',
  args: {
    workoutItems: mockWorkoutItems,
    onSelect: (item: WorkoutItem) => console.log('Selected:', item.name),
  },
  render: (args) => <HomeView {...args} />,
};

export const DarkTheme: StoryObj<typeof HomeView> = {
  name: 'Dark theme',
  args: { theme: 'dark' },
  globals: { theme: 'dark' },
  render: (args) => <HomeView {...args} />,
};

export const Mobile: StoryObj<typeof HomeView> = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: (args) => <HomeView {...args} />,
};
