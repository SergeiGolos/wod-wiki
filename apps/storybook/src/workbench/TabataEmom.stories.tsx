import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageWorkbench } from './LanguageWorkbench';
import { TABATA_EMOM_NOTE } from './presets';

const meta: Meta<typeof LanguageWorkbench> = {
  title: 'Workbench/Tabata & EMOM',
  component: LanguageWorkbench,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof LanguageWorkbench>;

const WARMUP_TABATA_NOTE = [
  '# Warm-up & Core Tabata',
  '',
  'Single block focus: 8 intervals of 20s work and 10s rest targeting hollow body midline stability.',
  '',
  '```time',
  '(8)',
  '  :20 Hollow Hold',
  '  *:10 Rest',
  '```',
].join('\n');

const MAIN_METCON_EMOM_NOTE = [
  '# Main Metcon — 10-Minute EMOM',
  '',
  'Single block focus: 10-round Every Minute on the Minute calisthenic triplet.',
  '',
  '```time',
  '(10) :60 EMOM',
  '  + 2 Burpees',
  '  + 5 Push-ups',
  '  + 7 Air Squats',
  '```',
].join('\n');

const COOLDOWN_NOTE = [
  '# Cool-down — Easy Row',
  '',
  'Single block focus: 3-minute aerobic recovery row.',
  '',
  '```time',
  '3:00 Easy Row',
  '```',
].join('\n');

/** Single block: 8-round hollow hold tabata interval */
export const WarmupAndCoreTabata: Story = {
  render: () => <LanguageWorkbench initialNote={WARMUP_TABATA_NOTE} />,
};

/** Single block: 10-minute EMOM triplet */
export const MainMetconEmom: Story = {
  render: () => <LanguageWorkbench initialNote={MAIN_METCON_EMOM_NOTE} />,
};

/** Single block: 3-minute recovery cool-down row */
export const CooldownRow: Story = {
  render: () => <LanguageWorkbench initialNote={COOLDOWN_NOTE} />,
};

/** Full multi-block training session with warm-up, EMOM, and cool-down */
export const FullSession: Story = {
  render: () => <LanguageWorkbench initialNote={TABATA_EMOM_NOTE} />,
};
