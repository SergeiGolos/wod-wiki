/**
 * Integration Stories — Playground/Review
 *
 * Composes the full workout review stack:
 *   SidebarLayout → ReviewPage → FullscreenReview → ReviewGrid
 *
 * ReviewPage loads results from IndexedDB. In Storybook the IndexedDB is
 * empty so the "result not found" error state is shown.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NavProvider } from '../../../playground/src/nav/NavContext';
import { buildAppNavTree } from '../../../playground/src/nav/appNavTree';
import { NavSidebar } from '../../../playground/src/nav/NavSidebar';
import { SidebarLayout } from '@/components/playground/sidebar-layout';
import { ReviewPage } from '../../../playground/src/pages/ReviewPage';

const AppReviewShell: React.FC = () => (
  <NavProvider tree={buildAppNavTree(() => {})}>
    <SidebarLayout
      sidebar={<NavSidebar />}
      navbar={<span className="text-sm font-semibold">WOD Wiki</span>}
    >
      <div className="flex flex-col flex-1">
        <ReviewPage />
      </div>
    </SidebarLayout>
  </NavProvider>
);

const meta: Meta = {
  title: 'integration/Playground/Review',
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/review/mock-runtime-id'] },
    docs: {
      description: {
        component:
          'Full-stack integration story for the Playground Review page. ' +
          'Composes SidebarLayout → NavSidebar → ReviewPage. ' +
          'In Storybook the IndexedDB is empty so the error/loading state is shown. ' +
          'In production, results are loaded from IndexedDB by runtime ID.',
      },
    },
  },
};

export default meta;

export const Loading: StoryObj = {
  name: 'Review (loading — no IndexedDB data)',
  render: () => <AppReviewShell />,
};
