import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageWorkbench } from './LanguageWorkbench';
import { GOLOS_KETTLEBELL_NOTE } from './presets';

const meta: Meta<typeof LanguageWorkbench> = {
  title: 'Workbench/The Golos Method — Kettlebell',
  component: LanguageWorkbench,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof LanguageWorkbench>;

const CLEAN_AND_PRESS_NOTE = [
  '# Phase 1 — Clean & Press Technique',
  '',
  'Single block focus: Unilateral overhead power endurance with 5 rounds of bilateral cleans and presses.',
  '',
  '```time',
  '(5)',
  '  5 KB Clean & Press Left 24kg',
  '  5 KB Clean & Press Right 24kg',
  '  *:45 Rest',
  '```',
].join('\n');

const SNATCH_EMOM_NOTE = [
  '# Phase 2 — Tactical Snatch EMOM',
  '',
  'Single block focus: 10-minute density EMOM alternating 4 to 6 snatches on the minute.',
  '',
  '```time',
  '(10) 1:00 EMOM',
  '  4|6 KB Snatch 24kg',
  '```',
].join('\n');

const SNATCH_TEST_NOTE = [
  '# Phase 3 — Snatch Test Cap',
  '',
  'Single block focus: Open-rep max output test capped at 5 minutes.',
  '',
  '```time',
  '5:00 ? KB Snatch 24kg',
  '```',
].join('\n');

/** Single block: 5-round 24kg Clean & Press technique intervals */
export const Phase1CleanAndPress: Story = {
  render: () => <LanguageWorkbench initialNote={CLEAN_AND_PRESS_NOTE} />,
};

/** Single block: 10-minute 24kg Tactical Snatch EMOM */
export const Phase2TacticalSnatchEmom: Story = {
  render: () => <LanguageWorkbench initialNote={SNATCH_EMOM_NOTE} />,
};

/** Single block: 5-minute Snatch Test max capacity cap */
export const Phase3SnatchTestCap: Story = {
  render: () => <LanguageWorkbench initialNote={SNATCH_TEST_NOTE} />,
};

/** Full multi-phase ballistic kettlebell training session */
export const FullSession: Story = {
  render: () => <LanguageWorkbench initialNote={GOLOS_KETTLEBELL_NOTE} />,
};
