/**
 * Catalog / Atoms / Dialog
 *
 * Radix-based modal dialog with trigger, header, body, and footer.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const meta: Meta = {
  title: 'catalog/atoms/Dialog',
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

const DialogDemo: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>
            This is an example dialog. Dialogs use a Radix portal so they render
            above all other content.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Dialog body content goes here. You can add forms, text, or anything else.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const Default: Story = {
  name: 'Dialog',
  render: () => <DialogDemo />,
};
