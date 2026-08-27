import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageWorkbench } from './LanguageWorkbench';
import { FRAN_NOTE } from './presets';

const meta: Meta<typeof LanguageWorkbench> = {
  title: 'Workbench/Benchmark — Fran',
  component: LanguageWorkbench,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof LanguageWorkbench>;

const FRAN_SCALED_NOTE = [
  '# Scaled Benchmark — Fran (15-12-9)',
  '',
  'Single block focus: Scaled volume and load variation of Fran.',
  '',
  '```time',
  '(15-12-9)',
  '  15 Thrusters 65lb',
  '  15 Jumping Pull-ups',
  '```',
].join('\n');

const FRAN_HEAVY_NOTE = [
  '# Heavy Benchmark — Heavy Fran',
  '',
  'Single block focus: Heavy load variation with weighted movements.',
  '',
  '```time',
  '(21-15-9)',
  '  21 Thrusters 135lb',
  '  21 Weighted Pull-ups 30lb',
  '```',
].join('\n');

/** Single block: Classic Rx 21-15-9 Thrusters (95lb) & Pull-ups */
export const StandardCouplet: Story = {
  render: () => <LanguageWorkbench initialNote={FRAN_NOTE} />,
};

/** Single block: Scaled 15-12-9 Thrusters (65lb) & Jumping Pull-ups */
export const ScaledCouplet: Story = {
  render: () => <LanguageWorkbench initialNote={FRAN_SCALED_NOTE} />,
};

/** Single block: Heavy 21-15-9 Thrusters (135lb) & Weighted Pull-ups (30lb) */
export const HeavyCouplet: Story = {
  render: () => <LanguageWorkbench initialNote={FRAN_HEAVY_NOTE} />,
};
