/**
 * Catalog / Pages / EffortsCatalogPage
 *
 * Renders: {@link import('../../../playground/src/pages/EffortsCatalogPage').EffortsCatalogPage}
 *
 * Stories:
 *  1. Default — catalog showing all bundled + user efforts
 *  2. Mobile — mobile viewport
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EffortsCatalogPage } from '../../../playground/src/pages/EffortsCatalogPage';
import { EffortRegistryProvider } from '../../../playground/src/contexts/EffortRegistryContext'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CatalogShell: React.FC = () => (
  <EffortRegistryProvider>
    <EffortsCatalogPage />
  </EffortRegistryProvider>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof EffortsCatalogPage> = {
  title: 'catalog/pages/EffortsCatalogPage',
  component: EffortsCatalogPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Efforts catalog page — lists all registered efforts with search, ' +
          'origin filter, and discipline filter.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EffortsCatalogPage>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Default catalog showing all bundled + user efforts. */
export const Default: Story = {
  name: 'Default',
  parameters: {
    router: { initialEntries: ['/efforts'] },
  },
  render: () => <CatalogShell />,
};

/** Mobile viewport. */
export const Mobile: Story = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    router: { initialEntries: ['/efforts'] },
  },
  render: () => <CatalogShell />,
};
