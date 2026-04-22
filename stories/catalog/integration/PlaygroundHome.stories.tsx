/**
 * Integration Stories — Playground/Home
 *
 * Composes the full playground home stack:
 *   SidebarLayout → CanvasPage → HomeView → HomeHero + canvas content
 *
 * These stories verify that all atomic design levels compose correctly:
 * atoms → molecules → organisms → templates → pages.
 *
 * Uses MemoryRouter + NavProvider + mocked data so no real runtime or
 * IndexedDB access is needed.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NavProvider } from '../../../playground/src/nav/NavContext';
import { buildAppNavTree } from '../../../playground/src/nav/appNavTree';
import { NavSidebar } from '../../../playground/src/nav/NavSidebar';
import { SidebarLayout } from '@/components/playground/sidebar-layout';
import { CanvasPage } from '@/panels/page-shells';
import { HomeView } from '../../../playground/src/pages/HomeView';
import type { WorkoutItem } from '../../../playground/src/App';

const mockWorkoutItems: WorkoutItem[] = [
  { id: 'benchmarks/fran', name: 'Fran', category: 'benchmarks', content: '# Fran\n\n```wod\n(21-15-9)\n  Thrusters 95lb\n  Pullups\n```\n' },
  { id: 'benchmarks/murph', name: 'Murph', category: 'benchmarks', content: '# Murph\n\n```wod\n1 Mile Run\n(20x)\n  5 Pullups\n  10 Pushups\n  15 Air Squats\n1 Mile Run\n```\n' },
  { id: 'benchmarks/cindy', name: 'Cindy', category: 'benchmarks', content: '# Cindy\n\n```wod\n20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats\n```\n' },
];

const AppHomeShell: React.FC<{ workoutItems?: WorkoutItem[] }> = ({
  workoutItems = mockWorkoutItems,
}) => (
  <NavProvider tree={buildAppNavTree(() => {})}>
    <SidebarLayout
      sidebar={<NavSidebar />}
      navbar={<span className="text-sm font-semibold">WOD Wiki</span>}
    >
      <div className="flex flex-col flex-1">
        <CanvasPage title="Home">
          <HomeView
            wodFiles={{}}
            theme="vs"
            workoutItems={workoutItems}
            onSelect={(item) => console.log('Selected:', item.name)}
          />
        </CanvasPage>
      </div>
    </SidebarLayout>
  </NavProvider>
);

const meta: Meta = {
  title: 'integration/Playground/Home',
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/'] },
    docs: {
      description: {
        component:
          'Full-stack integration story for the Playground Home page. ' +
          'Composes SidebarLayout → NavSidebar → CanvasPage → HomeView. ' +
          'Tests that all atomic design levels compose correctly together.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Home (default)',
  render: () => <AppHomeShell />,
};

export const WithCollections: StoryObj = {
  name: 'Home with workout collection',
  render: () => <AppHomeShell workoutItems={mockWorkoutItems} />,
};

export const EmptyCollections: StoryObj = {
  name: 'Home with empty collection',
  render: () => <AppHomeShell workoutItems={[]} />,
};

export const Mobile: StoryObj = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => <AppHomeShell />,
};
