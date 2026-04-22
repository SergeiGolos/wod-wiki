/**
 * Integration Stories — Playground/Collections
 *
 * Composes the full playground collections stack:
 *   SidebarLayout → CanvasPage → CollectionsPage → TextFilterStrip
 *
 * Uses MemoryRouter + NavProvider so no real runtime is needed.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NavProvider } from '../../../playground/src/nav/NavContext';
import { buildAppNavTree } from '../../../playground/src/nav/appNavTree';
import { NavSidebar } from '../../../playground/src/nav/NavSidebar';
import { SidebarLayout } from '@/components/playground/sidebar-layout';
import { CanvasPage } from '@/panels/page-shells';
import { CollectionsPage } from '../../../playground/src/pages/CollectionsPage';
import { TextFilterStrip } from '../../../playground/src/views/queriable-list/TextFilterStrip';

const AppCollectionsShell: React.FC = () => (
  <NavProvider tree={buildAppNavTree(() => {})}>
    <SidebarLayout
      sidebar={<NavSidebar />}
      navbar={<span className="text-sm font-semibold">WOD Wiki</span>}
    >
      <div className="flex flex-col flex-1">
        <CanvasPage
          title="Collections"
          subheader={<TextFilterStrip placeholder="Filter collections…" />}
        >
          <CollectionsPage />
        </CanvasPage>
      </div>
    </SidebarLayout>
  </NavProvider>
);

const meta: Meta = {
  title: 'catalog/integration/Playground/Collections',
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/collections'] },
    docs: {
      description: {
        component:
          'Full-stack integration story for the Playground Collections page. ' +
          'Composes SidebarLayout → NavSidebar → CanvasPage → CollectionsPage → TextFilterStrip.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'Collections (default)',
  render: () => <AppCollectionsShell />,
};

export const Mobile: StoryObj = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => <AppCollectionsShell />,
};
