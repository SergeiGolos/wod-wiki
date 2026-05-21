/**
 * Catalog / Molecules / EffortCard
 *
 * Compact catalog card displaying an effort entry with label, slug,
 * MET, discipline, intensity tier, aliases, and origin badge.
 *
 * Stories:
 *  1. Bundled      — read-only bundled effort
 *  2. UserCustom   — editable user-created effort
 *  3. Synthetic    — estimated unresolved effort
 *  4. HighIntensity — high MET with many aliases
 *  5. Minimal      — no discipline, no aliases
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EffortCard } from '../../../playground/src/components/efforts/EffortCard';
import type { IEffort } from '@/effort-registry';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const bundledEffort: IEffort = {
  id: 'effort-bundled-rowing',
  slug: 'rowing',
  label: 'Rowing',
  aliases: ['row', 'rower', 'erg', 'concept2 row'],
  baseAttributes: { met: 7.0, discipline: 'rowing', intensityTier: 'high' },
  registrySource: 'bundled',
};

const userEffort: IEffort = {
  id: 'effort-user-hiit',
  slug: 'my-custom-hiit',
  label: 'My Custom HIIT Circuit',
  aliases: ['hiit', 'custom circuit'],
  baseAttributes: { met: 8.5, discipline: 'strength', intensityTier: 'high' },
  registrySource: 'user',
  derivation: {
    parentSlug: 'burpee',
    coefficients: { met: 1.2 },
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const syntheticEffort: IEffort = {
  id: 'synthetic-xyz',
  slug: 'unknown-exercise',
  label: 'unknown exercise',
  aliases: ['unknown exercise'],
  baseAttributes: { met: 5.0, discipline: undefined, intensityTier: undefined },
  registrySource: 'synthetic-unresolved',
};

const minimalEffort: IEffort = {
  id: 'effort-bundled-plank',
  slug: 'plank',
  label: 'Plank',
  aliases: [],
  baseAttributes: { met: 3.5, discipline: undefined, intensityTier: 'low' },
  registrySource: 'bundled',
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof EffortCard> = {
  title: 'catalog/molecules/efforts/EffortCard',
  component: EffortCard,
  parameters: { layout: 'padded', subsystem: 'chromecast' },
};

export default meta;
type Story = StoryObj<typeof EffortCard>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Bundled effort — read-only origin badge. */
export const Bundled: Story = {
  args: { effort: bundledEffort },
};

/** User-created custom effort — editable, shows derivation parent. */
export const UserCustom: Story = {
  args: { effort: userEffort },
};

/** Synthetic unresolved effort — estimated placeholder. */
export const Synthetic: Story = {
  args: { effort: syntheticEffort },
};

/** High-intensity effort with many aliases. */
export const HighIntensity: Story = {
  args: {
    effort: {
      ...bundledEffort,
      label: 'Kettlebell Snatch',
      slug: 'kettlebell-snatch',
      aliases: ['kb snatch', 'kettlebell snatches', 'kb', 'single-arm snatch'],
      baseAttributes: { met: 12.0, discipline: 'kettlebell', intensityTier: 'high' },
    },
  },
};

/** Minimal effort — no discipline, no aliases. */
export const Minimal: Story = {
  args: { effort: minimalEffort },
};

/** Grid of all variants for visual regression. */
export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <EffortCard effort={bundledEffort} />
      <EffortCard effort={userEffort} />
      <EffortCard effort={syntheticEffort} />
      <EffortCard effort={minimalEffort} />
    </div>
  ),
};
