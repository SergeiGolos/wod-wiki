import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageWorkbench } from './LanguageWorkbench';
import { GOLOS_KETTLEBELL_NOTE } from './presets';

const meta: Meta<typeof LanguageWorkbench> = {
  title: 'Workbench/Golos Method KB',
  component: LanguageWorkbench,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof LanguageWorkbench>;

export const Default: Story = {
  render: () => <LanguageWorkbench initialNote={GOLOS_KETTLEBELL_NOTE} />,
};
