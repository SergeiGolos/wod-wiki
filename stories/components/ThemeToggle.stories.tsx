import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from '../../src/components/theme/ThemeToggle';
import { ThemeProvider } from '../../src/components/theme/ThemeProvider';
import React from 'react';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Components/Theme/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      const defaultTheme = context.args?.defaultTheme || 'light';
      return (
        <ThemeProvider defaultTheme={defaultTheme} storageKey="storybook-theme">
          <div className="p-8 bg-background text-foreground rounded-lg border border-border">
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

/**
 * Default ThemeToggle in light mode
 */
export const LightMode: Story = {
  args: {
    defaultTheme: 'light',
  } as any,
  parameters: {
    docs: {
      description: {
        story: 'ThemeToggle showing the sun icon in light mode. Click to switch to dark mode.',
      },
    },
  },
};

/**
 * ThemeToggle in dark mode
 */
export const DarkMode: Story = {
  args: {
    defaultTheme: 'dark',
  } as any,
  parameters: {
    docs: {
      description: {
        story: 'ThemeToggle showing the moon icon in dark mode. Click to switch to light mode.',
      },
    },
  },
};

/**
 * ThemeToggle following system preference
 */
export const SystemMode: Story = {
  args: {
    defaultTheme: 'system',
  } as any,
  parameters: {
    docs: {
      description: {
        story: 'ThemeToggle following the system color scheme preference.',
      },
    },
  },
};

/**
 * Interactive toggle demonstration
 */
export const ToggleInteraction: Story = {
  render: () => {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">Click the button to toggle between themes</p>
        <ThemeToggle />
        <p className="text-xs text-muted-foreground mt-2">
          The icon animates when switching themes
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the toggle interaction with smooth icon animation.',
      },
    },
  },
};
