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

export const Default: Story = {
  render: () => <LanguageWorkbench initialNote={STRENGTH_METCON_NOTE} />,
};
