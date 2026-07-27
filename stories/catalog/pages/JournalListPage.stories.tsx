/**
 * Catalog / Pages / JournalListPage
 *
 * Renders: {@link import('../../../playground/src/views/JournalListPage').JournalListPage}
 *
 * The unified journal list page replaces the prior JournalWeeklyPage /
 * PlanPage split. The page reads the ?mode= URL param (history | today |
 * plan | all) via nuqs, defaulting to 'all' so the canvas covers history
 * + today + the forward planning window in one feed.
 *
 * Stories:
 *  1. Default — full-mode (history + today + future planning window)
 *  2. Plan mode — forward-only window, no past-results overlay
 *  3. History mode — past dates + today
 *  4. Mobile — mobile viewport
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { JournalListPage } from '../../../playground/src/views/JournalListPage';

const meta: Meta<typeof JournalListPage> = {
  title: 'catalog/pages/JournalListPage',
  component: JournalListPage,
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/journal'] },
    docs: {
      description: {
        component:
          'Unified journal list page — backfilled history, today, and the forward ' +
          'planning window in one feed. Mode is controlled by the ?mode= URL param ' +
          'and the mode toggle in the L2 nav panel.',
      },
    },
  },
};

export default meta;

/**
 * Default — ?mode=all (history + today + future planning window).
 */
export const Default: StoryObj<typeof JournalListPage> = {
  name: 'Default (all)',
  parameters: { router: { initialEntries: ['/journal?mode=all'] } },
  render: () => <JournalListPage onSelect={() => {}} />,
};

/**
 * Plan mode — today + forward planning window. No past-results overlay.
 */
export const Plan: StoryObj<typeof JournalListPage> = {
  name: 'Plan (future only)',
  parameters: { router: { initialEntries: ['/journal?mode=plan'] } },
  render: () => <JournalListPage onSelect={() => {}} />,
};

/**
 * History mode — past dates + today. No future window.
 */
export const History: StoryObj<typeof JournalListPage> = {
  name: 'History (past only)',
  parameters: { router: { initialEntries: ['/journal?mode=history'] } },
  render: () => <JournalListPage onSelect={() => {}} />,
};

export const Mobile: StoryObj<typeof JournalListPage> = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => <JournalListPage onSelect={() => {}} />,
};
