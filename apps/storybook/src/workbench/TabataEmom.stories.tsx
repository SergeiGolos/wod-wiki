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

export const Default: Story = {
  render: () => <LanguageWorkbench initialNote={TABATA_EMOM_NOTE} />,
};
