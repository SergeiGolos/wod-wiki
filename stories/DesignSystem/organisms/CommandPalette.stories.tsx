/**
 * DesignSystem / Organisms / CommandPalette
 *
 * Global full-screen command palette (cmdk-based, context-driven).
 * Open/close state is managed by CommandContext which is already
 * provided by StorybookHost via CommandProvider.
 *
 * Stories use the CommandContext to control visibility.
 */

import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { useCommandPalette } from '@/components/command-palette/CommandContext';
import { Button } from '@/components/ui/button';

// Helper that opens the palette automatically on mount
const AutoOpen: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const { setIsOpen } = useCommandPalette();
  useEffect(() => {
    const t = setTimeout(() => setIsOpen(true), delay);
    return () => clearTimeout(t);
  }, []);
  return null;
};

const ToggleButton: React.FC = () => {
  const { setIsOpen } = useCommandPalette();
  return (
    <Button onClick={() => setIsOpen(true)} variant="outline">
      Open Command Palette (⌘K)
    </Button>
  );
};

const meta: Meta<typeof CommandPalette> = {
  title: 'DesignSystem/Organisms/CommandPalette',
  component: CommandPalette,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Context-driven palette. No props — open/close is controlled by ' +
          '`useCommandPalette()`. The palette is rendered at the root of ' +
          'StorybookHost so it overlays the full canvas.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="p-8 flex flex-col gap-4 items-start">
        <Story />
        <CommandPalette />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const ManualOpen: Story = {
  name: 'Toggle button (click to open)',
  render: () => <ToggleButton />,
};

export const AutoOpened: Story = {
  name: 'Auto-opened on mount',
  render: () => (
    <>
      <AutoOpen />
      <p className="text-sm text-muted-foreground">
        The palette opened automatically. Press Escape to close.
      </p>
    </>
  ),
};
