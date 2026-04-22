/**
 * JournalWeeklyPage Stories
 *
 * The JournalWeeklyPage renders the weekly journal overview with date navigation
 * and a list of journal entries. Content is loaded from IndexedDB.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { JournalWeeklyPage } from '../../../playground/src/pages/JournalWeeklyPage';

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
