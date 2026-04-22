/**
 * Integration Stories — Playground/Journal
 *
 * Composes the full playground journal stack:
 *   SidebarLayout → CanvasPage → JournalWeeklyPage → JournalDateScroll
 *
 * Uses MemoryRouter + NavProvider so no real runtime or IndexedDB is needed.
 * In Storybook the IndexedDB is empty so the journal shows an empty week.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NavProvider } from '../../../playground/src/nav/NavContext';
import { buildAppNavTree } from '../../../playground/src/nav/appNavTree';
import { NavSidebar } from '../../../playground/src/nav/NavSidebar';
import { SidebarLayout } from '@/components/playground/sidebar-layout';
import { CanvasPage } from '@/panels/page-shells';
import { JournalWeeklyPage } from '../../../playground/src/pages/JournalWeeklyPage';

const AppJournalShell: React.FC = () => (
  <NavProvider tree={buildAppNavTree(() => {})}>
    <SidebarLayout
      sidebar={<NavSidebar />}
      navbar={<span className="text-sm font-semibold">WOD Wiki</span>}
    >
      <div className="flex flex-col flex-1">
        <CanvasPage title="Journal">
          <JournalWeeklyPage onSelect={() => {}} />
        </CanvasPage>
      </div>
    </SidebarLayout>
  </NavProvider>
);

const meta: Meta = {
  title: 'integration/Playground/Journal',
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/journal'] },
    docs: {
      description: {
        component:
          'Full-stack integration story for the Playground Journal page. ' +
          'Composes SidebarLayout → NavSidebar → CanvasPage → JournalWeeklyPage. ' +
          'In Storybook the IndexedDB is empty so an empty week is shown.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Journal (empty week)',
  render: () => <AppJournalShell />,
};

export const Mobile: StoryObj = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => <AppJournalShell />,
};
