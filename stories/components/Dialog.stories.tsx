import type { Meta, StoryObj } from '@storybook/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../src/components/headless/Dialog';
import React, { useState } from 'react';
import { Button } from '../../src/components/ui/button';

const meta: Meta<typeof Dialog> = {
  title: 'Components/Headless/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

// Interactive wrapper for dialog stories
const DialogDemo: React.FC<{ 
  initialOpen?: boolean;
  children?: React.ReactNode;
  title?: string;
  description?: string;
  contentClassName?: string;
}> = ({ 
  initialOpen = false, 
  children,
  title = "Dialog Title",
  description = "This is a dialog description providing context.",
  contentClassName
}) => {
  const [open, setOpen] = useState(initialOpen);
  
  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={contentClassName}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children || (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Dialog content goes here. You can add forms, messages, or any other content.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => setOpen(false)}>Confirm</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * Dialog in closed state
 */
export const Closed: Story = {
  render: () => <DialogDemo initialOpen={false} />,
  parameters: {
    docs: {
      description: {
        story: 'Dialog in its default closed state. Click the button to open.',
      },
    },
  },
};

/**
 * Dialog in open state
 */
export const Open: Story = {
  render: () => <DialogDemo initialOpen={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Dialog displayed in its open state with backdrop visible.',
      },
    },
  },
};

/**
 * Dialog with full content structure
 */
export const WithContent: Story = {
  render: () => (
    <DialogDemo 
      initialOpen={true}
      title="Confirm Action"
      description="Are you sure you want to proceed with this action?"
    >
      <div className="mt-4 space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            This action cannot be undone. This will permanently delete your account
            and remove your data from our servers.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete Account</Button>
        </div>
      </div>
    </DialogDemo>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Full dialog structure with title, description, content, and action buttons.',
      },
    },
  },
};

/**
 * Click backdrop to close
 */
export const CloseOnBackdrop: Story = {
  render: () => (
    <div className="space-y-4">
      <DialogDemo 
        initialOpen={true}
        title="Click Outside to Close"
        description="Click the backdrop (dark area) to close this dialog."
      >
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            The onOpenChange callback is triggered when the backdrop is clicked.
          </p>
        </div>
      </DialogDemo>
      <p className="text-xs text-muted-foreground text-center">
        Try clicking the dark backdrop area to close the dialog
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates closing the dialog by clicking the backdrop. The `onOpenChange(false)` callback is called.',
      },
    },
  },
};

/**
 * Animated transition demonstration
 */
export const AnimatedTransition: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Watch the smooth fade and scale animation when opening/closing
        </p>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Animated Dialog</DialogTitle>
              <DialogDescription>
                This dialog uses smooth transition animations.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Fade in/out with opacity transition</li>
                <li>• Scale animation (95% → 100%)</li>
                <li>• 300ms enter / 200ms leave duration</li>
              </ul>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setOpen(false)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the smooth fade and scale animation when opening and closing the dialog.',
      },
    },
  },
};

/**
 * Dialog with custom className
 */
export const CustomClassName: Story = {
  render: () => (
    <DialogDemo 
      initialOpen={true}
      title="Custom Styled Dialog"
      description="This dialog has a custom className applied."
      contentClassName="max-w-lg bg-blue-50 border-2 border-blue-200"
    >
      <div className="mt-4">
        <p className="text-sm text-blue-800">
          Custom styles are applied via the className prop on DialogContent.
        </p>
        <div className="mt-4 p-3 bg-blue-100 rounded text-xs font-mono text-blue-700">
          className="max-w-lg bg-blue-50 border-2 border-blue-200"
        </div>
      </div>
    </DialogDemo>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Dialog with custom CSS classes applied to the content panel.',
      },
    },
  },
};

/**
 * Form dialog example
 */
export const FormDialog: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Edit Profile</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Make changes to your profile here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <form className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Enter your name"
                  defaultValue="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Enter your email"
                  defaultValue="john@example.com"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" onClick={(e) => { e.preventDefault(); setOpen(false); }}>
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of a dialog containing a form with input fields.',
      },
    },
  },
};
