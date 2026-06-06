/**
 * Catalog / Pages / PlaygroundNotePage
 *
 * Renders: {@link import('../../../playground/src/pages/PlaygroundNotePage').PlaygroundNotePage}
 *
 * Stories:
 *  1. Default — default story showing a playground note
 *  2. DarkTheme — note page with dark theme
 *  3. Mobile — mobile viewport
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PlaygroundNotePage } from '../../../playground/src/pages/PlaygroundNotePage';

const meta: Meta<typeof PlaygroundNotePage> = {
  title: 'catalog/pages/PlaygroundNotePage',
  component: PlaygroundNotePage,
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/playground/2024-01-01-test-page'] },
    docs: {
      description: {
        component:
          'Full-page personal note editor — write workouts, journal entries, and markdown notes. ' +
          'Content is persisted to IndexedDB keyed by the URL ID.',
      },
    },
  },
  args: {
    theme: 'vs',
  },
};

export default meta;

/**
 * Default story — shows the page for a playground note.
 * In Storybook the IndexedDB will be empty so the default template is shown.
 */
export const Default: StoryObj<typeof PlaygroundNotePage> = {
  name: 'Default (new note)',
  render: (args) => <PlaygroundNotePage {...args} />,
};

export const DarkTheme: StoryObj<typeof PlaygroundNotePage> = {
  name: 'Dark theme',
  args: { theme: 'dark' },
  globals: { theme: 'dark' },
  render: (args) => <PlaygroundNotePage {...args} />,
};

export const Mobile: StoryObj<typeof PlaygroundNotePage> = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: (args) => <PlaygroundNotePage {...args} />,
};
