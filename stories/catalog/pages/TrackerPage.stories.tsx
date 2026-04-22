/**
 * TrackerPage Stories
 *
 * The TrackerPage runs a workout from a pending runtime stored in
 * the in-memory pendingRuntimes map. In stories we show the error
 * state (no pending runtime) since there is no real runtime to run.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TrackerPage } from '../../../playground/src/pages/TrackerPage';

const meta: Meta<typeof TrackerPage> = {
  title: 'catalog/pages/TrackerPage',
  component: TrackerPage,
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/tracker/test-runtime-id'] },
    docs: {
      description: {
        component:
          'Full-page workout tracker — renders FullscreenTimer from a pending runtime. ' +
          'The "not found" state is shown when no runtime is in the pending store (typical for stories).',
      },
    },
  },
};

export default meta;

/**
 * When no pending runtime exists the page shows an error message.
 * This is the only state that can be rendered without a real runtime.
 */
export const NoRuntime: StoryObj<typeof TrackerPage> = {
  name: 'No Runtime (error state)',
  render: () => <TrackerPage />,
};
