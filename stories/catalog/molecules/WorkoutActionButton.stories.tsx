/**
 * Catalog / Molecules / WorkoutActionButton
 *
 * A split button for creating or cloning a workout entry on a chosen date.
 *
 *  [ (Icon) Label ] | [ 📅 ]
 *
 * The main zone triggers the action for today; the calendar icon opens a
 * date-picker dropdown. Optional secondary actions appear in the dropdown.
 *
 * Stories:
 *  1. CreateMode         – Plus icon, "New" label
 *  2. CloneMode          – Copy icon, "Clone" label
 *  3. WithSecondaryAction – Import option appended to dropdown
 *  4. Variants            – default / outline / ghost button variants
 *  5. CustomLabel         – overridden label and title
 */

import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutActionButton } from '@/components/workout/WorkoutActionButton';
import { FileInput } from 'lucide-react';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof WorkoutActionButton> = {
  title: 'catalog/molecules/WorkoutActionButton',
  component: WorkoutActionButton,
  parameters: { layout: 'padded', subsystem: 'workbench' },
  args: {
    onAction: (date: Date) => alert(`Action for ${date.toDateString()}`),
  },
};

export default meta;
type Story = StoryObj<typeof WorkoutActionButton>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Default create mode — Plus icon, "New" label. */
export const CreateMode: Story = {
  args: { mode: 'create' },
};

/** Clone mode — Copy icon, "Clone" label. */
export const CloneMode: Story = {
  args: { mode: 'clone' },
};

/** With a secondary action (Import) appended to the dropdown. */
export const WithSecondaryAction: Story = {
  args: {
    mode: 'create',
    secondaryActions: [
      {
        label: 'Import Markdown',
        icon: <FileInput className="h-4 w-4" />,
        onClick: () => alert('Import clicked'),
      },
    ],
  },
};

/** All three button variants side-by-side. */
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <WorkoutActionButton {...args} variant="default" mode="create" />
      <WorkoutActionButton {...args} variant="outline" mode="create" />
      <WorkoutActionButton {...args} variant="ghost"   mode="create" />
    </div>
  ),
};

/** Custom label and tooltip title. */
export const CustomLabel: Story = {
  args: {
    mode: 'create',
    label: 'Add WOD',
    title: 'Add a new WOD entry for today',
  },
};
