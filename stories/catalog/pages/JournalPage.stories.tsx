/**
 * JournalPage Stories
 *
 * The JournalPage renders a daily journal entry. Content is loaded from
 * IndexedDB by date-key. In stories the IndexedDB is empty so the
 * default template content is shown.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { JournalPage } from '../../../playground/src/pages/JournalPage';

const meta: Meta<typeof JournalPage> = {
  title: 'catalog/pages/JournalPage',
  component: JournalPage,
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/journal/2024-01-15'] },
    docs: {
      description: {
        component:
          'Full-page journal entry editor — view, write and run workouts from a date-keyed journal note. ' +
          'Supports inline timer overlay and review overlay without leaving the page.',
      },
    },
  },
  args: {
    theme: 'vs',
  },
};

export default meta;

/**
 * Default journal entry (empty — IndexedDB not available in Storybook).
 */
export const Default: StoryObj<typeof JournalPage> = {
  name: 'Default (new entry)',
  render: (args) => <JournalPage {...args} />,
};

export const DarkTheme: StoryObj<typeof JournalPage> = {
  name: 'Dark theme',
  args: { theme: 'dark' },
  globals: { theme: 'dark' },
  render: (args) => <JournalPage {...args} />,
};

export const Mobile: StoryObj<typeof JournalPage> = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    router: { initialEntries: ['/journal/2024-01-15'] },
  },
  render: (args) => <JournalPage {...args} />,
};
