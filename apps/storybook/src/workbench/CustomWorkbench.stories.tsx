import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageWorkbench } from './LanguageWorkbench';

const meta: Meta<typeof LanguageWorkbench> = {
  title: 'Workbench/Custom Workout (Clone Template)',
  component: LanguageWorkbench,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof LanguageWorkbench>;

const INTERVAL_PRIMER_NOTE = [
  '# Interval Primer',
  '',
  'Single block focus: 4-round bodyweight and kettlebell conditioning interval.',
  '',
  '```time',
  '(4)',
  '  10 Burpees',
  '  15 Kettlebell Swings 24kg',
  '  *:30 Rest',
  '```',
].join('\n');

const VOLUME_WORK_NOTE = [
  '# Volume Work',
  '',
  'Single block focus: Ergometer row sprint sandwiching push-up volume.',
  '',
  '```time',
  '500m Row',
  '20 Push-ups',
  '500m Row',
  '```',
].join('\n');

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

/** Single block: 4-round interval primer with burpees and swings */
export const IntervalPrimer: Story = {
  render: () => <LanguageWorkbench initialNote={INTERVAL_PRIMER_NOTE} />,
};

/** Single block: 500m Row + 20 Push-ups + 500m Row */
export const VolumeWork: Story = {
  render: () => <LanguageWorkbench initialNote={VOLUME_WORK_NOTE} />,
};

/** Full multi-block power & capacity session */
export const FullSession: Story = {
  render: () => <LanguageWorkbench initialNote={CUSTOM_WORKOUT_NOTE} />,
};

/**
 * Customized Template — Custom primary WQL filter on session outputs,
 * custom secondary filter presets, and tailored WQL dashboard widgets.
 */
export const CustomizedWqlTemplate: Story = {
  render: () => (
    <LanguageWorkbench
      initialNote={CUSTOM_WORKOUT_NOTE}
      outputTableQuery="type:event"
      outputTableFilters={['all', 'segments', 'events', 'sum:rep{}', 'sum:totalVolume{}']}
      dashboards={[
        'sum:totalVolume{}',
        'sum:rep{} by {effort}',
        'sum:sessionLoad{} by {discipline}',
      ]}
    />
  ),
};
