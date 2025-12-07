import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from '../../src/components/theme/ThemeToggle';
import { ThemeProvider } from '../../src/components/theme/ThemeProvider';
import React from 'react';

type Theme = 'dark' | 'light' | 'system';

// Wrapper component to allow theme configuration via args
const ThemeToggleWrapper: React.FC<{ theme?: Theme }> = ({ theme = 'light' }) => {
  return (
    <ThemeProvider defaultTheme={theme} storageKey={`storybook-theme-${theme}`}>
      <div className="p-8 bg-background text-foreground rounded-lg border border-border">
        <ThemeToggle />
      </div>
    </ThemeProvider>
  );
};

const meta: Meta<typeof ThemeToggleWrapper> = {
  title: 'Components/Theme/ThemeToggle',
  component: ThemeToggleWrapper,
  parameters: {
    layout: 'centered',
  },

  argTypes: {
    theme: {
      control: 'select',
      options: ['light', 'dark', 'system'],
      description: 'Initial theme for the ThemeProvider',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeToggleWrapper>;

/**
 * Default ThemeToggle in light mode
 */
export const LightMode: Story = {
  args: {
    theme: 'light',
  },
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
    theme: 'dark',
  },
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
    theme: 'system',
  },
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
  args: {
    theme: 'light',
  },
  render: ({ theme }) => {
    return (
      <ThemeProvider defaultTheme={theme} storageKey="storybook-theme-toggle">
        <div className="p-8 bg-background text-foreground rounded-lg border border-border">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">Click the button to toggle between themes</p>
            <ThemeToggle />
            <p className="text-xs text-muted-foreground mt-2">
              The icon animates when switching themes
            </p>
          </div>
        </div>
      </ThemeProvider>
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
