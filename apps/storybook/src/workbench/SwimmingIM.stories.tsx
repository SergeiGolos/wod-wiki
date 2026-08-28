import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageWorkbench } from './LanguageWorkbench';
import { SWIMMING_IM_NOTE } from './presets';

const meta: Meta<typeof LanguageWorkbench> = {
  title: 'Workbench/Swimming IM Prep',
  component: LanguageWorkbench,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof LanguageWorkbench>;

const WARMUP_IM_NOTE = [
  '# Warmup IM Sets',
  '',
  'Single block focus: 3 rounds of 150m Individual Medley transitions with 30s rest intervals.',
  '',
  '```time',
  '(3)',
  '  150m IM',
  '  *:30 Rest',
  '```',
].join('\n');

const MAIN_SET_NOTE = [
  '# Stroke Focus & Main Set',
  '',
  'Single block focus: 4 rounds of sprint Butterfly and Freestyle pace work.',
  '',
  '```time',
  '(4)',
  '  50m Butterfly',
  '  50m Freestyle',
  '  *:30 Rest',
  '```',
].join('\n');

const COOLDOWN_NOTE = [
  '# Cooldown',
  '',
  'Single block focus: 200m aerobic flush and recovery.',
  '',
  '```time',
  '200m Cooldown',
  '```',
].join('\n');

/** Single block: 3-round 150m IM warmup intervals */
export const WarmupIM: Story = {
  render: () => <LanguageWorkbench initialNote={WARMUP_IM_NOTE} />,
};

/** Single block: 4-round 50m Fly / Free interval main set */
export const StrokeFocusMainSet: Story = {
  render: () => <LanguageWorkbench initialNote={MAIN_SET_NOTE} />,
};

/** Single block: 200m recovery cooldown */
export const Cooldown: Story = {
  render: () => <LanguageWorkbench initialNote={COOLDOWN_NOTE} />,
};

/** Full multi-block 200m IM race prep swimming session */
export const FullSession: Story = {
  render: () => <LanguageWorkbench initialNote={SWIMMING_IM_NOTE} />,
};
