import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageWorkbench } from './LanguageWorkbench';
import { STRENGTH_METCON_NOTE } from './presets';

const meta: Meta<typeof LanguageWorkbench> = {
  title: 'Workbench/Strength & Triplet',
  component: LanguageWorkbench,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof LanguageWorkbench>;

const BACK_SQUAT_NOTE = [
  '# Phase 1 — Back Squat 5x5',
  '',
  'Single block focus: Heavy percentage-based back squat strength progression at 80% 1RM.',
  '',
  '```time',
  '5x5 Back Squat 80%',
  '```',
].join('\n');

const TRIPLET_CIRCUIT_NOTE = [
  '# Phase 2 — Triplet Accessory Circuit',
  '',
  'Single block focus: 3-round posterior chain and core hypertrophy circuit with 60s rest.',
  '',
  '```time',
  '(3)',
  '  10 Romanian Deadlift 60%',
  '  15 GHD Sit-Ups',
  '  20 Box Step-Up 24/20',
  '  *:60 Rest',
  '```',
].join('\n');

/** Single block: 5x5 Back Squat strength progression */
export const BackSquat5x5: Story = {
  render: () => <LanguageWorkbench initialNote={BACK_SQUAT_NOTE} />,
};

/** Single block: 3-round Triplet accessory circuit */
export const TripletAccessoryCircuit: Story = {
  render: () => <LanguageWorkbench initialNote={TRIPLET_CIRCUIT_NOTE} />,
};

/** Full multi-block strength & conditioning session */
export const FullSession: Story = {
  render: () => <LanguageWorkbench initialNote={STRENGTH_METCON_NOTE} />,
};
