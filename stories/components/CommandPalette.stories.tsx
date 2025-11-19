import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import { CommandPalette } from '../../src/components/command-palette/CommandPalette';
import { CommandProvider, useCommandPalette } from '../../src/components/command-palette/CommandContext';
import { Command } from '../../src/components/command-palette/types';

// Helper component to register commands from story args
const CommandRegistrar: React.FC<{ commands: Command[] }> = ({ commands }) => {
  const { registerCommand } = useCommandPalette();
  
  // Stabilize commands array to prevent unnecessary re-registrations
  const commandsRef = React.useRef(commands);
  
  // Check if commands have actually changed
  const isSame = commandsRef.current.length === commands.length && 
                 commandsRef.current.every((c, i) => 
                   c.id === commands[i].id && 
                   c.label === commands[i].label &&
                   c.context === commands[i].context
                 );
  
  if (!isSame) {
    commandsRef.current = commands;
  }
  
  const stableCommands = commandsRef.current;

  // Use a ref to keep track of registered cleanup functions
  const cleanupsRef = React.useRef<(() => void)[]>([]);

  useEffect(() => {
    // Cleanup previous
    cleanupsRef.current.forEach(cleanup => cleanup());
    cleanupsRef.current = [];

    // Register new
    cleanupsRef.current = stableCommands.map(cmd => registerCommand(cmd));

    return () => {
      cleanupsRef.current.forEach(cleanup => cleanup());
      cleanupsRef.current = [];
    };
  }, [stableCommands, registerCommand]);

  return null;
};

const meta: Meta<typeof CommandPalette> = {
  title: 'Components/CommandPalette',
  component: CommandPalette,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => (
      <CommandProvider initialIsOpen={true}>
        <CommandRegistrar commands={(context.args as any).commands || []} />
        <div className="min-h-screen bg-gray-100 p-8 dark:bg-gray-900">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Command Palette Demo</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Press <kbd className="rounded bg-gray-200 px-1 py-0.5 text-xs font-bold text-gray-800 dark:bg-gray-700 dark:text-gray-200">Cmd+.</kbd> or <kbd className="rounded bg-gray-200 px-1 py-0.5 text-xs font-bold text-gray-800 dark:bg-gray-700 dark:text-gray-200">Ctrl+.</kbd> to toggle the palette manually.
          </p>
          <Story />
        </div>
      </CommandProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CommandPalette & { commands: Command[] }>;

const defaultCommands: Command[] = [
  {
    id: 'home',
    label: 'Go to Home',
    action: () => alert('Navigating to Home'),
    group: 'Navigation',
    shortcut: ['G', 'H'],
  },
  {
    id: 'settings',
    label: 'Open Settings',
    action: () => alert('Opening Settings'),
    group: 'Navigation',
    shortcut: ['G', 'S'],
  },
  {
    id: 'save',
    label: 'Save File',
    action: () => alert('File Saved'),
    group: 'Editor',
    shortcut: ['Meta', 'S'],
    context: 'editor',
  },
  {
    id: 'format',
    label: 'Format Document',
    action: () => alert('Document Formatted'),
    group: 'Editor',
    shortcut: ['Shift', 'Alt', 'F'],
    context: 'editor',
  },
  {
    id: 'theme-light',
    label: 'Switch to Light Theme',
    action: () => alert('Theme: Light'),
    group: 'Appearance',
  },
  {
    id: 'theme-dark',
    label: 'Switch to Dark Theme',
    action: () => alert('Theme: Dark'),
    group: 'Appearance',
  },
];

export const Default: Story = {
  args: {
    commands: defaultCommands,
  },
};

export const Empty: Story = {
  args: {
    commands: [],
  },
};

export const ManyGroups: Story = {
  args: {
    commands: [
      ...defaultCommands,
      { id: '1', label: 'Item 1', action: () => {}, group: 'Group A' },
      { id: '2', label: 'Item 2', action: () => {}, group: 'Group A' },
      { id: '3', label: 'Item 3', action: () => {}, group: 'Group B' },
      { id: '4', label: 'Item 4', action: () => {}, group: 'Group B' },
      { id: '5', label: 'Item 5', action: () => {}, group: 'Group C' },
      { id: '6', label: 'Item 6', action: () => {}, group: 'Group C' },
      { id: '7', label: 'Item 7', action: () => {}, group: 'Group D' },
      { id: '8', label: 'Item 8', action: () => {}, group: 'Group D' },
    ],
  },
};

export const EditorContextOnly: Story = {
  args: {
    commands: defaultCommands,
  },
  decorators: [
    (Story) => {
      const { setActiveContext } = useCommandPalette();
      useEffect(() => {
        setActiveContext('editor');
      }, [setActiveContext]);
      return <Story />;
    }
  ]
};
