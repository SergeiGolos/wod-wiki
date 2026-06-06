/**
 * Catalog / Pages / EffortDetailPage
 *
 * Renders: {@link import('../../../playground/src/pages/EffortDetailPage').EffortDetailPage}
 * Data:     See {@link ../../data-for-storybook.md}
 *
 * Stories:
 *  1. BundledEffort — default bundled effort with analytics placeholder
 *  2. HighIntensityEffort — high-intensity effort with many aliases
 *  3. WithModifiers — effort with URL modifiers (shows resolved tab)
 *  4. Mobile — mobile viewport (analytics section hidden)
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Routes, Route } from 'react-router-dom';
import { EffortDetailPage } from '../../../playground/src/pages/EffortDetailPage';
import { EffortRegistryProvider } from '../../../playground/src/contexts/EffortRegistryContext'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EffortDetailShell: React.FC = () => (
  <EffortRegistryProvider>
    <Routes>
      <Route path="/effort/:slug" element={<EffortDetailPage />} />
    </Routes>
  </EffortRegistryProvider>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof EffortDetailPage> = {
  title: 'catalog/pages/EffortDetailPage',
  component: EffortDetailPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Effort detail page — shows effort attributes, aliases, derivation, ' +
          'resolved values, and the analytics placeholder section.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EffortDetailPage>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Default bundled effort with analytics placeholder. */
export const BundledEffort: Story = {
  name: 'Bundled effort',
  parameters: {
    router: { initialEntries: ['/effort/rowing'] },
  },
  render: () => <EffortDetailShell />,
};

/** High-intensity effort with many aliases. */
export const HighIntensityEffort: Story = {
  name: 'High-intensity effort',
  parameters: {
    router: { initialEntries: ['/effort/kettlebell-snatch'] },
  },
  render: () => <EffortDetailShell />,
};

/** Effort with URL modifiers — shows resolved tab and analytics placeholder. */
export const WithModifiers: Story = {
  name: 'With modifiers (resolved tab)',
  parameters: {
    router: { initialEntries: ['/effort/rowing?met=1.2&discipline=running'] },
  },
  render: () => <EffortDetailShell />,
};

/** Mobile viewport — analytics section is hidden to reduce clutter. */
export const Mobile: Story = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    router: { initialEntries: ['/effort/rowing'] },
  },
  render: () => <EffortDetailShell />,
};
