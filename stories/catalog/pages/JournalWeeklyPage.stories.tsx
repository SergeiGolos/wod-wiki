/**
 * Catalog / Pages / JournalWeeklyPage
 *
 * Renders: {@link import('../../../playground/src/views/ListViews').JournalWeeklyPage}
 *
 * Stories:
 *  1. Default — default weekly journal view (empty week)
 *  2. Mobile — mobile viewport
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { JournalWeeklyPage } from '../../../playground/src/views/ListViews';

const meta: Meta<typeof JournalWeeklyPage> = {
  title: 'catalog/pages/JournalWeeklyPage',
  component: JournalWeeklyPage,
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/journal'] },
    docs: {
      description: {
        component:
          'Weekly journal overview — browse journal entries by week with date navigation. ' +
          'Entries are loaded from IndexedDB; empty state is shown in Storybook.',
      },
    },
  },
};

export default meta;

/**
 * Default weekly journal view (empty — IndexedDB not available in Storybook).
 */
export const Default: StoryObj<typeof JournalWeeklyPage> = {
  name: 'Default (empty week)',
  render: () => <JournalWeeklyPage onSelect={() => {}} />,
};

export const Mobile: StoryObj<typeof JournalWeeklyPage> = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => <JournalWeeklyPage onSelect={() => {}} />,
};
