import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageWorkbench } from './LanguageWorkbench';
import { MURPH_NOTE } from './presets';

const meta: Meta<typeof LanguageWorkbench> = {
  title: 'Workbench/Murph (Hero WOD)',
  component: LanguageWorkbench,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof LanguageWorkbench>;

const CALISTHENICS_TRIPLET_NOTE = [
  '# Murph Calisthenics Triplet',
  '',
  'Single block focus: High-density bodyweight triplet partitioned as needed.',
  '',
  '```time',
  '100 Pull-ups',
  '200 Push-ups',
  '300 Air Squats',
  '```',
].join('\n');

const MILE_RUN_BRACKET_NOTE = [
  '# Murph Bracket — 1 Mile Run',
  '',
  'Single block focus: 1-mile monostructural endurance run.',
  '',
  '```time',
  '1 Mile Run',
  '```',
].join('\n');

/** Single block: 100 Pull-ups, 200 Push-ups, 300 Air Squats */
export const CalisthenicsTriplet: Story = {
  render: () => <LanguageWorkbench initialNote={CALISTHENICS_TRIPLET_NOTE} />,
};

/** Single block: 1 Mile Run benchmark bracket */
export const MileRunBracket: Story = {
  render: () => <LanguageWorkbench initialNote={MILE_RUN_BRACKET_NOTE} />,
};

/** Complete 5-stage Hero WOD: 1 Mile Run + Triplet + 1 Mile Run */
export const FullMurph: Story = {
  render: () => <LanguageWorkbench initialNote={MURPH_NOTE} />,
};
