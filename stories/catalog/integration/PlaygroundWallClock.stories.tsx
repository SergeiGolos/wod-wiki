/**
 * Integration Stories — Playground/WallClock
 *
 * Composes the full workout tracker stack:
 *   SidebarLayout → WallClockPage → FullscreenTimer → RuntimeTimerPanel
 *
 * WallClockPage reads from the in-memory pendingRuntimes store.
 * Without a pending runtime this story shows the "runtime not found" error state.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NavProvider } from '../../../playground/src/nav/NavContext';
import { buildAppNavTree } from '../../../playground/src/nav/appNavTree';
import { NavSidebar } from '../../../playground/src/nav/NavSidebar';
import { SidebarLayout } from '@/templates/SidebarLayout'
import { WallClockPage } from '../../../playground/src/pages/WallClockPage';

const AppTrackerShell: React.FC = () => (
  <NavProvider tree={buildAppNavTree(() => {})}>
    <SidebarLayout
      sidebar={<NavSidebar />}
      navbar={<span className="text-sm font-semibold">WOD Wiki</span>}
    >
      <div className="flex flex-col flex-1">
        <WallClockPage />
      </div>
    </SidebarLayout>
  </NavProvider>
);

const meta: Meta = {
  title: 'catalog/integration/PlaygroundWallClock',
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/tracker/test-runtime-id'] },
    docs: {
      description: {
        component:
          'Full-stack integration story for the Playground Tracker page. ' +
          'Composes SidebarLayout → NavSidebar → WallClockPage. ' +
          'Without a pending runtime this shows the error state. ' +
          'In production, a runtime is injected via the pendingRuntimes store.',
      },
    },
  },
};

export default meta;

export const NoRuntime: StoryObj = {
  name: 'Tracker (no runtime — error state)',
  render: () => <AppTrackerShell />,
};
