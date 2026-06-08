/**
 * Catalog / Pages / WallClockPage
 *
 * Renders: {@link import('../../../playground/src/pages/WallClockPage').WallClockPage}
 *
 * Stories:
 *  1. NoRuntime — error state when no pending runtime exists
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { WallClockPage } from '../../../playground/src/pages/WallClockPage';

const meta: Meta<typeof WallClockPage> = {
  title: 'catalog/pages/WallClockPage',
  component: WallClockPage,
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
export const NoRuntime: StoryObj<typeof WallClockPage> = {
  name: 'No Runtime (error state)',
  render: () => <WallClockPage />,
};
