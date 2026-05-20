/**
 * EffortDetailPage Stories
 *
 * Full-page effort detail view showing attributes, aliases, derivation,
 * resolved values (with modifiers), and the analytics placeholder section.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EffortDetailPage } from '../../../playground/src/pages/EffortDetailPage';
import { EffortRegistryProvider } from '../../../playground/src/components/efforts/EffortRegistryContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface EffortDetailShellProps {
  initialEntry: string;
}

const EffortDetailShell: React.FC<EffortDetailShellProps> = ({ initialEntry }) => (
  <EffortRegistryProvider>
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/effort/:slug" element={<EffortDetailPage />} />
      </Routes>
    </MemoryRouter>
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
  render: () => <EffortDetailShell initialEntry="/effort/rowing" />,
};

/** High-intensity effort with many aliases. */
export const HighIntensityEffort: Story = {
  name: 'High-intensity effort',
  render: () => <EffortDetailShell initialEntry="/effort/kettlebell-snatch" />,
};

/** Effort with URL modifiers — shows resolved tab and analytics placeholder. */
export const WithModifiers: Story = {
  name: 'With modifiers (resolved tab)',
  render: () => (
    <EffortDetailShell initialEntry="/effort/rowing?met=1.2&discipline=running" />
  ),
};

/** Mobile viewport — analytics section is hidden to reduce clutter. */
export const Mobile: Story = {
  name: 'Mobile viewport',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => <EffortDetailShell initialEntry="/effort/rowing" />,
};
