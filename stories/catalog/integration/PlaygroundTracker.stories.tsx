/**
 * Integration Stories — Playground/Tracker
 *
 * Composes the full workout tracker stack:
 *   SidebarLayout → TrackerPage → FullscreenTimer → RuntimeTimerPanel
 *
 * TrackerPage reads from the in-memory pendingRuntimes store.
 * Without a pending runtime this story shows the "runtime not found" error state.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NavProvider } from '../../../playground/src/nav/NavContext';
import { buildAppNavTree } from '../../../playground/src/nav/appNavTree';
import { NavSidebar } from '../../../playground/src/nav/NavSidebar';
import { SidebarLayout } from '@/components/playground/sidebar-layout';
import { TrackerPage } from '../../../playground/src/pages/TrackerPage';

const AppTrackerShell: React.FC = () => (
  <NavProvider tree={buildAppNavTree(() => {})}>
    <SidebarLayout
      sidebar={<NavSidebar />}
      navbar={<span className="text-sm font-semibold">WOD Wiki</span>}
    >
      <div className="flex flex-col flex-1">
        <TrackerPage />
      </div>
    </SidebarLayout>
  </NavProvider>
);

const meta: Meta = {
  title: 'integration/Playground/Tracker',
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/tracker/test-runtime-id'] },
    docs: {
      description: {
        component:
          'Full-stack integration story for the Playground Tracker page. ' +
          'Composes SidebarLayout → NavSidebar → TrackerPage. ' +
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
