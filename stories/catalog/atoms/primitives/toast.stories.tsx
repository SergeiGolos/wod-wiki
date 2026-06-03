/**
 * Catalog / Atoms / Primitives / Toast
 *
 * Stories:
 *  1. Default — basic toast
 *  2. Variants — different toast variants
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from '@/components/atoms/primitives/toast';

const meta: Meta<typeof Toast> = {
  title: 'catalog/atoms/primitives/Toast',
  component: Toast,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="flex flex-col gap-4 p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <Toast>
        <ToastTitle>Notification</ToastTitle>
        <ToastDescription>
          This is a default toast message
        </ToastDescription>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};

export const Variants: Story = {
  render: () => (
    <ToastProvider>
      <Toast variant="default">
        <ToastTitle>Default</ToastTitle>
        <ToastDescription>Default toast message</ToastDescription>
        <ToastClose />
      </Toast>

      <Toast variant="destructive">
        <ToastTitle>Error</ToastTitle>
        <ToastDescription>Destructive toast message</ToastDescription>
        <ToastAction altText="Try again">Retry</ToastAction>
        <ToastClose />
      </Toast>

      <ToastViewport />
    </ToastProvider>
  ),
};
