/**
 * ReviewPage Stories
 *
 * The ReviewPage loads a stored workout result from IndexedDB.
 * In stories there is no IndexedDB, so we exercise the loading
 * and error states that are visible before real data arrives.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ReviewPage } from '../../../playground/src/pages/ReviewPage';

const meta: Meta<typeof ReviewPage> = {
  title: 'catalog/pages/ReviewPage',
  component: ReviewPage,
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/review/mock-runtime-id'] },
    docs: {
      description: {
        component:
          'Full-page workout review — loads a completed workout result from IndexedDB ' +
          'and renders it in the FullscreenReview component with segment analytics.',
      },
    },
  },
};

export default meta;

/**
 * Loading state — IndexedDB lookup is in-flight (or fails in Storybook
 * where IndexedDB is not available). In production this resolves quickly.
 */
export const Loading: StoryObj<typeof ReviewPage> = {
  name: 'Loading state',
  render: () => <ReviewPage />,
};

/**
 * Error state — rendered when no result is found for the given runtime ID.
 */
export const NotFound: StoryObj<typeof ReviewPage> = {
  name: 'Result not found',
  parameters: {
    router: { initialEntries: ['/review/non-existent-id'] },
  },
  render: () => <ReviewPage />,
};
