import type { Meta, StoryObj } from '@storybook/react';
import { BuyMeACoffee } from '@/components/ui/BuyMeACoffee';

const meta: Meta<typeof BuyMeACoffee> = {
  title: 'Catalog/Atoms/BuyMeACoffee',
  component: BuyMeACoffee,
  tags: ['autodocs'],
  argTypes: {
    href: { control: 'text' },
    className: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof BuyMeACoffee>;

export const Default: Story = {
  args: {
    href: 'https://www.buymeacoffee.com/sergeigolos',
  },
};

export const CustomStyle: Story = {
  args: {
    href: 'https://www.buymeacoffee.com/sergeigolos',
    className: 'bg-indigo-600 hover:bg-indigo-500 scale-150',
  },
};
