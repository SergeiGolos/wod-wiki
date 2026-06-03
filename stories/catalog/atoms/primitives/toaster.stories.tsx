/**
 * Catalog / Atoms / Primitives / Toaster
 *
 * Stories:
 *  1. Default — toaster with button to trigger toasts
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Toaster } from '@/components/atoms/primitives/toaster';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/atoms/primitives/button';

function ToasterDemo() {
  const { toast } = useToast();

  return (
    <div className="space-y-4 p-8">
      <Button
        onClick={() => {
          toast({
            title: 'Success',
            description: 'Your changes have been saved',
          });
        }}
      >
        Show Success Toast
      </Button>
      <Button
        variant="destructive"
        onClick={() => {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Something went wrong',
          });
        }}
      >
        Show Error Toast
      </Button>
      <Toaster />
    </div>
  );
}

const meta: Meta<typeof Toaster> = {
  title: 'catalog/atoms/primitives/Toaster',
  component: Toaster,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ToasterDemo />,
};
