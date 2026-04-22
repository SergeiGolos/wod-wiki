import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { FocusedDialog } from '../../../../src/components/Editor/overlays/FocusedDialog'
import { Volume2 } from 'lucide-react'
import React from 'react'

const meta: Meta<typeof FocusedDialog> = {
  title: 'catalog/molecules/overlays/FocusedDialog',
  component: FocusedDialog,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-screen takeover overlay rendered via `ReactDOM.createPortal` to escape CSS containing blocks. ' +
          'Click the trigger button below to open the dialog — it will cover the entire viewport.',
      },
    },
  },
  args: {
    onClose: () => {},
    children: <></>,
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

function DialogTrigger({
  label,
  children,
}: {
  label: string
  children: (onClose: () => void) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <button
        onClick={() => setOpen(true)}
        className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        {label}
      </button>
      {open && children(() => setOpen(false))}
    </div>
  )
}

export const Default: Story = {
  render: () => (
    <DialogTrigger label="Open Dialog">
      {(onClose) => (
        <FocusedDialog title="Workout Timer" onClose={onClose}>
          <div className="flex items-center justify-center h-full text-muted-foreground text-lg font-semibold">
            Dialog content
          </div>
        </FocusedDialog>
      )}
    </DialogTrigger>
  ),
}

export const MinimalVariant: Story = {
  render: () => (
    <DialogTrigger label="Open Minimal Dialog">
      {(onClose) => (
        <FocusedDialog variant="minimal" onClose={onClose}>
          <div className="flex items-center justify-center h-full text-muted-foreground text-lg font-semibold">
            Minimal variant — no header bar, floating close button
          </div>
        </FocusedDialog>
      )}
    </DialogTrigger>
  ),
}

export const FloatingClose: Story = {
  render: () => (
    <DialogTrigger label="Open Floating Close">
      {(onClose) => (
        <FocusedDialog floatingClose onClose={onClose}>
          <div className="flex items-center justify-center h-full text-muted-foreground text-lg font-semibold">
            Floating close button (top-right, no header bar)
          </div>
        </FocusedDialog>
      )}
    </DialogTrigger>
  ),
}

export const WithActions: Story = {
  render: () => (
    <DialogTrigger label="Open With Actions">
      {(onClose) => (
        <FocusedDialog
          title="Full-screen Timer"
          onClose={onClose}
          actions={
            <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <Volume2 className="size-5" />
            </button>
          }
        >
          <div className="flex items-center justify-center h-full text-muted-foreground text-lg font-semibold">
            Content with action buttons in the header
          </div>
        </FocusedDialog>
      )}
    </DialogTrigger>
  ),
}

export const NoTitle: Story = {
  render: () => (
    <DialogTrigger label="Open No Title">
      {(onClose) => (
        <FocusedDialog onClose={onClose}>
          <div className="flex items-center justify-center h-full text-muted-foreground text-lg font-semibold">
            No title — close button appears top-right floating
          </div>
        </FocusedDialog>
      )}
    </DialogTrigger>
  ),
}
