import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageWorkbench } from './LanguageWorkbench';

const meta: Meta<typeof LanguageWorkbench> = {
  title: 'Workbench/Custom Workout (Clone Template)',
  component: LanguageWorkbench,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof LanguageWorkbench>;

/**
 * Example custom workout markdown — easily clone this file to add any new
 * workout example to Storybook!
 */
const CUSTOM_WORKOUT_NOTE = [
  '# Custom Training Session — Power & Capacity',
  '',
  'Draft, edit, and run your own custom Whiteboard Script against the wall clock.',
  '',
  '## Interval Primer',
  '```time',
  '(4)',
  '  10 Burpees',
  '  15 Kettlebell Swings 24kg',
  '  *:30 Rest',
  '```',
  '',
  '## Volume Work',
  '```time',
  '500m Row',
  '20 Push-ups',
  '500m Row',
  '```',
].join('\n');

export const Default: Story = {
  render: () => <LanguageWorkbench initialNote={CUSTOM_WORKOUT_NOTE} />,
};
